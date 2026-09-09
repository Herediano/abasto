@echo off
set "NODE=C:\Users\marti\AppData\Local\Programs\node-v24.21.0-win-x64"
set "PATH=%NODE%;%PATH%"
cd /d "C:\Users\marti\Documents\Default Project\abasto-main"
"%NODE%\npm.cmd" exec --yes localtunnel -- --port 3000 > "C:\Users\marti\Documents\Default Project\abasto-main\.run\tunnel-backend.log" 2>&1