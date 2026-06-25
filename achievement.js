// ============================================================
// achievement.js - 成就系統、積分、排行榜
// 依賴：core.js, practice.js（需先載入）
// ============================================================

// ==================== 成就系統 ====================
function showUnlockCard(title, message, date, points) {
    if (points > 0) {
        const flash = document.createElement('div');
        flash.className = 'unlock-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 800);
    }
    
    let container = document.getElementById('unlockCardsContainer');
    let card = document.createElement('div');
    card.className = 'unlock-card';
    let pointsText = '';
    if (points > 0) pointsText = `<div style="font-size:0.8rem; margin-top:4px;">🏆 +${points} 積分</div>`;
    else if (points < 0) pointsText = `<div style="font-size:0.8rem; margin-top:4px;">⚠️ ${points} 積分</div>`;
    else if (points === 0) pointsText = `<div style="font-size:0.8rem; margin-top:4px;">✨ 再次達標！繼續保持 ✨</div>`;
    
    card.innerHTML = `<div style="font-size:1.5rem;">${points > 0 ? '🎉' : '🌟'}</div>
                      <div style="font-weight:bold; margin:4px 0;">${title}</div>
                      <div style="font-size:0.85rem;">${message}</div>
                      ${pointsText}
                      <div style="font-size:0.65rem; margin-top:6px;">${date}</div>`;
    container.appendChild(card);
    setTimeout(() => { if (card.parentNode) card.remove(); }, 4200);
}

function showUnlockCardsSequentially(cards) {
    for (let i = 0; i < cards.length; i++) {
        setTimeout(() => {
            showUnlockCard(cards[i].title, cards[i].message, cards[i].date, cards[i].points);
        }, i * 500);
    }
}

function addPenaltyAchievement(name, icon, points, desc) {
    let today = new Date().toISOString().slice(0, 10);
    if (!userData.achievements[name]) {
        userData.achievements[name] = { unlocked: true, date: today, points: points, isPenalty: true };
        saveUserData();
        showUnlockCard("⚠️ 警示", `${icon} ${name} - ${desc}`, today, points);
    }
}

