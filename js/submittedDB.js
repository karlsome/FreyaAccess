// js/submittedDB.js

// --- State Management for the Submitted DB Page ---
let totalRecords = 0;
let currentPage = 1;
let itemsPerPage = 50;
let currentSort = { column: '日付', direction: 'desc' }; // Default sort by Japanese key
let currentFilters = {};
let selectedRows = new Set();

let discoveredTableHeaders = []; 
let exportColumnSelection = {};

/**
 * Dynamically discovers headers from all data records and sets a preferred order.
 * Also initializes exportColumnSelection.
 */
function initializeTableHeaders(records) {
    if (!records || records.length === 0) return;

    // Collect all unique keys from all records
    const allKeysSet = new Set();
    records.forEach(record => {
        Object.keys(record).forEach(key => {
            if (key !== '_id') {
                allKeysSet.add(key);
            }
        });
    });
    
    const allKeys = Array.from(allKeysSet);

    const preferredHeaderOrder = [
        '日付', '時間', 'デバイス名', 'ユニークID', '品番', 
        'QR1ステータス', 'QR2ステータス', 'QR3ステータス', 
        'データ送信ステータス', 'アクション', 'コメント', '職長', '班長'
    ];

    discoveredTableHeaders = [];
    const addedKeys = new Set();

    preferredHeaderOrder.forEach(key => {
        if (allKeys.includes(key)) {
            discoveredTableHeaders.push({ key: key, label: key }); 
            addedKeys.add(key);
        }
    });

    allKeys.forEach(key => {
        if (!addedKeys.has(key)) {
            discoveredTableHeaders.push({ key: key, label: key });
        }
    });

    exportColumnSelection = {};
    discoveredTableHeaders.forEach(h => exportColumnSelection[h.key] = true);
    console.log("Discovered/Updated table headers:", discoveredTableHeaders);
}


/**
 * Main function to fetch data and re-render.
 */
