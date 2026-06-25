// ==================== 防止 Ctrl + 滾輪縮放 ====================
document.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// ==================== 防止 Ctrl + +/- 縮放 ====================
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) {
        e.preventDefault();
    }
});

// ==================== 全域變量 ====================
let currentUser = null;
let userData = { latestStatus: {}, allAttempts: [], favorites: [], practiceHistory: [], achievements: {} };
let currentUnit = null;
let currentChapter = null;
let currentQuestions = [];
let currentOptionsMapping = [];
let currentAnswers = [];
let currentQIndex = 0;
let timerInterval = null;
let timeRemaining = 0;
let pendingUnit = null;
let pendingChapter = null;
let lastResults = null;
let selectedDifficulty = 1;
let selectedCount = 10;
let isTrialMode = false;
let excludeTranslate = true;
let blinkInterval = null;
let customCount = 10;
let isSingleQuestionMode = false;
let singleQuestionSource = null;
let startTime = null;

// 成績總表控制變量
let showOnlyWrong = false;
let showAnswers = false;

// 登入相關變量
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;

// Firebase 同步狀態
let firestoreEnabled = false;

// 成就積分對應表
const ACHIEVEMENT_POINTS = {
    'firstPractice': 10,
    'tenQuestions': 25,
    'fiveHundred': 50,
    'thousand': 100,
    'perfectLesson': 50,
    'dseComplete': 50,
    'speedStar': 50,
    'consecutive20': 100,
    'allChaptersMaster': 200,
    'fiveStarStreak': 200,
    'mistakeEraser': 50,
    'collector': 25,
    'weekChallenge': 100,
    'star1': 10,
    'star3': 25,
    'star5': 50,
    'trial': 50,
    'blankPaper': -10,
    'downwardTrend': -10
};

// ==================== Firebase 初始化檢查 ====================
function checkFirebase() {
    firestoreEnabled = true;
    console.log('✅ Firestore 已強制啟用');
    return true;
}

// ==================== Firestore 數據同步函數 ====================
async function syncToFirestore(collection, docId, data) {
    if (!firestoreEnabled || !currentUser) return false;
    try {
        await firebase.firestore()
            .collection(collection)
            .doc(docId)
            .set(data, { merge: true });
        return true;
    } catch(e) {
        console.warn('⚠️ Firestore 同步失敗:', e.message);
        return false;
    }
}

async function loadFromFirestore(collection, docId) {
    if (!firestoreEnabled || !currentUser) return null;
    try {
        const doc = await firebase.firestore()
            .collection(collection)
            .doc(docId)
            .get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch(e) {
        console.warn('⚠️ Firestore 讀取失敗:', e.message);
        return null;
    }
}

// ==================== Firebase 遷移相關函數 ====================
async function saveMigrationToFirebase(migrationData) {
    if (!firestoreEnabled) {
        console.warn('⚠️ Firestore 未啟用，遷移請求儲存到 localStorage');
        const db = getUsers();
        if (!db.migrations) db.migrations = [];
        db.migrations.push(migrationData);
        saveUsers(db);
        return migrationData;
    }
    
    try {
        await firebase.firestore()
            .collection('migrations')
            .doc(migrationData.code)
            .set(migrationData, { merge: true });
        console.log('✅ 遷移請求已儲存到 Firebase');
        return migrationData;
    } catch(e) {
        console.warn('⚠️ Firebase 儲存失敗，改用 localStorage:', e.message);
        const db = getUsers();
        if (!db.migrations) db.migrations = [];
        db.migrations.push(migrationData);
        saveUsers(db);
        return migrationData;
    }
}

async function getMigrationsFromFirebase() {
    if (!firestoreEnabled) {
        const db = getUsers();
        return db.migrations || [];
    }
    
    try {
        const snapshot = await firebase.firestore()
            .collection('migrations')
            .where('status', '==', 'pending')
            .get();
        const migrations = [];
        snapshot.forEach(doc => {
            migrations.push(doc.data());
        });
        console.log(`✅ 從 Firebase 讀取 ${migrations.length} 個待處理遷移請求`);
        return migrations;
    } catch(e) {
        console.warn('⚠️ Firebase 讀取失敗，改用 localStorage:', e.message);
        const db = getUsers();
        return db.migrations || [];
    }
}

async function getMigrationByCodeFromFirebase(code) {
    if (!firestoreEnabled) {
        const db = getUsers();
        return (db.migrations || []).find(m => m.code === code && m.status === 'pending');
    }
    
    try {
        const doc = await firebase.firestore()
            .collection('migrations')
            .doc(code)
            .get();
        if (doc.exists) {
            const data = doc.data();
            if (data.status === 'pending') {
                return data;
            }
        }
        return null;
    } catch(e) {
        console.warn('⚠️ Firebase 讀取失敗，改用 localStorage:', e.message);
        const db = getUsers();
        return (db.migrations || []).find(m => m.code === code && m.status === 'pending');
    }
}

async function updateMigrationStatusInFirebase(code, status, newUserId) {
    if (!firestoreEnabled) {
        const db = getUsers();
        if (!db.migrations) db.migrations = [];
        const migration = db.migrations.find(m => m.code === code);
        if (migration) {
            migration.status = status;
            migration.completedAt = new Date().toISOString();
            migration.newUserId = newUserId;
            saveUsers(db);
        }
        return;
    }
    
    try {
        await firebase.firestore()
            .collection('migrations')
            .doc(code)
            .update({
                status: status,
                completedAt: new Date().toISOString(),
                newUserId: newUserId
            });
        console.log(`✅ 遷移請求 ${code} 已更新為 ${status}`);
    } catch(e) {
        console.warn('⚠️ Firebase 更新失敗，改用 localStorage:', e.message);
        const db = getUsers();
        if (!db.migrations) db.migrations = [];
        const migration = db.migrations.find(m => m.code === code);
        if (migration) {
            migration.status = status;
            migration.completedAt = new Date().toISOString();
            migration.newUserId = newUserId;
            saveUsers(db);
        }
    }
}

// ==================== format 函數 ====================
function format(date, pattern) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    return pattern.replace('yyyy', year).replace('MM', month).replace('dd', day);
}

