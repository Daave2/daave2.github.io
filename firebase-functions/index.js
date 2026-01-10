/**
 * Firebase Cloud Functions for Morrisons Checklist Push Notifications
 * 
 * This function runs every 5 minutes to:
 * 1. Fetch checklist data from GitHub Gist
 * 2. Check for due/overdue tasks
 * 3. Send push notifications to assigned users via FCM
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin with default credentials
admin.initializeApp();

// Configuration - set these in Firebase Console > Functions > Config
// firebase functions:config:set gist.id="YOUR_GIST_ID" gist.token="YOUR_GITHUB_TOKEN"
const GIST_ID = functions.config().gist?.id || process.env.GIST_ID;
const GITHUB_TOKEN = functions.config().gist?.token || process.env.GITHUB_TOKEN;
const GIST_FILENAME = 'daily_checklist.json';

// Google Chat Webhook for overdue alerts
const CHAT_WEBHOOK_URL = functions.config().chat?.webhook || process.env.CHAT_WEBHOOK_URL;

// Track which notifications we've sent to avoid duplicates
// Note: This persists only within a Cloud Function instance lifetime
const sentNotifications = new Set();
let lastNotificationDate = '';

/**
 * Send an overdue alert to Google Chat via webhook
 */
async function sendChatWebhookAlert(taskLabel, assignedTo, overdueText) {
    if (!CHAT_WEBHOOK_URL) {
        console.log('[CHAT] Webhook URL not configured, skipping chat alert');
        return;
    }

    const cardMessage = {
        cardsV2: [{
            cardId: `overdue-${Date.now()}`,
            card: {
                header: {
                    title: '⚠️ Overdue Task Alert',
                    subtitle: 'Action Required',
                    imageUrl: 'https://218.team/icons/icon-192x192.png',
                    imageType: 'CIRCLE'
                },
                sections: [{
                    widgets: [
                        {
                            decoratedText: {
                                topLabel: 'Task',
                                text: `<b>${taskLabel}</b>`,
                                wrapText: true
                            }
                        },
                        {
                            decoratedText: {
                                topLabel: 'Assigned To',
                                text: assignedTo || 'Unassigned',
                                wrapText: true
                            }
                        },
                        {
                            decoratedText: {
                                topLabel: 'Status',
                                text: `<font color="#d32f2f">${overdueText}</font>`,
                                wrapText: true
                            }
                        }
                    ]
                },
                {
                    widgets: [{
                        buttonList: {
                            buttons: [{
                                text: 'Mark as Actioned',
                                onClick: {
                                    openLink: {
                                        url: 'https://218.team/'
                                    }
                                }
                            }]
                        }
                    }]
                }]
            }
        }]
    };

    try {
        const response = await fetch(CHAT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardMessage)
        });

        if (!response.ok) {
            console.error('[CHAT] Webhook failed:', response.status, await response.text());
        } else {
            console.log('[CHAT] Alert sent for:', taskLabel);
        }
    } catch (err) {
        console.error('[CHAT] Webhook error:', err.message);
    }
}

/**
 * Scheduled function that runs every 5 minutes to check for due tasks
 */
