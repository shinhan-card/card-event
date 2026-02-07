@echo off
chcp 65001 >nul
echo ========================================
echo 카드 이벤트 인텔리전스 시스템
echo ========================================
echo.

REM 가상환경 확인
if not exist venv (
    echo ❌ 가상환경이 없습니다.
    echo    먼저 "설치.bat"을 실행해주세요.
    pause
    exit /b 1
)

REM .env 파일 확인
if not exist .env (
    echo ⚠️  .env 파일이 없습니다.
    echo    .env.example을 .env로 복사하고 API 키를 설정해주세요.
    echo.
    echo    자동으로 복사하시겠습니까? (Y/N)
    set /p choice=선택: 
    if /i "%choice%"=="Y" (
        copy .env.example .env
        echo.
        echo ✅ .env 파일이 생성되었습니다.
        echo    메모장으로 .env 파일을 열어 GEMINI_API_KEY를 입력하세요.
        notepad .env
        echo.
        echo    API 키를 입력하셨나요? (Y/N)
        set /p ready=선택: 
        if /i not "%ready%"=="Y" (
            echo 프로그램을 종료합니다.
            pause
            exit /b 0
        )
    ) else (
        echo 프로그램을 종료합니다.
        pause
        exit /b 0
    )
)

REM 가상환경 활성화
call venv\Scripts\activate.bat

REM 프로그램 실행
echo.
echo 🚀 프로그램을 시작합니다...
echo.
python main.py

REM 종료 처리
echo.
echo 프로그램이 종료되었습니다.
pause
