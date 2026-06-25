// ============================================================
// 手機橫置 → 桌面版模式 + 自動全屏（只限做題時）
// ============================================================

// ==================== 首次橫置提示（localStorage 記錄） ====================
function showLandscapeHint() {
    // 檢查是否已顯示過
    if (localStorage.getItem('ms_chem_landscape_hint_shown') === 'true') {
        return;
    }
    
    const hint = document.getElementById('landscapeHint');
    if (!hint) return;
    
    // 只在手機上顯示（<=900px）
    if (window.innerWidth > 900) return;
    
    hint.classList.add('show');
    
    document.getElementById('dismissLandscapeHint')?.addEventListener('click', function() {
        hint.classList.remove('show');
        localStorage.setItem('ms_chem_landscape_hint_shown', 'true');
    });
    
    // 點擊背景也可關閉
    hint.addEventListener('click', function(e) {
        if (e.target === hint) {
            hint.classList.remove('show');
            localStorage.setItem('ms_chem_landscape_hint_shown', 'true');
        }
    });
}

// ==================== 全屏功能 ====================
function requestFullscreen() {
    const el = document.documentElement;
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

// ==================== 方向偵測 + 全屏切換（只限做題時） ====================
function checkOrientationAndFullscreen() {
    const quizModal = document.getElementById('quizModal');
    if (!quizModal) return;
    
    const isQuizVisible = quizModal.classList.contains('show') || quizModal.style.display === 'flex';
    if (!isQuizVisible) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscapeNow = width > height;
    const isMobile = width <= 900;

    // 手機 + 橫置 → 進入全屏
    if (isMobile && isLandscapeNow) {
        if (!isFullscreenActive()) {
            requestFullscreen();
        }
    }
    // 手機 + 直置 → 退出全屏（但只在做題時）
    else if (isMobile && !isLandscapeNow) {
        if (isFullscreenActive()) {
            exitFullscreen();
        }
    }
}

// ==================== 旋轉監聽（只限做題時觸發） ====================
let orientationTimer = null;

function handleOrientationChange() {
    clearTimeout(orientationTimer);
    orientationTimer = setTimeout(function() {
        checkOrientationAndFullscreen();
    }, 300);
}

// ==================== 監聽事件 ====================
window.addEventListener('resize', handleOrientationChange);
window.addEventListener('orientationchange', function() {
    setTimeout(handleOrientationChange, 400);
});

// 監聽全屏變化（用戶手動退出時重新檢查）
document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) {
        setTimeout(function() {
            const quizModal = document.getElementById('quizModal');
            if (quizModal && (quizModal.classList.contains('show') || quizModal.style.display === 'flex')) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                if (width > height && width <= 900) {
                    requestFullscreen();
                }
            }
        }, 300);
    }
});

document.addEventListener('webkitfullscreenchange', function() {
    if (!document.webkitFullscreenElement) {
        setTimeout(function() {
            const quizModal = document.getElementById('quizModal');
            if (quizModal && (quizModal.classList.contains('show') || quizModal.style.display === 'flex')) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                if (width > height && width <= 900) {
                    requestFullscreen();
                }
            }
        }, 300);
    }
});

// ==================== 提交後退出全屏（由 practice.js 調用） ====================
function exitFullscreenAfterSubmit() {
    if (isFullscreenActive()) {
        exitFullscreen();
    }
}

// ==================== 初始化：頁面載入時檢查方向 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 延遲執行，確保所有元素已加載
    setTimeout(function() {
        checkOrientationAndFullscreen();
    }, 500);
});

console.log('✅ landscape.js 已載入（橫置 + 全屏功能）');