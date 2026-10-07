@echo off
start "DemoHub24 Watchdog" /min powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File C:\DemoHub24\MockBank\scripts\DemoHub24-Watchdog.ps1
