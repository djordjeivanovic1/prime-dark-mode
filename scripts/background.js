const forbiddenSchemes = ["chrome://", "edge://", "about:", "file://"];

chrome.runtime.onInstalled.addListener(async () => {
    // Set initial values in storage
    chrome.storage.sync.set({ filters: {}, darkMode: false, darkModeForWebsite: {}, themes: {}, activeHours: {}, useSystemSettings: false, extensionShortcut: false, extensionActive: true });

    // Inject content scripts into all matching tabs
    for (const cs of chrome.runtime.getManifest().content_scripts) {
        for (const tab of await chrome.tabs.query({ url: cs.matches })) {
            if (tab.url.match(/(chrome|chrome-extension):\/\//gi)) {
                continue;
            }
            chrome.scripting.executeScript({
                files: cs.js,
                target: { tabId: tab.id, allFrames: cs.all_frames },
                injectImmediately: cs.run_at === 'document_start',
                world: cs.world
            });
        }
    }
    // Set alarms for active hours
    updateAlarms();
});


chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'startActiveHours') {
        chrome.storage.sync.set({ extensionActive: true }, function() {
            applySettingsToAllTabs();
            console.log('Extension activated during active hours.');
        });
    } else if (alarm.name === 'endActiveHours') {
        chrome.storage.sync.set({ extensionActive: false }, function() {
            clearAllFilters();
            console.log('Extension deactivated outside active hours.');
        });
    }
});

function updateAlarms() {
    chrome.storage.sync.get(['activeHours'], function(data) {
        const activeHours = data.activeHours || {};
        if (activeHours.enabled) {
            const start = convertTo24Hour(activeHours.startHour, activeHours.startMinute, activeHours.startPeriod);
            const end = convertTo24Hour(activeHours.endHour, activeHours.endMinute, activeHours.endPeriod);

            chrome.alarms.clearAll(function() {
                chrome.alarms.create('startActiveHours', { when: start });
                chrome.alarms.create('endActiveHours', { when: end });
                console.log('Alarms set for active hours.');
            });
        } else {
            chrome.alarms.clearAll(function() {
                console.log('Active hours disabled, all alarms cleared.');
            });
        }
    });
}

function convertTo24Hour(hour, minute, period) {
    if (period === 'PM' && hour !== '12') {
        hour = parseInt(hour) + 12;
    } else if (period === 'AM' && hour === '12') {
        hour = 0;
    }
    const now = new Date();
    now.setHours(hour, minute, 0, 0);
    return now.getTime();
}

function applySettingsToAllTabs() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                }, () => {
                    chrome.storage.sync.get(["filters", "darkMode", "darkModeForWebsite"], (data) => {
                        if (data.filters) {
                            chrome.tabs.sendMessage(tab.id, {
                                action: "applyFilters",
                                filters: data.filters
                            });
                        }

                        if (data.darkMode) {
                            chrome.tabs.sendMessage(tab.id, {
                                action: "toggleDarkMode",
                                darkMode: data.darkMode
                            });
                        }

                        const urlObj = new URL(tab.url);
                        const darkModeForWebsite = data.darkModeForWebsite || {};
                        if (darkModeForWebsite[urlObj.hostname]) {
                            chrome.tabs.sendMessage(tab.id, {
                                action: "toggleDarkModeForWebsite",
                                enable: true
                            });
                        }
                    });
                });
            }
        });
    });
}

function clearAllFilters() {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveFilters") {
        chrome.storage.sync.set({ filters: request.filters }, () => {
            sendResponse({ status: "Filters saved" });
        });
        return true; // Indicate that we will respond asynchronously
    } else if (request.action === "getFilters") {
        chrome.storage.sync.get("filters", (data) => {
            sendResponse(data.filters);
        });
        return true;
    } else if (request.action === "applyFilters") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && !forbiddenSchemes.some(scheme => tabs[0].url.startsWith(scheme))) {
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
    } else if (request.action === "clearAllSettings") {
        chrome.storage.sync.set({ filters: {}, darkMode: false, darkModeForWebsite: {}, themes: {} }, () => {
            sendResponse({ status: "All settings cleared" });
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
    } else if (request.action === "applyThemeFilters") {
        const { filters } = request;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    function: applyFiltersToCurrentPage,
                    args: [filters]
                }, () => {
                    sendResponse({ status: "Filters applied" });
                });
            } else {
                sendResponse({ error: "No active tab found" });
            }
        });
        return true;
    }
});

// Function to apply filters in the content script context
function applyFiltersToCurrentPage(filters) {
    const filterString = `
        brightness(${filters.brightness}%) 
        contrast(${filters.contrast}%) 
        sepia(${filters.sepia}%) 
        grayscale(${filters.greyscale}%)
    `;
    document.documentElement.style.filter = filterString.trim();
}

// Insert Alert Function
function insertAlert() {
    const alertBox = document.getElementById('alertBox');
    if (alertBox) {
        // Create alert title
        const alertTitle = document.createElement("h4");
        alertTitle.style.fontSize = "20px";
        alertTitle.style.color = "red";
        alertTitle.style.textAlign = "center";
        alertTitle.style.fontWeight = "bold";
        alertTitle.style.marginTop = "10px";
        alertTitle.style.marginBottom = "10px";
        alertTitle.innerText = "This website is forbidden for modification";

        // Create alert description
        const description = document.createElement("p");
        description.style.fontSize = "14px";
        description.style.color = "white";
        description.style.textAlign = "center";
        description.style.fontWeight = "semi-bold";
        description.style.marginTop = "10px";
        description.style.marginBottom = "10px";
        description.innerText = "Some websites do not allow any modification to their content. Please try another website.";

        // Clear previous content and append new elements
        alertBox.innerHTML = '';
        alertBox.appendChild(alertTitle);
        alertBox.appendChild(description);
    }
}
