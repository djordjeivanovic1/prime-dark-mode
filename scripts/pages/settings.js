// document.getElementById('activeHoursToggle').addEventListener('click', function() {
//     const timeSettings = document.getElementById('timeSettings');
//     timeSettings.style.display = (timeSettings.style.display === 'none' || timeSettings.style.display === '') ? 'flex' : 'none';
// });

// document.getElementById('shortcutToggle').addEventListener('click', function() {
//     const shortcutSettings = document.getElementById('shortcutSettings');
//     shortcutSettings.style.display = (shortcutSettings.style.display === 'none' || shortcutSettings.style.display === '') ? 'flex' : 'none';
// });

// function saveSettings() {
//     alert('Settings saved!');
// }

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

