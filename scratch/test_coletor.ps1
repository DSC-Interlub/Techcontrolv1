$ErrorActionPreference = "SilentlyContinue"

# 1. Versão do Windows
$os = Get-CimInstance Win32_OperatingSystem
$windowsVersion = $os.Caption + " (" + $os.Version + ")"

# 2. Uso e Quantidades de Memória RAM (KB para GB)
$totalRAM = $os.TotalVisibleMemorySize
$freeRAM = $os.FreePhysicalMemory
$usedRAM = $totalRAM - $freeRAM

$totalRAM_GB = [math]::Round($totalRAM / 1MB, 1)
$freeRAM_GB = [math]::Round($freeRAM / 1MB, 1)
$usedRAM_GB = [math]::Round($usedRAM / 1MB, 1)
$ramUsagePct = [math]::Round(($usedRAM / $totalRAM) * 100, 1)

# 3. Disco Principal (C:)
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$totalSpaceGB = [math]::Round($disk.Size / 1GB, 1)
$freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 1)
$freeSpacePct = [math]::Round(($disk.FreeSpace / $disk.Size) * 100, 1)

# Tipo de Armazenamento (SSD / HDD)
$mediaType = "Não detectado"
try {
    $physicalDisk = Get-PhysicalDisk | Where-Object { $_.DeviceId -eq 0 -or $_.MediaType -ne $null } | Select-Object -First 1
    if ($physicalDisk) {
        $mediaType = $physicalDisk.MediaType.ToString()
    }
} catch {}

# 4. Nome e Status do Antivírus
$antivirusList = @()
$antivirusAtivo = $false
try {
    $avProducts = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct
    if ($avProducts) {
        foreach ($av in $avProducts) {
            $stateHex = "{0:x}" -f $av.productState
            $isActive = $false
            if ($stateHex.Length -ge 4) {
                $isActive = $stateHex -match "1[0-9a-f]{3}$" -or $stateHex -match "1[0-9a-f]{1}$"
            }
            if ($isActive -or $av.productState -eq 397568 -or $av.productState -eq 266240) {
                $antivirusAtivo = $true
            }
            $antivirusList += $av.displayName
        }
    }
} catch {}

$avStatus = "Inativo"
if ($antivirusAtivo) {
    $avStatus = "Ativo"
}
$detectedAVs = if ($antivirusList.Count -gt 0) { $antivirusList -join ", " } else { "Não detectado" }

# 5. Processador
$cpu = Get-CimInstance Win32_Processor
$cpuModel = $cpu.Name.Trim()

# 6. Uptime (Tempo desde última reinicialização) com captura de erros
$uptimeDays = 0
$uptimeHours = 0
$uptimeStatus = "ok"
try {
    $bootTime = $os.LastBootUpTime
    if ($bootTime -eq $null) {
        $uptimeStatus = "boot_time_nulo"
    } else {
        $uptimeSpan = (Get-Date) - $bootTime
        $uptimeDays = [math]::Floor($uptimeSpan.TotalDays)
        $uptimeHours = [math]::Floor($uptimeSpan.Hours)
    }
} catch {
    $uptimeStatus = "erro: " + $_.Exception.Message
}

# Montar JSON
$result = @{
    data_coleta = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    windows_versao = $windowsVersion
    ram_uso_percentual = $ramUsagePct
    ram_total_gb = $totalRAM_GB
    ram_utilizada_gb = $usedRAM_GB
    ram_livre_gb = $freeRAM_GB
    disco_capacidade_gb = $totalSpaceGB
    disco_livre_gb = $freeSpaceGB
    disco_livre_percentual = $freeSpacePct
    disco_tipo = $mediaType
    antivirus_nome = $detectedAVs
    antivirus_ativo = $avStatus
    processador_modelo = $cpuModel
    uptime_dias = $uptimeDays
    uptime_horas = $uptimeHours
    uptime_status = $uptimeStatus
}

$jsonResult = $result | ConvertTo-Json -Compress
$clipboardText = ":::START_JSON:::`r`n" + $jsonResult + "`r`n:::END_JSON:::"

Set-Clipboard -Value $clipboardText

# Feedback visual
Write-Host "=========================================================="
Write-Host " COLETOR DE DADOS TÉCNICOS - TECHCONTROL"
Write-Host "=========================================================="
Write-Host ""
Write-Host " Dados copiados! Volte ao sistema e cole no campo indicado (Ctrl+V)."
Write-Host ""
Write-Host "=========================================================="
Write-Host $clipboardText
