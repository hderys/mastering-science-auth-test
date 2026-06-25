// ============================================================
// practice.js - 練習核心功能（選題、計時、提交、UI渲染）
// 依賴：core.js（需先載入）
// ============================================================

// ==================== 進度計算函數 ====================
function getUnitMastery(unit) {
    let total = 0, correct = 0;
    for (let ch in window.ALL_UNITS[unit].chapters) {
        for (let q of window.ALL_UNITS[unit].chapters[ch].questions) {
            total++;
            if (userData.latestStatus[q.id] === true) correct++;
        }
    }
    return total === 0 ? 0 : Math.round(correct / total * 100);
}

function getChapterTotalQuestions(unit, chapter) {
    return window.ALL_UNITS[unit]?.chapters[chapter]?.questions.length || 0;
}

function getChapterMastery(unit, chapter) {
    let questions = window.ALL_UNITS[unit]?.chapters[chapter]?.questions || [];
    if (questions.length === 0) return 0;
    let correct = 0;
    for (let q of questions) if (userData.latestStatus[q.id] === true) correct++;
    return Math.round(correct / questions.length * 100);
}

function getChapterDifficultyMastery(unit, chapter, difficultyLevel) {
    let questions = window.ALL_UNITS[unit]?.chapters[chapter]?.questions || [];
    let total = 0, correct = 0;
    for (let q of questions) {
        if (q.difficulty_level === difficultyLevel) {
            total++;
            if (userData.latestStatus[q.id] === true) correct++;
        }
    }
    return total === 0 ? 0 : Math.round(correct / total * 100);
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function hasEverWrong(qid) {
    return userData.allAttempts.some(att => att.qid === qid && !att.isCorrect);
}

function isNotAttempted(qid) {
    return !userData.allAttempts.some(att => att.qid === qid);
}

function isMobile() {
    return window.innerWidth <= 640;
}

// ==================== 挑題邏輯 ====================
function selectQuestionsByDifficultyAndCount(questions, count, preference, isTrial, isUnitTest = false) {
    let filteredQuestions = excludeTranslate ? questions.filter(q => q.difficulty !== "🌐 Translate") : [...questions];
    
    if (isTrial) {
        let sorted = [...filteredQuestions];
        sorted.sort((a, b) => {
            if (a.difficulty_level !== b.difficulty_level) return b.difficulty_level - a.difficulty_level;
            let aWrong = userData.latestStatus[a.id] === false, bWrong = userData.latestStatus[b.id] === false;
            if (aWrong !== bWrong) return aWrong ? -1 : 1;
            return 0;
        });
        return sorted.slice(0, Math.min(count, 50));
    }

    if (isUnitTest) {
        let wrongQuestions = filteredQuestions.filter(q => hasEverWrong(q.id));
        wrongQuestions = shuffleArray(wrongQuestions);
        
        if (wrongQuestions.length >= count) {
            return wrongQuestions.slice(0, count);
        }
        
        let remainingQuestions = filteredQuestions.filter(q => !hasEverWrong(q.id));
        let advancedQuestions = remainingQuestions.filter(q => q.difficulty_level === 2);
        let challengeQuestions = remainingQuestions.filter(q => q.difficulty_level === 3);
        
        advancedQuestions = shuffleArray(advancedQuestions);
        challengeQuestions = shuffleArray(challengeQuestions);
        
        let needed = count - wrongQuestions.length;
        let advCount = Math.round(needed * 0.2);
        let chalCount = needed - advCount;
        
        let selectedAdv = advancedQuestions.slice(0, advCount);
        let selectedChal = challengeQuestions.slice(0, chalCount);
        
        let result = [...wrongQuestions, ...selectedAdv, ...selectedChal];
        
        if (result.length < count) {
            let allRemaining = remainingQuestions.filter(q => 
                !selectedAdv.includes(q) && !selectedChal.includes(q)
            );
            let extra = shuffleArray(allRemaining).slice(0, count - result.length);
            result = [...result, ...extra];
        }
        
        return shuffleArray(result);
    }

    let allowedLevels = [];
    if (preference === 0) {
        allowedLevels = [0, 1];
    } else if (preference === 1) {
        allowedLevels = [2];
    } else if (preference === 2) {
        allowedLevels = [2, 3];
    }

    let wrongQuestions = [];
    let notAttemptedQuestions = [];
    let otherQuestions = [];

    for (let q of filteredQuestions) {
        const level = q.difficulty_level;
        const isAllowed = allowedLevels.includes(level);
        
        if (userData.latestStatus[q.id] === false) {
            wrongQuestions.push(q);
            continue;
        }
        
        if (isNotAttempted(q.id) && isAllowed) {
            notAttemptedQuestions.push(q);
            continue;
        }
        
        if (isAllowed) {
            otherQuestions.push(q);
        }
    }

    let candidates = [...wrongQuestions];
    
    if (candidates.length < count) {
        let shuffledNotAttempted = shuffleArray([...notAttemptedQuestions]);
        candidates = [...candidates, ...shuffledNotAttempted];
    }
    
    if (candidates.length < count) {
        let remaining = count - candidates.length;
        let otherShuffled = shuffleArray([...otherQuestions]);
        
        let selected = [];
        if (preference === 0) {
            let basicTranslate = otherShuffled.filter(q => q.difficulty_level === 0 || q.difficulty_level === 1);
            let advanced = otherShuffled.filter(q => q.difficulty_level === 2);
            let half = Math.ceil(remaining / 2);
            selected = [
                ...shuffleArray(basicTranslate).slice(0, half),
                ...shuffleArray(advanced).slice(0, remaining - half)
            ];
        } else if (preference === 1) {
            let advanced = otherShuffled.filter(q => q.difficulty_level === 2);
            let challenge = otherShuffled.filter(q => q.difficulty_level === 3);
            let half = Math.ceil(remaining / 2);
            selected = [
                ...shuffleArray(advanced).slice(0, half),
                ...shuffleArray(challenge).slice(0, remaining - half)
            ];
        } else if (preference === 2) {
            let advanced = otherShuffled.filter(q => q.difficulty_level === 2);
            let challenge = otherShuffled.filter(q => q.difficulty_level === 3);
            let advCount = Math.ceil(remaining * 0.2);
            selected = [
                ...shuffleArray(advanced).slice(0, advCount),
                ...shuffleArray(challenge).slice(0, remaining - advCount)
            ];
        }
        candidates = [...candidates, ...selected];
    }
    
    candidates = [...new Map(candidates.map(q => [q.id, q])).values()];
    candidates = shuffleArray(candidates);
    
    return candidates.slice(0, Math.min(count, candidates.length));
}

// ==================== UI 渲染函數 ====================
function toggleUnit(unitId) {
    let c = document.getElementById(`chapters-${unitId}`), t = document.getElementById(`toggle-${unitId}`);
    if (c.classList.contains('open')) { c.classList.remove('open'); t.textContent = '▶'; }
    else { c.classList.add('open'); t.textContent = '▼'; }
}

function toggleAchievementUnit(unitId) {
    let c = document.getElementById(`achievement-chapters-${unitId}`), t = document.getElementById(`achievement-toggle-${unitId}`);
    if (c.classList.contains('open')) { c.classList.remove('open'); t.textContent = '▶'; }
    else { c.classList.add('open'); t.textContent = '▼'; }
}

function toggleMistakeChapter(chapterKey, type) {
    let c = document.getElementById(`${type}-${chapterKey}`), t = document.getElementById(`${type}-toggle-${chapterKey}`);
    if (c.classList.contains('open')) { c.classList.remove('open'); t.textContent = '▶'; }
    else { c.classList.add('open'); t.textContent = '▼'; }
}

function toggleCollapsible(id) {
    let el = document.getElementById(id);
    if (el) {
        if (el.classList.contains('collapsed')) el.classList.remove('collapsed');
        else el.classList.add('collapsed');
    }
}

// ==================== 顯示設定彈窗 ====================
function showSettingsModal() {
    const devBtn = document.getElementById('devUnlockBtn');
    if (devBtn) {
        if (currentUser && currentUser.isTeacher) {
            devBtn.style.display = 'block';
        } else {
            devBtn.style.display = 'none';
        }
    }
    document.getElementById('settingsModal').style.display = 'flex';
}

// ==================== renderPractice（練習頁面） ====================
async function renderPractice() {
    const container = document.getElementById('practicePanel');
    if (!container) return;
    if (!window.ALL_UNITS) { container.innerHTML = '<div class="card">題庫未載入</div>'; return; }
    
    const className = currentUser.className;
    const classSettings = await loadClassSettings(className) || {};
    const openChapters = classSettings.openChapters || [];
    
    const isTeacher = currentUser.isTeacher || false;
    
    let html = '';
    for (let unit in window.ALL_UNITS) {
        let unitObj = window.ALL_UNITS[unit], chapters = unitObj.chapters;
        if (Object.keys(chapters).length === 0) continue;
        
        let filteredChapters = {};
        for (let ch in chapters) {
            const chNum = parseInt(ch);
            if (isTeacher || openChapters.length === 0 || openChapters.includes(chNum)) {
                filteredChapters[ch] = chapters[ch];
            }
        }
        if (Object.keys(filteredChapters).length === 0) continue;
        
        let mastery = getUnitMastery(unit);
        let unitNameForDisplay = isMobile() ? unitObj.name.replace(/（[^）]*）/, '') : unitObj.name;
        
        html += `<div class="unit-group"><div class="unit-header" onclick="toggleUnit('${unit}')">
            <div class="unit-header-left">
                <span class="unit-toggle" id="toggle-${unit}">▶</span>
                <span>${unitNameForDisplay}</span>
            </div>
            <div class="mastery-wrapper">
                <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${mastery}%;"></div></div>
                <span class="mastery-text">完成度 ${mastery}%</span>
                <button class="btn btn-small unit-test-btn" data-unit="${unit}" style="background:var(--deep-purple-light); padding:0.15rem 0.5rem; font-size:0.7rem;">📝 單元測驗</button>
            </div>
        </div><div class="chapters-container" id="chapters-${unit}">`;
        for (let ch in filteredChapters) {
            let chMastery = getChapterMastery(unit, ch), chTotal = getChapterTotalQuestions(unit, ch);
            let chNameDisplay = filteredChapters[ch].name;
            if (isMobile()) {
                html += `<div class="chapter-item">
                    <span class="chapter-name">${chNameDisplay} (${chTotal} 題)</span>
                    <div class="chapter-row">
                        <div class="progress-wrapper">
                            <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${chMastery}%;"></div></div>
                            <span class="mastery-text">${chMastery}%</span>
                        </div>
                        <div class="chapter-actions">
                            <button class="btn btn-small practice-chapter" data-unit="${unit}" data-chapter="${ch}">✏️練習</button>
                            <button class="btn btn-danger btn-small clear-chapter" data-unit="${unit}" data-chapter="${ch}">🗑️重置</button>
                        </div>
                    </div>
                </div>`;
            } else {
                html += `<div class="chapter-item">
                    <span class="chapter-name">${chNameDisplay} (${chTotal} 題)</span>
                    <div class="mastery-wrapper">
                        <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${chMastery}%;"></div></div>
                        <span class="mastery-text">完成度 ${chMastery}%</span>
                    </div>
                    <div class="chapter-actions">
                        <button class="btn btn-small practice-chapter" data-unit="${unit}" data-chapter="${ch}">✏️ 練習</button>
                        <button class="btn btn-danger btn-small clear-chapter" data-unit="${unit}" data-chapter="${ch}">🗑️ 重置</button>
                    </div>
                </div>`;
            }
        }
        html += `</div></div>`;
    }
    container.innerHTML = html;
    
    const unit2Container = document.getElementById('chapters-2');
    if (unit2Container) {
        unit2Container.classList.add('open');
        const toggle2 = document.getElementById('toggle-2');
        if (toggle2) toggle2.textContent = '▼';
    }
    
    document.querySelectorAll('.practice-chapter').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        pendingUnit = btn.dataset.unit; 
        pendingChapter = btn.dataset.chapter; 
        isSingleQuestionMode = false;
        updateSettingsUnlockStatus(); 
        showSettingsModal();
    }));
    
    document.querySelectorAll('.unit-test-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const unit = btn.dataset.unit;
        // ✅ 加入確認視窗
        const unitObj = window.ALL_UNITS[unit];
        const unitName = unitObj ? unitObj.name : '單元 ' + unit;
        const confirmMsg = '📝 確認開始單元測驗？\n\n你即將挑戰【' + unitName + '】的單元測驗，共 36 題。\n\n⏱️ 每題限時 90 秒\n📊 完成後會顯示 DSE 等級預測\n\n準備好了嗎？';
        if (confirm(confirmMsg)) {
            startUnitTest(unit);
        }
    }));
    
    document.querySelectorAll('.clear-chapter').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation(); let unit = btn.dataset.unit, chapter = btn.dataset.chapter;
        if (confirm(`確定清空「${window.ALL_UNITS[unit].chapters[chapter].name}」的所有練習紀錄？`)) {
            let qs = window.ALL_UNITS[unit].chapters[chapter].questions;
            for (let q of qs) delete userData.latestStatus[q.id];
            userData.allAttempts = userData.allAttempts.filter(att => !qs.some(q => q.id === att.qid));
            saveUserData(); renderPractice(); renderMyMistakes(); renderPastMistakes(); renderPinned(); renderHistory(); renderAchievements(); updateSettingsUnlockStatus();
        }
    }));
}

