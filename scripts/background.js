// CONSTANTS
const forbiddenSchemes = ["chrome://", "edge://", "about:", "file://"];

// INITIALIZE STORAGE ITEMS AND CONTENT SCRIPTS
chrome.runtime.onInstalled.addListener(async () => {
    // Set initial values in storage
    chrome.storage.sync.set({ 
        // filter values
        filters: {},

        // dark mode on/off
        darkMode: false, 

        // theme filter values
        themes: {}, 

        // active hours for current theme
        activeHours: {}, 

        // extension settings
        useSystemSettings: false, 
        extensionShortcut: false
    });

    // Inject content scripts into all matching tabs - this is necessary because the content 
    //script is not injected into tabs that are already open when the extension is installed

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

// STARTUP SETTINGS
chrome.runtime.onStartup.addListener(() => {
    applySettings();
});

//////////////////////
// HELPER FUNCTIONS //
//////////////////////


function applySettings() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }, () => {
                // get filters and dark mode settings from storage
                chrome.storage.local.get("filters", "darkMode", (data) => {
                    if (data.filters) {
                        // send message to content script to apply filters
                        chrome.tabs.sendMessage(tab.id, {
                            action: "applyFilters",
                            filters: data.filters
                        });
                    }
                    // send message to content script to toggle dark mode
                    if (data.darkMode) {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "toggleDarkMode",
                            darkMode: data.darkMode
                        });
                    }
                });
            });
            
        });
    });
}


function clearAllFiltersApplied() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                }, () => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: "clearAllFilters"
                    });
                });
            }
        });
    });
}

//////////////////////
// MESSGAE HANDLERS //
//////////////////////

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "saveFilters") {
        chrome.storage.local.set({ filters: request.filters }, () => {
            sendResponse({ status: "Filters saved" });
        });
        return true; 
    } 
    
    
    else if (request.action === "getFilters") {
        chrome.storage.local.get("filters", (data) => {
            sendResponse(data.filters);
        });
        return true;
    } 
    
    else if (request.action === "applyFilters") {
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
        chrome.storage.sync.set({ darkMode: request.enable }, () => {
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

    // toggle the dark mode for a specific website
    } else if (request.action === "toggleDarkModeForWebsite") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && !forbiddenSchemes.some(scheme => tabs[0].url.startsWith(scheme))) {
                const url = new URL(tabs[0].url);
                chrome.storage.sync.get("darkModeForWebsite", (data) => {
                    const darkModeForWebsite = data.darkModeForWebsite || {};
                    darkModeForWebsite[url.hostname] = request.enable;
                    chrome.storage.sync.set({ darkModeForWebsite: darkModeForWebsite }, () => {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            files: ['content.js']
                        }, () => {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: "toggleDarkModeForWebsite",
                                enable: request.enable
                            });
                        });
                    });
                });
            }
        });

    // clear all filters on a specific website
    } else if (request.action === "clearAllFilters") {
        clearAllFilters();
        // On click, all settings cleared from storage
    } else if (request.action === "clearAllSettings") {
        chrome.storage.sync.set({ url, darkMode: false, themes: {}}, () => {
            sendResponse({ status: "All settings cleared" });
        });
        return true;

    // get information about the currently active tab
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
    }

});