// ============================================================
// 模擬題目（3題）
// ============================================================
var mockQuestions = [
    {
        id: "Q1",
        text: "Which of the following elements is a semi-metal?",
        options: ["A. Phosphorus", "B. Boron", "C. Aluminium", "D. Lithium"],
        correct: "B",
        difficulty: "✅ Basic",
        imageUrl: null
    },
    {
        id: "Q2",
        text: "Which of the following substances is a non-metal liquid element at room conditions?",
        options: ["A. Bromine", "B. Chlorine", "C. Mercury", "D. Water"],
        correct: "A",
        difficulty: "✅ Basic",
        imageUrl: null
    },
    {
        id: "Q3",
        text: "Which of the following is the correct chemical symbol for copper?",
        options: ["A. Ca", "B. Co", "C. Cr", "D. Cu"],
        correct: "D",
        difficulty: "✅ Basic",
        imageUrl: null
    }
];

// ============================================================
// 全域變量
// ============================================================
var currentQuestions = [];
var currentAnswers = [];
var currentQIndex = 0;
var timerInterval = null;
var timeRemaining = 0;
var isFullscreen = false;
var isLandscape = false;

// ============================================================
// DOM 元素
// ============================================================
var quizModal = document.getElementById('quizModal');
var startBtn = document.getElementById('startTestBtn');
var closeBtn = document.getElementById('closeTestBtn');

// ============================================================
// 開始測試
// ============================================================
startBtn.addEventListener('click', function() {
    startPractice();
});

closeBtn.addEventListener('click', function() {
    closeQuiz();
});

function startPractice() {
    currentQuestions = mockQuestions.slice(0);
    currentAnswers = new Array(currentQuestions.length).fill(null);
    currentQIndex = 0;

    timeRemaining = currentQuestions.length * 90;
    updateTimerDisplay();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(function() {
        if (timeRemaining <= 0) {
            submitAll();
        } else {
            timeRemaining--;
            updateTimerDisplay();
        }
    }, 1000);

    // 顯示彈窗
    quizModal.classList.add('show');

    // 渲染
    renderAll();

    // 檢查初始方向（如果是橫置，自動全屏）
    setTimeout(function() {
        checkOrientationAndFullscreen();
    }, 300);
}

function closeQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    // 退出全屏
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(function() {});
    }
    quizModal.classList.remove('show');
}

// ============================================================
// 渲染
// ============================================================
function renderAll() {
    renderQuizNav();
    renderDesktopNav();
    renderCurrentQuestion();
    updateButtons();
}

function renderQuizNav() {
    var nav = document.getElementById('questionNav');
    var html = '';
    for (var i = 0; i < currentQuestions.length; i++) {
        var cls = 'q-nav-btn';
        if (i === currentQIndex) cls += ' current';
        else if (currentAnswers[i] !== null) cls += ' answered';
        else cls += ' unanswered';
        html += '<button class="' + cls + '" data-idx="' + i + '">' + (i + 1) + '</button>';
    }
    nav.innerHTML = html;
    document.getElementById('quizCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    document.querySelectorAll('#questionNav .q-nav-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentQIndex = parseInt(btn.dataset.idx);
            renderAll();
        });
    });
}

function renderDesktopNav() {
    var nav = document.getElementById('desktopNav');
    var html = '';
    for (var i = 0; i < currentQuestions.length; i++) {
        var cls = 'nav-dot';
        if (i === currentQIndex) cls += ' current';
        else if (currentAnswers[i] !== null) cls += ' answered';
        else cls += ' unanswered';
        html += '<button class="' + cls + '" data-idx="' + i + '">' + (i + 1) + '</button>';
    }
    nav.innerHTML = html;
    document.getElementById('desktopCounter').textContent = (currentQIndex + 1) + ' / ' + currentQuestions.length;

    document.querySelectorAll('#desktopNav .nav-dot').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentQIndex = parseInt(btn.dataset.idx);
            renderAll();
        });
    });
}

function renderCurrentQuestion() {
    var q = currentQuestions[currentQIndex];

    document.getElementById('modalQuestionText').textContent = q.text;
    document.getElementById('quizDifficulty').textContent = q.difficulty;
    document.getElementById('desktopDifficulty').textContent = q.difficulty;

    // 圖片
    var imgArea = document.getElementById('modalImageArea');
    if (q.imageUrl) {
        imgArea.innerHTML = '<img src="' + q.imageUrl + '" style="max-height:110px; max-width:100%; object-fit:contain; border-radius:8px; border:1px solid #e9e4f5; padding:4px;">';
        imgArea.style.display = 'block';
    } else {
        imgArea.innerHTML = '';
        imgArea.style.display = 'none';
    }

    // 選項
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
            renderAll();
        });
        optsDiv.appendChild(btn);
    }
}

function updateButtons() {
    var isFirst = (currentQIndex === 0);
    var isLast = (currentQIndex === currentQuestions.length - 1);

    document.getElementById('prevBtn').disabled = isFirst;
    document.getElementById('nextBtn').disabled = isLast;
    document.getElementById('desktopPrevBtn').disabled = isFirst;
    document.getElementById('desktopNextBtn').disabled = isLast;
}

