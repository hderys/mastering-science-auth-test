// ============================================================
// 項目4a：手機旋轉監聽（完全重寫 - 強制重新渲染）
// ============================================================
function handleScreenRotation() {
    var quizModal = document.getElementById('quizModal');
    var desktopModal = document.getElementById('desktopQuizModal');

    var isQuizVisible = (quizModal && quizModal.style.display === 'flex') ||
                        (desktopModal && desktopModal.style.display === 'flex');
    if (!isQuizVisible) return;

    var isLandscape = window.innerWidth > window.innerHeight && window.innerWidth <= 900;
    var isMobileDevice = window.innerWidth <= 640;

    // 先強制關閉兩個視窗
    if (desktopModal) desktopModal.style.display = 'none';
    if (quizModal) quizModal.style.display = 'none';

    // 延遲後重新打開正確的視窗並完全重建內容
    setTimeout(function() {
        if (isMobileDevice || isLandscape) {
            if (quizModal) {
                quizModal.style.display = 'flex';
                // 強制完全重建：導航、當前題目、選項、圖片
                if (typeof renderQuizNav === 'function') renderQuizNav();
                if (typeof renderCurrentQuestion === 'function') renderCurrentQuestion();
                // 確保所有內容都被重新渲染
                var optsDiv = document.getElementById('modalOptions');
                if (optsDiv) optsDiv.innerHTML = '';
            }
        } else {
            if (desktopModal) {
                desktopModal.style.display = 'flex';
                if (typeof renderDesktopQuizNav === 'function') renderDesktopQuizNav();
                if (typeof renderDesktopCurrentQuestion === 'function') renderDesktopCurrentQuestion();
            }
        }
    }, 50);
}

var rotationTimer = null;
window.addEventListener('resize', function() {
    clearTimeout(rotationTimer);
    rotationTimer = setTimeout(function() {
        handleScreenRotation();
    }, 300);
});

// ============================================================
// 項目4b：提交按鈕文字改為「提交並離開」
// ============================================================
var originalShowQuizModal = window.showQuizModal || function() {};
window.showQuizModal = function() {
    if (typeof originalShowQuizModal === 'function') {
        originalShowQuizModal();
    }
    var submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) {
        submitBtn.textContent = '提交並離開';
    }
};

var originalShowDesktopQuizModal = window.showDesktopQuizModal || function() {};
window.showDesktopQuizModal = function() {
    if (typeof originalShowDesktopQuizModal === 'function') {
        originalShowDesktopQuizModal();
    }
    var submitBtn = document.getElementById('desktopSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = '提交並離開';
    }
};

// ============================================================
// 項目4b：未答完提醒（含操作指引）
// ============================================================
var originalSubmitAll = window.submitAll || function() {};
window.submitAll = function() {
    if (typeof currentQuestions !== 'undefined' && typeof currentAnswers !== 'undefined') {
        var total = currentQuestions.length;
        var answered = 0;
        for (var i = 0; i < currentAnswers.length; i++) {
            if (currentAnswers[i] !== null) answered++;
        }
        var unanswered = total - answered;

        if (unanswered > 0) {
            var confirmMsg =
                '⚠️ 你還有 ' + unanswered + ' 題未作答（共 ' + total + ' 題）\n\n' +
                '💡 提示：\n' +
                '   • 按「下一題 ▶」按鈕繼續作答\n' +
                '   • 或點擊上方的圓圈號碼（如 ① ② ③）跳轉到未作答的題目\n\n' +
                '確定要提交並離開嗎？\n（提交後無法修改答案）';
            if (!confirm(confirmMsg)) {
                return;
            }
        }
    }

    if (typeof originalSubmitAll === 'function') {
        originalSubmitAll();
    }
};

