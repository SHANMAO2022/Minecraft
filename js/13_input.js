        // ==========================================
        controls.addEventListener('lock', () => {
            if (isInventoryOpen) { for (let i = 0; i < 9; i++) { if (invState.crafting[i]) { addBlockToInventory(invState.crafting[i].type, invState.crafting[i].count); invState.crafting[i] = null; } } invState.output = null; if (invState.dragged) { addBlockToInventory(invState.dragged.type, invState.dragged.count); invState.dragged = null; } }
            isInventoryOpen = false; isCreativeTabOpen = false; uiLayer.style.display = 'none'; inventoryUiEl.style.display = 'none'; deathScreenEl.style.display = 'none'; tooltipEl.style.display = 'none';
            document.getElementById('crosshair').style.display = 'block'; hotbarEl.style.display = 'flex'; heldItemGroup.visible = true;
            if (gameMode !== 0) document.getElementById('status-bars').style.display = 'flex'; debugUiEl.style.display = 'block'; renderInventoryUI();
        });

        controls.addEventListener('unlock', () => {
            if (isGameClear || isChatOpen) return; heldItemGroup.visible = false; isMining = false; document.getElementById('status-bars').style.display = 'none'; debugUiEl.style.display = 'none';
            if (isDead) { deathScreenEl.style.display = 'flex'; uiLayer.style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; hotbarEl.style.display = 'none'; inventoryUiEl.style.display = 'none'; }
            else if (isInventoryOpen) { inventoryUiEl.style.display = 'flex'; hotbarEl.style.display = 'flex'; uiLayer.style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; }
            else if (isPlaying) { uiLayer.style.display = 'flex'; pauseScreen.style.display = 'flex'; titleScreen.style.display = 'none'; worldSelectScreen.style.display = 'none'; createWorldScreen.style.display = 'none'; document.getElementById('crosshair').style.display = 'none'; hotbarEl.style.display = 'none'; document.getElementById('options-screen').style.display = 'none'; document.getElementById('multiplayer-screen').style.display = 'none'; }
        });
        scene.add(controls.getObject());
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        let isMining = false; let miningTime = 0; let targetBlockKey = null;
        document.addEventListener('wheel', (e) => { if (!controls.isLocked) return; if (e.deltaY > 0) currentSlotIndex = (currentSlotIndex + 1) % 9; else currentSlotIndex = (currentSlotIndex - 1 + 9) % 9; renderInventoryUI(); const activeSlot = document.getElementById(`hotbar-${currentSlotIndex}`); if (activeSlot) hotbarEl.scrollTo({ left: activeSlot.offsetLeft - hotbarEl.offsetWidth / 2 + 24, behavior: 'smooth' }); });

        document.addEventListener('mousedown', (event) => {
            if (isInventoryOpen) { const slotEl = event.target.closest('.slot'); if (slotEl && slotEl.id !== 'dragged-icon') handleSlotClick(slotEl.getAttribute('data-container'), parseInt(slotEl.getAttribute('data-index')), event.button); return; }
            if (!controls.isLocked || isDead || isGameClear) return;
            const activeItem = invState.hotbar[currentSlotIndex];
            if (event.button === 0 && gameMode === 0) { raycaster.setFromCamera(center, camera); const activeMeshes = []; for (const chunk of chunks.values()) blockTypes.forEach(t => { if (chunk.meshes[t].count > 0) activeMeshes.push(chunk.meshes[t]); }); const intersects = raycaster.intersectObjects(activeMeshes); if (intersects.length > 0) { const intersect = intersects[0]; const p = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1)); setBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z), null); actionType = 'swing'; actionTimer = 0.3; } return; }
            raycaster.setFromCamera(center, camera); const activeMeshes = []; for (const chunk of chunks.values()) { blockTypes.forEach(type => { if (type !== 'water' && type !== 'lava' && chunk.meshes[type].count > 0) activeMeshes.push(chunk.meshes[type]); }); }
            const mobMeshes = []; entities.forEach(e => { if (e.mesh && e.mesh.children) mobMeshes.push(...e.mesh.children); }); const intersects = raycaster.intersectObjects([...activeMeshes, ...mobMeshes]);

            if (event.button === 2) {
                if (intersects.length > 0 && !mobMeshes.includes(intersects[0].object)) {
                    const intersect = intersects[0]; const p = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1));
                    const cbx = Math.floor(p.x); const cby = Math.floor(p.y); const cbz = Math.floor(p.z);
                    const clickedBlock = getBlock(cbx, cby, cbz);
                    if (clickedBlock === 'crafting_table') { craftingMode = 3; isInventoryOpen = true; controls.unlock(); return; }
                    if (clickedBlock === 'furnace') { craftingMode = 4; isInventoryOpen = true; controls.unlock(); return; }
                    if (clickedBlock === 'bed' || clickedBlock === 'bed_head' || clickedBlock === 'bed_foot') {
                        spawnPoint = new THREE.Vector3(cbx, cby + 1, cbz);
                        let cycleTime = worldTime % CYCLE_LENGTH;
                        if (cycleTime >= DAY_LENGTH) {
                            worldTime += (CYCLE_LENGTH - cycleTime);
                            currentHealth = 20; updateStatusUI();
                            appendChat('已设置重生点，并安稳地度过了夜晚。');
                        } else {
                            appendChat('已设置重生点，只能在夜间睡觉。');
                        }
                        return;
                    }
                }

                if (!activeItem || activeItem.count <= 0) return;
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
                    const intersect = intersects[0]; const placeType = activeItem.type; const p = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1)); const bx = Math.floor(p.x); const by = Math.floor(p.y); const bz = Math.floor(p.z);
                    if (getBlock(bx, by, bz) === 'end_portal_frame_empty' && activeItem.type === 'ender_eye') { setBlock(bx, by, bz, 'end_portal_frame_filled'); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); let filledCount = 0; for (let ix = 62; ix <= 66; ix++) for (let iz = 62; iz <= 66; iz++) if (getBlock(ix, by, iz) === 'end_portal_frame_filled') filledCount++; if (filledCount >= 12) { for (let ix = 63; ix <= 65; ix++) for (let iz = 63; iz <= 65; iz++) setBlock(ix, by, iz, 'end_portal'); } return; }
                    if (placeType === 'flint_and_steel' && getBlock(bx, by, bz) === 'obsidian') { actionType = 'swing'; actionTimer = 0.3; if (intersect.face.normal.y > 0.5) { for (let dy = 1; dy <= 3; dy++) setBlock(bx, by + dy, bz, 'nether_portal'); } else { const nx = bx + Math.round(intersect.face.normal.x); const ny = by + Math.round(intersect.face.normal.y); const nz = bz + Math.round(intersect.face.normal.z); for (let dy = 0; dy <= 2; dy++) setBlock(nx, ny + dy, nz, 'nether_portal'); } return; }
                    if (ITEMS[placeType].type === 'block') { const newBx = bx + Math.round(intersect.face.normal.x); const newBy = by + Math.round(intersect.face.normal.y); const newBz = bz + Math.round(intersect.face.normal.z); const newBlock = getBlock(newBx, newBy, newBz); const camPos = camera.position; const epsilon = 0.001; const pMinX = camPos.x - 0.28 + epsilon; const pMaxX = camPos.x + 0.28 - epsilon; const pMinY = camPos.y - 1.55 + epsilon; const pMaxY = camPos.y + 0.19 - epsilon; const pMinZ = camPos.z - 0.28 + epsilon; const pMaxZ = camPos.z + 0.28 - epsilon; const bMinX = newBx; const bMaxX = newBx + 1; const bMinY = newBy; const bMaxY = newBy + 1; const bMinZ = newBz; const bMaxZ = newBz + 1; const playerIntersecting = !(pMaxX <= bMinX || pMinX >= bMaxX || pMaxY <= bMinY || pMinY >= bMaxY || pMaxZ <= bMinZ || pMinZ >= bMaxZ); if ((!newBlock || newBlock === 'water' || newBlock === 'lava') && (!playerIntersecting || placeType === 'tall_grass' || placeType === 'torch')) { if (placeType === 'bed') { let dir = new THREE.Vector3(); camera.getWorldDirection(dir); let dx = 0, dz = 0; if (Math.abs(dir.x) > Math.abs(dir.z)) dx = dir.x > 0 ? 1 : -1; else dz = dir.z > 0 ? 1 : -1; const headX = newBx + dx; const headZ = newBz + dz; const headBlock = getBlock(headX, newBy, headZ); if (!headBlock || headBlock === 'water' || headBlock === 'lava') { setBlock(newBx, newBy, newBz, 'bed_foot'); setBlock(headX, newBy, headZ, 'bed_head'); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); } else { appendChat('空间不足，无法放下床。'); } return; } setBlock(newBx, newBy, newBz, placeType); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); } return; }
                }
                if (activeItem.type === 'ender_eye' && currentDimension === 'overworld') { actionType = 'swing'; actionTimer = 0.3; spawnEnderEyeEntity(camera.position.x, camera.position.y, camera.position.z); if (gameMode !== 0) { activeItem.count--; if (activeItem.count <= 0) invState.hotbar[currentSlotIndex] = null; } renderInventoryUI(); return; }
            }
            else if (event.button === 0) {
                actionType = 'swing'; actionTimer = 0.3;
                if (intersects.length > 0) {
                    const intersect = intersects[0]; let hitMob = null; for (let e of entities) { if (e.mesh && e.mesh.children && e.mesh.children.includes(intersect.object)) { hitMob = e; break; } }
                    if (hitMob) {
                        let dmg = (gameMode === 0) ? 999 : 2; hitMob.hp -= dmg;
                        hitMob.mesh.children.forEach(c => { if (c.material && c.material.emissive) c.material.emissive.setHex(0xaa0000); });
                        if (hitMob.type === 'enderman') { if (hitMob.onHit) hitMob.onHit(); } else if (hitMob.type === 'crystal') { hitMob.hp = 0; } else if (hitMob.type !== 'dragon') { const kb = new THREE.Vector3().subVectors(hitMob.mesh.position, camera.position).normalize(); if (hitMob.type === 'pig') { hitMob.target.copy(hitMob.mesh.position).addScaledVector(kb, 3); hitMob.state = 'wander'; hitMob.timer = 2; } else { hitMob.mesh.position.addScaledVector(kb, 1); } }
                        if (hitMob.hp <= 0 && hitMob.type !== 'dragon' && hitMob.type !== 'crystal') { scene.remove(hitMob.mesh); entities.splice(entities.indexOf(hitMob), 1); if (hitMob.type === 'pig' && gameMode === 1) addBlockToInventory('raw_porkchop', 1); else if (hitMob.type === 'zombie' && gameMode === 1) addBlockToInventory('rotten_flesh', 1); else if (hitMob.type === 'enderman' && gameMode === 1) addBlockToInventory('ender_pearl', 1); else if (hitMob.type === 'blaze' && gameMode === 1) addBlockToInventory('blaze_rod', Math.floor(Math.random() * 2) + 2); else if (hitMob.type === 'spider' && gameMode === 1) addBlockToInventory('string', Math.floor(Math.random() * 2) + 5); renderInventoryUI(); } return;
                    }
                    const p = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1)); const bx = Math.floor(p.x); const by = Math.floor(p.y); const bz = Math.floor(p.z); const bt = getBlock(bx, by, bz); if (bt === 'end_portal' || bt === 'nether_portal' || bt === 'return_portal' || bt === 'end_portal_frame_empty') return;
                    isMining = true; miningTime = 0;
                }
            }
        });

        document.addEventListener('mouseup', (event) => { if (event.button === 0) { isMining = false; miningTime = 0; highlightBox.scale.setScalar(1); } });
        let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
        const onKeyDown = function (event) {
            if (isGameClear) { if (event.code === 'Space' || event.code === 'Escape') { isGameClear = false; document.getElementById('win-screen').style.display = 'none'; if (winScroller) clearInterval(winScroller); document.getElementById('credits-content').style.transform = `translateY(0px)`; switchDimension('overworld'); camera.position.set(0, 100, 0); dimensionState.overworld.playerPos = camera.position.clone(); velocity.set(0, 0, 0); highestY = 100; isFalling = false; isFlying = false; isSpawnImmunity = true; playerInvulnTimer = 5.0; jumpPressed = false; controls.lock(); } return; }
            if (isDead) return;
            if (event.code === 'KeyT' || event.code === 'Slash') { if (controls.isLocked) { controls.unlock(); isChatOpen = true; chatContainer.style.display = 'block'; chatInput.focus(); if (event.code === 'Slash') chatInput.value = '/'; else event.preventDefault(); return; } }
            if (isChatOpen) { if (event.code === 'Enter') { if (chatInput.value.trim() !== '') handleCommand(chatInput.value); chatInput.value = ''; chatContainer.style.display = 'none'; isChatOpen = false; controls.lock(); } else if (event.code === 'Escape') { chatInput.value = ''; chatContainer.style.display = 'none'; isChatOpen = false; controls.lock(); } return; }
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
            if (isInventoryOpen) return;
            if (event.code.startsWith('Digit')) { const digit = parseInt(event.code.replace('Digit', '')); if (digit >= 1 && digit <= 9) { currentSlotIndex = digit - 1; renderInventoryUI(); } }
            switch (event.code) { case 'ArrowUp': case 'KeyW': moveForward = true; break; case 'ArrowLeft': case 'KeyA': moveLeft = true; break; case 'ArrowDown': case 'KeyS': moveBackward = true; break; case 'ArrowRight': case 'KeyD': moveRight = true; break; case 'Space': jumpPressed = true; const now = performance.now(); if (now - lastSpacePress < 300 && gameMode === 0) { isFlying = !isFlying; velocity.y = 0; } lastSpacePress = now; break; case 'ShiftLeft': case 'ShiftRight': shiftPressed = true; break; }
        };
        const onKeyUp = function (event) { switch (event.code) { case 'ArrowUp': case 'KeyW': moveForward = false; break; case 'ArrowLeft': case 'KeyA': moveLeft = false; break; case 'ArrowDown': case 'KeyS': moveBackward = false; break; case 'ArrowRight': case 'KeyD': moveRight = false; break; case 'Space': jumpPressed = false; break; case 'ShiftLeft': case 'ShiftRight': shiftPressed = false; break; } };
        document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp);

        function checkCollisionGeneric(x, y, z, radius, height) { const epsilon = 0.001; const minX = Math.floor(x - radius + epsilon); const maxX = Math.floor(x + radius - epsilon); const minY = Math.floor(y + epsilon); const maxY = Math.floor(y + height - epsilon); const minZ = Math.floor(z - radius + epsilon); const maxZ = Math.floor(z + radius - epsilon); for (let i = minX; i <= maxX; i++) { for (let j = minY; j <= Math.min(maxY, 100); j++) { for (let k = minZ; k <= maxZ; k++) { const b = getBlock(i, j, k); if (b && b !== 'nether_portal' && b !== 'end_portal' && b !== 'return_portal' && b !== 'water' && b !== 'lava' && b !== 'tall_grass' && b !== 'end_rod' && b !== 'torch') return true; } } } return false; }
        // ==========================================