exports.checkDueTasks = functions.pubsub
    .schedule('every 5 minutes')
    .timeZone('Europe/London')
    .onRun(async (context) => {
        console.log('Checking for due tasks...');

        try {
            // 1. Fetch checklist data from Gist
            const checklistData = await fetchGistData();
            if (!checklistData) {
                console.log('No checklist data found');
                return null;
            }

            // 2. Get current time
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Clear sent notifications when date changes
            if (lastNotificationDate !== todayStr) {
                console.log('New day detected, clearing sent notifications cache');
                sentNotifications.clear();
                lastNotificationDate = todayStr;
            }

            // Check if data is for today
            if (checklistData.meta?.currentDate !== todayStr) {
                console.log('Checklist data is not for today, skipping');
                return null;
            }

            // 3. Get FCM tokens from the data
            const tokens = checklistData.tokens || {};
            if (Object.keys(tokens).length === 0) {
                console.log('No FCM tokens registered');
                return null;
            }

            // 4. Check each task for due/overdue status
            const definitions = checklistData.definitions || {};
            const todayItems = checklistData.today?.items || {};

            const notifications = [];

            for (const [categoryId, category] of Object.entries(definitions)) {
                const tasks = Array.isArray(category) ? category : (category.items || []);

                for (const task of tasks) {
                    const state = todayItems[task.id] || {};

                    // Debug logging for each task
                    if (task.time) {
                        const dueTime = parseTime(task.time, now);
                        const diffMs = dueTime ? dueTime - now : null;
                        const diffMins = diffMs ? Math.floor(diffMs / 60000) : 'N/A';
                        console.log(`[DEBUG] Task "${task.label}" (${task.time}): assigned=${state.assignedTo || 'none'}, checked=${state.checked || false}, diffMins=${diffMins}`);
                    }

                    // Skip if already checked or not assigned
                    if (state.checked || !state.assignedTo) continue;

                    // Get FCM tokens for assigned user (supports array for multi-device)
                    let userTokens = tokens[state.assignedTo];
                    if (!userTokens) {
                        console.log(`[DEBUG] No token found for user: ${state.assignedTo}`);
                        continue;
                    }

                    // Handle both old single-token format and new array format
                    if (!Array.isArray(userTokens)) {
                        userTokens = [userTokens];
                    }

                    // Check if this is a weekly task (time is 'Weekly' instead of HH:MM)
                    const isWeeklyTask = task.time && task.time.toLowerCase() === 'weekly';

                    if (isWeeklyTask) {
                        // WEEKLY TASKS: Remind on Friday, Saturday, Sunday at noon (12:00-12:59)
                        const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
                        const currentHour = now.getHours();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
                        const isNoon = currentHour >= 12 && currentHour < 13;

                        if (isWeekend && isNoon) {
                            const notifKey = `${task.id}-${todayStr}-weekly-reminder`;
                            if (!sentNotifications.has(notifKey)) {
                                for (const token of userTokens) {
                                    notifications.push({
                                        token: token,
                                        title: 'Weekly Task Reminder',
                                        body: `${task.label} — not yet completed this week`,
                                        taskId: task.id,
                                        key: notifKey
                                    });
                                }
                            }
                        }
                        continue; // Skip time-based checks for weekly tasks
                    }

                    // Check if this is a DAILY task (time is 'Daily')
                    const isDailyTask = task.time && task.time.toLowerCase() === 'daily';

                    if (isDailyTask) {
                        const currentHour = now.getHours();
                        const currentMinute = now.getMinutes();

                        // Triggers at 18:00 (6 PM) and 21:00 (9 PM)
                        // Window is 0-4 minutes because function runs every 5 minutes
                        const isRemindTime = (currentHour === 18 || currentHour === 21) && currentMinute < 5;

                        if (isRemindTime) {
                            const notifKey = `${task.id}-${todayStr}-daily-check-${currentHour}`;

                            if (!sentNotifications.has(notifKey)) {
                                for (const token of userTokens) {
                                    notifications.push({
                                        token: token,
                                        title: 'Daily Task Reminder',
                                        body: `${task.label} — is this done yet?`,
                                        taskId: task.id,
                                        key: notifKey
                                    });
                                }
                            }
                        }
                        continue; // Skip standard time checks
                    }

                    // Parse task time for timed tasks
                    const dueTime = parseTime(task.time, now);
                    if (!dueTime) continue;

                    const diffMs = dueTime - now;
                    const diffMins = Math.floor(diffMs / 60000);

                    // Calculate reminder interval based on how overdue the task is
                    // - First 30 min overdue: remind every 15 min
                    // - 30 min to 2 hours: remind every 30 min
                    // - 2+ hours: remind every hour
                    const getTimeBucket = (overdueMinutes) => {
                        if (overdueMinutes <= 30) {
                            return Math.floor(overdueMinutes / 15); // Every 15 min
                        } else if (overdueMinutes <= 120) {
                            return 2 + Math.floor((overdueMinutes - 30) / 30); // Every 30 min
                        } else {
                            return 5 + Math.floor((overdueMinutes - 120) / 60); // Every hour
                        }
                    };

                    if (diffMins <= 30 && diffMins > 0) {
                        // UPCOMING: notify 30 min before (only once)
                        const notifKey = `${task.id}-${todayStr}-upcoming`;
                        if (!sentNotifications.has(notifKey)) {
                            for (const token of userTokens) {
                                notifications.push({
                                    token: token,
                                    title: 'Upcoming Task',
                                    body: `${task.label} — due in ${diffMins} min`,
                                    taskId: task.id,
                                    key: notifKey
                                });
                            }
                        }
                    } else if (diffMins <= 0 && diffMins > -1440) {
                        // OVERDUE: escalating reminders
                        const overdueMinutes = Math.abs(diffMins);
                        const bucket = getTimeBucket(overdueMinutes);
                        const notifKey = `${task.id}-${todayStr}-overdue-${bucket}`;

                        if (!sentNotifications.has(notifKey)) {
                            // Format how long overdue
                            const overdueText = overdueMinutes < 60
                                ? `${overdueMinutes} min overdue`
                                : `${Math.floor(overdueMinutes / 60)}h ${overdueMinutes % 60}m overdue`;

                            for (const token of userTokens) {
                                notifications.push({
                                    token: token,
                                    title: 'Overdue Task',
                                    body: `${task.label} — ${overdueText}`,
                                    taskId: task.id,
                                    key: notifKey
                                });
                            }

                            // Send to Google Chat (once per task per day, if sendChaser enabled)
                            if (task.sendChaser) {
                                const chatKey = `${task.id}-${todayStr}-chat-overdue`;
                                if (!sentNotifications.has(chatKey)) {
                                    await sendChatWebhookAlert(task.label, state.assignedTo, overdueText);
                                    sentNotifications.add(chatKey);
                                }
                            }
                        }
                    }
                }
            }

            // 5. Send notifications
            console.log(`Sending ${notifications.length} notifications...`);

            for (const notif of notifications) {
                try {
                    // Send data-only message so Service Worker can display 
                    // notification with custom action buttons
                    await admin.messaging().send({
                        token: notif.token,
                        // NO notification payload - let SW handle display
                        data: {
                            title: notif.title,
                            body: notif.body,
                            taskId: notif.taskId,
                            click_action: 'https://218.team/'
                        },
                        webpush: {
                            // Headers to ensure delivery even when page is closed
                            headers: {
                                'TTL': '86400',
                                'Urgency': 'high'
                            }
                        }
                    });

                    sentNotifications.add(notif.key);
                    console.log(`Sent notification: ${notif.title} - ${notif.body}`);
                } catch (err) {
                    console.error(`Failed to send notification: ${err.message}`);

                    // If token is invalid, we should remove it from the Gist
                    // (Left as TODO for production implementation)
                }
            }

            return null;
        } catch (error) {
            console.error('Error checking due tasks:', error);
            throw error;
        }
    });