var originalSubmitDesktopAll = window.submitDesktopAll || function() {};
window.submitDesktopAll = function() {
    if (typeof currentQuestions !== 'undefined' && typeof currentAnswers !== 'undefined') {
        var total = currentQuestions.length;
        var answered = 0;
        for (var i = 0; i < currentAnswers.length; i++) {
            if (currentAnswers[i] !== null) answered++;
        }
        var unanswered = total - answered;

        if (unanswered > 0) {
            var confirmMsg =
                '⚠️ 你還有 ' + unanswered + ' 題未作答（共 ' + total + ' 題）\n\n' +
                '💡 提示：\n' +
                '   • 按「下一題 ▶」按鈕繼續作答\n' +
                '   • 或點擊右側的圓圈號碼（如 ① ② ③）跳轉到未作答的題目\n\n' +
                '確定要提交並離開嗎？\n（提交後無法修改答案）';
            if (!confirm(confirmMsg)) {
                return;
            }
        }
    }

    if (typeof originalSubmitDesktopAll === 'function') {
        originalSubmitDesktopAll();
    }
};

// ============================================================
// 實際的登入和練習邏輯
// ============================================================
var currentUser = null;
var userData = { latestStatus: {}, allAttempts: [], favorites: [], practiceHistory: [], achievements: {} };
var currentQuestions = [];
var currentAnswers = [];
var currentQIndex = 0;
var timerInterval = null;
var timeRemaining = 0;
var selectedDifficulty = 1;
var selectedCount = 10;
var isTrialMode = false;
var startTime = null;
var pendingUnit = null;
var pendingChapter = null;

// ===== 登入 =====
document.getElementById('loginBtn').addEventListener('click', function() {
    var userId = document.getElementById('loginUserId').value.trim();
    var password = document.getElementById('loginPassword').value.trim();
    if (!userId || !password) {
        document.getElementById('loginError').textContent = '⚠️ 請輸入登入 ID 和密碼';
        document.getElementById('loginError').style.display = 'block';
        return;
    }
    handleLogin(userId, password);
});

function handleLogin(userId, password) {
    var email = userId + '@mastering-science.com';
    auth.signInWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            return db.collection('users').doc(userId).get();
        })
        .then(function(doc) {
            if (doc.exists) {
                currentUser = doc.data();
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('mainApp').style.display = 'block';
                document.getElementById('userLabel').textContent = '👋 ' + currentUser.name + ' (' + currentUser.className + ')';
                renderPractice();
                initTabs();
                return;
            }
            throw new Error('找不到用戶資料');
        })
        .catch(function(error) {
            var msg = error.message;
            if (error.code === 'auth/user-not-found') msg = '❌ 帳戶不存在！';
            else if (error.code === 'auth/wrong-password') msg = '❌ 密碼錯誤！';
            document.getElementById('loginError').textContent = msg;
            document.getElementById('loginError').style.display = 'block';
        });
}