// ==================== 數據操作函數 ====================
function saveUserData() {
    if (!currentUser) return;
    const userId = currentUser.id || currentUser.userId;
    localStorage.setItem(`ms_chem_${userId}`, JSON.stringify(userData));
    if (firestoreEnabled) {
        syncToFirestore('users', userId, {
            latestStatus: userData.latestStatus || {},
            allAttempts: userData.allAttempts || [],
            favorites: userData.favorites || [],
            practiceHistory: userData.practiceHistory || [],
            achievements: userData.achievements || {},
            stats: userData.stats || {},
            lastUpdated: new Date().toISOString()
        });
    }
}

async function loadUserData() {
    if (!currentUser) return;
    const userId = currentUser.id || currentUser.userId;
    
    if (firestoreEnabled) {
        try {
            const cloudData = await loadFromFirestore('users', userId);
            if (cloudData) {
                userData = {
                    latestStatus: cloudData.latestStatus || {},
                    allAttempts: cloudData.allAttempts || [],
                    favorites: cloudData.favorites || [],
                    practiceHistory: cloudData.practiceHistory || [],
                    achievements: cloudData.achievements || {},
                    stats: cloudData.stats || { totalQuestionsAnswered: 0, totalCorrect: 0, consecutiveCorrect: 0, maxConsecutive: 0, dailyPracticeDates: [], lastAccuracy: null }
                };
                if (!userData.practiceHistory) userData.practiceHistory = [];
                if (!userData.achievements) userData.achievements = {};
                if (!userData.stats) userData.stats = { totalQuestionsAnswered: 0, totalCorrect: 0, consecutiveCorrect: 0, maxConsecutive: 0, dailyPracticeDates: [], lastAccuracy: null };
                if (!userData.stats.dailyPracticeDates) userData.stats.dailyPracticeDates = [];
                localStorage.setItem(`ms_chem_${userId}`, JSON.stringify(userData));
                console.log('✅ 從 Firebase 載入數據');
                return;
            }
        } catch(e) {
            console.warn('⚠️ Firebase 讀取失敗:', e.message);
        }
    }
    
    const raw = localStorage.getItem(`ms_chem_${userId}`);
    if (raw) {
        userData = JSON.parse(raw);
        if (!userData.practiceHistory) userData.practiceHistory = [];
        if (!userData.achievements) userData.achievements = {};
        if (!userData.stats) userData.stats = { totalQuestionsAnswered: 0, totalCorrect: 0, consecutiveCorrect: 0, maxConsecutive: 0, dailyPracticeDates: [], lastAccuracy: null };
        if (!userData.stats.dailyPracticeDates) userData.stats.dailyPracticeDates = [];
        console.log('✅ 從 localStorage 載入數據');
        if (firestoreEnabled) {
            syncToFirestore('users', userId, {
                latestStatus: userData.latestStatus || {},
                allAttempts: userData.allAttempts || [],
                favorites: userData.favorites || [],
                practiceHistory: userData.practiceHistory || [],
                achievements: userData.achievements || {},
                stats: userData.stats || {},
                lastUpdated: new Date().toISOString()
            });
        }
        return;
    }
    
    userData = { latestStatus: {}, allAttempts: [], favorites: [], practiceHistory: [], achievements: {} };
    if (!userData.practiceHistory) userData.practiceHistory = [];
    if (!userData.achievements) userData.achievements = {};
    if (!userData.stats) userData.stats = { totalQuestionsAnswered: 0, totalCorrect: 0, consecutiveCorrect: 0, maxConsecutive: 0, dailyPracticeDates: [], lastAccuracy: null };
    if (!userData.stats.dailyPracticeDates) userData.stats.dailyPracticeDates = [];
    saveUserData();
}