function updateTimerDisplay() {
    var m = Math.floor(timeRemaining / 60);
    var s = timeRemaining % 60;
    var timeStr = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    document.getElementById('timerDisplay').textContent = timeStr;
    document.getElementById('desktopTimer').textContent = '⏱️ ' + timeStr;
}

// ============================================================
// 按鈕事件
// ============================================================
document.getElementById('prevBtn').addEventListener('click', function() {
    if (currentQIndex > 0) { currentQIndex--; renderAll(); }
});
document.getElementById('nextBtn').addEventListener('click', function() {
    if (currentQIndex < currentQuestions.length - 1) { currentQIndex++; renderAll(); }
});
document.getElementById('desktopPrevBtn').addEventListener('click', function() {
    if (currentQIndex > 0) { currentQIndex--; renderAll(); }
});
document.getElementById('desktopNextBtn').addEventListener('click', function() {
    if (currentQIndex < currentQuestions.length - 1) { currentQIndex++; renderAll(); }
});

document.getElementById('submitAllBtn').addEventListener('click', function() {
    submitAll();
});
document.getElementById('desktopSubmitBtn').addEventListener('click', function() {
    submitAll();
});

document.getElementById('desktopPeriodicBtn').addEventListener('click', function() {
    alert('📊 周期表功能（測試用）');
});

// ============================================================
// 提交
// ============================================================
function submitAll() {
    if (timerInterval) clearInterval(timerInterval);
    var correctCount = 0;
    for (var i = 0; i < currentQuestions.length; i++) {
        if (currentAnswers[i] === currentQuestions[i].correct) correctCount++;
    }
    var total = currentQuestions.length;
    document.getElementById('resultText').textContent = '✅ ' + correctCount + ' / ' + total + ' 題正確';
    document.getElementById('resultModal').classList.add('show');
    quizModal.classList.remove('show');
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(function() {});
    }
}

document.getElementById('closeResultBtn').addEventListener('click', function() {
    document.getElementById('resultModal').classList.remove('show');
});

// ============================================================
// 全屏邏輯
// ============================================================
function requestFullscreen() {
    var el = document.documentElement;
    if (el.requestFullscreen) {
        el.requestFullscreen().catch(function(err) {
            console.log('全屏請求被拒絕:', err.message);
        });
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(function() {});
    } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
    }
}

function isFullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

// ============================================================
// 方向偵測 + 自動全屏
// ============================================================
function checkOrientationAndFullscreen() {
    var isQuizVisible = quizModal.classList.contains('show');
    if (!isQuizVisible) return;

    var width = window.innerWidth;
    var height = window.innerHeight;
    var isLandscapeNow = width > height;
    var isMobile = width <= 900;

    // 手機 + 橫置 → 進入全屏
    if (isMobile && isLandscapeNow) {
        if (!isFullscreenActive()) {
            requestFullscreen();
        }
        isLandscape = true;
    }
    // 手機 + 直置 → 退出全屏
    else if (isMobile && !isLandscapeNow) {
        if (isFullscreenActive()) {
            exitFullscreen();
        }
        isLandscape = false;
    }
    // 桌面版（>900px）→ 不干涉全屏
    else {
        // 不做任何事
    }
}

// ============================================================
// 監聽方向變化
// ============================================================
var orientationTimer = null;

function handleOrientationChange() {
    clearTimeout(orientationTimer);
    orientationTimer = setTimeout(function() {
        checkOrientationAndFullscreen();
    }, 300);
}

window.addEventListener('resize', handleOrientationChange);
window.addEventListener('orientationchange', function() {
    setTimeout(handleOrientationChange, 400);
});

// 監聽全屏變化（用戶手動退出時同步狀態）
document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) {
        // 用戶手動退出全屏
        // 檢查當前是否仍為橫置，如果是則重新請求
        setTimeout(function() {
            var isQuizVisible = quizModal.classList.contains('show');
            if (isQuizVisible) {
                var width = window.innerWidth;
                var height = window.innerHeight;
                if (width > height && width <= 900) {
                    requestFullscreen();
                }
            }
        }, 300);
    }
});

// 監聽 webkit 全屏變化
document.addEventListener('webkitfullscreenchange', function() {
    if (!document.webkitFullscreenElement) {
        setTimeout(function() {
            var isQuizVisible = quizModal.classList.contains('show');
            if (isQuizVisible) {
                var width = window.innerWidth;
                var height = window.innerHeight;
                if (width > height && width <= 900) {
                    requestFullscreen();
                }
            }
        }, 300);
    }
});

// ============================================================
// 鍵盤快捷鍵（方便測試）
// ============================================================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (quizModal.classList.contains('show')) {
            closeQuiz();
        }
        if (document.getElementById('resultModal').classList.contains('show')) {
            document.getElementById('resultModal').classList.remove('show');
        }
    }
});

console.log('✅ 測試腳本已載入');
console.log('📱 直置 → 手機版 ｜ 橫置 → 桌面版 + 自動全屏');