// ===== 練習頁面 =====
function renderPractice() {
    var container = document.getElementById('practicePanel');
    if (!container) return;
    var html = '<div class="card"><h3>📖 選擇單元練習</h3>';

    for (var unit in window.ALL_UNITS) {
        var unitObj = window.ALL_UNITS[unit];
        // 單元標題（點擊展開/收合）
        html += '<div class="unit-header" data-unit="' + unit + '">';
        html += '  <div class="unit-header-left">';
        html += '    <span class="unit-toggle" id="toggle-' + unit + '">▶</span>';
        html += '    <span>' + unitObj.name + '</span>';
        html += '  </div>';
        html += '  <div class="unit-header-right">';
        // ✅ 項目15：單元測驗按鈕放在單元標題旁邊
        html += '    <button class="btn unit-test-btn" data-unit="' + unit + '" style="padding:2px 10px; font-size:0.7rem; background:#f59e0b; color:white; border:none; border-radius:40px; cursor:pointer;">📝 單元測驗</button>';
        html += '  </div>';
        html += '</div>';

        // 章節列表（預設收合）
        html += '<div class="chapters-container" id="chapters-' + unit + '">';
        for (var ch in unitObj.chapters) {
            var chObj = unitObj.chapters[ch];
            html += '<div class="chapter-item">';
            html += '  <span class="chapter-name">' + chObj.name + ' (' + chObj.questions.length + ' 題)</span>';
            html += '  <button class="btn practice-chapter" data-unit="' + unit + '" data-chapter="' + ch + '" style="padding:4px 12px; font-size:0.75rem;">✏️ 練習</button>';
            html += '</div>';
        }
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    // 單元標題點擊展開/收合
    document.querySelectorAll('.unit-header').forEach(function(header) {
        header.addEventListener('click', function(e) {
            // 防止點擊按鈕時觸發
            if (e.target.closest('.unit-test-btn')) return;

            var unit = header.dataset.unit;
            var container = document.getElementById('chapters-' + unit);
            var toggle = document.getElementById('toggle-' + unit);
            if (container) {
                container.classList.toggle('open');
                if (toggle) toggle.classList.toggle('open');
            }
        });
    });

    // ✅ 項目16：懸浮在單元時自動展開（hover 效果）
    document.querySelectorAll('.unit-header').forEach(function(header) {
        var unit = header.dataset.unit;
        var container = document.getElementById('chapters-' + unit);

        header.addEventListener('mouseenter', function() {
            if (container && !container.classList.contains('open')) {
                container.classList.add('open');
                var toggle = document.getElementById('toggle-' + unit);
                if (toggle) toggle.classList.add('open');
            }
        });

        header.addEventListener('mouseleave', function() {
            // 延遲收合，讓滑鼠有時間移到章節上
            setTimeout(function() {
                // 檢查滑鼠是否在 header 或 container 內
                var isHoveringHeader = header.matches(':hover');
                var isHoveringContainer = container && container.matches(':hover');
                if (!isHoveringHeader && !isHoveringContainer) {
                    if (container && container.classList.contains('open')) {
                        // 如果原本是關閉的，就收合回去
                        // 但我們需要知道原本的狀態... 用 data 記錄
                        if (container.dataset.wasOpen !== 'true') {
                            container.classList.remove('open');
                            var toggle = document.getElementById('toggle-' + unit);
                            if (toggle) toggle.classList.remove('open');
                        }
                    }
                }
            }, 200);
        });

        // 紀錄原本是否開啟
        if (container) {
            container.dataset.wasOpen = container.classList.contains('open') ? 'true' : 'false';
        }
    });

    // 練習按鈕
    document.querySelectorAll('.practice-chapter').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            pendingUnit = btn.dataset.unit;
            pendingChapter = btn.dataset.chapter;
            showSettingsModal();
        });
    });

    // ✅ 項目15：單元測驗按鈕 - 加入確認視窗
    document.querySelectorAll('.unit-test-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var unit = btn.dataset.unit;
            var unitObj = window.ALL_UNITS[unit];
            var unitName = unitObj ? unitObj.name : '單元 ' + unit;

            var confirmMsg =
                '📝 確認開始單元測驗？\n\n' +
                '你即將挑戰【' + unitName + '】的單元測驗，共 36 題。\n\n' +
                '⏱️ 每題限時 90 秒\n' +
                '📊 完成後會顯示 DSE 等級預測\n\n' +
                '準備好了嗎？';

            if (confirm(confirmMsg)) {
                startUnitTest(unit);
            }
        });
    });
}

// ✅ 項目15：單元測驗函數
function startUnitTest(unit) {
    var allQuestions = [];
    for (var ch in window.ALL_UNITS[unit].chapters) {
        var qs = window.ALL_UNITS[unit].chapters[ch].questions;
        for (var i = 0; i < qs.length; i++) {
            allQuestions.push(qs[i]);
        }
    }
    if (allQuestions.length === 0) {
        alert('此單元暫無題目');
        return;
    }

    var count = Math.min(36, allQuestions.length);
    var selected = [];
    for (var i = 0; i < count && i < allQuestions.length; i++) {
        selected.push(allQuestions[i]);
    }

    currentQuestions = selected;
    currentAnswers = new Array(currentQuestions.length).fill(null);
    currentQIndex = 0;

    timeRemaining = currentQuestions.length * 90;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function() {
        if (timeRemaining <= 0) submitAll();
        else { timeRemaining--; updateTimerDisplay(); }
    }, 1000);

    startTime = Date.now();
    document.getElementById('settingsModal').style.display = 'none';

    if (window.innerWidth <= 640) {
        showQuizModal();
    } else {
        showDesktopQuizModal();
    }
}

