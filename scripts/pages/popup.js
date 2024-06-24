document.addEventListener('DOMContentLoaded', function() {
    

    // Request the active tab's URL from the background script
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { url } = response;
            document.getElementById('website-span').textContent = url;

            // Retrieve and apply stored settings for the current website
            chrome.storage.local.get([url], (data) => {
                const currentFilters = data[url] || {};
                document.getElementById('brightnessSlider').value = currentFilters.brightness || 50;
                document.getElementById('contrastSlider').value = currentFilters.contrast || 100;
                document.getElementById('sepiaSlider').value = currentFilters.sepia || 0;
                document.getElementById('greyscaleSlider').value = currentFilters.greyscale || 0;
                // Update the displayed values
                document.getElementById('brightnessValue').textContent = currentFilters.brightness || 50;
                document.getElementById('contrastValue').textContent = currentFilters.contrast || 100;
                document.getElementById('sepiaValue').textContent = currentFilters.sepia || 0;
                document.getElementById('greyscaleValue').textContent = currentFilters.greyscale || 0;
            });
        }
    });

    // Event listener for "Save as Theme" button
    document.getElementById('addThemeButton').addEventListener('click', function() {
        chrome.storage.sync.get(['filters'], function(data) {
            // Store current filters in localStorage to be accessed in add-theme.html
            localStorage.setItem('currentFilters', JSON.stringify(data.filters));
            // Open the add-theme.html page
            window.location.href = '../popup/add-theme.html';
        });
    });

    // Save settings button
    document.getElementById('saveSettingsButton').addEventListener('click', () => {
        const filters = {
            brightness: document.getElementById('brightnessSlider').value,
            contrast: document.getElementById('contrastSlider').value,
            sepia: document.getElementById('sepiaSlider').value,
            greyscale: document.getElementById('greyscaleSlider').value,
        };

        chrome.runtime.sendMessage({ action: 'saveFilters', filters: filters }, (response) => {
            console.log(response.status);
        });

        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                console.error(response.error);
            } else {
                const { hostname } = response;
                chrome.storage.sync.get(["filters"], (data) => {
                    const filtersForWebsites = data.filtersForWebsites || {};
                    filtersForWebsites[hostname] = filters;
                    chrome.storage.sync.set({ filtersForWebsites: filtersForWebsites }, function() {
                        console.log('Website-specific filters saved!');
                    });
                });
            }
        });
    });


});

////////////////////////////////////
// TOGGLE DARK MODE FUNCTIONALITY //
////////////////////////////////////
function toggleDarkMode(darkModeOn, tabId) {
    chrome.tabs.sendMessage(
        tabId, {
            action: 'toggleDarkMode',
            darkMode: darkModeOn
        }, 
        function(response) {
            if (response && response.success) {
                chrome.storage.sync.set({ darkMode: darkModeOn });
            }
        });
}

// Event listener for dark mode toggle button
document.getElementById('darkModeToggle').addEventListener('click', function() {
    chrome.storage.sync.get(["darkMode"], function(data) {
    const darkModeOn = data.darkMode || false;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        toggleDarkMode(!darkModeOn, tabs[0].id);
    });
    });
});

// Clear all settings button
document.getElementById('clearAllSettingsButton').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearAllSettings' }, (response) => {
        console.log(response.status);
    });
});


///////////////////////////////////////////////////
// UPDATE FILTER VALUES AND APPLY THEM ON CHANGE //
///////////////////////////////////////////////////

function updateFilters() {
    const filters = {
        brightness: document.getElementById('brightnessSlider').value,
        contrast: document.getElementById('contrastSlider').value,
        sepia: document.getElementById('sepiaSlider').value,
        greyscale: document.getElementById('greyscaleSlider').value,
    };
    // send message to apply the values
    chrome.runtime.sendMessage({ action: 'applyFilters', filters: filters });

    // set the filters for the current website
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { hostname } = response;
            chrome.storage.local.get(["filters"], (data) => {
                const filters = data.filters || {};
                filters[hostname] = filters;
                chrome.storage.local.set({ filters: filters }, function() {
                    console.log('Website-specific filters updated!');
                });
            });
        }
    });
}

//////////////////////////
// SLIDER FUNCTIONALITY //
//////////////////////////

document.getElementById('brightnessSlider').addEventListener('input', function() {
    document.getElementById('brightnessValue').textContent = this.value;
    updateFilters();
});

document.getElementById('contrastSlider').addEventListener('input', function() {
    document.getElementById('contrastValue').textContent = this.value;
    updateFilters();
});

document.getElementById('sepiaSlider').addEventListener('input', function() {
    document.getElementById('sepiaValue').textContent = this.value;
    updateFilters();
});

document.getElementById('greyscaleSlider').addEventListener('input', function() {
    document.getElementById('greyscaleValue').textContent = this.value;
    updateFilters();
});


