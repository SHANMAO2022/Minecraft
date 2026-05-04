        // ==========================================
        const ITEM_NAMES = {
            grass: "草方块", dirt: "泥土", sand: "沙子", leaves: "树叶", tall_grass: "高草丛", log: "橡木原木", planks: "橡木木板", stone: "石头", coal_ore: "煤矿石", iron_ore: "铁矿石", gold_ore: "金矿石", diamond_ore: "钻石矿石", bedrock: "基岩", water: "水", lava: "熔岩", crafting_table: "工作台", furnace: "熔炉", end_rod: "末地烛", obsidian: "黑曜石", nether_portal: "下界传送门", netherrack: "下界岩", magma: "岩浆块", end_stone: "末地石", end_portal_frame_empty: "末地传送门框架", end_portal_frame_filled: "激活的传送门框架", end_portal: "末地传送门", stone_brick: "石砖", return_portal: "返回传送门", 
            wooden_pickaxe: "木镐", stone_pickaxe: "石镐", iron_pickaxe: "铁镐", gold_pickaxe: "金镐", diamond_pickaxe: "钻石镐", 
            iron_ingot: "铁锭", gold_ingot: "金锭", coal: "煤炭", diamond: "钻石",
            raw_porkchop: "生猪排", rotten_flesh: "腐肉", flint_and_steel: "打火石", ender_pearl: "末影珍珠", blaze_powder: "烈焰粉", ender_eye: "末影之眼", blaze_rod: "烈焰棒", bow: "弓", arrow: "箭", stick: "木棍", string: "线", flint: "燧石", torch: "火把", bed: "床", bed_head: "床头", bed_foot: "床尾"
        };

        const ITEMS = {
            grass: { type: 'block', hardness: 0.6, tool: 'none', tier: 0 }, dirt: { type: 'block', hardness: 0.5, tool: 'none', tier: 0 },
            sand: { type: 'block', hardness: 0.5, tool: 'none', tier: 0 }, leaves: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 },
            tall_grass: { type: 'block', hardness: 0.05, tool: 'none', tier: 0 }, log: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 },
            planks: { type: 'block', hardness: 2.0, tool: 'none', tier: 0 }, stone: { type: 'block', hardness: 5.0, tool: 'pickaxe', tier: 1 },
            coal_ore: { type: 'block', hardness: 6.0, tool: 'pickaxe', tier: 1 }, iron_ore: { type: 'block', hardness: 8.0, tool: 'pickaxe', tier: 2 },
            gold_ore: { type: 'block', hardness: 10.0, tool: 'pickaxe', tier: 3 }, diamond_ore: { type: 'block', hardness: 12.0, tool: 'pickaxe', tier: 3 },
            bedrock: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 }, water: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 }, lava: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            crafting_table: { type: 'block', hardness: 2.5, tool: 'none', tier: 0 }, furnace: { type: 'block', hardness: 3.5, tool: 'pickaxe', tier: 1 },
            end_rod: { type: 'block', hardness: 0.1, tool: 'none', tier: 0 },
            obsidian: { type: 'block', hardness: 50.0, tool: 'pickaxe', tier: 3 }, nether_portal: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            netherrack: { type: 'block', hardness: 0.4, tool: 'pickaxe', tier: 1 }, magma: { type: 'block', hardness: 0.5, tool: 'pickaxe', tier: 1 },
            end_stone: { type: 'block', hardness: 3.0, tool: 'pickaxe', tier: 1 }, end_portal_frame_empty: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            end_portal_frame_filled: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 }, end_portal: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            stone_brick: { type: 'block', hardness: 2.5, tool: 'pickaxe', tier: 1 }, return_portal: { type: 'block', hardness: Infinity, tool: 'none', tier: 0 },
            
            wooden_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 1, power: 4 }, stone_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 2, power: 8 },
            iron_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 3, power: 15 }, gold_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 3, power: 25 },
            diamond_pickaxe: { type: 'tool', toolType: 'pickaxe', tier: 4, power: 30 },

            iron_ingot: { type: 'item' }, gold_ingot: { type: 'item' }, coal: { type: 'item', fuelValue: 80 }, diamond: { type: 'item' },
            raw_porkchop: { type: 'food', hungerRestore: 6 }, rotten_flesh: { type: 'food', hungerRestore: 4 },
            flint_and_steel: { type: 'item' }, ender_pearl: { type: 'item' }, blaze_powder: { type: 'item' }, ender_eye: { type: 'item' },
            blaze_rod: { type: 'item' }, bow: { type: 'tool', toolType: 'bow', tier: 1, power: 8 }, arrow: { type: 'item' },
            stick: { type: 'item' }, string: { type: 'item' }, flint: { type: 'item' },
            torch: { type: 'block', hardness: 0.0, tool: 'none', tier: 0 }, bed: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 },
            bed_head: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 }, bed_foot: { type: 'block', hardness: 0.2, tool: 'none', tier: 0 }
        };

        const blockTypes = ['grass', 'dirt', 'stone', 'bedrock', 'log', 'leaves', 'tall_grass', 'sand', 'planks', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'obsidian', 'nether_portal', 'netherrack', 'magma', 'end_stone', 'end_portal_frame_empty', 'end_portal_frame_filled', 'end_portal', 'stone_brick', 'return_portal', 'water', 'lava', 'crafting_table', 'furnace', 'end_rod', 'torch', 'bed', 'bed_head', 'bed_foot'];
        const itemTypes = ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'gold_pickaxe', 'diamond_pickaxe', 'iron_ingot', 'gold_ingot', 'coal', 'diamond', 'raw_porkchop', 'rotten_flesh', 'flint_and_steel', 'ender_pearl', 'blaze_powder', 'ender_eye', 'blaze_rod', 'bow', 'arrow', 'stick', 'string', 'flint'];
        const allItemTypes = [...blockTypes, ...itemTypes];

        const maxBlocksPerType = {}; blockTypes.forEach(t => maxBlocksPerType[t] = 2000);
        maxBlocksPerType.stone = 20000; maxBlocksPerType.netherrack = 20000; maxBlocksPerType.end_stone = 15000; maxBlocksPerType.water = 25000; maxBlocksPerType.lava = 25000; maxBlocksPerType.torch = 1000; maxBlocksPerType.bed = 100; maxBlocksPerType.bed_head = 100; maxBlocksPerType.bed_foot = 100;

        // ==========================================