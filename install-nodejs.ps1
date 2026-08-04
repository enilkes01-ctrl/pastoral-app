# Script para instalar Node.js LTS automáticamente en Windows

Write-Host "Descargando Node.js LTS..." -ForegroundColor Green

$NodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
$OutputPath = "$env:TEMP\node-installer.msi"

# Descargar
Invoke-WebRequest -Uri $NodeUrl -OutFile $OutputPath
Write-Host "Descarga completada: $OutputPath" -ForegroundColor Green

# Instalar (requiere permisos de admin)
Write-Host "Instalando Node.js (se abrirá ventana de instalación)..." -ForegroundColor Green
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$OutputPath`" /quiet /norestart" -Wait

# Verificar instalación
Write-Host "Verificando instalación..." -ForegroundColor Cyan
node --version
npm --version

Write-Host "Node.js instalado exitosamente!" -ForegroundColor Green
