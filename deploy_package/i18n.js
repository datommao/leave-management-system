// 請假管理系統國際化模組 - Leave Management System i18n Module
// MIT License - LeaveSystem Project 2024

// 🌍 國際化 (i18n) 語言支援
const translations = {
    'zh': {
        // 標題和導航
        title: '請假板板',
        serverRunning: '本地伺服器運行中',
        autoUpdate: '每30秒自動更新',
        calendarView: '行事曆檢視',
        submitLeave: '登記請假',
        manageLeave: '管理請假',
        
        // 行事曆相關
        pastLeave: '過去請假',
        currentLeave: '休假中',
        futureLeave: '未來請假',
        noLeaveRecords: '本月暫無請假記錄',
        
        // 表單相關
        submitLeaveTitle: '登記請假',
        submitLeaveHint: '可以登記過去、現在或未來的請假記錄',
        reminder: '良心提醒',
        reminderText1: '此為<strong>非正式</strong>請假系統，僅供團隊內部參考使用',
        reminderText2: '請<strong>誠實</strong>填寫自己的請假記錄',
        reminderText3: '請勿隨意新增他人的假期資料',
        reminderText4: '正式請假仍需依公司規定辦理',
        nameLabel: '姓名：',
        startDateLabel: '開始日期：',
        endDateLabel: '結束日期：',
        submitBtn: '提交申請',
        resetBtn: '重設表單',
        
        // 管理頁面
        manageLeaveTitle: '管理請假',
        cleanupBtn: '清理重複記錄',
        
        // 月份
        months: [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ],
        
        // 星期
        weekdays: ['日', '一', '二', '三', '四', '五', '六'],
        
        // 訊息
        dataUpdated: '✅ 資料已更新',
        dataSynced: '🎉 資料已同步！所有人都會看到更新',
        saveFailed: '⚠️ 無法保存到共享檔案，請檢查伺服器狀態',
        invalidDateRange: '⚠️ 結束日期不能早於開始日期',
        nameRequired: '⚠️ 請輸入姓名',
        
        // 請假類型
        leaveTypes: {
            annual: '年假',
            sick: '病假',
            personal: '事假',
            compensatory: '補休',
            maternity: '產假',
            other: '其他'
        }
    },
    
    'en': {
        // 標題和導航
        title: 'Leave Management System',
        serverRunning: 'Local Server Running',
        autoUpdate: 'Auto-refresh every 30 seconds',
        calendarView: 'Calendar View',
        submitLeave: 'Submit Leave',
        manageLeave: 'Manage Leave',
        
        // 行事曆相關
        pastLeave: 'Past Leave',
        currentLeave: 'On Leave',
        futureLeave: 'Future Leave',
        noLeaveRecords: 'No leave records for this month',
        
        // 表單相關
        submitLeaveTitle: 'Submit Leave Application',
        submitLeaveHint: 'You can register past, current, or future leave records',
        reminder: 'Friendly Reminder',
        reminderText1: 'This is an <strong>unofficial</strong> leave system for internal team reference only',
        reminderText2: 'Please <strong>honestly</strong> fill in your own leave records',
        reminderText3: 'Do not add leave data for others',
        reminderText4: 'Official leave still requires following company procedures',
        nameLabel: 'Name:',
        startDateLabel: 'Start Date:',
        endDateLabel: 'End Date:',
        submitBtn: 'Submit Application',
        resetBtn: 'Reset Form',
        
        // 管理頁面
        manageLeaveTitle: 'Manage Leave',
        cleanupBtn: 'Cleanup Duplicates',
        
        // 月份
        months: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
        
        // 星期
        weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        
        // 訊息
        dataUpdated: '✅ Data Updated',
        dataSynced: '🎉 Data Synced! Everyone will see the updates',
        saveFailed: '⚠️ Unable to save to shared file, please check server status',
        invalidDateRange: '⚠️ End date cannot be earlier than start date',
        nameRequired: '⚠️ Please enter name',
        
        // 請假類型
        leaveTypes: {
            annual: 'Annual Leave',
            sick: 'Sick Leave',
            personal: 'Personal Leave',
            compensatory: 'Compensatory Leave',
            maternity: 'Maternity Leave',
            other: 'Other'
        }
    }
};

// 🌐 國際化管理器
class I18nManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'zh';
        this.translations = translations;
        this.init();
    }
    
    init() {
        this.updateLanguageButton();
        this.translatePage();
        this.bindEvents();
    }
    
    // 綁定語言切換事件
    bindEvents() {
        const langBtn = document.getElementById('langBtn');
        if (langBtn) {
            langBtn.addEventListener('click', () => {
                this.toggleLanguage();
            });
        }
    }
    
    // 切換語言
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
        localStorage.setItem('language', this.currentLanguage);
        this.updateLanguageButton();
        this.translatePage();
        
        // 重新渲染日曆以更新月份顯示
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
        
        // 重新渲染請假詳情以更新語言
        if (typeof renderLeaveDetails === 'function') {
            renderLeaveDetails();
        }
        
        console.log(`🌍 語言已切換為: ${this.currentLanguage === 'zh' ? '中文' : 'English'}`);
    }
    
    // 更新語言按鈕顯示
    updateLanguageButton() {
        const langBtn = document.getElementById('langBtn');
        if (langBtn) {
            const icon = langBtn.querySelector('i');
            const text = this.currentLanguage === 'zh' ? 'EN' : '中文';
            langBtn.innerHTML = `<i class="fas fa-globe"></i> ${text}`;
        }
    }
    
    // 翻譯整個頁面
    translatePage() {
        const elements = document.querySelectorAll('[data-key]');
        elements.forEach(element => {
            const key = element.getAttribute('data-key');
            const translation = this.getTranslation(key);
            if (translation) {
                element.innerHTML = translation;
            }
        });
        
        // 更新HTML語言屬性
        document.documentElement.lang = this.currentLanguage === 'zh' ? 'zh-TW' : 'en';
        
        // 更新頁面標題
        document.title = this.getTranslation('title') + ' - Leave Management System';
    }
    
    // 獲取翻譯文字
    getTranslation(key) {
        const translation = this.translations[this.currentLanguage];
        if (!translation) return key;
        
        // 支援嵌套鍵值 (例如: leaveTypes.annual)
        const keys = key.split('.');
        let result = translation;
        for (const k of keys) {
            if (result && typeof result === 'object') {
                result = result[k];
            } else {
                break;
            }
        }
        
        return result || key;
    }
    
    // 獲取當前語言
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    // 獲取月份名稱
    getMonthName(monthIndex) {
        const months = this.getTranslation('months');
        return months[monthIndex] || `${monthIndex + 1}`;
    }
    
    // 獲取星期名稱
    getWeekdayName(dayIndex) {
        const weekdays = this.getTranslation('weekdays');
        return weekdays[dayIndex] || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
    }
    
    // 格式化年月顯示
    formatYearMonth(year, month) {
        if (this.currentLanguage === 'en') {
            return `${this.getMonthName(month)} ${year}`;
        } else {
            return `${year}年${this.getMonthName(month)}`;
        }
    }
}

// 🌍 創建全域國際化實例
let i18n;

// 在頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    i18n = new I18nManager();
});

// 導出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18nManager, translations };
}
