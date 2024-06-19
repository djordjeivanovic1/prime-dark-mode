// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ darkModeEnabled: false }, () => {
        console.log("Dark mode is set to false by default.");
    });
});

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleDarkMode') {
        chrome.storage.sync.get(['darkModeEnabled'], (result) => {
            const newDarkModeStatus = !result.darkModeEnabled;
            chrome.storage.sync.set({ darkModeEnabled: newDarkModeStatus }, () => {
                console.log(`Dark mode is now set to ${newDarkModeStatus}`);
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: newDarkModeStatus ? 'enableDarkMode' : 'disableDarkMode'
                        });
                    });
                });
                sendResponse({status: 'done'});
            });
        });
        return true;  // Indicates that the response is sent asynchronously
    }
});
