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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id === tabId) {
                const urlObj = new URL(tab.url);
                const hostname = urlObj.hostname;

                if (forbiddenHosts.includes(hostname)) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        function: insertAlert
                    });
                }
            }
        });
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
