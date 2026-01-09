/**
 * Daily Checklist Module
 * Syncs checklist state to a GitHub Gist for shared team access
 */

// Hardcoded Gist ID (shared across all users)
const GIST_ID = '95a61f781f9655c1abb90d6daff4a7c2';
const GIST_FILENAME = 'daily_checklist.json';
const TOKEN_STORAGE_KEY = 'checklist_github_token';
const USERNAME_STORAGE_KEY = 'checklist_username';

// Team members for task assignment
const TEAM_MEMBERS = [
    'Tanny',
    'Julie',
    'Niki',
    'Scott',
    'Kev',
    'Carl',
    'Chris B',
    'Sharon',
    'Dan',
    'Lisa',
    'Bev'
];

// Default checklist items based on store procedures
const DEFAULT_ITEMS = {
    morning: {
        title: 'Morning (by 9:30am)',
        items: [
            { id: 'mpro-fire-check', label: 'MPRO5 Fire Check', time: '8:00' },
            { id: 'pharmacy-alarm', label: 'Pharmacy Alarm', time: '9:00' },
            { id: 'mpro-street', label: 'MPRO5 Street', time: '9:00' },
            { id: 'code-app', label: 'Code App', time: '9:00' },
            { id: 'flower-gap-scan', label: 'Flower Gap Scan', time: '9:30' },
        ]
    },
    midday: {
        title: 'Midday',
        items: [
            { id: 'waste-validation', label: 'Waste Validation', time: '10:30' },
            { id: 'staff-checks', label: 'Staff Checks (Dymension)', time: 'Daily' },
        ]
    },
    afternoon: {
        title: 'Fit for 5 (5pm)',
        items: [
            { id: 'fit-for-5-street', label: 'Fit for 5 - Street', time: '5:00pm' },
            { id: 'fit-for-5-produce', label: 'Fit for 5 - Produce', time: '5:00pm' },
            { id: 'fit-for-5-trading', label: 'Fit for 5 - Trading', time: '5:00pm' },
        ]
    },
    weekly: {
        title: 'Weekly Tasks',
        items: [
            { id: 'weekly-transfers', label: 'Transfers', time: 'Weekly' },
            { id: 'weekly-sm-logbook', label: 'SM Logbook', time: 'Weekly' },
            { id: 'weekly-shrink-audit', label: 'Shrink Audit', time: 'Weekly' },
            { id: 'weekly-fire-test', label: 'Fire Test', time: 'Weekly' },
            { id: 'weekly-range-checks', label: 'Range Checks', time: 'Weekly' },
        ]
    }
};

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get current time in HH:MM format
 */
function getCurrentTime() {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get GitHub token from localStorage
 */
function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Set GitHub token in localStorage
 */
function setToken(token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Get Gist ID (hardcoded - same for everyone)
 */
function getGistId() {
    return GIST_ID;
}

/**
 * Get username from localStorage
 */
function getUsername() {
    return localStorage.getItem(USERNAME_STORAGE_KEY) || 'Team';
}

/**
 * Set username in localStorage
 */
function setUsername(name) {
    localStorage.setItem(USERNAME_STORAGE_KEY, name);
}

/**
 * Create a new Gist for the checklist
 */
async function createGist(token) {
    const initialData = {
        date: getTodayDate(),
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: getUsername(),
        items: {}
    };

    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            description: 'Cleveleys Morrisons Daily Checklist',
            public: false,
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(initialData, null, 2)
                }
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create Gist: ${response.status}`);
    }

    const gist = await response.json();
    return gist.id;
}

/**
 * Fetch checklist data from Gist
 */
async function fetchChecklist(gistId, token) {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('[FETCH] Fetching Gist...', gistId.slice(0, 4));
    const response = await fetch(`https://api.github.com/gists/${gistId}`, { headers });

    if (!response.ok) {
        throw new Error(`Failed to fetch Gist: ${response.status}`);
    }

    const gist = await response.json();
    const content = gist.files[GIST_FILENAME]?.content;

    if (!content) {
        const available = Object.keys(gist.files || {}).join(', ');
        throw new Error(`Checklist file '${GIST_FILENAME}' not found in Gist. Available files: [${available}]`);
    }

    const parsed = JSON.parse(content);
    console.log('[FETCH] Got remote data:', {
        date: parsed.meta?.currentDate,
        lastUpdated: parsed.meta?.lastUpdated,
        lastUpdatedBy: parsed.meta?.lastUpdatedBy,
        todayItemsCount: Object.keys(parsed.today?.items || {}).length
    });
    return parsed;
}

/**
 * Update checklist data in Gist
 */
async function updateChecklist(gistId, token, data) {
    console.log('Pushing update to Gist...', { gistId: gistId?.slice(0, 4), token: token ? 'present' : 'missing', timestamp: data.meta?.lastUpdated });

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        })
    });

    if (!response.ok) {
        console.error('Update failed:', response.status, response.statusText);
        if (response.status === 403) {
            throw new Error(`Permission Denied (403). Your token might be invalid or missing scopes. Try the "Reset Token" (key icon) button.`);
        }
        if (response.status === 404) {
            throw new Error('Gist not found. Check ID or Token.');
        }
        throw new Error(`Failed to update Gist: ${response.status}`);
    } else {
        console.log('Gist update successful');
    }

    return response.json();
}

