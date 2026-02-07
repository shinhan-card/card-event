@echo off
chcp 65001 >nul
echo ========================================
echo 카드 이벤트 인텔리전스 대시보드
echo ========================================
echo.

REM 가상환경 확인
if not exist venv (
    echo ❌ 가상환경이 없습니다.
    echo    먼저 "설치.bat"을 실행해주세요.
    pause
    exit /b 1
)

REM 가상환경 활성화
call venv\Scripts\activate.bat

REM FastAPI 서버 실행
echo.
echo 🚀 대시보드 서버를 시작합니다...
echo.
echo 📊 대시보드: http://localhost:8000
echo 📖 API 문서: http://localhost:8000/docs
echo.
echo ⚠️  서버를 종료하려면 Ctrl+C를 누르세요.
echo.

python app.py

pause
