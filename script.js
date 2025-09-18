// 請假系統 JavaScript 功能
// 更改網址用 http://10.1.61.192:7777 

// 請假管理系統 - Leave Management System
// MIT License - LeaveSystem Project 2024

// 全域變數
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let leaveData = [];
let isFirstTime = true;
let deleteTargetId = null;
let autoRefreshInterval = null; // 用來追蹤自動刷新間隔
let lastDataHash = null; // 用來檢查資料是否真的有變化
let requestInProgress = false; // 避免重複請求

// 初始化應用程式
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 開始初始化應用程式');
    initializeApp();
    console.log('📥 開始載入資料');
    await loadSampleData(); // 等待資料載入完成
    console.log('📅 開始渲染日曆，目前資料筆數:', leaveData.length);
    renderCalendar();
    updateLeaveDetails();
    startAutoRefresh();
    console.log('✅ 初始化完成');
});

// 頁面關閉時清理資源
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        console.log('🧹 頁面關閉，清理自動刷新機制');
    }
});

// 頁面可見性變化時的處理
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // 頁面隱藏時暫停自動刷新
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            console.log('⏸️ 頁面隱藏，暫停自動刷新');
        }
    } else {
        // 頁面重新可見時恢復自動刷新
        startAutoRefresh();
        console.log('▶️ 頁面可見，恢復自動刷新');
    }
});

// 初始化應用程式
function initializeApp() {
    // 導航按鈕事件
    document.getElementById('calendarViewBtn').addEventListener('click', () => switchView('calendar'));
    document.getElementById('submitLeaveBtn').addEventListener('click', () => switchView('submit'));
    document.getElementById('manageBtn').addEventListener('click', () => switchView('manage'));
    
    // 清理重複記錄按鈕
    document.getElementById('cleanupDuplicatesBtn').addEventListener('click', handleCleanupDuplicates);
    
    // 月份導航
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // 表單提交
    document.getElementById('leaveForm').addEventListener('submit', handleLeaveSubmission);
    
    // 模態視窗
    setupModal();
    setupDeleteModal();
    
    // 設定日期輸入的合理範圍（允許補登過去的請假）
    const currentYear = new Date().getFullYear();
    const minDate = `${currentYear - 1}-01-01`; // 可以選擇去年開始的日期
    const maxDate = `${currentYear + 1}-12-31`; // 可以選擇到明年底
    
    document.getElementById('startDate').setAttribute('min', minDate);
    document.getElementById('startDate').setAttribute('max', maxDate);
    document.getElementById('endDate').setAttribute('min', minDate);
    document.getElementById('endDate').setAttribute('max', maxDate);
    
    // 開始日期變更時更新結束日期的最小值（確保結束日期不早於開始日期）
    document.getElementById('startDate').addEventListener('change', function() {
        const startDate = this.value;
        const endDateField = document.getElementById('endDate');
        
        if (startDate) {
            // 結束日期不能早於開始日期
            endDateField.setAttribute('min', startDate);
            
            // 如果目前的結束日期早於新的開始日期，自動調整結束日期
            if (endDateField.value && endDateField.value < startDate) {
                endDateField.value = startDate;
                showDateValidationMessage('已自動調整結束日期至開始日期', 'info');
            }
        }
        
        // 即時驗證日期合理性
        validateDatesRealTime();
    });
    
    // ✅ 新增：結束日期變更時的即時驗證
    document.getElementById('endDate').addEventListener('change', function() {
        validateDatesRealTime();
    });
}

// ✅ 新增：即時日期驗證函數
function validateDatesRealTime() {
    const startDateField = document.getElementById('startDate');
    const endDateField = document.getElementById('endDate');
    const startDate = startDateField.value;
    const endDate = endDateField.value;
    
    // 移除之前的錯誤樣式
    startDateField.classList.remove('date-error');
    endDateField.classList.remove('date-error');
    
    if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        if (startDateObj > endDateObj) {
            // 顯示錯誤
            endDateField.classList.add('date-error');
            const errorMsg = i18n ? 
                '❌ ' + i18n.getTranslation('invalidDateRange').replace('⚠️ ', '') : 
                '❌ 結束日期不能早於開始日期！';
            showDateValidationMessage(errorMsg, 'error');
            return false;
        }
        
        // 檢查請假天數
        const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > 365) {
            startDateField.classList.add('date-error');
            endDateField.classList.add('date-error');
            showDateValidationMessage(`❌ 請假天數過長！當前選擇：${daysDiff}天（最多365天）`, 'error');
            return false;
        }
        
        // 成功驗證
        if (daysDiff > 30) {
            showDateValidationMessage(`⚠️ 長期請假：${daysDiff}天，請確認是否正確`, 'warning');
        } else {
            showDateValidationMessage(`✅ 請假${daysDiff}天`, 'success');
        }
        return true;
    }
    
    return true;
}

