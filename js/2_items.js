        // ==========================================
        const ITEM_NAMES = {
            grass: "草方块", dirt: "泥土", sand: "沙子", leaves: "树叶", tall_grass: "高草丛", log: "橡木原木", planks: "橡木木板", glass: "玻璃", stone: "石头", coal_ore: "煤矿石", iron_ore: "铁矿石", gold_ore: "金矿石", diamond_ore: "钻石矿石", bedrock: "基岩", water: "水", lava: "熔岩", crafting_table: "工作台", furnace: "熔炉", end_rod: "末地烛", obsidian: "黑曜石", nether_portal: "下界传送门", netherrack: "下界岩", magma: "岩浆块", nether_bricks: "下界砖块", spawner: "刷怪笼", end_stone: "末地石", end_portal_frame_empty: "末地传送门框架", end_portal_frame_filled: "激活的传送门框架", end_portal: "末地传送门", stone_brick: "石砖", return_portal: "返回传送门", 
            snow: "雪", ice: "冰", cactus: "仙人掌", lily_pad: "睡莲", swamp_grass: "沼泽草方块", swamp_leaves: "沼泽树叶",
            wooden_pickaxe: "木镐", stone_pickaxe: "石镐", iron_pickaxe: "铁镐", gold_pickaxe: "金镐", diamond_pickaxe: "钻石镐", 
            wooden_sword: "木剑", stone_sword: "石剑", iron_sword: "铁剑", golden_sword: "金剑", diamond_sword: "钻石剑",
            wooden_axe: "木斧", stone_axe: "石斧", iron_axe: "铁斧", golden_axe: "金斧", diamond_axe: "钻石斧",
            leather_helmet: "皮革头盔", leather_chestplate: "皮革胸甲", leather_leggings: "皮革护腿", leather_boots: "皮革靴子",
            iron_helmet: "铁头盔", iron_chestplate: "铁胸甲", iron_leggings: "铁护腿", iron_boots: "铁靴子",
            golden_helmet: "金头盔", golden_chestplate: "金胸甲", golden_leggings: "金护腿", golden_boots: "金靴子",
            diamond_helmet: "钻石头盔", diamond_chestplate: "钻石胸甲", diamond_leggings: "钻石护腿", diamond_boots: "钻石靴子",
            iron_ingot: "铁锭", gold_ingot: "金锭", coal: "煤炭", diamond: "钻石",
            raw_porkchop: "生猪排", cooked_porkchop: "熟猪排", raw_beef: "生牛排", cooked_beef: "熟牛排", leather: "皮革", rotten_flesh: "腐肉", flint_and_steel: "打火石", ender_pearl: "末影珍珠", blaze_powder: "烈焰粉", ender_eye: "末影之眼", blaze_rod: "烈焰棒", bow: "弓", arrow: "箭", stick: "木棍", string: "线", flint: "燧石", torch: "火把", bed: "床", bed_head: "床头", bed_foot: "床尾", chest: "箱子", door: "木门"
        };

        const ITEMS = {
            grass: { type: 'block', hardness: 0.6, tool: 'none', tier: 0 }, dirt: { type: 'block', hardness: 0.5, tool: 'none', tier: 0 },
            sand: { type: 'block', hardness: 0.5, tool: 'none', tier: 0 }, leaves: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 },
            tall_grass: { type: 'block', hardness: 0.05, tool: 'none', tier: 0 }, log: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 },
            planks: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 }, glass: { type: 'block', hardness: 0.3, tool: 'none', tier: 0 }, stone: { type: 'block', hardness: 5.0, tool: 'pickaxe', tier: 1 },
            coal_ore: { type: 'block', hardness: 6.0, tool: 'pickaxe', tier: 1 }, iron_ore: { type: 'block', hardness: 8.0, tool: 'pickaxe', tier: 2 },
            gold_ore: { type: 'block', hardness: 10.0, tool: 'pickaxe', tier: 3 }, diamond_ore: { type: 'block', hardness: 12.0, tool: 'pickaxe', tier: 3 },
            bedrock: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 }, water: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 }, lava: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            crafting_table: { type: 'block', hardness: 2.5, tool: 'none', tier: 0 }, furnace: { type: 'block', hardness: 3.5, tool: 'pickaxe', tier: 1 },
            end_rod: { type: 'block', hardness: 0.1, tool: 'none', tier: 0 },
            obsidian: { type: 'block', hardness: 50.0, tool: 'pickaxe', tier: 3 }, nether_portal: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            netherrack: { type: 'block', hardness: 0.4, tool: 'pickaxe', tier: 1 }, magma: { type: 'block', hardness: 0.5, tool: 'pickaxe', tier: 1 },
            nether_bricks: { type: 'block', hardness: 2.0, tool: 'pickaxe', tier: 1 }, spawner: { type: 'block', hardness: 5.0, tool: 'pickaxe', tier: 1 },
            end_stone: { type: 'block', hardness: 3.0, tool: 'pickaxe', tier: 1 }, end_portal_frame_empty: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            end_portal_frame_filled: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 }, end_portal: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            stone_brick: { type: 'block', hardness: 2.5, tool: 'pickaxe', tier: 1 }, return_portal: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            snow: { type: 'block', hardness: 0.1, tool: 'none', tier: 0 }, ice: { type: 'block', hardness: 0.5, tool: 'none', tier: 0 }, 
            cactus: { type: 'block', hardness: 0.4, tool: 'none', tier: 0 }, lily_pad: { type: 'block', hardness: 0.01, tool: 'none', tier: 0 },
            swamp_grass: { type: 'block', hardness: 0.6, tool: 'none', tier: 0 }, swamp_leaves: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 },
            
            wooden_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 1, power: 4 }, stone_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 2, power: 8 },
            iron_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 3, power: 15 }, gold_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 3, power: 25 },
            diamond_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 4, power: 30 },
            wooden_sword: { type: 'tool', toolType: 'sword', tier: 1, power: 5 }, stone_sword: { type: 'tool', toolType: 'sword', tier: 2, power: 10 }, iron_sword: { type: 'tool', toolType: 'sword', tier: 3, power: 18 }, golden_sword: { type: 'tool', toolType: 'sword', tier: 3, power: 25 }, diamond_sword: { type: 'tool', toolType: 'sword', tier: 4, power: 35 },
            wooden_axe: { type: 'tool', toolType: 'axe', tier: 1, power: 4 }, stone_axe: { type: 'tool', toolType: 'axe', tier: 2, power: 8 }, iron_axe: { type: 'tool', toolType: 'axe', tier: 3, power: 15 }, golden_axe: { type: 'tool', toolType: 'axe', tier: 3, power: 25 }, diamond_axe: { type: 'tool', toolType: 'axe', tier: 4, power: 30 },
            leather_helmet: { type: 'armor', tier: 0, armorValue: 1 }, leather_chestplate: { type: 'armor', tier: 0, armorValue: 3 }, leather_leggings: { type: 'armor', tier: 0, armorValue: 2 }, leather_boots: { type: 'armor', tier: 0, armorValue: 1 },
            iron_helmet: { type: 'armor', tier: 1, armorValue: 2 }, iron_chestplate: { type: 'armor', tier: 1, armorValue: 6 }, iron_leggings: { type: 'armor', tier: 1, armorValue: 5 }, iron_boots: { type: 'armor', tier: 1, armorValue: 2 },
            golden_helmet: { type: 'armor', tier: 2, armorValue: 2 }, golden_chestplate: { type: 'armor', tier: 2, armorValue: 5 }, golden_leggings: { type: 'armor', tier: 2, armorValue: 3 }, golden_boots: { type: 'armor', tier: 2, armorValue: 1 },
            diamond_helmet: { type: 'armor', tier: 3, armorValue: 3 }, diamond_chestplate: { type: 'armor', tier: 3, armorValue: 8 }, diamond_leggings: { type: 'armor', tier: 3, armorValue: 6 }, diamond_boots: { type: 'armor', tier: 3, armorValue: 3 },
            iron_ingot: { type: 'item' }, gold_ingot: { type: 'item' }, coal: { type: 'item', fuelValue: 80 }, diamond: { type: 'item' },
            raw_porkchop: { type: 'food', hungerRestore: 6 }, cooked_porkchop: { type: 'food', hungerRestore: 12 }, raw_beef: { type: 'food', hungerRestore: 6 }, cooked_beef: { type: 'food', hungerRestore: 12 }, leather: { type: 'item' }, rotten_flesh: { type: 'food', hungerRestore: 4 },
            flint_and_steel: { type: 'item' }, ender_pearl: { type: 'item' }, blaze_powder: { type: 'item' }, ender_eye: { type: 'item' },
            blaze_rod: { type: 'item' }, bow: { type: 'tool', toolType: 'bow', tier: 1, power: 8 }, arrow: { type: 'item' },
            stick: { type: 'item' }, string: { type: 'item' }, flint: { type: 'item' },
            torch: { type: 'block', hardness: 0.0, tool: 'none', tier: 0 }, bed: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 },
            bed_head: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 }, bed_foot: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 },
            chest: { type: 'block', hardness: 2.5, tool: 'none', tier: 0 },
            door_top: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 },
            door_bottom: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 },
            door_top_open: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 },
            door_bottom_open: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 },
            door: { type: 'item' }
        };

        const blockTypes = ['grass', 'swamp_grass', 'dirt', 'stone', 'bedrock', 'log', 'leaves', 'swamp_leaves', 'tall_grass', 'sand', 'planks', 'glass', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'obsidian', 'nether_portal', 'netherrack', 'magma', 'nether_bricks', 'spawner', 'end_stone', 'end_portal_frame_empty', 'end_portal_frame_filled', 'end_portal', 'stone_brick', 'return_portal', 'water', 'lava', 'crafting_table', 'furnace', 'end_rod', 'torch', 'bed', 'bed_head', 'bed_foot', 'chest', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'snow', 'ice', 'cactus', 'lily_pad'];
        const itemTypes = ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'gold_pickaxe', 'diamond_pickaxe', 'wooden_sword', 'stone_sword', 'iron_sword', 'golden_sword', 'diamond_sword', 'wooden_axe', 'stone_axe', 'iron_axe', 'golden_axe', 'diamond_axe', 'leather_helmet', 'leather_chestplate', 'leather_leggings', 'leather_boots', 'iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots', 'golden_helmet', 'golden_chestplate', 'golden_leggings', 'golden_boots', 'diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots', 'iron_ingot', 'gold_ingot', 'coal', 'diamond', 'raw_porkchop', 'cooked_porkchop', 'raw_beef', 'cooked_beef', 'leather', 'rotten_flesh', 'flint_and_steel', 'ender_pearl', 'blaze_powder', 'ender_eye', 'blaze_rod', 'bow', 'arrow', 'stick', 'string', 'flint', 'door'];
        const allItemTypes = [...blockTypes, ...itemTypes];
        const inventoryItemTypes = allItemTypes.filter(t => !['bed_head', 'bed_foot', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open'].includes(t));

        const maxBlocksPerType = {}; blockTypes.forEach(t => maxBlocksPerType[t] = 2000);
        maxBlocksPerType.stone = 20000; maxBlocksPerType.netherrack = 20000; maxBlocksPerType.end_stone = 15000; maxBlocksPerType.water = 25000; maxBlocksPerType.lava = 25000; maxBlocksPerType.torch = 1000; maxBlocksPerType.bed = 100; maxBlocksPerType.bed_head = 100; maxBlocksPerType.bed_foot = 100;
        maxBlocksPerType.nether_bricks = 5000; maxBlocksPerType.spawner = 500;
        maxBlocksPerType.sand = 5000; maxBlocksPerType.snow = 3000; maxBlocksPerType.ice = 3000;

        // ==========================================