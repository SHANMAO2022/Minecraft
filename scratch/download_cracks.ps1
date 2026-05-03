
$baseUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/"
for ($i = 0; $i -le 9; $i++) {
    $name = "destroy_stage_$i.png"
    $url = $baseUrl + $name
    $dest = Join-Path "d:\20250501-mc\textures" $name
    Write-Host "Downloading $url to $dest"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -ErrorAction Stop
    } catch {
        Write-Host "Failed to download $url."
    }
}
