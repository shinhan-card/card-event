@echo off
chcp 65001 >nul
echo ========================================
echo Universal Card Event Crawler
echo ========================================
echo.

if not exist venv (
    echo [ERROR] 가상환경이 없습니다.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo.
echo 실행 중...
echo.
python main_universal.py --auto

echo.
pause
