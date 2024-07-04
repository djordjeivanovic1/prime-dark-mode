const forbiddenSchemes = ["chrome://", "edge://", "about:", "file://"];

// Initialize storage items and content scripts on installation
chrome.runtime.onInstalled.addListener(async () => {
    chrome.storage.local.set({
        filters: {},
        darkMode: true,
        themes: {},
        activeHours: {},
        extensionShortcut: true,
        extensionActive: true,
        currentWebsiteDarkMode: {},
    });

    const manifest = chrome.runtime.getManifest();
    const contentScripts = manifest.content_scripts || [];

    for (const cs of contentScripts) {
        const tabs = await chrome.tabs.query({ url: cs.matches });
        for (const tab of tabs) {
            if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                chrome.scripting.executeScript({
                    files: cs.js,
                    target: { tabId: tab.id, allFrames: cs.all_frames },
                    injectImmediately: cs.run_at === 'document_start',
                    world: cs.world
                });
            }
        }
    }

    applySettings();
});

// Apply settings on startup
chrome.runtime.onStartup.addListener(() => {
    applySettings();
});

// Handle command shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-extension') {
        const data = await chrome.storage.local.get(['extensionActive']);
        if (data.extensionActive) {
            deactivateExtension();
            await chrome.storage.local.set({ extensionActive: false });
        } else {
            activateExtension();
            await chrome.storage.local.set({ extensionActive: true });
        }
    }
});

// Helper function to apply settings to all tabs
function applySettings() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                const url = new URL(tab.url);
                const hostname = url.hostname;

                chrome.storage.local.get(["filters", "darkMode", "currentWebsiteDarkMode"], (data) => {
                    const filters = data.filters[hostname] || initialFilters;
                    const darkMode = data.currentWebsiteDarkMode[hostname] !== undefined 
                        ? data.currentWebsiteDarkMode[hostname] 
                        : data.darkMode;

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }, () => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "applyFilters",
                            filters: filters
                        });

                        chrome.tabs.sendMessage(tab.id, {
                            action: "toggleDarkMode",
                            darkMode: darkMode
                        });
                    });
                });
            }
        });
    });
}

// Function to apply dark mode on newly opened tabs
function checkAndApplyDarkMode(tabId) {
    chrome.storage.local.get("darkMode", (data) => {
        const darkMode = data.darkMode || false;
        applyDarkMode(tabId, darkMode);
    });
}

// Function to apply settings to a tab
function applySettingsToTab(tabId, tabUrl) {
    if (!tabUrl || forbiddenSchemes.some(scheme => tabUrl.startsWith(scheme))) {
        return;
    }

    const url = new URL(tabUrl);
    const hostname = url.hostname;

    chrome.storage.local.get(["filters", "darkMode", "currentWebsiteDarkMode"], (data) => {
        const filters = data.filters[hostname] || initialFilters;
        chrome.tabs.sendMessage(tabId, {
            action: "applyFilters",
            filters: filters
        });

        const darkMode = data.currentWebsiteDarkMode[hostname] !== undefined 
            ? data.currentWebsiteDarkMode[hostname] 
            : data.darkMode;

        chrome.tabs.sendMessage(tabId, {
            action: "toggleDarkMode",
            darkMode: darkMode
        });
    });
}

// Apply settings to new tabs
chrome.tabs.onCreated.addListener((tab) => {
    checkAndApplyDarkMode(tab.id);
    if (tab.url) {
        applySettingsToTab(tab.id, tab.url);
    }
});

// Apply settings to updated tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        checkAndApplyDarkMode(tabId);
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
                        if (tabs[0] && !forbiddenSchemes.some(scheme => tabs[0].url.startsWith(scheme))) {
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
    }
});

// Function to apply dark mode to a tab
function applyDarkMode(tabId, darkModeOn) {
    chrome.tabs.sendMessage(tabId, {
        action: 'toggleDarkMode',
        darkMode: darkModeOn
    }, function(response) {
        if (response && response.success) {
            if (darkModeOn) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'applyFilters',
                    filters: {
                        brightness: 50,
                        contrast: 70,
                        sepia: 0,
                        greyscale: 30
                    }
                });
            } else {
                chrome.tabs.sendMessage(tabId, {
                    action: 'applyFilters',
                    filters: {
                        brightness: 100,
                        contrast: 100,
                        sepia: 0,
                        greyscale: 0
                    }
                });
            }
        }
    });
}

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