const forbiddenSchemes = ["chrome://", "edge://", "about:", "file://"];

const initialFilters = {
    brightness: 100,
    contrast: 100,
    sepia: 0,
    greyscale: 0
};

// Initialize storage items and content scripts on installation
chrome.runtime.onInstalled.addListener(async () => {
    try {
        await chrome.storage.local.set({
            filters: {},
            darkMode: true,
            themes: {},
            activeHours: {},
            extensionShortcut: true,
            extensionActive: true,
            currentWebsiteDarkMode: {},
            selectedTheme: null
        });

        const manifest = chrome.runtime.getManifest();
        const contentScripts = manifest.content_scripts || [];

        for (const cs of contentScripts) {
            const tabs = await chrome.tabs.query({ url: cs.matches });
            for (const tab of tabs) {
                if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                    await chrome.scripting.executeScript({
                        files: cs.js,
                        target: { tabId: tab.id, allFrames: cs.all_frames },
                        injectImmediately: cs.run_at === 'document_start',
                        world: cs.world
                    });
                }
            }
        }

        applySettings();
    } catch (error) {
        console.error('Error during onInstalled:', error);
    }
});

// Apply settings on startup
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.set({ darkMode: true }, () => {
        applySettings();
    });
});


// Function to apply settings to a tab
async function applySettingsToTab(tabId, tabUrl) {
    if (!tabUrl || forbiddenSchemes.some(scheme => tabUrl.startsWith(scheme))) {
        return;
    }

    try {
        const url = new URL(tabUrl);
        const hostname = url.hostname;

        const data = await chrome.storage.local.get(["filters", "darkMode", "currentWebsiteDarkMode", "selectedTheme", "themes"]);
        let filters = data.filters[hostname];
        const darkMode = data.currentWebsiteDarkMode[hostname] !== undefined
            ? data.currentWebsiteDarkMode[hostname]
            : data.darkMode;

        if (darkMode === false) {
            return; // Dark mode is off, so don't apply any settings
        }

        if (!filters) {
            const themeFilters = data.themes[data.selectedTheme];
            filters = themeFilters || initialFilters;
        }

        // Apply filters and dark mode settings
        const response = await chrome.tabs.sendMessage(tabId, {
            action: "applyFilters",
            filters: filters
        });

        if (!response || !response.success) {
            console.warn(`Failed to apply filters on tab ${tabId}, reloading tab.`);
            chrome.tabs.reload(tabId);
        }

        const darkModeResponse = await chrome.tabs.sendMessage(tabId, {
            action: "toggleDarkMode",
            darkMode: darkMode
        });

        if (!darkModeResponse || !darkModeResponse.success) {
            console.warn(`Failed to apply dark mode on tab ${tabId}, reloading tab.`);
            chrome.tabs.reload(tabId);
        }

    } catch (error) {
        console.error('Error applying settings to tab:', error);
    }
}

function applySettings() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            applySettingsToTab(tab.id, tab.url);
        });
    });
}

// Apply settings to new tabs
chrome.tabs.onCreated.addListener((tab) => {
    applySettingsToTab(tab.id, tab.url);
});

// Apply settings to updated tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        applySettingsToTab(tabId, tab.url);
    }
});


// Helper function to clear all filters and reset dark mode
function clearAllSettings() {
    chrome.storage.local.set({
        filters: {},
        currentWebsiteDarkMode: {},
        darkMode: false,
    }, () => {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                    chrome.tabs.sendMessage(tab.id, { action: 'clearAllFilters' });
                    chrome.tabs.sendMessage(tab.id, { action: 'toggleDarkMode', darkMode: false });
                    chrome.tabs.sendMessage(tab.id, { action: 'clearThemes' });
                }
            });
        });
    });
}

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveFilters") {
        chrome.storage.local.get("filters", (data) => {
            const filtersForWebsites = data.filters || {};
            filtersForWebsites[request.hostname] = request.filters;
            chrome.storage.local.set({ filters: filtersForWebsites }, () => {
                sendResponse({ status: "Filters saved for " + request.hostname });
            });
        });
        return true;
    } else if (request.action === "getFilters") {
        chrome.storage.local.get("filters", (data) => {
            sendResponse(data.filters);
        });
        return true;
    } else if (request.action === "applyFilters") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, () => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "applyFilters",
                        filters: request.filters
                    });
                });
            }
        });
        return true;
    } else if (request.action === "toggleDarkMode") {
        chrome.storage.local.set({ darkMode: request.enable }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && !forbiddenSchemes.some(scheme => tabs[0].url.startsWith(scheme))) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ['content.js']
                    }, () => {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "toggleDarkMode",
                            darkMode: request.enable
                        });
                    });
                }
            });
        });
        return true;
    } else if (request.action === "toggleCurrentWebsiteDarkMode") {
        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                sendResponse({ error: response.error });
                return;
            }

            const { hostname } = response;
            chrome.storage.local.get("currentWebsiteDarkMode", (data) => {
                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                currentWebsiteDarkMode[hostname] = request.darkMode;
                chrome.storage.local.set({ currentWebsiteDarkMode: currentWebsiteDarkMode }, () => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0] && !isDarkTheme) {
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                files: ['content.js']
                            }, () => {
                                chrome.tabs.sendMessage(tabs[0].id, {
                                    action: "toggleDarkMode",
                                    darkMode: request.darkMode
                                });
                                sendResponse({ success: true });
                            });
                        }
                    });
                });
            });
        });
        return true;
    } else if (request.action === "getActiveTabInfo") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                const url = new URL(activeTab.url);
                sendResponse({ url: url.href, hostname: url.hostname });
            } else {
                sendResponse({ error: "No active tab found" });
            }
        });
        return true;
    } else if (request.action === "clearAllFilters") {
        clearAllSettings();
        return true;
    }
});

// Function to activate the extension
function activateExtension() {
    chrome.storage.local.set({ extensionActive: true }, function() {
        applySettings();
    });
}

// Function to deactivate the extension
function deactivateExtension() {
    chrome.storage.local.set({ extensionActive: false }, function() {
        clearAllSettings();
    });
}