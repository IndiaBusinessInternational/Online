@echo off
rem ============================================================================
rem refresh-video-feed.bat - nightly Watch & Shop feed (v19.1)
rem Rebuilds videos-feed.json from the IBI YouTube channel and pushes it if it
rem changed; the backend imports the new file on its own within 6 hours (or at
rem once via Admin -> Orders -> Videos desk -> Sync channel feed).
rem Registered as the Windows scheduled task "IBI Video Feed" (daily 22:30).
rem
rem Safety: refuses to run while a commit is held back locally - a routine push
rem once shipped a hidden commit that 503d the whole site.
rem ============================================================================
setlocal
cd /d "%~dp0.."
set LOG=%~dp0video-feed-task.log
echo ---- %date% %time% >> "%LOG%"
git fetch -q origin main >> "%LOG%" 2>&1
for /f %%n in ('git rev-list --count origin/main..HEAD') do set AHEAD=%%n
if not "%AHEAD%"=="0" ( echo REFUSED: %AHEAD% unpushed local commits - push or drop them first >> "%LOG%" & exit /b 2 )
git pull -q --rebase origin main >> "%LOG%" 2>&1 || ( echo pull failed - working tree dirty or conflict >> "%LOG%" & exit /b 3 )
node tools\build-video-feed.js >> "%LOG%" 2>&1 || ( echo build failed >> "%LOG%" & exit /b 1 )
git add videos-feed.json tools\video-feed-report.txt >> "%LOG%" 2>&1
git diff --cached --quiet && ( echo feed unchanged >> "%LOG%" & exit /b 0 )
git -c core.autocrlf=false commit -q -m "video feed: nightly refresh from the IBI YouTube channel" >> "%LOG%" 2>&1
git push -q origin main >> "%LOG%" 2>&1 && echo pushed >> "%LOG%"
rem ask the backend to import now (unforced: it may answer "synced within 6 h" and pick it up later)
curl -s -L "https://script.google.com/macros/s/AKfycbyJw77dIdd0f2e8UDJIRefW_f07UH_5KWtoAyJ3iA-i6NaZWCXrCLy4t3IY-_vr7sq9/exec?action=syncVideoFeed" >> "%LOG%" 2>&1
echo. >> "%LOG%"
endlocal