/**
 * Fetch checklist data from GitHub Gist
 */
async function fetchGistData() {
    if (!GIST_ID || !GITHUB_TOKEN) {
        console.error('Gist configuration missing. Set gist.id and gist.token in Firebase config.');
        return null;
    }

    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        console.error(`Failed to fetch Gist: ${response.status}`);
        return null;
    }

    const gist = await response.json();
    const content = gist.files[GIST_FILENAME]?.content;

    if (!content) {
        console.error('Checklist file not found in Gist');
        return null;
    }

    return JSON.parse(content);
}

/**
 * Parse time string to Date object
 */
function parseTime(timeStr, referenceDate) {
    if (!timeStr || typeof timeStr !== 'string') return null;

    try {
        // Handle "HH:MM" format
        const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (match24) {
            const d = new Date(referenceDate);
            d.setHours(parseInt(match24[1], 10), parseInt(match24[2], 10), 0, 0);
            return d;
        }

        // Handle "H:MMam/pm" or "HH:MMam/pm" format
        const match12 = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
        if (match12) {
            let hours = parseInt(match12[1], 10);
            const mins = parseInt(match12[2] || '0', 10);
            const isPM = match12[3].toLowerCase() === 'pm';

            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;

            const d = new Date(referenceDate);
            d.setHours(hours, mins, 0, 0);
            return d;
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * HTTP endpoint to manually trigger a test notification
 * Usage: https://your-project.cloudfunctions.net/sendTestNotification?token=FCM_TOKEN
 */
exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    const token = req.query.token;

    if (!token) {
        res.status(400).send('Missing token parameter');
        return;
    }

    try {
        // Send data-only message so Service Worker can display with action buttons
        await admin.messaging().send({
            token: token,
            // NO notification payload - let SW handle display
            data: {
                title: 'Notifications Active',
                body: 'Task reminders are configured for this device.',
                taskId: 'test-task',
                click_action: 'https://218.team/'
            },
            webpush: {
                headers: {
                    'TTL': '86400',
                    'Urgency': 'high'
                }
            }
        });

        res.send('Test notification sent successfully!');
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
});