// ==================== 單元測驗功能 ====================
function startUnitTest(unit) {
    let allQuestions = [];
    for (let ch in window.ALL_UNITS[unit].chapters) {
        allQuestions = allQuestions.concat(window.ALL_UNITS[unit].chapters[ch].questions);
    }
    if (allQuestions.length === 0) {
        alert('此單元暫無題目');
        return;
    }
    
    let count = Math.min(36, allQuestions.length);
    let selectedQuestions = selectQuestionsByDifficultyAndCount(allQuestions, count, 1, false, true);
    
    if (selectedQuestions.length < count) {
        let remaining = allQuestions.filter(q => !selectedQuestions.includes(q));
        let shuffled = shuffleArray(remaining);
        selectedQuestions = [...selectedQuestions, ...shuffled.slice(0, count - selectedQuestions.length)];
    }
    selectedQuestions = shuffleArray(selectedQuestions);
    
    currentUnit = unit;
    currentChapter = null;
    currentQuestions = selectedQuestions;
    currentOptionsMapping = currentQuestions.map(q => {
        if (q.sf === 0) {
            let letters = ['A', 'B', 'C', 'D'], map = {};
            for (let i = 0; i < 4; i++) { let optText = q.options[i].substring(3); map[letters[i]] = optText; }
            return { letterToText: map, correctLetter: q.correct };
        } else {
            let texts = q.options.map(opt => opt.replace(/^[A-D]\.\s*/, '')), shuffled = shuffleArray([...texts]), letters = ['A', 'B', 'C', 'D'], map = {};
            for (let i = 0; i < 4; i++) map[letters[i]] = shuffled[i];
            let correctText = q.options.find(opt => opt.startsWith(q.correct)).replace(/^[A-D]\.\s*/, ''), correctLetter = null;
            for (let [l, t] of Object.entries(map)) if (t === correctText) { correctLetter = l; break; }
            return { letterToText: map, correctLetter: correctLetter };
        }
    });
    currentAnswers = new Array(selectedQuestions.length).fill(null);
    currentQIndex = 0;
    isTrialMode = false;
    isSingleQuestionMode = false;
    selectedCount = 36;
    
    let timePerQuestion = 90;
    timeRemaining = selectedQuestions.length * timePerQuestion;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timeRemaining <= 0) submitAll();
        else { timeRemaining--; updateTimerDisplay(); }
    }, 1000);
    
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
    }
    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) submitBtn.style.animation = '';
    
    document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('explainModal').style.display = 'none';
    document.getElementById('resultModal').style.display = 'none';
    
    startTime = Date.now();
    
    if (isMobile()) {
        showQuizModal();
    } else {
        showDesktopQuizModal();
    }
}

// ==================== 單題練習功能 ====================
function startSingleQuestion(qid, source) {
    let foundQ = null;
    let foundUnit = null;
    let foundChapter = null;
    for (let u in window.ALL_UNITS) {
        for (let c in window.ALL_UNITS[u].chapters) {
            let q = window.ALL_UNITS[u].chapters[c].questions.find(qq => qq.id === qid);
            if (q) {
                foundQ = q;
                foundUnit = u;
                foundChapter = c;
                break;
            }
        }
        if (foundQ) break;
    }
    if (!foundQ) {
        alert('找不到該題目');
        return;
    }
    
    currentUnit = foundUnit;
    currentChapter = foundChapter;
    currentQuestions = [foundQ];
    currentOptionsMapping = currentQuestions.map(q => {
        if (q.sf === 0) {
            let letters = ['A', 'B', 'C', 'D'], map = {};
            for (let i = 0; i < 4; i++) { let optText = q.options[i].substring(3); map[letters[i]] = optText; }
            return { letterToText: map, correctLetter: q.correct };
        } else {
            let texts = q.options.map(opt => opt.replace(/^[A-D]\.\s*/, '')), shuffled = shuffleArray([...texts]), letters = ['A', 'B', 'C', 'D'], map = {};
            for (let i = 0; i < 4; i++) map[letters[i]] = shuffled[i];
            let correctText = q.options.find(opt => opt.startsWith(q.correct)).replace(/^[A-D]\.\s*/, ''), correctLetter = null;
            for (let [l, t] of Object.entries(map)) if (t === correctText) { correctLetter = l; break; }
            return { letterToText: map, correctLetter: correctLetter };
        }
    });
    currentAnswers = new Array(1).fill(null);
    currentQIndex = 0;
    isSingleQuestionMode = true;
    singleQuestionSource = source;
    isTrialMode = false;
    selectedDifficulty = 1;
    
    timeRemaining = 90;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timeRemaining <= 0) submitAll();
        else { timeRemaining--; updateTimerDisplay(); }
    }, 1000);
    
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
    }
    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) submitBtn.style.animation = '';
    
    document.getElementById('settingsModal').style.display = 'none';
    startTime = Date.now();
    showQuizModal();
}

