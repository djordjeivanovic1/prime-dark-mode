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

    // Load settings from storage
    chrome.storage.local.get(['activeHours', 'useSystemSettings', 'extensionShortcut', 'extensionActive', 'filters'], function(data) {
        const activeHours = data.activeHours || {};
        const useSystemSettings = data.useSystemSettings || false;
        const extensionShortcut = data.extensionShortcut || false;
        const extensionActive = data.extensionActive || false;
        const filters = data.filters || {};

        document.getElementById('setHoursToggle').checked = activeHours.enabled || false;
        startTimeHour.value = activeHours.startHour || '08';
        startTimeMinute.value = activeHours.startMinute || '00';
        startTimePeriod.value = activeHours.startPeriod || 'AM';
        endTimeHour.value = activeHours.endHour || '05';
        endTimeMinute.value = activeHours.endMinute || '00';
        endTimePeriod.value = activeHours.endPeriod || 'PM';

        document.getElementById('systemSettingsToggle').checked = useSystemSettings;
        document.getElementById('shortcutToggle').checked = extensionShortcut;
        document.getElementById('extensionToggle').checked = extensionActive;

        document.getElementById('timeSettings').style.display = activeHours.enabled ? 'block' : 'none';

    });

    // Toggle visibility of time settings
    document.getElementById('setHoursToggle').addEventListener('change', function() {
        document.getElementById('timeSettings').style.display = this.checked ? 'block' : 'none';
    });

    // Save settings
    document.querySelector('.save-btn').addEventListener('click', function() {
        const activeHours = {
            enabled: document.getElementById('setHoursToggle').checked,
            startHour: document.getElementById('startTimeHour').value,
            startMinute: document.getElementById('startTimeMinute').value,
            startPeriod: document.getElementById('startTimePeriod').value,
            endHour: document.getElementById('endTimeHour').value,
            endMinute: document.getElementById('endTimeMinute').value,
            endPeriod: document.getElementById('endTimePeriod').value,
        };

        const useSystemSettings = document.getElementById('systemSettingsToggle').checked;
        const extensionShortcut = document.getElementById('shortcutToggle').checked;
        const extensionActive = document.getElementById('extensionToggle').checked;

        chrome.storage.local.set({
            activeHours: activeHours,
            useSystemSettings: useSystemSettings,
            extensionShortcut: extensionShortcut,
            extensionActive: extensionActive,
        }, function() {
            alert('Settings saved!');
        });
    });

    // Keyboard shortcut toggle
    document.getElementById('shortcutToggle').addEventListener('change', function() {
        const enableShortcut = this.checked;
        chrome.commands.update({
            name: 'toggle-extension',
            shortcut: enableShortcut ? 'Ctrl+Shift+Y' : ''
        });
    });

    // Extension activation toggle
    document.getElementById('extensionToggle').addEventListener('change', function() {
        const active = this.checked;
        chrome.storage.local.set({ extensionActive: active }, function() {
            if (!active) {
                chrome.runtime.sendMessage({ action: 'clearAllFilters' });
            } else {
                chrome.storage.local.get(['activeHours'], function(data) {
                    const activeHours = data.activeHours || {};
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentPeriod = currentHour >= 12 ? 'PM' : 'AM';

                    const startHour = parseInt(activeHours.startHour) % 12 + (activeHours.startPeriod === 'PM' ? 12 : 0);
                    const endHour = parseInt(activeHours.endHour) % 12 + (activeHours.endPeriod === 'PM' ? 12 : 0);
                    const isActive = (
                        (currentHour > startHour || (currentHour === startHour && currentMinute >= parseInt(activeHours.startMinute))) &&
                        (currentHour < endHour || (currentHour === endHour && currentMinute <= parseInt(activeHours.endMinute)))
                    );

                    if (isActive) {
                        chrome.runtime.sendMessage({ action: 'applyAllFilters' });
                    } else {
                        chrome.runtime.sendMessage({ action: 'clearAllFilters' });
                    }
                });
            }
        });
    });
});