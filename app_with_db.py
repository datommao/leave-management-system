#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
請假管理系統 - 數據庫版雲端部署 (Leave Management System - Database Cloud Version)
MIT License - LeaveSystem Project 2024

支援 PostgreSQL 數據庫，多人共享數據
"""

import os
import json
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

app = Flask(__name__)

# 配置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 環境變數
PORT = int(os.environ.get('PORT', 10000))
HOST = os.environ.get('HOST', '0.0.0.0')
DATABASE_URL = os.environ.get('DATABASE_URL')

# 數據庫連接池
data_lock = threading.Lock()

def get_db_connection():
    """獲取數據庫連接"""
    try:
        if DATABASE_URL:
            # 生產環境：使用 PostgreSQL
            conn = psycopg2.connect(DATABASE_URL, sslmode='require')
            return conn
        else:
            # 開發環境：使用本地 JSON 文件
            return None
    except Exception as e:
        logger.error(f"數據庫連接失敗: {e}")
        return None

def init_database():
    """初始化數據庫表"""
    if not DATABASE_URL:
        return  # 本地環境跳過
    
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:
                # 創建請假記錄表
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS leave_records (
                        id VARCHAR(50) PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        reason TEXT NOT NULL,
                        type VARCHAR(50) NOT NULL,
                        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        data JSONB
                    )
                ''')
                
                # 創建索引提升查詢效能
                cur.execute('''
                    CREATE INDEX IF NOT EXISTS idx_leave_records_date 
                    ON leave_records(start_date, end_date)
                ''')
                
                conn.commit()
                logger.info("✅ 數據庫表初始化完成")
            conn.close()
    except Exception as e:
        logger.error(f"❌ 數據庫初始化失敗: {e}")

def load_data():
    """載入請假數據"""
    try:
        if DATABASE_URL:
            # 從 PostgreSQL 載入
            conn = get_db_connection()
            if conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute('''
                        SELECT id, name, start_date, end_date, reason, type, 
                               create_time, data
                        FROM leave_records 
                        ORDER BY create_time DESC
                    ''')
                    rows = cur.fetchall()
                    
                    # 轉換為前端格式
                    data = []
                    for row in rows:
                        record = {
                            'id': row['id'],
                            'name': row['name'],
                            'startDate': row['start_date'].strftime('%Y-%m-%d'),
                            'endDate': row['end_date'].strftime('%Y-%m-%d'),
                            'reason': row['reason'],
                            'type': row['type'],
                            'createTime': row['create_time'].isoformat() if row['create_time'] else None
                        }
                        # 合併額外數據
                        if row['data']:
                            record.update(row['data'])
                        data.append(record)
                    
                conn.close()
                logger.info(f"✅ 從數據庫載入 {len(data)} 筆記錄")
                return data
        
        # 本地環境：使用 JSON 文件
        if os.path.exists('data.json'):
            with open('data.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.info(f"✅ 從本地文件載入 {len(data)} 筆記錄")
                return data
        else:
            # 返回演示數據
            demo_data = [
                {
                    "id": "demo_001",
                    "name": "演示用戶",
                    "startDate": "2024-09-20",
                    "endDate": "2024-09-20",
                    "reason": "個人事務",
                    "type": "事假",
                    "createTime": datetime.now().isoformat()
                }
            ]
            return demo_data
            
    except Exception as e:
        logger.error(f"❌ 載入數據失敗: {e}")
        return []

def save_data(record):
    """儲存單筆請假數據"""
    try:
        with data_lock:
            if DATABASE_URL:
                # 儲存到 PostgreSQL
                conn = get_db_connection()
                if conn:
                    with conn.cursor() as cur:
                        # 準備額外數據
                        extra_data = {k: v for k, v in record.items() 
                                    if k not in ['id', 'name', 'startDate', 'endDate', 'reason', 'type', 'createTime']}
                        
                        cur.execute('''
                            INSERT INTO leave_records 
                            (id, name, start_date, end_date, reason, type, data)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            start_date = EXCLUDED.start_date,
                            end_date = EXCLUDED.end_date,
                            reason = EXCLUDED.reason,
                            type = EXCLUDED.type,
                            data = EXCLUDED.data
                        ''', (
                            record['id'],
                            record['name'],
                            record['startDate'],
                            record['endDate'],
                            record['reason'],
                            record['type'],
                            json.dumps(extra_data) if extra_data else None
                        ))
                        conn.commit()
                    conn.close()
                    logger.info(f"✅ 數據已儲存到數據庫: {record['id']}")
                    return True
            else:
                # 本地環境：儲存到 JSON
                data = load_data()
                # 移除舊記錄（如果存在）
                data = [item for item in data if item.get('id') != record['id']]
                # 添加新記錄
                data.append(record)
                
                with open('data.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                logger.info(f"✅ 數據已儲存到本地文件: {record['id']}")
                return True
                
    except Exception as e:
        logger.error(f"❌ 儲存數據失敗: {e}")
        return False

def delete_data(record_id):
    """刪除請假數據"""
    try:
        with data_lock:
            if DATABASE_URL:
                # 從 PostgreSQL 刪除
                conn = get_db_connection()
                if conn:
                    with conn.cursor() as cur:
                        cur.execute('DELETE FROM leave_records WHERE id = %s', (record_id,))
                        affected_rows = cur.rowcount
                        conn.commit()
                    conn.close()
                    
                    if affected_rows > 0:
                        logger.info(f"✅ 已從數據庫刪除記錄: {record_id}")
                        return True
                    else:
                        logger.warning(f"⚠️ 找不到要刪除的記錄: {record_id}")
                        return False
            else:
                # 本地環境：從 JSON 刪除
                data = load_data()
                original_count = len(data)
                data = [item for item in data if item.get('id') != record_id]
                
                if len(data) < original_count:
                    with open('data.json', 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    logger.info(f"✅ 已從本地文件刪除記錄: {record_id}")
                    return True
                else:
                    logger.warning(f"⚠️ 找不到要刪除的記錄: {record_id}")
                    return False
                    
    except Exception as e:
        logger.error(f"❌ 刪除數據失敗: {e}")
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
            'timestamp': datetime.now().isoformat(),
            'source': 'database' if DATABASE_URL else 'local'
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
        if save_data(request_data):
            return jsonify({
                'status': 'success',
                'message': '請假數據已儲存',
                'id': request_data['id'],
                'storage': 'database' if DATABASE_URL else 'local'
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
                'storage': 'database' if DATABASE_URL else 'local'
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
    db_status = "connected" if get_db_connection() else "local"
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '3.0.0',
        'database': db_status,
        'storage': 'postgresql' if DATABASE_URL else 'json'
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
    print(f"🗄️ 數據庫: {'PostgreSQL' if DATABASE_URL else 'Local JSON'}")
    print(f"🌐 環境: {'Production' if os.environ.get('PORT') else 'Development'}")
    
    # 初始化數據庫
    if DATABASE_URL:
        print("🔗 正在連接數據庫...")
        init_database()
    else:
        print("📁 使用本地文件儲存")
    
    # 啟動 Flask 應用
    app.run(host=HOST, port=PORT, debug=False)
