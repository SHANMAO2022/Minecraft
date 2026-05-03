
$baseUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/player/wide/"
$textures = @{
    "steve.png" = "steve.png"
}

foreach ($remote in $textures.Keys) {
    $local = $textures[$remote]
    $url = $baseUrl + $remote
    $dest = Join-Path "d:\20250501-mc\textures" $local
    Write-Host "Downloading $url to $dest"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -ErrorAction Stop
    } catch {
        Write-Host "Failed to download $url."
    }
}
