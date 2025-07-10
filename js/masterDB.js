// masterDB.js (for Customer Dashboard)
let customerMasterData = [];

async function loadCustomerMasterDB() {
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const dbName = currentUser?.dbName;
  const mainContent = document.getElementById("mainContent");

  try {
    const res = await fetch(BASE_URL + "customerGetMasterDB", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbName })
    });

    customerMasterData = await res.json();  // ✅ Read once and assign
    renderCustomerMasterTable(customerMasterData);
  } catch (err) {
    console.error("Error loading masterDB:", err);
    mainContent.innerHTML = `<p class='text-red-500'>Failed to load masterDB.</p>`;
  }
}

function renderCustomerMasterTable(data) {
  const tableContainer = document.getElementById("masterTableContainer");

  if (!data.length) {
    tableContainer.innerHTML = `<p>No data found.</p>`;
    return;
  }

  // Dynamically get headers excluding changeHistory
  const headers = Array.from(
    new Set(
      data.flatMap(row => Object.keys(row).filter(k => k !== "_id" && k !== "imageURL" && k !== "changeHistory"))
    )
  );

  // Add Delete Selected button if admin/masterUser
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const showDeleteButton = ["admin", "masterUser"].includes(currentUser.role);

  const tableHTML = `
    <div class="mb-4 flex justify-between items-center">
      <div class="flex gap-2">
        <button id="showMainDataTab" class="px-4 py-2 bg-blue-500 text-white rounded text-sm" onclick="showMasterDBTab('data')">データ一覧</button>
        <button id="showMainHistoryTab" class="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm" onclick="showMasterDBTab('history')">作成履歴</button>
      </div>
      ${showDeleteButton ? `
        <button id="deleteSelectedBtn" onclick="deleteSelectedMasterRecords()" class="bg-red-600 text-white px-3 py-1 rounded text-sm opacity-50 cursor-not-allowed" disabled>
            選択削除 (Delete Selected)
        </button>
      ` : ""}
    </div>

    <div id="dataTabContent">
      <div class="overflow-auto max-h-[70vh]">
        <table class="w-full text-sm border">
          <thead class="bg-gray-100 sticky top-0">
            <tr>
              ${showDeleteButton ? `<th class="px-4 py-2"><input type="checkbox" id="selectAllMasterRows" /></th>` : ""}
              ${headers.map(h => `<th class="px-4 py-2">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => {
              const recordId = row._id?.$oid || row._id;
              return `
                <tr class="border-t hover:bg-gray-50 cursor-pointer">
                  ${showDeleteButton ? `
                    <td class="px-4 py-2">
                      <input type="checkbox" class="rowCheckbox" data-id="${recordId}" onclick="event.stopPropagation()" />
                    </td>
                  ` : ""}
                  ${headers.map(h => `<td class="px-4 py-2" onclick='showCustomerMasterSidebar(${JSON.stringify(row)})'>${row[h] || ""}</td>`).join("")}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div id="historyTabContent" class="hidden">
      <div id="masterHistoryContainer" class="space-y-4">
        <p class="text-gray-500">履歴を読み込み中...</p>
      </div>
    </div>
  `;

  tableContainer.innerHTML = tableHTML;

  // Select All functionality
  const selectAll = document.getElementById("selectAllMasterRows");
  if (selectAll) {
    selectAll.addEventListener("change", (e) => {
      document.querySelectorAll(".rowCheckbox").forEach(cb => {
        cb.checked = e.target.checked;
      });
        toggleDeleteButtonState();
    });
  }

    document.querySelectorAll(".rowCheckbox").forEach(cb => {
    cb.addEventListener("change", toggleDeleteButtonState);
    });
}



function toggleDeleteButtonState() {
  const checkboxes = document.querySelectorAll(".rowCheckbox");
  const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
  const deleteBtn = document.getElementById("deleteSelectedBtn");

  if (deleteBtn) {
    if (anyChecked) {
      deleteBtn.disabled = false;
      deleteBtn.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      deleteBtn.disabled = true;
      deleteBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
  }
}




// customerMasterSidebar.js

function ensureMasterSidebarExists() {
  if (!document.getElementById("masterSidebar")) {
    const sidebarHTML = `
      <div id="masterSidebar" class="fixed top-0 right-0 w-full md:w-[600px] h-full bg-white shadow-lg transform translate-x-full transition-transform duration-300 z-50 p-4 overflow-y-auto max-h-screen">
        <button onclick="closeMasterSidebar()" class="mb-4 text-red-500 font-semibold w-full text-left md:w-auto">Close</button>
        <div id="masterSidebarContent"></div>
      </div>
      <div id="masterSidebarOverlay" class="fixed inset-0 bg-black bg-opacity-30 hidden z-40 md:hidden" onclick="closeMasterSidebar()"></div>
    `;
    document.body.insertAdjacentHTML("beforeend", sidebarHTML);
  }
}

function showInsertCSVForm() {
  const content = `
    <h3 class="text-xl font-bold mb-4">CSV Import to MasterDB</h3>
    <input type="file" id="csvUploadInput" accept=".csv" class="mb-4" />
    <button onclick="handleCSVUpload()" class="bg-blue-500 text-white px-4 py-2 rounded">Upload CSV</button>
  `;
  document.getElementById("mainContent").innerHTML = content;
}

async function handleCSVUpload() {
  const file = document.getElementById("csvUploadInput").files[0];
  if (!file) return alert("ファイルを選択してください");

  const reader = new FileReader();
  reader.onload = async function (e) {
    const sjisArray = new Uint8Array(e.target.result);
    const unicodeArray = Encoding.convert(sjisArray, { to: 'UNICODE', from: 'SJIS', type: 'string' });

    // Parse CSV using PapaParse
    const result = Papa.parse(unicodeArray.trim(), {
      header: true,
      skipEmptyLines: true
    });

    if (!result.data.length) return alert("CSVにデータがありません");

    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const dbName = currentUser.dbName;
    const role = currentUser.role;
    const username = currentUser.username;

    try {
      for (const row of result.data) {
        const res = await fetch(BASE_URL + "customerInsertMasterDBWithHistory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: row, role, dbName, username })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "挿入に失敗しました");
      }

      alert("CSVアップロード完了しました");
      loadCustomerMasterDB();
    } catch (err) {
      console.error(err);
      alert("アップロードに失敗しました");
    }
  };

  // ✅ Read as ArrayBuffer for Encoding.js compatibility
  reader.readAsArrayBuffer(file);
}


function showCustomerMasterSidebar(data) {
  ensureMasterSidebarExists();
  document.getElementById("masterSidebar").classList.remove("translate-x-full");

  // Show overlay on small screens
  const overlay = document.getElementById("masterSidebarOverlay");
  if (window.innerWidth < 768 && overlay) {
    overlay.classList.remove("hidden");
  }

  const container = document.getElementById("masterSidebarContent");
  const sidebar = document.getElementById("masterSidebar");
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const dbName = currentUser.dbName;
  const username = currentUser.username || "unknown";
  const recordId = data._id?.$oid || data._id;
  const fields = Object.keys(data).filter(k => k !== "_id" && k !== "changeHistory");
  
  // Check if user can edit (only admin or masterUser)
  const canEdit = ["admin", "masterUser"].includes(currentUser.role);

  // Store recordId in sidebar content for history loading
  container.dataset.recordId = recordId;

  const imageHTML = data.imageURL
    ? `<img id="masterImagePreview" src="${data.imageURL}" alt="Product Image" class="w-full max-h-64 object-contain rounded shadow mb-2" />`
    : `<p class="text-gray-500 mb-2">No image uploaded.</p>`;

  container.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${data["品番"] ?? "Details"}</h3>
    
    <div class="mb-4 flex gap-2">
      <button id="showSidebarDetailTab" class="px-3 py-1 text-sm bg-blue-500 text-white rounded" onclick="showSidebarTab('detail')">詳細</button>
      <button id="showSidebarHistoryTab" class="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded" onclick="showSidebarTab('history')">変更履歴</button>
    </div>

    <div id="sidebarDetailContent">
      <div class="mb-4">
        <h4 class="text-lg font-semibold">製品画像</h4>
        ${imageHTML}
        ${canEdit ? `
          <div id="imageActionWrapper" class="hidden mt-2">
            <button onclick="document.getElementById('masterImageUploadInput').click()" class="text-blue-600 underline text-sm">
              ${data.imageURL ? "Update Image" : "Upload Image"}
            </button>
            <input type="file" id="masterImageUploadInput" accept="image/*" class="hidden" />
          </div>
        ` : ''}
      </div>

      <div class="space-y-2">
        ${fields.map(f => `
          <div class="flex items-center gap-2">
            <label class="font-medium w-32 shrink-0">${f}</label>
            <input type="text" class="editable-master p-1 border rounded w-full ${canEdit ? 'bg-gray-100' : 'bg-gray-200'}" data-key="${f}" value="${data[f] ?? ""}" disabled />
          </div>
        `).join("")}
      </div>

      ${canEdit ? `
        <div class="mt-4 flex gap-2">
          <button id="editMasterBtn" class="text-blue-600 underline text-sm">Edit</button>
          <button id="saveMasterBtn" class="hidden bg-green-500 text-white px-3 py-1 rounded text-sm">OK</button>
          <button id="cancelMasterBtn" class="hidden bg-gray-300 text-black px-3 py-1 rounded text-sm">Cancel</button>
        </div>
      ` : `
        <div class="mt-4">
          <p class="text-sm text-gray-500 italic">読み取り専用 - 編集権限がありません</p>
        </div>
      `}
    </div>

    <div id="sidebarHistoryContent" class="hidden">
      <div id="changeHistoryContainer" class="space-y-3">
        <p class="text-gray-500">履歴を読み込み中...</p>
      </div>
    </div>
  `;

  sidebar.classList.remove("translate-x-full");

  // Only add edit functionality if user has permission
  if (canEdit) {
    const inputs = () => Array.from(document.querySelectorAll(".editable-master"));

    document.getElementById("editMasterBtn").onclick = () => {
      inputs().forEach(i => i.disabled = false);
      document.getElementById("saveMasterBtn").classList.remove("hidden");
      document.getElementById("cancelMasterBtn").classList.remove("hidden");
      document.getElementById("imageActionWrapper").classList.remove("hidden");
    };

    document.getElementById("cancelMasterBtn").onclick = () => showCustomerMasterSidebar(data);

    document.getElementById("saveMasterBtn").onclick = async () => {
      const updated = {};
      const changes = [];
      
      // Track changes for history
      inputs().forEach(input => {
        const key = input.dataset.key;
        const newValue = input.value.trim();
        const oldValue = data[key] || "";
        
        if (newValue !== oldValue) {
          changes.push({
            field: key,
            oldValue: oldValue,
            newValue: newValue
          });
        }
        updated[key] = newValue;
      });

      // Only proceed if there are actual changes
      if (changes.length === 0) {
        alert("変更がありません。");
        return;
      }

      try {
        const res = await fetch(BASE_URL + "customerUpdateMasterDBWithHistory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            dbName, 
            recordId, 
            updateData: updated, 
            changes: changes,
            role: currentUser.role, 
            username: currentUser.username
          })
        });

        const result = await res.json();
        if (!res.ok || !result.modifiedCount) {
          throw new Error(result.error || "Update failed");
        }

        alert("Updated successfully.");
        closeMasterSidebar();
        loadCustomerMasterDB();
      } catch (error) {
        console.error("Update error:", error);
        alert("更新に失敗しました: " + error.message);
      }
    };

    document.getElementById("masterImageUploadInput").addEventListener("change", async function () {
      const file = this.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(",")[1];
        const oldImageURL = data.imageURL || "";
        
        const res = await fetch(BASE_URL + "customerUploadMasterImageWithHistory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            base64, 
            label: "main", 
            recordId, 
            username: currentUser.username, 
            dbName,
            oldImageURL: oldImageURL
          })
        });

        const result = await res.json();
        if (!res.ok || !result.imageURL) return alert("Image upload failed");

        alert("Image uploaded.");
        data.imageURL = result.imageURL;
        showCustomerMasterSidebar(data);
      };
      reader.readAsDataURL(file);
    });
  }
}

function closeMasterSidebar() {
  const sidebar = document.getElementById("masterSidebar");
  if (sidebar) {
    sidebar.classList.add("translate-x-full");
  }
}

async function deleteSelectedMasterRecords() {
  const checkboxes = Array.from(document.querySelectorAll(".rowCheckbox:checked"));
  if (!checkboxes.length) return alert("削除する項目を選択してください");

  const confirmDelete = confirm(`${checkboxes.length} 件を削除しますか？`);
  if (!confirmDelete) return;

  const recordIds = checkboxes.map(cb => cb.getAttribute("data-id"));

  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");

  try {
    const res = await fetch(BASE_URL + "customerBulkDelete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordIds,
        dbName: currentUser.dbName,
        collectionName: "masterDB",
        role: currentUser.role,
        username: currentUser.username
      })
    });

    const result = await res.json();
    if (!res.ok || !result.deletedCount) throw new Error(result.error || "削除失敗");

    alert("削除完了しました");
    loadCustomerMasterDB();
  } catch (err) {
    console.error("削除エラー:", err);
    alert("削除に失敗しました");
  }
}



function openBlankMasterForm() {
  ensureMasterSidebarExists();
  const sidebar = document.getElementById("masterSidebar");
  const container = document.getElementById("masterSidebarContent");
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const dbName = currentUser.dbName;
  const role = currentUser.role;
  const username = currentUser.username;

  // Dynamically get headers excluding changeHistory
  const headers = Array.from(
    new Set(
      customerMasterData?.flatMap(row =>
        Object.keys(row).filter(k => k !== "_id" && k !== "imageURL" && k !== "changeHistory")
      )
    )
  );

  const fieldInputs = headers.map(key => `
    <div class="flex items-center gap-2">
      <label class="font-medium w-32 shrink-0">${key}</label>
      <input type="text" class="new-master-input p-1 border rounded w-full" data-key="${key}" placeholder="${key}" />
    </div>
  `).join("");

  container.innerHTML = `
    <h3 class="text-xl font-bold mb-4">新規製品登録</h3>

    <div class="mb-4">
      <h4 class="text-lg font-semibold">製品画像</h4>
      <p id="previewText" class="text-gray-500 mb-2">No image selected.</p>
      <img id="newMasterPreview" class="w-full max-h-64 object-contain rounded shadow hidden mb-2" />
      <input type="file" id="newMasterImageInput" accept="image/*" />
    </div>

    <div class="space-y-2">${fieldInputs}</div>

    <div class="mt-4 flex gap-2">
      <button id="submitNewMasterBtn" class="bg-green-600 text-white px-4 py-2 rounded">登録</button>
      <button onclick="closeMasterSidebar()" class="bg-gray-300 text-black px-4 py-2 rounded">キャンセル</button>
    </div>
  `;

  sidebar.classList.remove("translate-x-full");

  // Preview logic
  document.getElementById("newMasterImageInput").addEventListener("change", function () {
    const file = this.files[0];
    const preview = document.getElementById("newMasterPreview");
    const text = document.getElementById("previewText");
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.classList.remove("hidden");
      text.classList.add("hidden");
    } else {
      preview.classList.add("hidden");
      text.classList.remove("hidden");
    }
  });

  // Submit new record
  document.getElementById("submitNewMasterBtn").addEventListener("click", async () => {
    const inputs = document.querySelectorAll(".new-master-input");
    const data = {};
    inputs.forEach(input => {
      data[input.dataset.key] = input.value.trim();
    });

    if (!data["品番"]) return alert("品番は必須です");

    try {
      const res = await fetch(BASE_URL + "customerInsertMasterDBWithHistory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, role, dbName, username })
      });

      const result = await res.json();
      if (!res.ok || !result.insertedId) throw new Error(result.error || "Insert failed");

      // Upload image if selected
      const file = document.getElementById("newMasterImageInput").files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(",")[1];
          await fetch(BASE_URL + "customerUploadMasterImageWithHistory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64,
              label: "main",
              recordId: result.insertedId,
              username,
              dbName,
              oldImageURL: ""
            })
          });
        };
        reader.readAsDataURL(file);
      }

      alert("登録完了しました");
      closeMasterSidebar();
      loadCustomerMasterDB();
    } catch (err) {
      console.error("Insert failed:", err);
      alert("登録に失敗しました");
    }
  });
}

// Tab switching functions for main page
function showMasterDBTab(tabName) {
  const dataTab = document.getElementById('showMainDataTab');
  const historyTab = document.getElementById('showMainHistoryTab');
  const dataContent = document.getElementById('dataTabContent');
  const historyContent = document.getElementById('historyTabContent');

  if (tabName === 'data') {
    dataTab.classList.remove('bg-gray-300', 'text-gray-700');
    dataTab.classList.add('bg-blue-500', 'text-white');
    historyTab.classList.remove('bg-blue-500', 'text-white');
    historyTab.classList.add('bg-gray-300', 'text-gray-700');
    
    dataContent.classList.remove('hidden');
    historyContent.classList.add('hidden');
  } else if (tabName === 'history') {
    historyTab.classList.remove('bg-gray-300', 'text-gray-700');
    historyTab.classList.add('bg-blue-500', 'text-white');
    dataTab.classList.remove('bg-blue-500', 'text-white');
    dataTab.classList.add('bg-gray-300', 'text-gray-700');
    
    dataContent.classList.add('hidden');
    historyContent.classList.remove('hidden');
    
    // Load creation history when switching to history tab
    loadMasterDBCreationHistory();
  }
}

// Function to load creation history for masterDB
async function loadMasterDBCreationHistory() {
  const container = document.getElementById('masterHistoryContainer');
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  
  try {
    const response = await fetch(BASE_URL + "customerGetMasterDBHistory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dbName: currentUser.dbName
      })
    });

    if (!response.ok) {
      throw new Error('Failed to load creation history');
    }

    const history = await response.json();
    renderMasterDBHistoryList(history);
  } catch (error) {
    console.error('Error loading creation history:', error);
    container.innerHTML = '<p class="text-sm text-red-500">作成履歴の読み込みに失敗しました。</p>';
  }
}

// Function to render creation history list
function renderMasterDBHistoryList(history) {
  const container = document.getElementById('masterHistoryContainer');
  
  if (!history || history.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">作成履歴がありません。</p>';
    return;
  }

  const historyHTML = history.map(entry => {
    const date = new Date(entry.timestamp).toLocaleString('ja-JP');
    const recordInfo = entry.recordData || {};
    
    return `
      <div class="border rounded p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-3">
          <div>
            <span class="font-medium text-lg text-gray-800">${recordInfo['品番'] || 'Unknown Product'}</span>
            <div class="text-sm text-gray-600">
              <span class="font-medium">作成者:</span> ${entry.createdBy || 'Unknown'}
            </div>
            <div class="text-xs text-gray-500">${date}</div>
          </div>
          <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">${entry.action || '新規作成'}</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          ${Object.entries(recordInfo)
            .filter(([key, value]) => key !== '_id' && key !== 'imageURL' && key !== 'changeHistory' && value)
            .map(([key, value]) => `
              <div class="flex">
                <span class="font-medium text-gray-700 w-20 flex-shrink-0">${key}:</span>
                <span class="text-gray-600 break-all">${value}</span>
              </div>
            `).join('')}
        </div>
        
        ${recordInfo.imageURL ? `
          <div class="mt-3 pt-3 border-t">
            <img src="${recordInfo.imageURL}" alt="Product Image" class="w-24 h-24 object-cover rounded border" />
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  container.innerHTML = historyHTML;
}

// Tab switching functions for sidebar
function showSidebarTab(tabName) {
  const detailTab = document.getElementById('showSidebarDetailTab');
  const historyTab = document.getElementById('showSidebarHistoryTab');
  const detailContent = document.getElementById('sidebarDetailContent');
  const historyContent = document.getElementById('sidebarHistoryContent');

  if (tabName === 'detail') {
    detailTab.classList.remove('bg-gray-300', 'text-gray-700');
    detailTab.classList.add('bg-blue-500', 'text-white');
    historyTab.classList.remove('bg-blue-500', 'text-white');
    historyTab.classList.add('bg-gray-300', 'text-gray-700');
    
    detailContent.classList.remove('hidden');
    historyContent.classList.add('hidden');
  } else if (tabName === 'history') {
    historyTab.classList.remove('bg-gray-300', 'text-gray-700');
    historyTab.classList.add('bg-blue-500', 'text-white');
    detailTab.classList.remove('bg-blue-500', 'text-white');
    detailTab.classList.add('bg-gray-300', 'text-gray-700');
    
    detailContent.classList.add('hidden');
    historyContent.classList.remove('hidden');
    
    // Load change history when switching to history tab
    loadMasterRecordHistory();
  }
}

// Function to load change history for current record
async function loadMasterRecordHistory() {
  const container = document.getElementById('changeHistoryContainer');
  
  // Get recordId from the current sidebar context
  const sidebarContent = document.getElementById('masterSidebarContent');
  const recordIdFromContext = sidebarContent?.dataset?.recordId;
  
  if (!recordIdFromContext) {
    container.innerHTML = '<p class="text-sm text-red-500">レコードIDが見つかりません。</p>';
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  
  try {
    const response = await fetch(BASE_URL + "customerGetMasterHistory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: recordIdFromContext,
        dbName: currentUser.dbName
      })
    });

    if (!response.ok) {
      throw new Error('Failed to load history');
    }

    const history = await response.json();
    renderChangeHistoryList(history);
  } catch (error) {
    console.error('Error loading history:', error);
    container.innerHTML = '<p class="text-sm text-red-500">履歴の読み込みに失敗しました。</p>';
  }
}

// Function to render change history list (for sidebar)
function renderChangeHistoryList(history) {
  const container = document.getElementById('changeHistoryContainer');
  
  if (!history || history.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">変更履歴がありません。</p>';
    return;
  }

  const historyHTML = history.map(entry => {
    const date = new Date(entry.timestamp).toLocaleString('ja-JP');
    const changes = entry.changes || [];
    
    return `
      <div class="border rounded p-3 bg-gray-50">
        <div class="flex justify-between items-start mb-2">
          <div>
            <span class="font-medium text-sm">${entry.changedBy || 'Unknown'}</span>
            <span class="text-xs text-gray-500 ml-2">${date}</span>
          </div>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${entry.action || '更新'}</span>
        </div>
        
        ${changes.length > 0 ? `
          <div class="text-xs space-y-1">
            ${changes.map(change => `
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-700">${change.field}:</span>
                <span class="text-red-600">${change.oldValue || '(空)'}</span>
                <span class="text-gray-400">→</span>
                <span class="text-green-600">${change.newValue || '(空)'}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <p class="text-xs text-gray-500">${entry.description || '変更の詳細は記録されていません。'}</p>
        `}
      </div>
    `;
  }).join('');
  
  container.innerHTML = historyHTML;
}