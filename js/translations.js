// Translation system for Freya Access Management System
const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    masterDB: "Master Database",
    submittedDB: "Submitted Database", 
    userManagement: "User Management",
    
    // Common UI elements
    search: "Search...",
    logout: "Logout",
    role: "Role",
    loading: "Loading...",
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    upload: "Upload",
    download: "Download",
    
    // Dashboard
    deviceOverview: "Device Overview",
    loadingDevices: "Loading devices...",
    
    // User Management
    userManagement: "User Management",
    createNewUser: "Create New User",
    loadingUsers: "Loading...",
    
    // Master Database
    productMasterList: "Product Master List",
    csvBulkRegistration: "CSV Bulk Registration",
    newRegistration: "New Registration",
    searchPlaceholder: "Search by product number, model, serial number...",
    dataList: "Data List",
    creationDeletionHistory: "Creation/Deletion History",
    deleteSelected: "Delete Selected",
    loadingHistory: "Loading history...",
    noDataFound: "No data found.",
    failedToLoadMasterDB: "Failed to load master database.",
    
    // CSV Import
    csvImportTitle: "CSV Import to Master Database",
    uploadCSV: "Upload CSV",
    
    // Sidebar details
    details: "Details",
    noImageUploaded: "No image uploaded.",
    productImage: "Product Image",
    updateImage: "Update Image",
    uploadImage: "Upload Image",
    edit: "Edit",
    ok: "OK",
    readOnly: "Read Only - No edit permission",
    changeHistory: "Change History",
    loadingHistory: "Loading history...",
    
    // Submitted Database
    submittedDataList: "Submitted Data List",
    currentlyInPreparation: "Currently in preparation.",
    noteIfRequested: "※ We can build this section if requested.",
    
    // Error messages
    pageNotFound: "Page not found",
    
    // User Management
    firstName: "First Name",
    lastName: "Last Name", 
    email: "Email",
    username: "Username",
    password: "Password",
    updateSuccess: "Update successful",
    updateFailed: "User update failed",
    deleteSuccess: "Delete completed",
    deleteFailed: "Delete failed",
    noAccess: "No access permission.",
    fillAllFields: "Please fill all fields",
    userCreateSuccess: "User creation successful",
    createError: "Creation error",
    passwordMinLength: "Password must be at least 6 characters",
    passwordMismatch: "Passwords do not match",
    passwordResetSuccess: "Password reset successful",
    
    // SubmittedDB
    loadingData: "Loading...",
    dataLoadError: "Data loading error",
    noDataMessage: "No data found",
    details: "Details",
    headersNotLoaded: "Table headers not loaded yet. Wait for data to load or try applying filters.",
    selectColumns: "Select at least one column to export.",
    csvExportPrep: "Preparing CSV export, please wait...",
    csvExportFailed: "CSV export failed",
    pdfExportPrep: "Preparing PDF export, please wait...",
    fontLoadFailed: "Failed to load Japanese font into PDF. PDF will use standard font.",
    pdfExportFailed: "PDF export failed",
    searchPlaceholder: "Search...",
    allActions: "All Actions",
    submittedLog: "Submitted Log",
    startDate: "Start Date",
    endDate: "End Date",
    action: "Action",
    productNumber: "Product Number",
    applyFilter: "Apply Filter",
    itemsPerPage: "Items per page",
    items: "items",
    csvExport: "CSV Export",
    pdfExport: "PDF Export",
    dataList: "Data List",
    noData: "No Data",
    noDataDescription: "No logs match the current criteria.",
    filters: "Filters",
    selectColumnsToExport: "Select columns to export",
    executeExport: "Execute Export"
  },
  
  ja: {
    // Navigation
    dashboard: "ダッシュボード",
    masterDB: "マスターデータベース",
    submittedDB: "送信済みデータベース",
    userManagement: "ユーザー管理",
    
    // Common UI elements
    search: "検索...",
    logout: "ログアウト",
    role: "役割",
    loading: "読み込み中...",
    close: "閉じる",
    cancel: "キャンセル",
    save: "保存",
    delete: "削除",
    edit: "編集",
    add: "追加",
    upload: "アップロード",
    download: "ダウンロード",
    
    // Dashboard  
    deviceOverview: "デバイス概要",
    loadingDevices: "デバイスを読み込み中...",
    
    // User Management
    userManagement: "ユーザー管理",
    createNewUser: "新規ユーザー作成",
    loadingUsers: "読み込み中...",
    
    // Master Database
    productMasterList: "製品マスタ一覧",
    csvBulkRegistration: "CSV一括登録",
    newRegistration: "新規登録", 
    searchPlaceholder: "品番、モデル、背番号などで検索...",
    dataList: "データ一覧",
    creationDeletionHistory: "作成・削除履歴",
    deleteSelected: "選択した項目を削除",
    loadingHistory: "履歴を読み込み中...",
    noDataFound: "データが見つかりません。",
    failedToLoadMasterDB: "マスターデータベースの読み込みに失敗しました。",
    
    // CSV Import
    csvImportTitle: "マスターデータベースへのCSVインポート",
    uploadCSV: "CSVアップロード",
    
    // Sidebar details
    details: "詳細",
    noImageUploaded: "画像がアップロードされていません。",
    productImage: "製品画像",
    updateImage: "画像を更新",
    uploadImage: "画像をアップロード",
    edit: "編集",
    ok: "OK",
    readOnly: "読み取り専用 - 編集権限がありません",
    changeHistory: "変更履歴",
    loadingHistory: "履歴を読み込み中...",
    
    // Submitted Database
    submittedDataList: "送信済データ一覧",
    currentlyInPreparation: "現在準備中です。",
    noteIfRequested: "※ ご希望があればこのセクションも構築します。",
    
    // Error messages
    pageNotFound: "ページが見つかりません",
    
    // User Management
    firstName: "名前",
    lastName: "苗字",
    email: "メールアドレス", 
    username: "ユーザー名",
    password: "パスワード",
    updateSuccess: "更新成功",
    updateFailed: "ユーザー更新失敗",
    deleteSuccess: "削除完了しました",
    deleteFailed: "削除に失敗しました",
    noAccess: "アクセス権限がありません。",
    fillAllFields: "すべてのフィールドを入力してください",
    userCreateSuccess: "ユーザー作成成功",
    createError: "作成エラー",
    passwordMinLength: "パスワードは6文字以上である必要があります",
    passwordMismatch: "パスワードが一致しません",
    passwordResetSuccess: "パスワードリセット成功",
    
    // SubmittedDB
    loadingData: "読み込み中...",
    dataLoadError: "データの読み込みエラー",
    noDataMessage: "データが見つかりません",
    details: "詳細",
    headersNotLoaded: "テーブルヘッダーがまだロードされていません。データがロードされるのを待つか、フィルターを適用してみてください。",
    selectColumns: "エクスポートする列を少なくとも1つ選択してください。",
    csvExportPrep: "CSVエクスポートを準備中です、しばらくお待ちください...",
    csvExportFailed: "CSVのエクスポートに失敗しました",
    pdfExportPrep: "PDFエクスポートを準備中です、しばらくお待ちください...",
    fontLoadFailed: "日本語フォントのPDFへの読み込みに失敗しました。PDFは標準フォントを使用します。",
    pdfExportFailed: "PDFのエクスポートに失敗しました",
    searchPlaceholder: "検索...",
    allActions: "全てのアクション",
    submittedLog: "送信済みログ",
    startDate: "開始日",
    endDate: "終了日",
    action: "アクション",
    productNumber: "品番",
    applyFilter: "フィルター適用",
    itemsPerPage: "表示件数",
    items: "件",
    csvExport: "CSVエクスポート",
    pdfExport: "PDFエクスポート",
    dataList: "データ一覧",
    noData: "データがありません",
    noDataDescription: "条件に一致するログはありません。",
    filters: "フィルター",
    selectColumnsToExport: "エクスポートする列を選択",
    executeExport: "エクスポート実行"
  }
};

