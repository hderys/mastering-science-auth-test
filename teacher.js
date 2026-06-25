// ============================================================
// teacher.js - 老師後台、學生管理、重置密碼
// 依賴：core.js, practice.js, achievement.js（需先載入）
// ============================================================

// ==================== 老師為學生重置密碼 ====================
async function resetStudentPassword(userId) {
    const user = findUser(userId);
    if (!user) {
        alert('❌ 找不到該學生');
        return;
    }
    
    if (!confirm(`⚠️ 確定要重置「${user.name}」（${user.userId}）的密碼嗎？\n\n重置後學生需要使用新密碼登入，並在首次登入時修改密碼。`)) {
        return;
    }
    
    const newPwd = generateRandomPassword();
    
    const result = updateUser(userId, {
        userId: userId,
        initialPassword: newPwd,
        password: null,
        isFirstLogin: true
    });
    
    if (!result) {
        alert('❌ 重置失敗，請稍後再試');
        return;
    }
    
    if (firestoreEnabled) {
        const email = userId + '@mastering-science.com';
        const fbUser = firebase.auth().currentUser;
        
        if (fbUser) {
            try {
                await fbUser.updatePassword(newPwd);
                console.log('✅ Firebase Auth 密碼已更新（重置密碼）');
            } catch (err) {
                console.warn('⚠️ 直接更新失敗，嘗試重新登入:', err.message);
                const oldPwd = user.password || user.initialPassword;
                try {
                    const cred = await firebase.auth().signInWithEmailAndPassword(email, oldPwd);
                    await cred.user.updatePassword(newPwd);
                    console.log('✅ Firebase Auth 密碼已更新（重新登入後）');
                } catch (e) {
                    console.warn('⚠️ 重新登入失敗，嘗試建立帳戶:', e.message);
                    try {
                        await firebase.auth().createUserWithEmailAndPassword(email, newPwd);
                        console.log('✅ Firebase Auth 帳戶已建立');
                    } catch (err2) {
                        console.warn('⚠️ Firebase Auth 建立失敗:', err2.message);
                    }
                }
            }
        } else {
            const oldPwd = user.password || user.initialPassword;
            try {
                const cred = await firebase.auth().signInWithEmailAndPassword(email, oldPwd);
                await cred.user.updatePassword(newPwd);
                console.log('✅ Firebase Auth 密碼已更新');
            } catch (e) {
                console.warn('⚠️ 登入失敗，嘗試建立帳戶:', e.message);
                try {
                    await firebase.auth().createUserWithEmailAndPassword(email, newPwd);
                    console.log('✅ Firebase Auth 帳戶已建立');
                } catch (err2) {
                    console.warn('⚠️ Firebase Auth 建立失敗:', err2.message);
                }
            }
        }
    }
    
    // 顯示新密碼給老師（可複製）
    const modalHtml = `
        <div id="resetPasswordModal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
            z-index: 10000;
        ">
            <div style="
                background: white; border-radius: 24px; padding: 32px; 
                max-width: 420px; width: 90%; text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 48px; margin-bottom: 8px;">✅</div>
                <h2 style="color: #065f46; margin-bottom: 8px;">密碼已重置！</h2>
                <div style="text-align: left; line-height: 2; font-size: 15px;">
                    <div>👤 姓名：<strong>${user.name}</strong></div>
                    <div>🆔 學號：<strong>${user.userId}</strong></div>
                    <div>
                        🔑 新密碼：
                        <span style="font-family: monospace; font-size: 20px; background: #f0f0f0; padding: 2px 12px; border-radius: 6px; display: inline-block;">${newPwd}</span>
                        <button onclick="navigator.clipboard?.writeText('${newPwd}').then(() => alert('✅ 密碼已複製！')).catch(() => alert('⚠️ 請手動複製'))" style="
                            background: #4a1d8c; color: white; border: none; 
                            padding: 2px 14px; border-radius: 20px; cursor: pointer; font-size: 13px;
                        ">📋 複製</button>
                    </div>
                </div>
                <div style="font-size: 13px; color: #f59e0b; margin: 8px 0;">⚠️ 學生下次登入時會被要求修改密碼</div>
                <button onclick="document.getElementById('resetPasswordModal').remove()" style="
                    background: #4a1d8c; color: white; border: none; 
                    padding: 10px 40px; border-radius: 40px; font-size: 16px; cursor: pointer; font-weight: 600;
                ">我知道了</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    renderTeacherPanel();
}

// ==================== 強制修復登入（老師後台） ====================
async function forceFixStudentLogin(userId) {
    const user = findUser(userId);
    if (!user) {
        alert('❌ 找不到該學生');
        return;
    }
    
    if (!confirm(`🔧 確定要修復「${user.name}」（${user.userId}）的登入問題嗎？\n\n系統將會：\n1. 檢查 Firebase Auth 帳戶是否存在\n2. 如果不存在，用初始密碼建立\n3. 如果已存在但密碼不同步，強制更新為初始密碼\n\n這樣學生就可以用初始密碼登入了。`)) {
        return;
    }
    
    const email = userId + '@mastering-science.com';
    const initialPwd = user.initialPassword;
    
    try {
        try {
            await firebase.auth().signInWithEmailAndPassword(email, initialPwd);
            alert(`✅ 帳戶正常！學生可以用初始密碼登入。\n\n👤 ${user.name}（${user.userId}）\n🔑 初始密碼：${initialPwd}`);
            return;
        } catch (e) {
            if (firebase.auth().currentUser) {
                await firebase.auth().signOut();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            if (e.code === 'auth/user-not-found') {
                await firebase.auth().createUserWithEmailAndPassword(email, initialPwd);
                alert(`✅ Firebase Auth 帳戶已建立！\n\n👤 ${user.name}（${user.userId}）\n🔑 初始密碼：${initialPwd}\n\n請學生用此密碼登入。`);
                return;
            } else if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                try {
                    await firebase.auth().signInWithEmailAndPassword(email, initialPwd);
                    alert(`✅ 帳戶已修復！學生可以用初始密碼登入。\n\n👤 ${user.name}（${user.userId}）\n🔑 初始密碼：${initialPwd}`);
                    return;
                } catch (loginErr) {
                    const oldPwd = user.password || user.initialPassword;
                    try {
                        await firebase.auth().signInWithEmailAndPassword(email, oldPwd);
                        const fbUser = firebase.auth().currentUser;
                        if (fbUser) {
                            await fbUser.updatePassword(initialPwd);
                            alert(`✅ Firebase Auth 密碼已修復！\n\n👤 ${user.name}（${user.userId}）\n🔑 初始密碼：${initialPwd}\n\n請學生用此密碼登入。`);
                        }
                        return;
                    } catch (finalErr) {
                        alert(`⚠️ 無法自動修復 ${user.name} 的 Auth 帳戶。\n\n請在 Firebase Console 中手動重設密碼：\n1. 前往 Firebase Console → Authentication\n2. 找到 ${email}\n3. 點擊「重設密碼」\n4. 設定新密碼為：${initialPwd}\n\n完成後學生即可用此密碼登入。`);
                        return;
                    }
                }
            } else {
                throw e;
            }
        }
    } catch (e) {
        console.error('❌ 修復失敗:', e);
        alert(`❌ 修復失敗：${e.message}\n\n請在 Firebase Console 中手動處理。`);
    }
}

// ==================== 老師後台子分頁函數 ====================
let currentSubtab = 'progress';
let currentClass = '';

function switchSubtab(subtabId, className) {
    currentSubtab = subtabId;
    if (className) {
        currentClass = className;
    }
    renderSubtab(currentSubtab, currentClass);
}

function renderSubtab(subtabId, className) {
    const selector = document.getElementById('subtabSelector');
    if (selector) {
        selector.value = subtabId;
    }
    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.subtab === subtabId);
    });
    
    document.querySelectorAll('.subtab-content').forEach(el => {
        el.style.display = 'none';
    });
    
    const target = document.getElementById(`subtab-${subtabId}`);
    if (target) {
        target.style.display = 'block';
    }
    
    switch(subtabId) {
        case 'progress':
            renderSubtabProgress(className);
            break;
        case 'wrong':
            renderSubtabWrong(className);
            break;
        case 'rank':
            renderSubtabRank(className);
            break;
        case 'chapters':
            renderSubtabChapters(className);
            break;
    }
}

// ==================== 子分頁：全班進度 ====================
async function renderSubtabProgress(className) {
    const container = document.getElementById('subtab-progress');
    if (!container) return;
    
    const students = await loadAllStudentsFromFirebase(className);
    
    let totalStudents = students.length;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let topStudent = null;
    let topPoints = 0;
    
    for (const s of students) {
        const stats = s.stats || { totalQuestionsAnswered: 0, totalCorrect: 0 };
        totalQuestions += stats.totalQuestionsAnswered || 0;
        totalCorrect += stats.totalCorrect || 0;
        const points = calculateTotalPoints(s.achievements || {});
        if (points > topPoints) {
            topPoints = points;
            topStudent = s;
        }
    }
    const avgAccuracy = totalQuestions > 0 ? Math.round(totalCorrect / totalQuestions * 100) : 0;
    
    let html = `
        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-number">${totalStudents}</div>
                <div class="stat-label">👨‍🎓 學生</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalQuestions}</div>
                <div class="stat-label">📝 總答題數</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgAccuracy}%</div>
                <div class="stat-label">📊 平均正確率</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${topStudent ? topStudent.name : '-'}</div>
                <div class="stat-label">🏆 榜首（${topPoints}分）</div>
            </div>
        </div>
    `;
    
    html += `<div style="margin-top:12px; overflow-x:auto;">
        <table class="student-table">
            <thead>
                <tr>
                    <th>姓名</th>
                    <th>學號</th>
                    <th>總題數</th>
                    <th>正確率</th>
                    <th>狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>`;
    
    if (students.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; color:#999; padding:20px;">還沒有學生帳戶</td></tr>`;
    } else {
        for (const s of students) {
            const stats = s.stats || { totalQuestionsAnswered: 0, totalCorrect: 0 };
            const total = stats.totalQuestionsAnswered || 0;
            const acc = total > 0 ? Math.round((stats.totalCorrect || 0) / total * 100) : 0;
            const status = s.isFirstLogin ? '⏳ 尚未修改密碼' : '✅ 已修改密碼';
            const statusColor = s.isFirstLogin ? '#f59e0b' : '#10b981';
            html += `
                <tr>
                    <td>
                        <button class="btn-link" onclick="showStudentDetail('${s.userId}')" style="background:none; border:none; color:#4a1d8c; cursor:pointer; font-weight:600; font-size:0.85rem;">
                            ${s.name}
                        </button>
                        <button class="btn-icon" onclick="openEditNameModal('${s.userId}')" style="font-size:12px;" title="修改姓名">✏️</button>
                    </td>
                    <td>${s.userId}</td>
                    <td>${total}</td>
                    <td style="font-weight:600; color:${acc >= 70 ? '#10b981' : (acc >= 40 ? '#f59e0b' : '#dc2626')};">${acc}%</td>
                    <td><span style="background:${statusColor}; color:white; padding:2px 12px; border-radius:12px; font-size:11px;">${status}</span></td>
                    <td>
                        <button class="btn btn-small" onclick="showStudentPassword('${s.userId}')" style="background:#f59e0b; padding:2px 8px; font-size:10px; color:white; border:none; border-radius:12px;">🔑</button>
                        <button class="btn btn-small" onclick="resetStudentPassword('${s.userId}')" style="background:#7c3aed; padding:2px 8px; font-size:10px; color:white; border:none; border-radius:12px;">🔄</button>
                        <button class="btn btn-small" onclick="forceFixStudentLogin('${s.userId}')" style="background:#dc2626; padding:2px 8px; font-size:10px; color:white; border:none; border-radius:12px;">🔧</button>
                        <button class="btn btn-danger btn-small" onclick="deleteStudent('${s.userId}')" style="font-size:10px; padding:2px 8px;">🗑️</button>
                    </td>
                </tr>
            `;
        }
    }
    html += `</tbody></table></div>`;
    
    html += `
        <div style="margin-top:12px;">
            <button class="btn btn-primary" id="exportClassDataBtn" style="padding:8px 16px; font-size:13px;">📥 匯出全班成績 CSV</button>
        </div>
    `;
    
    container.innerHTML = html;
    
    document.getElementById('exportClassDataBtn')?.addEventListener('click', async function() {
        const students = await loadAllStudentsFromFirebase(className);
        if (students.length === 0) {
            alert('⚠️ 該班級沒有學生數據');
            return;
        }
        let csv = [["姓名", "學號", "總題數", "正確率", "總積分", "狀態"]];
        for (const s of students) {
            const stats = s.stats || { totalQuestionsAnswered: 0, totalCorrect: 0 };
            const total = stats.totalQuestionsAnswered || 0;
            const acc = total > 0 ? Math.round((stats.totalCorrect || 0) / total * 100) : 0;
            const points = calculateTotalPoints(s.achievements || {});
            const status = s.isFirstLogin ? '尚未修改密碼' : '已修改密碼';
            csv.push([s.name, s.userId, total, acc + '%', points, status]);
        }
        const blob = new Blob(["\uFEFF" + csv.map(r => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `全班成績_${className}_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

// ==================== 子分頁：錯題統計 ====================
async function renderSubtabWrong(className) {
    const container = document.getElementById('subtab-wrong');
    if (!container) return;
    
    const students = await loadAllStudentsFromFirebase(className);
    
    const wrongCount = {};
    for (const s of students) {
        const attempts = s.allAttempts || [];
        for (const att of attempts) {
            if (!att.isCorrect) {
                wrongCount[att.qid] = (wrongCount[att.qid] || 0) + 1;
            }
        }
    }
    
    const sortedWrong = Object.entries(wrongCount).sort((a, b) => b[1] - a[1]);
    
    let html = `<h3 style="margin-bottom:8px;">❌ 錯題統計（${className}）</h3>`;
    
    if (sortedWrong.length === 0) {
        html += `<div style="text-align:center; color:#999; padding:20px 0;">🎉 全班沒有錯題！繼續保持！</div>`;
    } else {
        let qTexts = {};
        for (let u in window.ALL_UNITS) {
            for (let c in window.ALL_UNITS[u].chapters) {
                for (let q of window.ALL_UNITS[u].chapters[c].questions) {
                    qTexts[q.id] = q.text;
                }
            }
        }
        html += `<div style="overflow-x:auto;">
            <table class="wrong-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>題目</th>
                        <th>錯誤人數</th>
                    </tr>
                </thead>
                <tbody>`;
        let rank = 1;
        for (const [qid, count] of sortedWrong) {
            const text = qTexts[qid] || qid;
            const shortText = text.length > 60 ? text.substring(0, 60) + '...' : text;
            html += `
                <tr>
                    <td>${rank}</td>
                    <td>${shortText}</td>
                    <td style="font-weight:600; color:#dc2626;">${count} 人</td>
                </tr>
            `;
            rank++;
        }
        html += `</tbody></table></div>`;
    }
    
    container.innerHTML = html;
}

// ==================== 子分頁：排名（積分榜） ====================
async function renderSubtabRank(className) {
    const container = document.getElementById('subtab-rank');
    if (!container) return;
    
    const students = await loadAllStudentsFromFirebase(className);
    
    const ranked = [...students].sort((a, b) => {
        const aPoints = calculateTotalPoints(a.achievements || {});
        const bPoints = calculateTotalPoints(b.achievements || {});
        return bPoints - aPoints;
    });
    
    let html = `<h3 style="margin-bottom:8px;">🏆 班級積分榜（${className}）</h3>`;
    
    if (ranked.length === 0) {
        html += `<div style="text-align:center; color:#999; padding:20px 0;">暫無數據</div>`;
    } else {
        let totalPoints = 0;
        let maxPoints = 0;
        let maxStudent = '';
        for (const s of ranked) {
            const points = calculateTotalPoints(s.achievements || {});
            totalPoints += points;
            if (points > maxPoints) {
                maxPoints = points;
                maxStudent = s.name;
            }
        }
        const avgPoints = Math.round(totalPoints / ranked.length);
        
        html += `
            <div class="rank-stats">
                <span>📊 班級平均：${avgPoints} 分</span>
                <span>👑 最高：${maxStudent}（${maxPoints} 分）</span>
            </div>
            <div style="overflow-x:auto; margin-top:12px;">
                <table class="rank-table">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>姓名</th>
                            <th>積分</th>
                            <th>成就數</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        const medals = ['🥇', '🥈', '🥉'];
        for (let i = 0; i < ranked.length; i++) {
            const s = ranked[i];
            const points = calculateTotalPoints(s.achievements || {});
            const medal = i < 3 ? medals[i] : `${i+1}`;
            const isCurrentUser = s.userId === currentUser.id;
            const rowStyle = isCurrentUser ? 'background:#ede9fe; font-weight:bold;' : '';
            const achievementCount = Object.keys(s.achievements || {}).filter(k => s.achievements[k]?.unlocked).length;
            html += `
                <tr style="${rowStyle}">
                    <td>${medal}</td>
                    <td>${s.name}${isCurrentUser ? ' 📍' : ''}</td>
                    <td style="font-weight:600; color:${isCurrentUser ? '#4a1d8c' : '#2e0f5a'};">${points}</td>
                    <td>${achievementCount}</td>
                </tr>
            `;
        }
        html += `</tbody></table></div>`;
    }
    
    container.innerHTML = html;
}

// ==================== 子分頁：章節管理 ====================
async function renderSubtabChapters(className) {
    const container = document.getElementById('subtab-chapters');
    if (!container) return;
    
    const classSettings = await loadClassSettings(className) || {};
    const openChapters = classSettings.openChapters || [];
    
    let html = `
        <h3 style="margin-bottom:8px;">📖 章節開放管理（${className}）</h3>
        <div style="font-size:13px; color:#666; margin-bottom:10px;">
            🟢 已開放　　　🔴 已隱藏
        </div>
        <div id="chapterManagement">
    `;
    
    const unitChapters = {};
    for (let u in window.ALL_UNITS) {
        unitChapters[u] = [];
        for (let ch in window.ALL_UNITS[u].chapters) {
            const chNum = parseInt(ch);
            unitChapters[u].push({
                id: chNum,
                name: window.ALL_UNITS[u].chapters[ch].name,
                unitName: window.ALL_UNITS[u].name
            });
        }
        unitChapters[u].sort((a, b) => a.id - b.id);
    }
    
    for (let u in unitChapters) {
        if (unitChapters[u].length === 0) continue;
        const unitName = unitChapters[u][0].unitName;
        const shortUnitName = unitName.replace(/（[^）]*）/, '');
        html += `
            <div class="chapter-unit-group">
                <div class="chapter-unit-header" onclick="toggleChapterUnit('${u}')">
                    <span class="unit-toggle" id="ch-unit-toggle-${u}">▼</span>
                    <span>${shortUnitName}</span>
                    <span style="font-size:11px; color:#999;">(${unitChapters[u].length} 章)</span>
                </div>
                <div class="chapter-unit-content" id="ch-unit-${u}">
        `;
        for (const ch of unitChapters[u]) {
            const isOpen = openChapters.includes(ch.id);
            html += `
                <div class="chapter-item">
                    <input type="checkbox" id="ch_${ch.id}" ${isOpen ? 'checked' : ''} data-chapter="${ch.id}">
                    <span class="chapter-status-dot ${isOpen ? 'open' : 'locked'}"></span>
                    <label for="ch_${ch.id}" class="chapter-label">${ch.name}</label>
                    <span class="chapter-status-text ${isOpen ? 'open' : 'locked'}">
                        ${isOpen ? '已開放' : '已隱藏'}
                    </span>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    html += `
        </div>
        <button class="btn btn-success" id="saveChaptersBtn" style="margin-top:12px; padding:8px 16px; font-size:13px;">💾 儲存章節設定</button>
        <div id="chapterSaveResult" class="mt-8"></div>
    `;
    
    container.innerHTML = html;
    
    document.getElementById('saveChaptersBtn')?.addEventListener('click', async function() {
        const checkboxes = document.querySelectorAll('#chapterManagement input[type="checkbox"]');
        const openChapters = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                openChapters.push(parseInt(cb.dataset.chapter));
            }
        });
        await saveClassSettings(className, { openChapters: openChapters });
        const resultEl = document.getElementById('chapterSaveResult');
        resultEl.innerHTML = `<div class="alert alert-success">✅ 章節設定已儲存！請提醒學生重新整理頁面以看到變化。</div>`;
        setTimeout(() => {
            resultEl.innerHTML = '';
        }, 3000);
    });
}

function toggleChapterUnit(unitId) {
    const content = document.getElementById(`ch-unit-${unitId}`);
    const toggle = document.getElementById(`ch-unit-toggle-${unitId}`);
    if (content) {
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            if (toggle) toggle.textContent = '▼';
        } else {
            content.classList.add('collapsed');
            if (toggle) toggle.textContent = '▶';
        }
    }
}

// ==================== 老師查看個別學生詳情 ====================
async function showStudentDetail(userId) {
    const user = findUser(userId);
    if (!user) {
        alert('❌ 找不到該學生');
        return;
    }
    
    let studentData = { ...user };
    
    try {
        const raw = localStorage.getItem(`ms_chem_${userId}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            studentData = { ...studentData, ...parsed };
        }
        if (firestoreEnabled) {
            const cloudData = await loadFromFirestore('users', userId);
            if (cloudData) {
                studentData = { ...studentData, ...cloudData };
            }
        }
    } catch(e) {
        console.warn('⚠️ 載入學生數據失敗:', e);
    }
    
    const stats = studentData.stats || { totalQuestionsAnswered: 0, totalCorrect: 0 };
    const total = stats.totalQuestionsAnswered || 0;
    const correct = stats.totalCorrect || 0;
    const acc = total > 0 ? Math.round(correct / total * 100) : 0;
    const points = calculateTotalPoints(studentData.achievements || {});
    
    let rankInfo = { rank: 0, total: 0 };
    try {
        rankInfo = await calculateClassRank(userId, points);
    } catch(e) {}
    
    let chapterProgress = [];
    for (let u in window.ALL_UNITS) {
        for (let ch in window.ALL_UNITS[u].chapters) {
            const questions = window.ALL_UNITS[u].chapters[ch].questions;
            let correct = 0;
            for (const q of questions) {
                if (studentData.latestStatus && studentData.latestStatus[q.id] === true) {
                    correct++;
                }
            }
            const progress = questions.length > 0 ? Math.round(correct / questions.length * 100) : 0;
            chapterProgress.push({
                unitName: window.ALL_UNITS[u].name,
                chapterName: window.ALL_UNITS[u].chapters[ch].name,
                chapterNum: parseInt(ch),
                progress: progress,
                total: questions.length,
                correct: correct
            });
        }
    }
    chapterProgress.sort((a, b) => a.chapterNum - b.chapterNum);
    
    const achievements = studentData.achievements || {};
    const unlockedAchievements = [];
    const lockedAchievements = [];
    const specialAchievements = [
        { id: 'firstPractice', name: '初試啼聲', icon: '🎯', unlocked: achievements.firstPractice?.unlocked || false },
        { id: 'tenQuestions', name: '十題達人', icon: '📝', unlocked: achievements.tenQuestions?.unlocked || false },
        { id: 'fiveHundred', name: '百題斬', icon: '⚔️', unlocked: achievements.fiveHundred?.unlocked || false },
        { id: 'thousand', name: '千題之王', icon: '👑', unlocked: achievements.thousand?.unlocked || false },
        { id: 'perfectLesson', name: '完美一課', icon: '🌟', unlocked: achievements.perfectLesson?.unlocked || false },
        { id: 'dseComplete', name: 'DSE模擬完成', icon: '📝', unlocked: achievements.dseComplete?.unlocked || false },
        { id: 'speedStar', name: '速度之星', icon: '⚡', unlocked: achievements.speedStar?.unlocked || false },
        { id: 'consecutive20', name: '連續答對王', icon: '🔥', unlocked: achievements.consecutive20?.unlocked || false },
        { id: 'allChaptersMaster', name: '全科目制霸', icon: '🏆', unlocked: achievements.allChaptersMaster?.unlocked || false },
        { id: 'fiveStarStreak', name: '五星連珠', icon: '⭐', unlocked: achievements.fiveStarStreak?.unlocked || false },
        { id: 'mistakeEraser', name: '錯題剋星', icon: '🗑️', unlocked: achievements.mistakeEraser?.unlocked || false },
        { id: 'collector', name: '收藏家', icon: '📚', unlocked: achievements.collector?.unlocked || false },
        { id: 'weekChallenge', name: '一週挑戰', icon: '📅', unlocked: achievements.weekChallenge?.unlocked || false },
    ];
    
    for (const ach of specialAchievements) {
        if (ach.unlocked) {
            unlockedAchievements.push(ach);
        } else {
            lockedAchievements.push(ach);
        }
    }
    
    const wrongQuestions = [];
    if (studentData.latestStatus) {
        for (let u in window.ALL_UNITS) {
            for (let c in window.ALL_UNITS[u].chapters) {
                for (const q of window.ALL_UNITS[u].chapters[c].questions) {
                    if (studentData.latestStatus[q.id] === false) {
                        wrongQuestions.push(q);
                    }
                }
            }
        }
    }
    
    const lastUpdated = studentData.lastUpdated || studentData.createdAt || '未記錄';
    
    const modalHtml = `
        <div id="studentDetailModal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
            z-index: 10000; animation: fadeIn 0.3s ease;
        ">
            <div style="
                background: white; border-radius: 24px; padding: 24px 28px; 
                max-width: 700px; width: 95%; max-height: 90vh; overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; border-bottom:2px solid #e9e4f5; padding-bottom:12px;">
                    <div>
                        <h2 style="color:#2e0f5a; margin:0;">👤 ${user.name}</h2>
                        <div style="color:#888; font-size:0.85rem;">🆔 ${user.userId}  |  📚 ${user.className}</div>
                        <div style="color:#999; font-size:0.7rem; margin-top:2px;">🕐 最後更新：${lastUpdated}</div>
                    </div>
                    <button onclick="document.getElementById('studentDetailModal').remove()" style="
                        background:none; border:none; font-size:1.8rem; cursor:pointer; color:#999; padding:0 8px;
                    ">✕</button>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; margin-bottom:16px;">
                    <div style="background:#f9f7ff; border-radius:12px; padding:10px; text-align:center; border:1px solid #e9e4f5;">
                        <div style="font-size:1.2rem; font-weight:700; color:#4a1d8c;">${total}</div>
                        <div style="font-size:0.6rem; color:#888;">總題數</div>
                    </div>
                    <div style="background:#f9f7ff; border-radius:12px; padding:10px; text-align:center; border:1px solid #e9e4f5;">
                        <div style="font-size:1.2rem; font-weight:700; color:${acc >= 70 ? '#10b981' : (acc >= 40 ? '#f59e0b' : '#dc2626')};">${acc}%</div>
                        <div style="font-size:0.6rem; color:#888;">正確率</div>
                    </div>
                    <div style="background:#f9f7ff; border-radius:12px; padding:10px; text-align:center; border:1px solid #e9e4f5;">
                        <div style="font-size:1.2rem; font-weight:700; color:#4a1d8c;">${points}</div>
                        <div style="font-size:0.6rem; color:#888;">總積分</div>
                    </div>
                    <div style="background:#f9f7ff; border-radius:12px; padding:10px; text-align:center; border:1px solid #e9e4f5;">
                        <div style="font-size:1.2rem; font-weight:700; color:#4a1d8c;">#${rankInfo.rank} / ${rankInfo.total}</div>
                        <div style="font-size:0.6rem; color:#888;">班級排名</div>
                    </div>
                </div>
                
                <div style="margin-bottom:16px;">
                    <h3 style="font-size:0.9rem; color:#2e0f5a; margin-bottom:6px;">📖 章節進度</h3>
                    <div style="max-height:200px; overflow-y:auto;">
                        ${chapterProgress.map(ch => `
                            <div style="display:flex; align-items:center; gap:8px; padding:3px 0;">
                                <span style="font-size:0.7rem; color:#888; min-width:40px;">Ch.${ch.chapterNum}</span>
                                <span style="font-size:0.7rem; flex:1;">${ch.chapterName}</span>
                                <div style="width:80px; height:6px; background:#ddd; border-radius:10px; overflow:hidden;">
                                    <div style="height:100%; width:${ch.progress}%; background:${ch.progress >= 80 ? '#10b981' : (ch.progress >= 40 ? '#f59e0b' : '#dc2626')}; border-radius:10px;"></div>
                                </div>
                                <span style="font-size:0.6rem; color:#888; min-width:35px;">${ch.progress}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="margin-bottom:16px;">
                    <h3 style="font-size:0.9rem; color:#2e0f5a; margin-bottom:6px;">🏆 已獲得成就 (${unlockedAchievements.length}/${unlockedAchievements.length + lockedAchievements.length})</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${unlockedAchievements.map(ach => `
                            <span style="font-size:0.7rem; background:#d4edda; padding:2px 10px; border-radius:20px;">${ach.icon} ${ach.name}</span>
                        `).join('')}
                        ${lockedAchievements.slice(0, 5).map(ach => `
                            <span style="font-size:0.7rem; background:#f5f5f5; color:#999; padding:2px 10px; border-radius:20px;">🔒 ${ach.name}</span>
                        `).join('')}
                        ${lockedAchievements.length > 5 ? `<span style="font-size:0.7rem; color:#999;">+${lockedAchievements.length - 5} 更多</span>` : ''}
                    </div>
                </div>
                
                <div>
                    <h3 style="font-size:0.9rem; color:#2e0f5a; margin-bottom:6px;">❌ 錯題本 (${wrongQuestions.length} 題)</h3>
                    ${wrongQuestions.length === 0 ? '<div style="color:#999; font-size:0.7rem;">🎉 沒有錯題！</div>' : ''}
                    <div style="max-height:100px; overflow-y:auto; font-size:0.7rem;">
                        ${wrongQuestions.slice(0, 5).map(q => `
                            <div style="padding:2px 0; border-bottom:1px solid #f0edf8;">${q.text}</div>
                        `).join('')}
                        ${wrongQuestions.length > 5 ? `<div style="color:#999; font-size:0.6rem;">+${wrongQuestions.length - 5} 更多錯題</div>` : ''}
                    </div>
                </div>
                
                <div style="margin-top:16px; text-align:center;">
                    <button onclick="document.getElementById('studentDetailModal').remove()" style="
                        background:#4a1d8c; color:white; border:none; padding:8px 32px; border-radius:40px; font-size:0.9rem; cursor:pointer;
                    ">關閉</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== renderTeacherPanel ====================
async function renderTeacherPanel() {
    const container = document.getElementById('teacherPanel');
    if (!container) return;
    if (!currentUser || !currentUser.isTeacher) {
        container.innerHTML = '<div class="card">⚠️ 只有老師可以查看此頁面</div>';
        return;
    }
    
    if (!currentUser.managedClasses) {
        currentUser.managedClasses = [currentUser.className];
        updateUser(currentUser.userId, { managedClasses: currentUser.managedClasses });
    }
    
    const managedClasses = currentUser.managedClasses || [currentUser.className];
    if (!currentClass) {
        currentClass = currentUser.currentClass || currentUser.className;
    }
    
    let html = `
        <div class="card teacher-settings">
            <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:12px; font-weight:500; color:#2e0f5a;">👤 教師：</label>
                    <span style="font-weight:600;">${currentUser.name}</span>
                    <button class="btn btn-small" onclick="openEditNameModal('${currentUser.userId}')" style="font-size:11px; padding:0 8px;">✏️</button>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:12px; font-weight:500; color:#2e0f5a;">📚 班級：</label>
                    <select id="teacherClassSelector" style="padding:4px 10px; border-radius:16px; border:2px solid #e0d6f5; font-size:13px; background:white;">
                        ${managedClasses.map(c => `<option value="${c}" ${c === currentClass ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                    <button class="btn btn-small" id="manageClassesBtn" style="font-size:11px; padding:2px 10px;">切換班級</button>
                </div>
            </div>
            <div style="margin-top:6px; font-size:12px; color:#888;">
                💡 管理班級：${managedClasses.join('、')}
            </div>
        </div>
        
        <div class="card">
            <div class="collapsible-header" onclick="toggleCollapsible('createStudentPanel')">
                <span>📝 建立學生帳戶</span>
                <span class="collapse-arrow" id="createStudentArrow">▼</span>
            </div>
            <div id="createStudentPanel" class="collapsible-content">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-size:12px; font-weight:500; color:#2e0f5a;">姓名</label>
                        <input type="text" id="teacherNewName" placeholder="陳小明" style="width:100%; padding:6px 10px; border-radius:10px; border:2px solid #e0d6f5; font-size:13px; outline:none;">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:500; color:#2e0f5a;">學號（可自訂）</label>
                        <input type="text" id="teacherNewId" placeholder="留空自動產生" style="width:100%; padding:6px 10px; border-radius:10px; border:2px solid #e0d6f5; font-size:13px; outline:none;">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:500; color:#2e0f5a;">班級</label>
                        <input type="text" id="teacherNewClass" placeholder="3A" style="width:100%; padding:6px 10px; border-radius:10px; border:2px solid #e0d6f5; font-size:13px; outline:none;" value="${currentClass}">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:500; color:#2e0f5a;">電話號碼</label>
                        <input type="text" id="teacherNewPhone" placeholder="91234567" style="width:100%; padding:6px 10px; border-radius:10px; border:2px solid #e0d6f5; font-size:13px; outline:none;">
                    </div>
                </div>
                <button class="btn btn-primary" id="teacherCreateStudentBtn" style="padding:6px 16px; font-size:13px;">✅ 建立帳戶</button>
                <div id="teacherCreateResult" class="mt-8"></div>
            </div>
        </div>
        
        <div class="teacher-subtabs">
            <div class="subtab-tabs desktop-tabs">
                <button class="sub-tab active" data-subtab="progress" onclick="switchSubtab('progress', '${currentClass}')">📊 全班進度</button>
                <button class="sub-tab" data-subtab="wrong" onclick="switchSubtab('wrong', '${currentClass}')">❌ 錯題統計</button>
                <button class="sub-tab" data-subtab="rank" onclick="switchSubtab('rank', '${currentClass}')">🏆 排名</button>
                <button class="sub-tab" data-subtab="chapters" onclick="switchSubtab('chapters', '${currentClass}')">📖 章節管理</button>
            </div>
            <div class="subtab-select-wrapper mobile-select">
                <select id="subtabSelector" class="subtab-select" onchange="switchSubtab(this.value, '${currentClass}')">
                    <option value="progress">📊 全班進度</option>
                    <option value="wrong">❌ 錯題統計</option>
                    <option value="rank">🏆 排名</option>
                    <option value="chapters">📖 章節管理</option>
                </select>
            </div>
        </div>
        
        <div id="subtab-progress" class="subtab-content"></div>
        <div id="subtab-wrong" class="subtab-content" style="display:none;"></div>
        <div id="subtab-rank" class="subtab-content" style="display:none;"></div>
        <div id="subtab-chapters" class="subtab-content" style="display:none;"></div>
    `;
    
    container.innerHTML = html;
    bindTeacherEvents();
    renderSubtab('progress', currentClass);
}

function bindTeacherEvents() {
    document.getElementById('teacherClassSelector')?.addEventListener('change', function() {
        const newClass = this.value;
        currentClass = newClass;
        updateUser(currentUser.userId, { currentClass: newClass });
        renderSubtab(currentSubtab, newClass);
        const selector = document.getElementById('subtabSelector');
        if (selector) {
            selector.setAttribute('onchange', `switchSubtab(this.value, '${newClass}')`);
        }
        document.querySelectorAll('.sub-tab').forEach(tab => {
            const subtab = tab.dataset.subtab;
            tab.setAttribute('onclick', `switchSubtab('${subtab}', '${newClass}')`);
        });
    });
    
    document.getElementById('teacherCreateStudentBtn')?.addEventListener('click', async function() {
        const customId = document.getElementById('teacherNewId').value.trim() || null;
        const name = document.getElementById('teacherNewName').value.trim();
        const className = document.getElementById('teacherNewClass').value.trim() || currentClass;
        const phone = document.getElementById('teacherNewPhone').value.trim();
        const resultEl = document.getElementById('teacherCreateResult');
        
        if (!name || !phone) {
            resultEl.innerHTML = `<div class="alert alert-danger">⚠️ 請填寫姓名和電話號碼</div>`;
            return;
        }
        
        try {
            const newUser = await createUser(name, className, phone, customId);
            
            document.getElementById('teacherNewId').value = '';
            document.getElementById('teacherNewName').value = '';
            document.getElementById('teacherNewPhone').value = '';
            
            const loginUrl = 'https://mastering-science-chem.pages.dev';
            const modalHtml = `
                <div id="createSuccessModal" style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
                    z-index: 10000;
                ">
                    <div style="
                        background: white; border-radius: 24px; padding: 32px; 
                        max-width: 420px; width: 90%; text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    ">
                        <div style="font-size: 48px; margin-bottom: 8px;">✅</div>
                        <h2 style="color: #065f46; margin-bottom: 12px;">帳戶已建立！</h2>
                        <div style="text-align: left; line-height: 2.2; font-size: 15px;">
                            <div>👤 姓名：<strong>${newUser.name}</strong></div>
                            <div>🆔 學號：<strong style="font-size: 20px; color: #4a1d8c;">${newUser.userId}</strong></div>
                            <div>
                                🔑 密碼：
                                <span style="font-family: monospace; font-size: 20px; background: #f0f0f0; padding: 2px 12px; border-radius: 6px; display: inline-block;">${newUser.initialPassword}</span>
                                <button onclick="navigator.clipboard?.writeText('${newUser.initialPassword}').then(() => alert('✅ 密碼已複製！')).catch(() => alert('⚠️ 請手動複製'))" style="
                                    background: #4a1d8c; color: white; border: none; 
                                    padding: 2px 14px; border-radius: 20px; cursor: pointer; font-size: 13px;
                                ">📋 複製</button>
                            </div>
                            <div style="margin-top:4px;">
                                🔗 登入網址：
                                <span style="font-size: 13px; color: #4a1d8c; word-break: break-all;">${loginUrl}</span>
                                <button onclick="navigator.clipboard?.writeText('${loginUrl}').then(() => alert('✅ 網址已複製！')).catch(() => alert('⚠️ 請手動複製'))" style="
                                    background: #4a1d8c; color: white; border: none; 
                                    padding: 2px 14px; border-radius: 20px; cursor: pointer; font-size: 13px;
                                ">📋 複製</button>
                            </div>
                        </div>
                        <div style="font-size: 13px; color: #f59e0b; margin: 8px 0;">⚠️ 學生第一次登入時會要求修改密碼</div>
                        <button onclick="document.getElementById('createSuccessModal').remove()" style="
                            background: #4a1d8c; color: white; border: none; 
                            padding: 10px 40px; border-radius: 40px; font-size: 16px; cursor: pointer; font-weight: 600;
                        ">我知道了</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            renderTeacherPanel();
        } catch (e) {
            resultEl.innerHTML = `<div class="alert alert-danger">❌ 建立失敗：${e.message}</div>`;
        }
    });
    
    document.getElementById('manageClassesBtn')?.addEventListener('click', function() {
        const currentClasses = currentUser.managedClasses || [currentUser.className];
        const input = prompt('請輸入您要管理的班級（用逗號分隔）：\n例如：3A,3B,3C', currentClasses.join(','));
        if (input !== null) {
            const classes = input.split(',').map(s => s.trim()).filter(Boolean);
            if (classes.length === 0) { alert('至少需要一個班級'); return; }
            updateUser(currentUser.userId, { managedClasses: classes });
            currentUser = findUser(currentUser.userId);
            renderTeacherPanel();
            alert('✅ 班級管理已更新！');
        }
    });
}

// ==================== 顯示學生密碼 ====================
function showStudentPassword(userId) {
    const user = findUser(userId);
    if (!user) {
        alert('❌ 找不到該學生');
        return;
    }
    const password = user.initialPassword || '（已修改密碼）';
    
    const modalHtml = `
        <div id="passwordModal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;
            z-index: 10000;
        ">
            <div style="
                background: white; border-radius: 24px; padding: 32px; 
                max-width: 420px; width: 90%; text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 36px; margin-bottom: 8px;">🔑</div>
                <h2 style="color: #2e0f5a; margin-bottom: 4px;">學生初始密碼</h2>
                <div style="color: #888; font-size: 14px; margin-bottom: 16px;">${user.name}（${user.userId}）</div>
                <div style="
                    font-family: monospace; font-size: 24px; 
                    background: #f0f0f0; padding: 12px 20px; border-radius: 8px;
                    display: inline-block; margin-bottom: 16px;
                    letter-spacing: 2px;
                ">${password}</div>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="navigator.clipboard?.writeText('${password}').then(() => alert('✅ 密碼已複製！')).catch(() => alert('⚠️ 請手動複製'))" style="
                        background: #4a1d8c; color: white; border: none; 
                        padding: 8px 24px; border-radius: 40px; font-size: 14px; cursor: pointer;
                    ">📋 複製密碼</button>
                    <button onclick="document.getElementById('passwordModal').remove()" style="
                        background: white; color: #666; border: 1px solid #ddd; 
                        padding: 8px 24px; border-radius: 40px; font-size: 14px; cursor: pointer;
                    ">關閉</button>
                </div>
                <div style="font-size: 12px; color: #f59e0b; margin-top: 12px;">⚠️ 如果學生已修改過密碼，這個密碼可能已經無效</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== 修改學生姓名 ====================
function openEditNameModal(userId) {
    const user = findUser(userId);
    if (!user) return;
    const newName = prompt(`修改「${user.name}」的姓名：`, user.name);
    if (newName && newName.trim() !== '' && newName.trim() !== user.name) {
        updateUser(userId, { name: newName.trim() });
        renderTeacherPanel();
        if (currentUser && currentUser.userId === userId) {
            currentUser = findUser(userId);
            updateUserLabel();
        }
    }
}

// ==================== 刪除學生 ====================
function deleteStudent(userId) {
    if (userId === currentUser?.userId) {
        alert('⚠️ 無法刪除自己的帳戶');
        return;
    }
    const user = findUser(userId);
    if (!user) return;
    if (confirm(`⚠️ 確定要刪除「${user.name}」（${user.userId}）的帳戶嗎？`)) {
        const db = getUsers();
        db.users = db.users.filter(u => u.userId !== userId);
        saveUsers(db);
        renderTeacherPanel();
    }
}

console.log('✅ teacher.js 已載入（老師後台 + 學生管理）');