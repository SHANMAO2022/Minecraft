
$baseUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/"
$textures = @{
    "pig/pig.png" = "pig.png"
    "zombie/zombie.png" = "zombie.png"
    "spider/spider.png" = "spider.png"
    "enderman/enderman.png" = "enderman.png"
    "blaze.png" = "blaze.png"
    "enderdragon/dragon.png" = "dragon.png"
}

foreach ($remote in $textures.Keys) {
    $local = $textures[$remote]
    $url = $baseUrl + $remote
    $dest = Join-Path "d:\20250501-mc\textures" $local
    Write-Host "Downloading $url to $dest"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -ErrorAction Stop
    } catch {
        Write-Host "Failed to download $url. Retrying without subfolder..."
        try {
            $url2 = $baseUrl + $local
            Invoke-WebRequest -Uri $url2 -OutFile $dest -ErrorAction Stop
        } catch {
            Write-Host "Failed to download $local entirely."
        }
    }
}
