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
    mainContent.innerHTML = `<p class='text-red-500'>${t("failedToLoadMasterDB")}</p>`;
  }
}

function renderCustomerMasterTable(data) {
  const tableContainer = document.getElementById("masterTableContainer");

  if (!data.length) {
    tableContainer.innerHTML = `<p>${t("noDataFound")}</p>`;
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
    <!-- Tab Navigation -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex gap-3">
          <button id="showMainDataTab" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm" onclick="showMasterDBTab('data')">
            <i class="ri-table-line mr-2"></i>
            ${t("dataList")}
          </button>
          <button id="showMainHistoryTab" class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" onclick="showMasterDBTab('history')">
            <i class="ri-history-line mr-2"></i>
            ${t("creationDeletionHistory")}
          </button>
        </div>
        ${showDeleteButton ? `
          <button id="deleteSelectedBtn" onclick="deleteSelectedMasterRecords()" class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm opacity-50 cursor-not-allowed" disabled>
            <i class="ri-delete-bin-line mr-2"></i>
            ${t("deleteSelected")}
          </button>
        ` : ""}
      </div>

      <!-- Data Tab Content -->
      <div id="dataTabContent" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                ${showDeleteButton ? `
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input type="checkbox" id="selectAllMasterRows" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                ` : ""}
                ${headers.map(h => `
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ${h}
                  </th>
                `).join("")}
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${data.map(row => {
                const recordId = row._id?.$oid || row._id;
                return `
                  <tr class="hover:bg-gray-50 transition-colors cursor-pointer" onclick='showCustomerMasterSidebar(${JSON.stringify(row)})'>
                    ${showDeleteButton ? `
                      <td class="px-6 py-4 whitespace-nowrap text-center" onclick="event.stopPropagation()">
                        <input type="checkbox" class="rowCheckbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-id="${recordId}" />
                      </td>
                    ` : ""}
                    ${headers.map(h => `
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${row[h] || ""}
                      </td>
                    `).join("")}
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- History Tab Content -->
      <div id="historyTabContent" class="hidden p-6">
        <!-- Search and Filter Controls -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">${t("searchHistory")}</label>
              <input type="text" id="historySearchInput" placeholder="${t("searchHistory")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">${t("filterByAction")}</label>
              <select id="historyActionFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                <option value="">${t("allActions")}</option>
                <option value="creation">${t("creation")}</option>
                <option value="deletion">${t("deletion")}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700">${t("filterByUser")}</label>
              <select id="historyUserFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                <option value="">${t("allUsers")}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Pagination Info and Controls -->
        <div class="flex justify-between items-center mb-4">
          <div class="text-sm text-gray-600">
            <span id="historyResultsInfo">${t("loadingHistory")}</span>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm text-gray-600">${t("itemsPerPage")}:</label>
            <select id="historyItemsPerPage" class="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="10">10</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <!-- History List Container -->
        <div id="masterHistoryContainer" class="space-y-4">
          <div class="text-center py-8">
            <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i class="ri-history-line text-2xl text-gray-400"></i>
            </div>
            <p class="text-gray-500">${t("loadingHistory")}</p>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div id="historyPaginationContainer" class="mt-6 flex justify-center">
          <!-- Pagination will be inserted here -->
        </div>
      </div>
    </div>
  `;

  tableContainer.innerHTML = tableHTML;

  // Ensure both search inputs are in correct state (enabled for data tab by default)
  const topSearchInput = document.getElementById('searchInput');
  const masterSearchInput = document.getElementById('masterSearchInput');
  
  if (topSearchInput) {
    topSearchInput.disabled = false;
    topSearchInput.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
    topSearchInput.classList.add('bg-white', 'text-gray-900');
    topSearchInput.placeholder = t('searchPlaceholder');
  }
  if (masterSearchInput) {
    masterSearchInput.disabled = false;
    masterSearchInput.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
    masterSearchInput.classList.add('bg-white', 'text-gray-900');
    masterSearchInput.placeholder = t('searchPlaceholder');
  }

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
      <div id="masterSidebar" class="fixed top-0 right-0 w-full md:w-[600px] h-full bg-white shadow-xl transform translate-x-full transition-transform duration-300 z-50 flex flex-col">
        <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <h3 class="text-xl font-semibold text-gray-900">製品詳細</h3>
          <button onclick="closeMasterSidebar()" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>
        <div id="masterSidebarContent" class="flex-1 overflow-y-auto"></div>
      </div>
      <div id="masterSidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40" onclick="closeMasterSidebar()"></div>
    `;
    document.body.insertAdjacentHTML("beforeend", sidebarHTML);
  }
}

function showInsertCSVForm() {
  const content = `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">${t("csvImportTitle")}</h1>
          <p class="text-gray-600 mt-1">CSVファイルから一括でデータを登録</p>
        </div>
        <button onclick="loadCustomerMasterDB()" class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
          <i class="ri-arrow-left-line mr-2"></i>
          戻る
        </button>
      </div>

      <!-- CSV Upload Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex items-center gap-2 mb-4">
          <i class="ri-file-upload-line text-lg text-blue-600"></i>
          <h3 class="text-xl font-semibold text-gray-900">ファイルアップロード</h3>
        </div>
        
        <div class="space-y-4">
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <div class="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <i class="ri-file-excel-2-line text-2xl text-blue-600"></i>
            </div>
            <h4 class="text-lg font-medium text-gray-900 mb-2">CSVファイルを選択</h4>
            <p class="text-gray-500 mb-4">ファイルをドラッグ&ドロップするか、クリックして選択してください</p>
            <input type="file" id="csvUploadInput" accept=".csv" class="hidden" />
            <button onclick="document.getElementById('csvUploadInput').click()" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <i class="ri-folder-open-line mr-2"></i>
              ファイル選択
            </button>
          </div>
          
          <div class="flex justify-center">
            <button onclick="handleCSVUpload()" class="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
              <i class="ri-upload-line mr-2"></i>
              ${t("uploadCSV")}
            </button>
          </div>
        </div>
      </div>
    </div>
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

  // Show overlay on all screen sizes
  const overlay = document.getElementById("masterSidebarOverlay");
  if (overlay) {
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
    : `<p class="text-gray-500 mb-2">${t("noImageUploaded")}</p>`;

  container.innerHTML = `
    <div class="p-6">
      <!-- Tab Navigation -->
      <div class="flex gap-2 mb-6">
        <button id="showSidebarDetailTab" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onclick="showSidebarTab('detail')">
          <i class="ri-information-line mr-2"></i>
          ${t("details")}
        </button>
        <button id="showSidebarHistoryTab" class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" onclick="showSidebarTab('history')">
          <i class="ri-history-line mr-2"></i>
          ${t("changeHistory")}
        </button>
      </div>

      <!-- Detail Content -->
      <div id="sidebarDetailContent">
        <!-- Product Image Section -->
        <div class="mb-6">
          <h4 class="text-lg font-semibold text-gray-900 mb-3">${t("productImage")}</h4>
          <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
            ${imageHTML}
            ${canEdit ? `
              <div id="imageActionWrapper" class="hidden mt-3">
                <button onclick="document.getElementById('masterImageUploadInput').click()" class="inline-flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <i class="ri-image-add-line mr-2"></i>
                  ${data.imageURL ? t("updateImage") : t("uploadImage")}
                </button>
                <input type="file" id="masterImageUploadInput" accept="image/*" class="hidden" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Product Details -->
        <div class="space-y-4">
          <h4 class="text-lg font-semibold text-gray-900">製品情報</h4>
          ${fields.map(f => `
            <div class="grid grid-cols-3 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0">
              <label class="text-sm font-medium text-gray-700">${f}</label>
              <div class="col-span-2">
                <input type="text" class="editable-master w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${canEdit ? 'bg-white' : 'bg-gray-50'}" data-key="${f}" value="${data[f] ?? ""}" disabled />
              </div>
            </div>
          `).join("")}
        </div>

        <!-- Action Buttons -->
        ${canEdit ? `
          <div class="mt-6 flex gap-3 pt-4 border-t border-gray-200">
            <button id="editMasterBtn" class="inline-flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <i class="ri-edit-line mr-2"></i>
              ${t("edit")}
            </button>
            <button id="saveMasterBtn" class="hidden inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <i class="ri-check-line mr-2"></i>
              ${t("ok")}
            </button>
            <button id="cancelMasterBtn" class="hidden inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <i class="ri-close-line mr-2"></i>
              ${t("cancel")}
            </button>
          </div>
        ` : `
          <div class="mt-6 pt-4 border-t border-gray-200">
            <div class="flex items-center text-sm text-gray-500">
              <i class="ri-lock-line mr-2"></i>
              ${t("readOnly")}
            </div>
          </div>
        `}
      </div>

      <!-- History Content -->
      <div id="sidebarHistoryContent" class="hidden">
        <div id="changeHistoryContainer" class="space-y-4">
          <div class="text-center py-8">
            <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i class="ri-history-line text-2xl text-gray-400"></i>
            </div>
            <p class="text-gray-500">${t("loadingHistory")}</p>
          </div>
        </div>
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
  const overlay = document.getElementById("masterSidebarOverlay");
  
  if (sidebar) {
    sidebar.classList.add("translate-x-full");
  }
  
  if (overlay) {
    overlay.classList.add("hidden");
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
    // First, get the records to be deleted so we can log their data
    const recordsToDelete = customerMasterData.filter(record => 
      recordIds.includes(record._id?.$oid || record._id)
    );

    const res = await fetch(BASE_URL + "customerBulkDeleteWithHistory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordIds,
        recordsData: recordsToDelete,
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

  container.innerHTML = `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <i class="ri-add-line text-xl text-emerald-600"></i>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-900">${t("newRegistration")}</h3>
          <p class="text-sm text-gray-500">${t("registerNewProduct")}</p>
        </div>
      </div>

      <!-- Product Image Section -->
      <div class="mb-6">
        <h4 class="text-lg font-semibold text-gray-900 mb-3">${t("productImage")}</h4>
        <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p id="previewText" class="text-gray-500 mb-2">${t("noImageSelected")}</p>
          <img id="newMasterPreview" class="w-full max-h-64 object-contain rounded shadow hidden mb-2" />
          <button onclick="document.getElementById('newMasterImageInput').click()" class="inline-flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <i class="ri-image-add-line mr-2"></i>
            ${t("selectImage")}
          </button>
          <input type="file" id="newMasterImageInput" accept="image/*" class="hidden" />
        </div>
      </div>

      <!-- Product Information -->
      <div class="space-y-4 mb-6">
        <h4 class="text-lg font-semibold text-gray-900">${t("productInformation")}</h4>
        ${headers.map(key => `
          <div class="grid grid-cols-3 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0">
            <label class="text-sm font-medium text-gray-700">${key}</label>
            <div class="col-span-2">
              <input type="text" class="new-master-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" data-key="${key}" placeholder="${t("enter")} ${key}" />
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-4 border-t border-gray-200">
        <button id="submitNewMasterBtn" class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <i class="ri-check-line mr-2"></i>
          ${t("register")}
        </button>
        <button onclick="closeMasterSidebar()" class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
          <i class="ri-close-line mr-2"></i>
          ${t("cancel")}
        </button>
      </div>
    </div>
  `;

  sidebar.classList.remove("translate-x-full");

  // Show overlay
  const overlay = document.getElementById("masterSidebarOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
  }

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
  const topSearchInput = document.getElementById('searchInput');
  const masterSearchInput = document.getElementById('masterSearchInput');

  if (tabName === 'data') {
    dataTab.classList.remove('bg-gray-300', 'text-gray-700');
    dataTab.classList.add('bg-blue-500', 'text-white');
    historyTab.classList.remove('bg-blue-500', 'text-white');
    historyTab.classList.add('bg-gray-300', 'text-gray-700');
    
    dataContent.classList.remove('hidden');
    historyContent.classList.add('hidden');
    
    // Enable both search inputs for data tab
    if (topSearchInput) {
      topSearchInput.disabled = false;
      topSearchInput.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
      topSearchInput.classList.add('bg-white', 'text-gray-900');
      topSearchInput.placeholder = t('searchPlaceholder');
    }
    if (masterSearchInput) {
      masterSearchInput.disabled = false;
      masterSearchInput.classList.remove('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
      masterSearchInput.classList.add('bg-white', 'text-gray-900');
      masterSearchInput.placeholder = t('searchPlaceholder');
    }
  } else if (tabName === 'history') {
    historyTab.classList.remove('bg-gray-300', 'text-gray-700');
    historyTab.classList.add('bg-blue-500', 'text-white');
    dataTab.classList.remove('bg-blue-500', 'text-white');
    dataTab.classList.add('bg-gray-300', 'text-gray-700');
    
    dataContent.classList.add('hidden');
    historyContent.classList.remove('hidden');
    
    // Disable and grey out both search inputs for history tab
    if (topSearchInput) {
      topSearchInput.disabled = true;
      topSearchInput.classList.remove('bg-white', 'text-gray-900');
      topSearchInput.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
      topSearchInput.placeholder = t('useHistorySearchBelow');
      topSearchInput.value = ''; // Clear any existing search
    }
    if (masterSearchInput) {
      masterSearchInput.disabled = true;
      masterSearchInput.classList.remove('bg-white', 'text-gray-900');
      masterSearchInput.classList.add('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
      masterSearchInput.placeholder = t('useHistorySearchBelow');
      masterSearchInput.value = ''; // Clear any existing search
    }
    
    // Load creation and deletion history when switching to history tab
    loadMasterDBHistory();
  }
}

// Enhanced history loading with pagination, search, and filters
let allHistoryData = [];
let filteredHistoryData = [];
let currentHistoryPage = 1;
let historyItemsPerPage = 25;

async function loadMasterDBHistory() {
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
      throw new Error('Failed to load history');
    }

    allHistoryData = await response.json();
    initializeHistoryFilters();
    applyHistoryFilters();
    setupHistoryEventListeners();
  } catch (error) {
    console.error('Error loading history:', error);
    container.innerHTML = `<p class="text-sm text-red-500">${t("loadingHistory")} エラーが発生しました。</p>`;
  }
}

// Initialize filter dropdowns with available options
function initializeHistoryFilters() {
  const userFilter = document.getElementById('historyUserFilter');
  const users = [...new Set(allHistoryData.map(entry => 
    entry.deletedBy || entry.createdBy || 'Unknown'
  ))].sort();
  
  userFilter.innerHTML = `<option value="">${t("allUsers")}</option>`;
  users.forEach(user => {
    userFilter.innerHTML += `<option value="${user}">${user}</option>`;
  });
}

// Setup event listeners for search and filters
function setupHistoryEventListeners() {
  const searchInput = document.getElementById('historySearchInput');
  const actionFilter = document.getElementById('historyActionFilter');
  const userFilter = document.getElementById('historyUserFilter');
  const itemsPerPageSelect = document.getElementById('historyItemsPerPage');

  // Debounced search
  let searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentHistoryPage = 1;
      applyHistoryFilters();
    }, 300);
  });

  // Filter changes
  [actionFilter, userFilter].forEach(filter => {
    filter.addEventListener('change', () => {
      currentHistoryPage = 1;
      applyHistoryFilters();
    });
  });

  // Items per page change
  itemsPerPageSelect.addEventListener('change', function() {
    historyItemsPerPage = parseInt(this.value);
    currentHistoryPage = 1;
    renderHistoryPage();
  });
}

// Apply search and filters to data
function applyHistoryFilters() {
  const searchTerm = document.getElementById('historySearchInput').value.toLowerCase();
  const actionFilter = document.getElementById('historyActionFilter').value;
  const userFilter = document.getElementById('historyUserFilter').value;

  filteredHistoryData = allHistoryData.filter(entry => {
    const recordInfo = entry.recordData || {};
    const isDeleteAction = entry.action && (entry.action.includes('削除') || entry.action.toLowerCase().includes('delete'));
    const user = entry.deletedBy || entry.createdBy || 'Unknown';
    
    // Search filter
    const searchMatches = !searchTerm || 
      (recordInfo['品番'] && recordInfo['品番'].toLowerCase().includes(searchTerm)) ||
      Object.values(recordInfo).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm)
      ) ||
      user.toLowerCase().includes(searchTerm);
    
    // Action filter
    const actionMatches = !actionFilter || 
      (actionFilter === 'creation' && !isDeleteAction) ||
      (actionFilter === 'deletion' && isDeleteAction);
    
    // User filter
    const userMatches = !userFilter || user === userFilter;
    
    return searchMatches && actionMatches && userMatches;
  });

  currentHistoryPage = 1;
  renderHistoryPage();
}

// Render current page of history
function renderHistoryPage() {
  const container = document.getElementById('masterHistoryContainer');
  const resultsInfo = document.getElementById('historyResultsInfo');
  
  if (!filteredHistoryData || filteredHistoryData.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <i class="ri-file-text-line text-2xl text-gray-400"></i>
        </div>
        <p class="text-gray-500">${t("noHistoryFound")}</p>
      </div>
    `;
    resultsInfo.textContent = t("noHistoryFound");
    document.getElementById('historyPaginationContainer').innerHTML = '';
    return;
  }

  // Calculate pagination
  const totalItems = filteredHistoryData.length;
  const totalPages = Math.ceil(totalItems / historyItemsPerPage);
  const startIndex = (currentHistoryPage - 1) * historyItemsPerPage;
  const endIndex = Math.min(startIndex + historyItemsPerPage, totalItems);
  const pageData = filteredHistoryData.slice(startIndex, endIndex);

  // Update results info
  resultsInfo.innerHTML = `${t("showingResults")} ${startIndex + 1} ${t("to")} ${endIndex} ${t("of")} ${totalItems} ${t("totalResults")}`;

  // Render history items
  renderMasterDBHistoryList(pageData);
  
  // Render pagination controls
  renderHistoryPagination(totalPages);
}

// Render pagination controls
function renderHistoryPagination(totalPages) {
  const container = document.getElementById('historyPaginationContainer');
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const pagination = `
    <nav class="flex items-center gap-2">
      <button 
        onclick="changeHistoryPage(${currentHistoryPage - 1})" 
        ${currentHistoryPage <= 1 ? 'disabled' : ''}
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i class="ri-arrow-left-s-line mr-1"></i>
        ${t("previous")}
      </button>
      
      <div class="flex items-center gap-1">
        ${Array.from({length: Math.min(7, totalPages)}, (_, i) => {
          let pageNum;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (currentHistoryPage <= 4) {
            pageNum = i + 1;
          } else if (currentHistoryPage >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = currentHistoryPage - 3 + i;
          }
          
          const isActive = pageNum === currentHistoryPage;
          return `
            <button 
              onclick="changeHistoryPage(${pageNum})"
              class="inline-flex items-center px-3 py-2 text-sm font-medium ${
                isActive 
                  ? 'text-blue-600 bg-blue-50 border border-blue-300' 
                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
              } rounded-lg"
            >
              ${pageNum}
            </button>
          `;
        }).join('')}
        
        ${totalPages > 7 && currentHistoryPage < totalPages - 3 ? `
          <span class="px-2 text-gray-500">...</span>
          <button 
            onclick="changeHistoryPage(${totalPages})"
            class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700"
          >
            ${totalPages}
          </button>
        ` : ''}
      </div>
      
      <button 
        onclick="changeHistoryPage(${currentHistoryPage + 1})" 
        ${currentHistoryPage >= totalPages ? 'disabled' : ''}
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ${t("next")}
        <i class="ri-arrow-right-s-line ml-1"></i>
      </button>
    </nav>
  `;
  
  container.innerHTML = pagination;
}

// Change page function
function changeHistoryPage(newPage) {
  const totalPages = Math.ceil(filteredHistoryData.length / historyItemsPerPage);
  if (newPage >= 1 && newPage <= totalPages) {
    currentHistoryPage = newPage;
    renderHistoryPage();
  }
}

// Function to render creation/deletion history list
function renderMasterDBHistoryList(history) {
  const container = document.getElementById('masterHistoryContainer');
  
  if (!history || history.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">履歴がありません。</p>';
    return;
  }

  const historyHTML = history.map(entry => {
    const date = new Date(entry.timestamp).toLocaleString('ja-JP');
    const recordInfo = entry.recordData || {};
    const isDeleteAction = entry.action && (entry.action.includes('削除') || entry.action.toLowerCase().includes('delete'));
    
    // Styling based on action type
    const containerClass = isDeleteAction 
      ? "border rounded p-4 bg-red-50 shadow-sm hover:shadow-md transition-shadow border-red-200"
      : "border rounded p-4 bg-white shadow-sm hover:shadow-md transition-shadow";
    
    const badgeClass = isDeleteAction
      ? "text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium"
      : "text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium";
    
    const userLabel = isDeleteAction ? "削除者" : "作成者";
    const userValue = isDeleteAction ? (entry.deletedBy || entry.createdBy || 'Unknown') : (entry.createdBy || 'Unknown');
    
    return `
      <div class="${containerClass}">
        <div class="flex justify-between items-start mb-3">
          <div>
            <span class="font-medium text-lg ${isDeleteAction ? 'text-red-800' : 'text-gray-800'}">${recordInfo['品番'] || 'Unknown Product'}</span>
            <div class="text-sm ${isDeleteAction ? 'text-red-700' : 'text-gray-600'}">
              <span class="font-medium">${userLabel}:</span> ${userValue}
            </div>
            <div class="text-xs ${isDeleteAction ? 'text-red-500' : 'text-gray-500'}">${date}</div>
          </div>
          <span class="${badgeClass}">${entry.action || (isDeleteAction ? '削除' : '新規作成')}</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          ${Object.entries(recordInfo)
            .filter(([key, value]) => key !== '_id' && key !== 'imageURL' && key !== 'changeHistory' && value)
            .map(([key, value]) => `
              <div class="flex">
                <span class="font-medium ${isDeleteAction ? 'text-red-700' : 'text-gray-700'} w-20 flex-shrink-0">${key}:</span>
                <span class="${isDeleteAction ? 'text-red-600' : 'text-gray-600'} break-all">${value}</span>
              </div>
            `).join('')}
        </div>
        
        ${recordInfo.imageURL ? `
          <div class="mt-3 pt-3 border-t ${isDeleteAction ? 'border-red-200' : ''}">
            <img src="${recordInfo.imageURL}" alt="Product Image" class="w-24 h-24 object-cover rounded border ${isDeleteAction ? 'opacity-70' : ''}" />
          </div>
        ` : ''}
        
        ${isDeleteAction ? `
          <div class="mt-2 text-xs text-red-600 italic">
            ⚠️ このレコードは削除されました
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