// ✅ 新增：顯示日期驗證訊息
function showDateValidationMessage(message, type) {
    // 移除舊的訊息
    const oldMessage = document.querySelector('.date-validation-message');
    if (oldMessage) {
        oldMessage.remove();
    }
    
    // 創建新的訊息
    const messageDiv = document.createElement('div');
    messageDiv.className = 'date-validation-message';
    
    let bgColor, textColor, icon;
    switch (type) {
        case 'error':
            bgColor = '#fee2e2';
            textColor = '#dc2626';
            icon = '❌';
            break;
        case 'warning':
            bgColor = '#fef3cd';
            textColor = '#d97706';
            icon = '⚠️';
            break;
        case 'success':
            bgColor = '#dcfce7';
            textColor = '#16a34a';
            icon = '✅';
            break;
        case 'info':
            bgColor = '#dbeafe';
            textColor = '#2563eb';
            icon = 'ℹ️';
            break;
        default:
            bgColor = '#f3f4f6';
            textColor = '#374151';
            icon = '';
    }
    
    messageDiv.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        padding: 0.5rem 1rem;
        margin: 0.5rem 0;
        border-radius: 6px;
        font-size: 0.9rem;
        border: 1px solid ${textColor}33;
        transition: all 0.3s ease;
    `;
    
    messageDiv.innerHTML = `${icon} ${message}`;
    
    // 添加到表單後面
    const form = document.getElementById('leaveForm');
    if (form) {
        form.appendChild(messageDiv);
        
        // 3秒後自動消失（除了錯誤訊息）
        if (type !== 'error') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.style.opacity = '0';
                    setTimeout(() => messageDiv.remove(), 300);
                }
            }, 3000);
        }
    }
}

// 載入範例資料
async function loadSampleData() {
    // 避免重複請求
    if (requestInProgress) {
        console.log('⏳ 請求進行中，跳過此次更新');
        return false;
    }
    
    requestInProgress = true;
    
    try {
        // 嘗試從伺服器載入共享資料，設定超時
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超時，給50用戶更多時間
        
        const response = await fetch('./data.json?t=' + Date.now(), {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const serverData = await response.json();
            
            // 載入已刪除記錄列表並過濾
            const filteredData = await filterDeletedRecords(serverData);
            
            // 計算資料雜湊值，只有真正變化時才更新
            const newDataHash = JSON.stringify(filteredData).length + '_' + 
                               (filteredData.length > 0 ? filteredData[filteredData.length - 1].id : '0');
            
            if (lastDataHash !== newDataHash) {
                leaveData = filteredData;
                lastDataHash = newDataHash;
                
                // 自動清理重複記錄
                const cleanedCount = cleanupDuplicateRecords();
                
                // ✅ 新增：資料完整性檢查
                const invalidRecords = validateDataIntegrity(leaveData);
                if (invalidRecords.length > 0) {
                    console.warn('⚠️ 發現資料完整性問題:', invalidRecords);
                    showDataIntegrityWarning(invalidRecords);
                }
                
                if (cleanedCount > 0) {
                    // 如果清理了重複記錄，需要保存更新的資料
                    await saveData();
                    console.log(`📥 已從共享檔案載入資料並清理重複記錄: ${leaveData.length} 筆記錄 (清理了 ${cleanedCount} 筆重複)`);
                } else {
                    console.log('📥 已從共享檔案載入資料:', leaveData.length, '筆記錄');
                }
                return true; // 表示有更新
            }
            console.log('📊 資料無變化，跳過更新');
            return false; // 沒有更新
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏰ 載入資料超時（8秒），使用本地資料');
        } else {
            console.log('⚠️ 無法載入共享資料，使用本地資料:', error.message);
        }
    } finally {
        requestInProgress = false;
    }
    
    // 如果無法載入共享資料，使用本地 localStorage
    const savedData = localStorage.getItem('leaveData');
    if (savedData) {
        leaveData = JSON.parse(savedData);
    } else {
        // 預設範例資料
        leaveData = [
            {
                id: 1,
                name: '張小明',
                type: 'leave',
                startDate: '2025-07-28',
                endDate: '2025-07-30',
                submitDate: '2025-07-27'
            },
            {
                id: 2,
                name: '李小美',
                type: 'leave',
                startDate: '2025-07-15',
                endDate: '2025-07-17',
                submitDate: '2025-07-10'
            },
            {
                id: 3,
                name: '王大華',
                type: 'leave',
                startDate: '2025-07-22',
                endDate: '2025-07-22',
                submitDate: '2025-07-20'
            },
            {
                id: 4,
                name: '陳小芳',
                type: 'leave',
                startDate: '2025-08-05',
                endDate: '2025-08-07',
                submitDate: '2025-07-25'
            },
            {
                id: 5,
                name: '林志明',
                type: 'leave',
                startDate: '2025-07-31',
                endDate: '2025-08-01',
                submitDate: '2025-07-29'
            }
        ];
    }
    return false;
}

// 過濾已刪除的記錄
async function filterDeletedRecords(data) {
    try {
        const response = await fetch('./deleted_records.json?t=' + Date.now());
        if (response.ok) {
            const deletedInfo = await response.json();
            const deletedIds = deletedInfo.deletedRecords || [];
            
            // 過濾掉已刪除的記錄
            const filteredData = data.filter(record => !deletedIds.includes(record.id));
            
            if (filteredData.length !== data.length) {
                console.log('🗑️ 已過濾', data.length - filteredData.length, '筆已刪除的記錄');
            }
            
            return filteredData;
        }
    } catch (error) {
        console.log('⚠️ 無法載入刪除記錄檔，使用原始資料');
    }
    
    return data;
}

// 記錄刪除操作
async function recordDeletion(recordId) {
    try {
        // 載入現有的刪除記錄
        let deletedInfo = { deletedRecords: [], lastCleanupTime: '', version: 1 };
        
        try {
            const response = await fetch('./deleted_records.json?t=' + Date.now());
            if (response.ok) {
                deletedInfo = await response.json();
            }
        } catch (e) {
            console.log('📝 創建新的刪除記錄檔');
        }
        
        // 添加新的刪除記錄
        if (!deletedInfo.deletedRecords.includes(recordId)) {
            deletedInfo.deletedRecords.push(recordId);
            deletedInfo.lastCleanupTime = new Date().toISOString();
            
            // 保存刪除記錄
            const saveResponse = await fetch('./save_deleted_records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deletedInfo)
            });
            
            if (saveResponse.ok) {
                console.log('✅ 已記錄刪除操作:', recordId);
                return true;
            } else {
                console.log('⚠️ 無法保存刪除記錄');
            }
        }
    } catch (error) {
        console.log('❌ 記錄刪除操作失敗:', error);
    }
    
    return false;
}

// 檢查日期重疊的函數
function checkDateOverlap(start1, end1, start2, end2) {
    const startDate1 = new Date(start1);
    const endDate1 = new Date(end1);
    const startDate2 = new Date(start2);
    const endDate2 = new Date(end2);
    
    // 檢查兩個日期區間是否重疊
    return startDate1 <= endDate2 && startDate2 <= endDate1;
}

// 檢查重複請假記錄
function checkDuplicateLeave(name, startDate, endDate, excludeId = null) {
    const conflicts = [];
    
    leaveData.forEach(leave => {
        // 排除指定的記錄ID（用於編輯時排除自己）
        if (excludeId && leave.id === excludeId) {
            return;
        }
        
        // 檢查同一人的請假記錄
        if (leave.name === name) {
            // 檢查日期是否重疊
            if (checkDateOverlap(startDate, endDate, leave.startDate, leave.endDate)) {
                conflicts.push({
                    id: leave.id,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    submitDate: leave.submitDate,
                    days: calculateLeaveDays(leave.startDate, leave.endDate)
                });
            }
        }
    });
    
    return conflicts;
}

// 清理現有的重複記錄
function cleanupDuplicateRecords() {
    console.log('🧹 開始清理重複記錄...');
    const duplicateGroups = new Map();
    
    // 群組相同的請假記錄
    leaveData.forEach(leave => {
        const key = `${leave.name}_${leave.startDate}_${leave.endDate}`;
        if (!duplicateGroups.has(key)) {
            duplicateGroups.set(key, []);
        }
        duplicateGroups.get(key).push(leave);
    });
    
    let removedCount = 0;
    
    // 處理每個群組，保留最早申請的記錄
    duplicateGroups.forEach((group, key) => {
        if (group.length > 1) {
            // 按申請日期排序，保留最早的
            group.sort((a, b) => new Date(a.submitDate) - new Date(b.submitDate));
            
            // 移除重複的記錄（保留第一個）
            const toRemove = group.slice(1);
            toRemove.forEach(duplicate => {
                const index = leaveData.findIndex(leave => leave.id === duplicate.id);
                if (index !== -1) {
                    leaveData.splice(index, 1);
                    removedCount++;
                    console.log(`🗑️ 移除重複記錄: ${duplicate.name} ${duplicate.startDate}-${duplicate.endDate} (ID: ${duplicate.id})`);
                }
            });
        }
    });
    
    console.log(`✅ 清理完成，共移除 ${removedCount} 筆重複記錄`);
    return removedCount;
}

// ✅ 新增：資料完整性驗證函數
function validateDataIntegrity(data) {
    const invalidRecords = [];
    
    data.forEach((record, index) => {
        const issues = [];
        
        // 檢查必要欄位
        if (!record.id) issues.push('缺少ID');
        if (!record.name) issues.push('缺少姓名');
        if (!record.startDate) issues.push('缺少開始日期');
        if (!record.endDate) issues.push('缺少結束日期');
        
        // 檢查日期格式
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (record.startDate && !datePattern.test(record.startDate)) {
            issues.push('開始日期格式錯誤');
        }
        if (record.endDate && !datePattern.test(record.endDate)) {
            issues.push('結束日期格式錯誤');
        }
        
        // ⚠️ 重點：檢查日期邏輯
        if (record.startDate && record.endDate) {
            const startDate = new Date(record.startDate);
            const endDate = new Date(record.endDate);
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                if (startDate > endDate) {
                    issues.push('開始日期晚於結束日期');
                }
                
                // 檢查異常長的請假（超過一年）
                const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                if (daysDiff > 365) {
                    issues.push(`請假天數異常(${daysDiff}天)`);
                }
            }
        }
        
        if (issues.length > 0) {
            invalidRecords.push({
                index: index,
                record: record,
                issues: issues
            });
        }
    });
    
    return invalidRecords;
}

// ✅ 新增：顯示資料完整性警告
function showDataIntegrityWarning(invalidRecords) {
    const warningMessages = invalidRecords.map(item => {
        const record = item.record;
        const issues = item.issues.join(', ');
        return `⚠️ ${record.name || '未知'} (${record.startDate || '?'} ~ ${record.endDate || '?'}): ${issues}`;
    });
    
    console.group('📋 資料完整性檢查報告');
    warningMessages.forEach(msg => console.warn(msg));
    console.groupEnd();
    
    // 在管理介面顯示警告訊息
    if (invalidRecords.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'data-integrity-warning';
        warningDiv.style.cssText = `
            background: #fef3cd;
            border: 1px solid #ffd60a;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            font-size: 0.9rem;
        `;
        
        warningDiv.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 1.2rem; margin-right: 0.5rem;">⚠️</span>
                <strong>發現 ${invalidRecords.length} 筆資料完整性問題</strong>
            </div>
            <div style="font-size: 0.85rem; color: #856404;">
                ${warningMessages.join('<br>')}
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #6c757d;">
                建議聯繫管理員檢查資料來源，或使用「清理重複記錄」功能。
            </div>
        `;
        
        // 將警告添加到管理頁面
        const manageSection = document.getElementById('manageSection');
        if (manageSection) {
            // 移除舊的警告
            const oldWarning = manageSection.querySelector('.data-integrity-warning');
            if (oldWarning) {
                oldWarning.remove();
            }
            
            // 添加新警告到管理列表前面
            const manageList = manageSection.querySelector('.manage-list');
            if (manageList) {
                manageList.parentNode.insertBefore(warningDiv, manageList);
            }
        }
    }
}

