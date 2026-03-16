// ============================================================
// SkillOS Background Service Worker
// ============================================================

const STORAGE_KEY = "skillos_jobs";
const MAX_JOBS = 100;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// --- Message Router ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "JOB_SCRAPED":
            handleJobScraped(message.data);
            break;

        case "GET_TRENDS":
            handleGetTrends().then(sendResponse);
            return true; // keep channel open for async response

        case "CLEAR_DATA":
            handleClearData();
            break;

        case "SYNC_TO_SKILLOS":
            handleSync(message.data).then(sendResponse);
            return true;

        default:
            break;
    }
});

// --- JOB_SCRAPED ---
async function handleJobScraped(jobData) {
    const result = await chrome.storage.local.get({ [STORAGE_KEY]: [] });
    const jobs = result[STORAGE_KEY];

    // Avoid exact-URL duplicates
    const exists = jobs.some((j) => j.url === jobData.url);
    if (!exists) {
        jobs.push(jobData);
    }

    // Keep only the latest MAX_JOBS entries
    const trimmed = jobs.slice(-MAX_JOBS);
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });

    // Update badge
    chrome.action.setBadgeText({ text: String(trimmed.length) });
    chrome.action.setBadgeBackgroundColor({ color: "#30e8bd" });
}

// --- GET_TRENDS ---
async function handleGetTrends() {
    const result = await chrome.storage.local.get({ [STORAGE_KEY]: [] });
    const jobs = result[STORAGE_KEY];
    const totalJobs = jobs.length;

    if (totalJobs === 0) return [];

    // Aggregate skill frequency
    const freq = {};
    for (const job of jobs) {
        for (const skill of job.skills) {
            freq[skill] = (freq[skill] || 0) + 1;
        }
    }

    // Build sorted array with percentage
    const trends = Object.entries(freq)
        .map(([skill, count]) => ({
            skill,
            count,
            pct: Math.round((count / totalJobs) * 100)
        }))
        .sort((a, b) => b.count - a.count);

    return trends;
}

// --- CLEAR_DATA ---
async function handleClearData() {
    await chrome.storage.local.remove(STORAGE_KEY);
    chrome.action.setBadgeText({ text: "" });
}

// --- SYNC_TO_SKILLOS ---
async function handleSync() {
    try {
        const { skillos_api_url: apiUrl } = await chrome.storage.sync.get("skillos_api_url");
        if (!apiUrl) return { success: false, error: "No API URL configured" };

        const trends = await handleGetTrends();
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trends, synced_at: Date.now() })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ============================================================
// Weekly Cleanup Alarm
// ============================================================

chrome.alarms.create("cleanup", { periodInMinutes: 10080 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== "cleanup") return;

    const result = await chrome.storage.local.get({ [STORAGE_KEY]: [] });
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const fresh = result[STORAGE_KEY].filter((j) => j.timestamp > cutoff);

    await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
    chrome.action.setBadgeText({ text: fresh.length ? String(fresh.length) : "" });
});