/**
 * Main Checklist class
 */
class ChecklistManager {
    constructor() {
        this.data = this.loadLocal() || this.createDefaultData();
        this.listeners = [];
        this.syncInterval = null;
        this.isSyncing = false;

        // Ensure meta exists (migration safety)
        if (!this.data.meta) {
            this.data.meta = { version: 2, lastUpdated: new Date().toISOString(), lastUpdatedBy: 'System' };
        }

        // Ensure definitions exist (migration safety)
        if (!this.data.definitions) {
            this.data.definitions = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        }

        // Repair Check: Ensure definitions are Objects {title, items}, not just Arrays
        // This fixes the crash if bad data was saved previously.
        Object.keys(this.data.definitions).forEach(catId => {
            if (Array.isArray(this.data.definitions[catId])) {
                console.warn(`Reparing definition category ${catId}: Converting Array to Object`);
                const title = DEFAULT_ITEMS[catId]?.title || catId;
                this.data.definitions[catId] = {
                    title: title,
                    items: this.data.definitions[catId]
                };
            }
        });

        this.data = this.performDailyReset(this.data);
    }

    createDefaultData() {
        return {
            meta: {
                version: 2,
                currentDate: getTodayDate(),
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: 'System'
            },
            definitions: JSON.parse(JSON.stringify(DEFAULT_ITEMS)),
            history: [],
            today: {
                items: {}
            }
        };
    }

    loadLocal() {
        const json = localStorage.getItem('checklist_v2_data');
        if (!json) return null;
        try {
            return JSON.parse(json);
        } catch (e) {
            console.error('Failed to load local data', e);
            return null;
        }
    }

    saveLocal() {
        if (this.data) {
            localStorage.setItem('checklist_v2_data', JSON.stringify(this.data));
        }
    }

