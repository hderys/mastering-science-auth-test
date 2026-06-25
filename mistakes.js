// ============================================================
// mistakes.js - 錯題本 + 錯題歷程
// 依賴：core.js, practice.js（需先載入）
// ============================================================

// ==================== 取得當前錯題（按章節分組） ====================
function getCurrentWrongByChapter() {
    let wrongByChapter = {};
    for (let u in window.ALL_UNITS) {
        for (let c in window.ALL_UNITS[u].chapters) {
            for (let q of window.ALL_UNITS[u].chapters[c].questions) {
                if (userData.latestStatus[q.id] === false) {
                    if (!wrongByChapter[c]) wrongByChapter[c] = [];
                    wrongByChapter[c].push({ 
                        ...q, 
                        chapterName: window.ALL_UNITS[u].chapters[c].name 
                    });
                }
            }
        }
    }
    return wrongByChapter;
}

// ==================== 取得錯題歷程（按章節分組） ====================
function getPastWrongByChapter() {
    const wrongQids = new Set();
    for (let att of userData.allAttempts) {
        if (!att.isCorrect) wrongQids.add(att.qid);
    }
    let pastByChapter = {};
    for (let u in window.ALL_UNITS) {
        for (let c in window.ALL_UNITS[u].chapters) {
            for (let q of window.ALL_UNITS[u].chapters[c].questions) {
                if (wrongQids.has(q.id)) {
                    if (!pastByChapter[c]) pastByChapter[c] = [];
                    pastByChapter[c].push({ 
                        ...q, 
                        chapterName: window.ALL_UNITS[u].chapters[c].name 
                    });
                }
            }
        }
    }
    return pastByChapter;
}

// ==================== 渲染「我的錯題」 ====================
function renderMyMistakes() {
    let wrongByChapter = getCurrentWrongByChapter();
    let container = document.getElementById('myMistakesPanel');
    
    if (Object.keys(wrongByChapter).length === 0) {
        container.innerHTML = '<div class="card">✨ 目前沒有錯題</div>';
        return;
    }
    
    let html = '<div class="card"><h3>我的錯題</h3>';
    for (let ch in wrongByChapter) {
        html += `<div class="mistake-chapter-group">
            <div class="mistake-chapter-header" onclick="toggleMistakeChapter('${ch}','my')">
                <span>📖 ${wrongByChapter[ch][0].chapterName}</span>
                <span class="unit-toggle" id="my-toggle-${ch}">▶</span>
            </div>
            <div class="mistake-questions" id="my-${ch}">`;
        for (let q of wrongByChapter[ch]) {
            let isFav = userData.favorites.includes(q.id);
            html += `<div class="mistake-question-item">
                <span>${q.text}</span>
                <div>
                    <button class="btn-icon star" data-qid="${q.id}" style="color:${isFav ? '#fbbf24' : '#ccc'}">★</button>
                    <button class="btn-icon redo-q" data-qid="${q.id}" data-source="myMistakes">🔄</button>
                </div>
            </div>`;
        }
        html += `</div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    
    attachMistakeEvents();
}

// ==================== 渲染「錯題歷程」 ====================
function renderPastMistakes() {
    let pastByChapter = getPastWrongByChapter();
    let container = document.getElementById('pastMistakesPanel');
    
    if (Object.keys(pastByChapter).length === 0) {
        container.innerHTML = '<div class="card">📭 尚無錯題歷程</div>';
        return;
    }
    
    let html = '<div class="card"><h3>錯題歷程</h3>';
    for (let ch in pastByChapter) {
        html += `<div class="mistake-chapter-group">
            <div class="mistake-chapter-header" onclick="toggleMistakeChapter('${ch}','past')">
                <span>📖 ${pastByChapter[ch][0].chapterName}</span>
                <span class="unit-toggle" id="past-toggle-${ch}">▶</span>
            </div>
            <div class="mistake-questions" id="past-${ch}">`;
        for (let q of pastByChapter[ch]) {
            let isFav = userData.favorites.includes(q.id);
            html += `<div class="mistake-question-item">
                <span>${q.text}</span>
                <div>
                    <button class="btn-icon star" data-qid="${q.id}" style="color:${isFav ? '#fbbf24' : '#ccc'}">★</button>
                    <button class="btn-icon redo-q" data-qid="${q.id}" data-source="pastMistakes">🔄</button>
                    <button class="btn-icon remove-q" data-qid="${q.id}" style="color:#dc2626;" title="移除該題">🗑️</button>
                </div>
            </div>`;
        }
        html += `</div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    
    attachMistakeEvents();
    attachRemoveEvents();
}

// ==================== 渲染「收藏」 ====================
function renderPinned() {
    let container = document.getElementById('pinnedPanel');
    
    if (userData.favorites.length === 0) {
        container.innerHTML = '<div class="card">⭐ 尚無收藏題目</div>';
        return;
    }
    
    let html = '<div class="card"><h3>收藏題目</h3>';
    for (let qid of userData.favorites) {
        let found = null, chapterName = '';
        for (let u in window.ALL_UNITS) {
            for (let c in window.ALL_UNITS[u].chapters) {
                let q = window.ALL_UNITS[u].chapters[c].questions.find(qq => qq.id === qid);
                if (q) {
                    found = q;
                    chapterName = window.ALL_UNITS[u].chapters[c].name;
                    break;
                }
            }
            if (found) break;
        }
        if (found) {
            html += `<div class="mistake-question-item">
                <span><strong>${chapterName}</strong> ${found.text}</span>
                <div>
                    <button class="btn-icon redo-q" data-qid="${qid}" data-source="pinned">🔄</button>
                    <button class="btn-icon remove-q" data-qid="${qid}" style="color:#dc2626;" title="移除該題">🗑️</button>
                </div>
            </div>`;
        }
    }
    html += '</div>';
    container.innerHTML = html;
    
    document.querySelectorAll('.redo-q').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const qid = btn.dataset.qid;
            const source = btn.dataset.source || 'myMistakes';
            if (typeof startSingleQuestion === 'function') {
                startSingleQuestion(qid, source);
            }
        });
    });
    attachRemoveEvents();
}

