document.getElementById('brightnessSlider').addEventListener('input', function() {
    document.getElementById('brightnessValue').textContent = this.value;
});
document.getElementById('contrastSlider').addEventListener('input', function() {
    document.getElementById('contrastValue').textContent = this.value;
});
document.getElementById('sepiaSlider').addEventListener('input', function() {
    document.getElementById('sepiaValue').textContent = this.value;
});
document.getElementById('greyscaleSlider').addEventListener('input', function() {
    document.getElementById('greyscaleValue').textContent = this.value;
});

function openAddTheme() {
    const popup = window.open("add-theme.html", "Add Theme", "width=400,height=300");
    popup.onpageshow = () => {
        const newTheme = JSON.parse(localStorage.getItem('newTheme'));
        if (newTheme) {
            addThemeCard(newTheme.name, newTheme.className);
            localStorage.removeItem('newTheme');
        }
    };
}

function addThemeCard(name, className) {
    const container = document.getElementById('themeContainer');
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.innerHTML = `<div class="theme-preview ${className}"></div><div class="theme-title">${name}</div>`;
    container.appendChild(card);
}