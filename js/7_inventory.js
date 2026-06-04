        // ==========================================
        window.invState = { hotbar: new Array(9).fill(null), main: new Array(27).fill(null), crafting: new Array(9).fill(null), furnace: new Array(2).fill(null), armor: new Array(4).fill(null), output: null, dragged: null, chest: null };
        window.chestInventories = {};
        const invState = window.invState;
        let currentSlotIndex = 0; let isInventoryOpen = false; invState.hotbar[0] = { type: 'obsidian', count: 10 };
        let furnaceSmeltTime = 0; let furnaceBurnTime = 0; let furnaceMaxBurnTime = 0;

        const hotbarEl = document.getElementById('hotbar'); const inventoryGridEl = document.getElementById('inventory-grid'); const draggedIconEl = document.getElementById('dragged-icon'); const handItemEl = document.getElementById('hand-item');
        const creativeToggleBtn = document.getElementById('creative-toggle-btn');
        const netherPortalToggleBtn = document.getElementById('nether-portal-toggle-btn');
        let isCreativeTabOpen = false;
        let isNetherPortalTabOpen = false;

        if (creativeToggleBtn) {
            creativeToggleBtn.onclick = () => {
                isCreativeTabOpen = !isCreativeTabOpen;
                if (isCreativeTabOpen) isNetherPortalTabOpen = false;
                renderInventoryUI();
            };
        }

        if (netherPortalToggleBtn) {
            netherPortalToggleBtn.onclick = () => {
                isNetherPortalTabOpen = !isNetherPortalTabOpen;
                if (isNetherPortalTabOpen) isCreativeTabOpen = false;
                renderInventoryUI();
            };
        }

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

        function isBlockedUpdate100Item(type) {
            return !!(window.isUpdate100ContentType && !window.update100Enabled && window.isUpdate100ContentType(type));
        }
        function renderSlotEl(el, item) {
            if (item && item.count > 0) {
                const iconUrl = isBlockedUpdate100Item(item.type) ? (window.RESERVED6_ICON || icons[item.type]) : icons[item.type];
                el.style.backgroundImage = `url(${iconUrl})`;
                el.setAttribute('data-count', item.count);
            } else {
                el.style.backgroundImage = 'none';
                el.removeAttribute('data-count');
            }
        }
        function getItemTooltip(item) {
            if (!item) return '';
            const def = ITEMS[item.type];
            const lines = [ITEM_NAMES[item.type] || item.type];
            if (def && def.damage) lines.push(`伤害: ${def.damage}点`);
            return lines.join('\n');
        }
        const tradeUiEl = document.getElementById('trade-ui');
        const tradeCostSlotEl = document.getElementById('trade-cost-slot');
        const tradeResultSlotEl = document.getElementById('trade-result-slot');
        const tradePlayerInvEl = document.getElementById('trade-player-inv');
        window.isTradeOpen = false;

        function purgeUpdate100FromInventory() {
            if (window.update100Enabled || !window.isUpdate100ContentType) return;
            const containers = [invState.hotbar, invState.main, invState.crafting, invState.furnace, invState.armor, invState.chest];
            containers.forEach(arr => {
                if (!arr) return;
                for (let i = 0; i < arr.length; i++) {
                    const it = arr[i];
                    if (it && window.isUpdate100ContentType(it.type)) arr[i] = null;
                }
            });
            if (invState.output && window.isUpdate100ContentType(invState.output.type)) invState.output = null;
            if (invState.dragged && window.isUpdate100ContentType(invState.dragged.type)) invState.dragged = null;
        }
        window.purgeUpdate100FromInventory = purgeUpdate100FromInventory;
        function takeItemFromInventory(type, count) {
            let remaining = count;
            const containers = [invState.hotbar, invState.main];
            for (const container of containers) {
                for (let i = 0; i < container.length && remaining > 0; i++) {
                    const item = container[i];
                    if (!item || item.type !== type) continue;
                    const taken = Math.min(item.count, remaining);
                    item.count -= taken;
                    remaining -= taken;
                    if (item.count <= 0) container[i] = null;
                }
            }
            return remaining === 0;
        }
        function countItemInInventory(type) {
            let total = 0;
            const containers = [invState.hotbar, invState.main];
            for (const container of containers) {
                for (let i = 0; i < container.length; i++) {
                    const it = container[i];
                    if (it && it.type === type) total += it.count;
                }
            }
            return total;
        }
        function closeTradeUI() {
            window.isTradeOpen = false;
            if (tradeUiEl) tradeUiEl.style.display = 'none';
            if (isPlaying && !isDead && !isGameClear) controls.lock();
        }
        function getVillagerLevelName(level) {
            const names = ['', '新手', '学徒', '老手', '专家', '大师'];
            return names[Math.max(1, Math.min(5, level))];
        }
        function buildVillagerTrades(level) {
            if (!window.update100Enabled) {
                const baseNo100 = [
                    { minLevel: 1, give: { type: 'cooked_porkchop', count: 2 }, take: { type: 'raw_porkchop', count: 3 } },
                    { minLevel: 1, give: { type: 'arrow', count: 8 }, take: { type: 'flint', count: 2 } },
                    { minLevel: 2, give: { type: 'iron_ingot', count: 1 }, take: { type: 'coal', count: 6 } },
                    { minLevel: 3, give: { type: 'gold_ingot', count: 1 }, take: { type: 'iron_ingot', count: 3 } },
                    { minLevel: 4, give: { type: 'diamond', count: 1 }, take: { type: 'gold_ingot', count: 5 } }
                ];
                return baseNo100.filter(t => t.minLevel <= level);
            }
            const pool = [
                { minLevel: 1, give: { type: 'emerald', count: 1 }, take: { type: 'coal', count: 10 } },
                { minLevel: 1, give: { type: 'emerald', count: 1 }, take: { type: 'rotten_flesh', count: 6 } },
                { minLevel: 2, give: { type: 'cooked_porkchop', count: 3 }, take: { type: 'emerald', count: 1 } },
                { minLevel: 2, give: { type: 'iron_ingot', count: 1 }, take: { type: 'emerald', count: 2 } },
                { minLevel: 3, give: { type: 'gold_ingot', count: 2 }, take: { type: 'emerald', count: 4 } },
                { minLevel: 3, give: { type: 'emerald', count: 1 }, take: { type: 'diamond', count: 1 } },
                { minLevel: 4, give: { type: 'diamond', count: 1 }, take: { type: 'emerald', count: 6 } },
                { minLevel: 5, give: { type: 'diamond_sword', count: 1 }, take: { type: 'emerald', count: 20 } }
            ];
            return pool.filter(t => t.minLevel <= level);
        }
        function renderTradePlayerInventory() {
            if (!tradePlayerInvEl) return;
            tradePlayerInvEl.innerHTML = '';
            const mainStart = Math.max(0, invState.main.length - 27);
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 9; col++) {
                    const i = mainStart + row * 9 + col;
                    const slot = document.createElement('div');
                    slot.className = 'slot trade-player-slot';
                    renderSlotEl(slot, invState.main[i] || null);
                    tradePlayerInvEl.appendChild(slot);
                }
            }
            for (let i = 0; i < 9; i++) {
                const slot = document.createElement('div');
                slot.className = 'slot trade-player-slot trade-player-hotbar';
                renderSlotEl(slot, invState.hotbar[i] || null);
                tradePlayerInvEl.appendChild(slot);
            }
        }

        function renderTradeList() {
            const list = document.getElementById('trade-list');
            const lvlEl = document.getElementById('trade-level');
            const xpFillEl = document.getElementById('trade-xp-fill');
            if (!list || !lvlEl) return;
            const v = window.currentTradingVillager;
            const level = (v && v.tradeLevel) ? v.tradeLevel : 1;
            lvlEl.innerText = `Lv.${level} ${getVillagerLevelName(level)}`;
            const maxXp = level >= 5 ? 1 : (4 + level * 3);
            if (xpFillEl) {
                const xp = (v && v.tradeXP) ? v.tradeXP : 0;
                xpFillEl.style.width = `${Math.min(100, Math.floor((xp / maxXp) * 100))}%`;
            }
            list.innerHTML = '';

            const trades = buildVillagerTrades(level);
            trades.forEach((t, idx) => {
                const row = document.createElement('div');
                row.className = 'trade-offer';
                row.innerHTML = `
                    <div class="slot trade-slot trade-cost-slot"></div>
                    <div class="trade-arrow">></div>
                    <div class="slot trade-slot trade-result-slot"></div>
                    <div class="mc-button trade-do">交易</div>
                `;
                const slots = row.querySelectorAll('.slot');
                const btn = row.querySelector('.trade-do');
                renderSlotEl(slots[0], { type: t.take.type, count: t.take.count });
                renderSlotEl(slots[1], { type: t.give.type, count: t.give.count });
                btn.onclick = () => {
                    if (window.canUseItemType && !window.canUseItemType(t.give.type)) {
                        appendChat('1.00 关闭时无法交易该物品');
                        return;
                    }
                    if (gameMode !== 0 && countItemInInventory(t.take.type) < t.take.count) {
                        appendChat('材料不足');
                        return;
                    }
                    if (gameMode !== 0) takeItemFromInventory(t.take.type, t.take.count);
                    addBlockToInventory(t.give.type, t.give.count);
                    if (window.currentTradingVillager) {
                        window.currentTradingVillager.tradeXP = (window.currentTradingVillager.tradeXP || 0) + 1;
                        const lv = window.currentTradingVillager.tradeLevel || 1;
                        const need = 4 + lv * 3;
                        if (window.currentTradingVillager.tradeLevel < 5 && window.currentTradingVillager.tradeXP >= need) {
                            window.currentTradingVillager.tradeXP = 0;
                            window.currentTradingVillager.tradeLevel++;
                        }
                    }
                    renderInventoryUI();
                    renderTradeList();
                };
                list.appendChild(row);
            });
            renderTradePlayerInventory();
        }

        window.openTradeUI = function(villager) {
            if (!tradeUiEl) return;
            purgeUpdate100FromInventory();
            window.isTradeOpen = true;
            tradeUiEl.style.display = 'flex';
            uiLayer.style.display = 'none';
            pauseScreen.style.display = 'none';
            document.getElementById('crosshair').style.display = 'none';
            hotbarEl.style.display = 'none';
            window.currentTradingVillager = villager || window.currentTradingVillager || { tradeLevel: 1, tradeXP: 0 };
            if (window.currentTradingVillager.tradeLevel === undefined) window.currentTradingVillager.tradeLevel = 1;
            if (window.currentTradingVillager.tradeXP === undefined) window.currentTradingVillager.tradeXP = 0;
            if (tradeCostSlotEl) renderSlotEl(tradeCostSlotEl, { type: 'emerald', count: 1 });
            if (tradeResultSlotEl) renderSlotEl(tradeResultSlotEl, { type: 'diamond', count: 1 });
            const bonusBtn = document.getElementById('btn-trade-bonus');
            if (bonusBtn) bonusBtn.style.display = 'none';
            renderTradeList();
            if (controls.isLocked) controls.unlock();
        };
        document.getElementById('btn-close-trade')?.addEventListener('click', closeTradeUI);
        document.getElementById('btn-trade-bonus')?.addEventListener('click', () => {
            if (!window.update100Enabled) {
                appendChat('1.00 关闭时不可用');
                return;
            }
            if (gameMode === 0 || takeItemFromInventory('emerald', 1)) {
                addBlockToInventory('diamond', 1);
                renderInventoryUI();
            } else {
                appendChat('需要绿宝石');
            }
        });
        function updateHeldItem3D() { heldItemGroup.clear(); if (gameMode === 2) return; const activeItem = invState.hotbar[currentSlotIndex]; if (!activeItem || activeItem.count <= 0) return; const type = activeItem.type; if (ITEMS[type] && ITEMS[type].type === 'block') { const geom = (typeof typeGeometries !== 'undefined' && typeGeometries[type]) ? typeGeometries[type] : blockGeometry; const mesh = new THREE.Mesh(geom, materials[type]); mesh.scale.set(0.3, 0.3, 0.3); mesh.rotation.set(Math.PI / 8, -Math.PI / 4, 0); heldItemGroup.add(mesh); } else { const data = itemPixels[type]; if (!data) return; let count = 0; for (let i = 0; i < 256; i++) { if (data[i * 4 + 3] > 0) count++; } const voxelGeo = new THREE.BoxGeometry(1 / 16, 1 / 16, 1 / 16); const instMesh = new THREE.InstancedMesh(voxelGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), count); const dummy = new THREE.Object3D(); const color = new THREE.Color(); let idx = 0; for (let i = 0; i < 256; i++) { if (data[i * 4 + 3] > 0) { dummy.position.set(((i % 16) - 7.5) / 16, (7.5 - Math.floor(i / 16)) / 16, 0); dummy.updateMatrix(); instMesh.setMatrixAt(idx, dummy.matrix); color.setRGB(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255); instMesh.setColorAt(idx, color); idx++; } } instMesh.rotation.set(0, Math.PI, 0); if (ITEMS[type] && ITEMS[type].type === 'tool') { instMesh.scale.set(0.6, 0.6, 0.6); instMesh.rotation.z = -Math.PI / 4; } else { instMesh.scale.set(0.4, 0.4, 0.4); } heldItemGroup.add(instMesh); } }
        window.updateHeldItem3D = updateHeldItem3D;

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
                if (item) { tooltipEl.innerText = getItemTooltip(item); tooltipEl.style.display = 'block'; }
            }
        });

        document.addEventListener('mouseout', (e) => { if (e.target.closest('.slot')) tooltipEl.style.display = 'none'; });

        window.renderInventoryUI = function() {
            purgeUpdate100FromInventory();
            if (creativeToggleBtn) {
                creativeToggleBtn.style.display = (gameMode === 0) ? 'block' : 'none';
                creativeToggleBtn.classList.toggle('active', isCreativeTabOpen);
            }
            if (netherPortalToggleBtn) {
                netherPortalToggleBtn.style.display = (gameMode === 0) ? 'block' : 'none';
                netherPortalToggleBtn.classList.toggle('active', isNetherPortalTabOpen);
            }
            const isAnyCreativeTabOpen = isCreativeTabOpen || isNetherPortalTabOpen;
            inventoryGridEl.classList.toggle('creative-view', isAnyCreativeTabOpen);

            if (isAnyCreativeTabOpen) {
                inventoryGridEl.innerHTML = '';
                const hiddenItems = [
                    'nether_portal', 'end_portal', 'return_portal',
                    'bed_head', 'bed_foot',
                    'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open',
                    'oak_fence_gate_open',
                    'oak_stairs_inner_left', 'oak_stairs_inner_right',
                    'stone_stairs_inner_left', 'stone_stairs_inner_right',
                    'cobblestone_stairs_inner_left', 'cobblestone_stairs_inner_right'
                ];
                const itemsToRender = allItemTypes.filter(type => {
                    const isHidden = hiddenItems.includes(type);
                    return isNetherPortalTabOpen ? isHidden : !isHidden;
                });
                itemsToRender.forEach(type => {
                    const slot = document.createElement('div');
                    slot.className = 'slot';
                    const isUpdate100Hidden = !window.update100Enabled &&
                        window.update100ContentTypes &&
                        window.update100ContentTypes.has(type);
                    if (isUpdate100Hidden) slot.classList.add('slot-disabled');
                    const iconUrl = isUpdate100Hidden ? (window.RESERVED6_ICON || icons[type]) : icons[type];
                    slot.style.backgroundImage = `url(${iconUrl})`;
                    slot.title = getItemTooltip({ type });
                    slot.onclick = () => {
                        if (isUpdate100Hidden) {
                            appendChat('1.00 更新未开启，无法使用该物品');
                            return;
                        }
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
            const inventoryUiEl = document.getElementById('inventory-ui');
            
            if (craftingMode === 4) {
                inventoryUiEl.setAttribute('data-container-ui', 'furnace');
                craftingBox.style.display = 'none';
                furnaceBox.style.display = 'flex';
                document.getElementById('chest-box').style.display = 'none';
                document.getElementById('crafting-title').innerText = "熔炉";
            } else if (craftingMode === 5) {
                inventoryUiEl.setAttribute('data-container-ui', 'chest');
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
                inventoryUiEl.setAttribute('data-container-ui', craftingMode === 3 ? 'crafting' : 'inventory');
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
                const skinSrc = localStorage.getItem('mc_playerSkin') || (window.getTextureSource ? window.getTextureSource('steve') : 'textures/steve.png');
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
            for (let i = 0; i < 9; i++) { 
                if (craftingMode === 2 && ![0, 1, 3, 4].includes(i)) continue; 
                if (invState.crafting[i]) { 
                    let x, y; 
                    if (craftingMode === 2) { 
                        x = (i === 0 || i === 3) ? 0 : 1; 
                        y = (i === 0 || i === 1) ? 0 : 1; 
                    } else { 
                        x = i % 3; 
                        y = Math.floor(i / 3); 
                    } 
                    if (x < minX) minX = x; 
                    if (x > maxX) maxX = x; 
                    if (y < minY) minY = y; 
                    if (y > maxY) maxY = y; 
                } 
            }
            if (minX > maxX) return ""; let pattern = "";
            for (let y = minY; y <= maxY; y++) { 
                for (let x = minX; x <= maxX; x++) { 
                    let type = "null"; 
                    if (craftingMode === 2) { 
                        let targetI = (y === 0) ? (x === 0 ? 0 : 1) : (x === 0 ? 3 : 4); 
                        if (invState.crafting[targetI]) type = invState.crafting[targetI].type; 
                    } else { 
                        let targetI = y * 3 + x; 
                        if (invState.crafting[targetI]) type = invState.crafting[targetI].type; 
                    } 
                    pattern += type + ","; 
                } 
                pattern += ";"; 
            } 
            return pattern;
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
                else if (p === "cobblestone,cobblestone,cobblestone,;cobblestone,null,cobblestone,;cobblestone,cobblestone,cobblestone,;") invState.output = { type: 'furnace', count: 1 };
                else if (p === "flint,;stick,;") invState.output = {type: 'arrow', count: 4};
                else if (p === "coal,;stick,;") invState.output = { type: 'torch', count: 4 };
                else if (p === "string,string,string,;planks,planks,planks,;") invState.output = { type: 'bed', count: 1 };
                else if (p === "planks,planks,planks,;planks,null,planks,;planks,planks,planks,;") invState.output = { type: 'chest', count: 1 };
                else if (p === "planks,planks,;planks,planks,;planks,planks,;") invState.output = { type: 'door', count: 3 };
                
                // 半砖 (Slabs)
                else if (p === "planks,planks,planks,;") invState.output = { type: 'oak_slab', count: 6 };
                else if (p === "stone,stone,stone,;") invState.output = { type: 'stone_slab', count: 6 };
                else if (p === "cobblestone,cobblestone,cobblestone,;") invState.output = { type: 'cobblestone_slab', count: 6 };
                
                // 楼梯 (Stairs)
                else if (p === "planks,null,null,;planks,planks,null,;planks,planks,planks,;" || p === "null,null,planks,;null,planks,planks,;planks,planks,planks,;") invState.output = { type: 'oak_stairs', count: 4 };
                else if (p === "stone,null,null,;stone,stone,null,;stone,stone,stone,;" || p === "null,null,stone,;null,stone,stone,;stone,stone,stone,;") invState.output = { type: 'stone_stairs', count: 4 };
                else if (p === "cobblestone,null,null,;cobblestone,cobblestone,null,;cobblestone,cobblestone,cobblestone,;" || p === "null,null,cobblestone,;null,cobblestone,cobblestone,;cobblestone,cobblestone,cobblestone,;") invState.output = { type: 'cobblestone_stairs', count: 4 };
                
                // 栅栏和栅栏门 (Fence and Fence Gate)
                else if (p === "planks,stick,planks,;planks,stick,planks,;" || p === "stick,stick,stick,;stick,stick,stick,;") invState.output = { type: 'oak_fence', count: 3 };
                else if (p === "stick,planks,stick,;stick,planks,stick,;") invState.output = { type: 'oak_fence_gate', count: 1 };
                
                if (craftingMode === 3) {
                    // 工具与武器合成
                    const toolMats = ["planks", "cobblestone", "iron_ingot", "gold_ingot", "diamond"];
                    const toolPrefixes = ["wooden", "stone", "iron", "golden", "diamond"];
                    
                    toolMats.forEach((mat, idx) => {
                        let prefix = toolPrefixes[idx];
                        let pickaxePrefix = (prefix === "golden") ? "gold" : prefix;
                        let pickaxeType = `${pickaxePrefix}_pickaxe`;
                        let swordType = `${prefix}_sword`;
                        let axeType = `${prefix}_axe`;
                        
                        // Pickaxe
                        if (p === `${mat},${mat},${mat},;null,stick,null,;null,stick,null,;`) {
                            invState.output = { type: pickaxeType, count: 1 };
                        }
                        // Sword
                        if (p === `${mat},;${mat},;stick,;`) {
                            invState.output = { type: swordType, count: 1 };
                        }
                        // Axe (left-facing and right-facing)
                        if (p === `${mat},${mat},;${mat},stick,;null,stick,;` || p === `${mat},${mat},;stick,${mat},;stick,null,;`) {
                            invState.output = { type: axeType, count: 1 };
                        }
                    });
                    
                    if (p === "string,stick,null,;string,null,stick,;string,stick,null,;" || p === "null,stick,string,;stick,null,string,;null,stick,string,;") invState.output = {type: 'bow', count: 1};

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
            const canPlaceInSlot = (slotContainer, item) => {
                if (slotContainer !== 'armor') return true;
                return !!(item && ITEMS[item.type] && ITEMS[item.type].type === 'armor');
            };
            if (button === 2) {
                if (container === 'output') return;
                if (invState.dragged) { if (!targetSlot) { if (!canPlaceInSlot(container, invState.dragged)) return; invState[container][index] = { ...invState.dragged, count: 1 }; invState.dragged.count--; if (invState.dragged.count <= 0) invState.dragged = null; } else if (targetSlot.type === invState.dragged.type && targetSlot.count < 64) { if (!canPlaceInSlot(container, invState.dragged)) return; targetSlot.count++; invState.dragged.count--; if (invState.dragged.count <= 0) invState.dragged = null; } }
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
                else { if (invState.dragged && targetSlot) { if (!canPlaceInSlot(container, invState.dragged)) return; if (invState.dragged.type === targetSlot.type && targetSlot.count < 64) { let moveAmount = Math.min(64 - targetSlot.count, invState.dragged.count); targetSlot.count += moveAmount; invState.dragged.count -= moveAmount; if (invState.dragged.count <= 0) invState.dragged = null; } else { if (container === 'chest') { invState.chest[index] = invState.dragged; invState.dragged = targetSlot; } else { invState[container][index] = invState.dragged; invState.dragged = targetSlot; } } } else if (invState.dragged && !targetSlot) { 
                    // 只有 armor 类型的物品可以放入 armor 槽位
                    if (!canPlaceInSlot(container, invState.dragged)) return;
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
            if (window.canUseItemType && !window.canUseItemType(type)) return false;
            for (let i = 0; i < 9; i++) { if (invState.hotbar[i] && invState.hotbar[i].type === type) { invState.hotbar[i].count += count; return true; } }
            for (let i = 0; i < 9; i++) { if (!invState.hotbar[i]) { invState.hotbar[i] = { type: type, count: count }; return true; } }
            for (let i = 0; i < invState.main.length; i++) { if (invState.main[i] && invState.main[i].type === type) { invState.main[i].count += count; return true; } }
            for (let i = 0; i < invState.main.length; i++) { if (!invState.main[i]) { invState.main[i] = { type: type, count: count }; return true; } }
            return false;
        };
        function addBlockToInventory(type, count) { return window.addBlockToInventory(type, count); }

        // ==========================================
        // Recipe Book Logic
        // ==========================================
        const RECIPES = [
            { id: 'planks', cat: 0, req: { 'log': 1 }, res: 'planks', count: 4, size: 1 },
            { id: 'stick', cat: 0, req: { 'planks': 2 }, res: 'stick', count: 4, size: 2, pattern: ['planks',null,null,'planks'] },
            { id: 'crafting_table', cat: 0, req: { 'planks': 4 }, res: 'crafting_table', count: 1, size: 2, pattern: ['planks','planks',null,'planks','planks'] },
            { id: 'furnace', cat: 0, req: { 'cobblestone': 8 }, res: 'furnace', count: 1, size: 3, pattern: ['cobblestone','cobblestone','cobblestone','cobblestone',null,'cobblestone','cobblestone','cobblestone','cobblestone'] },
            { id: 'chest', cat: 0, req: { 'planks': 8 }, res: 'chest', count: 1, size: 3, pattern: ['planks','planks','planks','planks',null,'planks','planks','planks','planks'] },
            { id: 'door', cat: 0, req: { 'planks': 6 }, res: 'door', count: 3, size: 3, pattern: ['planks','planks',null,'planks','planks',null,'planks','planks'] },
            { id: 'torch', cat: 0, req: { 'coal': 1, 'stick': 1 }, res: 'torch', count: 4, size: 2, pattern: ['coal',null,null,'stick'] },
            { id: 'bed', cat: 0, req: { 'string': 3, 'planks': 3 }, res: 'bed', count: 1, size: 3, pattern: ['string','string','string','planks','planks','planks'] },
            { id: 'arrow', cat: 0, req: { 'flint': 1, 'stick': 1 }, res: 'arrow', count: 4, size: 2, pattern: ['flint',null,null,'stick'] },
            { id: 'bow', cat: 0, req: { 'string': 3, 'stick': 3 }, res: 'bow', count: 1, size: 3, pattern: ['string','stick',null,'string',null,'stick','string','stick'] },
            { id: 'flint_and_steel', cat: 0, req: { 'iron_ingot': 1, 'flint': 1 }, res: 'flint_and_steel', count: 1, size: 2 },
            { id: 'ender_eye', cat: 0, req: { 'ender_pearl': 1, 'blaze_powder': 1 }, res: 'ender_eye', count: 1, size: 2 },
            { id: 'blaze_powder', cat: 0, req: { 'blaze_rod': 1 }, res: 'blaze_powder', count: 2, size: 1 },
            { id: 'oak_slab', cat: 1, req: { 'planks': 3 }, res: 'oak_slab', count: 6, size: 3, pattern: ['planks','planks','planks'] },
            { id: 'stone_slab', cat: 1, req: { 'stone': 3 }, res: 'stone_slab', count: 6, size: 3, pattern: ['stone','stone','stone'] },
            { id: 'cobblestone_slab', cat: 1, req: { 'cobblestone': 3 }, res: 'cobblestone_slab', count: 6, size: 3, pattern: ['cobblestone','cobblestone','cobblestone'] },
            { id: 'oak_stairs', cat: 1, req: { 'planks': 6 }, res: 'oak_stairs', count: 4, size: 3, pattern: ['planks',null,null,'planks','planks',null,'planks','planks','planks'] },
            { id: 'stone_stairs', cat: 1, req: { 'stone': 6 }, res: 'stone_stairs', count: 4, size: 3, pattern: ['stone',null,null,'stone','stone',null,'stone','stone','stone'] },
            { id: 'cobblestone_stairs', cat: 1, req: { 'cobblestone': 6 }, res: 'cobblestone_stairs', count: 4, size: 3, pattern: ['cobblestone',null,null,'cobblestone','cobblestone',null,'cobblestone','cobblestone','cobblestone'] },
            { id: 'oak_fence', cat: 1, req: { 'planks': 4, 'stick': 2 }, res: 'oak_fence', count: 3, size: 3, pattern: ['planks','stick','planks','planks','stick','planks'] },
            { id: 'oak_fence_gate', cat: 1, req: { 'planks': 2, 'stick': 4 }, res: 'oak_fence_gate', count: 1, size: 3, pattern: ['stick','planks','stick','stick','planks','stick'] },
            { id: 'wooden_pickaxe', cat: 2, req: { 'planks': 3, 'stick': 2 }, res: 'wooden_pickaxe', count: 1, size: 3, pattern: ['planks','planks','planks',null,'stick',null,null,'stick'] },
            { id: 'stone_pickaxe', cat: 2, req: { 'cobblestone': 3, 'stick': 2 }, res: 'stone_pickaxe', count: 1, size: 3, pattern: ['cobblestone','cobblestone','cobblestone',null,'stick',null,null,'stick'] },
            { id: 'iron_pickaxe', cat: 2, req: { 'iron_ingot': 3, 'stick': 2 }, res: 'iron_pickaxe', count: 1, size: 3, pattern: ['iron_ingot','iron_ingot','iron_ingot',null,'stick',null,null,'stick'] },
            { id: 'gold_pickaxe', cat: 2, req: { 'gold_ingot': 3, 'stick': 2 }, res: 'gold_pickaxe', count: 1, size: 3, pattern: ['gold_ingot','gold_ingot','gold_ingot',null,'stick',null,null,'stick'] },
            { id: 'diamond_pickaxe', cat: 2, req: { 'diamond': 3, 'stick': 2 }, res: 'diamond_pickaxe', count: 1, size: 3, pattern: ['diamond','diamond','diamond',null,'stick',null,null,'stick'] },
            { id: 'wooden_sword', cat: 2, req: { 'planks': 2, 'stick': 1 }, res: 'wooden_sword', count: 1, size: 3, pattern: ['planks',null,null,'planks',null,null,'stick'] },
            { id: 'stone_sword', cat: 2, req: { 'cobblestone': 2, 'stick': 1 }, res: 'stone_sword', count: 1, size: 3, pattern: ['cobblestone',null,null,'cobblestone',null,null,'stick'] },
            { id: 'iron_sword', cat: 2, req: { 'iron_ingot': 2, 'stick': 1 }, res: 'iron_sword', count: 1, size: 3, pattern: ['iron_ingot',null,null,'iron_ingot',null,null,'stick'] },
            { id: 'golden_sword', cat: 2, req: { 'gold_ingot': 2, 'stick': 1 }, res: 'golden_sword', count: 1, size: 3, pattern: ['gold_ingot',null,null,'gold_ingot',null,null,'stick'] },
            { id: 'diamond_sword', cat: 2, req: { 'diamond': 2, 'stick': 1 }, res: 'diamond_sword', count: 1, size: 3, pattern: ['diamond',null,null,'diamond',null,null,'stick'] },
            { id: 'wooden_axe', cat: 2, req: { 'planks': 3, 'stick': 2 }, res: 'wooden_axe', count: 1, size: 3, pattern: ['planks','planks',null,'planks','stick',null,null,'stick'] },
            { id: 'stone_axe', cat: 2, req: { 'cobblestone': 3, 'stick': 2 }, res: 'stone_axe', count: 1, size: 3, pattern: ['cobblestone','cobblestone',null,'cobblestone','stick',null,null,'stick'] },
            { id: 'iron_axe', cat: 2, req: { 'iron_ingot': 3, 'stick': 2 }, res: 'iron_axe', count: 1, size: 3, pattern: ['iron_ingot','iron_ingot',null,'iron_ingot','stick',null,null,'stick'] },
            { id: 'golden_axe', cat: 2, req: { 'gold_ingot': 3, 'stick': 2 }, res: 'golden_axe', count: 1, size: 3, pattern: ['gold_ingot','gold_ingot',null,'gold_ingot','stick',null,null,'stick'] },
            { id: 'diamond_axe', cat: 2, req: { 'diamond': 3, 'stick': 2 }, res: 'diamond_axe', count: 1, size: 3, pattern: ['diamond','diamond',null,'diamond','stick',null,null,'stick'] },
            { id: 'iron_helmet', cat: 3, req: { 'iron_ingot': 5 }, res: 'iron_helmet', count: 1, size: 3, pattern: ['iron_ingot','iron_ingot','iron_ingot','iron_ingot',null,'iron_ingot'] },
            { id: 'iron_chestplate', cat: 3, req: { 'iron_ingot': 8 }, res: 'iron_chestplate', count: 1, size: 3, pattern: ['iron_ingot',null,'iron_ingot','iron_ingot','iron_ingot','iron_ingot','iron_ingot','iron_ingot','iron_ingot'] },
            { id: 'iron_leggings', cat: 3, req: { 'iron_ingot': 7 }, res: 'iron_leggings', count: 1, size: 3, pattern: ['iron_ingot','iron_ingot','iron_ingot','iron_ingot',null,'iron_ingot','iron_ingot',null,'iron_ingot'] },
            { id: 'iron_boots', cat: 3, req: { 'iron_ingot': 4 }, res: 'iron_boots', count: 1, size: 3, pattern: ['iron_ingot',null,'iron_ingot','iron_ingot',null,'iron_ingot'] },
            { id: 'golden_helmet', cat: 3, req: { 'gold_ingot': 5 }, res: 'golden_helmet', count: 1, size: 3, pattern: ['gold_ingot','gold_ingot','gold_ingot','gold_ingot',null,'gold_ingot'] },
            { id: 'golden_chestplate', cat: 3, req: { 'gold_ingot': 8 }, res: 'golden_chestplate', count: 1, size: 3, pattern: ['gold_ingot',null,'gold_ingot','gold_ingot','gold_ingot','gold_ingot','gold_ingot','gold_ingot','gold_ingot'] },
            { id: 'golden_leggings', cat: 3, req: { 'gold_ingot': 7 }, res: 'golden_leggings', count: 1, size: 3, pattern: ['gold_ingot','gold_ingot','gold_ingot','gold_ingot',null,'gold_ingot','gold_ingot',null,'gold_ingot'] },
            { id: 'golden_boots', cat: 3, req: { 'gold_ingot': 4 }, res: 'golden_boots', count: 1, size: 3, pattern: ['gold_ingot',null,'gold_ingot','gold_ingot',null,'gold_ingot'] },
            { id: 'diamond_helmet', cat: 3, req: { 'diamond': 5 }, res: 'diamond_helmet', count: 1, size: 3, pattern: ['diamond','diamond','diamond','diamond',null,'diamond'] },
            { id: 'diamond_chestplate', cat: 3, req: { 'diamond': 8 }, res: 'diamond_chestplate', count: 1, size: 3, pattern: ['diamond',null,'diamond','diamond','diamond','diamond','diamond','diamond','diamond'] },
            { id: 'diamond_leggings', cat: 3, req: { 'diamond': 7 }, res: 'diamond_leggings', count: 1, size: 3, pattern: ['diamond','diamond','diamond','diamond',null,'diamond','diamond',null,'diamond'] },
            { id: 'diamond_boots', cat: 3, req: { 'diamond': 4 }, res: 'diamond_boots', count: 1, size: 3, pattern: ['diamond',null,'diamond','diamond',null,'diamond'] },
        ];

        let isRecipeBookOpen = false;

        document.getElementById('recipe-book-toggle').addEventListener('click', () => {
            isRecipeBookOpen = !isRecipeBookOpen;
            const panel = document.getElementById('recipe-book-panel');
            panel.style.display = isRecipeBookOpen ? 'block' : 'none';
            if (isRecipeBookOpen) {
                updateRecipeBook();
            }
        });

        function countPlayerItems(type) {
            let cnt = 0;
            for (let i = 0; i < 9; i++) if (invState.hotbar[i] && invState.hotbar[i].type === type) cnt += invState.hotbar[i].count;
            for (let i = 0; i < 27; i++) if (invState.main[i] && invState.main[i].type === type) cnt += invState.main[i].count;
            return cnt;
        }

        function consumePlayerItems(type, count) {
            let remaining = count;
            for (let i = 0; i < 9 && remaining > 0; i++) {
                if (invState.hotbar[i] && invState.hotbar[i].type === type) {
                    let take = Math.min(remaining, invState.hotbar[i].count);
                    invState.hotbar[i].count -= take;
                    remaining -= take;
                    if (invState.hotbar[i].count <= 0) invState.hotbar[i] = null;
                }
            }
            for (let i = 0; i < 27 && remaining > 0; i++) {
                if (invState.main[i] && invState.main[i].type === type) {
                    let take = Math.min(remaining, invState.main[i].count);
                    invState.main[i].count -= take;
                    remaining -= take;
                    if (invState.main[i].count <= 0) invState.main[i] = null;
                }
            }
        }

        function returnCraftingItems() {
            for (let i = 0; i < 9; i++) {
                if (invState.crafting[i]) {
                    window.addBlockToInventory(invState.crafting[i].type, invState.crafting[i].count);
                    invState.crafting[i] = null;
                }
            }
        }

        function placeRecipeInGrid(r) {
            returnCraftingItems();
            
            if (r.pattern) {
                for (let i = 0; i < r.pattern.length; i++) {
                    if (r.pattern[i]) {
                        invState.crafting[i] = { type: r.pattern[i], count: 1 };
                        consumePlayerItems(r.pattern[i], 1);
                    }
                }
            } else {
                let currentSlot = 0;
                for (let reqType in r.req) {
                    for (let n = 0; n < r.req[reqType]; n++) {
                        let idx = (craftingMode === 2) ? [0, 1, 3, 4][currentSlot] : currentSlot;
                        invState.crafting[idx] = { type: reqType, count: 1 };
                        consumePlayerItems(reqType, 1);
                        currentSlot++;
                    }
                }
            }
            checkCrafting();
            renderInventoryUI();
            if (window.syncContainerState) window.syncContainerState();
        }

        function updateRecipeBook() {
            if (!isRecipeBookOpen) return;
            const listEl = document.getElementById('recipe-list');
            listEl.innerHTML = '';
            
            let recipes = RECIPES.map(r => {
                let state = 'green';
                let missingStr = [];
                if (r.size === 3 && craftingMode === 2) {
                    state = 'gray'; // 2x2 grid, recipe needs 3x3
                } else {
                    for (let reqType in r.req) {
                        const has = countPlayerItems(reqType);
                        if (has < r.req[reqType]) {
                            state = 'red';
                            missingStr.push(`${(window.ITEM_NAMES && window.ITEM_NAMES[reqType]) || reqType}: 缺${r.req[reqType] - has}`);
                        }
                    }
                }
                return { ...r, state, missingStr: missingStr.join(', ') };
            });
            
            // Sort: Green -> Red -> Gray, then by category
            const stateRank = { 'green': 1, 'red': 2, 'gray': 3 };
            recipes.sort((a, b) => {
                if (stateRank[a.state] !== stateRank[b.state]) return stateRank[a.state] - stateRank[b.state];
                if (a.cat !== b.cat) return a.cat - b.cat;
                return 0;
            });
            
            recipes.forEach(r => {
                const itemEl = document.createElement('div');
                itemEl.style.display = 'flex';
                itemEl.style.alignItems = 'center';
                itemEl.style.gap = '10px';
                itemEl.style.padding = '5px';
                itemEl.style.borderRadius = '4px';
                itemEl.style.border = '2px solid transparent';
                
                if (r.state === 'green') {
                    itemEl.style.backgroundColor = 'rgba(0, 200, 0, 0.3)';
                    itemEl.style.borderColor = '#0f0';
                    itemEl.style.cursor = 'pointer';
                    itemEl.title = '点击将配方转移到合成表';
                    itemEl.onclick = () => {
                        placeRecipeInGrid(r);
                    };
                } else if (r.state === 'red') {
                    itemEl.style.backgroundColor = 'rgba(200, 0, 0, 0.3)';
                    itemEl.style.borderColor = '#f00';
                } else {
                    itemEl.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
                    itemEl.style.borderColor = '#777';
                    itemEl.title = '需要更大的合成台';
                }
                
                const icon = document.createElement('div');
                icon.style.width = '32px';
                icon.style.height = '32px';
                icon.style.backgroundSize = 'cover';
                icon.style.imageRendering = 'pixelated'; // 修复模糊问题
                const iconPath = window.icons ? window.icons[r.res] : (window.getTextureSource ? window.getTextureSource(r.res) : `textures/${r.res}.png`);
                icon.style.backgroundImage = `url('${iconPath}')`;
                
                const infoDiv = document.createElement('div');
                infoDiv.style.flex = '1';
                infoDiv.style.display = 'flex';
                infoDiv.style.flexDirection = 'column';
                
                const nameStr = ((window.ITEM_NAMES && window.ITEM_NAMES[r.res]) || r.res) + (r.count > 1 ? ` x${r.count}` : '');
                const name = document.createElement('span');
                name.style.fontSize = '12px';
                name.style.fontWeight = 'bold';
                name.innerText = nameStr;
                infoDiv.appendChild(name);

                let reqHtml = [];
                for (let reqType in r.req) {
                    reqHtml.push(`${(window.ITEM_NAMES && window.ITEM_NAMES[reqType]) || reqType}x${r.req[reqType]}`);
                }
                const reqText = document.createElement('span');
                reqText.style.fontSize = '10px';
                reqText.style.color = r.state === 'red' ? '#ffaa55' : '#ccc';
                reqText.innerText = (r.state === 'red' && r.missingStr) ? r.missingStr : reqHtml.join(', ');
                infoDiv.appendChild(reqText);
                
                itemEl.appendChild(icon);
                itemEl.appendChild(infoDiv);
                listEl.appendChild(itemEl);
            });
        }
        
        // Update recipe book whenever inventory changes if it's open
        const originalRenderInventoryUI = window.renderInventoryUI;
        window.renderInventoryUI = function() {
            if (originalRenderInventoryUI) originalRenderInventoryUI();
            if (isRecipeBookOpen) updateRecipeBook();
        };
