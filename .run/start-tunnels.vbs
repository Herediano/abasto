Set sh = CreateObject("WScript.Shell")
Dir = "C:\Users\marti\Documents\Default Project\abasto-main\.run"
sh.Run """" & Dir & "\tunnel-backend.cmd""", 0, False
WScript.Sleep 2500
sh.Run """" & Dir & "\tunnel-frontend.cmd""", 0, False