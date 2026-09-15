# Create Desktop & Start Menu shortcuts for YellowBird Admin Portal

$WshShell = New-Object -ComObject WScript.Shell

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExePath = Join-Path $ProjectDir "YellowBird-Admin-Portal\YellowBird Admin Portal.exe"

# If script is inside YellowBird-Admin-Portal folder
if (-not (Test-Path $ExePath)) {
    $ExePath = Join-Path $ProjectDir "YellowBird Admin Portal.exe"
}

if (-not (Test-Path $ExePath)) {
    Write-Host "[ERROR] YellowBird Admin Portal.exe not found at $ExePath" -ForegroundColor Red
    exit 1
}

$WorkingDir = Split-Path -Parent $ExePath
$IconPath = Join-Path $WorkingDir "icon.ico"
if (-not (Test-Path $IconPath)) {
    $IconPath = Join-Path $ProjectDir "electron\icon.ico"
}

$DesktopFolder = [Environment]::GetFolderPath('Desktop')
$StartMenuFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs')

# 1. Create Desktop Shortcut
$DesktopLnk = Join-Path $DesktopFolder "YellowBird Admin Portal.lnk"
$Shortcut1 = $WshShell.CreateShortcut($DesktopLnk)
$Shortcut1.TargetPath = $ExePath
$Shortcut1.WorkingDirectory = $WorkingDir
$Shortcut1.Description = "YellowBird School Transport Fleet Management Admin Portal"
if (Test-Path $IconPath) {
    $Shortcut1.IconLocation = "$IconPath,0"
} else {
    $Shortcut1.IconLocation = "$ExePath,0"
}
$Shortcut1.Save()

# 2. Create Start Menu Shortcut (Makes it searchable in Start Menu and pinnable to Start)
$StartMenuLnk = Join-Path $StartMenuFolder "YellowBird Admin Portal.lnk"
$Shortcut2 = $WshShell.CreateShortcut($StartMenuLnk)
$Shortcut2.TargetPath = $ExePath
$Shortcut2.WorkingDirectory = $WorkingDir
$Shortcut2.Description = "YellowBird School Transport Fleet Management Admin Portal"
if (Test-Path $IconPath) {
    $Shortcut2.IconLocation = "$IconPath,0"
} else {
    $Shortcut2.IconLocation = "$ExePath,0"
}
$Shortcut2.Save()

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] YellowBird Admin Portal shortcuts created!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  1. Desktop Icon created: $DesktopLnk" -ForegroundColor Cyan
Write-Host "  2. Start Menu Icon created: $StartMenuLnk" -ForegroundColor Cyan
Write-Host "     (You can now search 'YellowBird' in Start Menu or Pin to Start!)" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
