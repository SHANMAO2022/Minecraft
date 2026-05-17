        // ==========================================
        window.shadowsEnabled = localStorage.getItem('mc_shadows_enabled') === 'true';
        // 材质替换黑科技：如果启用了超强光影，自动将 MeshLambertMaterial 升级为具有物理反射的 MeshStandardMaterial！
        const OriginalMeshLambertMaterial = THREE.MeshLambertMaterial;
        THREE.MeshLambertMaterial = function(parameters) {
            if (window.shadowsEnabled) {
                const isWater = parameters && (parameters.color === 0x3f76e4 || (parameters.map && parameters.map.uiIcon && parameters.map.uiIcon.includes('water')));
                const isLava = parameters && (parameters.opacity === 0.9 && parameters.transparent && !parameters.alphaTest);
                const standardParams = {
                    ...parameters,
                    roughness: isWater ? 0.1 : (isLava ? 0.05 : 0.8),
                    metalness: isWater ? 0.9 : (isLava ? 0.9 : 0.1)
                };
                if (isWater) {
                    standardParams.color = new THREE.Color(0x1a4f8f); // 更加深邃清澈的反射蓝色
                    standardParams.opacity = 0.65;
                }
                const mat = new THREE.MeshStandardMaterial(standardParams);
                mat.isMeshLambertMaterial = true; // 欺骗外部代码
                return mat;
            } else {
                return new OriginalMeshLambertMaterial(parameters);
            }
        };
        THREE.MeshLambertMaterial.prototype = Object.create(THREE.Material.prototype);
        
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
        // 遍历所有区块，触发水重绘 (或者只是等待下一次更新)
        // (对于深度写入和透明度，修改 material 已经足够，会自动应用 to 所有水网格)
        const btn = document.getElementById('btn-toggle-water');
        if (btn) btn.innerText = `水面画质: ${val === 1 ? '高' : '低'}`;
    };
    
    window.shadowsEnabled = localStorage.getItem('mc_shadows_enabled') === 'true';
    window.updateShadows = function(val) {
        window.shadowsEnabled = val;
        localStorage.setItem('mc_shadows_enabled', val ? 'true' : 'false');
        window.shadowToggleChanged = true;
        
        if (typeof directionalLight !== 'undefined' && directionalLight) {
            directionalLight.castShadow = val;
        }
        
        // 遍历更新所有区块 Mesh 的阴影属性
        if (typeof chunks !== 'undefined' && chunks) {
            chunks.forEach(chunk => {
                for (let type in chunk.meshes) {
                    const mesh = chunk.meshes[type];
                    const isWaterOrGlass = type === 'water' || type === 'glass' || type.startsWith('water');
                    mesh.castShadow = !isWaterOrGlass && val;
                    mesh.receiveShadow = val;
                }
            });
        }
        
        if (typeof scene !== 'undefined' && scene) {
            scene.traverse(node => {
                if (node.isMesh) {
                    const isWaterOrGlass = node.material && (node.material.opacity < 0.9 && node.material.transparent);
                    node.castShadow = !isWaterOrGlass && val;
                    node.receiveShadow = val;
                }
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(m => m.needsUpdate = true);
                    } else {
                        node.material.needsUpdate = true;
                    }
                }
            });
        }
        
        const btn = document.getElementById('btn-toggle-shadows');
        if (btn) btn.innerText = `超强光影: ${val ? '开' : '关'}`;
    };
    window.currentFurnacePos = null;
    window.isTouchControlsEnabled = localStorage.getItem('mc_touch_controls') === 'true';
    window.updateTouchControls = function(val) {
        window.isTouchControlsEnabled = val;
        localStorage.setItem('mc_touch_controls', val);
        const touchUI = document.getElementById('touch-ui');
        if (touchUI) {
            // 只有在开启且当前未打开菜单时显示（或者由 lock/unlock 逻辑接管）
            if (!val) touchUI.style.display = 'none';
            else if (typeof controls !== 'undefined' && (controls.isLocked || window.isTouchControlsEnabled)) {
                // 如果在游戏中，根据是否开启触屏来切换
                // 注意：真正的显示/隐藏现在由 input.js 里的 lock/unlock 劫持逻辑控制
            }
        }
        const btn = document.getElementById('btn-toggle-touch');
        if (btn) btn.innerText = `触屏控制: ${val ? '开' : '关'}`;
        const btnCloseInv = document.getElementById('btn-close-inventory');
        if (btnCloseInv) {
            btnCloseInv.style.display = val ? 'block' : 'none';
        }
        
        // 如果开启触屏，可能需要调整某些 UI 深度或交互
        if (val) {
            document.body.classList.add('touch-enabled');
        } else {
            document.body.classList.remove('touch-enabled');
        }
    };
    // ==========================================

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

            // 保存到本地（备用）
            localStorage.setItem(key, JSON.stringify(optimizedData));
            
            // 保存到服务器
            try {
                const host = window.location.hostname || 'localhost';
                await fetch(`http://${host}:8000/api/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: filename + '.json', content: optimizedData })
                });
                console.log(`存档已同步至服务器: ${filename}`);
            } catch (e) {
                console.warn("无法同步到服务器，已保存在本地", e);
            }

            return { status: 'success' };
        } catch (e) {
            console.error("Save failed:", e);
            if (e.name === 'QuotaExceededError') alert("存档失败：浏览器空间已满，请导出并清理旧存档！");
            return { status: 'error', message: e.message };
        }
    };

    window.loadFromFile = async function(filename) {
        try {
            let data = null;
            // 优先从服务器读取
            try {
                const host = window.location.hostname || 'localhost';
                const res = await fetch(`http://${host}:8000/api/load?filename=${filename}.json`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'success') data = json.content;
                }
            } catch (e) { }

            // 服务器加载失败则读取本地
            if (!data) {
                const key = 'mc_sv3_' + filename;
                const raw = localStorage.getItem(key);
                if (raw) data = JSON.parse(raw);
            }
            
            if (!data) return null;
            
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
        const files = new Set();
        try {
            const host = window.location.hostname || 'localhost';
            const res = await fetch(`http://${host}:8000/api/list`);
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success') {
                    json.files.forEach(f => {
                        if (f !== 'accounts.json') files.add(f.replace('.json', ''));
                    });
                }
            }
        } catch (e) { }

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('mc_sv3_')) {
                files.add(key.replace('mc_sv3_', ''));
            }
        }
        return Array.from(files);
    };

    window.deleteSave = async function(filename) {
        localStorage.removeItem('mc_sv3_' + filename);
        try {
            const host = window.location.hostname || 'localhost';
            await fetch(`http://${host}:8000/api/delete?filename=${filename}.json`);
        } catch (e) { }
        return { status: 'success' };
    };

window.isLeftMouseDown = false;
window.addEventListener('mousedown', (e) => { if (e.button === 0) window.isLeftMouseDown = true; });
window.addEventListener('mouseup', (e) => { if (e.button === 0) window.isLeftMouseDown = false; });
window.addEventListener('blur', () => { window.isLeftMouseDown = false; });

window.creativeBreakTimer = 0;
