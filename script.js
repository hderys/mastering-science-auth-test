// ==================== 最簡測試版 ====================
// 淨係測試全屏功能，其他全部刪走

let currentUser = null;
let userData = { latestStatus: {}, allAttempts: [] };
let currentQuestions = [];
let currentOptionsMapping = [];
let currentAnswers = [];
let currentQIndex = 0;
let pendingUnit = null;
let pendingChapter = null;
let timerInterval = null;
let timeRemaining = 0;
let firestoreEnabled = false;
let startTime = null;

// ==================== 登入相關 ====================
function getUsers() {
    const raw = localStorage.getItem('ms_chem_users');
    if (raw) {
        try { return JSON.parse(raw); } catch(e) { return { users: [] }; }
    }
    return { users: [] };
}

function findUser(userId) {
    const db = getUsers();
    return db.users.find(u => u.userId === userId);
}

function updateUser(userId, data) {
    const db = getUsers();
    const index = db.users.findIndex(u => u.userId === userId);
    if (index !== -1) {
        db.users[index] = { ...db.users[index], ...data };
        localStorage.setItem('ms_chem_users', JSON.stringify(db));
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

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function format(date, pattern) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    return pattern.replace('yyyy', year).replace('MM', month).replace('dd', day);
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('show');
}

function showLoginError(msg) {
    const errEl = document.getElementById('loginError');
    if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
        setTimeout(() => { errEl.style.display = 'none'; }, 4000);
    }
}

function updateStatusDot(status, text) {
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    if (dot) dot.className = 'status-dot ' + status;
    if (statusText) statusText.textContent = text || '✅ 已連線';
}

function getAuthErrorMessage(e) {
    const code = e.code;
    switch(code) {
        case 'auth/user-not-found': return '❌ 帳戶不存在';
        case 'auth/wrong-password': return '❌ 密碼錯誤';
        case 'auth/invalid-credential': return '❌ 密碼錯誤';
        case 'auth/too-many-requests': return '❌ 嘗試過多，請稍後';
        default: return '❌ ' + e.message;
    }
}

function checkFirebase() {
    firestoreEnabled = true;
    return true;
}

// ==================== 登入處理 ====================
async function handleLogin(userId, password) {
    const user = findUser(userId);
    if (!user) {
        showLoginError('❌ 帳戶不存在');
        return;
    }
    
    const isValid = (user.password && user.password === password) ||
                    (user.isFirstLogin && user.initialPassword === password);
    
    if (!isValid) {
        showLoginError('❌ 密碼錯誤');
        return;
    }
    
    currentUser = user;
    
    if (user.isFirstLogin) {
        openChangePasswordModal(true);
    } else {
        enterMainApp(user);
    }
}

function enterMainApp(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.querySelector('.tab[data-tab="practice"]').click();
    renderPractice();
}

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
    modal.classList.add('show');
}

document.getElementById('changePasswordCancelBtn')?.addEventListener('click', function() {
    closeModal('changePasswordModal');
});

document.getElementById('changePasswordBtn')?.addEventListener('click', function() {
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
        errEl.textContent = '❌ 兩次密碼不一致';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';

    const userId = currentUser.id || currentUser.userId;
    const isFirstLogin = currentUser.isFirstLogin;
    
    if (!isFirstLogin) {
        const oldPwd = document.getElementById('oldPassword').value;
        const validOldPwd = currentUser.password || currentUser.initialPassword;
        if (oldPwd !== validOldPwd) {
            errEl.textContent = '❌ 舊密碼不正確';
            errEl.style.display = 'block';
            return;
        }
    }
    
    updateUser(userId, { password: newPwd, isFirstLogin: false });
    currentUser = findUser(userId);

    msgEl.innerHTML = `<div class="alert alert-success">✅ 密碼已修改！</div>`;

    if (isFirstLogin) {
        setTimeout(() => {
            closeModal('changePasswordModal');
            enterMainApp(currentUser);
        }, 1000);
    } else {
        setTimeout(() => {
            closeModal('changePasswordModal');
        }, 1500);
    }
});

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

