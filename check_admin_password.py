"""
Script kiem tra mat khau admin trong he thong
"""
# -*- coding: utf-8 -*-
import json
import os
import sys
from pathlib import Path

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

try:
    from dotenv import load_dotenv
    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from backend.app.models import AppStorage
    
    # Kết nối database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    # Lấy dữ liệu accounts từ database
    storage_row = db.query(AppStorage).filter(AppStorage.key == "accounts").first()
    
    if storage_row and storage_row.value_json:
        accounts = json.loads(storage_row.value_json)
        
        # Tìm tài khoản admin
        admin_found = False
        for key, acc in accounts.items():
            if isinstance(acc, dict) and acc.get("role") == "admin":
                admin_found = True
                print("=" * 60)
                print("THONG TIN TAI KHOAN ADMIN")
                print("=" * 60)
                print(f"Ten dang nhap: {acc.get('username', 'admin')}")
                print(f"Mat khau hien tai: {acc.get('password', 'N/A')}")
                print(f"Ten hien thi: {acc.get('name', 'Quan Tri Vien')}")
                print(f"Vai tro: {acc.get('role', 'admin')}")
                print("=" * 60)
                break
        
        if not admin_found:
            print("Khong tim thay tai khoan admin trong database.")
            print("Mat khau mac dinh khi khoi tao: admin123")
    else:
        print("Chua co du lieu tai khoan trong database.")
        print("Mat khau mac dinh khi khoi tao: admin123")
        print("\nLuu y: Tai khoan admin se duoc tao tu dong khi ban dang nhap lan dau.")
    
    db.close()
    
except ImportError:
    print("Chua cai dat SQLAlchemy. Dang kiem tra mat khau mac dinh...")
    print("=" * 60)
    print("THONG TIN TAI KHOAN ADMIN MAC DINH")
    print("=" * 60)
    print("Ten dang nhap: admin")
    print("Mat khau mac dinh: admin123")
    print("=" * 60)
    print("\nLuu y: Day la mat khau mac dinh khi he thong khoi tao.")
    print("   Neu ban da doi mat khau, hay kiem tra trong ung dung hoac database.")
except Exception as e:
    error_msg = str(e)
    if "no such table" in error_msg.lower():
        print("=" * 60)
        print("THONG TIN TAI KHOAN ADMIN MAC DINH")
        print("=" * 60)
        print("Database chua duoc tao hoac chua co du lieu.")
        print("Mat khau mac dinh khi khoi tao: admin123")
        print("=" * 60)
        print("\nLuu y: Tai khoan admin se duoc tao tu dong khi ban dang nhap lan dau.")
    else:
        print(f"Loi khi kiem tra: {error_msg}")
        print("\nMat khau mac dinh khi khoi tao: admin123")
