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
    <div class="bg-white border p-4 rounded shadow mb-4 max-w-xl">
      <h3 class="text-lg font-semibold mb-2">新規ユーザー作成</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" id="newFirstName" placeholder="First Name" class="border p-2 rounded w-full" />
        <input type="text" id="newLastName" placeholder="Last Name" class="border p-2 rounded w-full" />
        <input type="email" id="newEmail" placeholder="Email" class="border p-2 rounded w-full" />
        <input type="text" id="newUsername" placeholder="Username" class="border p-2 rounded w-full" />
        <input type="password" id="newPassword" placeholder="Password" class="border p-2 rounded w-full" />
        <select id="newRole" class="border p-2 rounded w-full">
          <option value="">Select Role</option>
          <option value="admin">admin</option>
          <option value="班長">班長</option>
          <option value="member">member</option>
        </select>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="bg-green-600 text-white px-4 py-2 rounded" onclick="submitNewUser()">登録</button>
        <button class="bg-gray-400 text-white px-4 py-2 rounded" onclick="loadCustomerUsers()">キャンセル</button>
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
    if (el.dataset.field) updated[el.dataset.field] = el.value;
    if (el.dataset.role) updated.role = el.value;
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

    alert("更新成功");
    loadCustomerUsers();
  } catch (err) {
    console.error("更新エラー:", err);
    alert("ユーザー更新失敗");
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

    alert("削除完了しました");
    loadCustomerUsers();
  } catch (err) {
    console.error("削除エラー:", err);
    alert("削除に失敗しました");
  }
}


function renderUserTable(users) {
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const isAdmin = ["admin", "masterUser"].includes(currentUser.role);

  if (!isAdmin) {
    document.getElementById("userTableContainer").innerHTML = `<p>アクセス権限がありません。</p>`;
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
                        ${["admin", "masterUser", "班長", "member"].map(r => `
                          <option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>
                        `).join("")}
                      </select>`
                    : `<input class="border p-1 rounded w-full" value="${u[h] || ""}" disabled data-field="${h}" user-id="${u._id}" />`
                }
              </td>
            `).join("")}
            <td class="px-4 py-2">
              <button class="text-blue-600 hover:underline text-sm" onclick="startEditingUser('${u._id}')">Edit</button>
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
    return alert("すべてのフィールドを入力してください");
  }

  try {
    const res = await fetch(BASE_URL + "customerCreateUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "作成に失敗しました");

    alert("ユーザー作成成功");
    loadCustomerUsers();
  } catch (err) {
    console.error("Create error:", err);
    alert("作成エラー");
  }
}