// Current language state
let currentLanguage = localStorage.getItem('selectedLanguage') || 'en';

// Translation function
function t(key) {
  return translations[currentLanguage][key] || key;
}

// Set language and update UI
function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('selectedLanguage', lang);
  
  // Update the language selector
  const languageSelector = document.getElementById('languageSelector');
  if (languageSelector) {
    languageSelector.value = lang;
  }
  
  // Update document language attribute
  document.documentElement.lang = lang;
  
  // Trigger UI update
  updateUILanguage();
}

// Update all UI text based on current language
function updateUILanguage() {
  // Update navigation
  renderSidebarNavigation();
  
  // Update current page content
  const activeNavBtn = document.querySelector('.nav-btn.active');
  if (activeNavBtn) {
    const currentPage = activeNavBtn.getAttribute('data-page');
    loadPage(currentPage);
  } else {
    // Default to dashboard if no active page
    loadPage('dashboard');
  }
  
  // Update header elements
  updateHeaderLanguage();
}

// Update header text elements
function updateHeaderLanguage() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.placeholder = t('search');
  }
  
  const roleSpan = document.querySelector('#profileMenu .text-sm');
  if (roleSpan) {
    const userRole = document.getElementById('userRole');
    if (userRole) {
      roleSpan.innerHTML = `${t('role')}: <span id="userRole">${userRole.textContent}</span>`;
    }
  }
  
  const logoutBtn = document.querySelector('[onclick="logout()"]');
  if (logoutBtn) {
    logoutBtn.textContent = t('logout');
  }
  
  // Update main content loading message if it exists
  const mainContentTitle = document.getElementById('mainContentTitle');
  if (mainContentTitle && mainContentTitle.textContent === 'Loading...') {
    mainContentTitle.textContent = t('loading');
  }
}

// Initialize language system
function initializeLanguageSystem() {
  const languageSelector = document.getElementById('languageSelector');
  if (languageSelector) {
    // Set initial value
    languageSelector.value = currentLanguage;
    
    // Add event listener
    languageSelector.addEventListener('change', function() {
      setLanguage(this.value);
    });
  }
  
  // Set document language
  document.documentElement.lang = currentLanguage;
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeLanguageSystem();
});