function checkAndUnlockAchievements(unit, chapter, accuracy, questionCount, isPerfect, isDSE, isSpeed, currentTotalQuestions, newUnlocks, consecutiveCorrectCount, isBlankPaper, previousAccuracy) {
    let today = new Date().toISOString().slice(0, 10);
    let key = `${unit}_${chapter}`;
    if (!userData.achievements[key]) userData.achievements[key] = {};
    
    let s1 = getChapterDifficultyMastery(unit, chapter, 1);
    let s3 = getChapterDifficultyMastery(unit, chapter, 2);
    let s5 = getChapterDifficultyMastery(unit, chapter, 3);

    if (isBlankPaper) {
        addPenaltyAchievement('blankPaper', '📄', -10, '提交空白答案卷');
    }

    if (previousAccuracy !== null && previousAccuracy - accuracy > 20) {
        addPenaltyAchievement('downwardTrend', '📉', -10, '連續兩次正確率下降超過20%');
    }

    if (s1 >= 80) {
        if (!userData.achievements[key].star1) {
            userData.achievements[key].star1 = { unlocked: true, date: today, lastAccuracy: s1 };
            newUnlocks.push({ title: "🎉 成就解鎖！", message: `✅ ${window.ALL_UNITS[unit].chapters[chapter].name} - 一星完成`, date: today, points: ACHIEVEMENT_POINTS.star1 });
        } else if (userData.achievements[key].star1.lastAccuracy && userData.achievements[key].star1.lastAccuracy < 80 && s1 >= 80) {
            userData.achievements[key].star1.lastAccuracy = s1;
            newUnlocks.push({ title: "🎉 成就恢復！", message: `✅ ${window.ALL_UNITS[unit].chapters[chapter].name} - 一星完成 (再次達標)`, date: today, points: 0 });
        } else {
            userData.achievements[key].star1.lastAccuracy = s1;
        }
    }

    if (s1 >= 80 && s3 >= 80) {
        if (!userData.achievements[key].star3) {
            userData.achievements[key].star3 = { unlocked: true, date: today, lastAccuracy: s3 };
            newUnlocks.push({ title: "🎉 成就解鎖！", message: `🔥 ${window.ALL_UNITS[unit].chapters[chapter].name} - 三星解鎖`, date: today, points: ACHIEVEMENT_POINTS.star3 });
        } else if (userData.achievements[key].star3.lastAccuracy && userData.achievements[key].star3.lastAccuracy < 80 && s3 >= 80) {
            userData.achievements[key].star3.lastAccuracy = s3;
            newUnlocks.push({ title: "🎉 成就恢復！", message: `🔥 ${window.ALL_UNITS[unit].chapters[chapter].name} - 三星解鎖 (再次達標)`, date: today, points: 0 });
        } else {
            userData.achievements[key].star3.lastAccuracy = s3;
        }
    }

    if (s1 >= 80 && s3 >= 80 && s5 >= 80) {
        if (!userData.achievements[key].star5) {
            userData.achievements[key].star5 = { unlocked: true, date: today, lastAccuracy: s5 };
            newUnlocks.push({ title: "🎉 成就解鎖！", message: `💎 ${window.ALL_UNITS[unit].chapters[chapter].name} - 五星解鎖`, date: today, points: ACHIEVEMENT_POINTS.star5 });
        } else if (userData.achievements[key].star5.lastAccuracy && userData.achievements[key].star5.lastAccuracy < 80 && s5 >= 80) {
            userData.achievements[key].star5.lastAccuracy = s5;
            newUnlocks.push({ title: "🎉 成就恢復！", message: `💎 ${window.ALL_UNITS[unit].chapters[chapter].name} - 五星解鎖 (再次達標)`, date: today, points: 0 });
        } else {
            userData.achievements[key].star5.lastAccuracy = s5;
        }
    }

    if (isTrialMode && accuracy >= 80) {
        if (!userData.achievements[key].trial) {
            userData.achievements[key].trial = { unlocked: true, date: today, lastAccuracy: accuracy };
            newUnlocks.push({ title: "🎉 成就解鎖！", message: `⚔️ ${window.ALL_UNITS[unit].chapters[chapter].name} - 試煉完成`, date: today, points: ACHIEVEMENT_POINTS.trial });
        } else if (userData.achievements[key].trial.lastAccuracy && userData.achievements[key].trial.lastAccuracy < 80 && accuracy >= 80) {
            userData.achievements[key].trial.lastAccuracy = accuracy;
            newUnlocks.push({ title: "🎉 成就恢復！", message: `⚔️ ${window.ALL_UNITS[unit].chapters[chapter].name} - 試煉完成 (再次達標)`, date: today, points: 0 });
        } else {
            userData.achievements[key].trial.lastAccuracy = accuracy;
        }
    }

    let totalQ = userData.stats.totalQuestionsAnswered;
    let clearedMistakes = 0;
    for (let u in window.ALL_UNITS) {
        for (let c in window.ALL_UNITS[u].chapters) {
            for (let q of window.ALL_UNITS[u].chapters[c].questions) {
                const qid = q.id;
                const hasWrong = userData.allAttempts.some(a => a.qid === qid && !a.isCorrect);
                const isNowCorrect = userData.latestStatus[qid] === true;
                if (hasWrong && isNowCorrect) {
                    clearedMistakes++;
                }
            }
        }
    }

    if (!userData.achievements.firstPractice && userData.practiceHistory.length === 1) {
        userData.achievements.firstPractice = { unlocked: true, date: today, progress: 1, target: 1 };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "🎯 初試啼聲 - 完成第一次練習", date: today, points: ACHIEVEMENT_POINTS.firstPractice });
    }
    if (totalQ >= 100 && !userData.achievements.tenQuestions) {
        userData.achievements.tenQuestions = { unlocked: true, date: today, progress: totalQ, target: 100 };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "📝 十題達人 - 累積完成100題", date: today, points: ACHIEVEMENT_POINTS.tenQuestions });
    }
    if (totalQ >= 500 && !userData.achievements.fiveHundred) {
        userData.achievements.fiveHundred = { unlocked: true, date: today, progress: totalQ, target: 500 };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "⚔️ 百題斬 - 累積完成500題", date: today, points: ACHIEVEMENT_POINTS.fiveHundred });
    }
    if (totalQ >= 1000 && !userData.achievements.thousand) {
        userData.achievements.thousand = { unlocked: true, date: today, progress: totalQ, target: 1000 };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "👑 千題之王 - 累積完成1000題", date: today, points: ACHIEVEMENT_POINTS.thousand });
    }
    if (isPerfect && !userData.achievements.perfectLesson) {
        userData.achievements.perfectLesson = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "🌟 完美一課 - 單次練習10題以上全對", date: today, points: ACHIEVEMENT_POINTS.perfectLesson });
    }
    if (isDSE && !userData.achievements.dseComplete) {
        userData.achievements.dseComplete = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "📝 DSE模擬完成 - 完成36題模式", date: today, points: ACHIEVEMENT_POINTS.dseComplete });
    }
    if (isSpeed && !userData.achievements.speedStar) {
        userData.achievements.speedStar = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "⚡ 速度之星 - 提前50%時間完成練習且正確率≥70%", date: today, points: ACHIEVEMENT_POINTS.speedStar });
    }

    if (consecutiveCorrectCount >= 20 && !userData.achievements.consecutive20) {
        userData.achievements.consecutive20 = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "🔥 連續答對王 - 連續答對20題", date: today, points: ACHIEVEMENT_POINTS.consecutive20 });
    }

    let allChaptersDone = true;
    for (let u in window.ALL_UNITS) {
        for (let c in window.ALL_UNITS[u].chapters) {
            if (getChapterMastery(u, c) < 80) allChaptersDone = false;
        }
    }
    if (allChaptersDone && !userData.achievements.allChaptersMaster) {
        userData.achievements.allChaptersMaster = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "🏆 全科目制霸 - 所有章節完成度達80%", date: today, points: ACHIEVEMENT_POINTS.allChaptersMaster });
    }

    let recentPractices = userData.practiceHistory.slice(0, 5);
    let allPerfect = recentPractices.length >= 5 && recentPractices.every(p => p.accuracy === 100);
    if (allPerfect && !userData.achievements.fiveStarStreak) {
        userData.achievements.fiveStarStreak = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "⭐ 五星連珠 - 連續5次練習正確率100%", date: today, points: ACHIEVEMENT_POINTS.fiveStarStreak });
    }

    if (clearedMistakes >= 50 && !userData.achievements.mistakeEraser) {
        userData.achievements.mistakeEraser = { unlocked: true, date: today, progress: clearedMistakes, target: 50 };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "🗑️ 錯題剋星 - 從錯題本清除50道錯題", date: today, points: ACHIEVEMENT_POINTS.mistakeEraser });
    }

    if (userData.favorites.length >= 50 && !userData.achievements.collector) {
        userData.achievements.collector = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "📚 收藏家 - 收藏50道題目", date: today, points: ACHIEVEMENT_POINTS.collector });
    }

    let lastDate = userData.stats.lastPracticeDate;
    if (lastDate) {
        let last = new Date(lastDate);
        let todayDate = new Date(today);
        let diffDays = Math.floor((todayDate - last) / (1000 * 60 * 60 * 24));
        if (diffDays === 1 || diffDays === 0) {
            if (!userData.stats.dailyPracticeDates.includes(today)) {
                userData.stats.dailyPracticeDates.push(today);
            }
        } else if (diffDays > 1) {
            userData.stats.dailyPracticeDates = [today];
        }
    } else {
        userData.stats.dailyPracticeDates = [today];
    }
    userData.stats.lastPracticeDate = today;

    if (userData.stats.dailyPracticeDates.length >= 7 && !userData.achievements.weekChallenge) {
        userData.achievements.weekChallenge = { unlocked: true, date: today };
        newUnlocks.push({ title: "🎉 成就解鎖！", message: "📅 一週挑戰 - 連續7天完成至少一次練習", date: today, points: ACHIEVEMENT_POINTS.weekChallenge });
    }

    saveUserData();
}

