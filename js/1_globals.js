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

        let isPlaying = false;

        // ==========================================