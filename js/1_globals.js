        // ==========================================
        window.currentWorldName = '';
        window.mcSeed = parseFloat(localStorage.getItem('mc_seed'));
        if (isNaN(window.mcSeed)) { window.mcSeed = Math.random(); localStorage.setItem('mc_seed', window.mcSeed); }
        let currentSeed = window.mcSeed;
        let noise2D, noise3D, biomeNoise;
        function initNoise() {
            currentSeed = window.mcSeed;
            function seededRandom() { let x = Math.sin(currentSeed++) * 10000; return x - Math.floor(x); }
            noise2D = createNoise2D(seededRandom);
            noise3D = createNoise3D(seededRandom);
            biomeNoise = createNoise2D(() => { let x = Math.sin(window.mcSeed + 0.123) * 10000; return x - Math.floor(x); });
        }
        initNoise();

        window.getBiome = (gx, gz) => {
            if (currentDimension !== 'overworld') return { name: currentDimension === 'nether' ? '下界' : '末地' };
            const bv = (biomeNoise(gx * 0.005, gz * 0.005) + 1) / 2;
            if (bv < 0.1) return { name: '海洋', hMult: 0.5, hBase: -10, top: 'sand', sub: 'sand' };
            if (bv < 0.2) return { name: '冰川', hMult: 0.8, hBase: 2, top: 'snow', sub: 'ice' };
            if (bv < 0.35) return { name: '沙漠', hMult: 0.6, hBase: 1, top: 'sand', sub: 'sand' };
            if (bv < 0.45) return { name: '河流', hMult: 0.3, hBase: -3, top: 'dirt', sub: 'dirt' };
            if (bv < 0.55) return { name: '沼泽', hMult: 0.4, hBase: -1, top: 'swamp_grass', sub: 'dirt' };
            if (bv < 0.8) return { name: '平原', hMult: 0.8, hBase: 0, top: 'grass', sub: 'dirt' };
            if (bv < 0.95) return { name: '树林', hMult: 1.2, hBase: 2, top: 'grass', sub: 'dirt' };
            return { name: '高山', hMult: 2.5, hBase: 10, top: 'stone', sub: 'stone' };
        };

        window.modifiedBlocks = { overworld: {}, nether: {}, end: {} };

        const chunkSize = 16;
        let playerInvulnTimer = 0; let gameStartTime = 0; let isSpawnImmunity = true; let highestY = 20; let isFalling = false;
        let actionType = ''; let actionTimer = 0; let hungerTimer = 0; let healTimer = 0; let starveTimer = 0; let isGameClear = false; let winScroller = null;
        let jumpPressed = false; let shiftPressed = false; let gameMode = 1; let isFlying = false; let isChatOpen = false; let lastSpacePress = 0; let craftingMode = 2;

    window.isPlaying = false;
    window.currentXP = 0; window.currentLevel = 0;
    window.worldTime = 0;

    window.furnaceStates = {};
    window.dimensionState = { overworld: { chunks: new Map(), worldBlocks: new Set(), entities: [] }, nether: { chunks: new Map(), worldBlocks: new Set(), entities: [] }, end: { chunks: new Map(), worldBlocks: new Set(), entities: [] } };
    window.waterQuality = 0; // 0: Low, 1: High
    window.updateWaterQuality = function(val) {
        window.waterQuality = val;
        if (typeof materials !== 'undefined' && materials.water) {
            materials.water.depthWrite = (val === 1);
            materials.water.opacity = (val === 1) ? 0.8 : 0.6;
            materials.water.needsUpdate = true;
        }
        // 遍历所有区块，切换水的几何体以实现无缝重叠
        if (typeof chunks !== 'undefined' && typeof typeGeometries !== 'undefined') {
            const newGeo = (val === 1) ? typeGeometries.water_high : typeGeometries.water_low;
            chunks.forEach(chunk => {
                if (chunk.meshes && chunk.meshes.water) {
                    chunk.meshes.water.geometry = newGeo;
                }
            });
        }
        const btn = document.getElementById('btn-toggle-water');
        if (btn) btn.innerText = `水面画质: ${val === 1 ? '高' : '低'}`;
    };
    window.currentFurnacePos = null;
    // ==========================================

    // 极简存档系统：仅记录种子、修改的方块坐标和玩家信息，大幅减少存储占用
    window.saveToFile = async function(filename, content) {
        try {
            if (!filename) return { status: 'error', message: '文件名不能为空' };
            const key = 'mc_sv3_' + filename;
            
            // 数据压缩：将方块名称转换为数字 ID
            const compressedMods = { o: {}, n: {}, e: {} };
            const dimMap = { overworld: 'o', nether: 'n', end: 'e' };
            
            for (let dim in content.mods) {
                const targetDim = dimMap[dim];
                for (let pos in content.mods[dim]) {
                    const type = content.mods[dim][pos];
                    if (type === 'null') {
                        compressedMods[targetDim][pos] = -1; // -1 代表空气/破坏
                    } else {
                        const id = blockTypes.indexOf(type);
                        if (id !== -1) compressedMods[targetDim][pos] = id;
                    }
                }
            }

            const optimizedData = {
                v: 3, // 版本号
                s: content.seed,
                m: compressedMods,
                p: content.player,
                c: content.chests,
                f: content.furnaces,
                meta: content.metadata
            };

            localStorage.setItem(key, JSON.stringify(optimizedData));
            console.log(`存档成功: ${filename} (压缩后尺寸: ${Math.round(JSON.stringify(optimizedData).length / 1024)} KB)`);
            return { status: 'success' };
        } catch (e) {
            console.error("Save failed:", e);
            if (e.name === 'QuotaExceededError') alert("存档失败：浏览器空间已满，请导出并清理旧存档！");
            return { status: 'error', message: e.message };
        }
    };

    window.loadFromFile = async function(filename) {
        try {
            const key = 'mc_sv3_' + filename;
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const data = JSON.parse(raw);
            
            // 如果是旧版本或未压缩数据，直接返回
            if (data.v !== 3) return data;

            // 数据解压：将数字 ID 转回方块名称
            const decompressedMods = { overworld: {}, nether: {}, end: {} };
            const dimMap = { o: 'overworld', n: 'nether', e: 'end' };
            
            for (let dimKey in data.m) {
                const targetDim = dimMap[dimKey];
                for (let pos in data.m[dimKey]) {
                    const id = data.m[dimKey][pos];
                    if (id === -1) {
                        decompressedMods[targetDim][pos] = 'null';
                    } else {
                        decompressedMods[targetDim][pos] = blockTypes[id];
                    }
                }
            }

            return {
                seed: data.s,
                mods: decompressedMods,
                player: data.p,
                chests: data.c,
                furnaces: data.f,
                metadata: data.meta
            };
        } catch (e) {
            console.error("Load failed:", e);
            return null;
        }
    };

    window.listSaves = async function() {
        const files = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('mc_sv3_')) {
                files.push(key.replace('mc_sv3_', ''));
            }
        }
        return files;
    };

    window.deleteSave = async function(filename) {
        localStorage.removeItem('mc_sv3_' + filename);
        return { status: 'success' };
    };

window.isLeftMouseDown = false;
window.addEventListener('mousedown', (e) => { if (e.button === 0) window.isLeftMouseDown = true; });
window.addEventListener('mouseup', (e) => { if (e.button === 0) window.isLeftMouseDown = false; });
window.addEventListener('blur', () => { window.isLeftMouseDown = false; });

window.creativeBreakTimer = 0;
