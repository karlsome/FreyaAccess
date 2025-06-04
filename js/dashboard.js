// js/dashboard.js

// =================================================================
//                 DASHBOARD GLOBAL SETTINGS
// =================================================================
const HIGH_ERROR_THRESHOLD = 2.0;
const WARNING_ERROR_THRESHOLD = 1.8;
let userDashboardPreferences = {}; // To store loaded preferences
// =================================================================

/**
 * Generates a unique localStorage key for the user's dashboard preferences.
 */
function getPreferencesKey() {
    if (!currentUser || !currentUser.dbName || !currentUser.username) {
        console.error("User data not available for preference key.");
        return 'dashboardConfig_default'; // Fallback key
    }
    return `dashboardConfig_${currentUser.dbName}_${currentUser.username}`;
}

/**
 * Loads dashboard preferences from localStorage.
 */
function loadDashboardPreferences() {
    const key = getPreferencesKey();
    const savedPrefs = localStorage.getItem(key);
    if (savedPrefs) {
        try {
            userDashboardPreferences = JSON.parse(savedPrefs);
            if (!userDashboardPreferences.selectedWidgets) {
                userDashboardPreferences.selectedWidgets = [];
            }
        } catch (e) {
            console.error("Error parsing saved dashboard preferences:", e);
            userDashboardPreferences = { selectedWidgets: [] };
        }
    } else {
        userDashboardPreferences = { selectedWidgets: [] }; // Default to empty if nothing saved
    }
}

/**
 * Saves dashboard preferences to localStorage.
 */
function saveDashboardPreferences() {
    const key = getPreferencesKey();
    try {
        localStorage.setItem(key, JSON.stringify(userDashboardPreferences));
    } catch (e) {
        console.error("Error saving dashboard preferences:", e);
    }
}

/**
 * Fetches a sample of records to discover field names and infer types.
 * @returns {Promise<Array>} Array of objects like { name: 'fieldName', type: 'string'/'number', isCategorical: boolean }
 */
async function fetchSubmittedDbFieldInfo() {
    // Fetch a sample (e.g., latest 100 records) to infer fields and types
    const payload = {
        dbName: currentUser.dbName,
        collectionName: 'submittedDB',
        options: { sort: { date: -1, time: -1 }, limit: 100 } // Get latest 100
    };
    try {
        const response = await fetch(`${BASE_URL}queries`, { // Using generic /queries for this
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to fetch sample data for fields');
        const sampleData = await response.json();

        if (!sampleData || sampleData.length === 0) return [];

        const fieldInfo = {};
        sampleData.forEach(record => {
            Object.keys(record).forEach(key => {
                if (key === '_id') return; // Skip MongoDB ID
                if (!fieldInfo[key]) {
                    fieldInfo[key] = {
                        name: key,
                        typeCounts: { string: 0, number: 0, boolean: 0, other: 0 },
                        values: new Set()
                    };
                }
                const value = record[key];
                if (typeof value === 'string') fieldInfo[key].typeCounts.string++;
                else if (typeof value === 'number') fieldInfo[key].typeCounts.number++;
                else if (typeof value === 'boolean') fieldInfo[key].typeCounts.boolean++;
                else fieldInfo[key].typeCounts.other++;
                
                if (typeof value === 'string' || typeof value === 'number') {
                     fieldInfo[key].values.add(value);
                }
            });
        });
        
        return Object.values(fieldInfo).map(info => {
            let inferredType = 'string'; // Default
            if (info.typeCounts.number > info.typeCounts.string && info.typeCounts.number > info.typeCounts.boolean) {
                inferredType = 'number';
            } else if (info.typeCounts.boolean > info.typeCounts.string && info.typeCounts.boolean > info.typeCounts.number) {
                inferredType = 'boolean';
            }
            // Simple categorical check: if it's a string and has few unique values relative to string counts
            const isCategorical = inferredType === 'string' && info.values.size <= 10 && info.typeCounts.string > 0; 
            return { name: info.name, type: inferredType, isCategorical: isCategorical };
        }).sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error("Error discovering fields:", error);
        return [];
    }
}

/**
 * Renders the content of the customization modal.
 */
async function renderCustomizeModalContent() {
    const container = document.getElementById('dashboardFieldsContainer');
    container.innerHTML = 'Loading fields...';
    const fields = await fetchSubmittedDbFieldInfo();

    if (fields.length === 0) {
        container.innerHTML = 'Could not load fields from SubmittedDB.';
        return;
    }

    let html = '';
    fields.forEach(field => {
        const currentWidgetConfig = userDashboardPreferences.selectedWidgets.find(w => w.fieldName === field.name);
        const isChecked = !!currentWidgetConfig;
        
        html += `<div class="p-2 border-b">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" class="mr-2 dashboard-field-checkbox" data-field-name="${field.name}" ${isChecked ? 'checked' : ''}>
                        <span class="font-medium">${field.name}</span>
                    </label>`;
        
        if (field.type === 'number') {
            const currentSummaryType = currentWidgetConfig ? currentWidgetConfig.summaryType : 'sum';
            html += `<select class="ml-4 mt-1 p-1 border rounded text-sm bg-white dashboard-summary-type" data-field-name="${field.name}" ${!isChecked ? 'disabled' : ''}>
                        <option value="sum" ${currentSummaryType === 'sum' ? 'selected' : ''}>Total Sum</option>
                        <option value="average" ${currentSummaryType === 'average' ? 'selected' : ''}>Average</option>
                        <option value="count" ${currentSummaryType === 'count' ? 'selected' : ''}>Count Records</option>
                        <option value="min" ${currentSummaryType === 'min' ? 'selected' : ''}>Minimum</option>
                        <option value="max" ${currentSummaryType === 'max' ? 'selected' : ''}>Maximum</option>
                     </select>`;
        }
        // For categorical, default is breakdown. Can add options later if needed.
        html += `</div>`;
    });
    container.innerHTML = html;

    // Add event listeners to enable/disable summary type dropdowns
    container.querySelectorAll('.dashboard-field-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const fieldName = event.target.getAttribute('data-field-name');
            const summarySelect = container.querySelector(`.dashboard-summary-type[data-field-name="${fieldName}"]`);
            if (summarySelect) {
                summarySelect.disabled = !event.target.checked;
            }
        });
    });
}