    isConfigured() {
        return !!getToken();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => this.listeners = this.listeners.filter(l => l !== listener);
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener(this.data));
    }

    startAutoSync(intervalMs = 30000) {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (!this.isSyncing) {
                this.sync().catch(e => console.warn('Auto-sync failed:', e));
            }
        }, intervalMs);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async sync() {
        if (this.isSyncing) return; // Skip if busy
        const gistId = getGistId();
        const token = getToken();

        if (!gistId) {
            throw new Error('Gist not configured');
        }

        this.isSyncing = true;

        try {
            // 1. Fetch remote data
            let remoteData;
            try {
                remoteData = await fetchChecklist(gistId, token);
            } catch (err) {
                // Self-healing: 
                // 1. File missing ("not found")
                // 2. File corrupt (SyntaxError during JSON.parse)
                if (err.message.includes('not found') || err.message.includes('Available files') || err instanceof SyntaxError) {
                    console.warn('Remote file missing or corrupt. Auto-initializing Gist...');
                    await updateChecklist(gistId, token, this.data);
                    return;
                }
                throw err;
            }

            const localTime = new Date(this.data.meta.lastUpdated || 0).getTime();
            const remoteTime = new Date(remoteData.meta?.lastUpdated || 0).getTime();
            const localUser = this.data.meta.lastUpdatedBy;
            const remoteUser = remoteData.meta?.lastUpdatedBy;

            // Conflict Resolution Logic:
            let pushLocal = false;

            if (localTime > remoteTime) {
                // Local is newer. But is it just a System reset vs Remote User edits?
                if (localUser === 'System' && remoteUser !== 'System' && this.data.meta.currentDate === remoteData.meta?.currentDate) {
                    // Local is a system reset, but remote has user data for SAME DAY.
                    // Trust remote to prevent wiping work on page load.
                    console.log('Use Remote (Protect user data from local system reset)');
                    pushLocal = false;
                } else {
                    pushLocal = true;
                }
            }

            if (pushLocal) {
                console.log('Local is newer, pushing...');
                await updateChecklist(gistId, token, this.data);
            } else {
                console.log('Remote is newer/same, pulling...');
                console.log('[SYNC] Remote data before assignment:', JSON.stringify({
                    meta: remoteData.meta,
                    todayItems: Object.keys(remoteData.today?.items || {}).length
                }));
                this.data = remoteData;

                // Migration 1: Tasks -> Definitions (only for V1 data)
                console.log('[SYNC] Checking migration - meta.version:', this.data.meta?.version);
                if (!this.data.meta?.version) {
                    console.log('[SYNC] Migrating V1 data to V2...');
                    this.data = this.migrateToV2(this.data);
                    await updateChecklist(gistId, token, this.data);
                }

                // Repair check again on incoming data
                Object.keys(this.data.definitions).forEach(catId => {
                    if (Array.isArray(this.data.definitions[catId])) {
                        console.log('[SYNC] Repairing category:', catId);
                        const title = DEFAULT_ITEMS[catId]?.title || catId;
                        this.data.definitions[catId] = {
                            title: title,
                            items: this.data.definitions[catId]
                        };
                    }
                });

                const todayStr = getTodayDate();
                const remoteDate = this.data.meta?.currentDate;
                console.log('[SYNC] needsReset check - remoteDate:', remoteDate, 'today:', todayStr);
                const needsReset = remoteDate !== todayStr;
                if (needsReset) {
                    console.log('[SYNC] Running daily reset!');
                    this.data = this.performDailyReset(this.data);
                    await updateChecklist(gistId, token, this.data);
                } else {
                    console.log('[SYNC] No reset needed, keeping remote data');
                }

                this.saveLocal();
                this.notifyListeners();
            }

        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    migrateToV2(oldData) {
        const defaultTasks = oldData.tasks || JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        const definitions = {};

        // Convert simple lists to defined tasks with schedules
        Object.entries(defaultTasks).forEach(([catId, cat]) => {
            // Fix: Ensure we write an Object {title, items}, not just an Array
            definitions[catId] = {
                title: cat.title || DEFAULT_ITEMS[catId]?.title || catId,
                items: cat.items.map(item => ({
                    id: item.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    label: item.label,
                    time: item.time,
                    schedule: { type: 'daily' }
                }))
            };
        });

        return {
            meta: {
                version: 2,
                currentDate: oldData.date || getTodayDate(),
                lastUpdated: oldData.lastUpdated,
                lastUpdatedBy: oldData.lastUpdatedBy
            },
            definitions: definitions,
            history: [],
            today: {
                items: oldData.items || {}
            }
        };
    }

    performDailyReset(data) {
        const todayStr = getTodayDate();
        const currentDate = data.meta.currentDate;

        if (currentDate === todayStr) {
            return data;
        }

        const yesterdayDate = currentDate;

        // 1. Archive previous day
        const historyEntry = {
            date: yesterdayDate,
            stats: this.calculateStats(data.definitions, data.today.items),
            items: data.today.items
        };

        // Keep 30 days history
        const newHistory = [historyEntry, ...(data.history || [])].slice(0, 30);

        return {
            ...data,
            meta: {
                ...data.meta,
                currentDate: todayStr,
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: 'System'
            },
            history: newHistory,
            today: {
                items: {} // Fresh state
            }
        };
    }

    calculateStats(definitions, itemStates) {
        let total = 0;
        let completed = 0;
        Object.values(definitions).forEach(category => {
            // Fix: access .items array. Category is the Object {title, items}
            if (category && Array.isArray(category.items)) {
                category.items.forEach(task => {
                    total++;
                    if (itemStates[task.id]?.checked) completed++;
                });
            }
        });
        return { total, completed };
    }

    async saveWithRetry(updateFn) {
        const gistId = getGistId();
        const token = getToken();
        if (!token) throw new Error('Token required');

        console.log('[SAVE] Starting saveWithRetry...');
        console.log('[SAVE] Before update - today.items:', JSON.stringify(this.data.today?.items || {}));

        // 1. Optimistic local update
        updateFn(this.data);
        this.touchUpdate();

        console.log('[SAVE] After update - today.items:', JSON.stringify(this.data.today?.items || {}));

        this.saveLocal(); // Persist locally immediately
        this.notifyListeners();

        try {
            console.log('[SAVE] Pushing to Gist...');
            await updateChecklist(gistId, token, this.data);
            console.log('[SAVE] Successfully pushed to Gist');
        } catch (error) {
            console.warn('[SAVE] Save failed, attempting sync-and-retry...', error);

            // 2. Fetch fresh data
            let freshData;
            try {
                freshData = await fetchChecklist(gistId, token);
            } catch (e) {
                console.error("[SAVE] Retry fetch failed, keeping local state un-synced");
                return;
            }

            // 3. Re-apply update to fresh data (Resolution)
            console.log('[SAVE] Re-applying update to fresh data...');
            updateFn(freshData);

            // 4. Update local
            this.data = freshData;
            this.touchUpdate();
            this.saveLocal();
            this.notifyListeners();

            // 5. Retry save
            console.log('[SAVE] Retrying push to Gist...');
            await updateChecklist(gistId, token, this.data);
            console.log('[SAVE] Retry successful');
        }
    }

    async addTask(categoryId, task) {
        await this.saveWithRetry((data) => {
            const newTask = {
                id: `task-${Date.now()}`,
                label: task.label,
                time: task.time,
                schedule: task.schedule || { type: 'daily' }
            };
            if (!data.definitions[categoryId]) {
                const title = DEFAULT_ITEMS[categoryId]?.title || categoryId;
                data.definitions[categoryId] = { title: title, items: [] };
            }
            // Fix: access .items
            data.definitions[categoryId].items.push(newTask);
        });
    }

    async removeTask(categoryId, taskId) {
        await this.saveWithRetry((data) => {
            if (data.definitions[categoryId] && data.definitions[categoryId].items) {
                // Fix: access .items
                data.definitions[categoryId].items = data.definitions[categoryId].items.filter(t => t.id !== taskId);
            }
            if (data.today.items[taskId]) {
                delete data.today.items[taskId];
            }
        });
    }

    async toggleItem(itemId) {
        await this.saveWithRetry((data) => {
            const currentState = data.today.items[itemId] || {};
            const isNowChecked = !currentState.checked;
            data.today.items[itemId] = {
                ...currentState,
                checked: isNowChecked,
                checkedBy: isNowChecked ? getUsername() : null,
                checkedAt: isNowChecked ? getCurrentTime() : null
            };
        });
    }

    async assignItem(itemId, assignee) {
        await this.saveWithRetry((data) => {
            const currentState = data.today.items[itemId] || {};
            data.today.items[itemId] = {
                ...currentState,
                assignedTo: assignee || null
            };
        });
    }

    touchUpdate() {
        if (this.data.meta) {
            this.data.meta.lastUpdated = new Date().toISOString();
            this.data.meta.lastUpdatedBy = getUsername();
        }
    }

    getTodaysTasks() {
        if (!this.data || !this.data.definitions) return DEFAULT_ITEMS;

        const result = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        const today = new Date();
        const dateStr = getTodayDate();
        const dayOfWeek = today.getDay(); // 0 = Sun

        // Reset result items to empty arrays to fill from definitions
        Object.keys(result).forEach(k => result[k].items = []);

        Object.entries(this.data.definitions).forEach(([catId, category]) => {
            // Fix: Handle malformed definitions if repair missed them
            const tasks = Array.isArray(category) ? category : category.items;
            const title = Array.isArray(category) ? catId : category.title;

            if (!result[catId]) {
                result[catId] = { title: title, items: [] };
            }

            if (!tasks) return;

            result[catId].items = tasks.filter(task => {
                const s = task.schedule;
                if (!s) return true; // Default daily
                if (s.type === 'daily') return true;
                if (s.type === 'weekly') {
                    return s.days && s.days.includes(dayOfWeek);
                }
                if (s.type === 'once') {
                    return s.date === dateStr;
                }
                return true;
            });
        });

        return result;
    }

    getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }

    getItems() {
        return this.getTodaysTasks();
    }

    getAllDefinitions() {
        // Fix: Return properly structured objects
        return this.data?.definitions || {};
    }

    getItemState(itemId) {
        return this.data?.today?.items[itemId] || { checked: false };
    }

    getHistory() {
        return this.data?.history || [];
    }

    getProgress() {
        let total = 0;
        let completed = 0;
        const tasks = this.getTodaysTasks();

        Object.values(tasks).forEach(category => {
            if (category.items) {
                category.items.forEach(item => {
                    total++;
                    if (this.data?.today?.items[item.id]?.checked) {
                        completed++;
                    }
                });
            }
        });

        return { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
    }
}

// Export singleton instance
export const checklistManager = new ChecklistManager();
export { DEFAULT_ITEMS, TEAM_MEMBERS, getGistId, getToken, setToken, getUsername, setUsername };
