# Simple install error diagnosis

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "=== Install Error Diagnosis ===" -ForegroundColor Cyan
Write-Host ""

# Check APK file
if (Test-Path $apkPath) {
    $apk = Get-Item $apkPath
    Write-Host "[OK] APK exists: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "[ERROR] APK not found" -ForegroundColor Red
    exit 1
}

# Setup ADB
$possiblePaths = @("$env:LOCALAPPDATA\Android\Sdk", "$env:USERPROFILE\AppData\Local\Android\Sdk")
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $adbPath = Join-Path $path "platform-tools"
        if (Test-Path $adbPath) {
            $env:PATH = "$adbPath;$env:PATH"
            break
        }
    }
}

# Check device
Write-Host ""
Write-Host "Checking device connection..." -ForegroundColor Yellow
$devices = adb devices 2>&1
$deviceList = $devices | Where-Object { $_ -match "device$" }

if ($deviceList.Count -gt 0) {
    Write-Host "[OK] Device connected" -ForegroundColor Green
    
    # Check existing app
    Write-Host ""
    Write-Host "Checking existing app..." -ForegroundColor Yellow
    $installed = adb shell pm list packages | Select-String "bizconnectmobile"
    
    if ($installed) {
        Write-Host "[WARNING] Existing app found: $installed" -ForegroundColor Yellow
        
        # Get existing app version
        Write-Host ""
        Write-Host "Existing app details:" -ForegroundColor Yellow
        $appInfo = adb shell dumpsys package com.bizconnectmobile 2>&1 | Select-String -Pattern "versionCode|versionName"
        $appInfo | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        
        # Try install and show detailed error
        Write-Host ""
        Write-Host "Attempting install (will show detailed error)..." -ForegroundColor Yellow
        $result = adb install -r $apkPath 2>&1
        $result | ForEach-Object { 
            Write-Host "  $_" -ForegroundColor $(if ($_ -match "Success") { "Green" } elseif ($_ -match "error|Error|FAILED|fail") { "Red" } else { "White" })
        }
    } else {
        Write-Host "[OK] No existing app" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Attempting install..." -ForegroundColor Yellow
        $result = adb install $apkPath 2>&1
        $result | ForEach-Object { 
            Write-Host "  $_" -ForegroundColor $(if ($_ -match "Success") { "Green" } elseif ($_ -match "error|Error|FAILED|fail") { "Red" } else { "White" })
        }
    }
} else {
    Write-Host "[ERROR] No device connected" -ForegroundColor Red
    Write-Host ""
    Write-Host "For manual installation on phone:" -ForegroundColor Yellow
    Write-Host "1. Check exact error message shown on phone" -ForegroundColor Cyan
    Write-Host "2. Remove existing app: Settings > Apps > BizConnect > Uninstall" -ForegroundColor Cyan
    Write-Host "3. Check storage space (need 100MB+)" -ForegroundColor Cyan
    Write-Host "4. Check Android version (need 5.0+)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Diagnosis Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please provide the EXACT error message shown on your phone" -ForegroundColor Yellow