// 處理手動清理重複記錄
async function handleCleanupDuplicates() {
    console.log('🧹 點擊清理重複記錄按鈕');
    
    if (!confirm('確定要清理重複的請假記錄嗎？\n\n這個操作會自動保留每組重複記錄中最早申請的那一筆，刪除其他重複的記錄。\n\n⚠️ 此操作無法復原！')) {
        console.log('❌ 用戶取消清理操作');
        return;
    }
    
    console.log('✅ 用戶確認清理操作');
    const originalCount = leaveData.length;
    const removedCount = cleanupDuplicateRecords();
    
    if (removedCount > 0) {
        // 保存清理後的資料
        await saveData();
        
        // 更新所有檢視
        updateManageList();
        renderCalendar();
        updateLeaveDetails();
        
        alert(`✅ 清理完成！\n\n原始記錄數：${originalCount}\n移除重複記錄：${removedCount}\n當前記錄數：${leaveData.length}`);
    } else {
        alert('📊 沒有發現重複的記錄，系統已經很乾淨了！');
    }
}

// 測試重複檢查機制（開發用）
function testDuplicateCheck() {
    console.log('🧪 測試重複檢查機制...');
    
    // 測試案例：嘗試為「湯」添加重疊的請假
    const testConflicts1 = checkDuplicateLeave('湯', '2025-08-10', '2025-08-12');
    console.log('測試案例1 - 湯 8/10-8/12:', testConflicts1.length, '個衝突');
    
    const testConflicts2 = checkDuplicateLeave('湯', '2025-08-15', '2025-08-16');
    console.log('測試案例2 - 湯 8/15-8/16:', testConflicts2.length, '個衝突');
    
    const testConflicts3 = checkDuplicateLeave('新員工', '2025-08-10', '2025-08-12');
    console.log('測試案例3 - 新員工 8/10-8/12:', testConflicts3.length, '個衝突');
    
    return {
        case1: testConflicts1.length,
        case2: testConflicts2.length,
        case3: testConflicts3.length
    };
}