// ==================== 練習相關（最簡版） ====================
function renderPractice() {
    const container = document.getElementById('practicePanel');
    if (!container || !window.ALL_UNITS) {
        container.innerHTML = '<div class="card">題庫未載入</div>';
        return;
    }
    
    let html = '';
    for (let unit in window.ALL_UNITS) {
        let unitObj = window.ALL_UNITS[unit];
        let chapters = unitObj.chapters;
        if (Object.keys(chapters).length === 0) continue;
        
        html += `<div class="unit-group"><div class="unit-header" onclick="toggleUnit('${unit}')">
            <span>${unitObj.name}</span>
        </div><div class="chapters-container" id="chapters-${unit}">`;
        for (let ch in chapters) {
            html += `<div class="chapter-item">
                <span class="chapter-name">${chapters[ch].name}</span>
                <button class="btn btn-small practice-chapter" data-unit="${unit}" data-chapter="${ch}">✏️ 練習</button>
            </div>`;
        }
        html += `</div></div>`;
    }
    container.innerHTML = html;
    
    // 展開第一個單元
    const firstUnit = document.querySelector('.chapters-container');
    if (firstUnit) firstUnit.classList.add('open');
    
    document.querySelectorAll('.practice-chapter').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            pendingUnit = this.dataset.unit;
            pendingChapter = this.dataset.chapter;
            startPractice();
        });
    });
}

function toggleUnit(unitId) {
    const c = document.getElementById(`chapters-${unitId}`);
    const t = document.getElementById(`toggle-${unitId}`);
    if (c) {
        c.classList.toggle('open');
        if (t) t.textContent = c.classList.contains('open') ? '▼' : '▶';
    }
}

function startPractice() {
    if (!pendingUnit || !pendingChapter) {
        alert('請選擇章節');
        return;
    }
    
    const allQuestions = window.ALL_UNITS[pendingUnit].chapters[pendingChapter].questions;
    const count = Math.min(10, allQuestions.length);
    const shuffled = shuffleArray([...allQuestions]);
    const selectedQuestions = shuffled.slice(0, count);
    
    currentQuestions = selectedQuestions;
    currentOptionsMapping = currentQuestions.map(q => {
        const letters = ['A', 'B', 'C', 'D'];
        const map = {};
        for (let i = 0; i < 4; i++) {
            const optText = q.options[i].substring(3);
            map[letters[i]] = optText;
        }
        return { letterToText: map, correctLetter: q.correct };
    });
    currentAnswers = new Array(selectedQuestions.length).fill(null);
    currentQIndex = 0;
    
    timeRemaining = 90 * selectedQuestions.length;
    startTime = Date.now();
    
    // 更新計時器
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timeRemaining <= 0) {
            submitAll();
        } else {
            timeRemaining--;
            updateTimerDisplay();
        }
    }, 1000);
    
    showQuizModal();
}

function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.innerText = timeStr;
    const desktopTimer = document.getElementById('desktopTimer');
    if (desktopTimer) desktopTimer.innerText = `⏱️ ${timeStr}`;
}

function renderQuizNav() {
    const nav = document.getElementById('questionNav');
    if (!nav) return;
    let html = '';
    for (let i = 0; i < currentQuestions.length; i++) {
        let cls = '';
        if (i === currentQIndex) cls = 'current';
        else if (currentAnswers[i] !== null) cls = 'answered';
        else cls = 'unanswered';
        html += `<button class="q-nav-btn ${cls}" data-idx="${i}">${i + 1}</button>`;
    }
    nav.innerHTML = html;
    document.getElementById('quizCounter').innerHTML = `${currentQIndex + 1} / ${currentQuestions.length}`;
    
    document.querySelectorAll('.q-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentQIndex = parseInt(this.dataset.idx);
            renderQuizNav();
            renderCurrentQuestion();
            updateNavButtons();
        });
    });
}

