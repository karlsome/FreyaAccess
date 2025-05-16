async function loadDeviceOverview() {
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const dbName = currentUser.dbName;
  const username = currentUser.username;

  try {
    // Fetch masterUser's device list
    const userRes = await fetch(`${BASE_URL}/getMasterUserByUsername`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    const user = await userRes.json();
    const devices = user.devices || [];

    // Fetch production stats by device from submittedDB
    const statsRes = await fetch(`${BASE_URL}/getDeviceStats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbName })
    });

    const stats = await statsRes.json(); // Format: { [uniqueId]: { total, totalNG } }

    const container = document.getElementById("deviceOverviewContainer");
    if (!devices.length) {
      container.innerHTML = `<p>No devices registered yet.</p>`;
      return;
    }

    const cards = devices.map(device => {
      const id = device.uniqueId;
      const stat = stats[id] || { total: 0, totalNG: 0 };
      const defectRate = stat.total ? ((stat.totalNG / stat.total) * 100).toFixed(2) : "0.00";
      const status = defectRate >= 2.0
        ? `<span class="bg-red-100 text-red-600 text-sm px-2 py-1 rounded">High Defect Rate</span>`
        : `<span class="bg-green-100 text-green-600 text-sm px-2 py-1 rounded">Normal</span>`;

      return `
        <div class="border rounded-lg p-4 shadow bg-white w-full md:w-[300px]">
          <h3 class="text-lg font-semibold mb-2">${device.name}</h3>
          <p>Total: <span class="font-bold">${stat.total}</span></p>
          <p>Total NG: <span class="font-bold">${stat.totalNG}</span></p>
          <p>Defect Rate: <span class="font-bold">${defectRate}%</span></p>
          ${status}
        </div>
      `;
    });

    container.innerHTML = `
      <h2 class="text-2xl font-semibold mb-4">Device Overview</h2>
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        ${cards.join("")}
      </div>
    `;
  } catch (err) {
    console.error("Error loading device overview:", err);
    document.getElementById("deviceOverviewContainer").innerHTML = `<p class="text-red-500">Failed to load device overview.</p>`;
  }
}
