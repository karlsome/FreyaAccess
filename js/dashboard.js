// js/dashboard.js

// =================================================================
//                 DASHBOARD GLOBAL SETTINGS
// =================================================================
const HIGH_ERROR_THRESHOLD = 2.0;
const WARNING_ERROR_THRESHOLD = 1.8;
// =================================================================

/**
 * Fetches the list of registered devices for the current customer.
 * @returns {Promise<Array>} A promise that resolves to an array of device objects.
 */
async function fetchDeviceList() {
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

/**
 * Fetches all log entries from the submittedDB for the current day.
 * @returns {Promise<Array>} A promise that resolves to an array of log objects.
 */
async function fetchTodaysLogs() {
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

/**
 * Processes the raw data and renders the dashboard UI.
 * @param {Array} devices - The list of device objects.
 * @param {Array} logs - The list of log objects for today.
 */
function renderDashboard(devices, logs) {
    const container = document.getElementById('deviceOverviewContainer');
    container.innerHTML = ''; 

    if (!devices || devices.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500">No devices are registered for this account.</div>`;
        return;
    }

    devices.forEach(device => {
        const deviceTitle = device.pcName || device.name;
        const deviceLogs = logs.filter(log => log.uniqueID === device.uniqueId);
        
        // ADDED: onclick to navigate
        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer';
        
        card.onclick = function() {
            // Assuming loadPage is a globally accessible function from app.js
            if (typeof loadPage === 'function') {
                loadPage('submittedDB');
            } else {
                // Fallback to hash navigation if direct call isn't possible
                // (This would require app.js to have a hashchange listener)
                console.warn("loadPage function not found, attempting hash navigation. Ensure app.js handles hash changes.");
                window.location.hash = '#submittedDB';
            }
        };

        let contentHtml = `<h3 class="text-xl font-bold text-gray-800 mb-4">${deviceTitle}</h3>`;

        if (deviceLogs.length === 0) {
            contentHtml += `<p class="text-gray-500">No activity recorded today.</p>`;
        } else {
            const totalActions = deviceLogs.length;
            const actionCounts = {};
            deviceLogs.forEach(log => {
                actionCounts[log.Action] = (actionCounts[log.Action] || 0) + 1;
            });
            
            let actionListHtml = '<ul class="space-y-2 text-sm">';
            let errorBadgeHtml = '';
            const sortedActions = Object.keys(actionCounts).sort();

            for (const action of sortedActions) {
                const count = actionCounts[action];
                const percentage = (count / totalActions) * 100;
                let styleClass = 'text-gray-700';
                let valueStyle = 'font-semibold text-gray-900';

                if (action === 'Scan Error') {
                    if (percentage > HIGH_ERROR_THRESHOLD) {
                        styleClass = 'text-red-600 font-bold';
                        valueStyle = 'font-bold text-red-600';
                        errorBadgeHtml = `<div class="mt-4"><span class="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">High Error Rate</span></div>`;
                    } else if (percentage >= WARNING_ERROR_THRESHOLD) {
                        styleClass = 'text-amber-600 font-bold';
                        valueStyle = 'font-bold text-amber-600';
                        errorBadgeHtml = `<div class="mt-4"><span class="bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1 rounded-full">Warning</span></div>`;
                    }
                }
                actionListHtml += `
                    <li class="flex justify-between items-center ${styleClass}">
                        <span>${action}</span>
                        <span class="${valueStyle}">${percentage.toFixed(2)}% (${count})</span>
                    </li>`;
            }
            actionListHtml += '</ul>';
            contentHtml += actionListHtml;
            contentHtml += errorBadgeHtml;
        }
        
        card.innerHTML = contentHtml;
        container.appendChild(card);
    });
}

/**
 * Main function to load and display the device overview dashboard.
 */
async function loadDeviceOverview() {
    const container = document.getElementById('deviceOverviewContainer');
    if (!container) return; 

    container.innerHTML = `<div class="text-center text-gray-500">Loading device data...</div>`;

    try {
        const [devices, logs] = await Promise.all([
            fetchDeviceList(),
            fetchTodaysLogs()
        ]);
        
        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        renderDashboard(devices, logs);

    } catch (error) {
        console.error('Dashboard Error:', error);
        container.innerHTML = `<div class="text-center text-red-500">Failed to load dashboard: ${error.message}</div>`;
    }
}