async function fetchAndRenderData(resetPage = false) {
    if (resetPage) currentPage = 1;
    const tableContainer = document.getElementById("submittedTableContainer");
    tableContainer.innerHTML = `<div class="text-center text-gray-500 py-4">${t("loadingData")}</div>`;

    const mongoSortObject = { [currentSort.column]: currentSort.direction === 'asc' ? 1 : -1 };
    
    if (currentSort.column !== '時間' && discoveredTableHeaders.some(h => h.key === '時間')) {
        mongoSortObject['時間'] = (currentSort.column === '日付' && currentSort.direction === 'desc') ? -1 : 1; 
    } else if (currentSort.column === '時間' && discoveredTableHeaders.some(h => h.key === '日付')) {
         mongoSortObject['日付'] = -1; // If primary sort is time, secondary is newest date
    }


    const payload = {
        dbName: currentUser.dbName,
        filters: currentFilters,
        sort: mongoSortObject,
        limit: itemsPerPage,
        skip: (currentPage - 1) * itemsPerPage,
        getTotalCount: true
    };

    try {
        const response = await fetch(`${BASE_URL}fetchCustomerSubmittedLogs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`サーバーエラー: ${response.statusText}`);
        const result = await response.json();
        
        const records = result.data || [];
        totalRecords = result.totalCount || 0;

        if (records.length > 0) {
            initializeTableHeaders(records);
        }

        renderTable(records);
        renderPagination();
        selectedRows.clear();
        updateCheckAllCheckboxState();

    } catch (error) {
        console.error('送信済みデータの取得に失敗しました:', error);
        tableContainer.innerHTML = `<div class="text-center text-red-500 py-4">${t("dataLoadError")}: ${error.message}</div>`;
    }
}

function renderTable(data) {
    const tableContainer = document.getElementById("submittedTableContainer");
    
    if (discoveredTableHeaders.length === 0) {
        if (data.length > 0) { // Data arrived but headers not init (should not happen often)
            initializeTableHeaders(data[0]);
        } else { // No data and no headers discovered yet
            const initialMessage = (currentPage === 1 && Object.keys(currentFilters).length === 0) ?
                "送信済みログはありません。設定を確認するか、データがロードされるのをお待ちください。" :
                "条件に一致するログはありません。";
            tableContainer.innerHTML = `<div class="text-center text-gray-500 py-4">${initialMessage}</div>`;
            return;
        }
    }

    let headerHtml = '<tr>';
    headerHtml += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
        <input type="checkbox" id="checkAllRows" onchange="toggleCheckAll(this)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
    </th>`;
    headerHtml += `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">#</th>`;
    
    discoveredTableHeaders.forEach(header => {
        const sortIcon = currentSort.column === header.key ? 
            (currentSort.direction === 'asc' ? '<i class="ri-arrow-up-line ml-1"></i>' : '<i class="ri-arrow-down-line ml-1"></i>') : 
            '<i class="ri-arrow-up-down-line ml-1 opacity-0 group-hover:opacity-50"></i>';
        headerHtml += `<th class="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors" onclick="handleSort('${header.key}')">
            <div class="flex items-center">
                ${header.label} 
                ${sortIcon}
            </div>
        </th>`;
    });
    headerHtml += '</tr>';

    let bodyHtml = '';
    data.forEach((row, index) => {
        const rowNumberOnPage = index + 1; 
        const isChecked = selectedRows.has(row._id); 
        bodyHtml += `<tr class="hover:bg-gray-50 transition-colors">`;
        bodyHtml += `<td class="px-6 py-4 whitespace-nowrap text-center">
            <input type="checkbox" class="row-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-id="${row._id}" onchange="toggleRowSelection(this)" ${isChecked ? 'checked' : ''}>
        </td>`;
        bodyHtml += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">${rowNumberOnPage}</td>`;
        discoveredTableHeaders.forEach(header => {
            const cellValue = row[header.key] || '';
            const cellClass = getStatusClass(header.key, cellValue);
            bodyHtml += `<td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm cursor-pointer hover:text-blue-600 transition-colors ${cellClass}" onclick='showDetailsPanel(${JSON.stringify(row)})'>
                    ${cellValue}
                </div>
            </td>`;
        });
        bodyHtml += `</tr>`;
    });
    
    const noDataMessage = (currentPage === 1 && Object.keys(currentFilters).length === 0) ? 
        "送信済みログはありません。" : "条件に一致するログはありません。";

    if (data.length === 0) {
        tableContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <i class="ri-inbox-line text-3xl text-gray-400"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">${t("noData")}</h3>
                <p class="text-gray-500">${noDataMessage}</p>
            </div>`;
    } else {
        tableContainer.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        ${headerHtml}
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${bodyHtml}
                    </tbody>
                </table>
            </div>`;
    }
}

function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    let startRecord = totalRecords > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    let endRecord = Math.min(currentPage * itemsPerPage, totalRecords);
    let summary = `全 ${totalRecords} 件中 ${startRecord} - ${endRecord} 件を表示`;
    if (totalRecords === 0) summary = "結果がありません。";
    
    let paginationHtml = `
        <div class="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200 rounded-b-xl">
            <div class="flex-1 flex justify-between sm:hidden">
                <button class="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                    前へ
                </button>
                <button class="ml-3 relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                    次へ
                </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        ${summary}
                    </p>
                </div>
                <div>
                    <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">`;
    
    if (totalPages > 1) {
        // Previous button
        paginationHtml += `
            <button class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="ri-arrow-left-s-line"></i>
            </button>`;
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            paginationHtml += `
                <button class="relative inline-flex items-center px-4 py-2 border text-sm font-medium ${isActive ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}" onclick="changePage(${i})">
                    ${i}
                </button>`;
        }
        
        // Next button
        paginationHtml += `
            <button class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="ri-arrow-right-s-line"></i>
            </button>`;
    }
    
    paginationHtml += `
                    </nav>
                </div>
            </div>
        </div>`;
    
    paginationContainer.innerHTML = paginationHtml;
}

