let selectedTheme = null;

const predefinedThemes = {
    "Sepia": { brightness: 100, contrast: 100, sepia: 100, greyscale: 0 },
    "Grey": { brightness: 100, contrast: 100, sepia: 0, greyscale: 100 },
    "No Filters%": { brightness: 100, contrast: 100, sepia: 0, greyscale: 0 },
    "Night Read": { brightness: 60, contrast: 100, sepia: 40, greyscale: 0 }
};

function selectTheme(themeCard, themeName) {
    if (selectedTheme === themeName) {
        // Deselect the theme
        themeCard.style.border = '1px solid var(--border-color)';
        themeCard.style.boxShadow = 'none';
        themeCard.style.transform = 'scale(1)';
        selectedTheme = null;
        chrome.storage.local.remove('selectedTheme');
        return;
    }
    
    // Reset the style for all theme cards
    document.querySelectorAll('.theme-card').forEach(card => {
        card.style.border = '1px solid var(--border-color)';
        card.style.boxShadow = 'none';
        card.style.transform = 'scale(1)';
    });

    // Highlight the selected theme card
    themeCard.style.border = '2px solid var(--border-color)';
    themeCard.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    themeCard.style.transform = 'scale(1.05)';

    // Store the selected theme
    selectedTheme = themeName;
    chrome.storage.local.set({ selectedTheme: themeName });
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['themes', 'selectedTheme'], function(data) {
        let themes = data.themes || {};
        const selectedTheme = data.selectedTheme;
        const themeContainer = document.querySelector('.theme-container');
        themeContainer.innerHTML = '';

        // Add predefined themes if they don't exist
        for (const themeName in predefinedThemes) {
            if (!themes[themeName]) {
                themes[themeName] = predefinedThemes[themeName];
            }
        }

        // Save the updated themes object back to local storage
        chrome.storage.local.set({ themes: themes }, function() {
            const themeGradients = [
                'linear-gradient(135deg, #FF5733 0%, #FFC300 100%)',
                'linear-gradient(135deg, #8E44AD 0%, #3498DB 100%)',
                'linear-gradient(135deg, #3498DB 0%, #2ECC71 100%)',
                'linear-gradient(135deg, #E74C3C 0%, #F39C12 100%)',
                'linear-gradient(135deg, #2ECC71 0%, #1ABC9C 100%)',
                'linear-gradient(135deg, #F39C12 0%, #D35400 100%)',
                'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)',
                'linear-gradient(135deg, #F1C40F 0%, #F39C12 100%)',
                'linear-gradient(135deg, #34495E 0%, #2C3E50 100%)',
                'linear-gradient(135deg, #E67E22 0%, #E74C3C 100%)'
            ];

            let styleIndex = 0;

            for (const themeName in themes) {
                const themeCard = document.createElement('div');
                themeCard.className = 'theme-card';
                themeCard.dataset.themeName = themeName;

                // Truncate theme name if longer than 20 characters
                const displayName = themeName.length > 20 ? themeName.substring(0, 17) + '...' : themeName;

                themeCard.innerHTML = `
                    <div class="theme-preview" style="background: ${themeGradients[styleIndex % themeGradients.length]};"></div>
                    <div class="theme-title">${displayName} <span class="edit-icon" title="Edit Theme">&#9998;</span></div>
                `;

                themeCard.querySelector('.edit-icon').addEventListener('click', (event) => {
                    event.stopPropagation();
                    editTheme(themeName);
                });
                themeCard.addEventListener('click', () => selectTheme(themeCard, themeName));
                themeContainer.appendChild(themeCard);

                // Restore the selected theme if it matches the current themeName
                if (selectedTheme === themeName) {
                    selectTheme(themeCard, themeName);
                }

                styleIndex++;
            }

            document.querySelector('.apply-btn').addEventListener('click', applyTheme);
        });
    });
});


function checkAndApplySelectedTheme() {
    chrome.storage.local.get(['filters', 'selectedTheme', 'themes'], function(data) {
        const selectedTheme = data.selectedTheme;
        const themes = data.themes || {};
        const themeFilters = themes[selectedTheme];

        if (themeFilters) {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    const url = new URL(tab.url);
                    const hostname = url.hostname;
                    const filters = data.filters || {};

                    if (!filters[hostname]) {  
                        chrome.tabs.sendMessage(tab.id, {
                            action: "applyFilters",
                            filters: themeFilters
                        });
                    } else {
                        console.log(`Filters already applied for ${hostname}`);
                    }
                });
            });
        }
    });
}

function applyTheme() {
    chrome.storage.local.get(['selectedTheme', 'themes'], function(data) {
        const selectedTheme = data.selectedTheme;
        const themes = data.themes || {};
        const themeFilters = themes[selectedTheme];

        if (!selectedTheme) {
            alert('Please select a theme to apply.');
            return; // Exit after alert
        }

        if (themeFilters) {
            chrome.storage.local.set({ selectedTheme: selectedTheme }, function() {
                checkAndApplySelectedTheme();
                alert('Theme applied successfully.');
            });
        } else {
            alert('No filters found for the selected theme.');
            return; // Exit after alert
        }
    });
}



function editTheme(themeName) {
    chrome.storage.local.set({ themeToEdit: themeName }, function() {
        window.location.href = 'add-theme.html';
    });
}