function recordBatch(answers) {
    for (let a of answers) {
        userData.latestStatus[a.qid] = a.isCorrect;
        userData.allAttempts.push({ qid: a.qid, isCorrect: a.isCorrect, timestamp: Date.now() });
    }
    saveUserData();
}

// ==================== 登入相關函數 ====================
function showLoginError(msg) {
    const errEl = document.getElementById('loginError');
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.style.display = 'block';
    setTimeout(() => { errEl.style.display = 'none'; }, 4000);
}

function clearLoginError() {
    const errEl = document.getElementById('loginError');
    if (errEl) errEl.style.display = 'none';
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('show');
}

function formatTime(seconds) {
    if (!seconds || seconds < 0) return '-';
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    if (m === 0) return `${s}秒`;
    return `${m}分${s}秒`;
}

function getUsers() {
    const raw = localStorage.getItem('ms_chem_users');
    if (raw) {
        try { return JSON.parse(raw); } catch(e) { return { users: [] }; }
    }
    return { users: [] };
}

function saveUsers(users) {
    localStorage.setItem('ms_chem_users', JSON.stringify(users));
}

function findUser(userId) {
    const db = getUsers();
    return db.users.find(u => u.userId === userId);
}

async function updateUser(userId, data) {
    const db = getUsers();
    const index = db.users.findIndex(u => u.userId === userId);
    if (index !== -1) {
        db.users[index] = { ...db.users[index], ...data };
        saveUsers(db);
        if (firestoreEnabled) {
            try {
                await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .set(db.users[index], { merge: true });
                console.log('✅ 用戶資料已同步到 Firebase:', userId);
            } catch (e) {
                console.warn('⚠️ Firebase 更新失敗:', e.message);
            }
        }
        return db.users[index];
    }
    return null;
}

function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
        pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
}

function generateUserId(className) {
    const db = getUsers();
    const classUsers = db.users.filter(u => u.className === className);
    const num = classUsers.length + 1;
    return String(num).padStart(6, '0');
}

// ==================== 建立用戶 ====================
async function createUser(name, className, phone, customUserId = null) {
    const db = getUsers();
    const userId = customUserId || generateUserId(className);
    const initialPassword = generateRandomPassword();
    const user = {
        userId: userId,
        name: name,
        className: className,
        phone: phone,
        initialPassword: initialPassword,
        password: null,
        isFirstLogin: true,
        isTeacher: false,
        managedClasses: [className],
        createdAt: new Date().toISOString(),
        latestStatus: {},
        allAttempts: [],
        favorites: [],
        practiceHistory: [],
        achievements: {},
        stats: { totalQuestionsAnswered: 0, totalCorrect: 0 }
    };
    
    db.users.push(user);
    saveUsers(db);
    
    if (firestoreEnabled) {
        try {
            await firebase.firestore()
                .collection('users')
                .doc(userId)
                .set(user, { merge: true });
            console.log('✅ 用戶已存入 Firebase:', userId);
        } catch(e) {
            console.warn('⚠️ Firebase 儲存失敗:', e.message);
        }
    }
    
    if (firestoreEnabled) {
        const email = userId + '@mastering-science.com';
        try {
            await firebase.auth().createUserWithEmailAndPassword(email, initialPassword);
            console.log('✅ Firebase Auth 帳戶已建立:', userId);
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                console.log('ℹ️ Firebase Auth 帳戶已存在:', userId);
            } else {
                console.error('❌ Firebase Auth 建立失敗:', e.message);
                throw new Error(`Auth 建立失敗: ${e.message}`);
            }
        }
    }
    
    return user;
}