function changePage(page) {
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    if (page < 1 && totalRecords > 0) page = 1; // Don't go below page 1 if records exist
    if (page > totalPages && totalPages > 0) page = totalPages; // Don't go beyond last page
    if (page < 1 && totalRecords === 0) page = 1; // Allow page 1 if no records

    currentPage = page;
    fetchAndRenderData();
}

function handleSort(columnKey) { 
    if (currentSort.column === columnKey) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = columnKey;
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
        currentFilters['日付'] = {}; 
        if (fromDate) currentFilters['日付'].$gte = fromDate;
        if (toDate) currentFilters['日付'].$lte = toDate;
    }
    if (action) currentFilters['アクション'] = action; 
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
    document.getElementById('detailsPanelTitle').textContent = record['品番'] || t('details'); 
    
    let contentHtml = '';
    const preferredOrder = ['品番', '日付', '時間', 'アクション', 'デバイス名', 'ユニークID', 'コメント', '職長', '班長', 'QR1ステータス', 'QR2ステータス', 'QR3ステータス', 'データ送信ステータス'];
    const displayedKeys = new Set();

    const createRowHTML = (key, value) => {
        const displayValue = value === undefined || value === null ? '-' : value;
        const valueClass = getStatusClass(key, displayValue);
        return `
            <div class="py-4 border-b border-gray-100 last:border-b-0">
                <dt class="text-sm font-medium text-gray-500 mb-1">${key}</dt>
                <dd class="text-sm ${valueClass} break-words">${displayValue}</dd>
            </div>`;
    };
    
    contentHtml = '<dl class="space-y-0">';
    
    preferredOrder.forEach(key => { 
        if (record.hasOwnProperty(key)) {
            contentHtml += createRowHTML(key, record[key]); 
            displayedKeys.add(key);
        }
    });
    
    for (const key in record) { 
        if (key !== '_id' && !displayedKeys.has(key) && record.hasOwnProperty(key)) {
            contentHtml += createRowHTML(key, record[key]); 
        }
    }
    
    contentHtml += '</dl>';
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
    if (discoveredTableHeaders.length === 0) {
        alert(t("headersNotLoaded"));
        return;
    }
    discoveredTableHeaders.forEach(h => {
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
    const selectedExportKeys = Object.keys(exportColumnSelection).filter(key => exportColumnSelection[key] && discoveredTableHeaders.some(h => h.key === key));
    if (selectedExportKeys.length === 0) { alert(t("selectColumns")); return; }

    let idsToFetchArray = [];
    let fetchAllFiltered = false;

    if (selectedRows.size > 0) idsToFetchArray = Array.from(selectedRows);
    else fetchAllFiltered = true; 

    const mongoSortObject = { [currentSort.column]: currentSort.direction === 'asc' ? 1 : -1 };
    if (currentSort.column !== '時間' && discoveredTableHeaders.some(h => h.key === '時間')) mongoSortObject['時間'] = (currentSort.column === '日付' && currentSort.direction === 'desc') ? -1 : 1; 
    else if (currentSort.column === '時間' && discoveredTableHeaders.some(h => h.key === '日付')) mongoSortObject['日付'] = -1;

    const payload = { 
        dbName: currentUser.dbName, 
        filters: fetchAllFiltered ? currentFilters : {}, 
        idsToFetch: idsToFetchArray, 
        sort: mongoSortObject,
        limit: 0, 
        skip: 0,
        getTotalCount: false 
    };
    
    const loadingIndicator = document.createElement('div'); 
    loadingIndicator.textContent = t("csvExportPrep");
    loadingIndicator.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-lg z-[100]'; 
    document.body.appendChild(loadingIndicator);

    try {
        const response = await fetch(`${BASE_URL}fetchCustomerSubmittedLogs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`エクスポートのためのサーバーエラー: ${response.statusText}`);
        const dataToExport = await response.json(); 
        if (!Array.isArray(dataToExport)) throw new Error("エクスポートデータは配列ではありません。");

        const headersForCsv = selectedExportKeys.map(key => discoveredTableHeaders.find(h => h.key === key)?.label || key);
        const dataForCsv = dataToExport.map(row => {
            return selectedExportKeys.map(key => row[key] === undefined || row[key] === null ? '' : row[key]);
        });

        const csv = Papa.unparse({ fields: headersForCsv, data: dataForCsv });
        const uin8array = new TextEncoder('sjis', { NONSTANDARD_allowLegacyEncoding: true }).encode(csv);
        const blob = new Blob([uin8array], { type: 'text/csv;charset=shift_jis;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `送信済みログ_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href); 
    } catch(error) { 
        console.error("CSVエクスポート中のエラー:", error);
        alert(t("csvExportFailed") + ": " + error.message);
    } finally { 
        if (document.body.contains(loadingIndicator)) {
            document.body.removeChild(loadingIndicator);
        }
    }
}

async function executeExportPdf() {
    const selectedExportKeys = Object.keys(exportColumnSelection).filter(key => exportColumnSelection[key] && discoveredTableHeaders.some(h => h.key === key));
    if (selectedExportKeys.length === 0) { alert(t("selectColumns")); return; }
    
    let idsToFetchArray = [];
    let fetchAllFiltered = false;

    if (selectedRows.size > 0) idsToFetchArray = Array.from(selectedRows);
    else fetchAllFiltered = true;

    const mongoSortObject = { [currentSort.column]: currentSort.direction === 'asc' ? 1 : -1 };
     if (currentSort.column !== '時間' && discoveredTableHeaders.some(h => h.key === '時間')) mongoSortObject['時間'] = (currentSort.column === '日付' && currentSort.direction === 'desc') ? -1 : 1; 
    else if (currentSort.column === '時間' && discoveredTableHeaders.some(h => h.key === '日付')) mongoSortObject['日付'] = -1;


    const payload = { 
        dbName: currentUser.dbName, 
        filters: fetchAllFiltered ? currentFilters : {},
        idsToFetch: idsToFetchArray,
        sort: mongoSortObject,
        limit: 0, 
        skip: 0,
        getTotalCount: false
    };
    
    const loadingIndicator = document.createElement('div'); 
    loadingIndicator.textContent = t("pdfExportPrep");
    loadingIndicator.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-lg z-[100]';
    document.body.appendChild(loadingIndicator);

    try {
        const response = await fetch(`${BASE_URL}fetchCustomerSubmittedLogs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`エクスポートのためのサーバーエラー: ${response.statusText}`);
        const dataToExport = await response.json();
        if (!Array.isArray(dataToExport)) throw new Error("エクスポートデータは配列ではありません。");

        const headersForPdf = selectedExportKeys.map(key => discoveredTableHeaders.find(h => h.key === key)?.label || key);
        const bodyForPdf = dataToExport.map(row => selectedExportKeys.map(key => row[key] === undefined || row[key] === null ? '' : String(row[key])));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: selectedExportKeys.length > 6 ? 'landscape' : 'portrait' }); // Adjusted for more columns in landscape
        
        try {
            if (typeof notoSansJPRegularBase64 === 'undefined' || (typeof notoSansJPRegularBase64 === 'string' && notoSansJPRegularBase64.startsWith("YOUR_"))) {
                 throw new Error("Noto Sans JP Regularフォントのbase64文字列が埋め込まれていないか、利用できません。");
            }
            doc.addFileToVFS('NotoSansJP-Regular.ttf', notoSansJPRegularBase64);
            doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');

            if (typeof notoSansJPBoldBase64 !== 'undefined' && (typeof notoSansJPBoldBase64 === 'string' && !notoSansJPBoldBase64.startsWith("YOUR_"))) {
               doc.addFileToVFS('NotoSansJP-Bold.ttf', notoSansJPBoldBase64);
               doc.addFont('NotoSansJP-Bold.ttf', 'NotoSansJP', 'bold');
            } else {
               console.warn("Noto Sans JP Boldフォントが埋め込まれていないか、利用できません。太字スタイルが正しく表示されない可能性があります。");
            }
            doc.setFont('NotoSansJP');
            console.log("Noto Sans JPフォントがPDF用に登録されました。");
        } catch (fontError) {
            console.error("Noto Sans JPフォントのPDFへの登録に失敗しました:", fontError);
            alert(t("fontLoadFailed"));
        }
        
        doc.autoTable({
            head: [headersForPdf], body: bodyForPdf,
            styles: { font: "NotoSansJP", fontStyle: 'normal', fontSize: selectedExportKeys.length > 6 ? 7 : 8 }, // Smaller font for more columns
            headStyles: { font: "NotoSansJP", fontStyle: 'bold', fontSize: selectedExportKeys.length > 6 ? 8 : 9 },
            margin: { top: 15 },
            didDrawPage: function (data) {
                doc.setFontSize(12);
                doc.text("送信済みログ", data.settings.margin.left, 10);
            }
        });
        doc.save(`送信済みログ_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(error) { 
        console.error("PDFエクスポート中のエラー:", error);
        alert(t("pdfExportFailed") + ": " + error.message);
    } finally { 
         if (document.body.contains(loadingIndicator)) {
            document.body.removeChild(loadingIndicator);
        }
    }
}

async function loadSubmittedDbPage() {
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `
        <div class="space-y-6">
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">${t("submittedLog")}</h1>
                    <p class="text-gray-600 mt-1">データ送信履歴とログを確認できます</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="initiateExport('csv')" class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                        <i class="ri-file-excel-2-line mr-2"></i>
                        ${t("csvExport")}
                    </button>
                    <button onclick="initiateExport('pdf')" class="inline-flex items-center px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm">
                        <i class="ri-file-pdf-line mr-2"></i>
                        ${t("pdfExport")}
                    </button>
                </div>
            </div>

            <!-- Filter Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="flex items-center gap-2 mb-4">
                    <i class="ri-filter-3-line text-lg text-gray-600"></i>
                    <h3 class="text-lg font-semibold text-gray-900">${t("filters")}</h3>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <!-- Date Range -->
                    <div class="space-y-1">
                        <label for="fromDateFilter" class="block text-sm font-medium text-gray-700">${t("startDate")}</label>
                        <input type="date" id="fromDateFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                    </div>
                    <div class="space-y-1">
                        <label for="toDateFilter" class="block text-sm font-medium text-gray-700">${t("endDate")}</label>
                        <input type="date" id="toDateFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                    </div>
                    
                    <!-- Action Filter -->
                    <div class="space-y-1">
                        <label for="actionFilter" class="block text-sm font-medium text-gray-700">${t("action")}</label>
                        <select id="actionFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors">
                            <option value="">${t("allActions")}</option>
                        </select>
                    </div>
                    
                    <!-- Product Number Search -->
                    <div class="space-y-1">
                        <label for="hinbanFilter" class="block text-sm font-medium text-gray-700">${t("productNumber")}</label>
                        <div class="relative">
                            <input type="text" id="hinbanFilter" class="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="${t("searchPlaceholder")}">
                            <i class="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <button onclick="applyFilters()" class="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <i class="ri-filter-line mr-2"></i>
                        ${t("applyFilter")}
                    </button>
                    
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                        <label for="itemsPerPageSelector" class="font-medium">${t("itemsPerPage")}:</label>
                        <select id="itemsPerPageSelector" class="px-3 py-1 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="changeItemsPerPage(this)">
                            <option value="10">10</option>
                            <option value="50" selected>50</option>
                            <option value="100">100</option>
                        </select>
                        <span>${t("items")}</span>
                    </div>
                </div>
            </div>

            <!-- Data Table Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 class="text-lg font-semibold text-gray-900">${t("dataList")}</h3>
                </div>
                <div id="submittedTableContainer" class="overflow-x-auto">
                    <!-- Table content will be loaded here -->
                </div>
            </div>

            <!-- Pagination -->
            <div id="paginationContainer" class="flex justify-center">
                <!-- Pagination will be loaded here -->
            </div>
        </div>

        <!-- Details Panel -->
        <div id="detailsPanelOverlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-30" onclick="hideDetailsPanel()"></div>
        <div id="detailsPanel" class="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl transform translate-x-full transition-transform duration-300 ease-in-out z-40 flex flex-col">
            <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <h3 id="detailsPanelTitle" class="text-xl font-semibold text-gray-900"></h3>
                <button onclick="hideDetailsPanel()" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>
            <div id="detailsPanelContent" class="flex-1 overflow-y-auto p-6">
                <!-- Detail content will be loaded here -->
            </div>
        </div>

        <!-- Export Options Modal -->
        <div id="exportOptionsModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-[60] flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold text-gray-900">${t("selectColumnsToExport")}</h3>
                    <button onclick="closeExportModal()" class="p-1 text-gray-400 hover:text-gray-600 rounded">
                        <i class="ri-close-line text-lg"></i>
                    </button>
                </div>
                <div id="columnSelectionContainer" class="space-y-2 max-h-60 overflow-y-auto mb-6 border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <!-- Column checkboxes will be loaded here -->
                </div>
                <div class="flex justify-end gap-3">
                    <button onclick="closeExportModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        ${t("cancel")}
                    </button>
                    <button id="confirmExportBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        ${t("executeExport")}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const fetchUniqueActions = async () => {
        try {
            const payload = { dbName: currentUser.dbName, collectionName: 'submittedDB', aggregation: [{ $group: { _id: "$アクション" } }, { $sort: { _id: 1 } }] };
            const response = await fetch(`${BASE_URL}queries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("アクションの取得に失敗しました");
            const actions = await response.json();
            const select = document.getElementById('actionFilter');
            if (select) {
                select.innerHTML = `<option value="">${t("allActions")}</option>`;
                actions.forEach(item => { if (item._id) select.innerHTML += `<option value="${item._id}">${item._id}</option>`; });
            }
        } catch (error) { 
            console.error("アクションフィルターの読み込みエラー:", error);
             const select = document.getElementById('actionFilter');
             if(select) select.innerHTML = '<option value="">アクション読み込みエラー</option>';
        }
    };

    async function initializePage() {
        // Ensure headers are discovered before first data render if possible
        if (discoveredTableHeaders.length === 0) {
            const headerDiscoveryPayload = {
                dbName: currentUser.dbName, filters: {}, sort: { '日付': -1, '時間': -1 },
                limit: 1, skip: 0, getTotalCount: false
            };
            try {
                const resp = await fetch(`${BASE_URL}fetchCustomerSubmittedLogs`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(headerDiscoveryPayload)
                });
                if (resp.ok) {
                    const sampleDataArray = await resp.json(); // Server now returns array directly
                    if (sampleDataArray && sampleDataArray.length > 0) {
                        initializeTableHeaders(sampleDataArray[0]);
                    } else { // No data at all in the collection
                         discoveredTableHeaders = []; // Keep it empty
                         exportColumnSelection = {};
                         console.warn("データベースにレコードがありません。ヘッダーを検出できませんでした。");
                    }
                } else { throw new Error("ヘッダー検出クエリ失敗"); }
            } catch (err) {
                console.error("ヘッダー検出中のエラー:", err);
                // Minimal fallback if header discovery fails completely
                discoveredTableHeaders = [{key: '情報', label: '情報'}]; 
                exportColumnSelection = { '情報': true };
            }
        }
        await fetchUniqueActions();
        await fetchAndRenderData(); 
    }

    initializePage();
}

// Helper function to apply status-based styling
function getStatusClass(columnKey, value) {
    if (!value) return 'text-gray-500';
    
    // Style based on column type and value
    if (columnKey === 'アクション') {
        return 'text-blue-700 font-medium';
    }
    
    // Style based on specific values
    const lowerValue = value.toString().toLowerCase();
    if (lowerValue === 'ok' || lowerValue === '成功') {
        return 'text-green-700 font-medium';
    } else if (lowerValue === 'ng' || lowerValue === 'error' || lowerValue === 'エラー') {
        return 'text-red-700 font-medium';
    } else if (lowerValue.includes('success') || lowerValue.includes('完了')) {
        return 'text-green-600';
    } else if (lowerValue.includes('warning') || lowerValue.includes('注意')) {
        return 'text-yellow-600';
    }
    
    return 'text-gray-900';
}