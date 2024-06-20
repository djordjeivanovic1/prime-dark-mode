document.getElementById('activeHoursToggle').addEventListener('change', function() {
    document.getElementById('timeSettings').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('shortcutToggle').addEventListener('change', function() {
    document.getElementById('shortcutSettings').style.display = this.checked ? 'block' : 'none';
});

function saveSettings() {
    alert('Settings saved!');
}

document.addEventListener("DOMContentLoaded", function() {
    const hours = [...Array(12).keys()].map(i => i + 1);
    const minutes = [...Array(4).keys()].map(i => i * 15).map(i => i.toString().padStart(2, '0'));
    const periods = ["AM", "PM"];

    const startTimeHour = document.getElementById('startTimeHour');
    const startTimeMinute = document.getElementById('startTimeMinute');
    const startTimePeriod = document.getElementById('startTimePeriod');
    const endTimeHour = document.getElementById('endTimeHour');
    const endTimeMinute = document.getElementById('endTimeMinute');
    const endTimePeriod = document.getElementById('endTimePeriod');

    hours.forEach(hour => {
        const option = document.createElement('option');
        option.value = hour.toString().padStart(2, '0');
        option.text = hour;
        startTimeHour.add(option.cloneNode(true));
        endTimeHour.add(option.cloneNode(true));
    });

    minutes.forEach(minute => {
        const option = document.createElement('option');
        option.value = minute;
        option.text = minute;
        startTimeMinute.add(option.cloneNode(true));
        endTimeMinute.add(option.cloneNode(true));
    });

    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period;
        option.text = period;
        startTimePeriod.add(option.cloneNode(true));
        endTimePeriod.add(option.cloneNode(true));
    });
});