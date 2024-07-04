document.addEventListener('DOMContentLoaded', function() {
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = ["00", "15", "30", "45"];
    const periods = ["AM", "PM"];

    const startTimeHour = document.getElementById('startTimeHour');
    const startTimeMinute = document.getElementById('startTimeMinute');
    const startTimePeriod = document.getElementById('startTimePeriod');
    const endTimeHour = document.getElementById('endTimeHour');
    const endTimeMinute = document.getElementById('endTimeMinute');
    const endTimePeriod = document.getElementById('endTimePeriod');

    let isShortcutEnabled = true; // Track if the shortcut is enabled

    // Populate select elements with options
    function populateSelect(selectElement, options) {
        options.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
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
        hour = parseInt(hour, 10);
        if (period === 'PM' && hour < 12) {
            return hour + 12;
        } else if (period === 'AM' && hour === 12) {
            return 0;
        } else {
            return hour;
        }
    }

    // Check if current time is within a specified time range
    function isWithinTimeRange(currentHour, currentMinute, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod) {
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

    // Check if extension should be active based on active hours
    function checkExtensionStatus(activeHours, extensionActive) {
        if (activeHours.enabled) {
            const currentTime = new Date();
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();
            
            const startHour = activeHours.startHour;
            const startMinute = activeHours.startMinute;
            const startPeriod = activeHours.startPeriod;
            const endHour = activeHours.endHour;
            const endMinute = activeHours.endMinute;
            const endPeriod = activeHours.endPeriod;
            
            const isActiveTime = isWithinTimeRange(currentHour, currentMinute, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod);
            const shouldBeActive = isActiveTime && extensionActive;

            chrome.storage.local.set({ extensionActive: shouldBeActive }, function() {
                if (!shouldBeActive) {
                    deactivateExtension();
                } else {
                    activateExtension();
                }
            });
        } else {
            chrome.storage.local.set({ extensionActive: extensionActive });
            if (extensionActive) {
                activateExtension();
            } else {
                deactivateExtension();
            }
        }
    }

    // Load settings from storage and initialize UI
    function loadSettings() {
        chrome.storage.local.get(['activeHours', 'extensionShortcut', 'extensionActive', 'darkMode', 'currentWebsiteDarkMode', 'filters'], function(data) {
            const activeHours = data.activeHours || {};
            const extensionShortcut = data.extensionShortcut !== undefined ? data.extensionShortcut : true;
            const extensionActive = data.extensionActive !== undefined ? data.extensionActive : true;

            // Ensure time settings are off by default
            document.getElementById('setHoursToggle').checked = activeHours.enabled !== undefined ? activeHours.enabled : false;
            startTimeHour.value = activeHours.startHour || '08';
            startTimeMinute.value = activeHours.startMinute || '00';
            startTimePeriod.value = activeHours.startPeriod || 'AM';
            endTimeHour.value = activeHours.endHour || '05';
            endTimeMinute.value = activeHours.endMinute || '00';
            endTimePeriod.value = activeHours.endPeriod || 'PM';

            // Ensure other toggles are on by default
            document.getElementById('shortcutToggle').checked = extensionShortcut;
            document.getElementById('activeToggle').checked = extensionActive;

            document.getElementById('timeSettings').style.display = activeHours.enabled ? 'flex' : 'none';
            
            isShortcutEnabled = extensionShortcut; // Set initial shortcut state
            checkExtensionStatus(activeHours, extensionActive);

            // Apply dark mode if use system settings is not enabled
            if (!document.getElementById('activeToggle').checked && data.darkMode !== undefined) {
                if (data.darkMode) {
                    activateExtension();
                } else {
                    deactivateExtension();
                }
            }
        });
    }

    // Save settings
    function saveSettings() {
        const activeHours = {
            enabled: document.getElementById('setHoursToggle').checked,
            startHour: document.getElementById('startTimeHour').value,
            startMinute: document.getElementById('startTimeMinute').value,
            startPeriod: document.getElementById('startTimePeriod').value,
            endHour: document.getElementById('endTimeHour').value,
            endMinute: document.getElementById('endTimeMinute').value,
            endPeriod: document.getElementById('endTimePeriod').value,
        };

        const extensionShortcut = document.getElementById('shortcutToggle').checked;
        const extensionActive = document.getElementById('activeToggle').checked;

        chrome.storage.local.set({
            activeHours: activeHours,
            extensionShortcut: extensionShortcut,
            extensionActive: extensionActive,
            darkMode: extensionActive // Save dark mode state
        }, function() {
            alert('Settings saved!');
            isShortcutEnabled = extensionShortcut; // Update shortcut state
            checkExtensionStatus(activeHours, extensionActive);
        });
    }

    // Function to deactivate the extension
    function deactivateExtension() {
        chrome.storage.local.set({ extensionActive: false }, function() {
            chrome.runtime.sendMessage({ action: 'clearAllFilters' });
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                tabs.forEach(tab => {
                    chrome.storage.local.get(['darkMode'], function(result) {
                        if (result.darkMode) {
                            chrome.tabs.sendMessage(tab.id, { action: 'clearAllFilters' });
                            chrome.tabs.sendMessage(tab.id, { action: 'toggleDarkMode', darkMode: false });
                            chrome.tabs.sendMessage(tab.id, { action: 'toggleCurrentWebsiteDarkMode', darkMode: false });
                        }
                    });
                });
            });
        });

        disablePage();
    }

    // Function to activate the extension
    function activateExtension() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const tab = tabs[0];
            const hostname = new URL(tab.url).hostname;
            // Retrieve and apply website-specific filters
            chrome.storage.local.get(["filters"], (data) => {
                const websiteFilters = data.filters ? data.filters[hostname] : {};
                chrome.tabs.sendMessage(tab.id, {
                    action: "applyFilters",
                    filters: websiteFilters
                });
            });

            // Check and apply dark mode
            chrome.storage.local.get(["darkMode", "currentWebsiteDarkMode"], function(data) {
                const darkMode = data.darkMode;
                const currentWebsiteDarkMode = data.currentWebsiteDarkMode[hostname];

                if (currentWebsiteDarkMode !== undefined ? currentWebsiteDarkMode : darkMode) {
                    chrome.tabs.sendMessage(tab.id, { action: 'toggleDarkMode', darkMode: true });
                }
            });
        });
        // Enable navigation buttons
        enablePage();
    }

    // Disable navigation buttons
    function disablePage() {
        const navButtons = document.querySelectorAll('.button');
        navButtons.forEach(button => {
            button.disabled = true;
            button.style.pointerEvents = 'none';
            button.style.cursor = 'not-allowed';
        });
        const hoursToggle = document.getElementById('setHoursToggle');
        hoursToggle.disabled = true;
        const shortcutToggle = document.getElementById('shortcutToggle');
        shortcutToggle.disabled = true;
    }

    // Enable navigation buttons
    function enablePage() {
        const navButtons = document.querySelectorAll('.button');
        navButtons.forEach(button => {
            button.disabled = false;
            button.style.pointerEvents = 'auto';
            button.style.cursor = 'pointer';
        });
        const hoursToggle = document.getElementById('setHoursToggle');
        hoursToggle.disabled = false;
        const shortcutToggle = document.getElementById('shortcutToggle');
        shortcutToggle.disabled = false;
    }

    // Event listener for toggling time settings visibility
    document.getElementById('setHoursToggle').addEventListener('change', function() {
        document.getElementById('timeSettings').style.display = this.checked ? 'flex' : 'none';
    });

    // Event listener for saving settings
    document.querySelector('.save-btn').addEventListener('click', saveSettings);

    // Event listener for toggling extension activation
    document.getElementById('activeToggle').addEventListener('change', function() {
        const active = this.checked;
        chrome.storage.local.set({ extensionActive: active }, function() {
            if (active) {
                activateExtension();
            } else {
                deactivateExtension();
            }
        });
    });

    // Event listener for shortcut toggle
    document.getElementById('shortcutToggle').addEventListener('change', function() {
        isShortcutEnabled = this.checked;
        chrome.storage.local.set({ extensionShortcut: isShortcutEnabled });
    });

    // Listen for the keyboard shortcut
    document.addEventListener('keydown', function(event) {
        if (isShortcutEnabled && (event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyE') {
            chrome.storage.local.get(['extensionActive'], function(result) {
                const isActive = result.extensionActive !== undefined ? result.extensionActive : true;
                const newState = !isActive;
                chrome.storage.local.set({ extensionActive: newState }, function() {
                    if (newState) {
                        activateExtension();
                    } else {
                        deactivateExtension();
                    }
                    document.getElementById('activeToggle').checked = newState;
                });
            });
        }
    });

    loadSettings();
});