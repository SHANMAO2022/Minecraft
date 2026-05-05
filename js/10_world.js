        // ==========================================
        let lastChunkX = -999; let lastChunkZ = -999;

        function switchDimension(newDim) {
            dimensionState[currentDimension].playerPos = camera.position.clone();
            chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t])));
            entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); }); particles.forEach(p => scene.remove(p.mesh)); particles.length = 0;
            currentDimension = newDim; chunks = dimensionState[newDim].chunks; worldBlocks = dimensionState[newDim].worldBlocks; entities = dimensionState[newDim].entities;
            chunks.forEach(c => blockTypes.forEach(t => scene.add(c.meshes[t]))); entities.forEach(e => { scene.add(e.mesh); if (e.beam) scene.add(e.beam); });
            document.getElementById('biome-display').innerText = `Biome: ${newDim.charAt(0).toUpperCase() + newDim.slice(1)}`;
            if (newDim === 'overworld') { scene.background = skyColors.overworld; scene.fog.color = skyColors.overworld; scene.fog.near = 40; scene.fog.far = 80; ambientLight.intensity = 0.6; directionalLight.intensity = 0.8; }
            else if (newDim === 'nether') { scene.background = skyColors.nether; scene.fog.color = skyColors.nether; scene.fog.near = 5; scene.fog.far = 30; ambientLight.intensity = 0.8; directionalLight.intensity = 0; }
            else if (newDim === 'end') { scene.background = skyColors.end; scene.fog.color = skyColors.end; scene.fog.near = 40; scene.fog.far = 100; ambientLight.intensity = 0.4; directionalLight.intensity = 0.2; if (entities.filter(e => e.type === 'dragon').length === 0 && !isGameClear) setTimeout(() => spawnEnderDragon(), 2000); }
            if (dimensionState[newDim].playerPos && (newDim !== 'nether' || dimensionState[newDim].playerPos.y > 15)) camera.position.copy(dimensionState[newDim].playerPos);
            else { 
                if (newDim === 'overworld') camera.position.set(0, 20, 0); 
                if (newDim === 'nether') camera.position.set(0, 27.6, 2.5); 
                if (newDim === 'end') camera.position.set(0, 40, 30); 
            }
            lastChunkX = -999; updateChunks(); velocity.set(0, 0, 0);
        }

        function generateChunk(cx, cz) {
            const key = `${cx},${cz}`; if (chunks.has(key)) return;
            const meshes = {}; const counts = {};
            for (const type of blockTypes) { 
                const geo = typeGeometries[type] || blockGeometry;
                meshes[type] = new THREE.InstancedMesh(geo, materials[type], maxBlocksPerType[type]); 
                meshes[type].frustumCulled = false; 
                if (type === 'glass' || type === 'water' || type === 'lava') meshes[type].renderOrder = 10;
                counts[type] = 0; 
                scene.add(meshes[type]);
            }
            const blocks = new Map(); const dummy = new THREE.Object3D();
            function addBlock(bx, by, bz, type) { 
                const posKey = `${bx},${by},${bz}`; 
                if (blocks.has(posKey)) return; 
                blocks.set(posKey, type); 
                const nonSolid = ['tall_grass', 'nether_portal', 'water', 'lava', 'end_rod', 'torch', 'door_top_open', 'door_bottom_open'];
                if (!nonSolid.includes(type)) worldBlocks.add(posKey); 
                dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5); 
                dummy.updateMatrix(); 
                meshes[type].setMatrixAt(counts[type]++, dummy.matrix); 
            }
            const END_PILLARS = [{ x: 18, z: 0, h: 10 }, { x: 13, z: 13, h: 15 }, { x: 0, z: 18, h: 20 }, { x: -13, z: 13, h: 25 }, { x: -18, z: 0, h: 10 }, { x: -13, z: -13, h: 15 }, { x: 0, z: -18, h: 20 }, { x: 13, z: -13, h: 25 }];
            for (let x = 0; x < chunkSize; x++) {
                for (let z = 0; z < chunkSize; z++) {
                    const wx = cx * chunkSize + x; const wz = cz * chunkSize + z;
                    if (currentDimension === 'overworld') {
                        const surfaceY = Math.floor(noise2D(wx * 0.04, wz * 0.04) * 5); const bottomY = -64; for (let y = bottomY; y <= surfaceY; y++) { let isCave = false; if (y < surfaceY - 4 && y > bottomY + 2) { if (noise3D(wx * 0.05, y * 0.05, wz * 0.05) > 0.25) isCave = true; } if (wx >= 60 && wx <= 68 && wz >= 60 && wz <= 68 && y >= -25 && y <= -20) { if (wx === 60 || wx === 68 || wz === 60 || wz === 68 || y === -25 || y === -20) addBlock(wx, y, wz, 'stone_brick'); else { if (y === -24) { if ((wz === 62 || wz === 66) && wx >= 63 && wx <= 65) addBlock(wx, y, wz, 'end_portal_frame_empty'); if ((wx === 62 || wx === 66) && wz >= 63 && wz <= 65) addBlock(wx, y, wz, 'end_portal_frame_empty'); } } continue; } if (isCave) continue; let type = 'stone'; if (y === bottomY || y === bottomY + 1) type = 'bedrock'; else if (surfaceY <= 0 && y === surfaceY) type = 'sand'; else if (y === surfaceY) type = 'grass'; else if (y > surfaceY - 3) type = 'dirt'; else if (y < surfaceY - 3) { if (Math.random() < 0.04) { const r = Math.random(); if (y < -40 && r < 0.05) type = 'diamond_ore'; else if (y < -20 && r < 0.15) type = 'gold_ore'; else if (y < 0 && r < 0.4) type = 'iron_ore'; else type = 'coal_ore'; } } addBlock(wx, y, wz, type); } if (surfaceY < 0) { for (let wy = Math.max(bottomY + 1, surfaceY + 1); wy <= 0; wy++) addBlock(wx, wy, wz, 'water'); } if (surfaceY >= -10 && x >= 2 && x <= 13 && z >= 2 && z <= 13) { if (Math.random() < 0.015 && surfaceY > 0) { const trunkHeight = 4 + Math.floor(Math.random() * 2); for (let ty = 1; ty <= trunkHeight; ty++) addBlock(wx, surfaceY + ty, wz, 'log'); for (let lx = -2; lx <= 2; lx++) { for (let lz = -2; lz <= 2; lz++) { for (let ly = trunkHeight - 2; ly <= trunkHeight + 1; ly++) { if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly - trunkHeight) <= 3) { if (lx === 0 && lz === 0 && ly <= trunkHeight) continue; addBlock(wx + lx, surfaceY + ly, wz + lz, 'leaves'); } } } } } else if (Math.random() < 0.08 && surfaceY > 0) { addBlock(wx, surfaceY + 1, wz, 'tall_grass'); } }
                    } else if (currentDimension === 'nether') {
                        const isPortalArea = (wx >= -3 && wx <= 3 && wz >= -3 && wz <= 3); 
                        for (let y = 0; y <= 64; y++) { 
                            if (y === 0) addBlock(wx, y, wz, 'bedrock'); // Bedrock floor for entire world
                            if (isPortalArea && y >= 1 && y <= 36) { 
                                if (y <= 26) addBlock(wx, y, wz, 'obsidian'); // Robust pillar up to y=26
                                else if (wx >= -1 && wx <= 2 && wz === 0 && y >= 27 && y <= 30) { 
                                    if (wx === -1 || wx === 2 || y === 30) addBlock(wx, y, wz, 'obsidian'); 
                                    else addBlock(wx, y, wz, 'nether_portal'); 
                                } 
                                // Else y=27..36 is AIR due to continue
                                continue; 
                            } 
                            const n = noise3D(wx * 0.03, y * 0.03, wz * 0.03); 
                            if (n > -0.05 || y >= 60 || y <= 4) { 
                                if (y === 0 || y >= 60) addBlock(wx, y, wz, 'bedrock'); 
                                else { 
                                    if (noise3D(wx * 0.1, (y+1) * 0.1, wz * 0.1) > 0.3 && y < 50 && Math.random() < 0.15) addBlock(wx, y, wz, 'magma'); 
                                    else addBlock(wx, y, wz, 'netherrack'); 
                                } 
                            } else if (y <= 12) addBlock(wx, y, wz, 'lava'); 
                        }
                    } else if (currentDimension === 'end') { 
                        const dist = Math.sqrt(wx * wx + wz * wz); 
                        if (dist < 40) { 
                            const depth = Math.floor(20 - dist / 2); 
                            for (let y = 0; y > -depth; y--) addBlock(wx, 20 + y, wz, 'end_stone'); 
                        } 
                        for (let p of END_PILLARS) { 
                            if (Math.abs(wx - p.x) <= 1 && Math.abs(wz - p.z) <= 1) { 
                                for (let hy = 1; hy <= p.h; hy++) addBlock(wx, 20 + hy, wz, 'obsidian'); 
                                if (wx === p.x && wz === p.z) spawnEnderCrystal(p.x + 0.5, 20 + p.h + 1, p.z + 0.5); 
                            } 
                        } 
                    }
                }
            }
            const chunk = { meshes, blocks, cx, cz };
            chunks.set(key, chunk);
            for (const mKey in modifiedBlocks[currentDimension]) { const [mx, my, mz] = mKey.split(',').map(Number); if (Math.floor(mx / chunkSize) === cx && Math.floor(mz / chunkSize) === cz) { const mt = modifiedBlocks[currentDimension][mKey]; if (mt === 'null') { blocks.delete(mKey); worldBlocks.delete(mKey); } else { blocks.set(mKey, mt); if (mt !== 'water' && mt !== 'lava' && mt !== 'tall_grass' && mt !== 'torch') worldBlocks.add(mKey); } } }
            for (const type of blockTypes) { meshes[type].count = counts[type]; meshes[type].instanceMatrix.needsUpdate = true; if (counts[type] > 0) meshes[type].computeBoundingSphere(); }
        }

        function rebuildChunkMesh(chunk) {
            const counts = {}; for (const type of blockTypes) counts[type] = 0; const dummy = new THREE.Object3D();
            for (const [posKey, type] of chunk.blocks.entries()) { 
                if (counts[type] >= maxBlocksPerType[type]) continue; 
                const [bx, by, bz] = posKey.split(',').map(Number); 
                dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5); 
                dummy.updateMatrix(); 
                chunk.meshes[type].setMatrixAt(counts[type]++, dummy.matrix); 
            }
            for (const type of blockTypes) { chunk.meshes[type].count = counts[type]; chunk.meshes[type].instanceMatrix.needsUpdate = true; if (counts[type] > 0) chunk.meshes[type].computeBoundingSphere(); }
        }

        function unloadChunk(key) { const chunk = chunks.get(key); if (!chunk) return; for (const type of blockTypes) { scene.remove(chunk.meshes[type]); chunk.meshes[type].dispose(); } for (const posKey of chunk.blocks.keys()) worldBlocks.delete(posKey); chunks.delete(key); }

        function updateChunks() {
            const camPos = camera.position; const cx = Math.floor(camPos.x / chunkSize); const cz = Math.floor(camPos.z / chunkSize);
            if (cx === lastChunkX && cz === lastChunkZ) return;
            lastChunkX = cx; lastChunkZ = cz; const expectedChunks = new Set();
            const viewDistance = 3;
            for (let dx = -viewDistance; dx <= viewDistance; dx++) { for (let dz = -viewDistance; dz <= viewDistance; dz++) { const targetCx = cx + dx; const targetCz = cz + dz; const key = `${targetCx},${targetCz}`; expectedChunks.add(key); generateChunk(targetCx, targetCz); } }
            for (const key of chunks.keys()) { if (!expectedChunks.has(key)) unloadChunk(key); }
        }

        function generateReturnPortal() {
            const cx = 0; const cz = 0; const cKey = `${cx},${cz}`; let chunk = chunks.get(cKey); if (!chunk) return;
            for (let x = -2; x <= 2; x++) { for (let z = -2; z <= 2; z++) { const k = `${x},21,${z}`; if (Math.abs(x) === 2 || Math.abs(z) === 2) { chunk.blocks.set(k, 'bedrock'); worldBlocks.add(k); } else { chunk.blocks.set(k, 'return_portal'); } } }
            rebuildChunkMesh(chunk);
        }

        updateChunks();

        const raycaster = new THREE.Raycaster(); raycaster.far = 5; const center = new THREE.Vector2(0, 0);
        const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005); const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const highlightBox = new THREE.LineSegments(new THREE.EdgesGeometry(highlightGeo), highlightMat); highlightBox.visible = false; scene.add(highlightBox);
        const miningOverlay = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), destroyStages[0]); miningOverlay.visible = false; scene.add(miningOverlay);
        const controls = new PointerLockControls(camera, document.body);
        const inventoryUiEl = document.getElementById('inventory-ui'); const debugUiEl = document.getElementById('debug-ui'); const chatContainer = document.getElementById('chat-container'); const chatInput = document.getElementById('chat-input');
        const uiLayer = document.getElementById('ui-layer'); const titleScreen = document.getElementById('title-screen'); const worldSelectScreen = document.getElementById('world-select-screen'); const createWorldScreen = document.getElementById('create-world-screen'); const pauseScreen = document.getElementById('pause-screen');

        // ==========================================