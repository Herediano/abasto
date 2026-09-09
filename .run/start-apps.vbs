Set sh = CreateObject("WScript.Shell")
Dir = "C:\Users\marti\Documents\Default Project\abasto-main\.run"
sh.Run """" & Dir & "\start-backend.cmd""", 0, False
WScript.Sleep 2000
sh.Run """" & Dir & "\start-frontend.cmd""", 0, False