// 在控制台中暴露測試函數
window.testDuplicateCheck = testDuplicateCheck;

// 格式化衝突警告訊息
function formatConflictMessage(name, newStart, newEnd, conflicts) {
    const newDays = calculateLeaveDays(newStart, newEnd);
    let message = `⚠️ 發現請假時間衝突！\n\n`;
    message += `👤 員工：${name}\n`;
    message += `📅 欲申請：${formatDate(newStart)} - ${formatDate(newEnd)} (${newDays}天)\n\n`;
    message += `🔍 發現以下衝突的請假記錄：\n`;
    
    conflicts.forEach((conflict, index) => {
        message += `\n${index + 1}. ${formatDate(conflict.startDate)} - ${formatDate(conflict.endDate)} (${conflict.days}天)\n`;
        message += `   申請日期：${formatDate(conflict.submitDate)}\n`;
    });
    
    message += `\n❌ 為避免重複請假，本次申請已被阻擋。\n`;
    message += `💡 請確認日期後重新申請，或先刪除衝突的記錄。`;
    
    return message;
}

// 儲存資料到本地存儲（純前端模式）
async function saveData() {
    // 保存到 localStorage
    localStorage.setItem('leaveData', JSON.stringify(leaveData));
    
    // 嘗試保存到共享的 data.json 檔案
    try {
        // 使用 fetch API 嘗試寫入檔案
        const response = await fetch('./save_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(leaveData)
        });
        
        if (response.ok) {
            console.log('✅ 資料已保存到共享檔案');
            showSaveSuccessNotification();
            return true;
        } else {
            console.log('⚠️ 無法保存到共享檔案');
            showSaveErrorNotification();
        }
    } catch (error) {
        console.log('⚠️ 保存共享資料時發生錯誤');
        showSaveErrorNotification();
    }
    
    return false;
}

