// js/dashboard.js

// =================================================================
//                 DASHBOARD GLOBAL SETTINGS
// =================================================================
const HIGH_ERROR_THRESHOLD = 2.0;
const WARNING_ERROR_THRESHOLD = 1.8;
let userDashboardPreferences = {
    selectedWidgets: [], // Stores { widgetId, title, sourceField, summaryType, additionalFilters (optional) }
    contextFields: {
        deviceIdField: '', // e.g., 'ユニークID'
        dateField: '',     // e.g., '日付'
        // timeField: '' // Optional, if needed for more granular default sort in field discovery
    }
};
// =================================================================

function getPreferencesKey() {
    if (!currentUser || !currentUser.dbName || !currentUser.username) {
        return 'dashboardConfig_default_v2'; // Use a new version for new structure
    }
    return `dashboardConfig_v2_${currentUser.dbName}_${currentUser.username}`;
}

function loadDashboardPreferences() {
    const key = getPreferencesKey();
    const savedPrefs = localStorage.getItem(key);
    if (savedPrefs) {
        try {
            const parsedPrefs = JSON.parse(savedPrefs);
            // Ensure structure is as expected
            userDashboardPreferences.selectedWidgets = Array.isArray(parsedPrefs.selectedWidgets) ? parsedPrefs.selectedWidgets : [];
            userDashboardPreferences.contextFields = parsedPrefs.contextFields || { deviceIdField: '', dateField: ''};
        } catch (e) {
            console.error("Error parsing saved dashboard preferences:", e);
            userDashboardPreferences = { selectedWidgets: [], contextFields: { deviceIdField: '', dateField: ''} };
        }
    } else { // Default if nothing saved
        userDashboardPreferences = { selectedWidgets: [], contextFields: { deviceIdField: '', dateField: ''} };
    }
}

function saveDashboardPreferences() {
    const key = getPreferencesKey();
    try {
        localStorage.setItem(key, JSON.stringify(userDashboardPreferences));
    } catch (e) { console.error("Error saving dashboard preferences:", e); }
}

/**
 * Fetches a sample of records to discover field names.
 */