function renderCurrentQuestion() {
    if (currentQuestions.length === 0 || currentQIndex >= currentQuestions.length) return;
    
    const q = currentQuestions[currentQIndex];
    const map = currentOptionsMapping[currentQIndex];
    const hasImage = q.imageUrl !== null;
    
    document.getElementById('modalQuestionText').innerHTML = q.text;
    document.getElementById('quizCounter').innerHTML = `${currentQIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('quizDifficulty').innerHTML = q.difficulty;
    
    const imgArea = document.getElementById('modalImageArea');
    if (hasImage && q.imageUrl) {
        imgArea.innerHTML = `<img src="${q.imageUrl}" style="max-height:130px; max-width:100%; object-fit:contain; border-radius:8px;">`;
        imgArea.style.display = 'block';
    } else {
        imgArea.innerHTML = '';
        imgArea.style.display = 'none';
    }
    
    const optsDiv = document.getElementById('modalOptions');
    optsDiv.innerHTML = '';
    for (let l of ['A', 'B', 'C', 'D']) {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (currentAnswers[currentQIndex] === l) btn.classList.add('selected');
        btn.textContent = `${l}. ${map.letterToText[l]}`;
        btn.addEventListener('click', function() {
            currentAnswers[currentQIndex] = l;
            renderCurrentQuestion();
            renderQuizNav();
        });
        optsDiv.appendChild(btn);
    }
    
    updateNavButtons();
}

function updateNavButtons() {
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    if (prev) prev.disabled = (currentQIndex === 0);
    if (next) next.disabled = (currentQIndex === currentQuestions.length - 1);
}

function submitAll() {
    if (timerInterval) clearInterval(timerInterval);
    
    let correctCount = 0;
    for (let i = 0; i < currentQuestions.length; i++) {
        const userLetter = currentAnswers[i];
        const correctLetter = currentOptionsMapping[i].correctLetter;
        if (userLetter === correctLetter) correctCount++;
    }
    
    const accuracy = Math.round(correctCount / currentQuestions.length * 100);
    alert(`✅ 完成！\n正確率：${accuracy}%（${correctCount}/${currentQuestions.length}）`);
    
    // 還原旋轉
    const desktopModal = document.getElementById('desktopQuizModal');
    if (desktopModal) {
        desktopModal.style.transform = '';
        desktopModal.style.width = '';
        desktopModal.style.height = '';
        desktopModal.style.transformOrigin = '';
    }
    
    document.getElementById('quizModal').style.display = 'none';
    document.getElementById('desktopQuizModal').style.display = 'none';
    
    // 如果係全屏狀態，退出全屏
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        try {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch(e) {}
    }
    // 解鎖方向
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } catch(e) {}
}

// ============================================================
// ✅ 最終全屏功能（強制旋轉 90°）
// ============================================================
async function toggleFullscreen() {
    console.log('🔍 全屏按鈕被點擊');
    
    // 如果已經係全屏 → 退出
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        try {
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
            
            // 解鎖方向
            try {
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
            } catch(e) {}
            
            // 還原旋轉
            const desktopModal = document.getElementById('desktopQuizModal');
            if (desktopModal) {
                desktopModal.style.transform = '';
                desktopModal.style.width = '';
                desktopModal.style.height = '';
                desktopModal.style.transformOrigin = '';
            }
            
            const btn = document.getElementById('fullscreenBtn');
            if (btn) {
                btn.textContent = '⛶ 全屏';
                btn.classList.remove('active');
            }
            
            const quizModal = document.getElementById('quizModal');
            if (quizModal) {
                quizModal.style.display = 'flex';
                renderCurrentQuestion();
            }
            return;
        } catch(e) {
            console.warn('退出全屏失敗:', e);
        }
    }
    
    // ===== 進入全屏 =====
    
    // 1. 隱藏手機版
    const quizModal = document.getElementById('quizModal');
    if (quizModal) quizModal.style.display = 'none';
    
    // 2. 顯示桌面版
    const desktopModal = document.getElementById('desktopQuizModal');
    if (desktopModal) {
        desktopModal.style.display = 'flex';
        renderDesktopCurrentQuestion();
        updateTimerDisplay();
        renderDesktopQuizNav();
    }
    
    // 3. ✅ 強制旋轉 90°（打側顯示）
    if (desktopModal) {
        desktopModal.style.transform = 'rotate(90deg)';
        desktopModal.style.transformOrigin = 'center center';
        desktopModal.style.width = '100vh';
        desktopModal.style.height = '100vw';
        console.log('✅ 已強制旋轉 90°');
    }
    
    // 4. 更新按鈕
    const btn = document.getElementById('fullscreenBtn');
    if (btn) {
        btn.textContent = '⛶ 退出';
        btn.classList.add('active');
    }
    
    // 5. 嘗試 Fullscreen API（得就得，唔得就算）
    try {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(e => {
                console.log('ℹ️ Fullscreen 失敗（已切換到桌面版）:', e.message);
            });
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        }
    } catch(e) {
        console.log('ℹ️ Fullscreen 失敗（已切換到桌面版）:', e.message);
    }
    
    // 6. 滾動
    setTimeout(() => window.scrollTo(0, 1), 300);
}

// ==================== 桌面版函數（最簡版） ====================
function renderDesktopCurrentQuestion() {
    if (currentQuestions.length === 0 || currentQIndex >= currentQuestions.length) return;
    
    const q = currentQuestions[currentQIndex];
    const map = currentOptionsMapping[currentQIndex];
    const hasImage = q.imageUrl !== null;
    
    document.getElementById('desktopQuestionText').innerHTML = q.text;
    document.getElementById('desktopCounter').innerHTML = `${currentQIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('desktopDifficulty').innerHTML = q.difficulty;
    
    const imgArea = document.getElementById('desktopImageArea');
    if (hasImage && q.imageUrl) {
        imgArea.innerHTML = `<img src="${q.imageUrl}" style="max-height:110px; max-width:100%; object-fit:contain; border-radius:8px;">`;
        imgArea.style.display = 'block';
    } else {
        imgArea.innerHTML = '';
        imgArea.style.display = 'none';
    }
    
    const optsDiv = document.getElementById('desktopOptions');
    optsDiv.innerHTML = '';
    for (let l of ['A', 'B', 'C', 'D']) {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (currentAnswers[currentQIndex] === l) btn.classList.add('selected');
        btn.textContent = `${l}. ${map.letterToText[l]}`;
        btn.addEventListener('click', function() {
            currentAnswers[currentQIndex] = l;
            renderDesktopCurrentQuestion();
            renderDesktopQuizNav();
        });
        optsDiv.appendChild(btn);
    }
}

function renderDesktopQuizNav() {
    const nav = document.getElementById('desktopNav');
    if (!nav) return;
    let html = '';
    for (let i = 0; i < currentQuestions.length; i++) {
        let cls = '';
        if (i === currentQIndex) cls = 'current';
        else if (currentAnswers[i] !== null) cls = 'answered';
        else cls = 'unanswered';
        html += `<button class="nav-dot ${cls}" data-idx="${i}">${i + 1}</button>`;
    }
    nav.innerHTML = html;
    document.getElementById('desktopCounter').innerHTML = `${currentQIndex + 1} / ${currentQuestions.length}`;
    
    document.querySelectorAll('#desktopNav .nav-dot').forEach(btn => {
        btn.addEventListener('click', function() {
            currentQIndex = parseInt(this.dataset.idx);
            renderDesktopQuizNav();
            renderDesktopCurrentQuestion();
            updateDesktopNavButtons();
        });
    });
    
    updateDesktopSidebarDifficulty();
}

function updateDesktopSidebarDifficulty() {
    if (currentQuestions.length === 0 || currentQIndex >= currentQuestions.length) return;
    const q = currentQuestions[currentQIndex];
    const sidebar = document.getElementById('desktopSidebar');
    if (!sidebar) return;
    sidebar.classList.remove('difficulty-translate', 'difficulty-basic', 'difficulty-advanced', 'difficulty-challenge');
    if (q.difficulty === '🌐 Translate') sidebar.classList.add('difficulty-translate');
    else if (q.difficulty === '✅ Basic') sidebar.classList.add('difficulty-basic');
    else if (q.difficulty === '📈 Advanced') sidebar.classList.add('difficulty-advanced');
    else if (q.difficulty === '🔥 Challenge') sidebar.classList.add('difficulty-challenge');
}

function updateDesktopNavButtons() {
    const prev = document.getElementById('desktopPrevBtn');
    const next = document.getElementById('desktopNextBtn');
    if (prev) prev.disabled = (currentQIndex === 0);
    if (next) next.disabled = (currentQIndex === currentQuestions.length - 1);
}

// ==================== showQuizModal（簡化版） ====================
function showQuizModal() {
    // 確保只有手機版顯示
    document.getElementById('desktopQuizModal').style.display = 'none';
    document.getElementById('quizModal').style.display = 'flex';
    
    renderQuizNav();
    renderCurrentQuestion();
    
    // 綁定全屏按鈕 - 用最直接嘅方式
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        // 移除舊 event
        const newBtn = fullscreenBtn.cloneNode(true);
        fullscreenBtn.parentNode.replaceChild(newBtn, fullscreenBtn);
        // 綁定新 event
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleFullscreen();
        });
        console.log('✅ 全屏按鈕已綁定');
    } else {
        console.error('❌ 找不到全屏按鈕');
    }
}

