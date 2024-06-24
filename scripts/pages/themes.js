let selectedTheme = null;

function selectTheme(themeCard, themeName) {
    // Reset the style for all theme cards
    document.querySelectorAll('.theme-card').forEach(card => {
        card.style.border = '2px solid var(--border-color)';
        card.style.boxShadow = 'none';
        card.style.transform = 'scale(1)';
    });

    // Highlight the selected theme card
    themeCard.style.border = '2px solid blue';
    themeCard.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    themeCard.style.transform = 'scale(1.05)';

    // Store the selected theme
    selectedTheme = themeName;
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['themes'], function(data) {
        const themes = data.themes || {};
        const themeContainer = document.querySelector('.theme-container');
        themeContainer.innerHTML = '';

        for (const themeName in themes) {
            const className = themeName.replace(/\s+/g, '-').toLowerCase();
            const themeCard = document.createElement('div');
            themeCard.className = 'theme-card';
            themeCard.dataset.themeName = themeName;
            themeCard.innerHTML = `
                <div class="theme-preview ${className}"></div>
                <div class="theme-title">${themeName}</div>
            `;
            themeCard.addEventListener('click', () => selectTheme(themeCard, themeName));
            themeContainer.appendChild(themeCard);
        }

        document.querySelector('.apply-btn').addEventListener('click', applyTheme);
        document.querySelector('#websiteButton').addEventListener('click', function() {
            window.location.href = '../../popup/websites.html';  
        });
    });
});

function applyTheme() {
    if (!selectedTheme) {
        alert('Please select a theme to apply.');
        return;
    }
    chrome.storage.local.get(['themes'], function(data) {
        const themes = data.themes || {};
        const themeFilters = themes[selectedTheme];

        if (themeFilters) {
            chrome.storage.local.set({ filters: themeFilters }, function() {
                console.log('Filters set:', themeFilters);  // Log the filters being set
                chrome.runtime.sendMessage({
                    action: "applyFilters",
                    filters: themeFilters
                }, function(response) {
                    if (response) {
                        alert('Theme applied successfully.');
                    }
                });
            });
        } else {
            alert('No filters found for the selected theme.');
        }
    });
}