async function fetchSubmittedDbFieldInfoForCustomization() {
    // For field discovery, use a generic sort or sort by _id if date/time fields aren't configured yet
    let sortOption = { _id: -1 }; // Default sort for discovery
    if (userDashboardPreferences.contextFields.dateField) {
        sortOption = { [userDashboardPreferences.contextFields.dateField]: -1 };
        // if (userDashboardPreferences.contextFields.timeField) {
        //     sortOption[userDashboardPreferences.contextFields.timeField] = -1;
        // }
    }

    const payload = {
        dbName: currentUser.dbName,
        collectionName: 'submittedDB',
        query: {}, // Explicitly add an empty query object
        options: { sort: sortOption, limit: 1 } 
    };
    
    try {
        const response = await fetch(`${BASE_URL}queries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to fetch sample data for fields');
        const sampleData = await response.json();

        if (!sampleData || sampleData.length === 0) return [];
        
        // Get all keys from the first sample record, excluding _id
        return Object.keys(sampleData[0]).filter(key => key !== '_id').sort();
    } catch (error) {
        console.error("Error discovering fields:", error);
        return [];
    }
}

/**
 * Renders the content of the customization modal.
 */
async function renderCustomizeModalContent() {
    const fieldsContainer = document.getElementById('dashboardFieldsContainer');
    const contextFieldsContainer = document.getElementById('dashboardContextFieldsContainer');
    fieldsContainer.innerHTML = 'Loading available fields...';
    contextFieldsContainer.innerHTML = 'Loading available fields...';

    const availableFields = await fetchSubmittedDbFieldInfoForCustomization();

    if (availableFields.length === 0) {
        fieldsContainer.innerHTML = 'Could not load fields from SubmittedDB. Ensure data exists.';
        contextFieldsContainer.innerHTML = 'Could not load fields for context mapping.';
        return;
    }

    // --- Render Context Field Mappings ---
    let contextHtml = `<p class="text-sm text-gray-600 mb-2">Map your data fields for dashboard context:</p>`;
    const contextFieldConfigs = [
        { prefKey: 'deviceIdField', label: 'Device Identifier Field (e.g., ユニークID)'},
        { prefKey: 'dateField', label: 'Primary Date Field (for daily summary, e.g., 日付)'}
        // { prefKey: 'timeField', label: 'Primary Time Field (optional, for sorting)'}
    ];

    contextFieldConfigs.forEach(cfg => {
        contextHtml += `<div class="mb-3">
            <label class="block text-sm font-medium text-gray-700">${cfg.label}</label>
            <select id="context_${cfg.prefKey}" class="mt-1 p-2 border rounded w-full bg-white">
                <option value="">-- Select Field --</option>
                ${availableFields.map(f => `<option value="${f}" ${userDashboardPreferences.contextFields[cfg.prefKey] === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
        </div>`;
    });
    contextFieldsContainer.innerHTML = contextHtml;

    // --- Render Widget Configuration Area ---
    fieldsContainer.innerHTML = ''; // Clear for actual widgets
    // For simplicity, we'll allow adding multiple widgets of the same field with different configs
    // This section will be for adding *new* widgets or listing existing ones.
    // For this iteration, let's focus on *defining* the widgets.
    // We'll display current widgets and allow adding new ones.

    // Display currently selected widgets
    let currentWidgetsHtml = '<h4 class="text-md font-semibold mb-2">Current Widgets:</h4>';
    if (userDashboardPreferences.selectedWidgets.length === 0) {
        currentWidgetsHtml += '<p class="text-sm text-gray-500">No widgets configured yet. Add one below.</p>';
    }
    userDashboardPreferences.selectedWidgets.forEach((widget, index) => {
        currentWidgetsHtml += `<div class="p-2 border rounded mb-2 bg-gray-50">
            <p class="font-medium">${widget.title || widget.sourceField} <span class="text-xs text-gray-500">(${widget.summaryType})</span></p>
            <p class="text-xs">Source Field: ${widget.sourceField}</p> 
            <button onclick="removeDashboardWidget(${index})" class="text-xs text-red-500 hover:underline">Remove</button>
        </div>`;
    });
    fieldsContainer.innerHTML += currentWidgetsHtml;

    // Area to add a new widget g
    fieldsContainer.innerHTML += `<div class="mt-4 pt-4 border-t">
        <h4 class="text-md font-semibold mb-2">Add New Widget:</h4>
        <div class="mb-2">
            <label class="block text-sm">Widget Title (optional):</label>
            <input type="text" id="newWidgetTitle" class="p-1 border rounded w-full">
        </div>
        <div class="mb-2">
            <label class="block text-sm">Data Field to Summarize:</label>
            <select id="newWidgetSourceField" class="p-1 border rounded w-full bg-white">
                <option value="">-- Select Field --</option>
                ${availableFields.map(f => `<option value="${f}">${f}</option>`).join('')}
            </select>
        </div>
        <div class="mb-2">
            <label class="block text-sm">Summary Type:</label>
            <select id="newWidgetSummaryType" class="p-1 border rounded w-full bg-white">
                <option value="percentageBreakdown">Percentage Breakdown (for text/categories)</option>
                <option value="sum">Total Sum (for numbers)</option>
                <option value="average">Average (for numbers)</option>
                <option value="countRecords">Count Records with Data</option>
                <option value="countUnique">Count Unique Values</option>
                <option value="min">Minimum (for numbers)</option>
                <option value="max">Maximum (for numbers)</option>
            </select>
        </div>
        <button onclick="addNewDashboardWidget()" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">Add Widget</button>
    </div>`;
}

function addNewDashboardWidget() {
    const title = document.getElementById('newWidgetTitle').value.trim();
    const sourceField = document.getElementById('newWidgetSourceField').value;
    const summaryType = document.getElementById('newWidgetSummaryType').value;

    if (!sourceField || !summaryType) {
        alert("Please select a Data Field and a Summary Type.");
        return;
    }
    userDashboardPreferences.selectedWidgets.push({
        widgetId: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // pseudo-unique ID
        title: title || sourceField, // Default title to fieldName if not provided
        sourceField: sourceField,
        summaryType: summaryType
    });
    renderCustomizeModalContent(); // Re-render modal to show new widget and clear inputs
    document.getElementById('newWidgetTitle').value = ''; // Clear input
}

function removeDashboardWidget(index) {
    userDashboardPreferences.selectedWidgets.splice(index, 1);
    renderCustomizeModalContent(); // Re-render modal
}


function openCustomizeModal() {
    renderCustomizeModalContent();
    document.getElementById('customizeDashboardModal').classList.remove('hidden');
}

function closeCustomizeModal() {
    document.getElementById('customizeDashboardModal').classList.add('hidden');
}


function applyDashboardCustomization() {
    // 1. Read and save the context fields from the modal's dropdowns
    const deviceIdFieldValue = document.getElementById('context_deviceIdField').value;
    const dateFieldValue = document.getElementById('context_dateField').value;

    // Optional: Add validation to ensure these critical fields are selected
    if (!deviceIdFieldValue || !dateFieldValue) {
        alert("重要: ダッシュボードのコンテキストフィールド（デバイスIDフィールドと主要日付フィールド）を「表示設定の変更」で選択してください。");
        // Consider not closing the modal or not saving if these are truly mandatory before any widget can work.
        // For now, we'll proceed to save what's selected, and loadDeviceOverview will show its own warning if they are missing.
    }

    userDashboardPreferences.contextFields.deviceIdField = deviceIdFieldValue;
    userDashboardPreferences.contextFields.dateField = dateFieldValue;
    // If you had a timeField:
    // userDashboardPreferences.contextFields.timeField = document.getElementById('context_timeField')?.value || '';

    // 2. The userDashboardPreferences.selectedWidgets array is ALREADY up-to-date
    //    due to calls to addNewDashboardWidget() and removeDashboardWidget() made
    //    during this modal session, which directly modify userDashboardPreferences.selectedWidgets.

    // 3. Save the entire, updated preferences object to localStorage.
    saveDashboardPreferences();

    // 4. Close the modal.
    closeCustomizeModal();

    // 5. Reload the dashboard to reflect all changes (new context fields and new/removed widgets).
    loadDeviceOverview();
}

document.querySelectorAll('.dashboard-field-checkbox:checked').forEach(checkbox => {
        const selectedFieldName = checkbox.getAttribute('data-field-name'); // Use a different local var name
        const fieldsInfo = document.getElementById('dashboardFieldsContainer');
        const fieldTypeElement = fieldsInfo.querySelector(`.dashboard-summary-type[data-field-name="${selectedFieldName}"]`);
        
        let summaryType = 'breakdown';
        if (fieldTypeElement) {
            summaryType = fieldTypeElement.value;
        }
        // Use sourceField, and also add a default title if one isn't explicitly set for these types of widgets
        newSelectedWidgets.push({ 
            widgetId: `widget_${Date.now()}_${selectedFieldName}`, // Give it a basic ID
            title: selectedFieldName, // Default title to the field name
            sourceField: selectedFieldName, // <--- CHANGED to sourceField
            summaryType: summaryType 
        });
    });

async function fetchDeviceList() {
    const response = await fetch(`${BASE_URL}queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            dbName: 'Sasaki_Coating_MasterDB', collectionName: 'masterUsers',
            query: { dbName: currentUser.dbName }
        }),
    });
    if (!response.ok) throw new Error('Failed to fetch master user data');
    const users = await response.json();
    return users.length > 0 ? users[0].devices || [] : [];
}

// This function is NO LONGER used to fetch all logs for the dashboard.
// Each widget will fetch its own data.
// async function fetchTodaysLogs() { ... } // REMOVED

function calculatePercentageBreakdown(data, fieldName) { // data is now the direct result from aggregation
    if (!Array.isArray(data) || data.length === 0) return { listHtml: `<p class="text-xs text-gray-400">No data for ${fieldName} breakdown.</p>`, errorBadgeHtml: '' };
    
    const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
    if (totalCount === 0) return { listHtml: `<p class="text-xs text-gray-400">No countable entries for ${fieldName}.</p>`, errorBadgeHtml: '' };

    let listHtml = `<ul class="space-y-1 text-xs mt-1">`;
    let errorBadgeHtml = '';

    data.forEach(item => { // item is like { _id: "ValueA", count: X }
        const value = item._id;
        const count = item.count;
        const percentage = (count / totalCount) * 100;
        let styleClass = 'text-gray-600';
        let valueStyle = 'font-medium text-gray-800';

        // Apply special styling if this widget is for the "Action" field (or its Japanese equivalent)
        // This requires knowing which field is the "Action" field.
        // For now, let's assume if fieldName is "アクション" (or configured "action" field)
        const isActionField = fieldName === (userDashboardPreferences.contextFields.actionFieldForStyling || 'アクション'); // Needs configuration
        if (isActionField && value === (userDashboardPreferences.contextFields.scanErrorValue || 'スキャンエラー')) {
            if (percentage > HIGH_ERROR_THRESHOLD) {
                styleClass = 'text-red-500 font-semibold'; valueStyle = 'font-semibold text-red-500';
                errorBadgeHtml = `<div class="mt-2"><span class="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">High Error Rate</span></div>`;
            } else if (percentage >= WARNING_ERROR_THRESHOLD) {
                styleClass = 'text-amber-500 font-semibold'; valueStyle = 'font-semibold text-amber-500';
                errorBadgeHtml = `<div class="mt-2"><span class="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">Warning</span></div>`;
            }
        }
        listHtml += `<li class="flex justify-between items-center ${styleClass}">
                        <span class="truncate" title="${value}">${value}</span>
                        <span class="${valueStyle}">${percentage.toFixed(1)}% (${count}/${totalCount})</span>
                     </li>`;
    });
    listHtml += `</ul>`;
    return { listHtml, errorBadgeHtml };
}

function formatNumericSummary(data, summaryType) { // data is direct aggregation result
    if (!Array.isArray(data) || data.length === 0 || data[0].value === undefined || data[0].value === null) {
        return `<p class="text-xs text-gray-400">No data.</p>`;
    }
    const result = data[0].value;
    return `<p class="text-2xl font-semibold text-gray-900">${typeof result === 'number' ? result.toFixed(summaryType === 'average' ? 2 : 0) : result}</p>`;
}

/**
 * Renders individual device card by fetching data for each configured widget.
 */
async function renderDeviceCard(device, preferences) {
    console.log("Rendering card for device:", device.uniqueId, "Prefs:", JSON.parse(JSON.stringify(preferences))); // Deep copy for logging
    console.log(userDashboardPreferences)
    const deviceTitle = device.pcName || device.name;
    const card = document.createElement('div');
    card.className = 'bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200';
    card.innerHTML = `<h3 class="text-xl font-bold text-gray-800 mb-3">${deviceTitle}</h3>`;

    const cardContentContainer = document.createElement('div');
    card.appendChild(cardContentContainer);
    
    card.onclick = function() {
        if (typeof loadPage === 'function') loadPage('submittedDB');
        else window.location.hash = '#submittedDB';
    };

    if (!preferences.contextFields.deviceIdField || !preferences.contextFields.dateField) {
        cardContentContainer.innerHTML = `<p class="text-sm text-gray-500">Dashboard context fields (Device ID, Date) are not configured. Please set them in "Customize View".</p>`;
        return card;
    }
    if (!preferences.selectedWidgets || preferences.selectedWidgets.length === 0) {
        cardContentContainer.innerHTML = `<p class="text-sm text-gray-500">Click 'Customize View' to add widgets and select metrics to display.</p>`;
        return card;
    }

    // Get today's date string for filtering
    const today = new Date();
    const jstOffset = 9 * 60; 
    const localOffset = today.getTimezoneOffset();
    today.setMinutes(today.getMinutes() + jstOffset + localOffset);
    const dateString = today.toISOString().split('T')[0];

    preferences.selectedWidgets.forEach(async (widgetConfig) => {
        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'mt-3 pt-3 border-t border-gray-200 first:border-t-0 first:pt-0';
        widgetDiv.innerHTML = `<h4 class="text-sm font-semibold text-blue-600 mb-1">${widgetConfig.title}</h4>
                               <div class="widget-data-container text-xs text-gray-500">Loading widget data...</div>`;
        cardContentContainer.appendChild(widgetDiv);
        const widgetDataContainer = widgetDiv.querySelector('.widget-data-container');

        const payload = {
            dbName: currentUser.dbName,
            collectionName: 'submittedDB',
            queryConfig: {
                deviceIdField: preferences.contextFields.deviceIdField,
                deviceIdValue: device.uniqueId,
                dateField: preferences.contextFields.dateField,
                dateValue: dateString,
                sourceField: widgetConfig.sourceField,
                summaryType: widgetConfig.summaryType,
                additionalFilters: widgetConfig.additionalFilters || {}
            }
        };

        try {
            const response = await fetch(`${BASE_URL}aggregateCustomerDashboardWidgetData`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Widget data fetch error: ${response.statusText}`);
            const widgetData = await response.json();

            if (widgetConfig.summaryType === 'percentageBreakdown') {
                const breakdown = calculatePercentageBreakdown(widgetData, widgetConfig.sourceField);
                widgetDataContainer.innerHTML = breakdown.listHtml;
                 // For special styling, need to know actionField & scanErrorValue from contextFields
                const actionFieldForStyling = preferences.contextFields.actionFieldForStyling || 'アクション';
                const scanErrorValueForStyling = preferences.contextFields.scanErrorValue || 'スキャンエラー';
                if (widgetConfig.sourceField === actionFieldForStyling) { // Check if this widget is for the "Action" field
                    widgetDataContainer.innerHTML += breakdown.errorBadgeHtml; // errorBadgeHtml logic needs to be in calculatePercentageBreakdown
                }
            } else {
                widgetDataContainer.innerHTML = formatNumericSummary(widgetData, widgetConfig.summaryType);
            }
        } catch (error) {
            console.error(`Error loading data for widget ${widgetConfig.title}:`, error);
            widgetDataContainer.innerHTML = `<p class="text-xs text-red-500">Error loading widget data.</p>`;
        }
    });
    return card;
}