// 切換檢視
function switchView(view) {
    const calendarView = document.getElementById('calendarView');
    const submitView = document.getElementById('submitLeaveView');
    const manageView = document.getElementById('manageLeaveView');
    const calendarBtn = document.getElementById('calendarViewBtn');
    const submitBtn = document.getElementById('submitLeaveBtn');
    const manageBtn = document.getElementById('manageBtn');
    
    // 隱藏所有檢視
    calendarView.classList.remove('active');
    submitView.classList.remove('active');
    manageView.classList.remove('active');
    calendarBtn.classList.remove('active');
    submitBtn.classList.remove('active');
    manageBtn.classList.remove('active');
    
    if (view === 'calendar') {
        calendarView.classList.add('active');
        calendarBtn.classList.add('active');
        renderCalendar();
        updateLeaveDetails();
    } else if (view === 'submit') {
        submitView.classList.add('active');
        submitBtn.classList.add('active');
    } else if (view === 'manage') {
        manageView.classList.add('active');
        manageBtn.classList.add('active');
        updateManageList();
    }
}

// 切換月份
function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
    updateLeaveDetails();
}

// 渲染日曆
function renderCalendar() {
    console.log('📅 開始渲染日曆 - 年:', currentYear, '月:', currentMonth);
    const calendar = document.getElementById('calendar');
    
    if (!calendar) {
        console.error('❌ 找不到日曆容器元素 #calendar');
        return;
    }
    
    // 使用國際化的月份和星期名稱
    const monthNames = i18n ? 
        Array.from({length: 12}, (_, i) => i18n.getMonthName(i)) :
        ['1月', '2月', '3月', '4月', '5月', '6月',
         '7月', '8月', '9月', '10月', '11月', '12月'];
    
    const dayNames = i18n ? 
        Array.from({length: 7}, (_, i) => i18n.getWeekdayName(i)) :
        ['日', '一', '二', '三', '四', '五', '六'];
    
    // 更新月份標題
    const currentMonthElement = document.getElementById('currentMonth');
    if (currentMonthElement) {
        currentMonthElement.textContent = i18n ? 
            i18n.formatYearMonth(currentYear, currentMonth) :
            `${currentYear}年${monthNames[currentMonth]}`;
        console.log('📆 更新月份標題:', currentMonthElement.textContent);
    } else {
        console.error('❌ 找不到月份標題元素 #currentMonth');
    }
    
    // 清空日曆
    calendar.innerHTML = '';
    console.log('🧹 清空日曆容器');
    
    // 添加星期標題
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    console.log('📋 已添加星期標題');
    
    // 獲取當月的第一天和最後一天
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    console.log('📅 日曆參數 - 第一天:', firstDay, '開始渲染日期:', startDate);
    
    // 生成日曆天數
    for (let i = 0; i < 42; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // 檢查是否為其他月份
        if (currentDay.getMonth() !== currentMonth) {
            dayElement.classList.add('other-month');
        }
        
        // 檢查是否為今天
        const today = new Date();
        if (currentDay.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // 添加日期數字
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = currentDay.getDate();
        dayElement.appendChild(dayNumber);
        
        // 添加請假項目
        const dayLeaves = getLeavesByDate(currentDay);
        dayLeaves.forEach(leave => {
            const leaveItem = document.createElement('div');
            
            // 根據日期判斷請假類型
            const today = new Date();
            let leaveClass = 'leave-item leave';
            
            // 只比較日期部分，忽略時間 - 使用本地日期避免時區問題
            const todayYear = today.getFullYear();
            const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
            const todayDay = String(today.getDate()).padStart(2, '0');
            const todayDateStr = `${todayYear}-${todayMonth}-${todayDay}`;
            const startDateStr = leave.startDate;
            const endDateStr = leave.endDate;
            
            if (endDateStr < todayDateStr) {
                leaveClass += ' past-leave'; // 請假已結束（過去）
            } else if (startDateStr <= todayDateStr && todayDateStr <= endDateStr) {
                leaveClass += ' current-leave'; // 目前正在休假中
            } else {
                leaveClass += ' future-leave'; // 未來的請假
            }
            
            leaveItem.className = leaveClass;
            leaveItem.textContent = leave.name;
            leaveItem.addEventListener('click', (e) => {
                e.stopPropagation();
                showLeaveModal(leave);
            });
            dayElement.appendChild(leaveItem);
        });
        
        calendar.appendChild(dayElement);
    }
}

// 根據日期獲取請假資料
function getLeavesByDate(date) {
    // 使用本地日期字串避免時區問題
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return leaveData.filter(leave => {
        return dateStr >= leave.startDate && dateStr <= leave.endDate;
    });
}

// 更新請假詳情
function updateLeaveDetails() {
    const leaveDetails = document.getElementById('leaveDetails');
    const monthLeaves = getMonthLeaves(currentYear, currentMonth);
    
    if (monthLeaves.length === 0) {
        const noRecordsText = i18n ? i18n.getTranslation('noLeaveRecords') : '本月暫無請假記錄';
        leaveDetails.innerHTML = `<p style="text-align: center; color: #6b7280;">${noRecordsText}</p>`;
        return;
    }
    
    leaveDetails.innerHTML = '';
    monthLeaves.forEach(leave => {
        const leaveItem = document.createElement('div');
        leaveItem.className = 'leave-detail-item';
        leaveItem.innerHTML = `
            <div class="leave-detail-header">
                <span class="leave-detail-name">${leave.name}</span>
            </div>
            <div class="leave-detail-dates">
                ${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}
            </div>
        `;
        leaveItem.addEventListener('click', () => showLeaveModal(leave));
        leaveDetails.appendChild(leaveItem);
    });
}

// 獲取當月請假資料
function getMonthLeaves(year, month) {
    return leaveData.filter(leave => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        return (startDate <= monthEnd && endDate >= monthStart);
    });
}

