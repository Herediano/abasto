@echo off
set "PGROOT=C:\Users\marti\AppData\Local\Programs"
"%PGROOT%\pgsql\bin\pg_ctl.exe" -D "%PGROOT%\postgres-data" -l "%PGROOT%\postgres-data\server.log" start > "%PGROOT%\postgres-data\pg-start.out" 2>&1