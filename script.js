// ===== 模擬題庫 =====
window.ALL_UNITS = {
    "2": {
        "name": "⚛️ Microscopic World I",
        "chapters": {
            "5": {
                "name": "5. Atomic Structure",
                "questions": [
                    {"id": "C25A001", "text": "Which of the following elements is a semi-metal?", "options": ["A. Phosphorus", "B. Boron", "C. Aluminium", "D. Lithium"], "correct": "B", "explanation": "B and Si are semimetals.", "imageUrl": null, "difficulty": "✅ Basic", "difficulty_level": 1, "sf": 1},
                    {"id": "C25A002", "text": "Which of the following substances is a non-metal liquid element at room conditions?", "options": ["A. Bromine", "B. Chlorine", "C. Mercury", "D. Water"], "correct": "A", "explanation": "Mercury is liquid METAL.", "imageUrl": null, "difficulty": "✅ Basic", "difficulty_level": 1, "sf": 1},
                    {"id": "C25A003", "text": "Which of the following is the correct chemical symbol for copper?", "options": ["A. Ca", "B. Co", "C. Cr", "D. Cu"], "correct": "D", "explanation": "", "imageUrl": null, "difficulty": "✅ Basic", "difficulty_level": 1, "sf": 1}
                ]
            },
            "6": {
                "name": "6. Periodic Table",
                "questions": [
                    {"id": "C26A001", "text": "In the modern Periodic Table, elements are arranged in order of increasing", "options": ["A. mass number", "B. atomic number", "C. atomic weight", "D. number of neutrons"], "correct": "B", "explanation": "Arranged in order of increasing NUMBER of PROTON.", "imageUrl": null, "difficulty": "✅ Basic", "difficulty_level": 1, "sf": 1},
                    {"id": "C26A002", "text": "Which of the following statements concerning Group 0 elements is INCORRECT?", "options": ["A. They are called noble gases.", "B. They are chemically unreactive.", "C. They all have eight electrons in the outermost shell.", "D. Their relative atomic masses increase down the group."], "correct": "C", "explanation": "Helium only has TWO electrons.", "imageUrl": null, "difficulty": "📈 Advanced", "difficulty_level": 2, "sf": 1}
                ]
            }
        }
    }
};

// ===== 全域變量 =====
var currentQuestions = [];
var currentAnswers = [];
var currentQIndex = 0;
var timerInterval = null;
var timeRemaining = 0;
var pendingUnit = null;
var pendingChapter = null;

// ===== 渲染練習頁面 =====
function renderPractice() {
    var container = document.getElementById('practicePanel');
    if (!container) return;
    var html = '<div class="card"><h3>📖 選擇單元練習</h3>';

    for (var unit in window.ALL_UNITS) {
        var unitObj = window.ALL_UNITS[unit];
        html += '<div class="unit-header" data-unit="' + unit + '" onclick="toggleUnit(\'' + unit + '\')">';
        html += '  <div class="unit-header-left">';
        html += '    <span class="unit-toggle" id="toggle-' + unit + '">▶</span>';
        html += '    <span>' + unitObj.name + '</span>';
        html += '  </div>';
        html += '  <div class="unit-header-right">';
        html += '    <button class="btn unit-test-btn" data-unit="' + unit + '" style="padding:2px 10px; font-size:0.7rem; background:#f59e0b; color:white; border:none; border-radius:40px; cursor:pointer;">📝 單元測驗</button>';
        html += '  </div>';
        html += '</div>';

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

    // 練習按鈕
    document.querySelectorAll('.practice-chapter').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            pendingUnit = btn.dataset.unit;
            pendingChapter = btn.dataset.chapter;
            showSettingsModal();
        });
    });

    // 單元測驗按鈕
    document.querySelectorAll('.unit-test-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var unit = btn.dataset.unit;
            var unitObj = window.ALL_UNITS[unit];
            var unitName = unitObj ? unitObj.name : '單元 ' + unit;
            var confirmMsg = '📝 確認開始單元測驗？\n\n你即將挑戰【' + unitName + '】的單元測驗，共 36 題。\n\n⏱️ 每題限時 90 秒\n📊 完成後會顯示 DSE 等級預測\n\n準備好了嗎？';
            if (confirm(confirmMsg)) {
                startUnitTest(unit);
            }
        });
    });
}

function toggleUnit(unit) {
    var container = document.getElementById('chapters-' + unit);
    var toggle = document.getElementById('toggle-' + unit);
    if (container) {
        container.classList.toggle('open');
        if (toggle) toggle.classList.toggle('open');
    }
}