// ==================== updateSettingsUnlockStatus ====================
function updateSettingsUnlockStatus() {
    if (!pendingUnit || !pendingChapter) return;
    
    let questions = window.ALL_UNITS[pendingUnit].chapters[pendingChapter].questions;
    
    let availableQuestions = excludeTranslate ? questions.filter(q => q.difficulty !== "🌐 Translate") : [...questions];
    let basicQuestions = availableQuestions.filter(q => q.difficulty_level === 1);
    let basicCorrect = basicQuestions.filter(q => userData.latestStatus[q.id] === true).length;
    let basicTotal = basicQuestions.length;
    let basicPercent = basicTotal === 0 ? 0 : Math.round(basicCorrect / basicTotal * 100);
    
    let advancedQuestions = availableQuestions.filter(q => q.difficulty_level === 2);
    let advancedCorrect = advancedQuestions.filter(q => userData.latestStatus[q.id] === true).length;
    let advancedTotal = advancedQuestions.length;
    let advancedPercent = advancedTotal === 0 ? 0 : Math.round(advancedCorrect / advancedTotal * 100);
    
    let challengeQuestions = availableQuestions.filter(q => q.difficulty_level === 3);
    let challengeCorrect = challengeQuestions.filter(q => userData.latestStatus[q.id] === true).length;
    let challengeTotal = challengeQuestions.length;
    let challengePercent = challengeTotal === 0 ? 0 : Math.round(challengeCorrect / challengeTotal * 100);
    
    let star3Unlocked = basicPercent >= 80;
    let star5Unlocked = star3Unlocked && advancedPercent >= 80;
    let trialUnlocked = star5Unlocked && challengePercent >= 80;
    
    let targetPercent = 0;
    let targetCorrect = 0;
    let targetTotal = 0;
    let targetName = '';
    let currentStage = 'locked';
    
    if (!star3Unlocked) {
        currentStage = 'locked';
        targetPercent = basicPercent;
        targetCorrect = basicCorrect;
        targetTotal = basicTotal;
        targetName = '三星 & 36題';
    } else if (!star5Unlocked) {
        currentStage = 'star3';
        targetPercent = advancedPercent;
        targetCorrect = advancedCorrect;
        targetTotal = advancedTotal;
        targetName = '五星';
    } else if (!trialUnlocked) {
        currentStage = 'star5';
        targetPercent = challengePercent;
        targetCorrect = challengeCorrect;
        targetTotal = challengeTotal;
        targetName = '試煉模式';
    } else {
        currentStage = 'complete';
    }
    
    let needed = 0;
    if (currentStage === 'locked') {
        needed = Math.ceil(0.8 * basicTotal) - basicCorrect;
        if (needed < 0) needed = 0;
    } else if (currentStage === 'star3') {
        needed = Math.ceil(0.8 * advancedTotal) - advancedCorrect;
        if (needed < 0) needed = 0;
    } else if (currentStage === 'star5') {
        needed = Math.ceil(0.8 * challengeTotal) - challengeCorrect;
        if (needed < 0) needed = 0;
    }
    
    let dM = document.getElementById('diff-medium');
    let dH = document.getElementById('diff-hard');
    let tM = document.getElementById('trial-mode');
    let diffHint = document.getElementById('diffHint');
    
    if (dM) {
        if (star3Unlocked) {
            dM.classList.remove('locked');
            dM.disabled = false;
            dM.innerHTML = '<span class="stars">★★★</span><span class="label">3 星</span>';
        } else {
            dM.classList.add('locked');
            dM.disabled = true;
            if (selectedDifficulty === 1) {
                selectedDifficulty = 0;
                document.getElementById('diff-easy').classList.add('active');
                document.getElementById('diff-medium').classList.remove('active');
                document.getElementById('diff-hard').classList.remove('active');
            }
        }
    }
    
    if (dH) {
        if (star5Unlocked) {
            dH.classList.remove('locked');
            dH.disabled = false;
            dH.innerHTML = '<span class="stars">★★★★★</span><span class="label">5 星</span>';
        } else {
            dH.classList.add('locked');
            dH.disabled = true;
            if (selectedDifficulty === 2) {
                selectedDifficulty = 0;
                document.getElementById('diff-easy').classList.add('active');
                document.getElementById('diff-medium').classList.remove('active');
                document.getElementById('diff-hard').classList.remove('active');
            }
        }
    }
    
    if (tM) {
        if (trialUnlocked) {
            tM.classList.remove('locked');
            tM.disabled = false;
            tM.innerHTML = '🔥 5** 試煉模式';
        } else {
            tM.classList.add('locked');
            tM.disabled = true;
        }
    }
    
    let count10 = document.getElementById('count-10');
    let count20 = document.getElementById('count-20');
    let count36 = document.getElementById('count-36');
    let customInput = document.getElementById('customCount');
    let countHint = document.getElementById('countHint');
    
    if (count10) {
        count10.disabled = false;
        count10.classList.remove('locked');
    }
    if (count20) {
        count20.disabled = false;
        count20.classList.remove('locked');
    }
    
    let maxCustom = 0;
    if (selectedDifficulty === 0) {
        if (excludeTranslate) {
            maxCustom = basicTotal;
        } else {
            maxCustom = questions.filter(q => q.difficulty_level === 0 || q.difficulty_level === 1).length;
        }
    } else if (selectedDifficulty === 1) {
        maxCustom = availableQuestions.length;
    } else if (selectedDifficulty === 2) {
        maxCustom = advancedTotal + challengeTotal;
    } else if (isTrialMode) {
        maxCustom = Math.min(availableQuestions.length, 50);
    }
    maxCustom = Math.min(maxCustom, 50);
    if (maxCustom < 1) maxCustom = 1;
    
    if (count36 && customInput) {
        if (star3Unlocked) {
            count36.disabled = false;
            count36.classList.remove('locked');
            count36.innerHTML = '36 題';
            customInput.disabled = false;
            customInput.style.opacity = '1';
            customInput.max = maxCustom;
            
            let currentVal = parseInt(customInput.value);
            if (isNaN(currentVal)) currentVal = 10;
            if (currentVal > maxCustom) {
                customInput.value = maxCustom;
                customCount = maxCustom;
                selectedCount = maxCustom;
            } else if (currentVal < 1) {
                customInput.value = 1;
                customCount = 1;
                selectedCount = 1;
            } else {
                customCount = currentVal;
                selectedCount = currentVal;
            }
            
            if (countHint) countHint.innerHTML = `✅ 36題及自訂題數已解鎖！(上限 ${maxCustom} 題)`;
        } else {
            count36.disabled = true;
            count36.classList.add('locked');
            count36.innerHTML = '36 題 🔒';
            customInput.disabled = true;
            customInput.style.opacity = '0.5';
            if (countHint) countHint.innerHTML = `🔒 36題及自訂題數需Basic正確率達80%解鎖 (目前 ${basicPercent}%)`;
        }
    }
    
    if (diffHint) {
        if (currentStage === 'locked') {
            diffHint.innerHTML = `🔒 解鎖三星需要 Basic 題正確率 ≥ 80% (目前 ${basicPercent}%)`;
        } else if (currentStage === 'star3') {
            diffHint.innerHTML = `🔒 解鎖五星需要 Advanced 題正確率 ≥ 80% (目前 ${advancedPercent}%)`;
        } else if (currentStage === 'star5') {
            diffHint.innerHTML = `🔒 解鎖試煉模式需要 Challenge 題正確率 ≥ 80% (目前 ${challengePercent}%)`;
        } else {
            diffHint.innerHTML = `✅ 所有難度已解鎖！`;
        }
    }
    
    let progressContainer = document.getElementById('star3-progress-container');
    if (!progressContainer && diffHint && diffHint.parentNode) {
        progressContainer = document.createElement('div');
        progressContainer.id = 'star3-progress-container';
        progressContainer.className = 'star3-progress-container';
        diffHint.parentNode.appendChild(progressContainer);
    }
    
    if (progressContainer) {
        if (currentStage === 'complete') {
            progressContainer.innerHTML = `
                <div class="star3-progress-bar">
                    <div class="star3-progress-fill unlocked" style="width: 100%;"></div>
                </div>
                <div class="star3-progress-text unlocked">🏆 恭喜！全部難度已解鎖！所有難度皆可自由選擇</div>
            `;
        } else {
            let fillClass = (targetPercent >= 80) ? 'unlocked' : '';
            let statusText = (targetPercent >= 80) ? '✅ 已達標！' : `尚需 ${needed} 題`;
            progressContainer.innerHTML = `
                <div class="star3-progress-bar">
                    <div class="star3-progress-fill ${fillClass}" style="width: ${targetPercent}%;"></div>
                </div>
                <div class="star3-progress-text ${fillClass}">📈 解鎖${targetName}進度：${targetPercent}% (${targetCorrect}/${targetTotal}) ${statusText}</div>
            `;
        }
    }
}

// ==================== startPracticeWithSettings ====================
function startPracticeWithSettings() {
    let unit = pendingUnit, chapter = pendingChapter;
    let allQuestions = [...window.ALL_UNITS[unit].chapters[chapter].questions], total = allQuestions.length;
    let count = customCount > 0 ? customCount : selectedCount;
    if (count > total) count = total;
    if (count < 1) count = 1;
    let selectedQuestions = selectQuestionsByDifficultyAndCount(allQuestions, count, selectedDifficulty, isTrialMode, false);
    selectedQuestions = shuffleArray(selectedQuestions);
    currentUnit = unit;
    currentChapter = chapter;
    currentQuestions = selectedQuestions;
    currentOptionsMapping = currentQuestions.map(q => {
        if (q.sf === 0) {
            let letters = ['A', 'B', 'C', 'D'], map = {};
            for (let i = 0; i < 4; i++) { let optText = q.options[i].substring(3); map[letters[i]] = optText; }
            return { letterToText: map, correctLetter: q.correct };
        } else {
            let texts = q.options.map(opt => opt.replace(/^[A-D]\.\s*/, '')), shuffled = shuffleArray([...texts]), letters = ['A', 'B', 'C', 'D'], map = {};
            for (let i = 0; i < 4; i++) map[letters[i]] = shuffled[i];
            let correctText = q.options.find(opt => opt.startsWith(q.correct)).replace(/^[A-D]\.\s*/, ''), correctLetter = null;
            for (let [l, t] of Object.entries(map)) if (t === correctText) { correctLetter = l; break; }
            return { letterToText: map, correctLetter: correctLetter };
        }
    });
    currentAnswers = new Array(selectedQuestions.length).fill(null);
    currentQIndex = 0;
    isSingleQuestionMode = false;
    let timePerQuestion = selectedDifficulty == 0 ? 108 : (selectedDifficulty == 2 ? 75 : 90);
    timeRemaining = selectedQuestions.length * timePerQuestion;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (timeRemaining <= 0) submitAll();
        else { timeRemaining--; updateTimerDisplay(); }
    }, 1000);
    
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
    }
    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) submitBtn.style.animation = '';
    
    document.getElementById('settingsModal').style.display = 'none';
    
    startTime = Date.now();
    
    if (isMobile()) {
        showQuizModal();
    } else {
        showDesktopQuizModal();
    }
}

