        // ==========================================
        window.invState = { hotbar: new Array(9).fill(null), main: new Array(27).fill(null), crafting: new Array(9).fill(null), furnace: new Array(2).fill(null), armor: new Array(4).fill(null), output: null, dragged: null, chest: null };
        window.chestInventories = {};
        const invState = window.invState;
        let currentSlotIndex = 0; let isInventoryOpen = false; invState.hotbar[0] = { type: 'obsidian', count: 10 };
        let furnaceSmeltTime = 0; let furnaceBurnTime = 0; let furnaceMaxBurnTime = 0;

        const hotbarEl = document.getElementById('hotbar'); const inventoryGridEl = document.getElementById('inventory-grid'); const draggedIconEl = document.getElementById('dragged-icon'); const handItemEl = document.getElementById('hand-item');
        const creativeToggleBtn = document.getElementById('creative-toggle-btn');
        let isCreativeTabOpen = false;

        creativeToggleBtn.onclick = () => {
            isCreativeTabOpen = !isCreativeTabOpen;
            renderInventoryUI();
        };

        function setupNormalInventory() {
            inventoryGridEl.innerHTML = '';
            for (let row = 0; row < 3; row++) {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'inv-row';
                for (let col = 0; col < 9; col++) {
                    const i = row * 9 + col;
                    const slot = document.createElement('div');
                    slot.className = 'slot';
                    slot.setAttribute('data-container', 'main');
                    slot.setAttribute('data-index', i);
                    rowDiv.appendChild(slot);
                }
                inventoryGridEl.appendChild(rowDiv);
            }
        }
        setupNormalInventory();
        for (let i = 0; i < 9; i++) { const slot = document.createElement('div'); slot.className = 'slot'; slot.id = `hotbar-${i}`; slot.setAttribute('data-container', 'hotbar'); slot.setAttribute('data-index', i); slot.setAttribute('data-key', i + 1); hotbarEl.appendChild(slot); }

        function renderSlotEl(el, item) { if (item && item.count > 0) { el.style.backgroundImage = `url(${icons[item.type]})`; el.setAttribute('data-count', item.count); } else { el.style.backgroundImage = 'none'; el.removeAttribute('data-count'); } }
        function updateHeldItem3D() { heldItemGroup.clear(); const activeItem = invState.hotbar[currentSlotIndex]; if (!activeItem || activeItem.count <= 0) return; const type = activeItem.type; if (ITEMS[type] && ITEMS[type].type === 'block') { const mesh = new THREE.Mesh(blockGeometry, materials[type]); mesh.scale.set(0.3, 0.3, 0.3); mesh.rotation.set(Math.PI / 8, -Math.PI / 4, 0); heldItemGroup.add(mesh); } else { const data = itemPixels[type]; if (!data) return; let count = 0; for (let i = 0; i < 256; i++) { if (data[i * 4 + 3] > 0) count++; } const voxelGeo = new THREE.BoxGeometry(1 / 16, 1 / 16, 1 / 16); const instMesh = new THREE.InstancedMesh(voxelGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), count); const dummy = new THREE.Object3D(); const color = new THREE.Color(); let idx = 0; for (let i = 0; i < 256; i++) { if (data[i * 4 + 3] > 0) { dummy.position.set(((i % 16) - 7.5) / 16, (7.5 - Math.floor(i / 16)) / 16, 0); dummy.updateMatrix(); instMesh.setMatrixAt(idx, dummy.matrix); color.setRGB(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255); instMesh.setColorAt(idx, color); idx++; } } instMesh.rotation.set(0, Math.PI, 0); if (ITEMS[type] && ITEMS[type].type === 'tool') { instMesh.scale.set(0.6, 0.6, 0.6); instMesh.rotation.z = -Math.PI / 4; } else { instMesh.scale.set(0.4, 0.4, 0.4); } heldItemGroup.add(instMesh); } }

        document.addEventListener('mousemove', (e) => {
            if (isInventoryOpen && invState.dragged) { draggedIconEl.style.left = e.clientX + 'px'; draggedIconEl.style.top = e.clientY + 'px'; }
            if (tooltipEl.style.display === 'block') { tooltipEl.style.left = e.clientX + 15 + 'px'; tooltipEl.style.top = e.clientY + 15 + 'px'; }
        });

        document.addEventListener('mouseover', (e) => {
            const slot = e.target.closest('.slot');
            if (slot && isInventoryOpen && slot.id !== 'dragged-icon') {
                const c = slot.getAttribute('data-container');
                const i = parseInt(slot.getAttribute('data-index'));
                let item = null;
                if (c === 'hotbar') item = invState.hotbar[i];
                else if (c === 'main') item = invState.main[i];
                else if (c === 'crafting') item = invState.crafting[i];
                else if (c === 'furnace') item = invState.furnace[i];
                else if (c === 'armor') item = invState.armor[i];
                else if (c === 'chest') item = invState.chest[i];
                else if (c === 'output') item = invState.output;
                if (item) { tooltipEl.innerText = ITEM_NAMES[item.type] || item.type; tooltipEl.style.display = 'block'; }
            }
        });

        document.addEventListener('mouseout', (e) => { if (e.target.closest('.slot')) tooltipEl.style.display = 'none'; });

        window.renderInventoryUI = function() {
            if (creativeToggleBtn) {
                creativeToggleBtn.style.display = (gameMode === 0) ? 'block' : 'none';
                creativeToggleBtn.classList.toggle('active', isCreativeTabOpen);
            }
            inventoryGridEl.classList.toggle('creative-view', isCreativeTabOpen);

            if (isCreativeTabOpen) {
                inventoryGridEl.innerHTML = '';
                allItemTypes.forEach(type => {
                    const slot = document.createElement('div');
                    slot.className = 'slot';
                    slot.style.backgroundImage = `url(${icons[type]})`;
                    slot.title = ITEM_NAMES[type] || type;
                    slot.onclick = () => {
                        if (invState.dragged && invState.dragged.type === type) {
                            invState.dragged.count = Math.min(64, invState.dragged.count + 64);
                        } else {
                            invState.dragged = { type: type, count: 64 };
                        }
                        renderInventoryUI();
                    };
                    inventoryGridEl.appendChild(slot);
                });
            } else {
                if (inventoryGridEl.children.length === 0 || inventoryGridEl.querySelector('.slot[data-container="main"]') === null) {
                    setupNormalInventory();
                }
                for (let i = 0; i < 27; i++) { const el = document.querySelector(`[data-container="main"][data-index="${i}"]`); if (el) renderSlotEl(el, invState.main[i]); }
            }

            const gridEl = document.getElementById('crafting-grid'); 
            const craftingBox = document.getElementById('crafting-box');
            const furnaceBox = document.getElementById('furnace-box');
            
            if (craftingMode === 4) {
                craftingBox.style.display = 'none';
                furnaceBox.style.display = 'flex';
                document.getElementById('chest-box').style.display = 'none';
                document.getElementById('crafting-title').innerText = "熔炉";
            } else if (craftingMode === 5) {
                craftingBox.style.display = 'none';
                furnaceBox.style.display = 'none';
                document.getElementById('chest-box').style.display = 'flex';
                document.getElementById('crafting-title').innerText = "箱子";
                
                const chestGrid = document.getElementById('chest-grid');
                chestGrid.innerHTML = '';
                const items = invState.chest;
                if (items) {
                    items.forEach((item, i) => {
                        const slot = document.createElement('div');
                        slot.className = 'slot';
                        slot.setAttribute('data-container', 'chest');
                        slot.setAttribute('data-index', i);
                        renderSlotEl(slot, item);
                        chestGrid.appendChild(slot);
                    });
                }
            } else {
                craftingBox.style.display = 'block';
                furnaceBox.style.display = 'none';
                document.getElementById('chest-box').style.display = 'none';
                document.getElementById('crafting-title').innerText = craftingMode === 2 ? "合成 (2x2)" : "高级合成 (3x3)";
                if (craftingMode === 2) { gridEl.className = 'crafting-grid size-2'; for (let i = 0; i < 9; i++) { const el = document.querySelector(`[data-container="crafting"][data-index="${i}"]`); if (el) el.style.display = i < 4 ? 'block' : 'none'; } }
                else { gridEl.className = 'crafting-grid size-3'; for (let i = 0; i < 9; i++) { const el = document.querySelector(`[data-container="crafting"][data-index="${i}"]`); if (el) el.style.display = 'block'; } }
            }

            for (let i = 0; i < 9; i++) { const el = document.querySelector(`[data-container="hotbar"][data-index="${i}"]`); renderSlotEl(el, invState.hotbar[i]); if (i === currentSlotIndex) el.classList.add('active'); else el.classList.remove('active'); }
            for (let i = 0; i < 9; i++) { const el = document.querySelector(`[data-container="crafting"][data-index="${i}"]`); if (el) renderSlotEl(el, invState.crafting[i]); }
            for (let i = 0; i < 2; i++) { const el = document.querySelector(`[data-container="furnace"][data-index="${i}"]`); if (el) renderSlotEl(el, invState.furnace[i]); }
            for (let i = 0; i < 4; i++) { 
                const el = document.querySelector(`[data-container="armor"][data-index="${i}"]`); 
                if (el) renderSlotEl(el, invState.armor[i]); 
            }
            
            // 更新人物 2D 预览 (Canvas 绘制)
            const canvas = document.getElementById('player-preview-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const skinSrc = localStorage.getItem('mc_playerSkin') || 'textures/steve.png';
                const skinImg = new Image();
                skinImg.src = skinSrc;
                skinImg.onload = () => {
                    ctx.imageSmoothingEnabled = false;
                    // 头部 (正面: 8,8, 8,8)
                    ctx.drawImage(skinImg, 8, 8, 8, 8, 22, 5, 16, 16);
                    // 身体 (正面: 20,20, 8,12)
                    ctx.drawImage(skinImg, 20, 20, 8, 12, 22, 21, 16, 24);
                    // 左臂 (正面: 44,20, 4,12)
                    ctx.drawImage(skinImg, 44, 20, 4, 12, 14, 21, 8, 24);
                    // 右臂 (正面: 36,52, 4,12) - 简单适配
                    ctx.drawImage(skinImg, 44, 20, 4, 12, 38, 21, 8, 24);
                    // 左腿 (正面: 4,20, 4,12)
                    ctx.drawImage(skinImg, 4, 20, 4, 12, 22, 45, 8, 24);
                    // 右腿 (正面: 20,52, 4,12) - 简单适配
                    ctx.drawImage(skinImg, 4, 20, 4, 12, 30, 45, 8, 24);
                    
                    // 盔甲叠加 (半透明色块示意)
                    invState.armor.forEach((item, idx) => {
                        if (item) {
                            ctx.fillStyle = item.type.includes('diamond') ? 'rgba(0,255,255,0.4)' : 
                                           item.type.includes('iron') ? 'rgba(200,200,200,0.4)' :
                                           item.type.includes('golden') ? 'rgba(255,215,0,0.4)' : 'rgba(139,69,19,0.4)';
                            if (idx === 0) ctx.fillRect(20, 3, 20, 18); // 头
                            if (idx === 1) ctx.fillRect(14, 21, 32, 24); // 胸
                            if (idx === 2) ctx.fillRect(22, 45, 16, 20); // 腿
                            if (idx === 3) ctx.fillRect(22, 65, 16, 10); // 脚
                        }
                    });
                };
            }

            const outputEl = document.querySelector(`[data-container="output"][data-index="0"]`); if (outputEl) renderSlotEl(outputEl, invState.output);
            if (invState.dragged) { draggedIconEl.style.display = 'block'; renderSlotEl(draggedIconEl, invState.dragged); } else { draggedIconEl.style.display = 'none'; } updateHeldItem3D();
        };
        function renderInventoryUI() { window.renderInventoryUI(); }

        function getCraftingPattern() {
            let minX = 3, maxX = -1, minY = 3, maxY = -1;
            for (let i = 0; i < 9; i++) { if (craftingMode === 2 && i > 3) continue; if (invState.crafting[i]) { let x, y; if (craftingMode === 2) { x = i % 2; y = Math.floor(i / 2); } else { x = i % 3; y = Math.floor(i / 3); } if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
            if (minX > maxX) return ""; let pattern = "";
            for (let y = minY; y <= maxY; y++) { for (let x = minX; x <= maxX; x++) { let type = "null"; if (craftingMode === 2) { let targetI = y * 2 + x; if (targetI < 4 && invState.crafting[targetI]) type = invState.crafting[targetI].type; } else { let targetI = y * 3 + x; if (invState.crafting[targetI]) type = invState.crafting[targetI].type; } pattern += type + ","; } pattern += ";"; } return pattern;
        }

        function checkCrafting() {
            if (craftingMode !== 2 && craftingMode !== 3) return;
            const c = invState.crafting; const t = (i) => c[i] ? c[i].type : null; let total = 0; let counts = {};
            for (let i = 0; i < 9; i++) { if (t(i)) { total++; counts[t(i)] = (counts[t(i)] || 0) + 1; } }
            invState.output = null; if (total === 0) return;
            if (total === 1 && counts['log']) invState.output = { type: 'planks', count: 4 }; 
            else if (total === 1 && counts['blaze_rod']) invState.output = { type: 'blaze_powder', count: 2 }; 
            else if (total === 2 && counts['ender_pearl'] && counts['blaze_powder']) invState.output = { type: 'ender_eye', count: 1 }; 
            else if (total === 2 && counts['iron_ingot'] && counts['flint']) invState.output = { type: 'flint_and_steel', count: 1 };
            else {
                const p = getCraftingPattern();
                if (p === "planks,;planks,;") invState.output = { type: 'stick', count: 4 }; 
                else if (p === "planks,planks,;planks,planks,;") invState.output = { type: 'crafting_table', count: 1 }; 
                else if (p === "stone,stone,stone,;stone,null,stone,;stone,stone,stone,;") invState.output = { type: 'furnace', count: 1 };
                else if (p === "flint,;stick,;") invState.output = {type: 'arrow', count: 4};
                else if (p === "coal,;stick,;") invState.output = { type: 'torch', count: 4 };
                else if (p === "string,string,string,;planks,planks,planks,;") invState.output = { type: 'bed', count: 1 };
                else if (p === "planks,planks,planks,;planks,null,planks,;planks,planks,planks,;") invState.output = { type: 'chest', count: 1 };
                else if (p === "planks,planks,;planks,planks,;planks,planks,;") invState.output = { type: 'door', count: 3 };
                
                if (craftingMode === 3) {
                    if (p === "planks,planks,planks,;null,stick,null,;null,stick,null,;") invState.output = { type: 'wooden_pickaxe', count: 1 }; 
                    else if (p === "stone,stone,stone,;null,stick,null,;null,stick,null,;") invState.output = { type: 'stone_pickaxe', count: 1 }; 
                    else if (p === "iron_ingot,iron_ingot,iron_ingot,;null,stick,null,;null,stick,null,;") invState.output = { type: 'iron_pickaxe', count: 1 }; 
                    else if (p === "gold_ingot,gold_ingot,gold_ingot,;null,stick,null,;null,stick,null,;") invState.output = { type: 'gold_pickaxe', count: 1 }; 
                    else if (p === "diamond,diamond,diamond,;null,stick,null,;null,stick,null,;") invState.output = { type: 'diamond_pickaxe', count: 1 };
                    else if (p === "string,stick,null,;string,null,stick,;string,stick,null,;" || p === "null,stick,string,;stick,null,string,;null,stick,string,;") invState.output = {type: 'bow', count: 1};

                    // 盔甲合成配方
                    const materials = ["leather", "iron_ingot", "gold_ingot", "diamond"];
                    const materialPrefixes = ["leather", "iron", "golden", "diamond"];
                    materials.forEach((mat, idx) => {
                        const prefix = materialPrefixes[idx];
                        // 头盔
                        if (p === `${mat},${mat},${mat},;${mat},null,${mat},;`) invState.output = { type: `${prefix}_helmet`, count: 1 };
                        // 胸甲
                        if (p === `${mat},null,${mat},;${mat},${mat},${mat},;${mat},${mat},${mat},;`) invState.output = { type: `${prefix}_chestplate`, count: 1 };
                        // 护腿
                        if (p === `${mat},${mat},${mat},;${mat},null,${mat},;${mat},null,${mat},;`) invState.output = { type: `${prefix}_leggings`, count: 1 };
                        // 靴子
                        if (p === `${mat},null,${mat},;${mat},null,${mat},;`) invState.output = { type: `${prefix}_boots`, count: 1 };
                    });
                }
            }
        }

        function handleSlotClick(container, index, button) {
            let targetSlot = null; 
            if (container === 'chest') targetSlot = invState.chest[index];
            else if (container !== 'output') targetSlot = invState[container][index];
            if (button === 2) {
                if (container === 'output') return;
                if (invState.dragged) { if (!targetSlot) { invState[container][index] = { ...invState.dragged, count: 1 }; invState.dragged.count--; if (invState.dragged.count <= 0) invState.dragged = null; } else if (targetSlot.type === invState.dragged.type && targetSlot.count < 64) { targetSlot.count++; invState.dragged.count--; if (invState.dragged.count <= 0) invState.dragged = null; } }
                else if (targetSlot) { let half = Math.ceil(targetSlot.count / 2); invState.dragged = { ...targetSlot, count: half }; targetSlot.count -= half; if (targetSlot.count <= 0) invState[container][index] = null; }
            } else {
                if (container === 'output') { 
                    if (invState.output && (!invState.dragged || (invState.dragged.type === invState.output.type && invState.dragged.count + invState.output.count <= 64))) { 
                        if (window.awardAchievement) {
                            const outType = invState.output.type;
                            if (outType === 'crafting_table') window.awardAchievement('benchmarking');
                            else if (outType === 'furnace') window.awardAchievement('hot_topic');
                            else if (outType === 'stone_pickaxe') window.awardAchievement('upgrade_pickaxe');
                            else if (outType === 'iron_ingot') window.awardAchievement('acquire_iron');
                        }
                        if (!invState.dragged) invState.dragged = { ...invState.output }; 
                        else invState.dragged.count += invState.output.count; 
                        
                        if (craftingMode === 4) {
                            // 熔炉输出
                            if (currentFurnacePos && furnaceStates[currentFurnacePos]) {
                                furnaceStates[currentFurnacePos].output = null;
                                invState.output = null;
                            }
                        } else {
                            // 合成台输出
                            for (let i = 0; i < 9; i++) { if (invState.crafting[i]) { invState.crafting[i].count--; if (invState.crafting[i].count <= 0) invState.crafting[i] = null; } } 
                        }
                    } 
                }
                else { if (invState.dragged && targetSlot) { if (invState.dragged.type === targetSlot.type && targetSlot.count < 64) { let moveAmount = Math.min(64 - targetSlot.count, invState.dragged.count); targetSlot.count += moveAmount; invState.dragged.count -= moveAmount; if (invState.dragged.count <= 0) invState.dragged = null; } else { if (container === 'chest') { invState.chest[index] = invState.dragged; invState.dragged = targetSlot; } else { invState[container][index] = invState.dragged; invState.dragged = targetSlot; } } } else if (invState.dragged && !targetSlot) { 
                    // 只有 armor 类型的物品可以放入 armor 槽位
                    if (container === 'armor' && (!ITEMS[invState.dragged.type] || ITEMS[invState.dragged.type].type !== 'armor')) return;
                    if (container === 'chest') invState.chest[index] = invState.dragged;
                    else invState[container][index] = invState.dragged; 
                    invState.dragged = null; 
                } else if (!invState.dragged && targetSlot) { 
                    if (container === 'chest') invState.chest[index] = null;
                    else invState[container][index] = null; 
                    invState.dragged = targetSlot; 
                } }
            }
            if (container === 'crafting' || container === 'output' || container === 'furnace' || container === 'armor' || container === 'chest') {
                checkCrafting();
                if (typeof updateStatusUI === 'function') updateStatusUI();
                if ((container === 'chest' || container === 'furnace' || container === 'output') && window.syncContainerState) {
                    window.syncContainerState();
                }
            }
            renderInventoryUI();
        }

        window.addBlockToInventory = function(type, count = 1) {
            for (let i = 0; i < 9; i++) { if (invState.hotbar[i] && invState.hotbar[i].type === type) { invState.hotbar[i].count += count; return true; } }
            for (let i = 0; i < 9; i++) { if (!invState.hotbar[i]) { invState.hotbar[i] = { type: type, count: count }; return true; } }
            for (let i = 0; i < 27; i++) { if (invState.main[i] && invState.main[i].type === type) { invState.main[i].count += count; return true; } }
            for (let i = 0; i < 27; i++) { if (!invState.main[i]) { invState.main[i] = { type: type, count: count }; return true; } }
            return false;
        };
        function addBlockToInventory(type, count) { return window.addBlockToInventory(type, count); }

        // ==========================================