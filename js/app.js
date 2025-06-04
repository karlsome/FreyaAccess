if (!localStorage.getItem("authUser")) {
  window.location.href = "login.html";
}

const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
const roleDisplay = document.getElementById("userRole");
if (roleDisplay) {
  roleDisplay.textContent = currentUser.role || "guest";
}
const role = currentUser.role || "guest";
const customerDB = currentUser.dbName; // Dynamically use customer's DB name

// Role-based access
const roleAccess = {
  masterUser: ["dashboard", "userManagement", "masterDB", "submittedDB"],
  admin: ["dashboard", "userManagement", "masterDB", "submittedDB"],
  班長: ["dashboard", "masterDB", "submittedDB"],
  member: ["dashboard"]
};

// Navigation Setup
function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    const page = button.getAttribute("data-page");
    if (!roleAccess[role]?.includes(page)) {
      button.style.display = "none";
    } else {
      button.addEventListener("click", function () {
        document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
        loadPage(page);
      });
    }
  });
}

// Dynamic nav button generator
function createNavItem(page, label, iconClass) {
  const li = document.createElement("li");
  li.innerHTML = `
    <button class="nav-btn flex items-center w-full p-2 text-gray-600 rounded-lg hover:bg-gray-100" data-page="${page}">
      <i class="${iconClass} text-lg"></i>
      <span class="ml-3">${label}</span>
    </button>
  `;
  return li;
}

// Render sidebar based on role
function renderSidebarNavigation() {
  const navList = document.getElementById("dynamicNav");
  navList.innerHTML = "";

  const navItems = {
    dashboard: ["Dashboard", "ri-dashboard-line"],
    masterDB: ["MasterDB", "ri-database-2-line"],
    submittedDB: ["SubmittedDB", "ri-file-upload-line"],
    userManagement: ["Users", "ri-user-settings-line"]
  };

  const allowedPages = roleAccess[role] || [];
  allowedPages.forEach(page => {
    const [label, iconClass] = navItems[page];
    navList.appendChild(createNavItem(page, label, iconClass));
  });

  setupNavigation();
}

function loadPage(page) {
  const mainContent = document.getElementById("mainContent");
  handleNavClick(); // Close sidebar on mobile nav click

  switch (page) {
    case "dashboard":
        mainContent.innerHTML = `
            <h2 class="text-2xl font-semibold mb-4">Device Overview</h2>
            <div id="deviceOverviewContainer">Loading devices...</div>
        `;
        loadDeviceOverview();
        break;

    case "userManagement":
        mainContent.innerHTML = `
            <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-semibold">ユーザー管理</h2>
            <button onclick="showCreateUserForm()" class="bg-green-600 text-white px-4 py-1 rounded text-sm">新規ユーザー作成</button>
            </div>
            <div id="userTableContainer">読み込み中...</div>
        `;
        loadCustomerUsers();
        break;

    case "submittedDB":
      loadSubmittedDbPage(); 
      break;

    case "masterDB":
      mainContent.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold">製品マスタ一覧</h2>
          <div class="flex gap-2">
            <button onclick="showInsertCSVForm()" class="bg-blue-600 text-white px-4 py-1 rounded text-sm">CSV一括登録</button>
            <button onclick="openBlankMasterForm()" class="bg-green-600 text-white px-4 py-1 rounded text-sm">新規登録</button>
          </div>
        </div>
        <div class="mb-4">
          <input type="text" id="masterSearchInput" class="w-full p-2 border rounded" placeholder="品番、モデル、背番号などで検索..." />
        </div>
        <div id="masterTableContainer">Loading...</div>
      `;
      loadCustomerMasterDB();

      // Setup search
      setTimeout(() => {
        const searchInput = document.getElementById("masterSearchInput");
        if (searchInput) {
          searchInput.addEventListener("input", () => {
            const keyword = searchInput.value.trim();
            if (!keyword) {
              renderCustomerMasterTable(customerMasterData);
              return;
            }
            const filtered = customerMasterData.filter(row =>
              Object.values(row).some(val => val?.toString().toLowerCase().includes(keyword.toLowerCase()))
            );
            renderCustomerMasterTable(filtered);
          });
        }
      }, 100);
      break;

    case "submittedDB":
      mainContent.innerHTML = `
        <h2 class="text-2xl font-semibold mb-4">送信済データ一覧</h2>
        <p>現在準備中です。</p>
        <div class="text-sm text-gray-500">※ ご希望があればこのセクションも構築します。</div>
      `;
      break;

    default:
      mainContent.innerHTML = `<p>ページが見つかりません: ${page}</p>`;
  }
}

// Logout logic
function logout() {
  localStorage.removeItem("authUser");
  window.location.href = "login.html";
}

// Toggle dropdown user menu
function toggleDropdown() {
  const dropdown = document.getElementById("dropdownContent");
  dropdown.classList.toggle("hidden");
}

// Init app
document.addEventListener("DOMContentLoaded", () => {
  renderSidebarNavigation();
  loadPage("dashboard"); // default view
});