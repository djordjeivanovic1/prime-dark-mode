chrome.runtime.onInstalled.addListener(async () => {
    // Set initial values in storage
    chrome.storage.sync.set({ filters: {}, darkMode: false, darkModeForWebsite: {} });

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
});


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
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['scripts/content.js']
                }, () => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "applyFilters",
                        filters: request.filters
                    });
                });
            }
        });
    } else if (request.action === "toggleDarkMode") {
        chrome.storage.sync.get("darkMode", (data) => {
            const newDarkMode = request.enable;
            chrome.storage.sync.set({ darkMode: newDarkMode }, () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            files: ['scripts/content.js']
                        }, () => {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: "toggleDarkMode",
                                darkMode: newDarkMode
                            });
                        });
                    }
                });
            });
        });
    } else if (request.action === "toggleDarkModeForWebsite") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = new URL(tabs[0].url);
            chrome.storage.sync.get("darkModeForWebsite", (data) => {
                const darkModeForWebsite = data.darkModeForWebsite || {};
                darkModeForWebsite[url.hostname] = request.enable;
                chrome.storage.sync.set({ darkModeForWebsite: darkModeForWebsite }, () => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ['scripts/content.js']
                    }, () => {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "toggleDarkModeForWebsite",
                            enable: request.enable
                        });
                    });
                });
            });
        });
    }
});
