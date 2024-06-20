// Function to apply filters to the webpage
function applyFilters(filters) {
    const filterString = `
        brightness(${filters.brightness}%) 
        contrast(${filters.contrast}%) 
        sepia(${filters.sepia}%) 
        grayscale(${filters.greyscale}%)
    `;
    document.documentElement.style.filter = filterString.trim();
}

// Function to toggle dark mode on the webpage
function toggleDarkMode(enable) {
    if (enable) {
        document.documentElement.classList.add("dark-mode");
    } else {
        document.documentElement.classList.remove("dark-mode");
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "applyFilters") {
        applyFilters(request.filters);
    } else if (request.action === "toggleDarkMode") {
        toggleDarkMode(request.darkMode);
    } else if (request.action === "toggleDarkModeForWebsite") {
        toggleDarkMode(request.enable);
    }
});

// Apply saved filters and dark mode when the content script is loaded
chrome.storage.sync.get(["filters", "darkMode", "darkModeForWebsite"], (data) => {
    if (data.filters) {
        applyFilters(data.filters);
    }
    if (data.darkMode) {
        toggleDarkMode(data.darkMode);
    }

    const url = new URL(window.location.href);
    const darkModeForWebsite = data.darkModeForWebsite || {};
    if (darkModeForWebsite[url.hostname]) {
        toggleDarkMode(true);
    }
});
