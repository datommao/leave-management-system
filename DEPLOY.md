# 🚀 請假系統雲端部署指南 (2024年更新版)

## 📋 **最新更新內容**
✅ **2024年9月更新：**
- ✨ 新增 MIT License 許可證保護
- 🌍 完整中英文語言切換功能  
- 🔒 增強的安全性防護
- 📱 優化響應式設計
- 🛡️ 隱私數據已清理

## 📦 **部署文件已準備**

✅ 核心文件：
- `cloud_server.py` - 雲端版伺服器（已更新版權聲明）
- `index.html` - 主頁面（含語言切換）
- `script.js` - 核心功能（含安全防護）
- `styles.css` - 樣式表（響應式設計）
- `i18n.js` - 國際化支援（中英文）
- `data.json` - 匿名演示數據

✅ 配置文件：
- `requirements.txt` - Python 依賴
- `Procfile` - 啟動命令
- `runtime.txt` - Python 版本指定
- `LICENSE` - MIT 許可證
- `LICENSE_INFO.md` - 許可證說明

## 🌟 **推薦平台：Render.com (免費)**

### **步驟 1：註冊 Render 帳號**
1. 前往 https://render.com
2. 使用 GitHub 帳號註冊（推薦）
3. 驗證 email

### **步驟 2：準備 GitHub 儲存庫**

#### 方法 A：建立新的 GitHub 儲存庫
1. 前往 https://github.com
2. 點擊右上角 "+" → "New repository"
3. 填寫儲存庫名稱：`leave-management-system`
4. 設定為 **Public**（免費部署需求）
5. ✅ 勾選 "Add a README file"
6. 選擇 License：**MIT License**
7. 點擊 "Create repository"

#### 上傳文件到 GitHub：
**方式 1：網頁上傳（推薦新手）**
1. 點擊 "uploading an existing file"
2. 將以下文件拖拽上傳：
   ```
   ├── LICENSE                 (許可證文件)
   ├── LICENSE_INFO.md        (許可證說明)
   ├── cloud_server.py        (主伺服器)
   ├── index.html            (前端頁面)
   ├── script.js             (JavaScript邏輯)
   ├── styles.css            (樣式表)
   ├── i18n.js               (國際化)
   ├── data.json             (演示數據)
   ├── requirements.txt      (Python依賴)
   ├── Procfile              (啟動配置)
   └── runtime.txt           (Python版本)
   ```
3. 填寫 Commit message：`Initial commit - Leave Management System`
4. 點擊 "Commit changes"

**方式 2：Git 命令上傳**
```bash
# 在 deploy_package 資料夾內執行
git init
git add .
git commit -m "Initial commit - Leave Management System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leave-management-system.git
git push -u origin main
```

### **步驟 3：在 Render 建立 Web Service**

1. **登入 Render**
   - 前往 https://render.com
   - 點擊 "GitHub" 登入

2. **建立新服務**
   - 點擊 "New +" → "Web Service"
   - 選擇您的 GitHub 儲存庫：`leave-management-system`
   - 點擊 "Connect"

3. **配置服務設定**
   ```
   Name: leave-management-system
   Region: Singapore (推薦亞洲用戶)
   Branch: main
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python app.py
   ```

4. **⚠️ 重要：不要設定環境變數**
   - Render 會自動設定 PORT
   - 讓系統自動處理即可

5. **選擇方案**
   - 選擇 **"Free"** 方案  
   - 點擊 "Create Web Service"

### **步驟 4：部署完成！**

🎉 **部署成功後：**
- Render 會提供一個網址：`https://your-app-name.onrender.com`
- 首次部署約需 3-5 分鐘
- 可在 Dashboard 查看部署狀態

### **步驟 5：測試系統功能**

✅ **測試項目：**
1. **基本功能**
   - 開啟網站，檢查頁面是否正常顯示
   - 測試行事曆顯示
   
2. **語言切換**
   - 點擊右上角語言切換按鈕
   - 確認中英文切換正常
   
3. **請假功能**
   - 填寫請假申請表單
   - 確認資料能正常儲存
   
4. **響應式設計**
   - 用手機開啟網站
   - 確認介面適應手機螢幕

#### 方法 B：直接壓縮上傳
如果不想用 GitHub，可以直接上傳 ZIP 檔案

### **步驟 3：在 Render 建立 Web Service**

1. 登入 Render Dashboard
2. 點擊 "New +" → "Web Service"
3. 選擇你的 GitHub 儲存庫
4. 設定如下：
   ```
   Name: leave-system
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python cloud_server.py
   ```

### **步驟 4：部署設定**
```yaml
Runtime: Python 3.11
Region: Singapore (較近)
Plan: Free ($0/month)
```

### **步驟 5：等待部署**
- 通常需要 2-5 分鐘
- 完成後會獲得網址，例如：
  `https://leave-system-abc123.onrender.com`

---

## 🌈 **替代方案：Railway.app**

### **Railway 部署步驟**
1. 前往 https://railway.app
2. 使用 GitHub 登入
3. "New Project" → "Deploy from GitHub repo"
4. 選擇你的儲存庫
5. Railway 會自動偵測並部署

### **環境變數設定**
```
PORT=8080
HOST=0.0.0.0
```

---

## 🔧 **其他平台選項**

### **Heroku (有限免費)**
1. 前往 https://heroku.com
2. 安裝 Heroku CLI
3. 執行命令：
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

### **Vercel (靜態檔案)**
適合純前端版本，但無法保存資料

### **PythonAnywhere (免費額度)**
提供 Python 運行環境

---

## 🎯 **部署後測試**

### **功能檢查清單**
- [ ] 網站可以正常開啟
- [ ] 語言切換功能正常
- [ ] 可以新增請假記錄
- [ ] 行事曆顯示正確
- [ ] 管理功能可用
- [ ] 手機版顯示正常

### **分享給同事**
部署成功後，您會得到一個公開網址，例如：
`https://your-app-name.onrender.com`

直接分享這個網址給同事即可！

---

## 🛡️ **安全注意事項**

### **雲端版本特色**
- ✅ 開放外部存取（適合分享）
- ✅ 完整安全驗證
- ✅ 資料大小限制
- ✅ 輸入清理和驗證

### **生產環境建議**
如果需要更嚴格的安全控制：
1. 添加使用者認證
2. 設定存取權限
3. 使用 HTTPS
4. 定期備份資料

---

## 🆘 **常見問題**

### **Q: 部署失敗怎麼辦？**
A: 檢查以下項目：
- requirements.txt 格式正確
- runtime.txt 版本支援
- Procfile 命令正確

### **Q: 資料會不會遺失？**
A: 免費平台可能有限制，建議：
- 定期下載資料備份
- 使用多個平台部署

### **Q: 可以自訂網域嗎？**
A: 大部分平台支援，但可能需要付費方案

---

🎉 **現在您就可以開始部署了！建議從 Render.com 開始，最簡單易用！**
