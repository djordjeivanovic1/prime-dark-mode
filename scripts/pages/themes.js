let selectedTheme = null;

function selectTheme(themeCard, themeName) {
    // Reset the style for all theme cards
    document.querySelectorAll('.theme-card').forEach(card => {
        card.style.border = '1px solid var(--border-color)';
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

        const themeGradients = [
            'linear-gradient(135deg, #FF5733 0%, #FFC300 100%)', // Orange to Yellow
            'linear-gradient(135deg, #8E44AD 0%, #3498DB 100%)', // Purple to Blue
            'linear-gradient(135deg, #3498DB 0%, #2ECC71 100%)', // Blue to Green
            'linear-gradient(135deg, #E74C3C 0%, #F39C12 100%)', // Red to Orange
            'linear-gradient(135deg, #2ECC71 0%, #1ABC9C 100%)', // Green to Teal
            'linear-gradient(135deg, #F39C12 0%, #D35400 100%)', // Orange to Dark Orange
            'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)', // Teal to Dark Teal
            'linear-gradient(135deg, #F1C40F 0%, #F39C12 100%)', // Yellow to Orange
            'linear-gradient(135deg, #34495E 0%, #2C3E50 100%)', // Dark Blue to Darker Blue
            'linear-gradient(135deg, #E67E22 0%, #E74C3C 100%)'  // Orange to Red
        ];

        let styleIndex = 0;

        for (const themeName in themes) {
            const themeCard = document.createElement('div');
            themeCard.className = 'theme-card';
            themeCard.dataset.themeName = themeName;
            themeCard.innerHTML = `
                <div class="theme-preview" style="background: ${themeGradients[styleIndex % themeGradients.length]};"></div>
                <div class="theme-title">${themeName}</div>
            `;
            themeCard.addEventListener('click', () => selectTheme(themeCard, themeName));
            themeContainer.appendChild(themeCard);

            styleIndex++;
        }

        document.querySelector('.apply-btn').addEventListener('click', applyTheme);
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
                console.log('Filters set:', themeFilters); 
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