function showSettingsModal() {
    document.getElementById('settingsModal').style.display = 'flex';
}

document.getElementById('startPracticeBtn').addEventListener('click', function() {
    startPracticeWithSettings();
});

document.getElementById('cancelSettingsBtn').addEventListener('click', function() {
    document.getElementById('settingsModal').style.display = 'none';
});

function startPracticeWithSettings() {
    var unit = pendingUnit;
    var chapter = pendingChapter;
    var allQuestions = window.ALL_UNITS[unit].chapters[chapter].questions;
    var count = parseInt(document.getElementById('customCount').value) || 10;
    if (count > allQuestions.length) count = allQuestions.length;

    var selected = [];
    for (var i = 0; i < count && i < allQuestions.length; i++) {
        selected.push(allQuestions[i]);
    }
    currentQuestions = selected;
    currentAnswers = new Array(currentQuestions.length).fill(null);
    currentQIndex = 0;

    document.getElementById('settingsModal').style.display = 'none';

    timeRemaining = currentQuestions.length * 90;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function() {
        if (timeRemaining <= 0) submitAll();
        else { timeRemaining--; updateTimerDisplay(); }
    }, 1000);

    startTime = Date.now();

    if (window.innerWidth <= 640) {
        showQuizModal();
    } else {
        showDesktopQuizModal();
    }
}

// ===== 手機版問題彈窗 =====
function showQuizModal() {
    renderQuizNav();
    renderCurrentQuestion();
    document.getElementById('quizModal').style.display = 'flex';

    // ✅ 項目4c + 條件顯示：只在 Chapter 6 或以上顯示周期表
    var periodicBtn = document.getElementById('periodicTableBtn');
    if (periodicBtn) {
        var currentChapterNum = parseInt(pendingChapter);
        if (currentChapterNum >= 6) {
            periodicBtn.style.display = 'inline-block';
            periodicBtn.onclick = showPeriodicTable;
        } else {
            periodicBtn.style.display = 'none';
        }
    }

    var submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) {
        submitBtn.textContent = '提交並離開';
    }
}

function renderQuizNav() {
    var nav = document.getElementById('questionNav');
    var html = '';
    for (var i = 0; i < currentQuestions.length; i++) {
        var cls = '';
        if (i === currentQIndex) cls = 'current';
        else if (currentAnswers[i] !== null) cls = 'answered';
        else cls = 'unanswered';
        html += '<button class="q-nav-btn ' + cls + '" data-idx="' + i + '">' + (i + 1) + '</button>';
    }
    nav.innerHTML = html;
    document.getElementById('quizCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    document.querySelectorAll('.q-nav-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentQIndex = parseInt(btn.dataset.idx);
            renderQuizNav();
            renderCurrentQuestion();
        });
    });
}

