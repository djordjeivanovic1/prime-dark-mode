// Function to enable dark mode
function enableDarkMode() {
    document.body.classList.add('dark-mode');
}

// Function to disable dark mode
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'enableDarkMode') {
        enableDarkMode();
    } else if (request.action === 'disableDarkMode') {
        disableDarkMode();
    }
    sendResponse({status: 'done'});
});

// Check local storage for dark mode preference and apply it
chrome.storage.sync.get(['darkModeEnabled'], (result) => {
    if (result.darkModeEnabled) {
        enableDarkMode();
    }
});