function addPracticeHistory(unit, chapter, difficultyName, questionCount, correctCount, accuracy, mode, timeSpentPercent, consecutiveCorrectCount, isBlankPaper, timeSpentSeconds) {
    let now = new Date(), date = now.toISOString().slice(0, 10), time = now.toTimeString().slice(0, 5);
    let unitObj = window.ALL_UNITS[unit];
    let unitName = unitObj ? unitObj.name : unit;
    let chapterName = '單元測驗';
    if (chapter && unitObj && unitObj.chapters[chapter]) {
        chapterName = unitObj.chapters[chapter].name;
    } else if (chapter) {
        chapterName = chapter;
    }
    userData.practiceHistory.unshift({ 
        id: Date.now(), date, time, unitId: unit, unitName, chapterId: chapter, chapterName, 
        difficulty: difficultyName, questionCount, correctCount, accuracy, mode,
        timeSpent: timeSpentSeconds || 0
    });
    if (userData.practiceHistory.length > 100) userData.practiceHistory = userData.practiceHistory.slice(0, 100);

    let totalQuestions = (userData.stats?.totalQuestionsAnswered || 0) + questionCount;
    if (!userData.stats) userData.stats = { totalQuestionsAnswered: 0, totalCorrect: 0, consecutiveCorrect: 0, maxConsecutive: 0, dailyPracticeDates: [], lastAccuracy: null };
    userData.stats.totalQuestionsAnswered = totalQuestions;
    userData.stats.totalCorrect = (userData.stats.totalCorrect || 0) + correctCount;

    let previousAccuracy = userData.stats.lastAccuracy;
    userData.stats.lastAccuracy = accuracy;
    
    let isSpeed = timeSpentPercent <= 50 && accuracy >= 70;
    
    saveUserData();

    let newUnlocks = [];
    checkAndUnlockAchievements(unit, chapter, accuracy, questionCount, accuracy === 100 && questionCount >= 10, selectedCount === 36, isSpeed, totalQuestions, newUnlocks, consecutiveCorrectCount, isBlankPaper, previousAccuracy);
    if (newUnlocks.length > 0) {
        showUnlockCardsSequentially(newUnlocks);
    }
}

