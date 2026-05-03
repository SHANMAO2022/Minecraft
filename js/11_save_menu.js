        // ==========================================
        let isWorldSelected = false; let pendingCreateMode = 1;

        function renderWorldList() {
            const listContainer = document.getElementById('world-list-container'); const pStr = localStorage.getItem('mc_player');
            if (pStr) {
                const p = JSON.parse(pStr); const gMode = p.mode === 1 ? '生存模式' : '创造模式'; const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                listContainer.innerHTML = `<div class="world-item selected" id="save-item"><div class="world-icon" style="background-image: url('${icons['grass']}')"></div><div class="world-info"><div class="world-title">新的世界</div><div>新的世界 (1) (${dateStr})</div><div>${gMode}, 版本: 26.2 Snapshot 3</div></div></div>`;
                isWorldSelected = true; document.getElementById('btn-play-world').classList.remove('disabled'); document.getElementById('btn-delete-world').classList.remove('disabled');
            } else { listContainer.innerHTML = `<div style="padding: 20px; color: #777; text-align: center; font-size: 16px;">(目前没有可用的存档)</div>`; isWorldSelected = false; document.getElementById('btn-play-world').classList.add('disabled'); document.getElementById('btn-delete-world').classList.add('disabled'); }
        }

        function startNewGame(customSeed = null, customMode = 1) {
            localStorage.removeItem('mc_player'); localStorage.removeItem('mc_mods'); localStorage.removeItem('mc_seed');
            chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t]))); chunks.clear(); worldBlocks.clear();
            entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); }); entities.length = 0; particles.forEach(p => scene.remove(p.mesh)); particles.length = 0;
            if (customSeed !== null && customSeed !== "") { if (!isNaN(Number(customSeed))) mcSeed = Number(customSeed); else mcSeed = Array.from(customSeed).reduce((acc, char) => acc + char.charCodeAt(0), 0); } else { mcSeed = Math.random(); }
            localStorage.setItem('mc_seed', mcSeed); initNoise();
            modifiedBlocks = { overworld: {}, nether: {}, end: {} }; currentHealth = 20; currentHunger = 20; gameMode = customMode; isDead = false; playerInvulnTimer = 5.0;
            invState.hotbar = new Array(9).fill(null);
            if (gameMode === 1) {
                invState.hotbar[0] = { type: 'obsidian', count: 10 };
                invState.hotbar[1] = { type: 'bed', count: 1 };
            }
            invState.main = new Array(45).fill(null); invState.crafting = new Array(9).fill(null); invState.output = null; invState.dragged = null;
            updateStatusUI();
            if (gameMode === 0) { for (let i = 0; i < allItemTypes.length && i < 45; i++) invState.main[i] = { type: allItemTypes[i], count: 64 }; document.getElementById('gamemode-display').innerText = '模式: 创造 [双击空格飞行]'; }
            else { document.getElementById('gamemode-display').innerText = '模式: 生存 [按 T 输入指令]'; }
            renderInventoryUI(); currentDimension = 'overworld'; camera.position.set(0, 100, 0); lastChunkX = -999; spawnPoint = null; updateChunks();
            isPlaying = true; uiLayer.style.display = 'none'; createWorldScreen.style.display = 'none'; worldSelectScreen.style.display = 'none'; controls.lock();
        }

        function loadGame() {
            const pStr = localStorage.getItem('mc_player');
            if (pStr) {
                const p = JSON.parse(pStr); currentHealth = p.hp; currentHunger = p.hunger; gameMode = p.mode;
                invState.hotbar = p.inv.hotbar; invState.main = p.inv.main;
                modifiedBlocks = JSON.parse(localStorage.getItem('mc_mods')) || { overworld: {}, nether: {}, end: {} };
                dimensionState.overworld.chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t]))); dimensionState.nether.chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t]))); dimensionState.end.chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t])));
                dimensionState.overworld.chunks.clear(); dimensionState.nether.chunks.clear(); dimensionState.end.chunks.clear();
                updateStatusUI(); renderInventoryUI(); currentDimension = p.dim; switchDimension(p.dim);
                camera.position.set(p.x, p.y, p.z); dimensionState[currentDimension].playerPos = camera.position.clone();
                lastChunkX = -999; spawnPoint = null; updateChunks(); isPlaying = true; uiLayer.style.display = 'none'; worldSelectScreen.style.display = 'none'; controls.lock();
            }
        }

        function saveGame() { localStorage.setItem('mc_mods', JSON.stringify(modifiedBlocks)); const playerState = { x: camera.position.x, y: camera.position.y, z: camera.position.z, dim: currentDimension, hp: currentHealth, hunger: currentHunger, mode: gameMode, inv: { hotbar: invState.hotbar, main: invState.main } }; localStorage.setItem('mc_player', JSON.stringify(playerState)); }

        // ==========================================