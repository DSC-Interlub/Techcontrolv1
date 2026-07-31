$ErrorActionPreference = "SilentlyContinue"

# 1. Versão do Windows
$os = Get-CimInstance Win32_OperatingSystem
$windowsVersion = $os.Caption + " (" + $os.Version + ")"

# 2. Uso de Memória RAM
$totalRAM = $os.TotalVisibleMemorySize
$freeRAM = $os.FreePhysicalMemory
$ramUsagePct = [math]::Round((($totalRAM - $freeRAM) / $totalRAM) * 100, 1)

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

# 4. Antivírus
$antivirusList = @()
$antivirusAtivo = $false
try {
    $avProducts = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct
    if ($avProducts) {
        foreach ($av in $avProducts) {
            $stateHex = "{0:x}" -f $av.productState
            $isActive = $false
            if ($stateHex.Length -ge 4) {
                # O segundo byte indica se está ativo (ex: 10 ou 11 em hex)
                # Normalmente em 397568 (0x061000) o sexto dígito a contar da direita é '1'
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

# 6. Uptime (Tempo desde última reinicialização)
$uptimeDays = 0
$uptimeHours = 0
try {
    $bootTime = $os.LastBootUpTime
    $uptimeSpan = (Get-Date) - $bootTime
    $uptimeDays = [math]::Floor($uptimeSpan.TotalDays)
    $uptimeHours = [math]::Floor($uptimeSpan.Hours)
} catch {}

# Montar JSON final
$result = @{
    data_coleta = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    windows_versao = $windowsVersion
    ram_uso_percentual = $ramUsagePct
    disco_capacidade_gb = $totalSpaceGB
    disco_livre_gb = $freeSpaceGB
    disco_livre_percentual = $freeSpacePct
    disco_tipo = $mediaType
    antivirus_detectado = $detectedAVs
    antivirus_ativo = $avStatus
    processador_modelo = $cpuModel
    uptime_dias = $uptimeDays
    uptime_horas = $uptimeHours
}

$jsonResult = $result | ConvertTo-Json -Compress

# Exibir instruções e o bloco JSON
Write-Host "=========================================================="
Write-Host " COLETOR DE DADOS TÉCNICOS - TECHCONTROL"
Write-Host "=========================================================="
Write-Host "Copie a linha JSON abaixo inteira e cole na tela do sistema:"
Write-Host ""
Write-Host ":::START_JSON:::"
Write-Host $jsonResult
Write-Host ":::END_JSON:::"
Write-Host ""
Write-Host "=========================================================="