// ==================== 狀態指示器 ====================
function updateStatusDot(status, text, bg, color) {
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const statusDetail = document.getElementById('statusDetail');
    const statusTime = document.getElementById('statusTime');
    
    if (dot) {
        dot.className = 'status-dot ' + status;
    }
    if (statusText) {
        statusText.textContent = text || '✅ 已連線';
    }
    if (statusDetail) {
        statusDetail.textContent = '📡 Firestore + Auth';
    }
    if (statusTime) {
        statusTime.textContent = '🕐 更新時間：' + new Date().toLocaleTimeString();
    }
    
    const tooltip = document.getElementById('statusTooltip');
    if (tooltip) {
        if (status === 'online') {
            tooltip.style.borderColor = '#10b981';
        } else if (status === 'connecting') {
            tooltip.style.borderColor = '#f59e0b';
        } else {
            tooltip.style.borderColor = '#dc2626';
        }
    }
}

function showStatusTooltip() {
    const tooltip = document.getElementById('statusTooltip');
    if (tooltip) {
        tooltip.style.display = 'block';
        tooltip.style.opacity = '1';
    }
}

function hideStatusTooltip() {
    const tooltip = document.getElementById('statusTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.style.opacity = '0';
    }
}

// ==================== 取得 Auth 錯誤的中文對應 ====================
function getAuthErrorMessage(e) {
    const code = e.code;
    const message = e.message;
    let userMessage = '';
    
    switch(code) {
        case 'auth/user-not-found':
            userMessage = '❌ 帳戶不存在！請向老師確認學號是否正確';
            break;
        case 'auth/wrong-password':
            userMessage = '❌ 密碼錯誤！請確認密碼是否正確，或向老師索取新密碼';
            break;
        case 'auth/invalid-credential':
            userMessage = '❌ 密碼錯誤！請確認密碼是否正確';
            break;
        case 'auth/too-many-requests':
            userMessage = '❌ 登入嘗試過多，請稍後再試';
            break;
        case 'auth/network-request-failed':
            userMessage = '❌ 網路連線失敗，請檢查網路後重試';
            break;
        case 'auth/user-disabled':
            userMessage = '❌ 帳戶已被停用，請聯絡老師';
            break;
        case 'auth/email-already-in-use':
            userMessage = '⚠️ 此學號已被其他帳戶使用';
            break;
        default:
            userMessage = '❌ Auth 驗證失敗：' + message;
            break;
    }
    
    console.log('🔍 完整錯誤碼:', code);
    console.log('🔍 完整錯誤訊息:', message);
    
    return userMessage;
}