// 處理請假申請提交
async function handleLeaveSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const employeeName = formData.get('employeeName').trim();
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    
    // 前端驗證
    if (!validateInput(employeeName, startDate, endDate)) {
        return;
    }
    
    // 使用本地日期避免時區問題
    const submitToday = new Date();
    const submitYear = submitToday.getFullYear();
    const submitMonth = String(submitToday.getMonth() + 1).padStart(2, '0');
    const submitDay = String(submitToday.getDate()).padStart(2, '0');
    const submitDateStr = `${submitYear}-${submitMonth}-${submitDay}`;
    
    const leaveRequest = {
        id: Date.now(),
        name: sanitizeInput(employeeName),
        type: 'leave',
        startDate: startDate,
        endDate: endDate,
        submitDate: submitDateStr
    };
    
    // 驗證日期
    if (new Date(leaveRequest.startDate) > new Date(leaveRequest.endDate)) {
        const errorMsg = i18n ? 
            i18n.getTranslation('invalidDateRange').replace('⚠️ ', '') : 
            '結束日期不能早於開始日期！';
        alert(errorMsg);
        return;
    }
    
    // 檢查重複請假記錄
    const conflicts = checkDuplicateLeave(leaveRequest.name, leaveRequest.startDate, leaveRequest.endDate);
    if (conflicts.length > 0) {
        const conflictMessage = formatConflictMessage(
            leaveRequest.name, 
            leaveRequest.startDate, 
            leaveRequest.endDate, 
            conflicts
        );
        alert(conflictMessage);
        console.log('⚠️ 阻擋重複請假申請:', {
            name: leaveRequest.name,
            requestDates: `${leaveRequest.startDate} - ${leaveRequest.endDate}`,
            conflicts: conflicts.length
        });
        return; // 阻擋申請
    }
    
    // 添加到資料庫
    leaveData.push(leaveRequest);
    
    // 嘗試保存（如果成功就是即時同步，如果失敗就提供檔案下載）
    const saveSuccess = await saveData();
    
    if (saveSuccess) {
        alert('✅ 請假申請提交成功！已即時同步給所有使用者。');
    } else {
        alert('📥 請假申請提交成功！系統會下載檔案供手動同步。');
        updateDataFile();
    }
    
    // 重設表單
    e.target.reset();
    
    // 切換到日曆檢視
    switchView('calendar');
}

// 輸入驗證函數
function validateInput(name, startDate, endDate) {
    // 姓名驗證
    if (!name || name.length < 1) {
        const errorMsg = i18n ? i18n.getTranslation('nameRequired') : '請輸入姓名！';
        alert(errorMsg.replace('⚠️ ', ''));
        return false;
    }
    
    if (name.length > 50) {
        alert('姓名長度不能超過 50 個字元！');
        return false;
    }
    
    // 檢查姓名是否包含特殊字元
    const namePattern = /^[\u4e00-\u9fa5a-zA-Z\s]+$/;
    if (!namePattern.test(name)) {
        alert('姓名只能包含中文、英文和空格！');
        return false;
    }
    
    // 日期驗證
    if (!startDate || !endDate) {
        alert('請選擇開始和結束日期！');
        return false;
    }
    
    // 日期格式驗證
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
        alert('日期格式不正確！');
        return false;
    }
    
    // ✅ 新增：日期邏輯驗證
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // 檢查日期是否有效
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        alert('❌ 請選擇有效的日期！');
        return false;
    }
    
    // 檢查開始日期不能晚於結束日期
    if (startDateObj > endDateObj) {
        alert('❌ 開始日期不能晚於結束日期！\n\n請重新選擇正確的日期範圍。');
        return false;
    }
    
    // 檢查請假天數不能超過365天
    const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff > 365) {
        alert(`❌ 請假天數不能超過365天！\n\n您選擇的天數：${daysDiff}天`);
        return false;
    }
    
    // 檢查不能選擇過去超過1年的日期
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (startDateObj < oneYearAgo) {
        alert('❌ 不能申請超過一年前的請假！');
        return false;
    }
    
    // 檢查不能選擇未來超過2年的日期
    const twoYearsLater = new Date();
    twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
    if (startDateObj > twoYearsLater) {
        alert('❌ 不能申請超過兩年後的請假！');
        return false;
    }
    
    return true;
}

// 輸入清理函數
function sanitizeInput(input) {
    // 移除 HTML 標籤和特殊字元
    return input
        .trim()
        .replace(/<[^>]*>/g, '')  // 移除 HTML 標籤
        .replace(/[<>&"']/g, '')  // 移除危險字元
        .substring(0, 50);        // 限制長度
}

// 設定模態視窗
function setupModal() {
    const modal = document.getElementById('leaveModal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 設定刪除確認模態視窗
function setupDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const closeBtn = document.querySelector('.close-delete');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        deleteTargetId = null;
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        deleteTargetId = null;
    });
    
    confirmBtn.addEventListener('click', () => {
        if (deleteTargetId) {
            deleteLeave(deleteTargetId);
            modal.style.display = 'none';
            deleteTargetId = null;
        }
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            deleteTargetId = null;
        }
    });
}

