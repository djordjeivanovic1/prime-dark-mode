document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

// Handle the addition of a new theme
document.getElementById('addThemeForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const themeName = document.getElementById('addThemeName').value;

    chrome.storage.local.get('currentFilters', function(data) {
        const filters = data.currentFilters;

        chrome.storage.local.get(['themes'], function(data) {
            const themes = data.themes || {};
            themes[themeName] = filters;
            chrome.storage.local.set({ themes: themes }, function() {
                alert('Theme saved!');
                window.location.href = '../popup/themes.html';
            });
        });
    });
});

// Load existing themes into the dropdown for editing
chrome.storage.local.get(['themes'], function(data) {
    const themes = data.themes || {};
    const themeSelect = document.getElementById('themeSelect');

    for (const themeName in themes) {
        const option = document.createElement('option');
        option.value = themeName;
        option.textContent = themeName;
        themeSelect.appendChild(option);
    }
});

// Handle the editing of an existing theme
document.getElementById('editThemeForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const selectedThemeName = document.getElementById('themeSelect').value;

    if (!selectedThemeName) {
        alert('Please select a theme to edit.');
        return;
    }

    chrome.storage.local.get('currentFilters', function(data) {
        const filters = data.currentFilters;

        chrome.storage.local.get(['themes'], function(data) {
            const themes = data.themes || {};
            if (themes[selectedThemeName]) {
                themes[selectedThemeName] = filters;
                chrome.storage.local.set({ themes: themes }, function() {
                    alert('Theme updated!');
                    window.location.href = '../popup/themes.html';
                });
            } else {
                alert('Theme not found.');
            }
        });
    });
});

