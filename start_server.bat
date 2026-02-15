
@echo off
echo ------------------------------------------
echo 🚀 Đang khởi chạy máy chủ FastAPI...
echo ------------------------------------------

REM Kiểm tra nếu Python đã cài
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python chưa được cài hoặc chưa thêm vào PATH!
    pause
    exit /b
)

REM Kiểm tra xem đã cài đặt dependencies chưa
python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  FastAPI chưa được cài đặt!
    echo 📦 Đang cài đặt dependencies...
    pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ Lỗi khi cài đặt dependencies!
        pause
        exit /b
    )
)

REM Mở trình duyệt sau 2 giây (để server kịp khởi động)
timeout /t 2 /nobreak >nul
start "" http://localhost:8000/QuanlynhanlucBS.html

REM Chạy máy chủ FastAPI trên cổng 8000
echo ✅ Đang khởi động FastAPI server...
python app.py

pause
