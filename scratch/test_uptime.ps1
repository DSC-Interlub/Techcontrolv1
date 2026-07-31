$os = Get-CimInstance Win32_OperatingSystem
$bootTime = $os.LastBootUpTime
$uptimeSpan = (Get-Date) - $bootTime
$uptimeDays = [math]::Floor($uptimeSpan.TotalDays)
$uptimeHours = [math]::Floor($uptimeSpan.Hours)
Write-Host "Days: $uptimeDays"
Write-Host "Hours: $uptimeHours"
Write-Host "Span: $uptimeSpan"
