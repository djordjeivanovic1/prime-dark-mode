document.addEventListener('DOMContentLoaded', function() {
    // Request the active tab's URL from the background script
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { url, hostname } = response;
            document.getElementById('website-span').textContent = hostname;

            // Retrieve and apply stored settings for the current website
            chrome.storage.sync.get(["filtersForWebsites", "darkModeForWebsite"], (data) => {
                const filtersForWebsites = data.filtersForWebsites || {};
                const darkModeForWebsite = data.darkModeForWebsite || {};

                const currentFilters = filtersForWebsites[hostname] || {};
                document.getElementById('brightnessSlider').value = currentFilters.brightness || 50;
                document.getElementById('contrastSlider').value = currentFilters.contrast || -10;
                document.getElementById('sepiaSlider').value = currentFilters.sepia || 0;
                document.getElementById('greyscaleSlider').value = currentFilters.greyscale || 0;
                document.getElementById('brightnessValue').textContent = currentFilters.brightness || 50;
                document.getElementById('contrastValue').textContent = currentFilters.contrast || -10;
                document.getElementById('sepiaValue').textContent = currentFilters.sepia || 0;
                document.getElementById('greyscaleValue').textContent = currentFilters.greyscale || 0;

                document.getElementById('darkModeToggle').checked = darkModeForWebsite[hostname] || false;
                document.getElementById('currentWebsiteToggle').checked = darkModeForWebsite[hostname] || false;
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
                chrome.storage.sync.get(["filtersForWebsites"], (data) => {
                    const filtersForWebsites = data.filtersForWebsites || {};
                    filtersForWebsites[hostname] = filters;
                    chrome.storage.sync.set({ filtersForWebsites: filtersForWebsites }, function() {
                        console.log('Website-specific filters saved!');
                    });
                });
            }
        });
    });

    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('change', function() {
        chrome.runtime.sendMessage({
            action: "toggleDarkMode",
            enable: this.checked
        });

        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                console.error(response.error);
            } else {
                const { hostname } = response;
                chrome.storage.sync.get(["darkModeForWebsite"], (data) => {
                    const darkModeForWebsite = data.darkModeForWebsite || {};
                    darkModeForWebsite[hostname] = this.checked;
                    chrome.storage.sync.set({ darkModeForWebsite: darkModeForWebsite }, function() {
                        console.log('Website-specific dark mode saved!');
                    });
                });
            }
        });
    });

    // Website-specific dark mode toggle
    document.getElementById('currentWebsiteToggle').addEventListener('change', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const host = new URL(tabs[0].url).hostname;
                chrome.runtime.sendMessage({
                    action: "toggleDarkModeForWebsite",
                    enable: this.checked,
                    host: host
                });

                chrome.storage.sync.get(["darkModeForWebsite"], (data) => {
                    const darkModeForWebsite = data.darkModeForWebsite || {};
                    darkModeForWebsite[host] = this.checked;
                    chrome.storage.sync.set({ darkModeForWebsite: darkModeForWebsite }, function() {
                        console.log('Website-specific dark mode toggled!');
                    });
                });
            }
        });
    });

    // Clear all settings button
    document.getElementById('clearAllSettingsButton').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'clearAllSettings' }, (response) => {
            console.log(response.status);
        });
    });
});

// Navigation buttons
document.getElementById('filtersButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

document.getElementById('themesButton').addEventListener('click', () => {
    window.location.href = '../popup/themes.html';
});

document.getElementById('settingsButton').addEventListener('click', () => {
    window.location.href = '../popup/settings.html';
});

// Function to update filters
function updateFilters() {
    const filters = {
        brightness: document.getElementById('brightnessSlider').value,
        contrast: document.getElementById('contrastSlider').value,
        sepia: document.getElementById('sepiaSlider').value,
        greyscale: document.getElementById('greyscaleSlider').value,
    };
    chrome.runtime.sendMessage({ action: 'applyFilters', filters: filters });

    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { hostname } = response;
            chrome.storage.sync.get(["filtersForWebsites"], (data) => {
                const filtersForWebsites = data.filtersForWebsites || {};
                filtersForWebsites[hostname] = filters;
                chrome.storage.sync.set({ filtersForWebsites: filtersForWebsites }, function() {
                    console.log('Website-specific filters updated!');
                });
            });
        }
    });
}

// Slider event listeners
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

// Function to toggle dark mode in the popup
function toggleDarkMode(enable) {
    if (enable) {
        document.documentElement.classList.add("dark-mode");
    } else {
        document.documentElement.classList.remove("dark-mode");
    }
}