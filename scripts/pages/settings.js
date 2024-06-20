document.getElementById('filtersButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

document.getElementById('themesButton').addEventListener('click', () => {
    window.location.href = '../popup/themes.html';
});

document.getElementById('settingsButton').addEventListener('click', () => {
    window.location.href = '../popup/settings.html';
});

document.addEventListener('DOMContentLoaded', function() {
    const hours = [...Array(12).keys()].map(i => i + 1);
    const minutes = ["00", "15", "30", "45"];
    const periods = ["AM", "PM"];

    const startTimeHour = document.getElementById('startTimeHour');
    const startTimeMinute = document.getElementById('startTimeMinute');
    const startTimePeriod = document.getElementById('startTimePeriod');
    const endTimeHour = document.getElementById('endTimeHour');
    const endTimeMinute = document.getElementById('endTimeMinute');
    const endTimePeriod = document.getElementById('endTimePeriod');

    function populateSelect(selectElement, options) {
        options.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue.toString().padStart(2, '0');
            option.text = optionValue;
            selectElement.add(option);
        });
    }

    populateSelect(startTimeHour, hours);
    populateSelect(endTimeHour, hours);
    populateSelect(startTimeMinute, minutes);
    populateSelect(endTimeMinute, minutes);
    populateSelect(startTimePeriod, periods);
    populateSelect(endTimePeriod, periods);
});