// ==================== showExplainModal ====================
function showExplainModal(question, userLetter, correctLetter, userText, correctText, isCorrect) {
    const isFav = userData.favorites.includes(question.id);
    const favIcon = isFav ? '⭐' : '☆';
    const favText = isFav ? '取消收藏' : '收藏';
    
    const qIndex = currentQuestions.findIndex(q => q.id === question.id);
    let optionsHtml = '';
    
    if (qIndex !== -1 && currentOptionsMapping[qIndex]) {
        const map = currentOptionsMapping[qIndex];
        const letters = ['A', 'B', 'C', 'D'];
        for (let l of letters) {
            const isUser = (l === userLetter);
            const isCor = (l === correctLetter);
            let cls = 'explain-option-normal';
            if (isCor) cls = 'explain-option-correct';
            else if (isUser && !isCor) cls = 'explain-option-wrong';
            optionsHtml += `<div class="${cls}">${l}. ${map.letterToText[l]}</div>`;
        }
    } else {
        for (let opt of question.options) {
            let l = opt[0], t = opt.substring(3), isUser = (l === userLetter), isCor = (l === correctLetter);
            let cls = 'explain-option-normal';
            if (isCor) cls = 'explain-option-correct';
            else if (isUser && !isCor) cls = 'explain-option-wrong';
            optionsHtml += `<div class="${cls}">${l}. ${t}</div>`;
        }
    }
    
    let ansClass = isCorrect ? 'answer-correct' : 'answer-wrong';
    let ansHtml = `<div class="answer-comparison"><span>你的答案: <span class="${ansClass}">${userLetter}</span></span><span>正解: <span class="${ansClass}">${correctLetter}</span></span></div>`;
    
    let imageHtml = '';
    if (question.imageUrl) {
        imageHtml = `<div style="text-align:center; margin: 0.5rem 0;">
            <img src="${question.imageUrl}" style="max-height:150px; max-width:100%; border-radius:8px; cursor:pointer;" onclick="document.getElementById('zoomImage').src='${question.imageUrl}'; document.getElementById('imageZoomModal').style.display='flex';">
            <div style="font-size:0.65rem; color:#999; margin-top:4px;">🖱️ 點擊圖片放大</div>
        </div>`;
    }
    
    let headerHtml = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
        <strong style="font-size:1.1rem;">📖 題目與題解</strong>
        <button onclick="toggleFavorite('${question.id}')" class="btn" style="background:var(--deep-purple-light); padding:0.2rem 0.8rem; font-size:0.85rem;">${favIcon} ${favText}</button>
    </div>`;
    
    let html = `${headerHtml}
                <div style="margin-bottom:0.8rem;"><strong>題目:</strong> ${question.text}</div>
                ${imageHtml}
                ${optionsHtml}
                <div style="margin:0.8rem 0; padding:0.4rem; background:#f0f0f0; border-radius:12px;"><strong>📖 題解:</strong> ${question.explanation || '無'}</div>
                ${ansHtml}`;
    document.getElementById('explainContent').innerHTML = html;
    document.getElementById('explainModal').style.display = 'flex';
}

// ==================== toggleFavorite ====================
function toggleFavorite(qid) {
    if (userData.favorites.includes(qid)) {
        userData.favorites = userData.favorites.filter(id => id !== qid);
    } else {
        userData.favorites.push(qid);
    }
    saveUserData();
    renderPinned();
    renderMyMistakes();
    renderPastMistakes();
}

// ==================== 元素周期表功能 ====================
function showPeriodicTable() {
    const imgUrl = 'https://raw.githubusercontent.com/hderys/mastering-science-images/main/webp_image/periodic_table.png';
    document.getElementById('zoomImage').src = imgUrl;
    document.getElementById('imageZoomModal').style.display = 'flex';
}

function closeImageZoom() {
    document.getElementById('imageZoomModal').style.display = 'none';
}

// ==================== 顯示 DSE 等級預測彈窗 ====================
function showDSEResult(accuracy, correctCount, totalCount) {
    let level = '';
    let levelClass = '';
    let emoji = '';
    
    if (accuracy >= 95) {
        level = '5**';
        levelClass = 'level-5star';
        emoji = '🌟';
    } else if (accuracy >= 90) {
        level = '5*';
        levelClass = 'level-5star';
        emoji = '🌟';
    } else if (accuracy >= 85) {
        level = '5';
        levelClass = 'level-5';
        emoji = '🌟';
    } else if (accuracy >= 78) {
        level = '4';
        levelClass = 'level-4';
        emoji = '📘';
    } else if (accuracy >= 57) {
        level = '3';
        levelClass = 'level-3';
        emoji = '📗';
    } else {
        level = '尚未達標';
        levelClass = 'level-fail';
        emoji = '📖';
    }
    
    const isPass = accuracy >= 57;
    const passText = isPass ? '🎉 繼續加油！' : '💪 請多多複習，下次一定可以！';
    
    const overlay = document.createElement('div');
    overlay.id = 'dseResultOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center;
        z-index: 9999; animation: fadeIn 0.3s ease;
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
        background: linear-gradient(145deg, #1a1a2e, #2d2d44);
        border-radius: 32px; padding: 2.5rem 3rem; max-width: 480px; width: 90%;
        text-align: center; color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        animation: slideUp 0.4s ease; border: 2px solid rgba(255,215,0,0.3);
    `;
    
    let levelColor = '#ffd700';
    if (level === '4') levelColor = '#4a9eff';
    else if (level === '3') levelColor = '#34d399';
    else if (level === '尚未達標') levelColor = '#94a3b8';
    
    card.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎉</div>
        <div style="font-size: 1.2rem; font-weight: 600; color: #a78bfa; margin-bottom: 0.3rem;">單元測驗完成！</div>
        <div style="font-size: 1rem; color: #94a3b8; margin-bottom: 1.5rem;">
            正確率：<span style="color: white; font-weight: 700;">${accuracy}%</span>
            （${correctCount} / ${totalCount} 題）
        </div>
        <div style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #94a3b8;">📊 DSE 預計等級</div>
        <div style="font-size: 4rem; font-weight: 900; color: ${levelColor}; text-shadow: 0 0 30px ${levelColor}40; line-height: 1.2;">
            ${emoji} ${level}
        </div>
        <div style="margin: 1.5rem 0 2rem 0; font-size: 1rem; color: #cbd5e1;">
            ${passText}
        </div>
        <button onclick="closeDSEResult()" style="
            background: linear-gradient(135deg, #7c3aed, #4a1d8c);
            color: white; border: none; padding: 0.8rem 2.5rem;
            border-radius: 60px; font-size: 1rem; font-weight: 600;
            cursor: pointer; transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            查看詳細成績
        </button>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeDSEResult();
        }
    });
    
    window._dseResultCallback = function() {
        closeDSEResult();
    };
}

function closeDSEResult() {
    const overlay = document.getElementById('dseResultOverlay');
    if (overlay) {
        overlay.remove();
    }
    if (window._dseResultCallback) {
        window._dseResultCallback();
    }
}

// ==================== showQuizModal（手機版） ====================
function showQuizModal() { 
    renderQuizNav(); 
    renderCurrentQuestion(); 
    document.getElementById('quizModal').style.display = 'flex';
    
    // ✅ 顯示首次橫置提示（由 landscape.js 提供）
    if (typeof showLandscapeHint === 'function') {
        setTimeout(showLandscapeHint, 500);
    }
    
    const isMobileDevice = window.innerWidth <= 640;
    const footerClass = isMobileDevice ? 'quiz-footer-mobile' : 'quiz-footer-desktop';
    const footer = document.querySelector(`.${footerClass}`);
    const footerElement = footer || document.querySelector('.quiz-footer');
    
    let periodicBtn = document.getElementById('periodicTableBtn');
    const shouldShowPeriodicTable = (currentChapter && parseInt(currentChapter) >= 6) || currentChapter === null;
    
    if (shouldShowPeriodicTable) {
        if (!periodicBtn) {
            periodicBtn = document.createElement('button');
            periodicBtn.id = 'periodicTableBtn';
            periodicBtn.className = 'btn btn-outline';
            periodicBtn.textContent = '開啟周期表';
            periodicBtn.addEventListener('click', showPeriodicTable);
            const nextBtn = document.getElementById('nextBtn');
            if (nextBtn && footerElement) {
                footerElement.insertBefore(periodicBtn, nextBtn.nextSibling);
            }
        }
        periodicBtn.style.display = 'inline-block';
    } else {
        if (periodicBtn) {
            periodicBtn.style.display = 'none';
        }
    }
}

