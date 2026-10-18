@echo off
REM ============================================================
REM  iniciar.bat - inicia o CSC Studio automaticamente
REM  Coloque este arquivo na RAIZ do projeto (ao lado do package.json)
REM ============================================================

cd /d "%~dp0"

echo.
echo ===== CSC Studio =====
echo Pasta: %cd%
echo.

REM Se node_modules nao existir ainda (primeira vez), instala as
REM dependencias automaticamente antes de tentar rodar.
if not exist "node_modules" (
    echo [1/2] Instalando dependencias do frontend pela primeira vez...
    echo       ^(isso so acontece uma vez, pode demorar um pouco^)
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERRO] Falha ao rodar 'npm install'. Verifique se o Node.js esta instalado.
        pause
        exit /b 1
    )
    echo.
)

echo [2/2] Iniciando o CSC Studio...
echo       ^(a primeira vez compila o backend Rust do zero e demora mais^)
echo.

call npm run tauri dev

echo.
echo (CSC Studio encerrado)
pause
