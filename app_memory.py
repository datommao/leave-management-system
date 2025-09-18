#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
請假管理系統 - 雲端記憶體版本 (Leave Management System - Cloud Memory Version)
MIT License - LeaveSystem Project 2024

使用記憶體暫存，支援單次會話多人共享
"""

import os
import json
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
import logging

app = Flask(__name__)

# 配置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 環境變數
PORT = int(os.environ.get('PORT', 10000))
HOST = os.environ.get('HOST', '0.0.0.0')

# 使用記憶體儲存數據 (重啟後會清空，但單次會話中所有人共享)
MEMORY_DATA = []
data_lock = threading.Lock()

def load_initial_data():
    """載入初始演示數據"""
    global MEMORY_DATA
    if not MEMORY_DATA:  # 只在空的時候載入
        MEMORY_DATA = [
            {
                "id": "demo_001",
                "name": "演示用戶A",
                "startDate": "2024-09-20",
                "endDate": "2024-09-20",
                "reason": "個人事務",
                "type": "事假",
                "createTime": datetime.now().isoformat()
            },
            {
                "id": "demo_002", 
                "name": "演示用戶B",
                "startDate": "2024-09-21",
                "endDate": "2024-09-21",
                "reason": "家庭聚會",
                "type": "特休",
                "createTime": datetime.now().isoformat()
            }
        ]
        logger.info(f"✅ 載入初始演示數據: {len(MEMORY_DATA)} 筆記錄")

def get_all_data():
    """獲取所有數據"""
    global MEMORY_DATA
    with data_lock:
        return MEMORY_DATA.copy()

def add_data(record):
    """新增數據"""
    global MEMORY_DATA
    try:
        with data_lock:
            # 移除舊記錄（如果ID重複）
            MEMORY_DATA = [item for item in MEMORY_DATA if item.get('id') != record['id']]
            # 添加新記錄
            MEMORY_DATA.append(record)
            logger.info(f"✅ 新增記錄: {record['id']}, 總計: {len(MEMORY_DATA)} 筆")
            return True
    except Exception as e:
        logger.error(f"❌ 新增記錄失敗: {e}")
        return False

def delete_data(record_id):
    """刪除數據"""
    global MEMORY_DATA
    try:
        with data_lock:
            original_count = len(MEMORY_DATA)
            MEMORY_DATA = [item for item in MEMORY_DATA if item.get('id') != record_id]
            if len(MEMORY_DATA) < original_count:
                logger.info(f"✅ 刪除記錄: {record_id}, 剩餘: {len(MEMORY_DATA)} 筆")
                return True
            else:
                logger.warning(f"⚠️ 找不到要刪除的記錄: {record_id}")
                return False
    except Exception as e:
        logger.error(f"❌ 刪除記錄失敗: {e}")
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
        data = get_all_data()
        return jsonify({
            'status': 'success',
            'data': data,
            'count': len(data),
            'timestamp': datetime.now().isoformat(),
            'storage': 'memory',
            'note': '記憶體儲存 - 重啟後資料會重置，但單次會話中所有人共享'
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
        
        # 添加時間戳和ID
        request_data['id'] = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]
        request_data['createTime'] = datetime.now().isoformat()
        
        # 儲存數據
        if add_data(request_data):
            return jsonify({
                'status': 'success',
                'message': '請假數據已儲存到記憶體',
                'id': request_data['id'],
                'storage': 'memory',
                'total_records': len(get_all_data())
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
        if delete_data(data_id):
            return jsonify({
                'status': 'success',
                'message': '數據已刪除',
                'storage': 'memory',
                'remaining_records': len(get_all_data())
            })
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
        'version': '2.1.0',
        'storage': 'memory',
        'records_count': len(get_all_data()),
        'note': '使用記憶體儲存，重啟後資料會重置'
    })

@app.route('/api/stats')
def get_stats():
    """獲取統計資訊"""
    data = get_all_data()
    
    # 統計各種請假類型
    type_stats = {}
    for record in data:
        leave_type = record.get('type', '未知')
        type_stats[leave_type] = type_stats.get(leave_type, 0) + 1
    
    return jsonify({
        'status': 'success',
        'total_records': len(data),
        'type_statistics': type_stats,
        'storage_info': {
            'type': 'memory',
            'persistent': False,
            'shared_in_session': True
        }
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
    print(f"💾 儲存方式: 記憶體 (重啟後重置)")
    print(f"👥 多人共享: 在單次部署中支援")
    print(f"🌐 環境: {'Production' if os.environ.get('PORT') else 'Development'}")
    
    # 載入初始演示數據
    load_initial_data()
    
    # 啟動 Flask 應用
    app.run(host=HOST, port=PORT, debug=False)