// ==================== 綁定事件（收藏 + 重做） ====================
function attachMistakeEvents() {
    // 收藏按鈕
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function(e) {
            let qid = star.dataset.qid;
            if (userData.favorites.includes(qid)) {
                userData.favorites = userData.favorites.filter(id => id !== qid);
            } else {
                userData.favorites.push(qid);
            }
            saveUserData();
            renderMyMistakes();
            renderPastMistakes();
            renderPinned();
        });
    });
    
    // 重做按鈕
    document.querySelectorAll('.redo-q').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const qid = btn.dataset.qid;
            const source = btn.dataset.source || 'myMistakes';
            if (typeof startSingleQuestion === 'function') {
                startSingleQuestion(qid, source);
            }
        });
    });
}

// ==================== 綁定移除事件（錯題歷程 + 收藏） ====================
function attachRemoveEvents() {
    document.querySelectorAll('.remove-q').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const qid = btn.dataset.qid;
            if (confirm('確定移除該題？')) {
                // 從收藏移除
                if (userData.favorites.includes(qid)) {
                    userData.favorites = userData.favorites.filter(id => id !== qid);
                }
                // 從所有作答紀錄移除
                userData.allAttempts = userData.allAttempts.filter(att => att.qid !== qid);
                // 從最新狀態移除
                delete userData.latestStatus[qid];
                saveUserData();
                renderPastMistakes();
                renderPinned();
                renderMyMistakes();
            }
        });
    });
}

// ==================== 渲染「做題紀錄」（匯出 CSV） ====================
function renderHistory() {
    let container = document.getElementById('historyPanel');
    
    if (!userData.practiceHistory || userData.practiceHistory.length === 0) {
        container.innerHTML = '<div class="card">📋 暫無做題紀錄</div>';
        return;
    }
    
    let html = `<div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            <h3>📋 做題紀錄</h3>
            <button id="exportHistoryBtn" class="btn export-btn">📥 匯出 CSV</button>
        </div>
        <div style="overflow-x:auto;">
            <table class="history-table">
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>時間</th>
                        <th>單元</th>
                        <th>章節</th>
                        <th>題數</th>
                        <th>正確率</th>
                        <th>模式</th>
                        <th>花費時間</th>
                    </tr>
                </thead>
                <tbody>`;
    
    for (let h of userData.practiceHistory) {
        let timeStr = h.timeSpent ? formatTime(h.timeSpent) : '-';
        html += `<tr>
            <td>${format(new Date(h.date), 'yyyy-MM-dd')}</td>
            <td>${h.time}</td>
            <td>${h.unitName}</td>
            <td>${h.chapterName}</td>
            <td>${h.questionCount}</td>
            <td>${h.accuracy}%</td>
            <td>${h.mode === 'trial' ? '試煉' : '一般'}</td>
            <td>${timeStr}</td>
        </tr>`;
    }
    
    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
    
    document.getElementById('exportHistoryBtn')?.addEventListener('click', function() {
        let csv = [["日期", "時間", "單元", "章節", "題數", "正確數", "正確率", "模式", "花費時間"]];
        for (let h of userData.practiceHistory) {
            let timeStr = h.timeSpent ? formatTime(h.timeSpent) : '-';
            csv.push([
                h.date, h.time, h.unitName, h.chapterName, 
                h.questionCount, h.correctCount, `${h.accuracy}%`, 
                h.mode === 'trial' ? '試煉' : '一般', timeStr
            ]);
        }
        let blob = new Blob(["\uFEFF" + csv.map(r => r.join(",")).join("\n")], { 
            type: "text/csv;charset=utf-8;" 
        });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `mastering_science_history_${currentUser.name}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

console.log('✅ mistakes.js 已載入（錯題本 + 錯題歷程）');