function renderQuizNav() {
    let nav = document.getElementById('questionNav'), html = '';
    for (let i = 0; i < currentQuestions.length; i++) {
        let cls = '';
        if (i === currentQIndex) cls = 'current';
        else if (currentAnswers[i] !== null) cls = 'answered';
        else cls = 'unanswered';
        html += `<button class="q-nav-btn ${cls}" data-idx="${i}">${i + 1}</button>`;
    }
    nav.innerHTML = html;
    document.getElementById('quizCounter').innerHTML = `${currentQIndex + 1} / ${currentQuestions.length}`;
    document.querySelectorAll('.q-nav-btn').forEach(btn => btn.addEventListener('click', (e) => { currentQIndex = parseInt(btn.dataset.idx); renderQuizNav(); renderCurrentQuestion(); updateNavButtons(); }));
    checkAllQuestionsAnswered();
}

// ==================== renderCurrentQuestion（手機版） ====================
function renderCurrentQuestion() {
    let q = currentQuestions[currentQIndex];
    let map = currentOptionsMapping[currentQIndex];
    let hasImage = q.imageUrl !== null;
    
    const isMobileDevice = window.innerWidth <= 640;
    const layoutClass = isMobileDevice ? 'quiz-layout-mobile' : 'quiz-layout-desktop';
    const imageClass = isMobileDevice ? 'image-area-mobile' : 'image-area-desktop';
    const optionsClass = isMobileDevice ? 'options-area-mobile' : 'options-area-desktop';
    const footerClass = isMobileDevice ? 'quiz-footer-mobile' : 'quiz-footer-desktop';
    
    const modalContent = document.querySelector('#quizModal .modal-content');
    if (modalContent) {
        modalContent.classList.remove('difficulty-translate', 'difficulty-basic', 'difficulty-advanced', 'difficulty-challenge');
        if (q.difficulty === '🌐 Translate') {
            modalContent.classList.add('difficulty-translate');
        } else if (q.difficulty === '✅ Basic') {
            modalContent.classList.add('difficulty-basic');
        } else if (q.difficulty === '📈 Advanced') {
            modalContent.classList.add('difficulty-advanced');
        } else if (q.difficulty === '🔥 Challenge') {
            modalContent.classList.add('difficulty-challenge');
        }
    }
    
    document.getElementById('modalQuestionText').innerHTML = q.text;
    document.getElementById('quizCounter').innerHTML = `${currentQIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('quizDifficulty').innerHTML = q.difficulty;
    
    let imgArea = document.getElementById('modalImageArea');
    let quizLayout = document.querySelector(`.${layoutClass}`);
    
    if (!quizLayout) {
        const quizBodyEl = document.querySelector('.quiz-body');
        const originalOptions = document.getElementById('modalOptions');
        const originalImgArea = imgArea;
        
        const layoutDiv = document.createElement('div');
        layoutDiv.className = layoutClass;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = optionsClass;
        optionsDiv.id = 'options-area-container';
        
        const imageDiv = document.createElement('div');
        imageDiv.className = imageClass;
        imageDiv.id = 'image-area-container';
        
        if (originalOptions && originalOptions.parentNode) {
            originalOptions.parentNode.insertBefore(layoutDiv, originalOptions);
            if (isMobileDevice) {
                layoutDiv.appendChild(imageDiv);
                layoutDiv.appendChild(optionsDiv);
            } else {
                layoutDiv.appendChild(optionsDiv);
                layoutDiv.appendChild(imageDiv);
            }
            optionsDiv.appendChild(originalOptions);
        }
        if (originalImgArea) {
            imageDiv.appendChild(originalImgArea);
        }
        quizLayout = layoutDiv;
    }
    
    const imageAreaContainer = document.getElementById('image-area-container');
    const optionsArea = document.getElementById('options-area-container');
    
    if (imageAreaContainer) {
        imageAreaContainer.className = imageClass;
        imageAreaContainer.id = 'image-area-container';
    }
    if (optionsArea) {
        optionsArea.className = optionsClass;
        optionsArea.id = 'options-area-container';
    }
    if (quizLayout) {
        quizLayout.className = layoutClass;
    }
    
    if (hasImage) {
        if (imageAreaContainer) imageAreaContainer.style.display = 'block';
        if (quizLayout) quizLayout.classList.remove('no-image');
        
        let imgHtml = '';
        if (q.imageUrl) {
            imgHtml = `<img src="${q.imageUrl}" class="quiz-image" id="quizImageThumb" style="max-width:100%; max-height:180px; object-fit:contain; cursor:pointer; border-radius:8px;">`;
        }
        document.getElementById('modalImageArea').innerHTML = imgHtml;
        document.getElementById('quizImageThumb')?.addEventListener('click', () => {
            document.getElementById('zoomImage').src = q.imageUrl;
            document.getElementById('imageZoomModal').style.display = 'flex';
        });
        
        if (optionsArea) {
            optionsArea.classList.add('vertical');
            optionsArea.classList.remove('grid');
        }
    } else {
        if (imageAreaContainer) imageAreaContainer.style.display = 'none';
        if (quizLayout) quizLayout.classList.add('no-image');
        document.getElementById('modalImageArea').innerHTML = '';
        
        if (optionsArea) {
            optionsArea.classList.add('grid');
            optionsArea.classList.remove('vertical');
        }
    }
    
    let optsDiv = document.getElementById('modalOptions');
    optsDiv.innerHTML = '';
    optsDiv.className = 'options-grid';
    
    for (let l of ['A', 'B', 'C', 'D']) {
        let btn = document.createElement('button');
        btn.className = 'option-btn';
        if (currentAnswers[currentQIndex] === l) btn.classList.add('selected');
        btn.textContent = `${l}. ${map.letterToText[l]}`;
        btn.addEventListener('click', () => {
            currentAnswers[currentQIndex] = l;
            renderCurrentQuestion();
            renderQuizNav();
            checkAllQuestionsAnswered();
        });
        optsDiv.appendChild(btn);
    }
    
    const footerElement = document.querySelector('.quiz-footer');
    if (footerElement) {
        footerElement.className = footerClass;
    }
    
    updateNavButtons();
    checkAllQuestionsAnswered();
}

function updateNavButtons() { let prev = document.getElementById('prevBtn'), next = document.getElementById('nextBtn'); prev.disabled = (currentQIndex === 0); next.disabled = (currentQIndex === currentQuestions.length - 1); }

function updateTimerDisplay() { let m = Math.floor(timeRemaining / 60), s = timeRemaining % 60; document.getElementById('timerDisplay').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; }

function checkAllQuestionsAnswered() {
    if (currentQuestions.length === 0) return;
    
    const allAnswered = currentAnswers.every(a => a !== null && a !== undefined);
    const submitBtn = document.getElementById('submitAllBtn');
    if (!submitBtn) return;
    
    if (allAnswered && currentAnswers.length > 0) {
        if (!blinkInterval) {
            blinkInterval = setInterval(() => {
                submitBtn.style.animation = 'blink 0.3s step-end infinite';
            }, 100);
        }
    } else {
        if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
            submitBtn.style.animation = '';
        }
    }
}

// ==================== submitAll ====================
function submitAll() {
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
        const submitBtn = document.getElementById('submitAllBtn');
        if (submitBtn) submitBtn.style.animation = '';
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
    
    let results = [], batch = [], correctCount = 0;
    let consecutiveCorrect = userData.stats.consecutiveCorrect || 0;
    let answeredCount = currentAnswers.filter(a => a !== null).length;
    let isBlankPaper = (answeredCount === 0);
    const isUnitTestMode = (currentChapter === null && currentQuestions.length > 1);

    // ✅ 未答完提醒（含操作指引）
    const total = currentQuestions.length;
    const unanswered = total - answeredCount;
    if (unanswered > 0) {
        const confirmMsg = 
            '⚠️ 你還有 ' + unanswered + ' 題未作答（共 ' + total + ' 題）\n\n' +
            '💡 提示：\n' +
            '   • 按「下一題 ▶」按鈕繼續作答\n' +
            '   • 或點擊上方的圓圈號碼（如 ① ② ③）跳轉到未作答的題目\n\n' +
            '確定要提交並離開嗎？\n（提交後無法修改答案）';
        if (!confirm(confirmMsg)) {
            return;
        }
    }

    for (let i = 0; i < currentQuestions.length; i++) {
        let q = currentQuestions[i], map = currentOptionsMapping[i], userLetter = currentAnswers[i];
        let isCorrect = (userLetter === map.correctLetter);
        if (isCorrect) {
            correctCount++;
            consecutiveCorrect++;
        } else {
            consecutiveCorrect = 0;
        }
        let userText = userLetter ? map.letterToText[userLetter] : '(未作答)', correctText = map.letterToText[map.correctLetter];
        results.push({ question: q, userLetter: userLetter || '?', correctLetter: map.correctLetter, userText, correctText, isCorrect, qid: q.id });
        batch.push({ qid: q.id, isCorrect: isCorrect });
    }
    userData.stats.consecutiveCorrect = consecutiveCorrect;
    if (consecutiveCorrect > (userData.stats.maxConsecutive || 0)) userData.stats.maxConsecutive = consecutiveCorrect;
    recordBatch(batch);
    let accuracy = Math.round(correctCount / currentQuestions.length * 100);
    let diffName = selectedDifficulty == 0 ? "★ 1星" : (selectedDifficulty == 1 ? "★★★ 3星" : "★★★★★ 5星");
    let mode = isTrialMode ? 'trial' : 'normal';
    let expectedTime = currentQuestions.length * (selectedDifficulty == 0 ? 108 : (selectedDifficulty == 2 ? 75 : 90));
    let timeSpent = Math.round((expectedTime - timeRemaining) / expectedTime * 100);
    
    if (isSingleQuestionMode && currentQuestions.length === 1) {
        const qid = currentQuestions[0].id;
        const isCorrectSingle = results[0].isCorrect;
        
        if (singleQuestionSource === 'myMistakes' && isCorrectSingle) {
            userData.latestStatus[qid] = true;
            saveUserData();
            alert('🎉 答對了！該題已從「我的錯題」中移除！');
        } else if (singleQuestionSource === 'myMistakes' && !isCorrectSingle) {
            alert('❌ 答錯了！該題仍保留在「我的錯題」中，加油！');
        } else if (singleQuestionSource === 'pastMistakes' || singleQuestionSource === 'pinned') {
            if (isCorrectSingle) {
                alert('✅ 答對了！該題仍保留在列表中（歷程/收藏不會自動移除）');
            } else {
                alert('❌ 答錯了！再試一次吧！');
            }
        }
        recordBatch(batch);
        addPracticeHistory(currentUnit, currentChapter, '單題練習', 1, isCorrectSingle ? 1 : 0, isCorrectSingle ? 100 : 0, 'single', 0, consecutiveCorrect, isBlankPaper, timeSpentSeconds);
        renderMyMistakes();
        renderPastMistakes();
        renderPinned();
        renderHistory();
        renderAchievements();
        // ✅ 提交後退出全屏（由 landscape.js 提供）
        if (typeof exitFullscreenAfterSubmit === 'function') {
            exitFullscreenAfterSubmit();
        }
        document.getElementById('quizModal').style.display = 'none';
        return;
    }
    
    addPracticeHistory(currentUnit, currentChapter, diffName, currentQuestions.length, correctCount, accuracy, mode, timeSpent, consecutiveCorrect, isBlankPaper, timeSpentSeconds);
    lastResults = results;
    
    if (isUnitTestMode && currentQuestions.length >= 10) {
        window._dseResultCallback = function() {
            displayResults(results);
        };
        showDSEResult(accuracy, correctCount, currentQuestions.length);
        // ✅ 提交後退出全屏（由 landscape.js 提供）
        if (typeof exitFullscreenAfterSubmit === 'function') {
            exitFullscreenAfterSubmit();
        }
        document.getElementById('quizModal').style.display = 'none';
        renderPractice();
        renderMyMistakes();
        renderPastMistakes();
        renderPinned();
        renderHistory();
        renderAchievements();
        updateSettingsUnlockStatus();
        return;
    }
    
    displayResults(results);
    // ✅ 提交後退出全屏（由 landscape.js 提供）
    if (typeof exitFullscreenAfterSubmit === 'function') {
        exitFullscreenAfterSubmit();
    }
    document.getElementById('quizModal').style.display = 'none';
    renderPractice();
    renderMyMistakes();
    renderPastMistakes();
    renderPinned();
    renderHistory();
    renderAchievements();
    updateSettingsUnlockStatus();
}

function displayResults(results) {
    let totalOriginal = results.length;
    let correctOriginal = results.filter(r => r.isCorrect).length;
    let percentOriginal = Math.round(correctOriginal / totalOriginal * 100);
    let color = percentOriginal < 40 ? '#dc2626' : (percentOriginal < 70 ? '#f59e0b' : '#10b981');

    let filteredResults = showOnlyWrong ? results.filter(r => !r.isCorrect) : results;
    
    if (filteredResults.length === 0) {
        let html = `<div class="result-summary-bar">
            <div class="result-progress">
                <span>✅ ${percentOriginal}% (${correctOriginal}/${totalOriginal})</span>
                <div class="big-progress-bar">
                    <div class="big-progress-fill" style="width:${percentOriginal}%; background:${color};"></div>
                </div>
            </div>
            <div class="result-buttons">
                <button id="toggleWrongBtn" class="btn btn-small">❌ 只顯示錯題</button>
                <button id="toggleAnswersBtn" class="btn btn-small">📋 顯示答案</button>
            </div>
        </div>
        <div style="padding:20px; text-align:center;">🎉 沒有錯題！繼續保持！</div>`;
        document.getElementById('resultContent').innerHTML = html;
        document.getElementById('resultModal').style.display = 'flex';
        
        document.getElementById('toggleWrongBtn')?.addEventListener('click', () => {
            showOnlyWrong = !showOnlyWrong;
            displayResults(lastResults);
        });
        document.getElementById('toggleAnswersBtn')?.addEventListener('click', () => {
            showAnswers = !showAnswers;
            displayResults(lastResults);
        });
        return;
    }

    let html = `<div class="result-summary-bar">
        <div class="result-progress">
            <span>✅ ${percentOriginal}% (${correctOriginal}/${totalOriginal})</span>
            <div class="big-progress-bar">
                <div class="big-progress-fill" style="width:${percentOriginal}%; background:${color};"></div>
            </div>
        </div>
        <div class="result-buttons">
            <button id="toggleWrongBtn" class="btn btn-small">❌ 只顯示錯題</button>
            <button id="toggleAnswersBtn" class="btn btn-small">📋 顯示答案</button>
        </div>
    </div>`;

    html += `<div class="results-card-list">`;

    for (let i = 0; i < results.length; i++) {
        if (showOnlyWrong && results[i].isCorrect) continue;

        let r = results[i];
        let cardClass = r.isCorrect ? 'correct' : 'wrong';
        let icon = r.isCorrect ? '✅' : '❌';

        html += `<div class="result-card ${cardClass}">`;
        html += `<div class="result-card-header">`;
        html += `<span class="result-card-question">${i + 1}. ${r.question.text}</span>`;
        html += `<span class="result-card-icon">${icon}</span>`;
        html += `</div>`;

        if (showAnswers) {
            html += `<div class="result-card-details">`;
            html += `<span>📝 你的答案：${r.userLetter || '?'}</span>`;
            html += `<span>✓ 正解：${r.correctLetter}</span>`;
            html += `</div>`;
        }

        html += `<div class="result-card-actions">`;
        html += `<button class="btn-explain" data-idx="${i}">📖 查看題解</button>`;
        html += `</div>`;
        html += `</div>`;
    }

    html += `</div>`;

    document.getElementById('resultContent').innerHTML = html;
    document.getElementById('resultModal').style.display = 'flex';

    document.getElementById('toggleWrongBtn')?.addEventListener('click', () => {
        showOnlyWrong = !showOnlyWrong;
        displayResults(lastResults);
    });
    document.getElementById('toggleAnswersBtn')?.addEventListener('click', () => {
        showAnswers = !showAnswers;
        displayResults(lastResults);
    });
    document.querySelectorAll('.btn-explain').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let idx = parseInt(btn.dataset.idx);
            let r = lastResults[idx];
            document.getElementById('resultModal').style.display = 'none';
            showExplainModal(r.question, r.userLetter, r.correctLetter, r.userText, r.correctText, r.isCorrect);
        });
    });
}

// ==================== 桌面版獨立函數 ====================

function showDesktopQuizModal() {
    renderDesktopQuizNav();
    renderDesktopCurrentQuestion();
    document.getElementById('desktopQuizModal').style.display = 'flex';
    
    // ✅ 顯示首次橫置提示（由 landscape.js 提供）
    if (typeof showLandscapeHint === 'function') {
        setTimeout(showLandscapeHint, 500);
    }
}

function renderDesktopQuizNav() {
    let nav = document.getElementById('desktopNav');
    if (!nav) return;
    let html = '';
    const total = currentQuestions.length;
    
    let dotClass = '';
    if (total <= 30) dotClass = '';
    else if (total <= 45) dotClass = 'small';
    else dotClass = 'tiny';
    
    for (let i = 0; i < total; i++) {
        let cls = dotClass;
        if (i === currentQIndex) cls += ' current';
        else if (currentAnswers[i] !== null) cls += ' answered';
        else cls += ' unanswered';
        html += `<button class="nav-dot ${cls}" data-idx="${i}">${i + 1}</button>`;
    }
    nav.innerHTML = html;
    
    document.getElementById('desktopCounter').innerHTML = `${currentQIndex + 1} / ${total}`;
    
    document.querySelectorAll('#desktopNav .nav-dot').forEach(btn => btn.addEventListener('click', (e) => {
        currentQIndex = parseInt(btn.dataset.idx);
        renderDesktopQuizNav();
        renderDesktopCurrentQuestion();
        updateDesktopNavButtons();
    }));
    
    updateDesktopSidebarDifficulty();
    checkDesktopAllQuestionsAnswered();
}

function updateDesktopSidebarDifficulty() {
    if (currentQuestions.length === 0) return;
    const q = currentQuestions[currentQIndex];
    const sidebar = document.getElementById('desktopSidebar');
    if (!sidebar) return;
    
    sidebar.classList.remove('difficulty-translate', 'difficulty-basic', 'difficulty-advanced', 'difficulty-challenge');
    
    if (q.difficulty === '🌐 Translate') {
        sidebar.classList.add('difficulty-translate');
    } else if (q.difficulty === '✅ Basic') {
        sidebar.classList.add('difficulty-basic');
    } else if (q.difficulty === '📈 Advanced') {
        sidebar.classList.add('difficulty-advanced');
    } else if (q.difficulty === '🔥 Challenge') {
        sidebar.classList.add('difficulty-challenge');
    }
}

function renderDesktopCurrentQuestion() {
    if (currentQuestions.length === 0) return;
    
    const q = currentQuestions[currentQIndex];
    const map = currentOptionsMapping[currentQIndex];
    const hasImage = q.imageUrl !== null;
    
    document.getElementById('desktopQuestionText').innerHTML = q.text;
    document.getElementById('desktopCounter').innerHTML = `${currentQIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('desktopDifficulty').innerHTML = q.difficulty;
    
    updateDesktopTimerDisplay();
    updateDesktopSidebarDifficulty();
    
    const imageArea = document.getElementById('desktopImageArea');
    const mainPanel = document.querySelector('.main-panel');
    
    if (hasImage && q.imageUrl) {
        imageArea.innerHTML = `<img src="${q.imageUrl}" class="quiz-image" id="desktopImageThumb" style="max-height:110px; max-width:100%; object-fit:contain; cursor:pointer; border-radius:8px; border:1px solid #e9e4f5; padding:4px;">`;
        imageArea.style.display = 'block';
        if (mainPanel) mainPanel.classList.remove('no-image');
        
        document.getElementById('desktopImageThumb')?.addEventListener('click', () => {
            document.getElementById('zoomImage').src = q.imageUrl;
            document.getElementById('imageZoomModal').style.display = 'flex';
        });
    } else {
        imageArea.innerHTML = '';
        imageArea.style.display = 'none';
        if (mainPanel) mainPanel.classList.add('no-image');
    }
    
    const optsDiv = document.getElementById('desktopOptions');
    optsDiv.innerHTML = '';
    optsDiv.className = 'options-grid';
    
    for (let l of ['A', 'B', 'C', 'D']) {
        let btn = document.createElement('button');
        btn.className = 'option-btn';
        if (currentAnswers[currentQIndex] === l) btn.classList.add('selected');
        btn.textContent = `${l}. ${map.letterToText[l]}`;
        btn.addEventListener('click', () => {
            currentAnswers[currentQIndex] = l;
            renderDesktopCurrentQuestion();
            renderDesktopQuizNav();
            checkDesktopAllQuestionsAnswered();
        });
        optsDiv.appendChild(btn);
    }
    
    updateDesktopNavButtons();
    checkDesktopAllQuestionsAnswered();
    updateDesktopPeriodicButton();
}

function updateDesktopNavButtons() {
    let prev = document.getElementById('desktopPrevBtn'), next = document.getElementById('desktopNextBtn');
    if (prev) prev.disabled = (currentQIndex === 0);
    if (next) next.disabled = (currentQIndex === currentQuestions.length - 1);
}

function updateDesktopTimerDisplay() {
    let m = Math.floor(timeRemaining / 60), s = timeRemaining % 60;
    const timerEl = document.getElementById('desktopTimer');
    if (timerEl) timerEl.innerText = `⏱️ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function checkDesktopAllQuestionsAnswered() {
    if (currentQuestions.length === 0) return;
    
    const allAnswered = currentAnswers.every(a => a !== null && a !== undefined);
    const submitBtn = document.getElementById('desktopSubmitBtn');
    if (!submitBtn) return;
    
    if (allAnswered && currentAnswers.length > 0) {
        if (!blinkInterval) {
            blinkInterval = setInterval(() => {
                submitBtn.style.animation = 'blink 0.3s step-end infinite';
            }, 100);
        }
    } else {
        if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
            submitBtn.style.animation = '';
        }
    }
}

function updateDesktopPeriodicButton() {
    const periodicBtn = document.getElementById('desktopPeriodicBtn');
    if (!periodicBtn) return;
    
    const shouldShow = (currentChapter && parseInt(currentChapter) >= 6) || currentChapter === null;
    
    if (shouldShow) {
        periodicBtn.style.display = 'inline-block';
        periodicBtn.classList.remove('hidden');
        periodicBtn.textContent = '開啟周期表';
    } else {
        periodicBtn.style.display = 'none';
        periodicBtn.classList.add('hidden');
    }
}

function submitDesktopAll() {
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
        const submitBtn = document.getElementById('desktopSubmitBtn');
        if (submitBtn) submitBtn.style.animation = '';
    }
    if (timerInterval) clearInterval(timerInterval);
    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
    
    let results = [], batch = [], correctCount = 0;
    let consecutiveCorrect = userData.stats.consecutiveCorrect || 0;
    let answeredCount = currentAnswers.filter(a => a !== null).length;
    let isBlankPaper = (answeredCount === 0);
    const isUnitTestMode = (currentChapter === null && currentQuestions.length > 1);

    // ✅ 未答完提醒（含操作指引）- 桌面版    const total = currentQuestions.length;
    const unanswered = total - answeredCount;
    if (unanswered > 0) {
        const confirmMsg = 
            '⚠️ 你還有 ' + unanswered + ' 題未作答（共 ' + total + ' 題）\n\n' +
            '💡 提示：\n' +
            '   • 按「下一題 ▶」按鈕繼續作答\n' +
            '   • 或點擊右側的圓圈號碼（如 ① ② ③）跳轉到未作答的題目\n\n' +
            '確定要提交並離開嗎？\n（提交後無法修改答案）';
        if (!confirm(confirmMsg)) {
            return;
        }
    }

    for (let i = 0; i < currentQuestions.length; i++) {
        let q = currentQuestions[i], map = currentOptionsMapping[i], userLetter = currentAnswers[i];
        let isCorrect = (userLetter === map.correctLetter);
        if (isCorrect) {
            correctCount++;
            consecutiveCorrect++;
        } else {
            consecutiveCorrect = 0;
        }
        let userText = userLetter ? map.letterToText[userLetter] : '(未作答)', correctText = map.letterToText[map.correctLetter];
        results.push({ question: q, userLetter: userLetter || '?', correctLetter: map.correctLetter, userText, correctText, isCorrect, qid: q.id });
        batch.push({ qid: q.id, isCorrect: isCorrect });
    }
    userData.stats.consecutiveCorrect = consecutiveCorrect;
    if (consecutiveCorrect > (userData.stats.maxConsecutive || 0)) userData.stats.maxConsecutive = consecutiveCorrect;
    recordBatch(batch);
    let accuracy = Math.round(correctCount / currentQuestions.length * 100);
    let diffName = selectedDifficulty == 0 ? "★ 1星" : (selectedDifficulty == 1 ? "★★★ 3星" : "★★★★★ 5星");
    let mode = isTrialMode ? 'trial' : 'normal';
    let expectedTime = currentQuestions.length * (selectedDifficulty == 0 ? 108 : (selectedDifficulty == 2 ? 75 : 90));
    let timeSpent = Math.round((expectedTime - timeRemaining) / expectedTime * 100);
    
    if (isSingleQuestionMode && currentQuestions.length === 1) {
        const qid = currentQuestions[0].id;
        const isCorrectSingle = results[0].isCorrect;
        
        if (singleQuestionSource === 'myMistakes' && isCorrectSingle) {
            userData.latestStatus[qid] = true;
            saveUserData();
            alert('🎉 答對了！該題已從「我的錯題」中移除！');
        } else if (singleQuestionSource === 'myMistakes' && !isCorrectSingle) {
            alert('❌ 答錯了！該題仍保留在「我的錯題」中，加油！');
        } else if (singleQuestionSource === 'pastMistakes' || singleQuestionSource === 'pinned') {
            if (isCorrectSingle) {
                alert('✅ 答對了！該題仍保留在列表中（歷程/收藏不會自動移除）');
            } else {
                alert('❌ 答錯了！再試一次吧！');
            }
        }
        recordBatch(batch);
        addPracticeHistory(currentUnit, currentChapter, '單題練習', 1, isCorrectSingle ? 1 : 0, isCorrectSingle ? 100 : 0, 'single', 0, consecutiveCorrect, isBlankPaper, timeSpentSeconds);
        renderMyMistakes();
        renderPastMistakes();
        renderPinned();
        renderHistory();
        renderAchievements();
        // ✅ 提交後退出全屏
        if (typeof exitFullscreenAfterSubmit === 'function') {
            exitFullscreenAfterSubmit();
        }
        document.getElementById('desktopQuizModal').style.display = 'none';
        return;
    }
    
    addPracticeHistory(currentUnit, currentChapter, diffName, currentQuestions.length, correctCount, accuracy, mode, timeSpent, consecutiveCorrect, isBlankPaper, timeSpentSeconds);
    lastResults = results;
    
    if (isUnitTestMode && currentQuestions.length >= 10) {
        window._dseResultCallback = function() {
            displayResults(results);
        };
        showDSEResult(accuracy, correctCount, currentQuestions.length);
        if (typeof exitFullscreenAfterSubmit === 'function') {
            exitFullscreenAfterSubmit();
        }
        document.getElementById('desktopQuizModal').style.display = 'none';
        renderPractice();
        renderMyMistakes();
        renderPastMistakes();
        renderPinned();
        renderHistory();
        renderAchievements();
        updateSettingsUnlockStatus();
        return;
    }
    
    displayResults(results);
    if (typeof exitFullscreenAfterSubmit === 'function') {
        exitFullscreenAfterSubmit();
    }
    document.getElementById('desktopQuizModal').style.display = 'none';
    renderPractice();
    renderMyMistakes();
    renderPastMistakes();
    renderPinned();
    renderHistory();
    renderAchievements();
    updateSettingsUnlockStatus();
}

// ==================== initTabs ====================
function initTabs() {
    let tabs = document.querySelectorAll('.tab'), panels = { 
        practice: document.getElementById('practicePanel'), 
        myMistakes: document.getElementById('myMistakesPanel'), 
        pastMistakes: document.getElementById('pastMistakesPanel'), 
        pinned: document.getElementById('pinnedPanel'), 
        history: document.getElementById('historyPanel'), 
        achievements: document.getElementById('achievementsPanel'),
        teacher: document.getElementById('teacherPanel')
    };
    tabs.forEach(tab => tab.addEventListener('click', () => {
        let target = tab.dataset.tab;
        Object.keys(panels).forEach(p => {
            if (panels[p]) panels[p].style.display = 'none';
        });
        if (panels[target]) panels[target].style.display = 'block';
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (target === 'myMistakes') renderMyMistakes();
        if (target === 'pastMistakes') renderPastMistakes();
        if (target === 'pinned') renderPinned();
        if (target === 'history') renderHistory();
        if (target === 'achievements') renderAchievements();
        if (target === 'teacher') renderTeacherPanel();
    }));
}

// ==================== 一鍵解鎖 ====================
function unlockAll() {
    if (!pendingUnit || !pendingChapter) {
        alert('請先選擇一個章節');
        return;
    }
    let qs = window.ALL_UNITS[pendingUnit].chapters[pendingChapter].questions;
    for (let q of qs) {
        userData.latestStatus[q.id] = true;
    }
    saveUserData();
    updateSettingsUnlockStatus();
    renderPractice();
    renderMyMistakes();
    renderPastMistakes();
    renderPinned();
    renderHistory();
    renderAchievements();
    alert('🔓 所有難度已解鎖！');
}

// ============================================================
// DOMContentLoaded - 綁定按鈕事件（原 script.js 中的關鍵部分）
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // 難度選擇
    document.getElementById('diff-easy').addEventListener('click', () => { 
        selectedDifficulty = 0; 
        document.getElementById('diff-easy').classList.add('active'); 
        document.getElementById('diff-medium').classList.remove('active'); 
        document.getElementById('diff-hard').classList.remove('active'); 
        isTrialMode = false; 
        updateSettingsUnlockStatus(); 
    });
    document.getElementById('diff-medium').addEventListener('click', () => { 
        if (document.getElementById('diff-medium').disabled) return; 
        selectedDifficulty = 1; 
        document.getElementById('diff-easy').classList.remove('active'); 
        document.getElementById('diff-medium').classList.add('active'); 
        document.getElementById('diff-hard').classList.remove('active'); 
        isTrialMode = false; 
        updateSettingsUnlockStatus(); 
    });
    document.getElementById('diff-hard').addEventListener('click', () => { 
        if (document.getElementById('diff-hard').disabled) return; 
        selectedDifficulty = 2; 
        document.getElementById('diff-easy').classList.remove('active'); 
        document.getElementById('diff-medium').classList.remove('active'); 
        document.getElementById('diff-hard').classList.add('active'); 
        isTrialMode = false; 
        updateSettingsUnlockStatus(); 
    });
    
    // 題數選擇
    document.getElementById('count-10').addEventListener('click', () => {
        selectedCount = 10;
        customCount = 10;
        document.getElementById('count-10').classList.add('active');
        document.getElementById('count-20').classList.remove('active');
        if (document.getElementById('count-36')) document.getElementById('count-36').classList.remove('active');
        const customInput = document.getElementById('customCount');
        if (customInput) customInput.value = 10;
    });
    document.getElementById('count-20').addEventListener('click', () => {
        if (document.getElementById('count-20').disabled) return;
        selectedCount = 20;
        customCount = 20;
        document.getElementById('count-10').classList.remove('active');
        document.getElementById('count-20').classList.add('active');
        if (document.getElementById('count-36')) document.getElementById('count-36').classList.remove('active');
        const customInput = document.getElementById('customCount');
        if (customInput) customInput.value = 20;
    });
    document.getElementById('count-36').addEventListener('click', () => {
        if (document.getElementById('count-36').disabled) return;
        selectedCount = 36;
        customCount = 36;
        document.getElementById('count-10').classList.remove('active');
        document.getElementById('count-20').classList.remove('active');
        document.getElementById('count-36').classList.add('active');
        const customInput = document.getElementById('customCount');
        if (customInput) customInput.value = 36;
    });
    
    // 試煉模式
    document.getElementById('trial-mode').addEventListener('click', () => {
        if (document.getElementById('trial-mode').disabled) return;
        isTrialMode = true;
        selectedDifficulty = 2;
        selectedCount = 50;
        customCount = 50;
        document.getElementById('diff-easy').classList.remove('active');
        document.getElementById('diff-medium').classList.remove('active');
        document.getElementById('diff-hard').classList.add('active');
        document.getElementById('count-10').classList.remove('active');
        document.getElementById('count-20').classList.remove('active');
        if (document.getElementById('count-36')) document.getElementById('count-36').classList.remove('active');
        const customInput = document.getElementById('customCount');
        if (customInput) customInput.value = 50;
        updateSettingsUnlockStatus();
    });
    
    // #8: 一鍵解鎖 - 點擊時會檢查是否為老師
    document.getElementById('devUnlockBtn').addEventListener('click', function() {
        if (currentUser && currentUser.isTeacher) {
            unlockAll();
        } else {
            alert('⚠️ 此功能僅限老師使用');
        }
    });
    
    // 排除翻譯題
    const excludeTranslateCheckbox = document.getElementById('excludeTranslate');
    if (excludeTranslateCheckbox) {
        excludeTranslateCheckbox.addEventListener('change', (e) => {
            excludeTranslate = e.target.checked;
            updateSettingsUnlockStatus();
        });
    }
    
    // 自訂題數
    const customInput = document.getElementById('customCount');
    if (customInput) {
        customInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = 10;
            let maxVal = parseInt(customInput.max);
            if (!isNaN(maxVal) && val > maxVal) val = maxVal;
            if (val < 1) val = 1;
            customCount = val;
            selectedCount = val;
            customInput.value = val;
            document.getElementById('count-10').classList.remove('active');
            document.getElementById('count-20').classList.remove('active');
            if (document.getElementById('count-36')) document.getElementById('count-36').classList.remove('active');
        });
    }
    
    // 開始練習（核心按鈕）
    document.getElementById('startPracticeBtn').addEventListener('click', () => {
        if (window._singleRedoQid) {
            let qid = window._singleRedoQid;
            window._singleRedoQid = null;
            let unit = pendingUnit, chapter = pendingChapter, allQs = [...window.ALL_UNITS[unit].chapters[chapter].questions], targetQ = allQs.find(q => q.id === qid);
            if (targetQ) {
                currentUnit = unit;
                currentChapter = chapter;
                currentQuestions = [targetQ];
                currentOptionsMapping = currentQuestions.map(q => { let letters = ['A', 'B', 'C', 'D'], map = {}; for (let i = 0; i < 4; i++) { let optText = q.options[i].substring(3); map[letters[i]] = optText; } return { letterToText: map, correctLetter: q.correct }; });
                currentAnswers = new Array(1).fill(null);
                currentQIndex = 0;
                timeRemaining = 90;
                updateTimerDisplay();
                if (timerInterval) clearInterval(timerInterval);
                timerInterval = setInterval(() => { if (timeRemaining <= 0) submitAll(); else { timeRemaining--; updateTimerDisplay(); } }, 1000);
                document.getElementById('settingsModal').style.display = 'none';
                showQuizModal();
            }
        } else {
            startPracticeWithSettings();
        }
    });
    
    // 取消
    document.getElementById('cancelSettingsBtn').addEventListener('click', () => document.getElementById('settingsModal').style.display = 'none');
    
    // 關閉題解
    document.getElementById('closeExplainBtn').addEventListener('click', () => { 
        document.getElementById('explainModal').style.display = 'none'; 
        if (lastResults) displayResults(lastResults); 
    });
    
    // 提交答案（手機版）
    document.getElementById('submitAllBtn').addEventListener('click', () => submitAll());
    
    // 關閉結果
    document.getElementById('closeResultBtn').addEventListener('click', () => document.getElementById('resultModal').style.display = 'none');
    document.getElementById('closeZoomBtn').addEventListener('click', closeImageZoom);
    
    // 上一題 / 下一題（手機版）
    document.getElementById('prevBtn').addEventListener('click', () => { 
        if (currentQIndex > 0) { 
            currentQIndex--; 
            renderQuizNav(); 
            renderCurrentQuestion(); 
            updateNavButtons(); 
        } 
    });
    document.getElementById('nextBtn').addEventListener('click', () => { 
        if (currentQIndex < currentQuestions.length - 1) { 
            currentQIndex++; 
            renderQuizNav(); 
            renderCurrentQuestion(); 
            updateNavButtons(); 
        } 
    });
    
    // 桌面版
    const desktopSubmitBtn = document.getElementById('desktopSubmitBtn');
    if (desktopSubmitBtn) {
        desktopSubmitBtn.addEventListener('click', submitDesktopAll);
    }
    const desktopPrevBtn = document.getElementById('desktopPrevBtn');
    const desktopNextBtn = document.getElementById('desktopNextBtn');
    if (desktopPrevBtn) {
        desktopPrevBtn.addEventListener('click', function() {
            if (currentQIndex > 0) {
                currentQIndex--;
                renderDesktopQuizNav();
                renderDesktopCurrentQuestion();
                updateDesktopNavButtons();
            }
        });
    }
    if (desktopNextBtn) {
        desktopNextBtn.addEventListener('click', function() {
            if (currentQIndex < currentQuestions.length - 1) {
                currentQIndex++;
                renderDesktopQuizNav();
                renderDesktopCurrentQuestion();
                updateDesktopNavButtons();
            }
        });
    }
    const desktopPeriodicBtn = document.getElementById('desktopPeriodicBtn');
    if (desktopPeriodicBtn) {
        desktopPeriodicBtn.addEventListener('click', showPeriodicTable);
    }
});

console.log('✅ practice.js 已載入（練習核心功能 + 事件綁定）');