function calculateTotalPoints(achievements) {
    let total = 0;
    for (let key in achievements) {
        if (achievements[key]?.unlocked) {
            total += ACHIEVEMENT_POINTS[key] || 0;
        }
    }
    return total;
}

// ==================== 計算班級排名 ====================
async function calculateClassRank(userId, userPoints) {
    if (!currentUser || !currentUser.className) {
        return { rank: 0, total: 0 };
    }
    
    const className = currentUser.className;
    const allStudents = await loadAllStudentsFromFirebase(className);
    
    if (allStudents.length === 0) {
        return { rank: 0, total: 0 };
    }
    
    const classmates = [];
    for (const s of allStudents) {
        const points = calculateTotalPoints(s.achievements || {});
        classmates.push({ id: s.userId, points: points });
    }
    
    classmates.sort((a, b) => b.points - a.points);
    const rank = classmates.findIndex(c => c.id === userId) + 1;
    
    return { rank: rank, total: classmates.length };
}

// ==================== 渲染學生成就頁面 ====================
async function renderAchievements() {
    let container = document.getElementById('achievementsPanel');
    
    let totalPoints = calculateTotalPoints(userData.achievements);
    let rankInfo = await calculateClassRank(currentUser.id, totalPoints);
    
    let rankListHtml = '';
    try {
        const className = currentUser.className;
        const allStudents = await loadAllStudentsFromFirebase(className);
        const rankedStudents = [...allStudents].sort((a, b) => {
            const aPoints = calculateTotalPoints(a.achievements || {});
            const bPoints = calculateTotalPoints(b.achievements || {});
            return bPoints - aPoints;
        });
        
        if (rankedStudents.length > 0) {
            rankListHtml = `<div class="rank-list-container">
                <h3 style="margin-bottom:0.5rem;">🏆 班級積分榜</h3>
                <div style="font-size:0.7rem; color:#666; margin-bottom:0.5rem;">👥 ${className} 班級</div>
                <div style="overflow-x:auto;">`;
            
            const medals = ['🥇', '🥈', '🥉'];
            rankedStudents.forEach((s, index) => {
                const points = calculateTotalPoints(s.achievements || {});
                const medal = index < 3 ? medals[index] : `${index + 1}`;
                const isCurrentUser = s.userId === currentUser.id;
                const rowStyle = isCurrentUser ? 'background:#ede9fe; font-weight:bold; border-radius:8px;' : '';
                rankListHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-bottom:1px solid #f0edf8; ${rowStyle} border-radius:8px;">
                        <span style="font-size:0.85rem;">${medal} ${s.name}</span>
                        <span style="font-size:0.85rem; font-weight:600; color:${isCurrentUser ? '#4a1d8c' : '#2e0f5a'};">${points} 分</span>
                    </div>
                `;
            });
            
            rankListHtml += `</div></div>`;
        }
    } catch(e) {
        console.warn('⚠️ 載入積分榜失敗:', e);
    }
    
    let chapterList = [];
    for (let u in window.ALL_UNITS) {
        for (let ch in window.ALL_UNITS[u].chapters) {
            chapterList.push({
                unit: u,
                unitName: window.ALL_UNITS[u].name,
                chapter: ch,
                chapterNum: parseInt(ch),
                chapterName: window.ALL_UNITS[u].chapters[ch].name
            });
        }
    }
    chapterList.sort((a, b) => a.chapterNum - b.chapterNum);
    
    let unlockedChapters = [];
    let lockedChapters = [];
    
    for (let item of chapterList) {
        let key = `${item.unit}_${item.chapter}`;
        let ach = userData.achievements[key] || {};
        let types = [
            { id: 'star1', name: '一星完成', icon: '✅', unlocked: ach.star1?.unlocked || false, date: ach.star1?.date || null, needHint: '需一星80%', points: ACHIEVEMENT_POINTS.star1, order: 1 },
            { id: 'star3', name: '三星解鎖', icon: '🔥', unlocked: ach.star3?.unlocked || false, date: ach.star3?.date || null, needHint: '需三星80%', points: ACHIEVEMENT_POINTS.star3, order: 2 },
            { id: 'star5', name: '五星解鎖', icon: '💎', unlocked: ach.star5?.unlocked || false, date: ach.star5?.date || null, needHint: '需五星80%', points: ACHIEVEMENT_POINTS.star5, order: 3 },
            { id: 'trial', name: '試煉完成', icon: '⚔️', unlocked: ach.trial?.unlocked || false, date: ach.trial?.date || null, needHint: '需試煉模式80%', points: ACHIEVEMENT_POINTS.trial, order: 4 }
        ];
        for (let t of types) {
            let entry = {
                unitName: item.unitName,
                chapterName: item.chapterName,
                chapterNum: item.chapterNum,
                name: t.name,
                icon: t.icon,
                unlocked: t.unlocked,
                date: t.date,
                needHint: t.needHint,
                points: t.points,
                order: t.order
            };
            if (t.unlocked) {
                unlockedChapters.push(entry);
            } else {
                lockedChapters.push(entry);
            }
        }
    }
    
    unlockedChapters.sort((a, b) => {
        if (a.chapterNum !== b.chapterNum) return a.chapterNum - b.chapterNum;
        return a.order - b.order;
    });
    lockedChapters.sort((a, b) => {
        if (a.chapterNum !== b.chapterNum) return a.chapterNum - b.chapterNum;
        return a.order - b.order;
    });
    
    let totalQ = userData.stats?.totalQuestionsAnswered || 0;
    let specials = [
        { id: 'firstPractice', name: '初試啼聲', icon: '🎯', unlocked: userData.achievements.firstPractice?.unlocked || false, date: userData.achievements.firstPractice?.date || null, desc: '完成第一次練習', progress: userData.achievements.firstPractice?.progress || totalQ, target: 1, showProgress: true, points: ACHIEVEMENT_POINTS.firstPractice, isPenalty: false },
        { id: 'tenQuestions', name: '十題達人', icon: '📝', unlocked: userData.achievements.tenQuestions?.unlocked || false, date: userData.achievements.tenQuestions?.date || null, desc: '累積完成100題', progress: totalQ, target: 100, showProgress: true, points: ACHIEVEMENT_POINTS.tenQuestions, isPenalty: false },
        { id: 'fiveHundred', name: '百題斬', icon: '⚔️', unlocked: userData.achievements.fiveHundred?.unlocked || false, date: userData.achievements.fiveHundred?.date || null, desc: '累積完成500題', progress: totalQ, target: 500, showProgress: true, points: ACHIEVEMENT_POINTS.fiveHundred, isPenalty: false },
        { id: 'thousand', name: '千題之王', icon: '👑', unlocked: userData.achievements.thousand?.unlocked || false, date: userData.achievements.thousand?.date || null, desc: '累積完成1000題', progress: totalQ, target: 1000, showProgress: true, points: ACHIEVEMENT_POINTS.thousand, isPenalty: false },
        { id: 'perfectLesson', name: '完美一課', icon: '🌟', unlocked: userData.achievements.perfectLesson?.unlocked || false, date: userData.achievements.perfectLesson?.date || null, desc: '單次練習10題以上全對', points: ACHIEVEMENT_POINTS.perfectLesson, isPenalty: false },
        { id: 'dseComplete', name: 'DSE模擬完成', icon: '📝', unlocked: userData.achievements.dseComplete?.unlocked || false, date: userData.achievements.dseComplete?.date || null, desc: '完成一次36題模式', points: ACHIEVEMENT_POINTS.dseComplete, isPenalty: false },
        { id: 'speedStar', name: '速度之星', icon: '⚡', unlocked: userData.achievements.speedStar?.unlocked || false, date: userData.achievements.speedStar?.date || null, desc: '提前50%時間完成練習且正確率≥70%', points: ACHIEVEMENT_POINTS.speedStar, isPenalty: false },
        { id: 'consecutive20', name: '連續答對王', icon: '🔥', unlocked: userData.achievements.consecutive20?.unlocked || false, date: userData.achievements.consecutive20?.date || null, desc: '連續答對20題', points: ACHIEVEMENT_POINTS.consecutive20, isPenalty: false },
        { id: 'allChaptersMaster', name: '全科目制霸', icon: '🏆', unlocked: userData.achievements.allChaptersMaster?.unlocked || false, date: userData.achievements.allChaptersMaster?.date || null, desc: '所有章節完成度達80%', points: ACHIEVEMENT_POINTS.allChaptersMaster, isPenalty: false },
        { id: 'fiveStarStreak', name: '五星連珠', icon: '⭐', unlocked: userData.achievements.fiveStarStreak?.unlocked || false, date: userData.achievements.fiveStarStreak?.date || null, desc: '連續5次練習正確率100%', points: ACHIEVEMENT_POINTS.fiveStarStreak, isPenalty: false },
        { id: 'mistakeEraser', name: '錯題剋星', icon: '🗑️', unlocked: userData.achievements.mistakeEraser?.unlocked || false, date: userData.achievements.mistakeEraser?.date || null, desc: '從錯題本清除50道錯題', points: ACHIEVEMENT_POINTS.mistakeEraser, isPenalty: false },
        { id: 'collector', name: '收藏家', icon: '📚', unlocked: userData.achievements.collector?.unlocked || false, date: userData.achievements.collector?.date || null, desc: '收藏50道題目', points: ACHIEVEMENT_POINTS.collector, isPenalty: false },
        { id: 'weekChallenge', name: '一週挑戰', icon: '📅', unlocked: userData.achievements.weekChallenge?.unlocked || false, date: userData.achievements.weekChallenge?.date || null, desc: '連續7天完成至少一次練習', points: ACHIEVEMENT_POINTS.weekChallenge, isPenalty: false },
        { id: 'blankPaper', name: '交白卷', icon: '📄', unlocked: userData.achievements.blankPaper?.unlocked || false, date: userData.achievements.blankPaper?.date || null, desc: '提交空白答案卷', points: ACHIEVEMENT_POINTS.blankPaper, isPenalty: true },
        { id: 'downwardTrend', name: '下滑趨勢', icon: '📉', unlocked: userData.achievements.downwardTrend?.unlocked || false, date: userData.achievements.downwardTrend?.date || null, desc: '連續兩次正確率下降超過20%', points: ACHIEVEMENT_POINTS.downwardTrend, isPenalty: true }
    ];
    
    let unlockedSpecials = specials.filter(s => s.unlocked && !s.isPenalty);
    let unlockedPenalties = specials.filter(s => s.unlocked && s.isPenalty);
    let lockedSpecials = specials.filter(s => !s.unlocked && !s.isPenalty);
    unlockedSpecials.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    unlockedPenalties.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    lockedSpecials.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    let totalUnlocked = unlockedSpecials.length + unlockedPenalties.length + unlockedChapters.length;
    let totalPossible = specials.length + (chapterList.length * 4);
    let percent = totalPossible > 0 ? Math.round(totalUnlocked / totalPossible * 100) : 0;
    
    let html = `<div class="card">`;
    
    html += `
        <div class="points-rank-bar">
            <div class="points-box">
                <div class="points-number">${totalPoints}</div>
                <div class="points-label">總積分</div>
            </div>
            <div class="rank-box">
                <div class="rank-number">#${rankInfo.rank} / ${rankInfo.total}</div>
                <div class="rank-label">班級排名</div>
            </div>
        </div>
        <div class="achievement-progress">
            <div style="display:flex; justify-content:space-between;">
                <span>🏆 總解鎖進度</span>
                <span>${totalUnlocked} / ${totalPossible} (${percent}%)</span>
            </div>
            <div class="achievement-bar">
                <div class="achievement-fill" style="width:${percent}%;"></div>
            </div>
        </div>`;
    
    if (rankListHtml) {
        html += rankListHtml;
    }
    
    if (unlockedSpecials.length > 0 || unlockedPenalties.length > 0 || lockedSpecials.length > 0) {
        html += `<h3 style="margin-top:0.5rem;">🎯 特殊成就</h3>`;
        
        for (let ach of unlockedSpecials) {
            let pointsDisplay = ach.points > 0 ? `🏆 +${ach.points}` : '';
            html += `<div class="achievement-item unlocked"><div class="achievement-row"><div><span class="achievement-badge">${ach.icon}</span> <strong>${ach.name}</strong></div><div class="achievement-date">${ach.date} ${pointsDisplay}</div></div><div class="achievement-desc">${ach.desc}</div>`;
            if (ach.showProgress) {
                let percentProgress = Math.min(100, Math.round(ach.progress / ach.target * 100));
                html += `<div class="progress-small"><div class="progress-small-fill" style="width:${percentProgress}%;"></div></div><div class="achievement-desc">${ach.progress}/${ach.target}</div>`;
            }
            html += `</div>`;
        }
        
        for (let ach of unlockedPenalties) {
            html += `<div class="achievement-item unlocked" style="background:#f8d7da; border-left-color:#dc2626;"><div class="achievement-row"><div><span class="achievement-badge">${ach.icon}</span> <strong>${ach.name}</strong></div><div class="achievement-date">${ach.date} ⚠️ ${ach.points}</div></div><div class="achievement-desc">${ach.desc}</div></div>`;
        }
        
        for (let ach of lockedSpecials) {
            let pointsDisplay = ach.points > 0 ? `🏆 +${ach.points}` : '';
            html += `<div class="achievement-item locked"><div class="achievement-row"><div><span class="achievement-badge">🔒</span> <strong>${ach.name}</strong></div><div class="achievement-date">${pointsDisplay}</div></div><div class="achievement-desc">🔒 未解鎖</div>`;
            if (ach.showProgress) {
                let percentProgress = Math.min(100, Math.round(ach.progress / ach.target * 100));
                html += `<div class="progress-small"><div class="progress-small-fill" style="width:${percentProgress}%;"></div></div><div class="achievement-desc">${ach.progress}/${ach.target}</div>`;
            }
            html += `</div>`;
        }
    }
    
    if (unlockedChapters.length > 0) {
        html += `<h3 style="margin-top:0.8rem;">📖 已獲得章節成就</h3>`;
        let currentUnit = '';
        for (let ach of unlockedChapters) {
            if (ach.unitName !== currentUnit) {
                currentUnit = ach.unitName;
                html += `<div style="margin-top:0.5rem; font-weight:bold;">${currentUnit}</div>`;
            }
            let pointsDisplay = ach.points > 0 ? `🏆 +${ach.points}` : '';
            html += `<div class="achievement-item unlocked"><div class="achievement-row"><div><span class="achievement-badge">${ach.icon}</span> ${ach.chapterName} - ${ach.name}</div><div class="achievement-date">${ach.date} ${pointsDisplay}</div></div></div>`;
        }
    }
    
    if (lockedChapters.length > 0) {
        let lockedId = "lockedChaptersPanel";
        html += `<h3 class="collapsible" onclick="toggleCollapsible('${lockedId}')">🔒 未獲得章節成就 (${lockedChapters.length}) ▼</h3>
                 <div id="${lockedId}" class="collapsible-content collapsed">`;
        let currentUnit = '';
        for (let ach of lockedChapters) {
            if (ach.unitName !== currentUnit) {
                currentUnit = ach.unitName;
                html += `<div style="margin-top:0.5rem; font-weight:bold;">${currentUnit}</div>`;
            }
            let pointsDisplay = ach.points > 0 ? `🏆 +${ach.points}` : '';
            html += `<div class="achievement-item locked"><div class="achievement-row"><div><span class="achievement-badge">🔒</span> ${ach.chapterName} - ${ach.name}</div><div class="achievement-date">${pointsDisplay}</div></div><div class="achievement-desc">🔒 ${ach.needHint}</div></div>`;
        }
        html += `</div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

console.log('✅ achievement.js 已載入（成就系統 + 積分 + 排行榜）');