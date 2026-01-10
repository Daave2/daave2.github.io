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

// Track which notifications we've sent to avoid duplicates
// In production, you might want to use Firestore for persistent tracking
const sentNotifications = new Set();

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

                    // Skip if already checked or not assigned
                    if (state.checked || !state.assignedTo) continue;

                    // Parse task time
                    const dueTime = parseTime(task.time, now);
                    if (!dueTime) continue;

                    const diffMs = dueTime - now;
                    const diffMins = Math.floor(diffMs / 60000);

                    // Get FCM tokens for assigned user (supports array for multi-device)
                    let userTokens = tokens[state.assignedTo];
                    if (!userTokens) continue;

                    // Handle both old single-token format and new array format
                    if (!Array.isArray(userTokens)) {
                        userTokens = [userTokens];
                    }

                    // Create notification key to prevent duplicates
                    const notifKey = `${task.id}-${todayStr}-${diffMins < 0 ? 'overdue' : 'soon'}`;

                    // Check if within notification window and not already sent
                    if (diffMins <= 10 && diffMins > 0 && !sentNotifications.has(notifKey)) {
                        // Push one notification per device token
                        for (const token of userTokens) {
                            notifications.push({
                                token: token,
                                title: '⚠️ Task Due Soon',
                                body: `"${task.label}" is due in ${diffMins} minutes!`,
                                taskId: task.id,
                                key: notifKey
                            });
                        }
                    } else if (diffMins <= 0 && diffMins > -1440 && !sentNotifications.has(notifKey)) {
                        // Notify for any overdue task from today (up to 24h)
                        for (const token of userTokens) {
                            notifications.push({
                                token: token,
                                title: '🚨 Task OVERDUE',
                                body: `"${task.label}" is overdue!`,
                                taskId: task.id,
                                key: notifKey
                            });
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
                title: '🔔 Test Notification',
                body: 'If you see this, FCM is working!',
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
