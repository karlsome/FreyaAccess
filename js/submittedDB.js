// js/submittedDB.js

// --- State Management for the Submitted DB Page ---
let totalRecords = 0;
let currentPage = 1;
let itemsPerPage = 50;
let currentSort = { column: 'date', direction: 'desc' };
let currentFilters = {};
let selectedRows = new Set();
let allColumnDefinitions = [
    { key: 'date', label: 'Date' }, { key: 'time', label: 'Time' },
    { key: 'device name', label: 'Device' }, { key: '品番', label: '品番' },
    { key: 'Action', label: 'Action' }, { key: 'Comments', label: 'Comments' },
    { key: '班長', label: 'Supervisor' }
];
let exportColumnSelection = {};
allColumnDefinitions.forEach(h => exportColumnSelection[h.key] = true);

/**
 * Main function to fetch data and re-render.
 */
async function fetchAndRenderData(resetPage = false) {
    if (resetPage) currentPage = 1;
    const tableContainer = document.getElementById("submittedTableContainer");
    tableContainer.innerHTML = `<div class="text-center text-gray-500 py-4">Loading data...</div>`;

    // Construct the sort object in the format MongoDB expects
    const mongoSortObject = { [currentSort.column]: currentSort.direction === 'asc' ? 1 : -1 };
    
    // If you always want a secondary sort by time (newest first), add it,
    // but only if the primary sort isn't already on 'time'.
    if (currentSort.column !== 'time') {
        mongoSortObject.time = -1; // Always sort by newest time as secondary
    }

    const payload = {
        dbName: currentUser.dbName,
        filters: currentFilters,
        sort: mongoSortObject, // <-- CORRECTED: Send the correctly formatted sort object
        limit: itemsPerPage,
        skip: (currentPage - 1) * itemsPerPage,
        getTotalCount: true
    };

    try {
        const response = await fetch(`${BASE_URL}fetchCustomerSubmittedLogs`, { // Or your new route
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        const result = await response.json();
        
        const records = result.data || [];
        totalRecords = result.totalCount || 0;

        renderTable(records);
        renderPagination();
        selectedRows.clear();
        updateCheckAllCheckboxState();

    } catch (error) {
        console.error('Failed to fetch submitted data:', error);
        tableContainer.innerHTML = `<div class="text-center text-red-500 py-4">Error loading data: ${error.message}</div>`;
    }
}

function renderTable(data) {
    const tableContainer = document.getElementById("submittedTableContainer");
    let headerHtml = '<tr>';
    headerHtml += `<th class="p-3 w-10 text-center"><input type="checkbox" id="checkAllRows" onchange="toggleCheckAll(this)"></th>`;
    headerHtml += `<th class="p-3 w-12 text-left text-sm font-semibold text-gray-600">#</th>`;
    allColumnDefinitions.forEach(header => {
        const sortIcon = currentSort.column === header.key ? (currentSort.direction === 'asc' ? '↑' : '↓') : '';
        headerHtml += `<th class="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider cursor-pointer" onclick="handleSort('${header.key}')">
            ${header.label} <span class="text-gray-400">${sortIcon}</span>
        </th>`;
    });
    headerHtml += '</tr>';

    let bodyHtml = '';
    data.forEach((row, index) => {
        const rowNumberOnPage = (currentPage - 1) * itemsPerPage + index + 1;
        const isChecked = selectedRows.has(row._id);
        bodyHtml += `<tr class="border-b border-gray-200 hover:bg-gray-50">`;
        bodyHtml += `<td class="p-3 text-center"><input type="checkbox" class="row-checkbox" data-id="${row._id}" onchange="toggleRowSelection(this)" ${isChecked ? 'checked' : ''}></td>`;
        bodyHtml += `<td class="p-3 text-sm text-gray-500">${rowNumberOnPage}</td>`;
        allColumnDefinitions.forEach(header => {
            bodyHtml += `<td class="p-0"><div class="p-3 text-sm text-gray-700 whitespace-nowrap cursor-pointer" onclick='showDetailsPanel(${JSON.stringify(row)})'>${row[header.key] || ''}</div></td>`;
        });
        bodyHtml += `</tr>`;
    });

    if (data.length === 0 && currentPage === 1 && Object.keys(currentFilters).length === 0) {
        tableContainer.innerHTML = `<div class="text-center text-gray-500 py-4">No submitted logs found.</div>`;
    } else if (data.length === 0) {
        tableContainer.innerHTML = `<div class="text-center text-gray-500 py-4">No logs found matching your criteria.</div>`;
    } else {
        tableContainer.innerHTML = `<div class="overflow-x-auto">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-100">${headerHtml}</thead>
                <tbody>${bodyHtml}</tbody>
            </table>
        </div>`;
    }
}

function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    let startRecord = totalRecords > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    let endRecord = Math.min(currentPage * itemsPerPage, totalRecords);
    let summary = `Showing ${startRecord} to ${endRecord} of ${totalRecords} results.`;
    if (totalRecords === 0) summary = "No results.";
    
    let paginationHtml = `<div class="flex items-center justify-between mt-4 text-sm text-gray-600"><span>${summary}</span>`;
    if (totalPages > 1) {
        paginationHtml += `<div class="flex items-center gap-2">
            <button class="px-3 py-1 border rounded ${currentPage === 1 ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button class="px-3 py-1 border rounded ${currentPage === totalPages ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>`;
    }
    paginationHtml += `</div>`;
    paginationContainer.innerHTML = paginationHtml;
}

function changePage(page) {
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    fetchAndRenderData();
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    fetchAndRenderData(true);
}

function changeItemsPerPage(selectElement) {
    itemsPerPage = parseInt(selectElement.value, 10);
    fetchAndRenderData(true);
}

function applyFilters() {
    const fromDate = document.getElementById('fromDateFilter').value;
    const toDate = document.getElementById('toDateFilter').value;
    const action = document.getElementById('actionFilter').value;
    const hinban = document.getElementById('hinbanFilter').value.trim();
    currentFilters = {};
    if (fromDate || toDate) {
        currentFilters.date = {};
        if (fromDate) currentFilters.date.$gte = fromDate;
        if (toDate) currentFilters.date.$lte = toDate;
    }
    if (action) currentFilters.Action = action;
    if (hinban) currentFilters['品番'] = { $regex: hinban, $options: 'i' };
    fetchAndRenderData(true);
}

function toggleRowSelection(checkbox) {
    const id = checkbox.getAttribute('data-id');
    if (checkbox.checked) selectedRows.add(id);
    else selectedRows.delete(id);
    updateCheckAllCheckboxState();
}

function toggleCheckAll(masterCheckbox) {
    const checkboxes = document.querySelectorAll('#submittedTableContainer tbody input.row-checkbox');
    checkboxes.forEach(cb => {
        const id = cb.getAttribute('data-id');
        cb.checked = masterCheckbox.checked;
        if (masterCheckbox.checked) selectedRows.add(id);
        else selectedRows.delete(id);
    });
}

function updateCheckAllCheckboxState() {
    const masterCheckbox = document.getElementById('checkAllRows');
    if (!masterCheckbox) return;
    const visibleCheckboxes = Array.from(document.querySelectorAll('#submittedTableContainer tbody input.row-checkbox'));
    if (visibleCheckboxes.length === 0) {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = false;
        return;
    }
    const allVisibleChecked = visibleCheckboxes.every(cb => cb.checked);
    const someVisibleChecked = visibleCheckboxes.some(cb => cb.checked);
    masterCheckbox.checked = allVisibleChecked;
    masterCheckbox.indeterminate = !allVisibleChecked && someVisibleChecked;
}

function showDetailsPanel(record) {
    const panel = document.getElementById('detailsPanel');
    const panelContent = document.getElementById('detailsPanelContent');
    const panelOverlay = document.getElementById('detailsPanelOverlay');
    document.getElementById('detailsPanelTitle').textContent = record['品番'] || 'Log Details';
    let contentHtml = '';
    const preferredOrder = ['品番', 'date', 'time', 'Action', 'device name', 'uniqueID', 'Comments', '班長'];
    const displayedKeys = new Set(preferredOrder);
    const createRowHTML = (key, value) => `<div class="py-2 px-4 border-b"><p class="text-xs text-gray-500">${key}</p><p class="text-base text-gray-900 break-words">${value || '-'}</p></div>`;
    preferredOrder.forEach(key => { if (record.hasOwnProperty(key)) contentHtml += createRowHTML(key, record[key]); });
    for (const key in record) { if (key !== '_id' && !displayedKeys.has(key) && record.hasOwnProperty(key)) contentHtml += createRowHTML(key, record[key]); }
    panelContent.innerHTML = contentHtml;
    panel.classList.remove('translate-x-full');
    panelOverlay.classList.remove('hidden');
}

function hideDetailsPanel() {
    document.getElementById('detailsPanel').classList.add('translate-x-full');
    document.getElementById('detailsPanelOverlay').classList.add('hidden');
}

function initiateExport(format) {
    const modal = document.getElementById('exportOptionsModal');
    let checkboxHtml = '';
    allColumnDefinitions.forEach(h => {
        checkboxHtml += `<label class="flex items-center p-2 hover:bg-gray-100 rounded"><input type="checkbox" class="mr-2 export-column-checkbox" value="${h.key}" ${exportColumnSelection[h.key] ? 'checked' : ''}> ${h.label}</label>`;
    });
    document.getElementById('columnSelectionContainer').innerHTML = checkboxHtml;
    document.getElementById('confirmExportBtn').onclick = () => {
        document.querySelectorAll('.export-column-checkbox').forEach(cb => exportColumnSelection[cb.value] = cb.checked);
        if (format === 'csv') executeExportCsv();
        if (format === 'pdf') executeExportPdf();
        modal.classList.add('hidden');
    };
    modal.classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('exportOptionsModal').classList.add('hidden');
}

async function executeExportCsv() {
    const selectedExportKeys = Object.keys(exportColumnSelection).filter(key => exportColumnSelection[key]);
    if (selectedExportKeys.length === 0) { alert("Please select at least one column to export."); return; }

    let idsToFetchArray = [];
    let fetchAllFiltered = false;

    if (selectedRows.size > 0) {
        idsToFetchArray = Array.from(selectedRows);
    } else {
        fetchAllFiltered = true; 
    }

    // Construct the MongoDB-native sort object
    const mongoSortObject = { [currentSort.column]: currentSort.direction === 'asc' ? 1 : -1 };
    if (currentSort.column !== 'time') { // Ensure secondary sort by time if not primary
        mongoSortObject.time = -1; 
    }

    const payload = { 
        dbName: currentUser.dbName, 
        filters: fetchAllFiltered ? currentFilters : {}, 
        idsToFetch: idsToFetchArray, 
        sort: mongoSortObject, // <-- CORRECTED: Send correctly formatted sort object
        getTotalCount: false 
    };
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'Preparing CSV export, please wait...';
    loadingIndicator.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-lg z-[100]'; 
    document.body.appendChild(loadingIndicator);

    try {
        const response = await fetch(`${BASE_URL}fetchCustomerSubmittedLogs`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        if (!response.ok) throw new Error(`Server error for export: ${response.statusText}`);
        
        const dataToExport = await response.json(); 
        if (!Array.isArray(dataToExport)) throw new Error("Export data is not an array.");

        const headersForCsv = selectedExportKeys.map(key => allColumnDefinitions.find(h => h.key === key)?.label || key);
        const dataForCsv = dataToExport.map(row => {
            return selectedExportKeys.map(key => row[key] === undefined || row[key] === null ? '' : row[key]);
        });

        const csv = Papa.unparse({ fields: headersForCsv, data: dataForCsv });
        const uin8array = new TextEncoder('sjis', { NONSTANDARD_allowLegacyEncoding: true }).encode(csv);
        const blob = new Blob([uin8array], { type: 'text/csv;charset=shift_jis;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `submitted_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href); 
    } catch(error) {
        console.error("Error during CSV export:", error);
        alert("Failed to export CSV: " + error.message);
    } finally {
        if (document.body.contains(loadingIndicator)) {
            document.body.removeChild(loadingIndicator);
        }
    }
}

async function executeExportPdf() {
    const selectedExportKeys = Object.keys(exportColumnSelection).filter(key => exportColumnSelection[key]);
    if (selectedExportKeys.length === 0) { 
        alert("Please select at least one column to export."); 
        return; 
    }
    
    // ... (payload construction logic for fetching dataToExport - remains the same)
    let idsToFetchArray = [];
    let fetchAllFiltered = false;

    if (selectedRows.size > 0) {
        idsToFetchArray = Array.from(selectedRows);
    } else {
        fetchAllFiltered = true;
    }

    const mongoSortObject = { [currentSort.column]: currentSort.direction === 'asc' ? 1 : -1 };
    if (currentSort.column !== 'time') { 
        mongoSortObject.time = -1; 
    }

    const payload = { 
        dbName: currentUser.dbName, 
        filters: fetchAllFiltered ? currentFilters : {},
        idsToFetch: idsToFetchArray,
        sort: mongoSortObject,
        getTotalCount: false
    };
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'Preparing PDF export, please wait...';
    loadingIndicator.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-lg z-[100]';
    document.body.appendChild(loadingIndicator);

    try {
        const response = await fetch(`${BASE_URL}fetchCustomerSubmittedLogs`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        if (!response.ok) throw new Error(`Server error for export: ${response.statusText}`);
        const dataToExport = await response.json();
        if (!Array.isArray(dataToExport)) throw new Error("Export data is not an array.");

        const headersForPdf = selectedExportKeys.map(key => allColumnDefinitions.find(h => h.key === key)?.label || key);
        const bodyForPdf = dataToExport.map(row => selectedExportKeys.map(key => row[key] === undefined || row[key] === null ? '' : String(row[key])));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: selectedExportKeys.length > 5 ? 'landscape' : 'portrait' });

        // =================== FONT LOADING (EMBEDDED BASE64) ===================
        // Replace this with the actual base64 string of NotoSansJP-Regular.ttf
        // It will be VERY long.
        

        try {
            if (notoSansJPRegularBase64.startsWith("YOUR_")) {
                 throw new Error("Noto Sans JP Regular font base64 string is not embedded.");
            }
            doc.addFileToVFS('NotoSansJP-Regular.ttf', notoSansJPRegularBase64);
            doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');

            // If you have a bold version of Noto Sans JP:
            if (notoSansJPBoldBase64 && !notoSansJPBoldBase64.startsWith("YOUR_")) {
               doc.addFileToVFS('NotoSansJP-Bold.ttf', notoSansJPBoldBase64);
               doc.addFont('NotoSansJP-Bold.ttf', 'NotoSansJP', 'bold');
            } else {
               console.warn("Noto Sans JP Bold font not embedded. Bold style may not render correctly.");
            }
            
            doc.setFont('NotoSansJP'); // Set the default font for the document
            console.log("Noto Sans JP font registered.");
        } catch (fontError) {
            console.error("Failed to register Noto Sans JP font:", fontError);
            alert("Failed to load Japanese font. PDF will use standard font.");
        }
        // ======================================================================
        
        doc.autoTable({
            head: [headersForPdf],
            body: bodyForPdf,
            styles: { 
                font: "NotoSansJP", // Apply the registered font name
                fontStyle: 'normal',
                fontSize: 8
            },
            headStyles: {
                font: "NotoSansJP", 
                fontStyle: 'bold', // jsPDF will try to find a 'bold' variant of 'NotoSansJP'
                fontSize: 10
            },
        });
        doc.save(`submitted_logs_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(error) {
        console.error("Error during PDF export:", error);
        alert("Failed to export PDF: " + error.message);
    } finally {
         if (document.body.contains(loadingIndicator)) {
            document.body.removeChild(loadingIndicator);
        }
    }
}

async function loadSubmittedDbPage() {
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">Submitted Logs</h2>
        <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div class="flex flex-col"><label for="fromDateFilter" class="text-xs text-gray-600 mb-1">From Date</label><input type="date" id="fromDateFilter" class="p-2 border rounded w-full"></div>
                <div class="flex flex-col"><label for="toDateFilter" class="text-xs text-gray-600 mb-1">To Date</label><input type="date" id="toDateFilter" class="p-2 border rounded w-full"></div>
                <div class="flex flex-col"><label for="actionFilter" class="text-xs text-gray-600 mb-1">Action</label><select id="actionFilter" class="p-2 border rounded w-full bg-white"></select></div>
                <div class="flex flex-col"><label for="hinbanFilter" class="text-xs text-gray-600 mb-1">品番</label><input type="text" id="hinbanFilter" class="p-2 border rounded w-full" placeholder="Search..."></div>
                <button onclick="applyFilters()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 w-full h-10">Apply Filters</button>
            </div>
            <div class="flex items-center justify-between mt-4">
                 <div class="flex items-center gap-2 text-sm"><label for="itemsPerPageSelector" class="text-gray-600">Show:</label><select id="itemsPerPageSelector" class="p-1 border rounded bg-white" onchange="changeItemsPerPage(this)"><option value="10">10</option><option value="50" selected>50</option><option value="100">100</option></select><span class="text-gray-600">entries</span></div>
                <div class="flex gap-2"><button onclick="initiateExport('csv')" class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Export CSV</button><button onclick="initiateExport('pdf')" class="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Export PDF</button></div>
            </div>
        </div>
        <div id="submittedTableContainer"></div><div id="paginationContainer"></div>
        <div id="detailsPanelOverlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-30" onclick="hideDetailsPanel()"></div>
        <div id="detailsPanel" class="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl transform translate-x-full transition-transform duration-300 ease-in-out z-40 flex flex-col"><div class="flex items-center justify-between p-4 border-b"><h3 id="detailsPanelTitle" class="text-lg font-semibold"></h3><button onclick="hideDetailsPanel()" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button></div><div id="detailsPanelContent" class="flex-1 overflow-y-auto"></div></div>
        <div id="exportOptionsModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-[60] flex items-center justify-center p-4"><div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm"><h3 class="text-lg font-semibold mb-4">Select Columns to Export</h3><div id="columnSelectionContainer" class="space-y-1 max-h-60 overflow-y-auto mb-6 border p-2 rounded"></div><div class="flex justify-end gap-2"><button onclick="closeExportModal()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300">Cancel</button><button id="confirmExportBtn" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Confirm Export</button></div></div></div>
    `;
    
    const fetchUniqueActions = async () => {
        try {
            // This still uses /queries, but it's a simple aggregation. Could also be moved to a dedicated route.
            const payload = { dbName: currentUser.dbName, collectionName: 'submittedDB', aggregation: [{ $group: { _id: "$Action" } }, { $sort: { _id: 1 } }] };
            const response = await fetch(`${BASE_URL}queries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("Failed to fetch actions");
            const actions = await response.json();
            const select = document.getElementById('actionFilter');
            if (select) {
                select.innerHTML = '<option value="">All Actions</option>';
                actions.forEach(item => { if (item._id) select.innerHTML += `<option value="${item._id}">${item._id}</option>`; });
            }
        } catch (error) {
            console.error("Error populating action filter:", error);
             const select = document.getElementById('actionFilter');
             if(select) select.innerHTML = '<option value="">Error loading actions</option>';
        }
    };

    fetchUniqueActions();
    fetchAndRenderData(); // Initial data load
}