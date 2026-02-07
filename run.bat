@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

REM Check if combined data files exist, if not and league-specific data exists, run migration
if not exist "data\teams.json" (
    if exist "data\nba\teams.json" (
        echo Migrating existing data to standardized format...
        call npm run migrate
    )
)

echo Fetching latest data from SportsData.io...
call npm run fetch

echo Starting server at http://localhost:3000
call npm start