/**
 * Opens the dashboard customization modal.
 */
function openCustomizeModal() {
    renderCustomizeModalContent(); // Populate with fields
    document.getElementById('customizeDashboardModal').classList.remove('hidden');
}

/**
 * Closes the dashboard customization modal.
 */
function closeCustomizeModal() {
    document.getElementById('customizeDashboardModal').classList.add('hidden');
}

/**
 * Applies the selections from the modal and saves preferences.
 */
function applyDashboardCustomization() {
    const newSelectedWidgets = [];
    document.querySelectorAll('.dashboard-field-checkbox:checked').forEach(checkbox => {
        const fieldName = checkbox.getAttribute('data-field-name');
        const fieldsInfo = document.getElementById('dashboardFieldsContainer'); // To get type info indirectly
        const fieldTypeElement = fieldsInfo.querySelector(`.dashboard-summary-type[data-field-name="${fieldName}"]`);
        
        let summaryType = 'breakdown'; // Default for categorical/string
        if (fieldTypeElement) { // It's a numeric field with a summary type selector
            summaryType = fieldTypeElement.value;
        }
        newSelectedWidgets.push({ fieldName: fieldName, summaryType: summaryType });
    });
    userDashboardPreferences.selectedWidgets = newSelectedWidgets;
    saveDashboardPreferences();
    closeCustomizeModal();
    loadDeviceOverview(); // Reload dashboard with new preferences
}


// --- Main Dashboard Rendering Logic ---

async function fetchDeviceList() { /* ... (same as before) ... */ 
    const response = await fetch(`${BASE_URL}queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            dbName: 'Sasaki_Coating_MasterDB',
            collectionName: 'masterUsers',
            query: { dbName: currentUser.dbName }
        }),
    });
    if (!response.ok) throw new Error('Failed to fetch master user data');
    const users = await response.json();
    return users.length > 0 ? users[0].devices || [] : [];
}

async function fetchTodaysLogs() { /* ... (same as before) ... */ 
    const today = new Date();
    const jstOffset = 9 * 60; 
    const localOffset = today.getTimezoneOffset();
    today.setMinutes(today.getMinutes() + jstOffset + localOffset);
    const dateString = today.toISOString().split('T')[0];

    const response = await fetch(`${BASE_URL}queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            dbName: currentUser.dbName,
            collectionName: 'submittedDB',
            query: { date: dateString } 
        }),
    });
    if (!response.ok) throw new Error('Failed to fetch today\'s logs');
    return response.json();
}

