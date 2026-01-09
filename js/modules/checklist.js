/**
 * Daily Checklist Module
 * Syncs checklist state to a GitHub Gist for shared team access
 */

// Hardcoded Gist ID (shared across all users)
const GIST_ID = '95a61f781f9655c1abb90d6daff4a7c2';
const GIST_FILENAME = 'daily_checklist.json';
const TOKEN_STORAGE_KEY = 'checklist_github_token';

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
    const headers = token ? { 'Authorization': `token ${token}` } : {};

    const response = await fetch(`https://api.github.com/gists/${gistId}`, { headers });

    if (!response.ok) {
        throw new Error(`Failed to fetch Gist: ${response.status}`);
    }

    const gist = await response.json();
    const content = gist.files[GIST_FILENAME]?.content;

    if (!content) {
        throw new Error('Checklist file not found in Gist');
    }

    return JSON.parse(content);
}

/**
 * Update checklist data in Gist
 */
async function updateChecklist(gistId, token, data) {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${token}`,
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
        throw new Error(`Failed to update Gist: ${response.status}`);
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
        items: {}
    };
}

/**
 * Main Checklist class
 */
class ChecklistManager {
    constructor() {
        this.data = null;
        this.listeners = [];
        this.syncInterval = null;
    }

    /**
     * Check if properly configured (token in localStorage)
     */
    isConfigured() {
        return !!getToken();
    }

    /**
     * Sync with Gist
     */
    async sync() {
        const gistId = getGistId();
        const token = getToken();

        if (!gistId) {
            throw new Error('Gist not configured');
        }

        try {
            this.data = await fetchChecklist(gistId, token);

            // Check if we need to reset for a new day
            if (needsReset(this.data)) {
                this.data = resetChecklist(this.data);
                if (token) {
                    await updateChecklist(gistId, token, this.data);
                }
            }

            this.notifyListeners();
            return this.data;
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    }

    /**
     * Toggle an item's checked state
     */
    async toggleItem(itemId) {
        const gistId = getGistId();
        const token = getToken();

        if (!token) {
            throw new Error('Token required to update checklist');
        }

        const currentState = this.data.items[itemId] || {};
        const isNowChecked = !currentState.checked;

        // Optimistic update - preserve assignment
        this.data.items[itemId] = {
            ...currentState,
            checked: isNowChecked,
            checkedBy: isNowChecked ? getUsername() : null,
            checkedAt: isNowChecked ? getCurrentTime() : null
        };

        this.data.lastUpdated = new Date().toISOString();
        this.data.lastUpdatedBy = getUsername();

        this.notifyListeners();

        // Persist to Gist
        try {
            await updateChecklist(gistId, token, this.data);
        } catch (error) {
            // Revert on failure
            console.error('Failed to save:', error);
            await this.sync();
            throw error;
        }
    }

    /**
     * Assign a task to a team member
     */
    async assignItem(itemId, assignee) {
        const gistId = getGistId();
        const token = getToken();

        if (!token) {
            throw new Error('Token required to update checklist');
        }

        const currentState = this.data.items[itemId] || {};

        // Update assignment
        this.data.items[itemId] = {
            ...currentState,
            assignedTo: assignee || null
        };

        this.data.lastUpdated = new Date().toISOString();
        this.data.lastUpdatedBy = getUsername();

        this.notifyListeners();

        // Persist to Gist
        try {
            await updateChecklist(gistId, token, this.data);
        } catch (error) {
            console.error('Failed to save assignment:', error);
            await this.sync();
            throw error;
        }
    }

    /**
     * Get all items with their current state
     */
    getItems() {
        return DEFAULT_ITEMS;
    }

    /**
     * Get item state
     */
    getItemState(itemId) {
        return this.data?.items[itemId] || { checked: false };
    }

    /**
     * Get progress stats
     */
    getProgress() {
        let total = 0;
        let completed = 0;

        Object.values(DEFAULT_ITEMS).forEach(category => {
            category.items.forEach(item => {
                total++;
                if (this.data?.items[item.id]?.checked) {
                    completed++;
                }
            });
        });

        return { total, completed, percentage: Math.round((completed / total) * 100) };
    }

    /**
     * Get last update info
     */
    getLastUpdate() {
        if (!this.data) return null;
        return {
            time: this.data.lastUpdated,
            by: this.data.lastUpdatedBy
        };
    }

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
export { DEFAULT_ITEMS, TEAM_MEMBERS, getGistId, getToken, setToken };
