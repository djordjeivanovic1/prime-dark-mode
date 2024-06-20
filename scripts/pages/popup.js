// Button event listeners and routers
document.getElementById('filtersButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

document.getElementById('themesButton').addEventListener('click', () => {
    window.location.href = '../popup/themes.html';
});

document.getElementById('settingsButton').addEventListener('click', () => {
    window.location.href = '../popup/settings.html';
});

document.getElementById('addThemeButton').addEventListener('click', () => {
    window.location.href = '../popup/add-theme.html';
});
// Function to send updated filters to the background script
function updateFilters() {
    const filters = {
        brightness: document.getElementById('brightnessSlider').value,
        contrast: document.getElementById('contrastSlider').value,
        sepia: document.getElementById('sepiaSlider').value,
        greyscale: document.getElementById('greyscaleSlider').value,
    };
    chrome.runtime.sendMessage({ action: 'applyFilters', filters: filters });
}

// Slider values adjustment based on user input
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

// Save filters settings
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
    updateFilters();
});

// Toggle dark mode
document.getElementById('darkModeToggle').addEventListener('change', (event) => {
    chrome.runtime.sendMessage({ action: 'toggleDarkMode', enable: event.target.checked });
});

// Toggle dark mode for current website
document.getElementById('currentWebsiteToggle').addEventListener('change', (event) => {
    chrome.runtime.sendMessage({ action: 'toggleDarkModeForWebsite', enable: event.target.checked });
});

// Load saved filters and dark mode state on popup open
chrome.storage.sync.get(["filters", "darkMode", "darkModeForWebsite"], (data) => {
    if (data.filters) {
        document.getElementById('brightnessSlider').value = data.filters.brightness || 50;
        document.getElementById('contrastSlider').value = data.filters.contrast || -10;
        document.getElementById('sepiaSlider').value = data.filters.sepia || 0;
        document.getElementById('greyscaleSlider').value = data.filters.greyscale || 0;
        document.getElementById('brightnessValue').textContent = data.filters.brightness || 50;
        document.getElementById('contrastValue').textContent = data.filters.contrast || -10;
        document.getElementById('sepiaValue').textContent = data.filters.sepia || 0;
        document.getElementById('greyscaleValue').textContent = data.filters.greyscale || 0;
    }
    document.getElementById('darkModeToggle').checked = data.darkMode || false;
    document.getElementById('currentWebsiteToggle').checked = data.darkModeForWebsite || false;
});
