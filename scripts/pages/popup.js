const forbiddenSchemes = ["chrome://", "edge://", "about:", "file://"];

// Initialize storage items and content scripts on installation
chrome.runtime.onInstalled.addListener(async () => {
    chrome.storage.local.set({
        filters: {},
        darkMode: true,
        themes: {},
        activeHours: {},
        useSystemSettings: false,
        extensionShortcut: false,
        currentWebsiteDarkMode: {},
        extensionActive: true
    });

    const manifest = chrome.runtime.getManifest();
    const contentScripts = manifest.content_scripts || [];

    for (const cs of contentScripts) {
        const tabs = await chrome.tabs.query({ url: cs.matches });
        for (const tab of tabs) {
            if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                chrome.scripting.executeScript({
                    files: cs.js,
                    target: { tabId: tab.id, allFrames: cs.all_frames },
                    injectImmediately: cs.run_at === 'document_start',
                    world: cs.world
                });
            }
        }
    }

    applySettings();
});

// Apply settings on startup
chrome.runtime.onStartup.addListener(() => {
    applySettings();
});

// Helper function to apply settings to all tabs
// Helper function to apply settings to all tabs
function applySettings() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                chrome.storage.local.get(["filters", "darkMode", "currentWebsiteDarkMode"], (data) => {
                    const url = new URL(tab.url);
                    const hostname = url.hostname;
                    const filters = data.filters[hostname] || initialFilters;
                    const darkMode = data.currentWebsiteDarkMode[hostname] !== undefined 
                        ? data.currentWebsiteDarkMode[hostname] 
                        : data.darkMode;

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }, () => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "applyFilters",
                            filters: filters
                        });

                        chrome.tabs.sendMessage(tab.id, {
                            action: "toggleDarkMode",
                            darkMode: darkMode
                        });
                    });
                });
            }
        });
    });
}

// Message handlers
// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveFilters") {
        chrome.storage.local.get("filters", (data) => {
            const filtersForWebsites = data.filters || {};
            filtersForWebsites[request.hostname] = request.filters;
            chrome.storage.local.set({ filters: filtersForWebsites }, () => {
                sendResponse({ status: "Filters saved for " + request.hostname });
            });
        });
        return true;
    } else if (request.action === "getFilters") {
        chrome.storage.local.get("filters", (data) => {
            sendResponse(data.filters);
        });
        return true;
    } else if (request.action === "applyFilters") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, () => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "applyFilters",
                        filters: request.filters
                    });
                });
            }
        });

    } else if (request.action === "toggleDarkMode") {
        chrome.storage.local.set({ darkMode: request.enable }, () => {
            applySettings(); // Apply settings to all tabs
        });
    } else if (request.action === "toggleCurrentWebsiteDarkMode") {
        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                sendResponse({ error: response.error });
                return;
            }

            const { hostname } = response;
            chrome.storage.local.get("currentWebsiteDarkMode", (data) => {
                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                currentWebsiteDarkMode[hostname] = request.darkMode;
                chrome.storage.local.set({ currentWebsiteDarkMode: currentWebsiteDarkMode }, () => {
                    applySettings(); // Apply settings to all tabs
                    sendResponse({ success: true });
                });
            });
        });
        return true;
    } else if (request.action === "getActiveTabInfo") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                const url = new URL(activeTab.url);
                sendResponse({ url: url.href, hostname: url.hostname });
            } else {
                sendResponse({ error: "No active tab found" });
            }
        });
        return true;
    }
});

function updateFilters() {
    const filters = {
        brightness: document.getElementById('brightnessSlider').value,
        contrast: document.getElementById('contrastSlider').value,
        sepia: document.getElementById('sepiaSlider').value,
        greyscale: document.getElementById('greyscaleSlider').value,
    };

    // send message to apply the values
    chrome.runtime.sendMessage({ action: 'applyFilters', filters: filters });

    // set the filters for the current website
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { hostname } = response;
            chrome.storage.local.get(["filters"], (data) => {
                const filtersData = data.filters || {};
                filtersData[hostname] = filters;
                chrome.storage.local.set({ filters: filtersData }, function() {
                    console.log('Website-specific filters updated!');
                });
            });
        }
    });
}

