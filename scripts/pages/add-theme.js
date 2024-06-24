document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

document.getElementById('addThemeForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const themeName = document.getElementById('addThemeName').value;
    const filters = JSON.parse(localStorage.getItem('currentFilters'));

    chrome.storage.local.get(['themes'], function(data) {
        const themes = data.themes || {};
        themes[themeName] = filters;
        chrome.storage.local.set({ themes: themes }, function() {
            alert('Theme saved!');
            window.location.href = '../popup/themes.html';
        });
    });
});


// Editing functionality implemenentation

document.getElementById('editThemeForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const themeName = document.getElementById('theme-title').value;
    const filters = JSON.parse(localStorage.getItem('currentFilters'));

    chrome.storage.local.get(['themes'], function(data) {
        const themes = data.themes || {};
        if (themes[themeName]) {
            themes[themeName] = filters;
            chrome.storage.local.set({ themes: themes }, function() {
                alert('Theme updated!');
                window.location.href = '../popup/themes.html';
            });
        } else {
            alert('Theme not found.');
        }
    });
});

// Load existing themes into the dropdown for editing
chrome.storage.local.get(['themes'], function(data) {
    const themes = data.themes || {};
    const themeSelect = document.getElementById('themeSelect');
    themeSelect.innerHTML = '<option value="">Select Theme to Edit</option>';

    for (const themeName of Object.keys(themes)) {
        const option = document.createElement('option');
        option.value = themeName;
        option.textContent = themeName;
        themeSelect.appendChild(option);
    }

    themeSelect.addEventListener('change', function() {
        const selectedTheme = themes[this.value];
        if (selectedTheme) {
            localStorage.setItem('currentFilters', JSON.stringify(selectedTheme));
        }
    });
});
