        // ==========================================
        let selectedFilename = null; let pendingCreateMode = 1;

        async function renderWorldList() {
            const listContainer = document.getElementById('world-list-container');
            const files = await window.listSaves();
            listContainer.innerHTML = '';
            
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
                    item.innerHTML = `
                        <div class="world-icon" style="background-image: url('${icons['grass']}')"></div>
                        <div class="world-info">
                            <div class="world-title">${worldTitle}</div>
                            <div>上次运行: ${dateStr}</div>
                            <div>${gMode}, 种子: ${data.seed || '未知'}</div>
                        </div>
                    `;
                    item.onclick = () => {
                        selectedFilename = filename;
                        renderWorldList();
                        document.getElementById('btn-play-world').classList.remove('disabled');
                        document.getElementById('btn-delete-world').classList.remove('disabled');
                        document.getElementById('btn-export-world').classList.remove('disabled');
                    };
                    listContainer.appendChild(item);
                }
            } else {
                listContainer.innerHTML = `<div style="padding: 20px; color: #777; text-align: center; font-size: 16px;">(目前没有可用的存档)</div>`;
                document.getElementById('btn-play-world').classList.add('disabled');
                document.getElementById('btn-delete-world').classList.add('disabled');
                document.getElementById('btn-export-world').classList.add('disabled');
            }
        }

        function startNewGame(customSeed = null, customMode = 1, worldName = '新的世界') {
            // 规范化文件名，移除特殊字符
            const safeName = worldName.replace(/[\\/:*?"<>|]/g, '_');
            window.currentWorldName = safeName;
            
            window.modifiedBlocks = { overworld: {}, nether: {}, end: {} };
            window.chestInventories = {}; 
            window.furnaceStates = {};
            window.achievementsProgress = {}; // 新增：重置成就进度
            
            chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t]))); 
            chunks.clear(); 
            worldBlocks.clear();
            entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); }); 
            entities.length = 0; 
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
            window.currentXP = 0; window.currentLevel = 0; window.worldTime = 0;
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
            
            saveGame();
        }

        async function loadGame(filename) {
            const data = await window.loadFromFile(filename);
            if (data) {
                window.currentWorldName = filename;
                const p = data.player;
                currentHealth = p.hp; currentHunger = p.hunger; gameMode = p.mode;
                window.currentXP = p.xp || 0; window.currentLevel = p.level || 0;
                window.worldTime = p.worldTime || 0;
                invState.hotbar = p.inv.hotbar; invState.main = p.inv.main; invState.armor = p.inv.armor || new Array(4).fill(null);
                
                window.modifiedBlocks = data.mods || { overworld: {}, nether: {}, end: {} };
                window.chestInventories = data.chests || {};
                window.furnaceStates = data.furnaces || {};
                window.achievementsProgress = data.achievements || {}; // 新增：读取成就进度
                
                const dims = ['overworld', 'nether', 'end'];
                dims.forEach(d => {
                    dimensionState[d].chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t])));
                    dimensionState[d].chunks.clear();
                    dimensionState[d].worldBlocks.clear();
                });

                if (data.seed !== undefined) {
                    window.mcSeed = data.seed;
                    initNoise();
                }
                
                updateStatusUI(); renderInventoryUI(); currentDimension = p.dim; switchDimension(p.dim);
                camera.position.set(p.x, p.y, p.z); dimensionState[currentDimension].playerPos = camera.position.clone();
                lastChunkX = -999; spawnPoint = null; updateChunks(); isPlaying = true; uiLayer.style.display = 'none'; worldSelectScreen.style.display = 'none'; controls.lock();
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