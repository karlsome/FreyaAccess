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
  職長: ["dashboard", "masterDB", "submittedDB"],
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
    dashboard: [t("dashboard"), "ri-dashboard-line"],
    masterDB: [t("masterDB"), "ri-database-2-line"],
    submittedDB: [t("submittedDB"), "ri-file-upload-line"],
    userManagement: [t("userManagement"), "ri-user-settings-line"]
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
          <div class="space-y-6">
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">${t("deviceOverview")}</h1>
                <p class="text-gray-600 mt-1">システム全体の状況とデバイス管理</p>
              </div>
            </div>
            
            <!-- Device Overview Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center gap-2 mb-4">
                <i class="ri-dashboard-line text-lg text-gray-600"></i>
                <h3 class="text-lg font-semibold text-gray-900">デバイス状況</h3>
              </div>
              <div id="deviceOverviewContainer" class="text-center py-8">
                <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <i class="ri-device-line text-2xl text-gray-400"></i>
                </div>
                <p class="text-gray-500">${t("loadingDevices")}</p>
              </div>
            </div>
          </div>
        `;
        loadDeviceOverview();
        break;

    case "userManagement":
        mainContent.innerHTML = `
          <div class="space-y-6">
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">${t("userManagement")}</h1>
                <p class="text-gray-600 mt-1">ユーザーアカウントの作成と管理</p>
              </div>
              <button onclick="showCreateUserForm()" class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                <i class="ri-user-add-line mr-2"></i>
                ${t("createNewUser")}
              </button>
            </div>
            
            <!-- User Table Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 class="text-lg font-semibold text-gray-900">ユーザー一覧</h3>
              </div>
              <div id="userTableContainer" class="p-6">
                <div class="text-center py-8">
                  <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <i class="ri-user-line text-2xl text-gray-400"></i>
                  </div>
                  <p class="text-gray-500">${t("loadingUsers")}</p>
                </div>
              </div>
            </div>
          </div>
        `;
        loadCustomerUsers();
        break;

    case "submittedDB":
      loadSubmittedDbPage(); 
      break;

    case "masterDB":
      mainContent.innerHTML = `
        <div class="space-y-6">
          <!-- Header Section -->
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">${t("productMasterList")}</h1>
              <p class="text-gray-600 mt-1">製品マスターデータの管理と編集</p>
            </div>
            <div class="flex gap-3">
              <button onclick="showInsertCSVForm()" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <i class="ri-file-upload-line mr-2"></i>
                ${t("csvBulkRegistration")}
              </button>
              <button onclick="openBlankMasterForm()" class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                <i class="ri-add-line mr-2"></i>
                ${t("newRegistration")}
              </button>
            </div>
          </div>

          <!-- Search Section -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center gap-2 mb-4">
              <i class="ri-search-line text-lg text-gray-600"></i>
              <h3 class="text-lg font-semibold text-gray-900">${t("searchLabel")}</h3>
            </div>
            <div class="relative">
              <input type="text" id="masterSearchInput" class="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="${t("searchPlaceholder")}" />
              <i class="ri-search-line absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          <!-- Data Table -->
          <div id="masterTableContainer">${t("loading")}</div>
        </div>
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
        <h2 class="text-2xl font-semibold mb-4">${t("submittedDataList")}</h2>
        <p>${t("currentlyInPreparation")}</p>
        <div class="text-sm text-gray-500">${t("noteIfRequested")}</div>
      `;
      break;

    default:
      mainContent.innerHTML = `<p>${t("pageNotFound")}: ${page}</p>`;
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