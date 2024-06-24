/////////////////////
// APPLY FILTERS  //
////////////////////

function applyFilters(filters) {
    const filterString = `
        brightness(${filters.brightness}%) 
        contrast(${filters.contrast}%) 
        sepia(${filters.sepia}%) 
        grayscale(${filters.greyscale}%)
    `;
    document.documentElement.style.filter = filterString.trim();
}

chrome.storage.sync.get(["filters"], (data) => {
    if (data.filters) {
        applyFilters(data.filters);
    }
});

////////////////////////////////////
// TOGGLE DARK MODE FUNCTIONALITY //
////////////////////////////////////

// Function to toggle dark mode
function toggleDarkMode(darkModeOn) {
    if (darkModeOn) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleDarkMode') {
        toggleDarkMode(request.darkMode);
        sendResponse({ success: true });
    }
});

//////////////////////////////////////////////////  
// LISTENS FROM MESSAGES FROM BACKGROUND SCRIPT //
//////////////////////////////////////////////////

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleDarkMode') {
        applyDarkMode(request.darkMode);
        sendResponse({ success: true });

    } else if (request.action === "applyFilters") {
        applyFilters(request.filters);
        sendResponse({ success: true });
    }
});


////////////////////////////////
// CLEAR FILTERS AND SETTINGS //
////////////////////////////////

// Function to clear all filters


// Listen for messages from the background or popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "clearAllFilters") {
        clearAllFilters();
        sendResponse({ status: "filters_cleared" });
    }
  
});