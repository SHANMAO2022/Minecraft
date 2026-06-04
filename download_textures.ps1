$dest = 'd:\20250501-mc\textures'
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }

$urls = @{
    'snow.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/snow.png'
    'ice.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/ice.png'
    'cactus_side.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/cactus_side.png'
    'cactus_top.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/cactus_top.png'
    'lily_pad.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/lily_pad.png'
    'sand.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/sand.png'
    'cobblestone.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/block/cobblestone.png'
    'oak_slab.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/oak_slab.png'
    'stone_slab.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/stone_slab.png'
    'cobblestone_slab.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/cobblestone_slab.png'
    'oak_stairs.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/oak_stairs.png'
    'stone_stairs.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/stone_stairs.png'
    'cobblestone_stairs.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/cobblestone_stairs.png'
    'oak_fence.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/oak_fence.png'
    'oak_fence_gate.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/item/oak_fence_gate.png'
    'sheep.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/sheep/sheep.png'
    'chicken.png' = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.1/assets/minecraft/textures/entity/chicken.png'
}

foreach ($filename in $urls.Keys) {
    $target = Join-Path $dest $filename
    Write-Host "Downloading $filename..."
        try {
            Invoke-WebRequest -Uri $urls[$filename] -OutFile $target -TimeoutSec 10
        } catch {
            Write-Host "Error downloading $filename - $_"
        }
}

Write-Host "Success: All textures are now in the textures folder."
