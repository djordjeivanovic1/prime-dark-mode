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
        extensionActive: true,
        selectTheme: null,
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
function applySettings() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                chrome.storage.local.get(["filters", "darkMode", "currentWebsiteDarkMode"], (data) => {
                    const url = new URL(tab.url);
                    const hostname = url.hostname;
                    const darkMode = data.currentWebsiteDarkMode[hostname] !== undefined 
                        ? data.currentWebsiteDarkMode[hostname] 
                        : data.darkMode;

                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    }, () => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "applyFilters",
                            filters: data.filters
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
            applySettings();
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
                    applySettings();
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

    // Set the filters for the current website
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

                    // Apply filters to all tabs with the same hostname
                    chrome.tabs.query({}, function(tabs) {
                        tabs.forEach(function(tab) {
                            const url = new URL(tab.url);
                            if (url.hostname === hostname) {
                                chrome.tabs.sendMessage(tab.id, {
                                    action: "applyFilters",
                                    filters: filters
                                });
                            }
                        });
                    });
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
        cleanup();
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

    // Automatically close the modal after 2.5 seconds
    setTimeout(closeModal, 2500);

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
            const filters = darkModeOn ? {
                brightness: 100,
                contrast: 80,
                sepia: 0,
                greyscale: 10
            } : {
                brightness: 100,
                contrast: 100,
                sepia: 0,
                greyscale: 0
            };
            
            chrome.tabs.sendMessage(tabId, {
                action: 'applyFilters',
                filters: filters
            });
        }
    });
}

function toggleDarkMode(darkModeOn) {
    chrome.storage.local.set({ darkMode: darkModeOn }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const tab = tabs[0];
                if (!forbiddenSchemes.some(scheme => tab.url.startsWith(scheme))) {
                    applyDarkMode(tab.id, darkModeOn);
                }
            }
        });
    });
}

function toggleCurrentWebsiteDarkMode(darkModeOn, tabId) {
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { hostname } = response;
            chrome.storage.local.get("currentWebsiteDarkMode, selectedTheme", (data) => {
                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                currentWebsiteDarkMode[hostname] = darkModeOn;
                selectedTheme = data.selectedTheme;
                chrome.storage.local.set({ currentWebsiteDarkMode: currentWebsiteDarkMode,
                                           filters: {hostname: {}}, 
                                           selectedTheme: null,
                                           themes: {selectedTheme: {}}
                
                }, () => {
                    applyDarkMode(tabId, darkModeOn);
                });
            });
        }
    });
}

function updateToggleState() {
    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
        if (response.error) {
            console.error(response.error);
        } else {
            const { hostname } = response;
            chrome.storage.local.get(["currentWebsiteDarkMode", "darkMode"], function(data) {
                const websiteToggle = document.getElementById('currentWebsiteToggle');
                const globalToggle = document.getElementById('darkModeToggle');
                
                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                const darkMode = data.darkMode || false;
                
                globalToggle.checked = currentWebsiteDarkMode[hostname] || darkMode;
                websiteToggle.checked = currentWebsiteDarkMode[hostname] || false;
            });
        }
    });
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
    updateFilters();
}

// Function to reload all tabs with the specific hostname
function reloadTabsWithHostnameExceptCurrent(hostname, currentTabId) {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
            const url = new URL(tab.url);
            if (url.hostname === hostname && tab.id !== currentTabId) {
                chrome.tabs.reload(tab.id);
            }
        });
    });
}

