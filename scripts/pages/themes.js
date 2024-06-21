document.getElementById('filtersButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

document.getElementById('themesButton').addEventListener('click', () => {
    window.location.href = '../popup/themes.html';
});

document.getElementById('settingsButton').addEventListener('click', () => {
    window.location.href = '../popup/settings.html';
});

document.getElementById('websiteButton').addEventListener('click', () => {
    window.location.href = '../popup/websites.html';
});

let selectedTheme = { name: '', className: '' };

// Function to select a theme
function selectTheme(name, className) {
    selectedTheme = { name, className };
    document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('selected'));
    document.querySelector(`.theme-preview.${className}`).parentElement.classList.add('selected');
}

function applyTheme() {
    chrome.storage.sync.get(['themes'], function(data) {
        const themes = data.themes || {};
        const themeFilters = themes[selectedTheme.name];

        if (themeFilters) {
            chrome.storage.sync.set({ filters: themeFilters }, function() {
                chrome.runtime.sendMessage({
                    action: "applyThemeFilters",
                    filters: themeFilters
                }, function(response) {
                    if (response.status === "Filters applied") {
                        alert('Theme applied!');
                    } else {
                        alert('Failed to apply theme.');
                    }
                });
            });
        } else {
            alert('No filters found for the selected theme.');
        }
    });
}

// Function to apply filters in the content script context
function applyFiltersToCurrentPage(filters) {
    const filterString = `
        brightness(${filters.brightness}%) 
        contrast(${filters.contrast}%) 
        sepia(${filters.sepia}%) 
        grayscale(${filters.greyscale}%)
    `;
    document.documentElement.style.filter = filterString.trim();
}

// theme card click event listener
document.querySelector('.apply-btn').addEventListener('click', applyTheme);
chrome.storage.sync.get(['themes'], function(data) {
    const themes = data.themes || {};
    const themeContainer = document.querySelector('.theme-container');
    themeContainer.innerHTML = '';

    for (const [themeName, filters] of Object.entries(themes)) {
        const themeCard = document.createElement('div');
        themeCard.className = 'theme-card';
        themeCard.innerHTML = `
            <div class="theme-preview ${themeName.replace(/\s+/g, '-').toLowerCase()}"></div>
            <div class="theme-title">${themeName}</div>
        `;
        themeCard.addEventListener('click', () => selectTheme(themeName, themeName.replace(/\s+/g, '-').toLowerCase()));
        themeContainer.appendChild(themeCard);
    }
});

