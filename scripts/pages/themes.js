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

function applyTheme() {
    alert("Theme applied!");
}

function openWebsites() {
    window.location.href = "websites.html";
}

let selectedTheme = { name: 'Deep Contrast', className: 'deep-contrast' };

function selectTheme(name, className) {
    selectedTheme = { name, className };
    document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('selected'));
    document.querySelector(`.theme-preview.${className}`).parentElement.classList.add('selected');
}

function applyTheme() {
    localStorage.setItem('selectedTheme', JSON.stringify(selectedTheme));
    alert('Theme applied!');
}

function openWebsites() {
    window.location.href = "websites.html";
}