// ===== 顯示設定彈窗 =====
function showSettingsModal() {
    document.getElementById('settingsModal').classList.add('show');
}

document.getElementById('cancelSettingsBtn').addEventListener('click', function() {
    document.getElementById('settingsModal').classList.remove('show');
});

// ===== 開始練習 =====
document.getElementById('startPracticeBtn').addEventListener('click', function() {
    var unit = pendingUnit;
    var chapter = pendingChapter;
    if (!unit || !chapter) {
        alert('請先選擇一個章節');
        return;
    }
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

    document.getElementById('settingsModal').classList.remove('show');

    timeRemaining = currentQuestions.length * 90;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function() {
        if (timeRemaining <= 0) submitAll();
        else { timeRemaining--; updateTimerDisplay(); }
    }, 1000);

    showQuizModal();
});

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

    showQuizModal();
}

// ===== 顯示問題彈窗 =====
function showQuizModal() {
    renderQuizNav();
    renderCurrentQuestion();
    document.getElementById('quizModal').classList.add('show');

    var periodicBtn = document.getElementById('periodicTableBtn');
    if (periodicBtn) {
        periodicBtn.onclick = function() {
            alert('📊 周期表功能（測試用）');
        };
    }
    var desktopPeriodicBtn = document.getElementById('desktopPeriodicBtn');
    if (desktopPeriodicBtn) {
        desktopPeriodicBtn.onclick = function() {
            alert('📊 周期表功能（測試用）');
        };
    }

    var submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) submitBtn.textContent = '提交並離開';
    var desktopSubmitBtn = document.getElementById('desktopSubmitBtn');
    if (desktopSubmitBtn) desktopSubmitBtn.textContent = '提交並離開';
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
    document.getElementById('desktopCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    document.querySelectorAll('.q-nav-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentQIndex = parseInt(btn.dataset.idx);
            renderQuizNav();
            renderCurrentQuestion();
            updateDesktopNav();
        });
    });
}

function updateDesktopNav() {
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
            renderQuizNav();
            renderCurrentQuestion();
            updateDesktopNav();
        });
    });
}

function renderCurrentQuestion() {
    var q = currentQuestions[currentQIndex];
    document.getElementById('modalQuestionText').textContent = q.text;
    document.getElementById('quizDifficulty').textContent = q.difficulty;
    document.getElementById('desktopDifficulty').textContent = q.difficulty;
    document.getElementById('quizCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;
    document.getElementById('desktopCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    var imgArea = document.getElementById('modalImageArea');
    if (q.imageUrl) {
        imgArea.innerHTML = '<img src="' + q.imageUrl + '" style="max-height:130px; max-width:100%; object-fit:contain; border-radius:8px; cursor:pointer;">';
        imgArea.style.display = 'block';
    } else {
        imgArea.innerHTML = '';
        imgArea.style.display = 'none';
    }

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
            updateDesktopNav();
        });
        optsDiv.appendChild(btn);
    }

    document.getElementById('prevBtn').disabled = (currentQIndex === 0);
    document.getElementById('nextBtn').disabled = (currentQIndex === currentQuestions.length - 1);
    document.getElementById('desktopPrevBtn').disabled = (currentQIndex === 0);
    document.getElementById('desktopNextBtn').disabled = (currentQIndex === currentQuestions.length - 1);
}

function updateTimerDisplay() {
    var m = Math.floor(timeRemaining / 60);
    var s = timeRemaining % 60;
    var timerEl = document.getElementById('timerDisplay');
    if (timerEl) timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    var desktopTimer = document.getElementById('desktopTimer');
    if (desktopTimer) desktopTimer.textContent = '⏱️ ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ===== 按鈕事件 =====
document.getElementById('prevBtn').addEventListener('click', function() {
    if (currentQIndex > 0) { currentQIndex--; renderQuizNav(); renderCurrentQuestion(); updateDesktopNav(); }
});
document.getElementById('nextBtn').addEventListener('click', function() {
    if (currentQIndex < currentQuestions.length - 1) { currentQIndex++; renderQuizNav(); renderCurrentQuestion(); updateDesktopNav(); }
});
document.getElementById('desktopPrevBtn').addEventListener('click', function() {
    if (currentQIndex > 0) { currentQIndex--; renderQuizNav(); renderCurrentQuestion(); updateDesktopNav(); }
});
document.getElementById('desktopNextBtn').addEventListener('click', function() {
    if (currentQIndex < currentQuestions.length - 1) { currentQIndex++; renderQuizNav(); renderCurrentQuestion(); updateDesktopNav(); }
});

document.getElementById('submitAllBtn').addEventListener('click', function() {
    submitAll();
});
document.getElementById('desktopSubmitBtn').addEventListener('click', function() {
    submitAll();
});

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
        results.push({ question: q, userLetter: userLetter || '?', correctLetter: correctLetter, isCorrect: isCorrect });
    }
    var accuracy = Math.round(correctCount / currentQuestions.length * 100);
    document.getElementById('quizModal').classList.remove('show');
    displayResults(results, accuracy, correctCount);
}

