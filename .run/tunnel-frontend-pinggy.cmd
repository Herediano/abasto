@echo off
set "SSH=C:\WINDOWS\System32\OpenSSH\ssh.exe"
:loop
"%SSH%" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -p 443 -R0:localhost:5173 a.pinggy.io >> "C:\Users\marti\Documents\Default Project\abasto-main\.run\pinggy-frontend.log" 2>&1
timeout /t 5 /nobreak > nul
goto loop