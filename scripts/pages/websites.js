document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

document.getElementById('editButton').addEventListener('click', () => {
    editWebsite();
});

function editWebsite() {
    alert('Edit website functionality to be implemented');
}

document.querySelectorAll('.website-card').forEach(card => {
    card.addEventListener('click', (event) => {
        if (!event.target.classList.contains('edit-btn') && !event.target.classList.contains('website-checkbox')) {
            if (card.classList.contains('selected')) {
                // If the card is already selected, deselect it
                card.classList.remove('selected');
            } else {
                // Deselect any currently selected card
                document.querySelectorAll('.website-card.selected').forEach(selectedCard => {
                    selectedCard.classList.remove('selected');
                });
                card.classList.add('selected');
            }
        }
    });
});

const style = document.createElement('style');
style.innerHTML = `
    .website-card.selected {
        border-color: var(--button-background-color);
        box-shadow: 0 0 10px var(--button-background-color);
    }
`;

document.head.appendChild(style);



function loadWebsites() {
    chrome.storage.sync.get(['themes', 'darkModeForWebsite'], function(data) {
        const themes = data.themes || {};
        const darkModeForWebsite = data.darkModeForWebsite || {};
        const websitesList = document.getElementById('websitesList');

        websitesList.innerHTML = ''; // Clear the list

        Object.keys(darkModeForWebsite).forEach(domain => {
            const theme = themes[darkModeForWebsite[domain]];

            const websiteCard = document.createElement('div');
            websiteCard.className = 'website-card';

            websiteCard.innerHTML = `
                <div class="website-info">
                    <div class="website-name">${domain}</div>
                </div>
                <div class="website-actions">
                    <button class="edit-btn" data-domain="${domain}">Edit</button>
                    <div class="toggle">
                        <input type="checkbox" class="website-toggle" data-domain="${domain}" ${darkModeForWebsite[domain] ? 'checked' : ''}>
                    </div>
                </div>
            `;

            websitesList.appendChild(websiteCard);
        });

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                editWebsite(event.target.dataset.domain);
            });
        });

        document.querySelectorAll('.website-toggle').forEach(toggle => {
            toggle.addEventListener('change', (event) => {
                toggleWebsite(event.target.dataset.domain, event.target.checked);
            });
        });
    });
}

function editWebsite(domain) {
    chrome.storage.sync.set({ editingDomain: domain }, function() {
        window.location.href = '../popup/popup.html';
    });
}

function toggleWebsite(domain, enabled) {
    chrome.storage.sync.get(['darkModeForWebsite'], function(data) {
        const darkModeForWebsite = data.darkModeForWebsite || {};

        if (enabled) {
            darkModeForWebsite[domain] = true;
        } else {
            delete darkModeForWebsite[domain];
        }

        chrome.storage.sync.set({ darkModeForWebsite: darkModeForWebsite }, function() {
            console.log('Website filter toggled');
        });
    });
}

document.addEventListener('DOMContentLoaded', loadWebsites);
