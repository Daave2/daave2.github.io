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
            'Authorization': `token ${token}`,
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
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

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

    return JSON.parse(content);
}

/**
 * Update checklist data in Gist
 */
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
 * Check if data needs reset (new day)
 */
function needsReset(data) {
    return data.date !== getTodayDate();
}

/**
 * Reset checklist for new day
 */
function resetChecklist(data) {
    return {
        date: getTodayDate(),
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: 'System',
        items: {},
        tasks: data.tasks || JSON.parse(JSON.stringify(DEFAULT_ITEMS))
    };
}

/**
 * Main Checklist class
 */
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
        // If migrating from old, we'd need to convert tasks. 
        // For simple init, use defaults.
        this.data.definitions = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
    }

    this.performDailyReset();
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

/**
 * Check if properly configured (token in localStorage)
 */
isConfigured() {
    return !!getToken();
}

/**
 * Subscribe to data changes
 */
subscribe(listener) {
    this.listeners.push(listener);
    return () => this.listeners = this.listeners.filter(l => l !== listener);
}

/**
 * Notify all listeners
 */
notifyListeners() {
    this.listeners.forEach(listener => listener(this.data));
}

/**
 * Start auto-sync
 */
startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
        if (!this.isSyncing) {
            this.sync().catch(e => console.warn('Auto-sync failed:', e));
        }
    }, intervalMs);
}

    /**
     * Sync with Gist
     */
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

        // Refined Logic based on conflict persistence work:
        if (localTime > remoteTime + 2000) {
            console.log('Local is newer, pushing...');
            await updateChecklist(gistId, token, this.data);
        } else {
            console.log('Remote is newer/same, pulling...');
            this.data = remoteData;

            // Migration 1: Tasks -> Definitions
            if (!this.data.version) {
                this.data = this.migrateToV2(this.data);
                await updateChecklist(gistId, token, this.data);
            }

            this.performDailyReset();
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

/**
 * Migrate old data structure to V2
 */
migrateToV2(oldData) {
    const defaultTasks = oldData.tasks || JSON.parse(JSON.stringify(DEFAULT_ITEMS));
    const definitions = {};

    // Convert simple lists to defined tasks with schedules
    Object.entries(defaultTasks).forEach(([catId, cat]) => {
        definitions[catId] = cat.items.map(item => ({
            id: item.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: item.label,
            time: item.time,
            schedule: { type: 'daily' }
        }));
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

/**
 * Check if new day processing is needed
 */
needsReset(data) {
    // Handle V1 data gracefully if sync happened before migration
    const currentDate = data.meta?.currentDate || data.date;
    return currentDate !== getTodayDate();
}

/**
 * Archive yesterday and generate today
 */
performDailyReset(data) {
    const todayStr = getTodayDate();
    const yesterdayDate = data.meta.currentDate;

    // 1. Archive previous day
    const historyEntry = {
        date: yesterdayDate,
        stats: this.calculateStats(data.definitions, data.today.items), // Calculate stats for archived day
        items: data.today.items
    };

    // Keep 30 days history
    const newHistory = [historyEntry, ...(data.history || [])].slice(0, 30);

    // 2. Generate Today's Items (filter definitions by schedule)
    // Note: We don't need to generate 'items' state, just let UI render valid definitions
    // But we DO need to update the currentDate.

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

/**
 * Calculate stats for a set of items (helper)
 */
calculateStats(definitions, itemStates) {
    let total = 0;
    let completed = 0;

    // This is an approximation since definitions might have changed, 
    // but decent enough for history stats.
    // Ideally we'd snapshot definitions too, but that bloats storage.
    Object.values(definitions).forEach(items => {
        items.forEach(task => {
            total++;
            if (itemStates[task.id]?.checked) completed++;
        });
    });

    return { total, completed };
}

    /**
     * Add a new task
     */
    /**
     * Helper to perform optimistic update with retry on 409/conflict
     */
    async saveWithRetry(updateFn) {
    const gistId = getGistId();
    const token = getToken();
    if (!token) throw new Error('Token required');

    // 1. Optimistic local update
    updateFn(this.data);
    this.touchUpdate();
    this.notifyListeners();

    try {
        await updateChecklist(gistId, token, this.data);
    } catch (error) {
        console.warn('Save failed, attempting sync-and-retry...', error);

        // 2. Fetch fresh data
        const freshData = await fetchChecklist(gistId, token);

        // 3. Re-apply update to fresh data (Resolution)
        updateFn(freshData);

        // 4. Update local
        this.data = freshData;
        this.touchUpdate();
        this.notifyListeners();

        // 5. Retry save
        await updateChecklist(gistId, token, this.data);
    }
}

    /**
     * Add a definition (admin/manager)
     */
    async addTask(categoryId, task) {
    await this.saveWithRetry((data) => {
        const newTask = {
            id: `task-${Date.now()}`,
            label: task.label,
            time: task.time,
            schedule: task.schedule || { type: 'daily' }
        };
        if (!data.definitions[categoryId]) {
            data.definitions[categoryId] = [];
        }
        data.definitions[categoryId].push(newTask);
    });
}

    /**
     * Remove a task
     */
    async removeTask(categoryId, taskId) {
    await this.saveWithRetry((data) => {
        // Remove from definitions
        if (data.definitions[categoryId]) {
            data.definitions[categoryId] = data.definitions[categoryId].filter(t => t.id !== taskId);
        }
        // Cleanup today's state
        if (data.today.items[taskId]) {
            delete data.today.items[taskId];
        }
    });
}

    /**
     * Edit a task
     */
    async editTask(categoryId, taskId, updates) {
    // Not implemented yet
}

    /**
     * Toggle item
     */
    async toggleItem(itemId) {
    await this.saveWithRetry((data) => {
        const currentState = data.today.items[itemId] || {};
        const isNowChecked = !currentState.checked; // Toggle based on CURRENT state of the data object passed

        data.today.items[itemId] = {
            ...currentState,
            checked: isNowChecked,
            checkedBy: isNowChecked ? getUsername() : null,
            checkedAt: isNowChecked ? getCurrentTime() : null
        };
    });
}

    /**
     * Assign item
     */
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

/**
 * Get tasks valid for TODAY
 */
getTodaysTasks() {
    if (!this.data || !this.data.definitions) return DEFAULT_ITEMS;

    const result = JSON.parse(JSON.stringify(DEFAULT_ITEMS)); // Start with structure
    const today = new Date();
    const dateStr = getTodayDate();
    const dayOfWeek = today.getDay(); // 0 = Sun

    // Reset result items
    Object.keys(result).forEach(k => result[k].items = []);

    Object.entries(this.data.definitions).forEach(([catId, tasks]) => {
        if (!result[catId]) {
            // Create category if missing from DEFAULT_ITEMS structure (custom cats?)
            // For now, map to existing structure or skip
            return;
        }

        result[catId].items = tasks.filter(task => {
            const s = task.schedule;
            if (s.type === 'daily') return true;
            if (s.type === 'weekly') {
                // s.days is array of 0-6
                return s.days && s.days.includes(dayOfWeek);
            }
            if (s.type === 'biweekly') {
                // Check week parity
                // Placeholder logic: uses ISO week number
                const weekNum = this.getWeekNumber(today);
                // s.startWeek needed? Simplification: 
                // Assume even/odd parity preference.
                // For MVP: Weekly is easier. Let's stick to Daily/Weekly/Once.
                // If user selects 'Bi-weekly', we need reference.
                // Let's implement 'Once' first.
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

// For management UI, we need ALL definitions
getAllDefinitions() {
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
    const tasks = this.getTodaysTasks(); // Only count today's tasks

    Object.values(tasks).forEach(category => {
        category.items.forEach(item => {
            total++;
            if (this.data?.today?.items[item.id]?.checked) {
                completed++;
            }
        });
    });

    return { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

getLastUpdate() {
    if (!this.data?.meta) return null;
    return {
        time: this.data.meta.lastUpdated,
        by: this.data.meta.lastUpdatedBy
    };
}

// ... subscribe/notify remains same ...

/**
 * Subscribe to data changes
 */
subscribe(callback) {
    this.listeners.push(callback);
    return () => {
        this.listeners = this.listeners.filter(l => l !== callback);
    };
}

/**
 * Notify all listeners
 */
notifyListeners() {
    this.listeners.forEach(callback => callback(this.data));
}

/**
 * Start auto-sync (every 30 seconds)
 */
startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) {
        clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => this.sync(), intervalMs);
}

/**
 * Stop auto-sync
 */
stopAutoSync() {
    if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
    }
}
}

// Export singleton instance
export const checklistManager = new ChecklistManager();
export { DEFAULT_ITEMS, TEAM_MEMBERS, getGistId, getToken, setToken, getUsername, setUsername };
