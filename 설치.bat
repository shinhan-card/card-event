@echo off
chcp 65001 >nul
echo ========================================
echo 카드 이벤트 인텔리전스 시스템 설치
echo ========================================
echo.

echo [1/5] Python 버전 확인 중...
python --version
if errorlevel 1 (
    echo ❌ Python이 설치되어 있지 않습니다.
    echo    https://www.python.org/downloads/ 에서 Python 3.10 이상을 설치해주세요.
    pause
    exit /b 1
)
echo ✅ Python 확인 완료
echo.

echo [2/5] 가상환경 생성 중...
if exist venv (
    echo ⚠️  가상환경이 이미 존재합니다. 삭제 후 재생성합니다.
    rmdir /s /q venv
)
python -m venv venv
if errorlevel 1 (
    echo ❌ 가상환경 생성 실패
    pause
    exit /b 1
)
echo ✅ 가상환경 생성 완료
echo.

echo [3/5] 가상환경 활성화 및 pip 업그레이드...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
echo ✅ pip 업그레이드 완료
echo.

echo [4/5] 패키지 설치 중 (약 2-3분 소요)...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ 패키지 설치 실패
    pause
    exit /b 1
)
echo ✅ 패키지 설치 완료
echo.

echo [5/5] Playwright 브라우저 설치 중...
playwright install chromium
if errorlevel 1 (
    echo ⚠️  Playwright 브라우저 설치 실패 (수동 설치 필요)
) else (
    echo ✅ Playwright 브라우저 설치 완료
)
echo.

echo ========================================
echo 설치가 완료되었습니다!
echo ========================================
echo.
echo 📌 다음 단계:
echo    1. .env.example 파일을 .env로 복사
echo    2. .env 파일을 열어 GEMINI_API_KEY 입력
echo    3. "실행.bat" 파일을 실행하여 프로그램 시작
echo.

pause
