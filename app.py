#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
請假管理系統 - Flask版雲端部署 (Leave Management System - Flask Cloud Version)
MIT License - LeaveSystem Project 2024

專為 Render.com 等雲端平台優化
"""

import os
import json
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file

app = Flask(__name__)

# 環境變數
PORT = int(os.environ.get('PORT', 10000))
HOST = os.environ.get('HOST', '0.0.0.0')

# 數據文件
DATA_FILE = 'data.json'
data_lock = threading.Lock()

def load_data():
    """載入請假數據"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # 初始化演示數據
            initial_data = []
            save_data(initial_data)
            return initial_data
    except Exception as e:
        print(f"❌ 載入數據失敗: {e}")
        return []

def save_data(data):
    """儲存請假數據"""
    try:
        with data_lock:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 數據已儲存: {len(data)} 筆記錄")
        return True
    except Exception as e:
        print(f"❌ 儲存數據失敗: {e}")
        return False

def validate_leave_data(data):
    """驗證請假數據"""
    required_fields = ['name', 'startDate', 'endDate', 'reason', 'type']
    
    if not isinstance(data, dict):
        return False, "數據格式錯誤"
    
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"缺少必要欄位: {field}"
    
    # 驗證日期格式
    try:
        start_date = datetime.strptime(data['startDate'], '%Y-%m-%d')
        end_date = datetime.strptime(data['endDate'], '%Y-%m-%d')
        if start_date > end_date:
            return False, "開始日期不能晚於結束日期"
    except ValueError:
        return False, "日期格式錯誤"
    
    return True, "驗證通過"

@app.route('/')
def index():
    """主頁面"""
    return send_file('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """提供靜態文件"""
    try:
        return send_from_directory('.', filename)
    except FileNotFoundError:
        return "File not found", 404

@app.route('/api/data', methods=['GET'])
def get_data():
    """獲取請假數據"""
    try:
        data = load_data()
        return jsonify({
            'status': 'success',
            'data': data,
            'count': len(data),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/data', methods=['POST'])
def save_leave_data():
    """儲存請假數據"""
    try:
        # 檢查請求大小
        if request.content_length and request.content_length > 1024 * 1024:  # 1MB
            return jsonify({
                'status': 'error',
                'message': '請求數據過大'
            }), 413
        
        request_data = request.get_json()
        if not request_data:
            return jsonify({
                'status': 'error',
                'message': '無效的JSON數據'
            }), 400
        
        # 驗證數據
        is_valid, message = validate_leave_data(request_data)
        if not is_valid:
            return jsonify({
                'status': 'error',
                'message': message
            }), 400
        
        # 載入現有數據
        data = load_data()
        
        # 添加時間戳和ID
        request_data['id'] = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]
        request_data['createTime'] = datetime.now().isoformat()
        
        # 添加新數據
        data.append(request_data)
        
        # 儲存數據
        if save_data(data):
            return jsonify({
                'status': 'success',
                'message': '請假數據已儲存',
                'id': request_data['id']
            })
        else:
            return jsonify({
                'status': 'error',
                'message': '儲存失敗'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'伺服器錯誤: {str(e)}'
        }), 500

@app.route('/api/data/<data_id>', methods=['DELETE'])
def delete_leave_data(data_id):
    """刪除請假數據"""
    try:
        data = load_data()
        original_count = len(data)
        
        # 過濾掉要刪除的項目
        data = [item for item in data if item.get('id') != data_id]
        
        if len(data) < original_count:
            if save_data(data):
                return jsonify({
                    'status': 'success',
                    'message': '數據已刪除'
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': '刪除失敗'
                }), 500
        else:
            return jsonify({
                'status': 'error',
                'message': '找不到指定的數據'
            }), 404
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'刪除失敗: {str(e)}'
        }), 500

@app.route('/health')
def health_check():
    """健康檢查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0'
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': '頁面不存在'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': '伺服器內部錯誤'
    }), 500

if __name__ == '__main__':
    print(f"🚀 請假管理系統啟動中...")
    print(f"📍 Host: {HOST}")
    print(f"🔌 Port: {PORT}")
    print(f"🌐 環境: {'Production' if os.environ.get('PORT') else 'Development'}")
    
    # 確保數據文件存在
    if not os.path.exists(DATA_FILE):
        print(f"📁 初始化數據文件: {DATA_FILE}")
        save_data([])
    
    # 啟動 Flask 應用
    app.run(host=HOST, port=PORT, debug=False)
