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

    // Convert to 24-hour format
    function convertTo24Hour(hour, period) {
        if (period === 'PM' && hour < 12) {
            return hour + 12;
        } else if (period === 'AM' && hour === 12) {
            return 0;
        } else {
            return hour;
        }
    }

    // Helper function to check if current time is within a specified time range
    function isWithinTimeRange(currentHour, currentMinute, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod) {
        // Convert to 24-hour format for comparison
        const current24Hour = convertTo24Hour(currentHour, startPeriod);
        const start24Hour = convertTo24Hour(startHour, startPeriod);
        const end24Hour = convertTo24Hour(endHour, endPeriod);

        if (current24Hour < start24Hour || current24Hour > end24Hour) {
            return false;
        } else if (current24Hour === start24Hour && currentMinute < startMinute) {
            return false;
        } else if (current24Hour === end24Hour && currentMinute > endMinute) {
            return false;
        } else {
            return true;
        }
    }

    // Function to check if extension should be active based on active hours
    function checkExtensionStatus(activeHours, extensionActive) {
        if (activeHours.enabled) {
            const currentTime = new Date();
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();
            
            const startHour = parseInt(activeHours.startHour, 10);
            const startMinute = parseInt(activeHours.startMinute, 10);
            const startPeriod = activeHours.startPeriod;
            const endHour = parseInt(activeHours.endHour, 10);
            const endMinute = parseInt(activeHours.endMinute, 10);
            const endPeriod = activeHours.endPeriod;
            
            const isActiveTime = isWithinTimeRange(currentHour, currentMinute, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod);

            const shouldBeActive = isActiveTime && extensionActive;

            // Update extension active state based on current time and settings
            chrome.storage.local.set({ extensionActive: shouldBeActive }, function() {
                if (!shouldBeActive) {
                    deactivateExtension();
                } else {
                    activateExtension();
                }
            });
        } else {
            // Active hours not enabled, keep extension state as it is
            chrome.storage.local.set({ extensionActive: extensionActive });
            if (extensionActive) {
                activateExtension();
            } else {
                deactivateExtension();
            }
        }
    }

    // Load settings from storage
    chrome.storage.local.get(['activeHours', 'extensionShortcut', 'extensionActive'], function(data) {
        const activeHours = data.activeHours || {};
        const extensionShortcut = data.extensionShortcut || true;
        const extensionActive = data.extensionActive || false;

        if (extensionActive) {
            activateExtension();
        } else {
            deactivateExtension();
        }

        document.getElementById('setHoursToggle').checked = activeHours.enabled || false;
        startTimeHour.value = activeHours.startHour || '08';
        startTimeMinute.value = activeHours.startMinute || '00';
        startTimePeriod.value = activeHours.startPeriod || 'AM';
        endTimeHour.value = activeHours.endHour || '05';
        endTimeMinute.value = activeHours.endMinute || '00';
        endTimePeriod.value = activeHours.endPeriod || 'PM';

        document.getElementById('shortcutToggle').checked = extensionShortcut;
        document.getElementById('activeToggle').checked = extensionActive;

        document.getElementById('timeSettings').style.display = activeHours.enabled ? 'flex' : 'none';
        
        checkExtensionStatus(activeHours, extensionActive);

        // Set extension state based on initial load
        if (extensionActive) {
            activateExtension();
        } else {
            deactivateExtension();
        }
    });

    // Toggle visibility of time settings
    document.getElementById('setHoursToggle').addEventListener('change', function() {
        document.getElementById('timeSettings').style.display = this.checked ? 'flex' : 'none';
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
        checkExtensionStatus(activeHours, document.getElementById('activeToggle').checked);

        const extensionShortcut = document.getElementById('shortcutToggle').checked;
        const extensionActive = document.getElementById('activeToggle').checked;

        chrome.storage.local.set({
            activeHours: activeHours,
            extensionShortcut: extensionShortcut,
            extensionActive: extensionActive,
        }, function() {
            alert('Settings saved!');
            checkExtensionStatus(activeHours, extensionActive);
        });
        
    });

    // Function to deactivate the extension
    function deactivateExtension() {
        chrome.storage.local.set({ extensionActive: false }, function() {
            chrome.runtime.sendMessage({ action: 'clearAllFilters' });

            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                tabs.forEach(tab => {
                    chrome.storage.local.get(['darkMode'], function(result) {
                        if (result.darkMode) {
                            chrome.tabs.sendMessage(tab.id, { action: 'clearAllFilters'});
                            chrome.tabs.sendMessage(tab.id, { action: 'toggleDarkMode', darkMode: false });
                            chrome.tabs.sendMessage(tab.id, { action: 'toggleCurrentWebsiteDarkMode', darkMode: false });
                        }
                    });
                });
            });
        });

        // Disable navigation buttons
        const navButtons = document.querySelectorAll('.options .button-group .button');
        navButtons.forEach(button => {
            button.disabled = true;
            button.style.pointerEvents = 'none';
            button.style.cursor = 'not-allowed';
        });
    }

    // Function to activate the extension
    function activateExtension() {
        chrome.storage.local.set({ extensionActive: true }, function() {
            chrome.runtime.sendMessage({ action: 'applyFilters', filters: {
                brightness: 50,
                contrast: 70,
                sepia: 0,
                greyscale: 30
            }});
            

            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                tabs.forEach(tab => {
                    chrome.storage.local.get(['darkMode'], function(result) {
                        if (!result.darkMode) {
                            chrome.tabs.sendMessage(tab.id, { action: 'toggleDarkMode', darkMode: true });
                            chrome.tabs.sendMessage(tab.id, { action: 'toggleCurrentWebsiteDarkMode', darkMode: true });
                        }
                    });
                });
            });
        });

        // Enable navigation buttons
        const navButtons = document.querySelectorAll('.options .button-group .button');
        navButtons.forEach(button => {
            button.disabled = false;
            button.style.pointerEvents = 'auto';
            button.style.cursor = 'pointer';
        });
    }

    // Extension activation toggle
    document.getElementById('activeToggle').addEventListener('change', function() {
        const active = this.checked;
        if (active) {
            activateExtension();
        } else {
            deactivateExtension();
        }
    });

    // Listen for the keyboard shortcut
    document.addEventListener('keydown', function(event) {
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyE') {
            chrome.storage.local.get(['extensionShortcut'], function(data) {
                if (data.extensionShortcut) {
                    chrome.storage.local.get(['extensionActive'], function(data) {
                        if (data.extensionActive) {
                            deactivateExtension();
                            chrome.storage.local.set({ extensionActive: false });
                        } else {
                            activateExtension();
                            chrome.storage.local.set({ extensionActive: true });
                        }
                        // Update the toggle state in the UI
                        document.getElementById('activeToggle').checked = !data.extensionActive;
                    });
                }
            });
        }
    });
});