// 顯示請假詳情模態視窗
function showLeaveModal(leave) {
    const modal = document.getElementById('leaveModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `${sanitizeInput(leave.name)} 的請假資訊`;
    
    // ✅ 使用安全的DOM操作取代innerHTML
    modalBody.innerHTML = ''; // 清空內容
    
    const periodDiv = document.createElement('div');
    periodDiv.style.marginBottom = '1rem';
    const periodStrong = document.createElement('strong');
    periodStrong.textContent = '請假期間：';
    periodDiv.appendChild(periodStrong);
    periodDiv.appendChild(document.createTextNode(` ${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}`));
    modalBody.appendChild(periodDiv);
    
    const daysDiv = document.createElement('div');
    daysDiv.style.marginBottom = '1rem';
    const daysStrong = document.createElement('strong');
    daysStrong.textContent = '請假天數：';
    daysDiv.appendChild(daysStrong);
    daysDiv.appendChild(document.createTextNode(` ${calculateLeaveDays(leave.startDate, leave.endDate)} 天`));
    modalBody.appendChild(daysDiv);
    
    modal.style.display = 'block';
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 計算請假天數
function calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    return dayDiff;
}

// 添加一些額外的互動功能
document.addEventListener('DOMContentLoaded', function() {
    // 為日曆天數添加點擊事件（顯示當天請假情況）
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('other-month')) {
            const dayNumber = e.target.querySelector('.day-number').textContent;
            const clickedDate = new Date(currentYear, currentMonth, parseInt(dayNumber));
            const dayLeaves = getLeavesByDate(clickedDate);
            
            if (dayLeaves.length > 0) {
                showDayLeavesModal(clickedDate, dayLeaves);
            }
        }
    });
    
    // 添加鍵盤導航支援
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' && document.getElementById('calendarView').classList.contains('active')) {
            changeMonth(-1);
        } else if (e.key === 'ArrowRight' && document.getElementById('calendarView').classList.contains('active')) {
            changeMonth(1);
        } else if (e.key === 'Escape') {
            document.getElementById('leaveModal').style.display = 'none';
        }
    });
});

// 顯示特定日期的請假情況
function showDayLeavesModal(date, leaves) {
    const modal = document.getElementById('leaveModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    // 使用本地日期避免時區問題
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    modalTitle.textContent = `${formatDate(dateStr)} 請假人員`;
    
    let leavesHtml = '<div style="display: grid; gap: 1rem;">';
    leaves.forEach(leave => {
        leavesHtml += `
            <div style="padding: 1rem; background: #f8f9ff; border-radius: 8px; border-left: 4px solid #4f46e5;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>${leave.name}</strong>
                </div>
                <div style="color: #6b7280; font-size: 0.9rem;">
                    ${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}
                </div>
            </div>
        `;
    });
    leavesHtml += '</div>';
    
    modalBody.innerHTML = leavesHtml;
    modal.style.display = 'block';
}

// 更新管理列表
function updateManageList() {
    const manageList = document.getElementById('manageLeaveList');
    
    if (leaveData.length === 0) {
        manageList.innerHTML = '<p style="text-align: center; color: #6b7280;">暫無請假記錄</p>';
        return;
    }
    
    manageList.innerHTML = '';
    
    // 按申請日期排序，最新的在前
    const sortedLeaves = [...leaveData].sort((a, b) => new Date(b.submitDate) - new Date(a.submitDate));
    
    sortedLeaves.forEach(leave => {
        // 檢查是否有重複記錄（排除自己）
        const conflicts = checkDuplicateLeave(leave.name, leave.startDate, leave.endDate, leave.id);
        const hasConflicts = conflicts.length > 0; // 有任何衝突就標記
        
        const manageItem = document.createElement('div');
        manageItem.className = `manage-leave-item ${hasConflicts ? 'has-conflicts' : ''}`;
        
        let conflictWarning = '';
        if (hasConflicts) {
            conflictWarning = `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 0.5rem; margin-top: 0.5rem;">
                    <span style="color: #dc2626; font-size: 0.8rem;">
                        <i class="fas fa-exclamation-triangle"></i> 
                        發現 ${conflicts.length} 筆重複記錄，建議清理！
                    </span>
                </div>
            `;
        }
        
        manageItem.innerHTML = `
            <div class="manage-leave-header">
                <span class="manage-leave-name" style="${hasConflicts ? 'color: #dc2626; font-weight: bold;' : ''}">${leave.name}</span>
                <span style="color: #ef4444; font-size: 0.9rem;">
                    <i class="fas fa-trash"></i> 點擊刪除
                </span>
            </div>
            <div class="manage-leave-dates">
                ${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}
                (${calculateLeaveDays(leave.startDate, leave.endDate)} 天)
            </div>
            <div style="margin-top: 0.5rem; color: #6b7280; font-size: 0.8rem;">
                申請日期：${formatDate(leave.submitDate)}
            </div>
            ${conflictWarning}
        `;
        
        manageItem.addEventListener('click', () => showDeleteConfirm(leave));
        manageList.appendChild(manageItem);
    });
}

// 顯示刪除確認
function showDeleteConfirm(leave) {
    const modal = document.getElementById('deleteModal');
    const deleteInfo = document.getElementById('deleteLeaveInfo');
    
    deleteTargetId = leave.id;
    
    // ✅ 使用安全的DOM操作取代innerHTML
    deleteInfo.innerHTML = ''; // 清空內容
    
    const nameDiv = document.createElement('div');
    const nameStrong = document.createElement('strong');
    nameStrong.textContent = '姓名：';
    nameDiv.appendChild(nameStrong);
    nameDiv.appendChild(document.createTextNode(sanitizeInput(leave.name)));
    deleteInfo.appendChild(nameDiv);
    
    const dateDiv = document.createElement('div');
    const dateStrong = document.createElement('strong');
    dateStrong.textContent = '日期：';
    dateDiv.appendChild(dateStrong);
    dateDiv.appendChild(document.createTextNode(`${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}`));
    deleteInfo.appendChild(dateDiv);
    
    const daysDiv = document.createElement('div');
    const daysStrong = document.createElement('strong');
    daysStrong.textContent = '天數：';
    daysDiv.appendChild(daysStrong);
    daysDiv.appendChild(document.createTextNode(`${calculateLeaveDays(leave.startDate, leave.endDate)} 天`));
    deleteInfo.appendChild(daysDiv);
    
    modal.style.display = 'block';
}

// 刪除請假記錄
async function deleteLeave(leaveId) {
    // 先記錄刪除操作
    const recordSuccess = await recordDeletion(leaveId);
    
    // 從本地資料中移除
    leaveData = leaveData.filter(leave => leave.id !== leaveId);
    
    // 保存更新後的資料
    await saveData();
    
    // 更新所有檢視
    updateManageList();
    renderCalendar();
    updateLeaveDetails();
    
    if (recordSuccess) {
        alert('✅ 請假記錄已刪除！已記錄刪除操作，防止記錄復活。');
    } else {
        alert('⚠️ 請假記錄已刪除！但無法記錄刪除操作，記錄可能會重新出現。');
    }
}

// 自動重新整理功能
function startAutoRefresh() {
    // 如果已經有自動刷新在運行，先清除它
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        console.log('🔄 清除舊的自動刷新機制');
    }
    
    // 顯示初始時間
    updateLastUpdateTime();
    
    // 每30秒自動重新整理一次，檢查是否有新的請假資料（降低頻率減少伺服器負荷）
    autoRefreshInterval = setInterval(async () => {
        try {
            const hasUpdate = await loadSampleData(); // 重新載入資料
            
            // 更新時間顯示
            updateLastUpdateTime();
            
            // 如果資料有變化，更新顯示
            if (hasUpdate) {
                renderCalendar();
                updateLeaveDetails();
                if (document.getElementById('manageLeaveView').classList.contains('active')) {
                    updateManageList();
                }
                
                // 在右上角顯示更新提示
                showUpdateNotification();
            }
        } catch (error) {
            console.error('❌ 自動刷新失敗:', error);
        }
    }, 30000); // 改為30秒間隔，減少伺服器負荷
    
    console.log('🚀 啟動自動刷新機制 (每30秒)');
}