// ==================== 登入處理 ====================
async function handleLogin(userId, password) {
    clearLoginError();
    let user = null;
    
    updateStatusDot('connecting', '⏳ 連線中...', '#fef3c7', '#7c5a00');
    
    try {
        if (!firebase.auth().currentUser) {
            const email = userId + '@mastering-science.com';
            await firebase.auth().signInWithEmailAndPassword(email, password);
            console.log('✅ Auth 登入成功');
        } else {
            const currentEmail = firebase.auth().currentUser?.email;
            if (currentEmail && currentEmail !== userId + '@mastering-science.com') {
                await firebase.auth().signOut();
                const email = userId + '@mastering-science.com';
                await firebase.auth().signInWithEmailAndPassword(email, password);
                console.log('✅ 重新登入 Auth 成功');
            }
        }
        
        const authUser = firebase.auth().currentUser;
        if (!authUser) {
            updateStatusDot('offline', '❌ Auth 狀態異常', '#f8d7da', '#7f1d1d');
            showLoginError('❌ 登入異常，請重新嘗試');
            return;
        }
        
        console.log('✅ Auth 用戶:', authUser.uid);
        updateStatusDot('connecting', '⏳ 讀取用戶資料...', '#fef3c7', '#7c5a00');
        
    } catch(e) {
        console.warn('⚠️ Auth 登入失敗:', e.code, e.message);
        const errorMsg = getAuthErrorMessage(e);
        updateStatusDot('offline', '❌ ' + errorMsg, '#f8d7da', '#7f1d1d');
        showLoginError('❌ ' + errorMsg);
        return;
    }
    
    try {
        const doc = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .get();
        if (doc.exists) {
            user = doc.data();
            console.log('✅ 從 Firestore 找到用戶:', userId);
            
            const db = getUsers();
            const existing = db.users.find(u => u.userId === userId);
            if (existing) {
                Object.assign(existing, user);
            } else {
                db.users.push(user);
            }
            saveUsers(db);
        } else {
            console.log('⚠️ Firestore 無此用戶:', userId);
        }
    } catch(e) {
        console.warn('⚠️ Firestore 讀取失敗:', e.message);
    }
    
    if (!user) {
        user = findUser(userId);
        if (user) {
            console.log('✅ 從 localStorage 找到用戶:', userId);
        }
    }
    
    if (!user) {
        updateStatusDot('offline', '❌ 帳號不存在', '#f8d7da', '#7f1d1d');
        showLoginError('❌ 帳號不存在，請確認登入 ID');
        return;
    }
    
    const isValid = (user.password && user.password === password) ||
                    (user.isFirstLogin && user.initialPassword === password);
    
    if (!isValid) {
        loginAttempts++;
        const remaining = MAX_LOGIN_ATTEMPTS - loginAttempts;
        if (remaining <= 0) {
            showLoginError('❌ 密碼錯誤次數過多，請稍後再試');
            document.getElementById('loginBtn').disabled = true;
            setTimeout(() => {
                document.getElementById('loginBtn').disabled = false;
                loginAttempts = 0;
            }, 30000);
            return;
        }
        updateStatusDot('offline', '❌ 密碼錯誤，剩餘 ' + remaining + ' 次', '#f8d7da', '#7f1d1d');
        showLoginError(`❌ 密碼錯誤，剩餘嘗試次數：${remaining}`);
        return;
    }
    
    updateStatusDot('online', '✅ 登入成功！', '#d4edda', '#065f46');
    loginAttempts = 0;
    currentUser = user;
    
    if (document.getElementById('rememberMeCheckbox').checked) {
        localStorage.setItem('ms_chem_login', JSON.stringify({ userId: userId, password: password }));
    } else {
        localStorage.removeItem('ms_chem_login');
    }
    
    if (user.isFirstLogin) {
        openChangePasswordModal(true);
    } else {
        enterMainApp(user);
    }
}

function enterMainApp(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    const teacherTab = document.getElementById('teacherTab');
    if (user.isTeacher) {
        teacherTab.style.display = 'inline-block';
    } else {
        teacherTab.style.display = 'none';
    }
    
    updateUserLabel();
    
    loadUserData().then(() => {
        renderPractice();
        initTabs();
        document.querySelector('.tab[data-tab="practice"]').click();
        setupLogout();
    });
}

// ==================== 用戶下拉選單 ====================
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
        } else {
            menu.classList.add('show');
        }
    }
}

function closeUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.remove('show');
    }
}

function updateUserLabel() {
    if (!currentUser) return;
    
    const container = document.getElementById('userLabel');
    if (!container) return;
    
    container.innerHTML = `
        <div class="user-menu-wrapper">
            <button class="user-menu-trigger" onclick="toggleUserMenu()">
                👋 ${currentUser.name} (${currentUser.className}) ▼
            </button>
            <div class="user-menu-dropdown" id="userMenu">
                <div class="user-menu-item" onclick="openChangePasswordModal(false); closeUserMenu();">
                    🔑 修改密碼
                </div>
                <div class="user-menu-divider"></div>
                <div class="user-menu-item logout" onclick="logout(); closeUserMenu();">
                    🚪 登出
                </div>
            </div>
        </div>
    `;
    
    document.addEventListener('click', function(e) {
        const wrapper = document.querySelector('.user-menu-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            closeUserMenu();
        }
    });
}

function setupLogout() {}

