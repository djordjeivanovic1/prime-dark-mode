document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

function clearAllWebsites() {
    chrome.storage.local.set({ darkModeForWebsite: {} }, function() {
        loadWebsites();
    });
}

function editWebsite(domain) {
    chrome.storage.local.set({ editingDomain: domain }, function() {
        window.location.href = '../popup/add-theme.html';
    });
}

function loadWebsites() {
    chrome.storage.local.get(['themes', 'darkModeForWebsite'], function(data) {
        const themes = data.themes || {};
        const darkModeForWebsite = data.darkModeForWebsite || {};
        const websitesList = document.getElementById('websitesList');

        websitesList.innerHTML = '';

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
                        <label for="darkModeToggle-${domain}">Dark mode</label>
                        <input type="checkbox" class="website-toggle" id="darkModeToggle-${domain}" ${darkModeForWebsite[domain] ? 'checked' : ''} data-domain="${domain}">
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

function toggleWebsite(domain, enabled) {
    chrome.storage.local.get(['darkModeForWebsite'], function(data) {
        const darkModeForWebsite = data.darkModeForWebsite || {};

        if (enabled) {
            darkModeForWebsite[domain] = true;
        } else {
            delete darkModeForWebsite[domain];
        }

        chrome.storage.local.set({ darkModeForWebsite: darkModeForWebsite }, function() {
            console.log('Website filter toggled');
            applyDarkModeToDomain(domain, enabled);
        });
    });
}

function applyDarkModeToDomain(domain, darkModeOn) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            const url = new URL(tab.url);
            if (url.hostname === domain) {
                applyDarkMode(tab.id, darkModeOn);
            }
        });
    });
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

document.addEventListener('DOMContentLoaded', loadWebsites);