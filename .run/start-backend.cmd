@echo off
set "NODE=C:\Users\marti\AppData\Local\Programs\node-v24.21.0-win-x64"
set "PATH=%NODE%;%PATH%"
cd /d "C:\Users\marti\Documents\Default Project\abasto-main\backend"
"%NODE%\node.exe" "%NODE%\node_modules\npm\bin\npm-cli.js" run start:dev > server.log 2>&1