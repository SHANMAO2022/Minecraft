        // ==========================================
        let isWorldSelected = false; let pendingCreateMode = 1;

        async function renderWorldList() {
            const listContainer = document.getElementById('world-list-container');
            const files = await window.listSaves();
            if (files && files.includes('world.json')) {
                const p = await window.loadFromFile('world.json');
                if (p && p.player) {
                    const gMode = p.player.mode === 1 ? '生存模式' : '创造模式';
                    const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                    listContainer.innerHTML = `<div class="world-item selected" id="save-item"><div class="world-icon" style="background-image: url('${icons['grass']}')"></div><div class="world-info"><div class="world-title">我的世界 (文件存档)</div><div>新的世界 (1) (${dateStr})</div><div>${gMode}, 版本: 26.2 Snapshot 3</div></div></div>`;
                    isWorldSelected = true; document.getElementById('btn-play-world').classList.remove('disabled'); document.getElementById('btn-delete-world').classList.remove('disabled');
                    return;
                }
            }
            listContainer.innerHTML = `<div style="padding: 20px; color: #777; text-align: center; font-size: 16px;">(目前没有可用的存档)</div>`; isWorldSelected = false; document.getElementById('btn-play-world').classList.add('disabled'); document.getElementById('btn-delete-world').classList.add('disabled');
        }

        function startNewGame(customSeed = null, customMode = 1) {
            localStorage.removeItem('mc_player'); localStorage.removeItem('mc_mods'); localStorage.removeItem('mc_seed'); localStorage.removeItem('mc_chests');
            chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t]))); chunks.clear(); worldBlocks.clear();
            window.chestInventories = {};
            entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); }); entities.length = 0; particles.forEach(p => scene.remove(p.mesh)); particles.length = 0;
            if (customSeed !== null && customSeed !== "") { if (!isNaN(Number(customSeed))) mcSeed = Number(customSeed); else mcSeed = Array.from(customSeed).reduce((acc, char) => acc + char.charCodeAt(0), 0); } else { mcSeed = Math.random(); }
            localStorage.setItem('mc_seed', mcSeed); initNoise();
            currentHealth = 20; currentHunger = 20; gameMode = customMode; isDead = false; playerInvulnTimer = 5.0;
            window.currentXP = 0; window.currentLevel = 0;
            invState.hotbar = new Array(9).fill(null);
            if (gameMode === 1) {
                invState.hotbar[0] = { type: 'obsidian', count: 10 };
                invState.hotbar[1] = { type: 'bed', count: 1 };
            }
            invState.main = new Array(45).fill(null); invState.crafting = new Array(9).fill(null); invState.armor = new Array(4).fill(null); invState.output = null; invState.dragged = null;
            updateStatusUI();
            if (gameMode === 0) { for (let i = 0; i < inventoryItemTypes.length && i < 45; i++) invState.main[i] = { type: inventoryItemTypes[i], count: 64 }; document.getElementById('gamemode-display').innerText = '模式: 创造 [双击空格飞行]'; }
            else { document.getElementById('gamemode-display').innerText = '模式: 生存 [按 T 输入指令]'; }
            renderInventoryUI(); currentDimension = 'overworld'; camera.position.set(0, 100, 0); lastChunkX = -999; spawnPoint = null; updateChunks();
            isPlaying = true; uiLayer.style.display = 'none'; createWorldScreen.style.display = 'none'; worldSelectScreen.style.display = 'none'; controls.lock();
        }

        async function loadGame() {
            const data = await window.loadFromFile('world.json');
            if (data) {
                const p = data.player;
                currentHealth = p.hp; currentHunger = p.hunger; gameMode = p.mode;
                window.currentXP = p.xp || 0; window.currentLevel = p.level || 0;
                window.worldTime = p.worldTime || 0;
                invState.hotbar = p.inv.hotbar; invState.main = p.inv.main; invState.armor = p.inv.armor || new Array(4).fill(null);
                
                modifiedBlocks = data.mods || { overworld: {}, nether: {}, end: {} };
                window.chestInventories = data.chests || {};
                window.furnaceStates = data.furnaces || {};
                
                dimensionState.overworld.chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t])));
                dimensionState.overworld.chunks.clear();
                updateStatusUI(); renderInventoryUI(); currentDimension = p.dim; switchDimension(p.dim);
                camera.position.set(p.x, p.y, p.z); dimensionState[currentDimension].playerPos = camera.position.clone();
                lastChunkX = -999; spawnPoint = null; updateChunks(); isPlaying = true; uiLayer.style.display = 'none'; worldSelectScreen.style.display = 'none'; controls.lock();
            }
        }

        async function saveGame() {
            const worldData = {
                mods: modifiedBlocks,
                chests: window.chestInventories,
                furnaces: window.furnaceStates,
                player: {
                    x: camera.position.x, y: camera.position.y, z: camera.position.z,
                    dim: currentDimension, hp: currentHealth, hunger: currentHunger,
                    mode: gameMode, xp: window.currentXP, level: window.currentLevel,
                    worldTime: window.worldTime,
                    inv: { hotbar: invState.hotbar, main: invState.main, armor: invState.armor }
                }
            };
            await window.saveToFile('world.json', worldData);
        }

        // ==========================================