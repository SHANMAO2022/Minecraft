        // ==========================================
        let selectedFilename = null; let pendingCreateMode = 1;

        const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

        function updateWorldCreateLoading(done, total, label, loadedKeys, centerCx, centerCz) {
            const overlay = document.getElementById('world-create-loading');
            const fill = document.getElementById('world-create-progress-fill');
            const status = document.getElementById('world-create-status');
            const canvas = document.getElementById('world-create-map');
            if (overlay) overlay.style.display = 'flex';
            const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
            if (fill) fill.style.width = pct + '%';
            if (status) status.textContent = `${label} ${pct}%`;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#1b1b1b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const view = 3;
            const cell = Math.floor(canvas.width / (view * 2 + 1));
            for (let dz = -view; dz <= view; dz++) {
                for (let dx = -view; dx <= view; dx++) {
                    const x = (dx + view) * cell;
                    const y = (dz + view) * cell;
                    const key = `${centerCx + dx},${centerCz + dz}`;
                    ctx.fillStyle = loadedKeys && loadedKeys.has(key) ? '#69a13a' : '#3a2d20';
                    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
                    if (dx === 0 && dz === 0) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(x + Math.floor(cell / 2) - 1, y + Math.floor(cell / 2) - 1, 3, 3);
                    }
                }
            }
        }

        async function preloadCreateWorldChunks(centerX, centerZ) {
            if (typeof generateChunk !== 'function') return;
            const centerCx = Math.floor(centerX / chunkSize);
            const centerCz = Math.floor(centerZ / chunkSize);
            const view = 3;
            const queue = [];
            for (let dx = -view; dx <= view; dx++) {
                for (let dz = -view; dz <= view; dz++) {
                    queue.push({ cx: centerCx + dx, cz: centerCz + dz, distSq: dx * dx + dz * dz });
                }
            }
            queue.sort((a, b) => a.distSq - b.distSq);
            const loaded = new Set();
            updateWorldCreateLoading(0, queue.length, '生成地形...', loaded, centerCx, centerCz);
            await waitFrame();
            for (let i = 0; i < queue.length; i++) {
                const q = queue[i];
                const key = `${q.cx},${q.cz}`;
                if (!chunks.has(key)) generateChunk(q.cx, q.cz);
                loaded.add(key);
                updateWorldCreateLoading(i + 1, queue.length, '生成地形...', loaded, centerCx, centerCz);
                await waitFrame();
            }
            if (window.meshRebuildQueue && window.meshRebuildQueue.size > 0 && typeof rebuildChunkMesh === 'function') {
                const rebuilds = Array.from(window.meshRebuildQueue);
                for (let i = 0; i < rebuilds.length; i++) {
                    window.meshRebuildQueue.delete(rebuilds[i]);
                    rebuildChunkMesh(rebuilds[i]);
                    updateWorldCreateLoading(i + 1, rebuilds.length, '整理区块...', loaded, centerCx, centerCz);
                    await waitFrame();
                }
            }
        }

        async function renderWorldList() {
            const listContainer = document.getElementById('world-list-container');
            const files = await window.listSaves();
            listContainer.innerHTML = '';
            const playButton = document.getElementById('btn-play-world');
            const deleteButton = document.getElementById('btn-delete-world');
            const exportButton = document.getElementById('btn-export-world');
            const updateSelectionButtons = () => {
                const method = selectedFilename ? 'remove' : 'add';
                playButton.classList[method]('disabled');
                deleteButton.classList[method]('disabled');
                exportButton.classList[method]('disabled');
            };
            
            if (files && files.length > 0) {
                const worlds = [];
                for (const filename of files) {
                    const data = await window.loadFromFile(filename);
                    if (data && data.player) {
                        worlds.push({ filename, data });
                    }
                }
                // 按日期排序
                worlds.sort((a, b) => new Date(b.data.metadata?.date || 0) - new Date(a.data.metadata?.date || 0));

                for (const { filename, data } of worlds) {
                    const worldTitle = data.metadata?.name || filename.replace('.json', '');
                    const gMode = data.player.mode === 1 ? '生存模式' : '创造模式';
                    const dateStr = data.metadata?.date || '未知日期';
                    
                    const item = document.createElement('div');
                    item.className = 'world-item' + (selectedFilename === filename ? ' selected' : '');
                    const icon = document.createElement('div');
                    icon.className = 'world-icon';
                    icon.style.backgroundImage = `url('${icons['grass']}')`;
                    const info = document.createElement('div');
                    info.className = 'world-info';
                    const title = document.createElement('div');
                    title.className = 'world-title';
                    title.textContent = worldTitle;
                    const date = document.createElement('div');
                    date.textContent = `上次运行: ${dateStr}`;
                    const meta = document.createElement('div');
                    meta.textContent = `${gMode}, 种子: ${data.seed || '未知'}`;
                    info.appendChild(title);
                    info.appendChild(date);
                    info.appendChild(meta);
                    item.appendChild(icon);
                    item.appendChild(info);
                    item.onclick = () => {
                        selectedFilename = filename;
                        listContainer.querySelectorAll('.world-item').forEach(worldItem => {
                            worldItem.classList.toggle('selected', worldItem === item);
                        });
                        updateSelectionButtons();
                    };
                    listContainer.appendChild(item);
                }
                if (!worlds.some(world => world.filename === selectedFilename)) selectedFilename = null;
                updateSelectionButtons();
            } else {
                listContainer.innerHTML = `<div style="padding: 20px; color: #777; text-align: center; font-size: 16px;">(目前没有可用的存档)</div>`;
                selectedFilename = null;
                updateSelectionButtons();
            }
        }

        async function startNewGame(customSeed = null, customMode = 1, worldName = '新的世界') {
            updateWorldCreateLoading(0, 1, '准备世界...', new Set(), 0, 0);
            // 规范化文件名，移除特殊字符
            const safeName = worldName.replace(/[\\/:*?"<>|]/g, '_');
            window.currentWorldName = safeName;
            window.update100Enabled = true;
            window.spawnedVillageVillagers = {};
            
            window.modifiedBlocks = { overworld: {}, nether: {}, end: {} };
            window.chestInventories = {}; 
            window.furnaceStates = {};
            window.achievementsProgress = {}; // 新增：重置成就进度
            
            const dims = ['overworld', 'nether', 'end'];
            dims.forEach(d => {
                dimensionState[d].chunks.forEach(c => {
                    if (typeof window.clearChunkTorchLights === 'function') window.clearChunkTorchLights(c);
                    for (const t in c.meshes) {
                        scene.remove(c.meshes[t]);
                        c.meshes[t].dispose();
                    }
                });
                dimensionState[d].chunks.clear();
                dimensionState[d].worldBlocks.clear();
                dimensionState[d].entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); });
                dimensionState[d].entities.length = 0;
                dimensionState[d].playerPos = null;
            });
            particles.forEach(p => scene.remove(p.mesh)); 
            particles.length = 0;
            
            if (customSeed !== null && customSeed !== "") { 
                if (!isNaN(Number(customSeed))) window.mcSeed = Number(customSeed); 
                else window.mcSeed = Array.from(customSeed).reduce((acc, char) => acc + char.charCodeAt(0), 0); 
            } else { 
                window.mcSeed = Math.random(); 
            }
            initNoise();
            
            currentHealth = 20; currentHunger = 20; gameMode = customMode; isDead = false; playerInvulnTimer = 5.0;
            window.currentXP = 0; window.currentLevel = 0; window.worldTime = (typeof DAY_LENGTH === 'number' ? DAY_LENGTH * 0.5 : 150);
            invState.hotbar = new Array(9).fill(null);
            if (gameMode === 1) {
                invState.hotbar[0] = { type: 'obsidian', count: 10 };
                invState.hotbar[1] = { type: 'bed', count: 1 };
            }
            invState.main = new Array(27).fill(null); invState.crafting = new Array(9).fill(null); invState.armor = new Array(4).fill(null); invState.output = null; invState.dragged = null;
            updateStatusUI();
            if (gameMode === 0) {
                const creativeFillTypes = inventoryItemTypes;
                for (let i = 0; i < creativeFillTypes.length && i < invState.main.length; i++) invState.main[i] = { type: creativeFillTypes[i], count: 64 };
                document.getElementById('gamemode-display').innerText = '模式: 创造 [双击空格飞行]';
            }
            else { document.getElementById('gamemode-display').innerText = '模式: 生存 [按 T 输入指令]'; }
            
            currentDimension = 'overworld';
            chunks = dimensionState.overworld.chunks;
            worldBlocks = dimensionState.overworld.worldBlocks;
            entities = dimensionState.overworld.entities;
            window.spawnedVillageVillagers = {};
            window.villageDeferredSpawnPlans = {};
            window._shownVillageEggMsg = false;
            renderInventoryUI();
            const spawn = (typeof window.getUpdate100SpawnPos === 'function') ? window.getUpdate100SpawnPos() : null;
            if (spawn) camera.position.set(spawn.x, spawn.y, spawn.z);
            else camera.position.set(0, 100, 0);
            lastChunkX = -999; lastChunkZ = -999; spawnPoint = null;
            await preloadCreateWorldChunks(camera.position.x, camera.position.z);
            updateChunks();
            gameStartTime = 0;
            isPlaying = true; uiLayer.style.display = 'none'; createWorldScreen.style.display = 'none'; worldSelectScreen.style.display = 'none'; controls.lock();
            const createOverlay = document.getElementById('world-create-loading');
            if (createOverlay) createOverlay.style.display = 'none';
            
            await saveGame();
        }

        async function loadGame(filename) {
            const data = await window.loadFromFile(filename);
            if (data) {
                window.currentWorldName = filename;
                const p = data.player;
                currentHealth = p.hp; currentHunger = p.hunger; gameMode = p.mode;
                window.currentXP = p.xp || 0; window.currentLevel = p.level || 0;
                window.worldTime = (p.worldTime ?? (typeof DAY_LENGTH === 'number' ? DAY_LENGTH * 0.5 : 150));
                invState.hotbar = p.inv.hotbar || new Array(9).fill(null);
                invState.main = (p.inv.main || new Array(27).fill(null)).slice(0, 27);
                while (invState.main.length < 27) invState.main.push(null);
                invState.armor = p.inv.armor || new Array(4).fill(null);
                
                window.modifiedBlocks = data.mods || { overworld: {}, nether: {}, end: {} };
                window.chestInventories = data.chests || {};
                window.furnaceStates = data.furnaces || {};
                window.achievementsProgress = data.achievements || {}; // 新增：读取成就进度
                window.update100Enabled = true;
                window.spawnedVillageVillagers = {};
                window.villageDeferredSpawnPlans = {};
                window._shownVillageEggMsg = false;
                
                const dims = ['overworld', 'nether', 'end'];
                dims.forEach(d => {
                    dimensionState[d].chunks.forEach(c => {
                        if (typeof window.clearChunkTorchLights === 'function') window.clearChunkTorchLights(c);
                        for (const t in c.meshes) {
                            scene.remove(c.meshes[t]);
                            c.meshes[t].dispose();
                        }
                    });
                    dimensionState[d].chunks.clear();
                    dimensionState[d].worldBlocks.clear();
                    dimensionState[d].entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); });
                    dimensionState[d].entities.length = 0;
                    dimensionState[d].playerPos = null;
                });

                if (data.seed !== undefined) {
                    window.mcSeed = data.seed;
                    initNoise();
                }
                
                updateStatusUI(); renderInventoryUI(); currentDimension = p.dim; switchDimension(p.dim);
                camera.position.set(p.x, p.y, p.z); dimensionState[currentDimension].playerPos = camera.position.clone();
                lastChunkX = -999; spawnPoint = null; updateChunks(); gameStartTime = 0; isPlaying = true; uiLayer.style.display = 'none'; worldSelectScreen.style.display = 'none'; controls.lock();
            }
        }

        async function saveGame() {
            if (!window.currentWorldName) return;
            const worldData = {
                metadata: {
                    name: window.currentWorldName,
                    date: new Date().toLocaleString('zh-CN')
                },
                seed: window.mcSeed,
                mods: window.modifiedBlocks,
                chests: window.chestInventories,
                furnaces: window.furnaceStates,
                achievements: window.achievementsProgress || {}, // 新增：保存成就进度
                update100: true,
                player: {
                    x: camera.position.x, y: camera.position.y, z: camera.position.z,
                    dim: currentDimension, hp: currentHealth, hunger: currentHunger,
                    mode: gameMode, xp: window.currentXP, level: window.currentLevel,
                    worldTime: window.worldTime,
                    inv: { hotbar: invState.hotbar, main: invState.main, armor: invState.armor }
                }
            };
            await window.saveToFile(window.currentWorldName, worldData);
        }

        async function exportWorld(filename) {
            const data = await window.loadFromFile(filename);
            if (!data) return alert("导出失败：找不到存档数据");
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename + '.sv3';
            a.click();
            URL.revokeObjectURL(url);
        }

        async function importWorld(file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // 兼容性检测
                    if (!data.player && !data.p) throw new Error("无效的存档文件格式");
                    
                    const name = data.metadata?.name || data.meta?.name || file.name.replace('.sv3', '');
                    
                    // 如果是旧格式，saveToFile 内部会处理压缩，但我们需要结构正确
                    const normalizedData = (data.v === 3) ? await (async () => {
                        // 如果已经是 v3 格式，直接存 key
                        localStorage.setItem('mc_sv3_' + name, e.target.result);
                        return null; // 标记已处理
                    })() : data;

                    if (normalizedData !== null) {
                        await window.saveToFile(name, normalizedData);
                    }
                    
                    alert("导入成功！");
                    await renderWorldList();
                } catch (err) {
                    alert("导入失败：" + err.message);
                }
            };
            reader.readAsText(file);
        }

        // ==========================================