function calculatePercentageBreakdown(logs, fieldName) {
    if (logs.length === 0) return { listHtml: '', errorBadgeHtml: '' };
    
    const counts = {};
    let validEntriesForField = 0;
    logs.forEach(log => {
        if (log[fieldName] !== undefined && log[fieldName] !== null && String(log[fieldName]).trim() !== "") {
            counts[log[fieldName]] = (counts[log[fieldName]] || 0) + 1;
            validEntriesForField++;
        }
    });

    if (validEntriesForField === 0) return { listHtml: `<p class="text-xs text-gray-400">No data for ${fieldName}</p>`, errorBadgeHtml: '' };

    let listHtml = `<ul class="space-y-1 text-xs mt-1">`;
    let errorBadgeHtml = '';
    const sortedValues = Object.keys(counts).sort();

    for (const value of sortedValues) {
        const count = counts[value];
        const percentage = (count / validEntriesForField) * 100;
        let styleClass = 'text-gray-600';
        let valueStyle = 'font-medium text-gray-800';

        if (fieldName === 'Action' && value === 'Scan Error') { // Apply special styling for Scan Error
            if (percentage > HIGH_ERROR_THRESHOLD) {
                styleClass = 'text-red-500 font-semibold';
                valueStyle = 'font-semibold text-red-500';
                errorBadgeHtml = `<div class="mt-2"><span class="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">High Error Rate</span></div>`;
            } else if (percentage >= WARNING_ERROR_THRESHOLD) {
                styleClass = 'text-amber-500 font-semibold';
                valueStyle = 'font-semibold text-amber-500';
                errorBadgeHtml = `<div class="mt-2"><span class="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">Warning</span></div>`;
            }
        }
        listHtml += `<li class="flex justify-between items-center ${styleClass}">
                        <span>${value}</span>
                        <span class="${valueStyle}">${percentage.toFixed(2)}% (${count}/${validEntriesForField})</span>
                     </li>`;
    }
    listHtml += `</ul>`;
    return { listHtml, errorBadgeHtml };
}

function calculateNumericSummary(logs, fieldName, summaryType) {
    const numbers = logs.map(log => parseFloat(log[fieldName])).filter(n => !isNaN(n));
    if (numbers.length === 0) return `<p class="text-xs text-gray-400">No numeric data for ${fieldName}</p>`;

    let result;
    let label = '';
    switch (summaryType) {
        case 'sum':
            result = numbers.reduce((acc, val) => acc + val, 0);
            label = 'Total Sum';
            break;
        case 'average':
            result = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
            label = 'Average';
            break;
        case 'min':
            result = Math.min(...numbers);
            label = 'Minimum';
            break;
        case 'max':
            result = Math.max(...numbers);
            label = 'Maximum';
            break;
        case 'count':
            result = numbers.length;
            label = 'Record Count';
            break;
        default:
            return `<p class="text-xs text-red-400">Unknown summary: ${summaryType}</p>`;
    }
    return `<p class="text-base font-semibold text-gray-900">${typeof result === 'number' ? result.toFixed(2) : result}</p>`;
}

/**
 * Renders individual device card with customized widgets.
 */
