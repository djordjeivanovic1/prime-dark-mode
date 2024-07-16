document.addEventListener('DOMContentLoaded', function () {
    const themesButton = document.querySelector('#themesButton');
    const settingsButton = document.querySelector('#settingsButton');
    const filtersButton = document.querySelector('#filtersButton');

    // Function to add 'clicked' class to the clicked button
    function handleClick(event) {
        // Remove 'clicked' class from all buttons
        themesButton.classList.remove('clicked');
        settingsButton.classList.remove('clicked');
        filtersButton.classList.remove('clicked');

        // Add 'clicked' class to the clicked button
        event.target.classList.add('clicked');
    }

    // Check the current URL and set the 'clicked' class accordingly
    const currentUrl = window.location.href;
    if (currentUrl.includes('popup.html')) {
        filtersButton.classList.add('clicked');
    } else if (currentUrl.includes('themes.html')) {
        themesButton.classList.add('clicked');
    } else if (currentUrl.includes('settings.html')) {
        settingsButton.classList.add('clicked');
    }

    // Add event listeners to navigation buttons
    filtersButton.addEventListener('click', (event) => {
        handleClick(event);
        window.location.href = '../popup/popup.html';
    });

    themesButton.addEventListener('click', (event) => {
        handleClick(event);
        window.location.href = '../popup/themes.html';
    });

    settingsButton.addEventListener('click', (event) => {
        handleClick(event);
        window.location.href = '../popup/settings.html';
    });
});
