        // ==========================================
        const velocity = new THREE.Vector3(); const direction = new THREE.Vector3(); const clock = new THREE.Clock(); let portalTimer = 0; let autoSaveTimer = 0;
        let renderFrames = 0; let lastFpsTime = performance.now();
        const fpsDisplay = document.getElementById('fps-display'); const coordsDisplay = document.getElementById('coords-display'); const timeDisplay = document.getElementById('time-display');

        function animate() {
            requestAnimationFrame(animate); const delta = clock.getDelta();

            const isGameRunning = isPlaying && !isDead && !isGameClear && pauseScreen.style.display !== 'flex' && titleScreen.style.display !== 'flex' && worldSelectScreen.style.display !== 'flex' && createWorldScreen.style.display !== 'flex' && document.getElementById('options-screen').style.display !== 'flex' && document.getElementById('multiplayer-screen').style.display !== 'flex';

            let sunHeight = Math.sin((worldTime % CYCLE_LENGTH / DAY_LENGTH) * Math.PI);
            let isNight = sunHeight <= 0.1;

            if (isGameRunning) {
                worldTime += delta;
                autoSaveTimer += delta;
                if (autoSaveTimer > 60) {
                    autoSaveTimer = 0;
                    if (typeof saveGame === 'function') {
                        saveGame();
                        console.log("自动保存成功");
                    }
                }
                if (gameStartTime < 3.0) gameStartTime += delta;

                if (myPeer && performance.now() - lastSyncTime > 100) {
                    lastSyncTime = performance.now();
                    const netData = {
                        type: 'pos', id: myPeer.id,
                        pos: [camera.position.x, camera.position.y - 1.55, camera.position.z],
                        rot: [camera.rotation.y, camera.rotation.x],
                        anim: { walk: moveForward || moveBackward || moveLeft || moveRight, punch: actionTimer > 0 },
                        dim: currentDimension
                    };
                    if (isMultiplayerHost) connectedClients.forEach(c => c.send(netData));
                    else if (myConnection) myConnection.send(netData);
                }

                const maxEntityDistSq = 4096; // 64 * 64
                for (let i = entities.length - 1; i >= 0; i--) { 
                    const e = entities[i]; 
                    const distSq = e.mesh.position.distanceToSquared(camera.position);
                    if (distSq > maxEntityDistSq && e.type !== 'dragon') {
                        e.mesh.visible = false;
                        continue;
                    }
                    e.mesh.visible = true;
                    if (e.update(delta, worldTime, sunHeight, isNight)) { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); entities.splice(i, 1); } 
                }
                for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= delta; p.mesh.position.addScaledVector(p.vel, delta); p.mesh.scale.setScalar(p.life); if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); } }
                handleMobSpawning(delta, isNight);

                // 熔炉逻辑
                for (const pos in furnaceStates) {
                    const fState = furnaceStates[pos];
                    const input = fState.items[0]; const fuel = fState.items[1];
                    const recipes = { iron_ore: 'iron_ingot', gold_ore: 'gold_ingot', raw_porkchop: 'cooked_porkchop', raw_beef: 'cooked_beef' };
                    const isSmeltable = input && recipes[input.type];
                    
                    if (fState.burn > 0) {
                        fState.burn -= delta;
                        if (isSmeltable) {
                            fState.smelt += delta;
                            if (fState.smelt >= 5.0) {
                                fState.smelt = 0;
                                const resType = recipes[input.type];
                                if (!fState.output) fState.output = { type: resType, count: 1 };
                                else if (fState.output.type === resType) fState.output.count++;
                                input.count--; if (input.count <= 0) fState.items[0] = null;
                            }
                        } else { fState.smelt = 0; }
                    } else if (isSmeltable && fuel && fuel.count > 0) {
                        const fuelVal = ITEMS[fuel.type].fuelValue || (fuel.type === 'planks' || fuel.type === 'log' ? 15 : 0);
                        if (fuelVal > 0) {
                            fState.burn = fuelVal; fState.maxBurn = fuelVal;
                            fuel.count--; if (fuel.count <= 0) fState.items[1] = null;
                        }
                    } else { fState.smelt = 0; }

                    // 如果当前打开的是这个熔炉，更新 UI 和全局状态
                    if (isInventoryOpen && craftingMode === 4 && currentFurnacePos === pos) {
                        invState.output = fState.output;
                        const progress = document.getElementById('smelt-progress-fill');
                        if (progress) progress.style.width = (fState.smelt / 5.0 * 100) + '%';
                        const flame = document.getElementById('smelt-flame');
                        if (flame) flame.style.color = fState.burn > 0 ? '#ffaa00' : '#555';
                    }
                }
            }

            let cycleTime = worldTime % CYCLE_LENGTH; let theta; let timeUntilSwitch = 0; let nextPhase = '';
            if (cycleTime < DAY_LENGTH) { theta = (cycleTime / DAY_LENGTH) * Math.PI; timeUntilSwitch = DAY_LENGTH - cycleTime; nextPhase = '黑夜'; }
            else { theta = Math.PI + ((cycleTime - DAY_LENGTH) / NIGHT_LENGTH) * Math.PI; timeUntilSwitch = CYCLE_LENGTH - cycleTime; nextPhase = '白天'; }
            sunHeight = Math.sin(theta);

            const now = performance.now(); renderFrames++; if (now - lastFpsTime >= 1000) { fpsDisplay.innerText = `FPS: ${renderFrames}`; renderFrames = 0; lastFpsTime = now; }
            if (controls.isLocked) { 
                coordsDisplay.innerText = `XYZ: ${camera.position.x.toFixed(1)} / ${camera.position.y.toFixed(1)} / ${camera.position.z.toFixed(1)}`; 
                let min = Math.floor(timeUntilSwitch / 60); 
                let sec = Math.floor(timeUntilSwitch % 60).toString().padStart(2, '0'); 
                if (currentDimension === 'overworld') { timeDisplay.innerText = `离${nextPhase}: ${min}:${sec}`; } 
                else { timeDisplay.innerText = `当前世界无时间概念`; }
                
                const gmText = gameMode === 0 ? "创造 [双击空格飞行]" : "生存 [按 T 输入指令]";
                document.getElementById('gamemode-display').innerText = `模式: ${gmText}`;
            }
            directionalLight.position.set(Math.cos(theta) * 100, Math.sin(theta) * 100, Math.sin(theta) * 30);
            let isPlayerInWater = false; let isPlayerInLava = false;
            if (controls.isLocked === true) { const curBx = Math.floor(camera.position.x); const curBy = Math.floor(camera.position.y - 1); const curByEye = Math.floor(camera.position.y); const curBz = Math.floor(camera.position.z); const bFeet = getBlock(curBx, curBy, curBz); const bHead = getBlock(curBx, curByEye, curBz); if (bFeet === 'water' || bHead === 'water') isPlayerInWater = true; if (bFeet === 'lava' || bHead === 'lava') isPlayerInLava = true; if (bFeet === 'magma' && !isFlying && gameMode === 1 && playerInvulnTimer <= 0) { takeDamage(1); } }
            if (isPlayerInWater) { scene.fog.color.setHex(0x0055ff); scene.fog.near = 0.1; scene.fog.far = 15; scene.background.setHex(0x0055ff); }
            else if (isPlayerInLava) { scene.fog.color.setHex(0xff3300); scene.fog.near = 0.1; scene.fog.far = 5; scene.background.setHex(0xff3300); }
            else { if (currentDimension === 'overworld') { if (sunHeight > 0.2) { skyCurrent.copy(skyColors.overworld); ambientLight.intensity = 0.6; directionalLight.intensity = 0.8; } else if (sunHeight > 0) { const t = sunHeight / 0.2; skyCurrent.copy(skyColors.dusk).lerp(skyColors.overworld, t); ambientLight.intensity = 0.2 + 0.4 * t; directionalLight.intensity = 0.8 * t; } else if (sunHeight > -0.2) { const t = (sunHeight + 0.2) / 0.2; skyCurrent.copy(skyColors.night).lerp(skyColors.dusk, t); ambientLight.intensity = 0.1 + 0.1 * t; directionalLight.intensity = 0; } else { skyCurrent.copy(skyColors.night); ambientLight.intensity = 0.1; directionalLight.intensity = 0; } const camY = camera.position.y; const targetColor = skyCurrent.clone(); if (camY < 0) { const depthFactor = Math.min(1, -camY / 30); targetColor.lerp(new THREE.Color(0x020202), depthFactor); scene.fog.near = 20 - 15 * depthFactor; scene.fog.far = 50 - 30 * depthFactor; } else { scene.fog.near = 40; scene.fog.far = 80; } scene.background = targetColor; scene.fog.color = targetColor; } }

            const dt = Math.min(delta, 0.05);
            if (playerInvulnTimer > 0) playerInvulnTimer -= dt;

            if (controls.isLocked === true && !isInventoryOpen && !isDead && !isGameClear) {
                updateChunks(); hungerTimer += dt; if (hungerTimer > 30 && gameMode === 1) { hungerTimer = 0; if (currentHunger > 0) { currentHunger = Math.max(0, currentHunger - 0.5); updateStatusUI(); } }
                if (currentHunger >= 18 && currentHealth < 20) { healTimer += dt; if (healTimer > 4) { healTimer = 0; currentHealth++; updateStatusUI(); } } else healTimer = 0;
                if (currentHunger <= 0) { starveTimer += dt; if (starveTimer > 4) { starveTimer = 0; takeDamage(1); } } else starveTimer = 0;
                let speedMult = 1.0; if (isPlayerInWater) speedMult = 0.5; if (isPlayerInLava) { speedMult = 0.3; if (playerInvulnTimer <= 0) takeDamage(2); }
                velocity.x -= velocity.x * 10.0 * dt; velocity.z -= velocity.z * 10.0 * dt;
                if (isFlying) { velocity.y -= velocity.y * 10.0 * dt; if (jumpPressed) velocity.y += 60.0 * dt; if (shiftPressed) velocity.y -= 60.0 * dt; speedMult = 2.5; }
                else { if (isPlayerInWater || isPlayerInLava) { velocity.y -= 5.0 * dt; if (velocity.y < -3.0) velocity.y = -3.0; } else { velocity.y -= 25.0 * dt; } }
                direction.z = Number(moveForward) - Number(moveBackward); direction.x = Number(moveRight) - Number(moveLeft); direction.normalize();
                const speed = 40.0 * speedMult; if (moveForward || moveBackward) velocity.z -= direction.z * speed * dt; if (moveLeft || moveRight) velocity.x -= direction.x * speed * dt;
                if (jumpPressed && !isFlying) { if (canJump) { velocity.y = 8.5; canJump = false; if (currentHunger > 0 && gameMode === 1) { currentHunger = Math.max(0, currentHunger - 0.1); updateStatusUI(); } } else if (isPlayerInWater || isPlayerInLava) { velocity.y += 35.0 * dt; if (velocity.y > 6.0) velocity.y = 6.0; } }
                const camObj = controls.getObject(); const oldPos = camObj.position.clone(); camObj.position.copy(oldPos); controls.moveRight(-velocity.x * dt); controls.moveForward(-velocity.z * dt); const totalDx = camObj.position.x - oldPos.x; const totalDz = camObj.position.z - oldPos.z;
                camObj.position.copy(oldPos); if (velocity.y < 0 && !checkCollisionGeneric(camObj.position.x, camObj.position.y - 1.55, camObj.position.z, 0.28, 1.7)) { highestY = Math.max(highestY, camObj.position.y); isFalling = true; } else if (velocity.y > 0) { highestY = camObj.position.y; isFalling = false; }
                camObj.position.y += velocity.y * dt;
                if (checkCollisionGeneric(camObj.position.x, camObj.position.y - 1.55, camObj.position.z, 0.28, 1.7)) { if (velocity.y < 0) { camObj.position.y = Math.floor(camObj.position.y - 1.55) + 1 + 1.55; if (isFalling && !isFlying) { const fallDist = highestY - camObj.position.y; if (fallDist > 4 && gameStartTime >= 3.0 && !isSpawnImmunity && !isPlayerInWater && !isPlayerInLava) { takeDamage(Math.floor(fallDist - 3)); } highestY = camObj.position.y; isFalling = false; isSpawnImmunity = false; } } else { camObj.position.y -= velocity.y * dt; } velocity.y = 0; }
                canJump = checkCollisionGeneric(camObj.position.x, camObj.position.y - 1.55 - 0.05, camObj.position.z, 0.28, 0.1);
                if (checkCollisionGeneric(camObj.position.x, camObj.position.y - 1.0, camObj.position.z, 0.2, 1.0)) { camObj.position.y += 3.0 * dt; }
                const moveSteps = Math.min(Math.ceil(Math.max(Math.abs(totalDx), Math.abs(totalDz)) / 0.1), 10) || 1; const stepX = totalDx / moveSteps; const stepZ = totalDz / moveSteps;
                for (let s = 0; s < moveSteps; s++) { camObj.position.x += stepX; if (checkCollisionGeneric(camObj.position.x, camObj.position.y - 1.55 + 0.01, camObj.position.z, 0.28, 1.7)) { camObj.position.x -= stepX; velocity.x = 0; } camObj.position.z += stepZ; if (checkCollisionGeneric(camObj.position.x, camObj.position.y - 1.55 + 0.01, camObj.position.z, 0.28, 1.7)) { camObj.position.z -= stepZ; velocity.z = 0; } }
                const curBx = Math.floor(camObj.position.x); const curBy = Math.floor(camObj.position.y - 1); const curBz = Math.floor(camObj.position.z); const blockInside = getBlock(curBx, curBy, curBz) || getBlock(curBx, Math.floor(camObj.position.y), curBz);
                if (blockInside === 'nether_portal') { portalTimer += dt; document.getElementById('portal-overlay').style.opacity = portalTimer / 3.0; if (portalTimer >= 3.0) { portalTimer = 0; document.getElementById('portal-overlay').style.opacity = 0; switchDimension(currentDimension === 'overworld' ? 'nether' : 'overworld'); } }
                else if (blockInside === 'end_portal') { portalTimer = 0; document.getElementById('portal-overlay').style.opacity = 0; switchDimension('end'); }
                else if (blockInside === 'return_portal') { if (!isGameClear) { isGameClear = true; controls.unlock(); document.getElementById('win-screen').style.display = 'flex'; let scroll = 0; const credits = document.getElementById('credits-content'); winScroller = setInterval(() => { scroll += 1; credits.style.transform = `translateY(-${scroll}px)`; if (scroll > 1500) clearInterval(winScroller); }, 50); } }
                else { portalTimer = 0; document.getElementById('portal-overlay').style.opacity = 0; }
                if (actionTimer > 0) { actionTimer -= dt; if (actionType === 'swing') { const p = 1 - (actionTimer / 0.3); heldItemGroup.rotation.x = Math.sin(p * Math.PI) * -1; heldItemGroup.position.y = -0.4 + Math.sin(p * Math.PI) * 0.2; } else if (actionType === 'eat') { const p = 1 - (actionTimer / 0.5); heldItemGroup.position.x = 0.4 - Math.sin(p * Math.PI) * 0.3; heldItemGroup.position.y = -0.4 + Math.sin(p * Math.PI * 6) * 0.1; heldItemGroup.rotation.z = Math.sin(p * Math.PI) * -0.5; } if (actionTimer <= 0) { heldItemGroup.rotation.set(0, 0, 0); heldItemGroup.position.set(0.4, -0.4, -0.6); if (actionType === 'swing' && isMining) actionTimer = 0.3; } }
                else { if (velocity.length() > 1 && canJump && !isFlying) { heldItemGroup.position.y = -0.4 + Math.sin(worldTime * 12) * 0.03; heldItemGroup.position.x = 0.4 + Math.cos(worldTime * 6) * 0.01; } else { heldItemGroup.position.set(0.4, -0.4, -0.6); } heldItemGroup.rotation.set(0, 0, 0); }
                raycaster.setFromCamera(center, camera); const activeMeshes = []; for (const chunk of chunks.values()) blockTypes.forEach(type => { if (type !== 'water' && type !== 'lava' && chunk.meshes[type].count > 0) activeMeshes.push(chunk.meshes[type]); }); const intersects = raycaster.intersectObjects(activeMeshes);
                if (intersects.length > 0) {
                    const intersect = intersects[0]; 
                    const p = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.01)); 
                    const bx = Math.floor(p.x); const by = Math.floor(p.y); const bz = Math.floor(p.z); 
                    const key = `${bx},${by},${bz}`; 
                    const blockType = getBlock(bx, by, bz);
                    
                    highlightBox.visible = true;
                    if (blockType === 'door_top' || blockType === 'door_bottom') {
                        highlightBox.scale.set(1, 1, 0.1);
                        highlightBox.position.set(bx + 0.5, by + 0.5, bz + 0.5 - 0.45);
                    } else if (blockType === 'door_top_open' || blockType === 'door_bottom_open') {
                        highlightBox.scale.set(0.1, 1, 1);
                        highlightBox.position.set(bx + 0.5 - 0.45, by + 0.5, bz + 0.5);
                    } else {
                        highlightBox.scale.set(1, 1, 1);
                        highlightBox.position.set(bx + 0.5, by + 0.5, bz + 0.5);
                    }
                    if (isMining) { 
                        if (targetBlockKey !== key) { targetBlockKey = key; miningTime = 0; } 
                        const blockType = getBlock(bx, by, bz); 
                        if (blockType && blockType !== 'bedrock' && blockType !== 'nether_portal' && blockType !== 'end_portal' && blockType !== 'return_portal' && blockType !== 'end_portal_frame_empty') { 
                            const blockDef = ITEMS[blockType]; 
                            const heldItem = invState.hotbar[currentSlotIndex]; 
                            const toolDef = heldItem ? ITEMS[heldItem.type] : null; 
                            let miningPower = 1; if (toolDef && toolDef.toolType === blockDef.tool) miningPower = toolDef.power; 
                            const requiredTime = gameMode === 0 ? 0.05 : blockDef.hardness / miningPower; 
                            miningTime += delta; 
                            let progress = Math.min(miningTime / requiredTime, 1); 
                            
                            let baseScale = new THREE.Vector3(1, 1, 1);
                            if (blockType === 'door_top' || blockType === 'door_bottom') baseScale.set(1, 1, 0.1);
                            else if (blockType === 'door_top_open' || blockType === 'door_bottom_open') baseScale.set(0.1, 1, 1);

                            highlightBox.scale.copy(baseScale);
                            miningOverlay.scale.copy(baseScale).multiplyScalar(1.01);
                            miningOverlay.position.copy(highlightBox.position);
                            miningOverlay.visible = true;

                            const stage = Math.floor(progress * 9.9);
                            miningOverlay.material = destroyStages[stage];
                            if (miningTime >= requiredTime) { 
                                let drops = false; if (blockDef.tool === 'none' || (toolDef && toolDef.toolType === blockDef.tool && toolDef.tier >= blockDef.tier)) drops = true; 
                                setBlock(bx, by, bz, null); 
                                if (blockType === 'bed_head' || blockType === 'bed_foot') { const targetType = blockType === 'bed_head' ? 'bed_foot' : 'bed_head'; const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]; for (let d of dirs) { if (getBlock(bx + d[0], by, bz + d[1]) === targetType) { setBlock(bx + d[0], by, bz + d[1], null); break; } } }
                                if (blockType === 'door_top' || blockType === 'door_top_open') { const other = getBlock(bx, by - 1, bz); if (other === 'door_bottom' || other === 'door_bottom_open') setBlock(bx, by - 1, bz, null); }
                                else if (blockType === 'door_bottom' || blockType === 'door_bottom_open') { const other = getBlock(bx, by + 1, bz); if (other === 'door_top' || other === 'door_top_open') setBlock(bx, by + 1, bz, null); }
                                highlightBox.visible = false; miningOverlay.visible = false; highlightBox.scale.setScalar(1); 
                                if (drops && gameMode === 1) { 
                                    if (blockType === 'stone' && Math.random() < 0.1) { addBlockToInventory('flint'); addBlockToInventory('stone'); } 
                                    else if (blockType === 'coal_ore') addBlockToInventory('coal');
                                    else if (blockType === 'diamond_ore') addBlockToInventory('diamond');
                                    else if (blockType === 'bed_head' || blockType === 'bed_foot') { addBlockToInventory('bed'); } 
                                    else if (blockType === 'door_top' || blockType === 'door_bottom' || blockType === 'door_top_open' || blockType === 'door_bottom_open') { addBlockToInventory('door'); }
                                    else addBlockToInventory(blockType); 
                                } 
                                renderInventoryUI(); isMining = false; miningTime = 0; targetBlockKey = null; 
                            } 
                        } 
                    } else { targetBlockKey = key; miningTime = 0; highlightBox.scale.setScalar(1); miningOverlay.visible = false; }
                } else { highlightBox.visible = false; highlightBox.scale.setScalar(1); targetBlockKey = null; miningTime = 0; }
            } else { highlightBox.visible = false; }

            Object.values(multiplayerPeers).forEach(p => {
                p.mesh.visible = (p.dim === currentDimension);
                if (!p.mesh.visible) return;
                const distSq = p.mesh.position.distanceToSquared(camera.position);
                if (distSq > 4096) { p.mesh.visible = false; return; }
                p.mesh.position.lerp(p.targetPos, 0.3);
                p.mesh.rotation.y = p.targetRot;
                if (p.mesh.nameSprite) p.mesh.nameSprite.lookAt(camera.position);
                const time = performance.now() * 0.01;
                if (p.anim && p.anim.walk) {
                    p.mesh.legs[0].rotation.x = Math.sin(time) * 0.5; p.mesh.legs[1].rotation.x = -Math.sin(time) * 0.5;
                    p.mesh.arms[0].rotation.x = -Math.sin(time) * 0.5; p.mesh.arms[1].rotation.x = Math.sin(time) * 0.5;
                } else {
                    if (p.mesh.legs[0]) p.mesh.legs[0].rotation.x = 0; if (p.mesh.legs[1]) p.mesh.legs[1].rotation.x = 0;
                    if (p.mesh.arms[0]) p.mesh.arms[0].rotation.x = 0; if (p.mesh.arms[1]) p.mesh.arms[1].rotation.x = 0;
                }
                if (p.anim && p.anim.punch && p.mesh.arms[0]) { p.mesh.arms[0].rotation.x = -Math.PI / 2 + Math.sin(time * 2) * 0.2; }
            });

            renderer.render(scene, camera);
        }

        window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
        window.addEventListener('beforeunload', () => { if (isPlaying && typeof saveGame === 'function') saveGame(); });
        animate();