// Function to update the UI with loaded filters for the current hostname
function updateUIWithFilters(hostname) {
    chrome.storage.local.get(["filters"], function(data) {
        const filtersData = data.filters || {};
        const filters = filtersData[hostname] || initialFilters;

        // Update slider values
        document.getElementById('brightnessSlider').value = filters.brightness;
        document.getElementById('contrastSlider').value = filters.contrast;
        document.getElementById('sepiaSlider').value = filters.sepia;
        document.getElementById('greyscaleSlider').value = filters.greyscale;

        // Update displayed values
        document.getElementById('brightnessValue').textContent = filters.brightness;
        document.getElementById('contrastValue').textContent = filters.contrast;
        document.getElementById('sepiaValue').textContent = filters.sepia;
        document.getElementById('greyscaleValue').textContent = filters.greyscale;
    });
}

// Function to show the custom modal with dynamic content
function showModal(content) {
    const modal = document.getElementById('customModal');
    const modalBody = document.getElementById('modalBody');
    const closeButton = document.querySelector('.modal .close');

    modalBody.innerHTML = content;

    modal.style.display = 'block';

    // Function to close the modal
    function closeModal() {
        modal.style.display = 'none';
    }

    // Event listener for the close button
    closeButton.addEventListener('click', closeModal);

    // Event listener to close the modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Remove event listeners when the modal is closed
    function cleanup() {
        closeButton.removeEventListener('click', closeModal);
        window.removeEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // Add the cleanup function to be called when the modal is closed
    closeButton.addEventListener('click', cleanup);
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            cleanup();
        }
    });
}

function applyDarkMode(tabId, darkModeOn) {
    chrome.tabs.sendMessage(tabId, {
        action: 'toggleDarkMode',
        darkMode: darkModeOn
    }, function(response) {
        if (response && response.success) {
            if (darkModeOn) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'applyFilters',
                    filters: {
                        brightness: 100,
                        contrast: 100,
                        sepia: 30,
                        greyscale: 50
                    }
                });
            } else {
                chrome.tabs.sendMessage(tabId, {
                    action: 'applyFilters',
                    filters: {
                        brightness: 100,
                        contrast: 100,
                        sepia: 0,
                        greyscale: 0
                    }
                });
            }
        }
    });
}

function toggleDarkMode(darkModeOn, tabId) {
    chrome.storage.local.set({ darkMode: darkModeOn }, () => {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                    applyDarkMode(tab.id, darkModeOn);
                }
            });
        });
    });
}


function toggleCurrentWebsiteDarkMode(darkModeOn, tabId) {
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { hostname } = response;
            chrome.storage.local.get("currentWebsiteDarkMode", (data) => {
                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                currentWebsiteDarkMode[hostname] = darkModeOn;
                chrome.storage.local.set({ currentWebsiteDarkMode: currentWebsiteDarkMode }, () => {
                    applyDarkMode(tabId, darkModeOn);
                });
            });
        }
    });
}

// Function to update the toggle state based on darkMode setting
function updateToggleState(darkMode) {
    const globalToggle = document.getElementById('darkModeToggle');
    globalToggle.checked = darkMode;
    const websiteToggle = document.getElementById('currentWebsiteToggle');
    websiteToggle.checked = darkMode;
}

let initialFilters = {
    brightness: 100,
    contrast: 100,
    sepia: 0,
    greyscale: 0
};

// Function to update the UI with loaded filters for the current hostname
function updateUIWithFilters(hostname) {
    chrome.storage.local.get(["filters"], function(data) {
        const filtersData = data.filters || {};
        const filters = filtersData[hostname] || {
            brightness: 100,
            contrast: 100,
            sepia: 0,
            greyscale: 0
        };

        // Update slider values
        document.getElementById('brightnessSlider').value = filters.brightness;
        document.getElementById('contrastSlider').value = filters.contrast;
        document.getElementById('sepiaSlider').value = filters.sepia;
        document.getElementById('greyscaleSlider').value = filters.greyscale;

        // Update displayed values
        document.getElementById('brightnessValue').textContent = filters.brightness;
        document.getElementById('contrastValue').textContent = filters.contrast;
        document.getElementById('sepiaValue').textContent = filters.sepia;
        document.getElementById('greyscaleValue').textContent = filters.greyscale;
    });
}

