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
                const filtersData = data.filters || {};
                filtersData[hostname] = filters;
                chrome.storage.local.set({ filters: filtersData }, function() {
                    console.log('Website-specific filters updated!');
                });
            });
        }
    });
}

function showAlert(filters, hostname) {
    const alertText = `Settings for ${hostname} saved:\n
    Brightness: ${filters.brightness}\n
    Contrast: ${filters.contrast}\n
    Sepia: ${filters.sepia}\n
    Greyscale: ${filters.greyscale}`;

    alert(alertText);
}

function applyDarkMode(tabId, darkModeOn) {
    chrome.tabs.sendMessage(tabId, {
        action: 'toggleDarkMode',
        darkMode: darkModeOn
    }, function(response) {
        if (response && response.success) {
            if (darkModeOn) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'applyFilters',
                    filters: {
                        brightness: 50,
                        contrast: 70,
                        sepia: 0,
                        greyscale: 30
                    }
                });
            } else {
                chrome.tabs.sendMessage(tabId, {
                    action: 'applyFilters',
                    filters: {
                        brightness: 100,
                        contrast: 100,
                        sepia: 0,
                        greyscale: 0
                    }
                });
            }
        }
    });
}

function toggleDarkMode(darkModeOn, tabId) {
    chrome.storage.local.set({ darkMode: darkModeOn }, () => {
        applyDarkMode(tabId, darkModeOn);
    });
}

function toggleCurrentWebsiteDarkMode(darkModeOn, tabId) {
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { hostname } = response;
            chrome.storage.local.get("currentWebsiteDarkMode", (data) => {
                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                currentWebsiteDarkMode[hostname] = darkModeOn;
                chrome.storage.local.set({ currentWebsiteDarkMode: currentWebsiteDarkMode }, () => {
                    applyDarkMode(tabId, darkModeOn);
                });
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {

    let initialFilters = {
        brightness: 100,
        contrast: 100,
        sepia: 0,
        greyscale: 0
    };
    // Request the active tab's URL from the background script
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { url, hostname } = response;
            document.getElementById('website-span').textContent = url;

            // Retrieve and apply stored settings for the current website
            chrome.storage.local.get(["filters", "currentWebsiteDarkMode"], (data) => {
                const currentFilters = data.filters[hostname] || initialFilters;
                document.getElementById('brightnessSlider').value = currentFilters.brightness;
                document.getElementById('contrastSlider').value = currentFilters.contrast;
                document.getElementById('sepiaSlider').value = currentFilters.sepia;
                document.getElementById('greyscaleSlider').value = currentFilters.greyscale;
                // Update the displayed values
                document.getElementById('brightnessValue').textContent = currentFilters.brightness;
                document.getElementById('contrastValue').textContent = currentFilters.contrast;
                document.getElementById('sepiaValue').textContent = currentFilters.sepia;
                document.getElementById('greyscaleValue').textContent = currentFilters.greyscale;

                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                document.getElementById('currentWebsiteToggle').checked = currentWebsiteDarkMode[hostname] || false;
            });
        }
    });

    // Save settings button
    document.getElementById('saveSettingsButton').addEventListener('click', () => {
        const filters = {
            brightness: document.getElementById('brightnessSlider').value,
            contrast: document.getElementById('contrastSlider').value,
            sepia: document.getElementById('sepiaSlider').value,
            greyscale: document.getElementById('greyscaleSlider').value,
        };

        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                console.error(response.error);
            } else {
                const { hostname } = response;
                chrome.runtime.sendMessage({ action: 'saveFilters', filters: filters, hostname: hostname }, (response) => {
                    console.log(response.status);
                    showAlert(filters, hostname);
                });
            }
        });
    });

    // Event listener for dark mode toggle button
    document.getElementById('darkModeToggle').addEventListener('click', function() {
        chrome.storage.local.get(["darkMode"], function(data) {
            const darkModeOn = data.darkMode || false;
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                toggleDarkMode(!darkModeOn, tabs[0].id);  // Toggle the state
            });
        });
    });

    // Event listener for current website dark mode toggle button
    document.getElementById('currentWebsiteToggle').addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const tabId = tabs[0].id;
            chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
                const { hostname } = response;
                chrome.storage.local.get(["currentWebsiteDarkMode"], function(data) {
                    const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                    const darkModeOn = !currentWebsiteDarkMode[hostname];  // Toggle the state
                    toggleCurrentWebsiteDarkMode(darkModeOn, tabId);
                });
            });
        });
    });

    // Event listener for "Save as Theme" button
    document.getElementById('addThemeButton').addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                console.error(response.error);
            } else {
                const { hostname } = response;
                chrome.storage.local.get(['filters'], function(data) {
                    const currentFilters = data.filters[hostname] || {};
                    chrome.storage.local.set({ currentFilters: currentFilters }, function() {
                        // Redirect to add-theme.html after setting the filters
                        window.location.href = 'add-theme.html';
                    });
                });
            }
        });
    });

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
});