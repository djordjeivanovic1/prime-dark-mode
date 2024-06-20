document.addEventListener('DOMContentLoaded', () => {
    const websitesContainer = document.getElementById('websitesContainer');
    const websites = JSON.parse(localStorage.getItem('websites')) || [];
    websites.forEach(({ name, theme }) => {
        addWebsiteCard(name, theme.name, theme.className);
    });
});

function addWebsiteCard(name, themeName, themeClassName) {
    const container = document.getElementById('websitesContainer');
    const card = document.createElement('div');
    card.className = 'website-card';
    card.innerHTML = `
        <div class="website-info">
            <div class="website-name">${name}</div>
            <div class="website-theme ${themeClassName}">${themeName}</div>
        </div>
        <button class="edit-btn" onclick="editWebsite('${name}')">Edit</button>
    `;
    container.appendChild(card);
}

function editWebsite(name) {
    const websites = JSON.parse(localStorage.getItem('websites')) || [];
    const website = websites.find(site => site.name === name);
    if (website) {
        const newTheme = JSON.parse(localStorage.getItem('selectedTheme'));
        website.theme = newTheme;
        localStorage.setItem('websites', JSON.stringify(websites));
        alert(`Website ${name} updated to theme ${newTheme.name}`);
        location.reload();
    }
}
