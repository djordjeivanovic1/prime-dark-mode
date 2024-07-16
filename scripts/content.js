/////////////////////
// APPLY FILTERS  //
////////////////////

function activateDarkMode() {
    document.querySelector('html').style.filter = 'invert(1) hue-rotate(180deg)';
    let media = document.querySelectorAll("img, picture, video")
        media.forEach((element) => {
        element.style.filter = 'invert(1) hue-rotate(180deg)';
        });
}

function applyFilters(filters) {
    const filterString = `
        brightness(${filters.brightness || 100}%) 
        contrast(${filters.contrast || 100}%) 
        sepia(${filters.sepia || 0}%) 
        grayscale(${filters.greyscale || 0}%)
    `;
    document.documentElement.style.filter = filterString.trim();
}

// Apply initial filter state from storage
chrome.storage.local.get(["filters"], (data) => {
    if (data.filters) {
        applyFilters(data.filters);
    }
});

////////////////////////////////////
// TOGGLE DARK MODE FUNCTIONALITY //
////////////////////////////////////

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

///////////////////////////////////
// CLEAR ALL THEMES FUNCTIONALITY //
///////////////////////////////////

// Function to clear all themes
function clearThemes() {
    document.documentElement.style.filter = "";
    document.body.classList.remove('dark-mode');
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
    } else if (request.action === "clearThemes") {
        clearThemes();
        sendResponse({ status: "themes_cleared" });
    }
});