function renderDeviceCard(device, allTodayLogs, preferences) {
    const deviceTitle = device.pcName || device.name;
    const deviceLogs = allTodayLogs.filter(log => log.uniqueID === device.uniqueId);

    let cardContentHtml = `<h3 class="text-xl font-bold text-gray-800 mb-3">${deviceTitle}</h3>`;

    if (!preferences || !preferences.selectedWidgets || preferences.selectedWidgets.length === 0) {
        cardContentHtml += `<p class="text-sm text-gray-500">Click 'Customize View' to select metrics to display.</p>`;
    } else {
        preferences.selectedWidgets.forEach(widgetConfig => {
            cardContentHtml += `<div class="mt-3 pt-3 border-t border-gray-200 first:border-t-0 first:pt-0">`;
            cardContentHtml += `<h4 class="text-sm font-semibold text-blue-600 mb-1">${widgetConfig.fieldName} (${widgetConfig.summaryType})</h4>`;
            
            // Determine if field is likely categorical by checking its summary type preference
            // This assumes `fetchSubmittedDbFieldInfo` would inform this choice, but for simplicity now:
            // We rely on the summaryType chosen by the user.
            if (widgetConfig.summaryType === 'breakdown') {
                const breakdown = calculatePercentageBreakdown(deviceLogs, widgetConfig.fieldName);
                cardContentHtml += breakdown.listHtml;
                if (widgetConfig.fieldName === 'Action') { // Only show error badge for Action field
                    cardContentHtml += breakdown.errorBadgeHtml;
                }
            } else { // Assumed numeric summary type (sum, average, etc.)
                cardContentHtml += calculateNumericSummary(deviceLogs, widgetConfig.fieldName, widgetConfig.summaryType);
            }
            cardContentHtml += `</div>`;
        });
    }

    const card = document.createElement('div');
    card.className = 'bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer';
    card.onclick = function() {
        if (typeof loadPage === 'function') loadPage('submittedDB');
        else window.location.hash = '#submittedDB';
    };
    card.innerHTML = cardContentHtml;
    return card;
}


/**
 * Main function to load and display the device overview dashboard.
 */
async function loadDeviceOverview() {
    const mainContent = document.getElementById('mainContent'); // Assume this div exists from index.html
    if (!mainContent) return;
    
    // Inject Customize Button if not already there (or ensure it's correctly placed in index.html or app.js)
    let customizeButtonContainer = document.getElementById('dashboardCustomizeButtonContainer');
    if (!customizeButtonContainer) {
        customizeButtonContainer = document.createElement('div');
        customizeButtonContainer.id = 'dashboardCustomizeButtonContainer';
        customizeButtonContainer.className = 'mb-4 text-right'; // Style as needed
        customizeButtonContainer.innerHTML = `<button onclick="openCustomizeModal()" class="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">Customize View</button>`;
        // Find where to insert this button. Usually above the deviceOverviewContainer
        const dashboardTitle = mainContent.querySelector('h2'); // Assuming there's an H2 for "Device Overview"
        if (dashboardTitle) {
            dashboardTitle.insertAdjacentElement('afterend', customizeButtonContainer);
        } else {
            mainContent.insertBefore(customizeButtonContainer, mainContent.firstChild); // Fallback
        }
    }
    
    // Inject Modal HTML if not already in index.html
    if (!document.getElementById('customizeDashboardModal')) {
        const modalHtml = `
            <div id="customizeDashboardModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-[70] flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold">Customize Dashboard Widgets</h3>
                        <button onclick="closeCustomizeModal()" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    <div id="dashboardFieldsContainer" class="space-y-1 max-h-80 overflow-y-auto mb-6 border p-3 rounded bg-gray-50">
                        Loading fields...
                    </div>
                    <div class="flex justify-end gap-2">
                        <button onclick="closeCustomizeModal()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300">Cancel</button>
                        <button onclick="applyDashboardCustomization()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Apply Changes</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }


    const container = document.getElementById('deviceOverviewContainer');
    if (!container) {
        console.error("deviceOverviewContainer not found in mainContent for dashboard.");
        return; 
    }
    container.innerHTML = `<div class="text-center text-gray-500">Loading device data...</div>`;

    loadDashboardPreferences(); // Load any saved preferences

    try {
        const [devices, logs] = await Promise.all([
            fetchDeviceList(),
            fetchTodaysLogs()
        ]);
        
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        container.innerHTML = ''; // Clear loading message before adding cards

        if (!devices || devices.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center text-gray-500">No devices are registered for this account.</div>`;
            return;
        }

        devices.forEach(device => {
            const cardElement = renderDeviceCard(device, logs, userDashboardPreferences);
            container.appendChild(cardElement);
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        container.innerHTML = `<div class="col-span-full text-center text-red-500">Failed to load dashboard: ${error.message}</div>`;
    }
}