// ==================== 登出函數 ====================
function logout() {
    if (confirm('⚠️ 確定要登出嗎？\n\n登出後：\n✅ 您的學習進度、成就、錯題會完全保留\n❌ 下次登入需要重新輸入密碼\n\n如果您只是要關閉瀏覽器，可以直接關閉，不需要登出。')) {
        currentUser = null;
        localStorage.removeItem('ms_chem_login');
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginPassword').value = '';
        document.getElementById('userLabel').innerHTML = '';
        clearLoginError();
        document.getElementById('loginBtn').disabled = false;
        loginAttempts = 0;
    }
}

function checkAutoLogin() {
    const saved = localStorage.getItem('ms_chem_login');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.userId && data.password) {
                document.getElementById('loginUserId').value = data.userId;
                document.getElementById('loginPassword').value = data.password;
                const rememberMe = document.getElementById('rememberMeCheckbox');
                if (rememberMe) rememberMe.checked = true;
                setTimeout(async () => {
                    await handleLogin(data.userId, data.password);
                }, 300);
                return true;
            }
        } catch(e) {}
    }
    return false;
}

// ==================== 忘記密碼 ====================
document.getElementById('forgotPasswordLink')?.addEventListener('click', function() {
    document.getElementById('forgotPasswordModal').classList.add('show');
    document.getElementById('forgotUserId').value = '';
    document.getElementById('forgotPhone').value = '';
    document.getElementById('forgotMessage').innerHTML = '';
    document.getElementById('forgotError').style.display = 'none';
});

document.getElementById('forgotSubmitBtn')?.addEventListener('click', function() {
    const userId = document.getElementById('forgotUserId').value.trim();
    const phone = document.getElementById('forgotPhone').value.trim();
    const errEl = document.getElementById('forgotError');
    const msgEl = document.getElementById('forgotMessage');

    if (!userId || !phone) {
        errEl.textContent = '⚠️ 請輸入學號和電話號碼';
        errEl.style.display = 'block';
        return;
    }

    const user = findUser(userId);
    if (!user) {
        errEl.textContent = '❌ 學號不存在';
        errEl.style.display = 'block';
        return;
    }

    if (user.phone !== phone) {
        errEl.textContent = '❌ 電話號碼不正確';
        errEl.style.display = 'block';
        return;
    }

    errEl.style.display = 'none';
    const newPwd = generateRandomPassword();
    
    updateUser(userId, {
        userId: userId,
        initialPassword: newPwd,
        password: null,
        isFirstLogin: true
    });

    if (firestoreEnabled) {
        const email = userId + '@mastering-science.com';
        const fbUser = firebase.auth().currentUser;
        
        if (fbUser) {
            fbUser.updatePassword(newPwd)
                .then(() => console.log('✅ Firebase Auth 密碼已更新（忘記密碼重設）'))
                .catch((err) => {
                    console.warn('⚠️ 直接更新失敗，嘗試重新登入:', err.message);
                    const oldPwd = user.password || user.initialPassword;
                    firebase.auth().signInWithEmailAndPassword(email, oldPwd)
                        .then((cred) => {
                            cred.user.updatePassword(newPwd)
                                .then(() => console.log('✅ Firebase Auth 密碼已更新'))
                                .catch(e => console.warn('⚠️ 更新失敗:', e.message));
                        })
                        .catch(() => {
                            firebase.auth().createUserWithEmailAndPassword(email, newPwd)
                                .then(() => console.log('✅ Firebase Auth 帳戶已建立'))
                                .catch(e => console.warn('⚠️ Firebase Auth 建立失敗:', e.message));
                        });
                });
        } else {
            const oldPwd = user.password || user.initialPassword;
            firebase.auth().signInWithEmailAndPassword(email, oldPwd)
                .then((cred) => {
                    cred.user.updatePassword(newPwd)
                        .then(() => console.log('✅ Firebase Auth 密碼已更新'))
                        .catch(e => console.warn('⚠️ 更新失敗:', e.message));
                })
                .catch(() => {
                    firebase.auth().createUserWithEmailAndPassword(email, newPwd)
                        .then(() => console.log('✅ Firebase Auth 帳戶已建立'))
                        .catch(e => console.warn('⚠️ Firebase Auth 建立失敗:', e.message));
                });
        }
    }

    msgEl.innerHTML = `<div class="alert alert-success">✅ 驗證成功！新的初始密碼已設定：<br><strong style="font-size:20px; font-family:monospace;">${newPwd}</strong><br>請用這個密碼登入，然後修改密碼。</div>`;

    setTimeout(() => {
        closeModal('forgotPasswordModal');
        document.getElementById('loginUserId').value = userId;
        document.getElementById('loginPassword').value = '';
    }, 3000);
});

