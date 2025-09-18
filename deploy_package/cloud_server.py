#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
請假管理系統 - 雲端部署版本 (Leave Management System - Cloud Version)
MIT License - LeaveSystem Project 2024

適用於 Render, Railway, Heroku 等平台
"""

import os
import json
import threading
import time
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import re

# 環境變數
PORT = int(os.environ.get('PORT', 8080))
HOST = os.environ.get('HOST', '0.0.0.0')

class CloudLeaveSystemHandler(SimpleHTTPRequestHandler):
    """雲端版本的請假系統處理器"""
    
    def __init__(self, *args, **kwargs):
        self.data_file = 'data.json'
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """處理 GET 請求"""
        if self.path == '/':
            self.path = '/index.html'
        elif self.path == '/data.json':
            self.serve_data()
            return
        elif self.path.startswith('/data.json?'):
            self.serve_data()
            return
        
        # 設定安全標頭
        self.add_security_headers()
        super().do_GET()
    
    def do_POST(self):
        """處理 POST 請求"""
        if self.path == '/save':
            self.handle_save_data()
        else:
            self.send_error(404, "Not Found")
    
    def do_OPTIONS(self):
        """處理 OPTIONS 請求（CORS 預檢）"""
        self.send_response(200)
        self.add_security_headers()
        self.end_headers()
    
    def serve_data(self):
        """提供資料文件"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = f.read()
            else:
                data = '[]'
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.add_security_headers()
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
            
        except Exception as e:
            print(f"❌ 讀取資料失敗: {e}")
            self.send_error(500, f"Read failed: {e}")
    
    def handle_save_data(self):
        """處理保存資料"""
        try:
            # 檢查內容長度
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 1024 * 1024:  # 1MB 限制
                self.send_error(413, "Request too large")
                return
            
            # 讀取資料
            data_bytes = self.rfile.read(content_length)
            data_str = data_bytes.decode('utf-8')
            data = json.loads(data_str)
            
            # 驗證資料
            validation_result = self.validate_data_security(data)
            if not validation_result['valid']:
                self.send_error(400, validation_result['error'])
                return
            
            # 保存資料
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # 回應成功
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.add_security_headers()
            self.end_headers()
            self.wfile.write(b'{"status": "success"}')
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 💾 資料已保存 ({len(data)} 筆記錄)")
            
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ 保存資料失敗: {e}")
            try:
                self.send_error(500, f"Save failed: {e}")
            except:
                pass
    
    def add_security_headers(self):
        """添加安全標頭"""
        # CORS 設定 - 雲端版本允許所有來源
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # 安全標頭
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        
        # CSP 政策
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://apis.google.com https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "font-src 'self' https://cdnjs.cloudflare.com; "
            "connect-src 'self';"
        )
        self.send_header('Content-Security-Policy', csp_policy)
        
        # 快取控制
        if self.path == '/data.json' or self.path.startswith('/data.json?'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
    
    def validate_data_security(self, data):
        """驗證資料安全性"""
        try:
            if not isinstance(data, list):
                return {'valid': False, 'error': 'Data must be an array'}
            
            if len(data) > 1000:
                return {'valid': False, 'error': 'Too many records (max 1000)'}
            
            for i, record in enumerate(data):
                if not isinstance(record, dict):
                    return {'valid': False, 'error': f'Record {i} is not an object'}
                
                required_fields = ['id', 'name', 'type', 'startDate', 'endDate', 'submitDate']
                for field in required_fields:
                    if field not in record:
                        return {'valid': False, 'error': f'Record {i} missing field: {field}'}
                
                if not isinstance(record['name'], str) or not record['name'].strip():
                    return {'valid': False, 'error': f'Record {i}: name must be non-empty string'}
                
                name = record['name'].strip()
                if len(name) > 50:
                    return {'valid': False, 'error': f'Record {i}: name too long (max 50 chars)'}
                
                if re.search(r'[<>&"\'\\]', name):
                    return {'valid': False, 'error': f'Record {i}: name contains invalid characters'}
                
                date_pattern = r'^\d{4}-\d{2}-\d{2}$'
                for date_field in ['startDate', 'endDate', 'submitDate']:
                    if not re.match(date_pattern, record[date_field]):
                        return {'valid': False, 'error': f'Record {i}: {date_field} invalid format'}
            
            return {'valid': True, 'error': None}
            
        except Exception as e:
            return {'valid': False, 'error': f'Validation error: {str(e)}'}

def run_server():
    """啟動伺服器"""
    print(f"🚀 請假系統雲端版啟動中...")
    print(f"📍 主機: {HOST}")
    print(f"📍 端口: {PORT}")
    print(f"⏰ 時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌍 這是雲端部署版本，支援外部存取")
    
    try:
        httpd = HTTPServer((HOST, PORT), CloudLeaveSystemHandler)
        print(f"✅ 伺服器已啟動")
        print(f"🔧 按 Ctrl+C 停止伺服器")
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 伺服器已停止")
    except Exception as e:
        print(f"❌ 伺服器啟動失敗: {e}")

if __name__ == "__main__":
    run_server()