async function loadDeviceOverview() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) { console.error("Main content area not found!"); return; }
    
    let customizeButtonContainer = document.getElementById('dashboardCustomizeButtonContainer');
    if (!customizeButtonContainer) {
        customizeButtonContainer = document.createElement('div');
        customizeButtonContainer.id = 'dashboardCustomizeButtonContainer';
        customizeButtonContainer.className = 'mb-4 text-right';
        customizeButtonContainer.innerHTML = `<button onclick="openCustomizeModal()" class="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">表示設定の変更</button>`;
        
        const dashboardTitle = mainContent.querySelector('h2#dashboardPageTitle'); // Give your dashboard title an ID
         if (dashboardTitle) {
            dashboardTitle.insertAdjacentElement('afterend', customizeButtonContainer);
        } else {
             const firstChild = mainContent.firstChild;
             if(firstChild) mainContent.insertBefore(customizeButtonContainer, firstChild.nextSibling);
             else mainContent.appendChild(customizeButtonContainer);
        }
    }
    
    if (!document.getElementById('customizeDashboardModal')) {
        const modalHtml = `
            <div id="customizeDashboardModal" class="fixed inset-0 bg-black bg-opacity-60 hidden z-[70] flex items-center justify-center p-4" onclick="event.target === this && closeCustomizeModal()">
                <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div class="flex justify-between items-center mb-4 pb-3 border-b">
                        <h3 class="text-xl font-semibold text-gray-800">ダッシュボード表示設定</h3>
                        <button onclick="closeCustomizeModal()" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                    </div>
                    <div class="overflow-y-auto flex-grow pr-2">
                        <div id="dashboardContextFieldsContainer" class="mb-6 p-3 border rounded bg-gray-50"></div>
                        <div id="dashboardFieldsContainer" class="space-y-1"></div>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button onclick="closeCustomizeModal()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">キャンセル</button>
                        <button onclick="applyDashboardCustomization()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">変更を適用</button>
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
    container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">デバイスデータを読み込み中...</div>`;
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';


    loadDashboardPreferences();

    // Check if essential context fields are set, if not, prompt user
    if (!userDashboardPreferences.contextFields.deviceIdField || !userDashboardPreferences.contextFields.dateField) {
        container.innerHTML = `<div class="col-span-full text-center text-orange-600 bg-orange-50 p-4 rounded border border-orange-200">
            ダッシュボードの表示には、まず「表示設定の変更」でデバイスIDフィールドと日付フィールドを指定してください。
        </div>`;
        // Optionally open the modal automatically
        // openCustomizeModal(); 
        return;
    }

    try {
        const devices = await fetchDeviceList();
        
        container.innerHTML = ''; // Clear loading before adding cards

        if (!devices || devices.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center text-gray-500">このアカウントにはデバイスが登録されていません。</div>`;
            return;
        }

        // Render cards. Data fetching for each widget happens inside renderDeviceCard
        devices.forEach(async (device) => { // Note: forEach with async in it doesn't wait
            const cardElement = await renderDeviceCard(device, userDashboardPreferences); // Make renderDeviceCard async if it needs to await
            container.appendChild(cardElement);
        });
        // If renderDeviceCard is not async and fetches internally, the above is fine.
        // If renderDeviceCard becomes async itself due to internal awaits, consider Promise.all if order doesn't matter
        // or a sequential loop if order matters or to avoid too many parallel requests at once.

    } catch (error) {
        console.error('Dashboard Error:', error);
        container.innerHTML = `<div class="col-span-full text-center text-red-500">ダッシュボードの読み込みに失敗しました: ${error.message}</div>`;
    }
}
