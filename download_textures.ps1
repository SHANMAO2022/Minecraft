$dest = 'd:\20250501-mc\textures'
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }

$urls = @{
    'snow.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/snow.png'
    'ice.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/ice.png'
    'cactus_side.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/cactus_side.png'
    'cactus_top.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/cactus_top.png'
    'lily_pad.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/lily_pad.png'
    'sand.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/sand.png'
}

foreach ($filename in $urls.Keys) {
    $target = Join-Path $dest $filename
    Write-Host "Downloading $filename..."
    Invoke-WebRequest -Uri $urls[$filename] -OutFile $target
}

Write-Host "Success: All textures are now in the textures folder."