// ==================== 導航頁籤 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Firebase
    checkFirebase();
    
    // 登入畫面自動填入
    const saved = localStorage.getItem('ms_chem_login');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.userId) {
                document.getElementById('loginUserId').value = data.userId;
            }
        } catch(e) {}
    }
    
    // 頁籤切換
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#practicePanel, #myMistakesPanel, #pastMistakesPanel, #pinnedPanel, #historyPanel, #achievementsPanel, #teacherPanel').forEach(p => p.style.display = 'none');
            const panel = document.getElementById(target + 'Panel');
            if (panel) panel.style.display = 'block';
        });
    });
    
    // 桌面版按鈕
    document.getElementById('desktopPrevBtn')?.addEventListener('click', function() {
        if (currentQIndex > 0) {
            currentQIndex--;
            renderDesktopQuizNav();
            renderDesktopCurrentQuestion();
            updateDesktopNavButtons();
        }
    });
    document.getElementById('desktopNextBtn')?.addEventListener('click', function() {
        if (currentQIndex < currentQuestions.length - 1) {
            currentQIndex++;
            renderDesktopQuizNav();
            renderDesktopCurrentQuestion();
            updateDesktopNavButtons();
        }
    });
    document.getElementById('desktopSubmitBtn')?.addEventListener('click', submitAll);
    document.getElementById('submitAllBtn')?.addEventListener('click', submitAll);
    document.getElementById('prevBtn')?.addEventListener('click', function() {
        if (currentQIndex > 0) {
            currentQIndex--;
            renderQuizNav();
            renderCurrentQuestion();
            updateNavButtons();
        }
    });
    document.getElementById('nextBtn')?.addEventListener('click', function() {
        if (currentQIndex < currentQuestions.length - 1) {
            currentQIndex++;
            renderQuizNav();
            renderCurrentQuestion();
            updateNavButtons();
        }
    });
});