// ==================== 修改密碼 ====================
function openChangePasswordModal(isFirstLogin = false) {
    const modal = document.getElementById('changePasswordModal');
    const title = document.getElementById('changePasswordTitle');
    const desc = document.getElementById('changePasswordDesc');
    const cancelBtn = document.getElementById('changePasswordCancelBtn');
    const oldPwdGroup = document.getElementById('oldPasswordGroup');

    if (isFirstLogin) {
        title.textContent = '🔐 首次登入 - 設定密碼';
        desc.textContent = '這是您第一次登入，請設定自己的密碼。';
        cancelBtn.style.display = 'none';
        if (oldPwdGroup) oldPwdGroup.style.display = 'none';
    } else {
        title.textContent = '🔑 修改密碼';
        desc.textContent = '請輸入舊密碼和新密碼。';
        cancelBtn.style.display = 'block';
        if (oldPwdGroup) oldPwdGroup.style.display = 'block';
    }

    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('changePasswordMessage').innerHTML = '';
    document.getElementById('changePasswordError').style.display = 'none';
    modal.classList.add('show');
}

document.getElementById('changePasswordCancelBtn')?.addEventListener('click', function() {
    closeModal('changePasswordModal');
});

document.getElementById('changePasswordBtn')?.addEventListener('click', function() {
    const oldPwd = document.getElementById('oldPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    const errEl = document.getElementById('changePasswordError');
    const msgEl = document.getElementById('changePasswordMessage');

    if (newPwd.length < 6) {
        errEl.textContent = '⚠️ 密碼至少 6 個字元';
        errEl.style.display = 'block';
        return;
    }

    if (newPwd !== confirmPwd) {
        errEl.textContent = '❌ 兩次輸入的密碼不一致';
        errEl.style.display = 'block';
        return;
    }

    errEl.style.display = 'none';

    if (!currentUser) {
        errEl.textContent = '❌ 請先登入';
        errEl.style.display = 'block';
        return;
    }

    const userId = currentUser.id || currentUser.userId;
    const isFirstLogin = currentUser.isFirstLogin;
    
    if (!isFirstLogin) {
        const validOldPwd = currentUser.password || currentUser.initialPassword;
        if (oldPwd !== validOldPwd) {
            errEl.textContent = '❌ 舊密碼不正確';
            errEl.style.display = 'block';
            return;
        }
    }
    
    updateUser(userId, {
        userId: userId,
        password: newPwd,
        isFirstLogin: false
    });

    if (firestoreEnabled) {
        const fbUser = firebase.auth().currentUser;
        const email = userId + '@mastering-science.com';
        
        if (fbUser) {
            fbUser.updatePassword(newPwd)
                .then(() => console.log('✅ Firebase Auth 密碼已更新'))
                .catch((err) => {
                    console.warn('⚠️ 直接更新失敗，嘗試重新認證:', err.message);
                    const oldPwdForLogin = currentUser.password || currentUser.initialPassword;
                    firebase.auth().signInWithEmailAndPassword(email, oldPwdForLogin)
                        .then((cred) => {
                            cred.user.updatePassword(newPwd)
                                .then(() => console.log('✅ Firebase Auth 密碼已更新'))
                                .catch(e => console.warn('⚠️ 重新認證後更新仍失敗:', e.message));
                        })
                        .catch(e => console.warn('⚠️ 重新認證失敗:', e.message));
                });
        } else {
            const oldPwdForLogin = currentUser.password || currentUser.initialPassword;
            firebase.auth().signInWithEmailAndPassword(email, oldPwdForLogin)
                .then((cred) => {
                    cred.user.updatePassword(newPwd)
                        .then(() => console.log('✅ Firebase Auth 密碼已更新'))
                        .catch(e => console.warn('⚠️ 更新失敗:', e.message));
                })
                .catch(() => {
                    firebase.auth().createUserWithEmailAndPassword(email, newPwd)
                        .then(() => console.log('✅ Firebase Auth 帳戶已建立'))
                        .catch(e => console.warn('⚠️ Firebase Auth 建立失敗:', e.message));
                });
        }
    }

    currentUser = findUser(userId);
    updateUserLabel();

    msgEl.innerHTML = `<div class="alert alert-success">✅ 密碼已成功修改！</div>`;

    if (isFirstLogin) {
        setTimeout(() => {
            closeModal('changePasswordModal');
            enterMainApp(currentUser);
        }, 1000);
    } else {
        setTimeout(() => {
            closeModal('changePasswordModal');
            if (document.getElementById('loginScreen').style.display !== 'none') {
                document.getElementById('loginUserId').value = userId;
            }
        }, 1500);
    }
});

document.getElementById('oldPassword')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('changePasswordBtn').click();
    }
});
document.getElementById('newPassword')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('changePasswordBtn').click();
    }
});
document.getElementById('confirmPassword')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('changePasswordBtn').click();
    }
});

