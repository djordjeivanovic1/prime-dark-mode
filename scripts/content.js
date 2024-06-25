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

chrome.storage.local.get(["filters"], (data) => {
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

// Apply initial dark mode state from storage
chrome.storage.local.get(["darkMode"], (data) => {
    if (data.darkMode !== undefined) {
        toggleDarkMode(data.darkMode);
    }
});

////////////////////////////////////////////////
// CLEAR ALL FILTERS WHEN EXTENSION IS CLOSED //
////////////////////////////////////////////////

function clearAllFilters() {
    document.documentElement.style.filter = "";
}


//////////////////////////////////////////////////
// LISTEN FOR MESSAGES FROM BACKGROUND SCRIPT   //
//////////////////////////////////////////////////

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleDarkMode') {
        toggleDarkMode(request.darkMode);
        sendResponse({ success: true });
    } else if (request.action === "applyFilters") {
        applyFilters(request.filters);
        sendResponse({ success: true });
    } else if (request.action === "clearFilters") {
        clearAllFilters();
        sendResponse({ status: "filters_cleared" });
    }
});