function displayResults(results, accuracy, correctCount) {
    var container = document.getElementById('resultContent');
    var total = results.length;
    var color = accuracy < 40 ? '#dc2626' : (accuracy < 70 ? '#f59e0b' : '#10b981');
    var html = '<div class="result-summary-bar"><div class="result-progress"><span>✅ ' + accuracy + '% (' + correctCount + '/' + total + ')</span><div class="big-progress-bar"><div class="big-progress-fill" style="width:' + accuracy + '%; background:' + color + ';"></div></div></div></div>';
    html += '<div class="results-card-list">';
    for (var i = 0; i < results.length; i++) {
        var r = results[i];
        var cardClass = r.isCorrect ? 'correct' : 'wrong';
        var icon = r.isCorrect ? '✅' : '❌';
        html += '<div class="result-card ' + cardClass + '">';
        html += '<div class="result-card-header"><span class="result-card-question">' + (i + 1) + '. ' + r.question.text + '</span><span class="result-card-icon">' + icon + '</span></div>';
        html += '<div class="result-card-details"><span>📝 你的答案：' + r.userLetter + '</span><span>✓ 正解：' + r.correctLetter + '</span></div>';
        html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('resultModal').classList.add('show');
}

document.getElementById('closeResultBtn').addEventListener('click', function() {
    document.getElementById('resultModal').classList.remove('show');
});

// ===== 一鍵解鎖 =====
document.getElementById('devUnlockBtn').addEventListener('click', function() {
    alert('🔓 一鍵解鎖（測試用）');
});

// ===== 難度選擇 =====
document.getElementById('diff-easy').addEventListener('click', function() {
    document.getElementById('diff-easy').classList.add('active');
    document.getElementById('diff-medium').classList.remove('active');
    document.getElementById('diff-hard').classList.remove('active');
});
document.getElementById('diff-medium').addEventListener('click', function() {
    if (document.getElementById('diff-medium').disabled) return;
    document.getElementById('diff-easy').classList.remove('active');
    document.getElementById('diff-medium').classList.add('active');
    document.getElementById('diff-hard').classList.remove('active');
});
document.getElementById('diff-hard').addEventListener('click', function() {
    if (document.getElementById('diff-hard').disabled) return;
    document.getElementById('diff-easy').classList.remove('active');
    document.getElementById('diff-medium').classList.remove('active');
    document.getElementById('diff-hard').classList.add('active');
});

// ===== 題數選擇 =====
document.getElementById('count-10').addEventListener('click', function() {
    document.getElementById('count-10').classList.add('active');
    document.getElementById('count-20').classList.remove('active');
    document.getElementById('count-36').classList.remove('active');
    document.getElementById('customCount').value = 10;
});
document.getElementById('count-20').addEventListener('click', function() {
    if (document.getElementById('count-20').disabled) return;
    document.getElementById('count-10').classList.remove('active');
    document.getElementById('count-20').classList.add('active');
    document.getElementById('count-36').classList.remove('active');
    document.getElementById('customCount').value = 20;
});
document.getElementById('count-36').addEventListener('click', function() {
    if (document.getElementById('count-36').disabled) return;
    document.getElementById('count-10').classList.remove('active');
    document.getElementById('count-20').classList.remove('active');
    document.getElementById('count-36').classList.add('active');
    document.getElementById('customCount').value = 36;
});

// ===== 頁面載入 =====
document.addEventListener('DOMContentLoaded', function() {
    renderPractice();
    updateDesktopNav();

    var firstUnit = document.querySelector('.chapters-container');
    if (firstUnit) {
        firstUnit.classList.add('open');
        var toggle = document.getElementById('toggle-2');
        if (toggle) toggle.classList.add('open');
    }
});