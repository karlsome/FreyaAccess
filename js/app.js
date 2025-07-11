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

// Load HTML template from external file
async function loadTemplate(templateName) {
  try {
    const response = await fetch(`pages/${templateName}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateName}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return `<div class="text-red-500">Failed to load page template: ${templateName}</div>`;
  }
}

// Update all translatable elements in the DOM
function updateTranslatableElements() {
  // Update elements with data-translate attribute
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    element.textContent = t(key);
  });
  
  // Update placeholders with data-translate-placeholder attribute
  document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
    const key = element.getAttribute('data-translate-placeholder');
    element.placeholder = t(key);
  });
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

async function loadPage(page) {
  const mainContent = document.getElementById("mainContent");
  handleNavClick(); // Close sidebar on mobile nav click

  try {
    let template;
    
    switch (page) {
      case "dashboard":
        template = await loadTemplate('dashboard');
        mainContent.innerHTML = template;
        updateTranslatableElements();
        loadDeviceOverview();
        break;

      case "userManagement":
        template = await loadTemplate('userManagement');
        mainContent.innerHTML = template;
        updateTranslatableElements();
        loadCustomerUsers();
        break;

      case "masterDB":
        template = await loadTemplate('masterDB');
        mainContent.innerHTML = template;
        updateTranslatableElements();
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
        template = await loadTemplate('submittedDB');
        mainContent.innerHTML = template;
        updateTranslatableElements();
        loadSubmittedDbPage();
        break;

      default:
        mainContent.innerHTML = `<div class="text-red-500">${t("pageNotFound")}: ${page}</div>`;
        break;
    }
  } catch (error) {
    console.error(`Error loading page ${page}:`, error);
    mainContent.innerHTML = `<div class="text-red-500">Error loading page: ${page}</div>`;
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