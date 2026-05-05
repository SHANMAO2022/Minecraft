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
    window.currentFurnacePos = null;
    // ==========================================

    window.saveToFile = async function(filename, content) {
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
        try {
            const response = await fetch('/api/list');
            if (response.ok) {
                const data = await response.json();
                return data.files;
            }
        } catch (e) { console.error("List failed:", e); }
        return [];
    };