const sliders = [
    'brightnessSlider',
    'contrastSlider',
    'sepiaSlider',
    'greyscaleSlider'
 ];
 
 
 function activateSliders() {
    sliders.forEach((slider) => {
        const sliderElement = document.getElementById(slider);
        if (sliderElement) {
            sliderElement.disabled = false;
        }
    });
 }

 function deactivateSliders() {
   sliders.forEach((slider) => {
       const sliderElement = document.getElementById(slider);
       if (sliderElement) {
           sliderElement.disabled = true;
       }
   });
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

        // Button click functionality
        decreaseButtonElement.addEventListener('click', function() {
            handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, -5);
        });

        increaseButtonElement.addEventListener('click', function() {
            handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, 5);
        });

        // Button click and hold functionality
        let intervalId;

        const startIncreasing = () => {
            intervalId = setInterval(() => {
                handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, 5);
            }, 100);
        };

        const startDecreasing = () => {
            intervalId = setInterval(() => {
                handleButtonClick(sliderElement, spanElement, decreaseButtonElement, increaseButtonElement, -5);
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
            let { url, hostname } = response;
    
            // Truncate the hostname if it's longer than 15 characters
            if (hostname.length > 13) {
                hostname = hostname.substring(0, 13) + '...';
            }
    
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
    
                // Apply settings to all tabs with the same hostname
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(function(tab) {
                        const url = new URL(tab.url);
                        if (url.hostname === hostname) {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'applyFilters',
                                filters: currentFilters
                            });
                        }
                    });
                });
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
    
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete') {
            updateToggleState();
        }
    });

    chrome.tabs.onCreated.addListener(function(tab) {
        if (tab.url) {
            updateToggleState();
        }
    });

    // Event listener for global dark mode toggle button
    document.getElementById('darkModeToggle').addEventListener('click', function() {
        const globalToggle = document.getElementById('darkModeToggle');
        const globalDarkMode = globalToggle.checked;
        globalDarkMode ? activateSliders() : deactivateSliders();

        chrome.storage.local.set({ darkMode: globalDarkMode }, function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs.length > 0) {
                    const tab = tabs[0];
                    chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
                        if (response.error) {
                            console.error(response.error);
                        } else {
                            const { hostname } = response;
                            chrome.storage.local.get(["currentWebsiteDarkMode"], function(data) {
                                const currentWebsiteDarkMode = data.currentWebsiteDarkMode || {};
                                const darkModeOn = globalDarkMode;

                                // Update the dark mode setting for the current website
                                currentWebsiteDarkMode[hostname] = darkModeOn;
                                chrome.storage.local.set({ currentWebsiteDarkMode: currentWebsiteDarkMode }, () => {
                                    applyDarkMode(tab.id, darkModeOn);
                                    document.getElementById('currentWebsiteToggle').checked = darkModeOn;

                                    // Turn off current website toggle if global toggle is on
                                    if (globalDarkMode) {
                                        document.getElementById('currentWebsiteToggle').checked = false;
                                    }

                                    chrome.tabs.query({}, function(tabs) {
                                        tabs.forEach(function(tab) {
                                            const url = new URL(tab.url);
                                            if (url.hostname === hostname) {
                                                applyDarkMode(tab.id, darkModeOn);
                                            }
                                        });
                                    });
                                });
                            });
                        }
                    });
                }
            });
        });
    });

    // Event listener for current website dark mode toggle button
    document.getElementById('currentWebsiteToggle').addEventListener('click', function() {
        const currentWebsiteToggle = document.getElementById('currentWebsiteToggle');
        const currentWebsiteDarkMode = currentWebsiteToggle.checked;
        const globalToggle = document.getElementById('darkModeToggle');
        const globalDarkMode = globalToggle.checked;
        const defaultFilters = {
            brightness: 100,
            contrast: 100,
            sepia: 0,
            greyscale: 0
        };
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
                const tab = tabs[0];
                chrome.runtime.sendMessage({ action: "getActiveTabInfo" }, function(response) {
                    if (response.error) {
                        console.error(response.error);
                    } else {
                        const { hostname } = response;
                        chrome.storage.local.get(["currentWebsiteDarkMode"], function(data) {
                            const currentWebsiteDarkModeData = data.currentWebsiteDarkMode || {};
                            const darkModeOn = currentWebsiteDarkMode; // Use the current toggle state

                            // Update the dark mode setting for the current website
                            currentWebsiteDarkModeData[hostname] = darkModeOn;
                            chrome.storage.local.set({ currentWebsiteDarkMode: currentWebsiteDarkModeData }, () => {
                                if (globalDarkMode) {
                                    // If global dark mode is on, turn it off and log the message
                                    globalToggle.checked = false;
                                    chrome.storage.local.set({ darkMode: false, filters: {hostname: {}}}, () => {
                                        console.log("Global dark mode turned off.");
                                    });
                                } else {
                                    // Log that the global dark mode is already off
                                    console.log("Global dark mode is already off.");
                                }

                                chrome.tabs.query({}, function(allTabs) {
                                    allTabs.forEach(tab => {
                                        const url = new URL(tab.url);
                                        if (url.hostname === hostname) {
                                            if (!darkModeOn) {
                                                chrome.storage.local.get(["filters"], function(data) {
                                                    const filtersData = data.filters || {};
                                                    delete filtersData[hostname];
                                                    chrome.storage.local.set({ filters: filtersData }, function() {
                                                        chrome.tabs.sendMessage(tab.id, {
                                                            action: 'saveFilters',
                                                            filters: defaultFilters
                                                        });
                                                        applyDarkMode(tab.id, false);
                                                    });
                                                });
                                            } else {
                                                applyDarkMode(tab.id, darkModeOn);
                                            }
                                        }
                                    });
                                });

                                document.getElementById('currentWebsiteToggle').checked = darkModeOn;
                            });
                        });
                    }
                });
            }
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