// 保存資料到檔案（通過下載方式）
// 更新資料檔案
function updateDataFile() {
    // 自動下載更新的 data.json
    const dataStr = JSON.stringify(leaveData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    // 創建隱藏的下載連結
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.json';
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // 顯示說明並自動下載
    setTimeout(() => {
        alert('📥 系統將下載更新的 data.json 檔案\n\n請將下載的檔案複製到系統資料夾中，替換原有的 data.json 檔案，\n這樣其他同事就能看到您的請假申請了！');
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // 顯示詳細說明
        showSyncInstructions();
    }, 500);
}

// 更新最後更新時間顯示
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    const updateElement = document.getElementById('lastUpdate');
    if (updateElement) {
        updateElement.innerHTML = `<i class="fas fa-sync-alt"></i> 最後更新：${timeString}`;
    }
}

// 顯示更新通知
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        z-index: 2000;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = i18n ? i18n.getTranslation('dataUpdated') : '✅ 資料已更新';
    
    document.body.appendChild(notification);
    
    // 3秒後自動移除通知
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 顯示保存成功通知
function showSaveSuccessNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #059669;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
        z-index: 2000;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = i18n ? i18n.getTranslation('dataSynced') : '🎉 資料已同步！所有人都會看到更新';
    
    document.body.appendChild(notification);
    
    // 5秒後自動移除通知
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// 顯示保存錯誤通知
function showSaveErrorNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc2626;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        z-index: 2000;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = i18n ? i18n.getTranslation('saveFailed') : '⚠️ 無法保存到共享檔案，請檢查伺服器狀態';
    
    document.body.appendChild(notification);
    
    // 7秒後自動移除通知
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 7000);
}

// 顯示同步說明
function showSyncInstructions() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        text-align: left;
        line-height: 1.6;
    `;
    
    content.innerHTML = `
        <h3 style="color: #4f46e5; margin-bottom: 1rem;">📁 如何同步資料檔案</h3>
        <div style="background: #f8f9ff; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <strong>步驟：</strong><br>
            1. 找到剛下載的 <code>data.json</code> 檔案<br>
            2. 將檔案複製到請假系統的資料夾：<br>
            <code style="background: #e5e7eb; padding: 0.2rem;">D:\\WorkSpace\\LeaveSystem\\</code><br>
            3. 替換原有的 data.json 檔案<br>
            4. 其他同事重新整理頁面就能看到更新！
        </div>
        <div style="text-align: center;">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    style="background: #4f46e5; color: white; border: none; padding: 0.75rem 2rem; border-radius: 25px; cursor: pointer;">
                我知道了
            </button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
