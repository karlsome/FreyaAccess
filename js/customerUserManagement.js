// customerUserManagement.js

let allUsers = [];

async function loadCustomerUsers() {
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const dbName = currentUser.dbName;
  const role = currentUser.role;

  try {
    const res = await fetch(BASE_URL + "customerGetUsers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbName, role })
    });

    const users = await res.json();
    renderUserTable(users);
  } catch (err) {
    console.error("Failed to load users:", err);
    document.getElementById("userTableContainer").innerHTML =
      `<p class="text-red-600">Failed to load users</p>`;
  }
}


function showCreateUserForm() {
  const container = document.getElementById("userTableContainer");

  const formHTML = `
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
      <div class="flex items-center gap-2 mb-4">
        <i class="ri-user-add-line text-lg text-blue-600"></i>
        <h3 class="text-xl font-semibold text-gray-900">${t("createNewUser")}</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">${t("firstName")}</label>
          <input type="text" id="newFirstName" placeholder="${t("firstName")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">${t("lastName")}</label>
          <input type="text" id="newLastName" placeholder="${t("lastName")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">${t("email")}</label>
          <input type="email" id="newEmail" placeholder="${t("email")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">${t("username")}</label>
          <input type="text" id="newUsername" placeholder="${t("username")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">${t("password")}</label>
          <input type="password" id="newPassword" placeholder="${t("password")}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">役割</label>
          <select id="newRole" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors">
            <option value="">Select Role</option>
            <option value="admin">admin</option>
            <option value="職長">職長</option>
            <option value="member">member</option>
          </select>
        </div>
      </div>
      <div class="flex gap-3">
        <button class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors" onclick="submitNewUser()">
          <i class="ri-check-line mr-2"></i>
          ${t("save")}
        </button>
        <button class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" onclick="loadCustomerUsers()">
          <i class="ri-close-line mr-2"></i>
          ${t("cancel")}
        </button>
      </div>
    </div>
  `;

  container.innerHTML = formHTML + container.innerHTML;
}

function startEditingUser(userId) {
  document.querySelectorAll(`[user-id='${userId}']`).forEach(el => el.disabled = false);
  const actions = document.getElementById(`actions-${userId}`);
  actions.innerHTML = `
    <button class="text-green-600 hover:underline" onclick="saveUser('${userId}')">保存</button>
    <button class="ml-2 text-gray-600 hover:underline" onclick="cancelEditUser('${userId}')">キャンセル</button>
  `;
}

function cancelEditUser(userId) {
  loadCustomerUsers();
}

async function saveUser(userId) {
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const dbName = currentUser.dbName;
  const username = currentUser.username;
  const role = currentUser.role;

  const updated = {};
  document.querySelectorAll(`[user-id='${userId}']`).forEach(el => {
    if (el.dataset.field) {
      updated[el.dataset.field] = el.value;
    }
    if (el.hasAttribute('data-role')) {
      updated.role = el.value;
    }
  });

  try {
    const res = await fetch(BASE_URL + "customerUpdateRecord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: userId,
        updateData: updated,
        dbName,
        collectionName: "users",
        role,
        username
      })
    });

    const result = await res.json();
    if (!res.ok || !result.modifiedCount) throw new Error("更新失敗");

    alert(t("updateSuccess"));
    loadCustomerUsers();
  } catch (err) {
    console.error("更新エラー:", err);
    alert(t("updateFailed"));
  }
}

async function deleteUser(userId) {
  if (!confirm("このユーザーを削除しますか？")) return;
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");

  try {
    const res = await fetch(BASE_URL + "customerDeleteUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: userId,
        dbName: currentUser.dbName,
        role: currentUser.role,
        username: currentUser.username
      })
    });

    const result = await res.json();
    if (!res.ok || !result.deletedCount) throw new Error("削除失敗");

    alert(t("deleteSuccess"));
    loadCustomerUsers();
  } catch (err) {
    console.error("削除エラー:", err);
    alert(t("deleteFailed"));
  }
}