// Utility functions
function updateButtonColors(slider, decreaseButton, increaseButton) {
    const value = parseInt(slider.value);
    if (value == slider.min) {
        decreaseButton.style.color = '#2e2e2e'; 
        increaseButton.style.color = 'white';
    } else if (value == slider.max) {
        decreaseButton.style.color = 'white';
        increaseButton.style.color = '#2e2e2e'; 
    } else {
        decreaseButton.style.color = 'white';
        increaseButton.style.color = 'white';
    }
}

function updateSpanText(span, value) {
    span.textContent = value == 0 ? 'Off' : value;
}

function handleSliderInput(slider, valueSpan, decreaseButton, increaseButton) {
    const value = parseInt(slider.value);
    updateSpanText(valueSpan, value);
    updateButtonColors(slider, decreaseButton, increaseButton);
}

function handleButtonClick(slider, valueSpan, decreaseButton, increaseButton, step) {
    let newValue = parseInt(slider.value) + step;
    newValue = Math.max(slider.min, Math.min(slider.max, newValue));
    slider.value = newValue;
    handleSliderInput(slider, valueSpan, decreaseButton, increaseButton);
}

document.addEventListener('DOMContentLoaded', function() {
    const sliders = [
        { slider: 'brightnessSlider', span: 'brightnessValue', decreaseButton: 'decreaseBrightnessButton', increaseButton: 'increaseBrightnessButton' },
        { slider: 'contrastSlider', span: 'contrastValue', decreaseButton: 'decreaseContrastButton', increaseButton: 'increaseContrastButton' },
        { slider: 'sepiaSlider', span: 'sepiaValue', decreaseButton: 'decreaseSepiaButton', increaseButton: 'increaseSepiaButton' },
        { slider: 'greyscaleSlider', span: 'greyscaleValue', decreaseButton: 'decreaseGreyscaleButton', increaseButton: 'increaseGreyscaleButton' }
    ];

    sliders.forEach(({ slider, span, decreaseButton, increaseButton }) => {
        const sliderElement = document.getElementById(slider);
        const spanElement = document.getElementById(span);
        const decreaseButtonElement = document.getElementById(decreaseButton);
        const increaseButtonElement = document.getElementById(increaseButton);

        // Initial setup
        handleSliderInput(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement);

        // Slider input event listener
        sliderElement.addEventListener('input', function() {
            handleSliderInput(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement);
            updateFilters();
        });

        // Button click and hold functionality
        let intervalId;

        const startIncreasing = () => {
            handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, 1);
            intervalId = setInterval(() => {
                handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, 1);
            }, 100);
        };

        const startDecreasing = () => {
            handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, -1);
            intervalId = setInterval(() => {
                handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, -1);
            }, 100);
        };

        const stopAdjusting = () => {
            clearInterval(intervalId);
        };

        decreaseButtonElement.addEventListener('mousedown', startDecreasing);
        increaseButtonElement.addEventListener('mousedown', startIncreasing);

        decreaseButtonElement.addEventListener('mouseup', stopAdjusting);
        increaseButtonElement.addEventListener('mouseup', stopAdjusting);

        decreaseButtonElement.addEventListener('mouseleave', stopAdjusting);
        increaseButtonElement.addEventListener('mouseleave', stopAdjusting);

        decreaseButtonElement.addEventListener('touchstart', startDecreasing);
        increaseButtonElement.addEventListener('touchstart', startIncreasing);

        decreaseButtonElement.addEventListener('touchend', stopAdjusting);
        increaseButtonElement.addEventListener('touchend', stopAdjusting);
    });

    // Load initial settings from storage
    chrome.storage.local.get(['darkMode'], function(data) {
        const darkMode = data.darkMode || false; 
        updateToggleState(darkMode);
    });

    // Request the active tab's URL from the background script
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { url, hostname } = response;
            document.getElementById('website-span').textContent = hostname;
            updateUIWithFilters(hostname);

            // Retrieve and apply stored settings for the current website
            chrome.storage.local.get(["filters", "currentWebsiteDarkMode"], (data) => {
                const currentFilters = data.filters[hostname] || initialFilters;
                document.getElementById('brightnessSlider').value = currentFilters.brightness;
                document.getElementById('contrastSlider').value = currentFilters.contrast;
                document.getElementById('sepiaSlider').value = currentFilters.sepia;
                document.getElementById('greyscaleSlider').value = currentFilters.greyscale;
                // Update the displayed values
                document.getElementById('brightnessValue').textContent = currentFilters.brightness;
                document.getElementById('contrastValue').textContent = currentFilters.contrast;
                document.getElementById('sepiaValue').textContent = currentFilters.sepia;
                document.getElementById('greyscaleValue').textContent = currentFilters.greyscale;

                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                document.getElementById('currentWebsiteToggle').checked = currentWebsiteDarkMode[hostname] || false;
            });
        }
    });

    // Save settings button
    document.getElementById('saveSettingsButton').addEventListener('click', () => {
        const filters = {
            brightness: document.getElementById('brightnessSlider').value,
            contrast: document.getElementById('contrastSlider').value,
            sepia: document.getElementById('sepiaSlider').value,
            greyscale: document.getElementById('greyscaleSlider').value,
        };

        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                console.error(response.error);
            } else {
                const { hostname } = response;
                chrome.runtime.sendMessage({ action: 'saveFilters', filters: filters, hostname: hostname }, (response) => {
                    console.log(response.status);
                    showModal(`Settings saved for: ${hostname.toString()}`);
                });
            }
        });
    });

    // Update the event listener for dark mode toggle button
    document.getElementById('darkModeToggle').addEventListener('click', function() {
        chrome.storage.local.get(["darkMode"], function(data) {
            const darkModeOn = data.darkMode || false;
            chrome.storage.local.set({ darkMode: !darkModeOn }, () => {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    toggleDarkMode(!darkModeOn, tabs[0].id);
                });
            });
        });
    });

    // Event listener for current website dark mode toggle button
    document.getElementById('currentWebsiteToggle').addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const tabId = tabs[0].id;
            chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
                const { hostname } = response;
                chrome.storage.local.get(["currentWebsiteDarkMode"], function(data) {
                    const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                    const darkModeOn = !currentWebsiteDarkMode[hostname];  // Toggle the state
                    toggleCurrentWebsiteDarkMode(darkModeOn, tabId);
                });
            });
        });
    });

    // Event listener for "Save as Theme" button
    document.getElementById('addThemeButton').addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
            if (response.error) {
                console.error(response.error);
            } else {
                const { hostname } = response;
                chrome.storage.local.get(['filters'], function(data) {
                    const currentFilters = data.filters[hostname] || {};
                    chrome.storage.local.set({ currentFilters: currentFilters }, function() {
                        // Redirect to add-theme.html after setting the filters
                        window.location.href = 'add-theme.html';
                    });
                });
            }
        });
    });

    document.getElementById('brightnessSlider').addEventListener('input', function() {
        document.getElementById('brightnessValue').textContent = this.value == 0 ? 'Off' : this.value;
        updateFilters();
    });

    document.getElementById('contrastSlider').addEventListener('input', function() {
        document.getElementById('contrastValue').textContent = this.value == 0 ? 'Off' : this.value;
        updateFilters();
    });

    document.getElementById('sepiaSlider').addEventListener('input', function() {
        document.getElementById('sepiaValue').textContent = this.value == 0 ? 'Off' : this.value;
        updateFilters();
    });

    document.getElementById('greyscaleSlider').addEventListener('input', function() {
        document.getElementById('greyscaleValue').textContent = this.value == 0 ? 'Off' : this.value;
        updateFilters();
    });
});