# 請假管理系統 (Leave Management System)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Deploy](https://img.shields.io/badge/Deploy-Render-green.svg)](https://render.com/)

一個簡潔易用的請假管理系統，支援中英文介面切換，提供行事曆檢視和請假申請功能。

## ✨ 主要功能

🗓️ **行事曆檢視** - 直觀顯示所有員工請假狀況  
📝 **請假申請** - 支援多種請假類型，表單驗證完整  
🌍 **雲端同步** - 資料自動儲存，多人協作無衝突  
🔒 **安全防護** - XSS防護、輸入驗證、CORS限制  
📱 **響應式設計** - 完美支援桌面、平板、手機  
🌐 **雙語支援** - 完整中英文切換功能  

## 🚀 快速開始

### 線上試用
直接訪問我們的線上演示：[Demo網站](https://leave-management-system.onrender.com)

### 本地運行
```bash
# 1. 下載專案
git clone https://github.com/YOUR_USERNAME/leave-management-system.git
cd leave-management-system

# 2. 安裝依賴
pip install -r requirements.txt

# 3. 啟動伺服器
python cloud_server.py

# 4. 開啟瀏覽器
# 訪問 http://localhost:10000
```

## 🌐 雲端部署

### Render.com (推薦)
1. Fork 這個儲存庫
2. 在 [Render](https://render.com) 建立新的 Web Service
3. 連接您的 GitHub 儲存庫
4. 選擇免費方案即可部署

詳細步驟請參考：[部署指南](DEPLOY.md)

## 🛠️ 技術架構

- **前端**：HTML5 + CSS3 + Vanilla JavaScript
- **後端**：Python + HTTP Server
- **資料儲存**：JSON 本地檔案
- **國際化**：自製 i18n 系統
- **安全性**：CSP + XSS防護 + CORS

## 📄 許可證

本專案採用 [MIT License](LICENSE) 開源許可證。

- ✅ 可商業使用
- ✅ 可修改分發
- ✅ 私人使用
- ✅ 專利授權

詳細許可證資訊請查看 [LICENSE_INFO.md](LICENSE_INFO.md)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📧 聯絡

如有問題請建立 [Issue](https://github.com/YOUR_USERNAME/leave-management-system/issues)

---

⭐ 如果這個專案對您有幫助，請給我們一個星星！
