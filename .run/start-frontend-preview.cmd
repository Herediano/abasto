@echo off
set "NODE=C:\Users\marti\AppData\Local\Programs\node-v24.21.0-win-x64"
set "PATH=%NODE%;%PATH%"
cd /d "C:\Users\marti\Documents\Default Project\abasto-main\frontend"
"%NODE%\node.exe" "node_modules\vite\bin\vite.js" preview --port 5173 --host > vite.log 2>&1