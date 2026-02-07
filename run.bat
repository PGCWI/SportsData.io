@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo Fetching latest data from SportsData.io...
call npm run fetch

echo Starting server at http://localhost:3000
call npm start