function renderUserTable(users) {
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const isAdmin = ["admin", "masterUser"].includes(currentUser.role);

  if (!isAdmin) {
    document.getElementById("userTableContainer").innerHTML = `<p>${t("noAccess")}</p>`;
    return;
  }

  const headers = ["firstName", "lastName", "email", "username", "role"];
  const tableHTML = `
    
    <table class="w-full text-sm border">
      <thead class="bg-gray-100">
        <tr>
          ${headers.map(h => `<th class="px-4 py-2">${h}</th>`).join("")}
          <th class="px-4 py-2">操作</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr class="border-t" id="userRow-${u._id}">
            ${headers.map(h => `
              <td class="px-4 py-2">
                ${
                  h === "role"
                    ? `<select class="border p-1 rounded" disabled data-role user-id="${u._id}">
                        ${["admin", "masterUser", "職長", "member"].map(r => `
                          <option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>
                        `).join("")}
                      </select>`
                    : `<input class="border p-1 rounded w-full" value="${u[h] || ""}" disabled data-field="${h}" user-id="${u._id}" />`
                }
              </td>
            `).join("")}
            <td class="px-4 py-2" id="actions-${u._id}">
              <button class="text-blue-600 hover:underline text-sm" onclick="startEditingUser('${u._id}')">Edit</button>
              <button class="ml-2 text-green-600 hover:underline text-sm" onclick="resetUserPassword('${u._id}')">Reset Password</button>
              <button class="ml-2 text-red-600 hover:underline text-sm" onclick="deleteUser('${u._id}')">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("userTableContainer").innerHTML = tableHTML;
}


async function submitNewUser() {
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");

  const data = {
    firstName: document.getElementById("newFirstName").value.trim(),
    lastName: document.getElementById("newLastName").value.trim(),
    email: document.getElementById("newEmail").value.trim(),
    username: document.getElementById("newUsername").value.trim(),
    password: document.getElementById("newPassword").value.trim(),
    role: document.getElementById("newRole").value.trim(),
    dbName: currentUser.dbName,
    creatorRole: currentUser.role
  };

  if (!data.firstName || !data.lastName || !data.email || !data.username || !data.password || !data.role) {
    return alert(t("fillAllFields"));
  }

  try {
    const res = await fetch(BASE_URL + "customerCreateUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) {
      // Translate common error messages to Japanese
      let errorMessage = result.error || "作成に失敗しました";
      
      if (errorMessage.includes("Username already exists in this customer database")) {
        errorMessage = "このユーザー名は既にこの会社のデータベースに存在します";
      } else if (errorMessage.includes("Username already exists in a master account")) {
        errorMessage = "このユーザー名は既にマスターアカウントに存在します";
      } else if (errorMessage.includes("Username already exists in another customer company")) {
        errorMessage = "このユーザー名は既に他の会社で使用されています";
      } else if (errorMessage.includes("Missing required fields")) {
        errorMessage = "必須フィールドが入力されていません";
      } else if (errorMessage.includes("Access denied")) {
        errorMessage = "アクセスが拒否されました";
      }
      
      throw new Error(errorMessage);
    }

    alert(t("userCreateSuccess"));
    loadCustomerUsers();
  } catch (err) {
    console.error("Create error:", err);
    alert(t("createError") + ": " + err.message);
  }
}

async function resetUserPassword(userId) {
  const newPassword = prompt("新しいパスワードを入力してください:");
  if (!newPassword) return;
  
  if (newPassword.length < 6) {
    alert(t("passwordMinLength"));
    return;
  }

  const confirmPassword = prompt("パスワードを再入力して確認してください:");
  if (newPassword !== confirmPassword) {
    alert(t("passwordMismatch"));
    return;
  }

  if (!confirm(`このユーザーのパスワードをリセットしますか？\n新パスワード: ${newPassword}`)) return;

  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");

  try {
    const res = await fetch(BASE_URL + "customerResetUserPassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId,
        newPassword: newPassword,
        dbName: currentUser.dbName,
        role: currentUser.role,
        username: currentUser.username
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "パスワードリセットに失敗しました");

    alert(t("passwordResetSuccess"));
  } catch (err) {
    console.error("パスワードリセットエラー:", err);
    alert("パスワードリセット失敗: " + err.message);
  }
}