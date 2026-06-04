        // ==========================================
        controls.addEventListener('lock', () => {
            if (isInventoryOpen) { for (let i = 0; i < 9; i++) { if (invState.crafting[i]) { addBlockToInventory(invState.crafting[i].type, invState.crafting[i].count); invState.crafting[i] = null; } } invState.output = null; if (invState.dragged) { addBlockToInventory(invState.dragged.type, invState.dragged.count); invState.dragged = null; } }
            window.isTradeOpen = false;
            const tradeUi = document.getElementById('trade-ui'); if (tradeUi) tradeUi.style.display = 'none';
            isInventoryOpen = false; isCreativeTabOpen = false; uiLayer.style.display = 'none'; pauseScreen.style.display = 'none'; inventoryUiEl.style.display = 'none'; deathScreenEl.style.display = 'none'; tooltipEl.style.display = 'none';
            document.getElementById('crosshair').style.display = 'block'; hotbarEl.style.display = 'flex'; heldItemGroup.visible = true;
            if (gameMode !== 0) document.getElementById('status-bars').style.display = 'flex'; debugUiEl.style.display = 'block'; renderInventoryUI();
        });
        
        document.addEventListener('pointerlockerror', () => {
            if (isPlaying && !isDead && !isGameClear && !isInventoryOpen) {
                uiLayer.style.display = 'flex';
                pauseScreen.style.display = 'flex';
            }
        });

        controls.addEventListener('unlock', () => {
            if (isGameClear || isChatOpen) return; heldItemGroup.visible = false; isMining = false; document.getElementById('status-bars').style.display = 'none'; debugUiEl.style.display = 'none';
            if (isDead) { deathScreenEl.style.display = 'flex'; uiLayer.style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; hotbarEl.style.display = 'none'; inventoryUiEl.style.display = 'none'; }
            else if (window.isTradeOpen) { const tradeUi = document.getElementById('trade-ui'); if (tradeUi) tradeUi.style.display = 'flex'; uiLayer.style.display = 'none'; pauseScreen.style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; hotbarEl.style.display = 'none'; }
            else if (isInventoryOpen) { inventoryUiEl.style.display = 'flex'; hotbarEl.style.display = 'flex'; uiLayer.style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; }
            else if (isPlaying) { uiLayer.style.display = 'flex'; pauseScreen.style.display = 'flex'; titleScreen.style.display = 'none'; worldSelectScreen.style.display = 'none'; createWorldScreen.style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; hotbarEl.style.display = 'none'; document.getElementById('options-screen').style.display = 'none'; document.getElementById('multiplayer-screen').style.display = 'none'; }
        });
        scene.add(controls.getObject());
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        let isMining = false; let miningTime = 0; let targetBlockKey = null;
        document.addEventListener('wheel', (e) => { if (!controls.isLocked) return; if (e.deltaY > 0) currentSlotIndex = (currentSlotIndex + 1) % 9; else currentSlotIndex = (currentSlotIndex - 1 + 9) % 9; renderInventoryUI(); const activeSlot = document.getElementById(`hotbar-${currentSlotIndex}`); if (activeSlot) hotbarEl.scrollTo({ left: activeSlot.offsetLeft - hotbarEl.offsetWidth / 2 + 24, behavior: 'smooth' }); });

        const stairSideDirs = {
            north: { dx: 0, dz: -1 },
            south: { dx: 0, dz: 1 },
            east: { dx: 1, dz: 0 },
            west: { dx: -1, dz: 0 }
        };
        function getLeftStairFacing(facing) {
            return { north: 'west', west: 'south', south: 'east', east: 'north' }[facing] || 'west';
        }
        function getRightStairFacing(facing) {
            return { north: 'east', east: 'south', south: 'west', west: 'north' }[facing] || 'east';
        }
        function updateStairCornerAt(x, y, z) {
            const fullType = getFullBlock(x, y, z);
            if (!fullType || !window.isStairType || !window.isStairType(fullType)) return;
            const facing = window.getTypeFacing ? window.getTypeFacing(fullType) : null;
            if (!facing) return;
            const root = window.getStairRootType ? window.getStairRootType(fullType) : fullType;
            const leftFacing = getLeftStairFacing(facing);
            const rightFacing = getRightStairFacing(facing);
            const leftDir = stairSideDirs[leftFacing];
            const rightDir = stairSideDirs[rightFacing];
            let variant = null;
            const leftNeighbor = getFullBlock(x + leftDir.dx, y, z + leftDir.dz);
            if (leftNeighbor && window.getStairRootType(leftNeighbor) === root && window.getTypeFacing(leftNeighbor) === leftFacing) variant = 'inner_left';
            const rightNeighbor = getFullBlock(x + rightDir.dx, y, z + rightDir.dz);
            if (rightNeighbor && window.getStairRootType(rightNeighbor) === root && window.getTypeFacing(rightNeighbor) === rightFacing) variant = 'inner_right';
            const variantType = window.getStairVariantType ? window.getStairVariantType(root, variant) : root;
            const nextType = window.withFacing ? window.withFacing(variantType, facing) : `${variantType}_${facing}`;
            if (nextType !== fullType) setBlock(x, y, z, nextType);
        }
        function updateNearbyStairCorners(x, y, z) {
            updateStairCornerAt(x, y, z);
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => updateStairCornerAt(x + dx, y, z + dz));
        }

        document.addEventListener('mousedown', (event) => {
            if (isInventoryOpen) { const slotEl = event.target.closest ? event.target.closest('.slot') : null; if (slotEl && slotEl.id !== 'dragged-icon') handleSlotClick(slotEl.getAttribute('data-container'), parseInt(slotEl.getAttribute('data-index')), event.button); return; }
            
            // 触屏模式下支持直接点击物品栏切换物品
            const hotbarSlot = event.target.closest ? event.target.closest('.slot') : null;
            if (hotbarSlot && hotbarSlot.getAttribute('data-container') === 'hotbar') {
                const idx = parseInt(hotbarSlot.getAttribute('data-index'));
                if (!isNaN(idx)) {
                    currentSlotIndex = idx;
                    renderInventoryUI();
                    return;
                }
            }
            if (!controls.isLocked || isDead || isGameClear) return;
            if (gameMode === 2) return;
            const activeItem = invState.hotbar[currentSlotIndex];
            
            raycaster.setFromCamera(center, camera); 
            const activeMeshes = []; 
            for (const chunk of chunks.values()) { 
                blockTypes.forEach(type => { 
                    if (type !== 'water' && type !== 'lava' && chunk.meshes[type].count > 0) activeMeshes.push(chunk.meshes[type]); 
                }); 
            }
            const mobMeshes = []; 
            entities.forEach(e => { if (e.mesh) mobMeshes.push(e.mesh); }); 
            const intersects = raycaster.intersectObjects([...activeMeshes, ...mobMeshes], true);

            if (event.button === 2) {
                if (intersects.length > 0) {
                    let node = intersects[0].object;
                    let hitMob = null;
                    while (node && !hitMob) {
                        hitMob = entities.find(e => e.mesh === node);
                        node = node.parent;
                    }
                    if (hitMob && hitMob.type === 'villager' && typeof window.openTradeUI === 'function') {
                        window.openTradeUI(hitMob);
                        return;
                    }
                }
                if (intersects.length > 0 && !mobMeshes.some(m => { let c = intersects[0].object; while(c){ if(c===m)return true; c=c.parent; } return false; })) {
                    const intersect = intersects[0]; const hitBlockPos = window.getIntersectBlockCoords ? window.getIntersectBlockCoords(intersect) : null; const p = hitBlockPos ? null : intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.01)); 
                    const cbx = hitBlockPos ? hitBlockPos.x : Math.floor(p.x); const cby = hitBlockPos ? hitBlockPos.y : Math.floor(p.y); const cbz = hitBlockPos ? hitBlockPos.z : Math.floor(p.z);
                    const clickedBlock = getBlock(cbx, cby, cbz);
                    if (clickedBlock === 'crafting_table') { craftingMode = 3; isInventoryOpen = true; controls.unlock(); return; }
                    if (clickedBlock === 'furnace') { 
                        craftingMode = 4; isInventoryOpen = true; 
                        currentFurnacePos = `${cbx},${cby},${cbz}`;
                        if (!furnaceStates[currentFurnacePos]) furnaceStates[currentFurnacePos] = { items: new Array(2).fill(null), smelt: 0, burn: 0, maxBurn: 0, output: null };
                        invState.furnace = furnaceStates[currentFurnacePos].items;
                        invState.output = furnaceStates[currentFurnacePos].output;
                        controls.unlock(); return; 
                    }
                    if (clickedBlock === 'bed' || clickedBlock === 'bed_head' || clickedBlock === 'bed_foot') {
                        spawnPoint = new THREE.Vector3(cbx, cby + 1, cbz);
                        let cycleTime = worldTime % CYCLE_LENGTH;
                        if (cycleTime >= DAY_LENGTH) {
                            const doSleep = () => {
                                worldTime += (CYCLE_LENGTH - cycleTime);
                                currentHealth = 20; updateStatusUI();
                                appendChat('已设置重生点，并安稳地度过了夜晚。');
                                if (window.awardAchievement) window.awardAchievement('sweet_dreams');
                            };
                            const overlay = document.getElementById('portal-overlay');
                            if (overlay) {
                                const prevBg = overlay.style.background;
                                const prevTransition = overlay.style.transition;
                                overlay.style.background = 'black';
                                overlay.style.transition = 'opacity 0.22s';
                                overlay.style.opacity = '0.9';
                                setTimeout(() => {
                                    doSleep();
                                    setTimeout(() => {
                                        overlay.style.opacity = '0';
                                        setTimeout(() => {
                                            overlay.style.background = prevBg || 'purple';
                                            overlay.style.transition = prevTransition || 'opacity 0.1s';
                                        }, 240);
                                    }, 120);
                                }, 240);
                            } else {
                                doSleep();
                            }
                        } else {
                            appendChat('已设置重生点，只能在夜间睡觉。');
                        }
                        return;
                    }
                    if (clickedBlock === 'door_top' || clickedBlock === 'door_bottom' || clickedBlock === 'door_top_open' || clickedBlock === 'door_bottom_open') {
                        const clickedFull = getFullBlock(cbx, cby, cbz) || clickedBlock;
                        const facing = window.getTypeFacing ? window.getTypeFacing(clickedFull) : null;
                        const suffix = facing ? `_${facing}` : '';
                        const isTop = (clickedBlock === 'door_top' || clickedBlock === 'door_top_open');
                        const isOpen = (clickedBlock === 'door_top_open' || clickedBlock === 'door_bottom_open');
                        const otherY = isTop ? cby - 1 : cby + 1;
                        if (!isOpen) {
                            setBlock(cbx, cby, cbz, (isTop ? 'door_top_open' : 'door_bottom_open') + suffix);
                            setBlock(cbx, otherY, cbz, (isTop ? 'door_bottom_open' : 'door_top_open') + suffix);
                        } else {
                            setBlock(cbx, cby, cbz, (isTop ? 'door_top' : 'door_bottom') + suffix);
                            setBlock(cbx, otherY, cbz, (isTop ? 'door_bottom' : 'door_top') + suffix);
                        }
                        return;
                    }
                    if (clickedBlock === 'oak_fence_gate' || clickedBlock === 'oak_fence_gate_open') {
                        const isCurrentlyOpen = (clickedBlock === 'oak_fence_gate_open');
                        setBlock(cbx, cby, cbz, isCurrentlyOpen ? 'oak_fence_gate' : 'oak_fence_gate_open');
                        return;
                    }
                    if (clickedBlock === 'chest') {
                        const neighbors = [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1]];
                        let pairedPos = null;
                        for (const [dx, dy, dz] of neighbors) { if (getBlock(cbx + dx, cby + dy, cbz + dz) === 'chest') { pairedPos = { x: cbx + dx, y: cby + dy, z: cbz + dz }; break; } }
                        let chestKey = `${cbx},${cby},${cbz}`;
                        let slotCount = 27;
                        if (pairedPos) {
                            const positions = [ {x: cbx, y: cby, z: cbz}, pairedPos ].sort((a,b) => (a.x - b.x) || (a.y - b.y) || (a.z - b.z));
                            chestKey = `large:${positions[0].x},${positions[0].y},${positions[0].z}_${positions[1].x},${positions[1].y},${positions[1].z}`;
                            slotCount = 54;
                        }
                        if (!window.chestInventories[chestKey]) window.chestInventories[chestKey] = new Array(slotCount).fill(null);
                        invState.chest = window.chestInventories[chestKey];
                        craftingMode = 5; isInventoryOpen = true; controls.unlock(); return;
                    }
                }

                if (!activeItem || activeItem.count <= 0) return;
                if (window.canUseItemType && !window.canUseItemType(activeItem.type)) {
                    appendChat('1.00 更新未开启，无法使用该物品');
                    return;
                }
                const spawnEggHandlers = {
                    pig_spawn_egg: (x, z, y) => { spawnPig(x, z, y); return true; },
                    cow_spawn_egg: (x, z, y) => { spawnCow(x, z, y); return true; },
                    zombie_spawn_egg: (x, z, y) => { spawnZombie(x, z, y); return true; },
                    spider_spawn_egg: (x, z, y) => { spawnSpider(x, z, y); return true; },
                    blaze_spawn_egg: (x, z, y) => { spawnBlaze(x, z, y); return true; },
                    enderman_spawn_egg: (x, z, y) => { spawnEnderman(x, z, y); return true; },
                    villager_spawn_egg: (x, z, y) => {
                        if (typeof window.spawnVillager !== 'function') return false;
                        window.spawnVillager(x, z, y);
                        return true;
                    },
                    dragon_spawn_egg: (x, z, y) => {
                        if (entities.some(e => e.type === 'dragon')) return false;
                        spawnEnderDragon();
                        const dragon = entities.find(e => e.type === 'dragon');
                        if (dragon && dragon.mesh) dragon.mesh.position.set(x, Math.max(y + 42, 40), z);
                        return true;
                    }
                };
                const spawnWithEgg = spawnEggHandlers[activeItem.type];
                if (spawnWithEgg) {
                    const blockHit = intersects.find(intersect => {
                        let current = intersect.object;
                        while (current) {
                            if (mobMeshes.includes(current)) return false;
                            current = current.parent;
                        }
                        return true;
                    });
                    if (!blockHit) return;
                    const p = blockHit.point.clone().sub(blockHit.face.normal.clone().multiplyScalar(0.01));
                    const bx = Math.floor(p.x); const by = Math.floor(p.y); const bz = Math.floor(p.z);
                    const spawnX = bx + Math.round(blockHit.face.normal.x);
                    const spawnY = by + Math.round(blockHit.face.normal.y);
                    const spawnZ = bz + Math.round(blockHit.face.normal.z);
                    const spawnBlock = getBlock(spawnX, spawnY, spawnZ);
                    if (spawnBlock && spawnBlock !== 'water' && spawnBlock !== 'tall_grass') {
                        appendChat('这里无法使用刷怪蛋。');
                        return;
                    }
                    if (!spawnWithEgg(spawnX + 0.5, spawnZ + 0.5, spawnY)) {
                        appendChat('刷怪蛋使用失败。');
                        return;
                    }
                    actionType = 'swing';
                    actionTimer = 0.3;
                    if (gameMode !== 0) {
                        activeItem.count--;
                        if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null;
                    }
                    renderInventoryUI();
                    return;
                }
                if (activeItem.type === 'bow') {
                    let hasArrow = (gameMode === 0);
                    let arrowSlot = -1;
                    let arrowContainer = null;
                    if (!hasArrow) {
                        for (let i = 0; i < 9; i++) if (invState.hotbar[i] && invState.hotbar[i].type === 'arrow') { hasArrow = true; arrowSlot = i; arrowContainer = invState.hotbar; break; }
                        if (!hasArrow) for (let i = 0; i < 45; i++) if (invState.main[i] && invState.main[i].type === 'arrow') { hasArrow = true; arrowSlot = i; arrowContainer = invState.main; break; }
                    }
                    if (hasArrow) {
                        actionType = 'swing';
                        actionTimer = 0.3;
                        spawnArrow(camera.position, raycaster.ray.direction);
                        if (gameMode !== 0 && arrowContainer) {
                            arrowContainer[arrowSlot].count--;
                            if (arrowContainer[arrowSlot].count <= 0) arrowContainer[arrowSlot] = null;
                        }
                        renderInventoryUI();
                    }
                    return;
                }
                if (ITEMS[activeItem.type] && ITEMS[activeItem.type].type === 'food') { if (currentHunger < 20) { currentHunger = Math.min(20, currentHunger + ITEMS[activeItem.type].hungerRestore); updateStatusUI(); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); actionType = 'eat'; actionTimer = 0.5; } return; }
                if (intersects.length > 0 && !mobMeshes.includes(intersects[0].object)) {
                    const intersect = intersects[0]; const placeType = activeItem.type; const hitBlockPos = window.getIntersectBlockCoords ? window.getIntersectBlockCoords(intersect) : null; const p = hitBlockPos ? null : intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1)); const bx = hitBlockPos ? hitBlockPos.x : Math.floor(p.x); const by = hitBlockPos ? hitBlockPos.y : Math.floor(p.y); const bz = hitBlockPos ? hitBlockPos.z : Math.floor(p.z);
                    if (getBlock(bx, by, bz) === 'end_portal_frame_empty' && activeItem.type === 'ender_eye') { setBlock(bx, by, bz, 'end_portal_frame_filled'); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); let filledCount = 0; for (let ix = 62; ix <= 66; ix++) for (let iz = 62; iz <= 66; iz++) if (getBlock(ix, by, iz) === 'end_portal_frame_filled') filledCount++; if (filledCount >= 12) { for (let ix = 63; ix <= 65; ix++) for (let iz = 63; iz <= 65; iz++) setBlock(ix, by, iz, 'end_portal'); } return; }
                    if (placeType === 'flint_and_steel' && getBlock(bx, by, bz) === 'obsidian') { actionType = 'swing'; actionTimer = 0.3; if (intersect.face.normal.y > 0.5) { for (let dy = 1; dy <= 3; dy++) setBlock(bx, by + dy, bz, 'nether_portal'); } else { const nx = bx + Math.round(intersect.face.normal.x); const ny = by + Math.round(intersect.face.normal.y); const nz = bz + Math.round(intersect.face.normal.z); for (let dy = 0; dy <= 2; dy++) setBlock(nx, ny + dy, nz, 'nether_portal'); } return; }
                    if (placeType === 'door') {
                        const newBx = bx + Math.round(intersect.face.normal.x); const newBy = by + Math.round(intersect.face.normal.y); const newBz = bz + Math.round(intersect.face.normal.z);
                        if ((getBlock(newBx, newBy, newBz) && getBlock(newBx, newBy, newBz) !== 'water' && getBlock(newBx, newBy, newBz) !== 'lava') || (getBlock(newBx, newBy + 1, newBz) && getBlock(newBx, newBy + 1, newBz) !== 'water' && getBlock(newBx, newBy + 1, newBz) !== 'lava')) { appendChat('空间不足，无法放置门。'); return; }
                        const camPos = camera.position; const epsilon = 0.001; const pMinX = camPos.x - 0.28 + epsilon; const pMaxX = camPos.x + 0.28 - epsilon; const pMinY = camPos.y - 1.55 + epsilon; const pMaxY = camPos.y + 0.19 - epsilon; const pMinZ = camPos.z - 0.28 + epsilon; const pMaxZ = camPos.z + 0.28 - epsilon;
                        const intersectPlayer = (x, y, z) => !(pMaxX <= x || pMinX >= x + 1 || pMaxY <= y || pMinY >= y + 1 || pMaxZ <= z || pMinZ >= z + 1);
                        if (intersectPlayer(newBx, newBy, newBz) || intersectPlayer(newBx, newBy + 1, newBz)) return;
                        let dir = new THREE.Vector3(); camera.getWorldDirection(dir);
                        const facing = window.getFacingFromDelta ? window.getFacingFromDelta(dir.x, dir.z) : (Math.abs(dir.x) >= Math.abs(dir.z) ? (dir.x >= 0 ? 'east' : 'west') : (dir.z >= 0 ? 'south' : 'north'));
                        const doorBottomType = window.withFacing ? window.withFacing('door_bottom', facing) : `door_bottom_${facing}`;
                        const doorTopType = window.withFacing ? window.withFacing('door_top', facing) : `door_top_${facing}`;
                        setBlock(newBx, newBy, newBz, doorBottomType); setBlock(newBx, newBy + 1, newBz, doorTopType);
                        if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; }
                        renderInventoryUI(); return;
                    }
                    if (placeType === 'chest') {
                        const newBx = bx + Math.round(intersect.face.normal.x); const newBy = by + Math.round(intersect.face.normal.y); const newBz = bz + Math.round(intersect.face.normal.z);
                        const neighbors = [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1]];
                        let chestNeighbors = 0; let foundNeighbor = null;
                        for (const [dx, dy, dz] of neighbors) { if (getBlock(newBx + dx, newBy, newBz + dz) === 'chest') { chestNeighbors++; foundNeighbor = { x: newBx + dx, y: newBy, z: newBz + dz }; } }
                        if (chestNeighbors > 1) { appendChat('无法在此放置箱子（附近已有多个箱子）。'); return; }
                        if (chestNeighbors === 1) { let neighborChestNeighbors = 0; for (const [dx, dy, dz] of neighbors) { if ((foundNeighbor.x + dx !== newBx || foundNeighbor.z + dz !== newBz) && getBlock(foundNeighbor.x + dx, foundNeighbor.y, foundNeighbor.z + dz) === 'chest') { neighborChestNeighbors++; } } if (neighborChestNeighbors > 0) { appendChat('无法在此放置箱子（目标箱子已配对）。'); return; } }
                    }
                    if (ITEMS[placeType].type === 'block') { const newBx = bx + Math.round(intersect.face.normal.x); const newBy = by + Math.round(intersect.face.normal.y); const newBz = bz + Math.round(intersect.face.normal.z); const newBlock = getBlock(newBx, newBy, newBz); const camPos = camera.position; const epsilon = 0.001; const pMinX = camPos.x - 0.28 + epsilon; const pMaxX = camPos.x + 0.28 - epsilon; const pMinY = camPos.y - 1.55 + epsilon; const pMaxY = camPos.y + 0.19 - epsilon; const pMinZ = camPos.z - 0.28 + epsilon; const pMaxZ = camPos.z + 0.28 - epsilon; const bMinX = newBx; const bMaxX = newBx + 1; const bMinY = newBy; const bMaxY = newBy + 1; const bMinZ = newBz; const bMaxZ = newBz + 1; const playerIntersecting = !(pMaxX <= bMinX || pMinX >= bMaxX || pMaxY <= bMinY || pMinY >= bMaxY || pMaxZ <= bMinZ || pMinZ >= bMaxZ); if ((!newBlock || newBlock === 'water' || newBlock === 'lava') && (!playerIntersecting || placeType === 'tall_grass' || placeType === 'torch')) { if (placeType === 'bed') { let dir = new THREE.Vector3(); camera.getWorldDirection(dir); let dx = 0, dz = 0; if (Math.abs(dir.x) > Math.abs(dir.z)) dx = dir.x > 0 ? 1 : -1; else dz = dir.z > 0 ? 1 : -1; const headX = newBx + dx; const headZ = newBz + dz; const headBlock = getBlock(headX, newBy, headZ); if (!headBlock || headBlock === 'water' || headBlock === 'lava') { const bedFacing = window.getFacingFromDelta ? window.getFacingFromDelta(dx, dz) : (Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 'east' : 'west') : (dz >= 0 ? 'south' : 'north')); const bedFootType = window.withFacing ? window.withFacing('bed_foot', bedFacing) : `bed_foot_${bedFacing}`; const bedHeadType = window.withFacing ? window.withFacing('bed_head', bedFacing) : `bed_head_${bedFacing}`; setBlock(newBx, newBy, newBz, bedFootType); setBlock(headX, newBy, headZ, bedHeadType); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); } else { appendChat('空间不足，无法放下床。'); } return; } let finalPlaceType = placeType; if (placeType.endsWith('_stairs')) { let dir = new THREE.Vector3(); camera.getWorldDirection(dir); const stairFacing = window.getFacingFromDelta ? window.getFacingFromDelta(dir.x, dir.z) : (Math.abs(dir.x) >= Math.abs(dir.z) ? (dir.x >= 0 ? 'east' : 'west') : (dir.z >= 0 ? 'south' : 'north')); finalPlaceType = window.withFacing ? window.withFacing(placeType, stairFacing) : `${placeType}_${stairFacing}`; } setBlock(newBx, newBy, newBz, finalPlaceType); if (window.isStairType && window.isStairType(finalPlaceType)) updateNearbyStairCorners(newBx, newBy, newBz); if (window.awardAchievement) { if (placeType === 'crafting_table') window.awardAchievement('benchmarking'); else if (placeType === 'furnace') window.awardAchievement('hot_topic'); else if (placeType === 'chest') window.awardAchievement('treasure'); } if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); } return; }
                }
                if (activeItem.type === 'ender_eye' && currentDimension === 'overworld') { actionType = 'swing'; actionTimer = 0.3; spawnEnderEyeEntity(camera.position.x, camera.position.y, camera.position.z); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); return; }
            }
            else if (event.button === 0) {
                actionType = 'swing'; actionTimer = 0.3;
                if (intersects.length > 0) {
                    const intersect = intersects[0]; 
                    
                    // 检查是否点击了生物
                    let hitMob = null; 
                    for (let e of entities) { 
                        if (!e.mesh) continue;
                        let current = intersect.object;
                        while (current) {
                            if (current === e.mesh) { hitMob = e; break; }
                            current = current.parent;
                        }
                        if (hitMob) break;
                    }

                    if (hitMob) {
                        const heldItem = invState.hotbar[currentSlotIndex];
                        const heldDef = heldItem ? ITEMS[heldItem.type] : null;
                        let dmg = heldDef && heldDef.damage ? heldDef.damage : 1;
                        hitMob.hp -= dmg;
                        hitMob.lastDamageSource = 'player';
                        hitMob.redTimer = 0.3;
                        hitMob.mesh.traverse(c => { 
                            if (c.isMesh && c.material) {
                                if (Array.isArray(c.material)) {
                                    c.material.forEach(m => { if (m && m.emissive) m.emissive.setHex(0xaa0000); });
                                } else if (c.material.emissive) {
                                    c.material.emissive.setHex(0xaa0000);
                                }
                            } 
                        });
                        
                        const hitPos = intersect.point;
                        for (let i = 0; i < 8; i++) {
                            const pPos = hitPos.clone().add(new THREE.Vector3(
                                (Math.random() - 0.5) * 0.4,
                                (Math.random() - 0.5) * 0.4,
                                (Math.random() - 0.5) * 0.4
                            ));
                            const vel = new THREE.Vector3(
                                (Math.random() - 0.5) * 3,
                                Math.random() * 3 + 1,
                                (Math.random() - 0.5) * 3
                            );
                            if (window.spawnParticle) window.spawnParticle(pPos, 0xbf1515, 0.08 + Math.random() * 0.06, vel, 0.4 + Math.random() * 0.3);
                        }

                        if (hitMob.type === 'crystal') hitMob.hp = 0;
                        else if (hitMob.type !== 'dragon' && window.reactMobToDamage) window.reactMobToDamage(hitMob, camera.position);
                        
                        return;
                    }

                    // 方块破坏判定
                    const hitBlockPos = window.getIntersectBlockCoords ? window.getIntersectBlockCoords(intersect) : null; const p = hitBlockPos ? null : intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.01)); 
                    const bx = hitBlockPos ? hitBlockPos.x : Math.floor(p.x); const by = hitBlockPos ? hitBlockPos.y : Math.floor(p.y); const bz = hitBlockPos ? hitBlockPos.z : Math.floor(p.z); 
                    const bt = getBlock(bx, by, bz); 
                    
                    if (bt === 'end_portal' || bt === 'nether_portal' || bt === 'return_portal' || bt === 'end_portal_frame_empty') return;
                    
                    if (gameMode === 0) {
                        window.isLeftMouseDown = true;
                        isMining = false;
                        miningTime = 0;
                        return;
                    }
                    
                    isMining = true; miningTime = 0;
                }
            }
        });

        document.addEventListener('mouseup', (event) => { if (event.button === 0) { isMining = false; miningTime = 0; highlightBox.scale.setScalar(1); } });
        let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
        const commandHistory = []; let historyIndex = -1;
        const availableCommands = ['/gamemode', '/time', '/summon', '/setblock', '/tp'];
        
        let f3Pressed = false;
        const onKeyDown = function (event) {
            if (event.code === 'F3') { f3Pressed = true; event.preventDefault(); return; }
            if (event.code === 'F4') {
                if (f3Pressed) {
                    event.preventDefault();
                    let nextMode;
                    if (gameMode === 1) nextMode = 'creative';
                    else if (gameMode === 0) nextMode = 'spectator';
                    else nextMode = 'survival';
                    handleCommand(`/gamemode ${nextMode}`);
                    return;
                }
            }
            if (isGameClear) { if (event.code === 'Space' || event.code === 'Escape') { isGameClear = false; document.getElementById('win-screen').style.display = 'none'; if (winScroller) clearInterval(winScroller); document.getElementById('credits-content').style.transform = `translateY(0px)`; switchDimension('overworld'); camera.position.set(0, 100, 0); dimensionState.overworld.playerPos = camera.position.clone(); velocity.set(0, 0, 0); highestY = 100; isFalling = false; isFlying = false; isSpawnImmunity = true; playerInvulnTimer = 5.0; jumpPressed = false; controls.lock(); } return; }
            if (isDead) return;
            if (event.code === 'KeyT' || event.code === 'Slash') { if (controls.isLocked) { controls.unlock(); isChatOpen = true; chatContainer.classList.add('active'); chatInput.focus(); if (event.code === 'Slash') { chatInput.value = '/'; } else { event.preventDefault(); } return; } }
            
            if (isChatOpen) { 
                if (event.code === 'Enter') { 
                    const val = chatInput.value.trim();
                    if (val !== '') { 
                        handleCommand(val); 
                        if (commandHistory[0] !== val) commandHistory.unshift(val); 
                    } 
                    historyIndex = -1; chatInput.value = ''; chatContainer.classList.remove('active'); isChatOpen = false; controls.lock(); 
                } else if (event.code === 'Escape') { 
                    historyIndex = -1; chatInput.value = ''; chatContainer.classList.remove('active'); isChatOpen = false; controls.lock(); 
                } else if (event.code === 'ArrowUp') {
                    if (historyIndex < commandHistory.length - 1) { historyIndex++; chatInput.value = commandHistory[historyIndex]; }
                    event.preventDefault();
                } else if (event.code === 'ArrowDown') {
                    if (historyIndex > 0) { historyIndex--; chatInput.value = commandHistory[historyIndex]; }
                    else { historyIndex = -1; chatInput.value = ''; }
                    event.preventDefault();
                } else if (event.code === 'Tab') {
                    event.preventDefault();
                    const text = chatInput.value;
                    const parts = text.split(' ');
                    const lastPart = parts[parts.length - 1].toLowerCase();
                    
                    let pool = [];
                    if (parts.length === 1) pool = availableCommands;
                    else if (parts[0] === '/setblock' && parts.length === 5) pool = blockTypes;
                    else if (parts[0] === '/summon' && parts.length === 2) pool = ['pig', 'zombie', 'spider', 'blaze', 'enderman', 'villager', 'crystal', 'dragon'];
                    else if (parts[0] === '/gamemode' && parts.length === 2) pool = ['creative', 'survival', 'spectator'];
                    else if (parts[0] === '/time' && parts.length === 2) pool = ['set', 'add'];
                    else if (parts[0] === '/time' && parts[1] === 'set' && parts.length === 3) pool = ['day', 'night'];
                    
                    const matches = pool.filter(item => item.startsWith(lastPart));
                    if (matches.length > 0) {
                        // Stepwise completion: first extend to common prefix, then cycle full candidates.
                        const isExact = matches.includes(lastPart);
                        if (!isExact && matches.length > 1) {
                            let prefix = matches[0];
                            for (let i = 1; i < matches.length; i++) {
                                const s = matches[i];
                                let j = 0;
                                while (j < prefix.length && j < s.length && prefix[j] === s[j]) j++;
                                prefix = prefix.slice(0, j);
                                if (prefix.length === 0) break;
                            }
                            parts[parts.length - 1] = prefix.length > lastPart.length ? prefix : parts[parts.length - 1];
                        } else {
                            const startIdx = Math.max(0, matches.indexOf(parts[parts.length - 1]));
                            const nextMatch = matches[(startIdx + 1) % matches.length] || matches[0];
                            parts[parts.length - 1] = nextMatch;
                        }
                        chatInput.value = parts.join(' ');
                    }
                }
                return; 
            }
            if (event.code === 'KeyE') {
                if (controls.isLocked) {
                    craftingMode = 2;
                    isInventoryOpen = true;
                    renderInventoryUI();
                    controls.unlock();
                } else if (isInventoryOpen) {
                    controls.lock();
                }
                return;
            }
            if (event.code === 'KeyL') {
                const achScreen = document.getElementById('achievements-screen');
                const pauseScreen = document.getElementById('pause-screen');
                if (controls.isLocked) {
                    window.openedAchievementsFromPause = false;
                    controls.unlock();
                    setTimeout(() => {
                        pauseScreen.style.display = 'none';
                        achScreen.style.display = 'flex';
                        if (window.renderAchievementsList) window.renderAchievementsList();
                    }, 50);
                } else if (achScreen.style.display === 'flex') {
                    achScreen.style.display = 'none';
                    if (window.openedAchievementsFromPause) {
                        pauseScreen.style.display = 'flex';
                    } else {
                        controls.lock();
                    }
                }
                return;
            }
            if (isInventoryOpen) return;
            if ((event.code === 'ControlLeft' || event.code === 'ControlRight') && controls.isLocked && !event.repeat) {
                sprintEnabled = !sprintEnabled;
                event.preventDefault();
                return;
            }
            if (event.code.startsWith('Digit')) { const digit = parseInt(event.code.replace('Digit', '')); if (digit >= 1 && digit <= 9) { currentSlotIndex = digit - 1; renderInventoryUI(); } }
            
            // Q键丢弃物品逻辑
            if (event.code === 'KeyQ' && controls.isLocked) {
                const item = invState.hotbar[currentSlotIndex];
                if (item && item.count > 0) {
                    const dropPos = camera.position.clone();
                    const dir = new THREE.Vector3();
                    camera.getWorldDirection(dir);
                    const throwVel = dir.clone().multiplyScalar(10).add(new THREE.Vector3(0, 2, 0));
                    spawnDroppedItem(dropPos.x, dropPos.y - 0.5, dropPos.z, item.type, 1, throwVel);
                    item.count--;
                    if (item.count <= 0) invState.hotbar[currentSlotIndex] = null;
                    renderInventoryUI();
                }
            }

            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    moveRight = true;
                    break;
                case 'Space':
                    jumpPressed = true;
                    if (!event.repeat) {
                        const now = performance.now();
                        if (now - lastSpacePress < 300 && gameMode === 0) {
                            isFlying = !isFlying;
                            velocity.y = 0;
                        }
                        lastSpacePress = now;
                    }
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    shiftPressed = true;
                    break;
            }
        };
        const onKeyUp = function (event) {
            if (event.code === 'F3' || event.code === 'F4') {
                if (event.code === 'F3') f3Pressed = false;
                event.preventDefault();
                return;
            }
            switch (event.code) { case 'ArrowUp': case 'KeyW': moveForward = false; break; case 'ArrowLeft': case 'KeyA': moveLeft = false; break; case 'ArrowDown': case 'KeyS': moveBackward = false; break; case 'ArrowRight': case 'KeyD': moveRight = false; break; case 'Space': jumpPressed = false; break; case 'ShiftLeft': case 'ShiftRight': shiftPressed = false; break; }
        };
        document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp);

        function checkCollisionGeneric(x, y, z, radius, height) { 
            const epsilon = 0.001; 
            const pMinX = x - radius + epsilon; const pMaxX = x + radius - epsilon;
            const pMinY = y + epsilon; const pMaxY = y + height - epsilon;
            const pMinZ = z - radius + epsilon; const pMaxZ = z + radius - epsilon;
            
            const minX = Math.floor(pMinX); const maxX = Math.floor(pMaxX); 
            const minY = Math.floor(pMinY); const maxY = Math.floor(pMaxY); 
            const minZ = Math.floor(pMinZ); const maxZ = Math.floor(pMaxZ); 
            
            for (let i = minX; i <= maxX; i++) { 
                for (let j = minY; j <= Math.min(maxY, 100); j++) { 
                    for (let k = minZ; k <= maxZ; k++) { 
                        const b = getBlock(i, j, k); 
                        if (b && !['nether_portal', 'end_portal', 'return_portal', 'water', 'lava', 'tall_grass', 'end_rod', 'torch', 'door_top_open', 'door_bottom_open', 'oak_fence_gate_open'].includes(b)) {
                            let bHeight = 1.0;
                            if (b.endsWith('_slab') || b.endsWith('_stairs')) {
                                bHeight = 0.5;
                            } else if (b === 'oak_fence' || b === 'oak_fence_gate') {
                                bHeight = 1.5;
                            }
                            const bMinY = j;
                            const bMaxY = j + bHeight;
                            if (pMinY < bMaxY && pMaxY > bMinY) {
                                return true;
                            }
                        } 
                    } 
                } 
            } return false; 
        }

        function getLandingY(x, y, z, radius, height) {
            const epsilon = 0.001; 
            const pMinX = x - radius + epsilon; const pMaxX = x + radius - epsilon;
            const pMinY = y + epsilon; const pMaxY = y + height - epsilon;
            const pMinZ = z - radius + epsilon; const pMaxZ = z + radius - epsilon;
            
            const minX = Math.floor(pMinX); const maxX = Math.floor(pMaxX); 
            const minY = Math.floor(pMinY) - 1; const maxY = Math.floor(pMaxY); 
            const minZ = Math.floor(pMinZ); const maxZ = Math.floor(pMaxZ); 
            
            let landingY = y;
            let found = false;
            for (let i = minX; i <= maxX; i++) { 
                for (let j = minY; j <= Math.min(maxY, 100); j++) { 
                    for (let k = minZ; k <= maxZ; k++) { 
                        const b = getBlock(i, j, k); 
                        if (b && !['nether_portal', 'end_portal', 'return_portal', 'water', 'lava', 'tall_grass', 'end_rod', 'torch', 'door_top_open', 'door_bottom_open', 'oak_fence_gate_open'].includes(b)) {
                            let bHeight = 1.0;
                            if (b.endsWith('_slab') || b.endsWith('_stairs')) {
                                bHeight = 0.5;
                            } else if (b === 'oak_fence' || b === 'oak_fence_gate') {
                                bHeight = 1.5;
                            }
                            const bMinY = j;
                            const bMaxY = j + bHeight;
                            if (pMinY < bMaxY && pMaxY > bMinY) {
                                if (!found || bMaxY > landingY) {
                                    landingY = bMaxY;
                                    found = true;
                                }
                            }
                        }
                    }
                }
            }
            return found ? landingY : null;
        }
        // 修复：点击回到游戏按钮时显式锁定鼠标并关闭 UI
        document.getElementById('btn-resume').addEventListener('click', () => {
            controls.lock();
        });

        // --- 新增：画质与选项逻辑 ---
        document.getElementById('btn-toggle-water')?.addEventListener('click', () => {
            const nextVal = (window.waterQuality + 1) % 2;
            window.updateWaterQuality(nextVal);
        });

        // 初始设置光影按钮文本
        const shadowBtn = document.getElementById('btn-toggle-shadows');
        if (shadowBtn) {
            shadowBtn.innerText = `超强光影: ${window.shadowsEnabled ? '开' : '关'}`;
        }

        document.getElementById('btn-toggle-shadows')?.addEventListener('click', () => {
            window.updateShadows(!window.shadowsEnabled);
        });

        document.getElementById('btn-save-options')?.addEventListener('click', async () => {
            if (window.shadowToggleChanged) {
                window.shadowToggleChanged = false;
                if (isPlaying && typeof saveGame === 'function') {
                    const saveIndicator = document.createElement('div');
                    saveIndicator.style.position = 'fixed';
                    saveIndicator.style.top = '20px';
                    saveIndicator.style.left = '50%';
                    saveIndicator.style.transform = 'translateX(-50%)';
                    saveIndicator.style.background = 'rgba(0, 0, 0, 0.8)';
                    saveIndicator.style.color = '#fff';
                    saveIndicator.style.padding = '10px 20px';
                    saveIndicator.style.border = '2px solid #55ff55';
                    saveIndicator.style.fontFamily = 'monospace';
                    saveIndicator.style.zIndex = '99999';
                    saveIndicator.innerText = '正在保存世界并应用超强光影...';
                    document.body.appendChild(saveIndicator);
                    try {
                        await saveGame();
                    } catch (e) {
                        console.error(e);
                    }
                }
                location.reload();
            }
        });

        // --- 触屏控制逻辑 ---
        let touchLookId = null;
        let lastTouchX, lastTouchY;
        let joystickTouchId = null;
        let joystickCenter = { x: 0, y: 0 };
        const joystickStick = document.getElementById('touch-joystick-stick');
        const joystickBase = document.getElementById('touch-joystick-base');

        function updateJoystick(touch) {
            if (!joystickCenter.x) {
                const rect = joystickBase.getBoundingClientRect();
                joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
            const dx = touch.clientX - joystickCenter.x;
            const dy = touch.clientY - joystickCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 60;
            const ratio = Math.min(dist, maxDist) / maxDist;
            const angle = Math.atan2(dy, dx);

            const moveX = Math.cos(angle) * ratio * maxDist;
            const moveY = Math.sin(angle) * ratio * maxDist;

            joystickStick.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

            // 映射到移动变量
            const deadzone = 0.2;
            const vx = Math.cos(angle) * ratio;
            const vy = Math.sin(angle) * ratio;

            moveForward = vy < -deadzone;
            moveBackward = vy > deadzone;
            moveLeft = vx < -deadzone;
            moveRight = vx > deadzone;
        }

        joystickBase.addEventListener('pointerdown', (e) => {
            if (!isTouchControlsEnabled) return;
            joystickTouchId = e.pointerId;
            const rect = joystickBase.getBoundingClientRect();
            joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            updateJoystick(e);
            joystickBase.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        document.addEventListener('pointermove', (e) => {
            if (!isTouchControlsEnabled) return;
            if (e.pointerId === joystickTouchId) {
                updateJoystick(e);
            } else if (e.pointerId === touchLookId) {
                const dx = e.clientX - lastTouchX;
                const dy = e.clientY - lastTouchY;
                
                const totalDist = Math.abs(e.clientX - touchLookStartX) + Math.abs(e.clientY - touchLookStartY);
                if (totalDist > 10 && !touchIsMining) {
                    touchLookMoved = true;
                    clearTimeout(touchHoldTimer);
                }

                // 模拟视角转动
                camera.rotation.y -= dx * 0.005;
                camera.rotation.x -= dy * 0.005;
                camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
                
                lastTouchX = e.clientX;
                lastTouchY = e.clientY;
            }
        });

        let touchLookStartX = 0, touchLookStartY = 0;
        let touchLookMoved = false;
        let touchHoldTimer = null;
        let touchIsMining = false;

        function handlePointerUp(e) {
            if (e.pointerId === joystickTouchId) {
                joystickTouchId = null;
                joystickStick.style.transform = `translate(-50%, -50%)`;
                moveForward = moveBackward = moveLeft = moveRight = false;
            } else if (e.pointerId === touchLookId) {
                clearTimeout(touchHoldTimer);
                if (!touchLookMoved && !touchIsMining) {
                    // 短按：放置方块或交互 (相当于鼠标右键)
                    const event = new MouseEvent('mousedown', { button: 2, bubbles: true });
                    document.dispatchEvent(event);
                }
                if (touchIsMining) {
                    // 停止挖掘
                    const event = new MouseEvent('mouseup', { button: 0, bubbles: true });
                    document.dispatchEvent(event);
                    touchIsMining = false;
                }
                touchLookId = null;
            }
        }

        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);

        // 视角转动区域 (全屏非按钮区域)
        document.addEventListener('pointerdown', (e) => {
            if (!isTouchControlsEnabled || !isPlaying || !controls.isLocked) return;
            if (e.target.closest && (e.target.closest('#touch-joystick-container') || e.target.closest('.touch-button'))) return;
            
            if (touchLookId === null && e.pointerId !== joystickTouchId) {
                touchLookId = e.pointerId;
                lastTouchX = e.clientX;
                lastTouchY = e.clientY;
                touchLookStartX = e.clientX;
                touchLookStartY = e.clientY;
                touchLookMoved = false;
                touchIsMining = false;

                // 设置长按定时器
                touchHoldTimer = setTimeout(() => {
                    if (!touchLookMoved) {
                        touchIsMining = true;
                        // 触发长按挖掘 (相当于鼠标左键按住)
                        const event = new MouseEvent('mousedown', { button: 0, bubbles: true });
                        document.dispatchEvent(event);
                    }
                }, 300); // 300ms 判定为长按
            }
        });

        // 按钮点击逻辑 (使用 pointer 事件增强兼容性)
        document.getElementById('touch-btn-jump').addEventListener('pointerdown', (e) => { jumpPressed = true; e.preventDefault(); });
        document.getElementById('touch-btn-jump').addEventListener('pointerup', (e) => { jumpPressed = false; e.preventDefault(); });
        document.getElementById('touch-btn-jump').addEventListener('pointercancel', (e) => { jumpPressed = false; e.preventDefault(); });
        
        document.getElementById('touch-btn-sneak').addEventListener('pointerdown', (e) => { shiftPressed = true; e.preventDefault(); });
        document.getElementById('touch-btn-sneak').addEventListener('pointerup', (e) => { shiftPressed = false; e.preventDefault(); });
        document.getElementById('touch-btn-sneak').addEventListener('pointercancel', (e) => { shiftPressed = false; e.preventDefault(); });

        document.getElementById('touch-btn-inventory').addEventListener('pointerdown', (e) => {
            if (isInventoryOpen) { controls.lock(); }
            else { craftingMode = 2; isInventoryOpen = true; renderInventoryUI(); controls.unlock(); }
            e.preventDefault();
        });

        document.getElementById('touch-btn-place').addEventListener('pointerdown', (e) => {
            const event = new MouseEvent('mousedown', { button: 2, bubbles: true });
            document.dispatchEvent(event);
            e.preventDefault();
        });

        document.getElementById('touch-btn-break').addEventListener('pointerdown', (e) => {
            const event = new MouseEvent('mousedown', { button: 0, bubbles: true });
            document.dispatchEvent(event);
            e.preventDefault();
        });
        document.getElementById('touch-btn-break').addEventListener('pointerup', (e) => {
            const event = new MouseEvent('mouseup', { button: 0, bubbles: true });
            document.dispatchEvent(event);
            e.preventDefault();
        });
        document.getElementById('touch-btn-break').addEventListener('pointercancel', (e) => {
            const event = new MouseEvent('mouseup', { button: 0, bubbles: true });
            document.dispatchEvent(event);
            e.preventDefault();
        });

        document.getElementById('touch-btn-pause').addEventListener('pointerdown', (e) => {
            controls.unlock();
            e.preventDefault();
        });

        const btnCloseInv = document.getElementById('btn-close-inventory');
        if (btnCloseInv) {
            btnCloseInv.addEventListener('pointerdown', (e) => {
                if (isInventoryOpen) controls.lock();
                e.preventDefault();
            });
        }

        document.getElementById('btn-toggle-touch').addEventListener('click', () => {
            updateTouchControls(!isTouchControlsEnabled);
        });
        
        let touchLocked = false;
        const originalLock = controls.lock;
        controls.lock = function() {
            if (isTouchControlsEnabled) {
                touchLocked = true;
                uiLayer.style.display = 'none';
                pauseScreen.style.display = 'none';
                inventoryUiEl.style.display = 'none';
                document.getElementById('touch-ui').style.display = 'block';
                document.getElementById('crosshair').style.display = 'block';
                hotbarEl.style.display = 'flex';
                if (gameMode !== 0) document.getElementById('status-bars').style.display = 'flex';
                debugUiEl.style.display = 'block';
                controls.dispatchEvent({ type: 'lock' });
                return;
            }
            originalLock.call(controls);
        };
        const originalUnlock = controls.unlock;
        controls.unlock = function() {
            if (isTouchControlsEnabled) {
                touchLocked = false;
                document.getElementById('touch-ui').style.display = 'none';
                controls.dispatchEvent({ type: 'unlock' });
                return;
            }
            originalUnlock.call(controls);
        };

        // 劫持 isLocked 属性，使其在触屏模式下也能返回正确状态
        Object.defineProperty(controls, 'isLocked', {
            get: function() {
                if (isTouchControlsEnabled) return touchLocked;
                // 默认逻辑：检查 pointerLockElement
                return document.pointerLockElement === document.body; 
            },
            configurable: true
        });
        
        // 初始化一次
        updateTouchControls(isTouchControlsEnabled);

        const commandSuggestions = document.getElementById('command-suggestions');
        let currentSuggestionIndex = -1;
        let activeSuggestions = [];

        chatInput.addEventListener('input', () => {
            const text = chatInput.value;
            if (!text.startsWith('/')) {
                commandSuggestions.style.display = 'none';
                return;
            }
            
            const parts = text.split(' ');
            const lastPart = parts[parts.length - 1].toLowerCase();
            let pool = [];
            
            if (parts.length === 1) {
                pool = ['/gamemode', '/time', '/summon', '/setblock', '/tp'];
            } else if (parts[0] === '/gamemode' && parts.length === 2) {
                pool = ['creative', 'survival', 'spectator'];
            } else if (parts[0] === '/time' && parts.length === 2) {
                pool = ['set', 'add'];
            } else if (parts[0] === '/time' && parts[1] === 'set' && parts.length === 3) {
                pool = ['day', 'night'];
            } else if (parts[0] === '/summon' && parts.length === 2) {
                pool = ['pig', 'zombie', 'spider', 'blaze', 'enderman', 'villager', 'crystal', 'dragon'];
            } else if (parts[0] === '/setblock' && parts.length === 5) {
                pool = blockTypes;
            }
            
            activeSuggestions = pool.filter(item => item.startsWith(lastPart));
            
            if (activeSuggestions.length > 0) {
                commandSuggestions.innerHTML = '';
                activeSuggestions.forEach((item, idx) => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerText = item;
                    div.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); }; // Prevent blur
                    div.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        parts[parts.length - 1] = item;
                        chatInput.value = parts.join(' ') + ' ';
                        chatInput.focus();
                        commandSuggestions.style.display = 'none';
                    };
                    commandSuggestions.appendChild(div);
                });
                commandSuggestions.style.display = 'block';
                currentSuggestionIndex = -1;
            } else {
                commandSuggestions.style.display = 'none';
            }
        });

        chatInput.addEventListener('keydown', (e) => {
            if (commandSuggestions.style.display === 'block') {
                const items = commandSuggestions.querySelectorAll('.suggestion-item');
                if (e.code === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (currentSuggestionIndex < items.length - 1) currentSuggestionIndex++;
                    updateSuggestionHighlight(items);
                } else if (e.code === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (currentSuggestionIndex > 0) currentSuggestionIndex--;
                    updateSuggestionHighlight(items);
                } else if (e.code === 'Enter' && currentSuggestionIndex >= 0 && currentSuggestionIndex < activeSuggestions.length) {
                    e.preventDefault();
                    e.stopPropagation();
                    const parts = chatInput.value.split(' ');
                    parts[parts.length - 1] = activeSuggestions[currentSuggestionIndex];
                    chatInput.value = parts.join(' ') + ' ';
                    commandSuggestions.style.display = 'none';
                }
            }
        });

        function updateSuggestionHighlight(items) {
            items.forEach((item, idx) => {
                if (idx === currentSuggestionIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                    item.style.background = 'rgba(255, 255, 255, 0.2)';
                    item.style.color = '#fff';
                } else {
                    item.classList.remove('selected');
                    item.style.background = '';
                    item.style.color = '';
                }
            });
        }
        // ==========================================