function renderCurrentQuestion() {
    var q = currentQuestions[currentQIndex];
    document.getElementById('modalQuestionText').textContent = q.text;
    document.getElementById('quizDifficulty').textContent = q.difficulty;
    document.getElementById('quizCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    // 圖片
    var imgArea = document.getElementById('modalImageArea');
    if (q.imageUrl) {
        imgArea.innerHTML = '<img src="' + q.imageUrl + '" style="max-height:130px; max-width:100%; object-fit:contain; border-radius:8px; cursor:pointer;" onclick="zoomImage(\'' + q.imageUrl + '\')">';
        imgArea.style.display = 'block';
    } else {
        imgArea.innerHTML = '';
        imgArea.style.display = 'none';
    }

    // 選項（完全重建）
    var optsDiv = document.getElementById('modalOptions');
    optsDiv.innerHTML = '';
    for (var i = 0; i < q.options.length; i++) {
        var opt = q.options[i];
        var letter = opt.charAt(0);
        var text = opt.substring(3);
        var btn = document.createElement('button');
        btn.className = 'option-btn';
        if (currentAnswers[currentQIndex] === letter) btn.classList.add('selected');
        btn.textContent = letter + '. ' + text;
        btn.dataset.letter = letter;
        btn.addEventListener('click', function() {
            currentAnswers[currentQIndex] = this.dataset.letter;
            renderCurrentQuestion();
            renderQuizNav();
        });
        optsDiv.appendChild(btn);
    }

    document.getElementById('prevBtn').disabled = (currentQIndex === 0);
    document.getElementById('nextBtn').disabled = (currentQIndex === currentQuestions.length - 1);
}

// ===== 桌面版問題彈窗 =====
function showDesktopQuizModal() {
    renderDesktopQuizNav();
    renderDesktopCurrentQuestion();
    document.getElementById('desktopQuizModal').style.display = 'flex';

    // ✅ 項目4c + 條件顯示：只在 Chapter 6 或以上顯示周期表
    var periodicBtn = document.getElementById('desktopPeriodicBtn');
    if (periodicBtn) {
        var currentChapterNum = parseInt(pendingChapter);
        if (currentChapterNum >= 6) {
            periodicBtn.style.display = 'inline-block';
            periodicBtn.onclick = showPeriodicTable;
        } else {
            periodicBtn.style.display = 'none';
        }
    }

    var submitBtn = document.getElementById('desktopSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = '提交並離開';
    }
}

function renderDesktopQuizNav() {
    var nav = document.getElementById('desktopNav');
    var html = '';
    for (var i = 0; i < currentQuestions.length; i++) {
        var cls = '';
        if (i === currentQIndex) cls = 'current';
        else if (currentAnswers[i] !== null) cls = 'answered';
        else cls = 'unanswered';
        html += '<button class="nav-dot ' + cls + '" data-idx="' + i + '">' + (i + 1) + '</button>';
    }
    nav.innerHTML = html;
    document.getElementById('desktopCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    document.querySelectorAll('#desktopNav .nav-dot').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentQIndex = parseInt(btn.dataset.idx);
            renderDesktopQuizNav();
            renderDesktopCurrentQuestion();
        });
    });
}