// ==================== 密碼顯示切換 ====================
document.getElementById('togglePasswordBtn')?.addEventListener('click', function() {
    const input = document.getElementById('loginPassword');
    if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
    } else {
        input.type = 'password';
        this.textContent = '👁️';
    }
});

document.getElementById('toggleOldPasswordBtn')?.addEventListener('click', function() {
    const input = document.getElementById('oldPassword');
    if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
    } else {
        input.type = 'password';
        this.textContent = '👁️';
    }
});

document.getElementById('toggleNewPasswordBtn')?.addEventListener('click', function() {
    const input = document.getElementById('newPassword');
    if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
    } else {
        input.type = 'password';
        this.textContent = '👁️';
    }
});

document.getElementById('toggleConfirmPasswordBtn')?.addEventListener('click', function() {
    const input = document.getElementById('confirmPassword');
    if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
    } else {
        input.type = 'password';
        this.textContent = '👁️';
    }
});

// ==================== 登入按鈕 ====================
document.getElementById('loginBtn')?.addEventListener('click', async function() {
    const userId = document.getElementById('loginUserId').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!userId || !password) {
        showLoginError('⚠️ 請輸入登入 ID 和密碼');
        return;
    }
    
    await handleLogin(userId, password);
});

document.getElementById('loginPassword')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('loginUserId')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

// ==================== 班級設定讀取/儲存 ====================
async function loadClassSettings(className) {
    if (!firestoreEnabled) {
        const db = getUsers();
        return db.classSettings || {};
    }
    try {
        const doc = await firebase.firestore()
            .collection('classes')
            .doc(className)
            .get();
        if (doc.exists) {
            return doc.data() || {};
        }
        return {};
    } catch(e) {
        console.warn('⚠️ Firebase 讀取失敗:', e.message);
        const db = getUsers();
        return db.classSettings || {};
    }
}

async function saveClassSettings(className, settings) {
    if (!firestoreEnabled) {
        const db = getUsers();
        db.classSettings = { ...db.classSettings, [className]: settings };
        saveUsers(db);
        return;
    }
    try {
        await firebase.firestore()
            .collection('classes')
            .doc(className)
            .set(settings, { merge: true });
        console.log(`✅ 班級 ${className} 設定已儲存`);
    } catch(e) {
        console.warn('⚠️ Firebase 儲存失敗:', e.message);
        const db = getUsers();
        db.classSettings = { ...db.classSettings, [className]: settings };
        saveUsers(db);
    }
}

// ==================== 從 Firebase 讀取學生數據 ====================
async function loadAllStudentsFromFirebase(className) {
    console.log('📥 從 Firebase 讀取學生數據:', className);
    
    const db = getUsers();
    const localStudents = db.users.filter(u => u.className === className && !u.isTeacher);
    console.log(`📊 localStorage: ${localStudents.length} 位學生`);
    
    if (!firestoreEnabled) {
        return localStudents;
    }
    
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .where('className', '==', className)
            .where('isTeacher', '==', false)
            .get();
        const firebaseStudents = [];
        snapshot.forEach(doc => {
            firebaseStudents.push(doc.data());
        });
        console.log(`📊 Firebase: ${firebaseStudents.length} 位學生`);
        
        const merged = [...firebaseStudents];
        for (const s of localStudents) {
            if (!merged.find(m => m.userId === s.userId)) {
                merged.push(s);
            }
        }
        return merged;
    } catch(e) {
        console.warn('⚠️ Firebase 讀取失敗，使用 localStorage:', e.message);
        return localStudents;
    }
}