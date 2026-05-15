        // ==========================================
        let mcSeed = parseFloat(localStorage.getItem('mc_seed'));
        if (isNaN(mcSeed)) { mcSeed = Math.random(); localStorage.setItem('mc_seed', mcSeed); }
        let currentSeed = mcSeed;
        let noise2D, noise3D;
        function initNoise() {
            currentSeed = mcSeed;
            function seededRandom() { let x = Math.sin(currentSeed++) * 10000; return x - Math.floor(x); }
            noise2D = createNoise2D(seededRandom);
            noise3D = createNoise3D(seededRandom);
        }
        initNoise();

        let modifiedBlocks = JSON.parse(localStorage.getItem('mc_mods')) || { overworld: {}, nether: {}, end: {} };

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

    // 智能环境检测：如果是直接打开文件(file://)或使用无需Python的绿色启动器(8001端口)，则使用本地存储
    window.isLocalFile = (window.location.protocol === 'file:' || window.location.port === '8001');

    window.saveToFile = async function(filename, content) {
        if (window.isLocalFile) {
            localStorage.setItem('mc_file_' + filename, JSON.stringify(content));
            return { status: 'success' };
        }
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, content })
            });
            return await response.json();
        } catch (e) { console.error("Save failed:", e); }
    };

    window.loadFromFile = async function(filename) {
        if (window.isLocalFile) {
            const data = localStorage.getItem('mc_file_' + filename);
            return data ? JSON.parse(data) : null;
        }
        try {
            const response = await fetch('/api/load?filename=' + filename);
            if (response.ok) {
                const data = await response.json();
                return data.content;
            }
        } catch (e) { console.error("Load failed:", e); }
        return null;
    };

    window.listSaves = async function() {
        if (window.isLocalFile) {
            const files = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('mc_file_')) {
                    files.push(key.replace('mc_file_', ''));
                }
            }
            return files;
        }
        try {
            const response = await fetch('/api/list');
            if (response.ok) {
                const data = await response.json();
                return data.files;
            }
        } catch (e) { console.error("List failed:", e); }
        return [];
    };

    window.deleteSave = async function(filename) {
        if (window.isLocalFile) {
            localStorage.removeItem('mc_file_' + filename);
            return { status: 'success' };
        }
        try {
            const response = await fetch('/api/delete?filename=' + filename);
            return await response.json();
        } catch (e) { console.error("Delete failed:", e); }
    };