function renderDesktopCurrentQuestion() {
    var q = currentQuestions[currentQIndex];
    document.getElementById('desktopQuestionText').textContent = q.text;
    document.getElementById('desktopDifficulty').textContent = q.difficulty;
    document.getElementById('desktopCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    var imgArea = document.getElementById('desktopImageArea');
    if (q.imageUrl) {
        imgArea.innerHTML = '<img src="' + q.imageUrl + '" style="max-height:110px; max-width:100%; object-fit:contain; border-radius:8px; cursor:pointer;" onclick="zoomImage(\'' + q.imageUrl + '\')">';
        imgArea.style.display = 'block';
    } else {
        imgArea.innerHTML = '';
        imgArea.style.display = 'none';
    }

    var optsDiv = document.getElementById('desktopOptions');
    optsDiv.innerHTML = '';
    for (var i = 0; i < q.options.length; i++) {
        var opt = q.options[i];
        var letter = opt.charAt(0);
        var text = opt.substring(3);
        var btn = document.createElement('button');
        btn.className = 'option-btn';
        if (currentAnswers[currentQIndex] === letter) btn.classList.add('selected');
        btn.textContent = letter + '. ' + text;
        btn.dataset.letter = letter;
        btn.addEventListener('click', function() {
            currentAnswers[currentQIndex] = this.dataset.letter;
            renderDesktopCurrentQuestion();
            renderDesktopQuizNav();
        });
        optsDiv.appendChild(btn);
    }

    document.getElementById('desktopPrevBtn').disabled = (currentQIndex === 0);
    document.getElementById('desktopNextBtn').disabled = (currentQIndex === currentQuestions.length - 1);
}

// ===== 計時器 =====
function updateTimerDisplay() {
    var m = Math.floor(timeRemaining / 60);
    var s = timeRemaining % 60;
    var timerEl = document.getElementById('timerDisplay');
    if (timerEl) timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    var desktopTimer = document.getElementById('desktopTimer');
    if (desktopTimer) desktopTimer.textContent = '⏱️ ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ===== 提交 =====
function submitAll() {
    if (timerInterval) clearInterval(timerInterval);

    var correctCount = 0;
    var results = [];
    for (var i = 0; i < currentQuestions.length; i++) {
        var q = currentQuestions[i];
        var userLetter = currentAnswers[i];
        var correctLetter = q.correct;
        var isCorrect = (userLetter === correctLetter);
        if (isCorrect) correctCount++;
        results.push({
            question: q,
            userLetter: userLetter || '?',
            correctLetter: correctLetter,
            isCorrect: isCorrect,
            qid: q.id
        });
    }

    var accuracy = Math.round(correctCount / currentQuestions.length * 100);
    document.getElementById('quizModal').style.display = 'none';
    document.getElementById('desktopQuizModal').style.display = 'none';
    displayResults(results, accuracy, correctCount);
}

function submitDesktopAll() {
    submitAll();
}

// ===== 顯示結果 =====
function displayResults(results, accuracy, correctCount) {
    var container = document.getElementById('resultContent');
    var total = results.length;
    var color = accuracy < 40 ? '#dc2626' : (accuracy < 70 ? '#f59e0b' : '#10b981');

    var html = '<div class="result-summary-bar">';
    html += '<div class="result-progress">';
    html += '<span>✅ ' + accuracy + '% (' + correctCount + '/' + total + ')</span>';
    html += '<div class="big-progress-bar"><div class="big-progress-fill" style="width:' + accuracy + '%; background:' + color + ';"></div></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="results-card-list">';
    for (var i = 0; i < results.length; i++) {
        var r = results[i];
        var cardClass = r.isCorrect ? 'correct' : 'wrong';
        var icon = r.isCorrect ? '✅' : '❌';
        html += '<div class="result-card ' + cardClass + '">';
        html += '<div class="result-card-header">';
        html += '<span class="result-card-question">' + (i + 1) + '. ' + r.question.text + '</span>';
        html += '<span class="result-card-icon">' + icon + '</span>';
        html += '</div>';
        html += '<div class="result-card-details">';
        html += '<span>📝 你的答案：' + r.userLetter + '</span>';
        html += '<span>✓ 正解：' + r.correctLetter + '</span>';
        html += '</div>';
        html += '</div>';
    }
    html += '</div>';

    container.innerHTML = html;
    document.getElementById('resultModal').style.display = 'flex';
}

// ===== 按鈕事件 =====
document.getElementById('closeResultBtn').addEventListener('click', function() {
    document.getElementById('resultModal').style.display = 'none';
});

document.getElementById('prevBtn').addEventListener('click', function() {
    if (currentQIndex > 0) { currentQIndex--; renderQuizNav(); renderCurrentQuestion(); }
});

document.getElementById('nextBtn').addEventListener('click', function() {
    if (currentQIndex < currentQuestions.length - 1) { currentQIndex++; renderQuizNav(); renderCurrentQuestion(); }
});

document.getElementById('desktopPrevBtn').addEventListener('click', function() {
    if (currentQIndex > 0) { currentQIndex--; renderDesktopQuizNav(); renderDesktopCurrentQuestion(); }
});

document.getElementById('desktopNextBtn').addEventListener('click', function() {
    if (currentQIndex < currentQuestions.length - 1) { currentQIndex++; renderDesktopQuizNav(); renderDesktopCurrentQuestion(); }
});

document.getElementById('submitAllBtn').addEventListener('click', function() {
    window.submitAll();
});

document.getElementById('desktopSubmitBtn').addEventListener('click', function() {
    window.submitDesktopAll();
});

// ===== 周期表 =====
function showPeriodicTable() {
    var imgUrl = 'https://raw.githubusercontent.com/hderys/mastering-science-images/main/webp_image/periodic_table.png';
    document.getElementById('zoomImage').src = imgUrl;
    document.getElementById('imageZoomModal').style.display = 'flex';
}

function closeImageZoom() {
    document.getElementById('imageZoomModal').style.display = 'none';
}

document.getElementById('closeZoomBtn').addEventListener('click', closeImageZoom);

function zoomImage(url) {
    document.getElementById('zoomImage').src = url;
    document.getElementById('imageZoomModal').style.display = 'flex';
}

// ===== 難度選擇 =====
document.getElementById('diff-easy').addEventListener('click', function() {
    selectedDifficulty = 0;
    document.getElementById('diff-easy').classList.add('active');
    document.getElementById('diff-medium').classList.remove('active');
    document.getElementById('diff-hard').classList.remove('active');
});

document.getElementById('diff-medium').addEventListener('click', function() {
    if (document.getElementById('diff-medium').disabled) return;
    selectedDifficulty = 1;
    document.getElementById('diff-easy').classList.remove('active');
    document.getElementById('diff-medium').classList.add('active');
    document.getElementById('diff-hard').classList.remove('active');
});

document.getElementById('diff-hard').addEventListener('click', function() {
    if (document.getElementById('diff-hard').disabled) return;
    selectedDifficulty = 2;
    document.getElementById('diff-easy').classList.remove('active');
    document.getElementById('diff-medium').classList.remove('active');
    document.getElementById('diff-hard').classList.add('active');
});

// ===== 題數選擇 =====
document.getElementById('count-10').addEventListener('click', function() {
    selectedCount = 10;
    document.getElementById('customCount').value = 10;
    document.getElementById('count-10').classList.add('active');
    document.getElementById('count-20').classList.remove('active');
    document.getElementById('count-36').classList.remove('active');
});

document.getElementById('count-20').addEventListener('click', function() {
    if (document.getElementById('count-20').disabled) return;
    selectedCount = 20;
    document.getElementById('customCount').value = 20;
    document.getElementById('count-10').classList.remove('active');
    document.getElementById('count-20').classList.add('active');
    document.getElementById('count-36').classList.remove('active');
});

document.getElementById('count-36').addEventListener('click', function() {
    if (document.getElementById('count-36').disabled) return;
    selectedCount = 36;
    document.getElementById('customCount').value = 36;
    document.getElementById('count-10').classList.remove('active');
    document.getElementById('count-20').classList.remove('active');
    document.getElementById('count-36').classList.add('active');
});

document.getElementById('customCount').addEventListener('change', function() {
    var val = parseInt(this.value) || 10;
    if (val < 1) val = 1;
    if (val > 50) val = 50;
    this.value = val;
    selectedCount = val;
    document.getElementById('count-10').classList.remove('active');
    document.getElementById('count-20').classList.remove('active');
    document.getElementById('count-36').classList.remove('active');
});

// ===== 密碼顯示切換 =====
document.getElementById('togglePasswordBtn').addEventListener('click', function() {
    var input = document.getElementById('loginPassword');
    if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
    } else {
        input.type = 'password';
        this.textContent = '👁️';
    }
});

// ===== 分頁切換 =====
function initTabs() {
    var tabs = document.querySelectorAll('.tab');
    var panels = {
        practice: document.getElementById('practicePanel'),
        myMistakes: document.getElementById('myMistakesPanel'),
        pinned: document.getElementById('pinnedPanel'),
        history: document.getElementById('historyPanel'),
        achievements: document.getElementById('achievementsPanel'),
        teacher: document.getElementById('teacherPanel')
    };
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var target = tab.dataset.tab;
            for (var p in panels) {
                if (panels[p]) panels[p].style.display = 'none';
            }
            if (panels[target]) panels[target].style.display = 'block';
            tabs.forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            if (target === 'history') renderHistory();
            if (target === 'achievements') renderAchievements();
        });
    });
}

function renderHistory() {
    var container = document.getElementById('historyPanel');
    container.innerHTML = '<div class="card"><h3>📋 做題紀錄</h3><p style="color:#999;">暫無紀錄</p></div>';
}

function renderAchievements() {
    var container = document.getElementById('achievementsPanel');
    container.innerHTML = '<div class="card"><h3>🏆 我的成就</h3><p style="color:#999;">暫無成就</p></div>';
}

console.log('✅ 測試版 script.js 已載入！');