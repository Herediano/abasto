@echo off
set "NGROK=C:\Users\marti\AppData\Local\Programs\ngrok.exe"
"%NGROK%" http 5173 --log=stdout > "C:\Users\marti\Documents\Default Project\abasto-main\.run\ngrok-frontend.log" 2>&1