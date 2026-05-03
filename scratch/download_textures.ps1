
$base = "https://raw.githubusercontent.com/PixiGeko/Minecraft-default-assets/1.20.4/assets/minecraft/textures/"
$texturesDir = Join-Path (Get-Location) "textures"

if (-not (Test-Path $texturesDir)) {
    New-Item -ItemType Directory -Path $texturesDir
}

$blocks = @{
    "grass_block_top.png" = "grass_top.png"
    "grass_block_side.png" = "grass_side.png"
    "dirt.png" = "dirt.png"
    "stone.png" = "stone.png"
    "stone_bricks.png" = "stone_brick.png"
    "bedrock.png" = "bedrock.png"
    "oak_log.png" = "log_side.png"
    "oak_log_top.png" = "log_top.png"
    "oak_leaves.png" = "leaves.png"
    "grass.png" = "tall_grass.png"
    "sand.png" = "sand.png"
    "oak_planks.png" = "planks.png"
    "coal_ore.png" = "coal_ore.png"
    "iron_ore.png" = "iron_ore.png"
    "gold_ore.png" = "gold_ore.png"
    "diamond_ore.png" = "diamond_ore.png"
    "obsidian.png" = "obsidian.png"
    "netherrack.png" = "netherrack.png"
    "magma_block.png" = "magma.png"
    "end_stone.png" = "end_stone.png"
    "crafting_table_top.png" = "crafting_table_top.png"
    "crafting_table_side.png" = "crafting_table_side.png"
    "torch.png" = "torch.png"
    "water_still.png" = "water.png"
    "lava_still.png" = "lava.png"
    "nether_portal.png" = "nether_portal.png"
    "end_portal_frame_top.png" = "end_portal_frame_top.png"
    "end_portal_frame_side.png" = "end_portal_frame_side.png"
    "end_portal.png" = "end_portal.png"
    "end_rod.png" = "end_rod.png"
}

$items = @{
    "wooden_pickaxe.png" = "wooden_pickaxe.png"
    "stone_pickaxe.png" = "stone_pickaxe.png"
    "iron_pickaxe.png" = "iron_pickaxe.png"
    "golden_pickaxe.png" = "gold_pickaxe.png"
    "diamond_pickaxe.png" = "diamond_pickaxe.png"
    "stick.png" = "stick.png"
    "flint.png" = "flint.png"
    "flint_and_steel.png" = "flint_and_steel.png"
    "arrow.png" = "arrow.png"
    "bow.png" = "bow.png"
    "string.png" = "string.png"
    "ender_pearl.png" = "ender_pearl.png"
    "ender_eye.png" = "ender_eye.png"
    "blaze_rod.png" = "blaze_rod.png"
    "blaze_powder.png" = "blaze_powder.png"
    "porkchop.png" = "raw_porkchop.png"
    "rotten_flesh.png" = "rotten_flesh.png"
}

Write-Host "Downloading block textures..."
foreach ($entry in $blocks.GetEnumerator()) {
    $url = $base + "block/" + $entry.Key
    $dest = Join-Path $texturesDir $entry.Value
    Write-Host "Downloading $($entry.Key) -> $($entry.Value)"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -ErrorAction Stop
    } catch {
        Write-Warning "Failed to download $($entry.Key)"
    }
}

Write-Host "Downloading item textures..."
foreach ($entry in $items.GetEnumerator()) {
    $url = $base + "item/" + $entry.Key
    $dest = Join-Path $texturesDir $entry.Value
    Write-Host "Downloading $($entry.Key) -> $($entry.Value)"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -ErrorAction Stop
    } catch {
        Write-Warning "Failed to download $($entry.Key)"
    }
}

Write-Host "Done!"
