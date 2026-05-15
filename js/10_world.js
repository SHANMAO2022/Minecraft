        // ==========================================
        let lastChunkX = -999; let lastChunkZ = -999;

        function switchDimension(newDim) {
            dimensionState[currentDimension].playerPos = camera.position.clone();
            chunks.forEach(c => { for (let t in c.meshes) scene.remove(c.meshes[t]); });
            entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); }); particles.forEach(p => scene.remove(p.mesh)); particles.length = 0;
            currentDimension = newDim; chunks = dimensionState[newDim].chunks; worldBlocks = dimensionState[newDim].worldBlocks; entities = dimensionState[newDim].entities;
            chunks.forEach(c => { for (let t in c.meshes) scene.add(c.meshes[t]); }); entities.forEach(e => { scene.add(e.mesh); if (e.beam) scene.add(e.beam); });
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
            const waterFaces = ['top', 'bottom', 'north', 'south', 'east', 'west'];
            
            for (const type of blockTypes) { 
                if (type === 'water') {
                    waterFaces.forEach(f => {
                        const ft = `water_${f}`;
                        meshes[ft] = new THREE.InstancedMesh(typeGeometries[ft], materials.water, maxBlocksPerType.water);
                        meshes[ft].frustumCulled = false; meshes[ft].renderOrder = 10; counts[ft] = 0;
                        scene.add(meshes[ft]);
                    });
                    continue;
                }
                const geo = typeGeometries[type] || blockGeometry;
                meshes[type] = new THREE.InstancedMesh(geo, materials[type], maxBlocksPerType[type]); 
                meshes[type].frustumCulled = false; 
                if (type === 'glass' || type === 'lava') meshes[type].renderOrder = 10;
                counts[type] = 0; 
                scene.add(meshes[type]);
            }
            
            const blocks = new Map();
            const dummy = new THREE.Object3D();
            
            // 阶段 1：生成区块原始数据
            for (let x = 0; x < chunkSize; x++) {
                for (let z = 0; z < chunkSize; z++) {
                    const wx = cx * chunkSize + x; const wz = cz * chunkSize + z;
                    if (currentDimension === 'overworld') {
                        const surfaceY = Math.floor(noise2D(wx * 0.04, wz * 0.04) * 5); const bottomY = -64;
                        for (let y = bottomY; y <= surfaceY; y++) {
                            let type = 'stone'; if (y === bottomY || y === bottomY + 1) type = 'bedrock'; else if (surfaceY <= 0 && y === surfaceY) type = 'sand'; else if (y === surfaceY) type = 'grass'; else if (y > surfaceY - 3) type = 'dirt';
                            blocks.set(`${wx},${y},${wz}`, type);
                        }
                        if (surfaceY < 0) { for (let wy = Math.max(bottomY + 1, surfaceY + 1); wy <= 0; wy++) blocks.set(`${wx},${wy},${wz}`, 'water'); }
                        if (surfaceY >= -10 && x >= 2 && x <= 13 && z >= 2 && z <= 13 && Math.random() < 0.015 && surfaceY > 0) {
                            const trunkHeight = 4 + Math.floor(Math.random() * 2);
                            for (let ty = 1; ty <= trunkHeight; ty++) blocks.set(`${wx},${surfaceY + ty},${wz}`, 'log');
                            for (let lx = -2; lx <= 2; lx++) for (let lz = -2; lz <= 2; lz++) for (let ly = trunkHeight - 2; ly <= trunkHeight + 1; ly++) if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly-trunkHeight) <= 3) { if (lx === 0 && lz === 0 && ly <= trunkHeight) continue; blocks.set(`${wx+lx},${surfaceY+ly},${wz+lz}`, 'leaves'); }
                        } else if (Math.random() < 0.08 && surfaceY > 0) { blocks.set(`${wx},${surfaceY + 1},${wz}`, 'tall_grass'); }
                    } else if (currentDimension === 'nether') {
                        for (let y = 0; y <= 64; y++) { if (y === 0) blocks.set(`${wx},${y},${wz}`, 'bedrock'); else if (Math.random() < 0.1) blocks.set(`${wx},${y},${wz}`, 'netherrack'); }
                    } else if (currentDimension === 'end') {
                        const dist = Math.sqrt(wx*wx + wz*wz); if (dist < 50) { for (let y = 0; y < 10; y++) blocks.set(`${wx},${y},${wz}`, 'end_stone'); }
                    }
                }
            }
            
            // 合并修改过的数据
            for (const mKey in modifiedBlocks[currentDimension]) {
                const [mx, my, mz] = mKey.split(',').map(Number);
                if (Math.floor(mx/chunkSize) === cx && Math.floor(mz/chunkSize) === cz) {
                    const mt = modifiedBlocks[currentDimension][mKey];
                    if (mt === 'null') blocks.delete(mKey); else blocks.set(mKey, mt);
                }
            }
            // 重新定义智能邻居检查逻辑，解决区块边界线条问题
            const getBlockProcedural = (x, y, z) => {
                // 1. 先检查当前区块内部
                const pk = `${x},${y},${z}`;
                if (blocks.has(pk)) return blocks.get(pk);
                
                // 2. 检查全局已修改或已加载的区块
                const globalT = getBlock(x, y, z);
                if (globalT !== null && globalT !== undefined) return globalT;
                
                // 3. 如果邻居区块未加载，通过噪声函数预测地形
                if (currentDimension === 'overworld') {
                    const sY = Math.floor(noise2D(x * 0.04, z * 0.04) * 5);
                    if (y <= sY) return 'stone'; // 预测为固体
                    if (y <= 0) return 'water';  // 预测为水
                }
                return null; // 预测为空气
            };

            const isAir = (t) => t === null || t === undefined;
            const isWater = (t) => t === 'water';

            blocks.forEach((type, posKey) => {
                const [bx, by, bz] = posKey.split(',').map(Number);
                if (type === 'water') {
                    dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5); dummy.updateMatrix();
                    
                    // 顶面：上方不是水就渲染
                    if (!isWater(getBlockProcedural(bx, by + 1, bz))) meshes.water_top.setMatrixAt(counts.water_top++, dummy.matrix);
                    
                    // 侧面和底面：只有邻居绝对是空气才渲染
                    if (isAir(getBlockProcedural(bx, by - 1, bz))) meshes.water_bottom.setMatrixAt(counts.water_bottom++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx, by, bz - 1))) meshes.water_north.setMatrixAt(counts.water_north++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx, by, bz + 1))) meshes.water_south.setMatrixAt(counts.water_south++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx + 1, by, bz))) meshes.water_east.setMatrixAt(counts.water_east++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx - 1, by, bz))) meshes.water_west.setMatrixAt(counts.water_west++, dummy.matrix);
                } else {
                    dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5); dummy.updateMatrix();
                    meshes[type].setMatrixAt(counts[type]++, dummy.matrix);
                    const nonSolid = ['tall_grass', 'nether_portal', 'water', 'lava', 'end_rod', 'torch', 'door_top_open', 'door_bottom_open'];
                    if (!nonSolid.includes(type)) worldBlocks.add(posKey);
                }
            });

            for (const t in meshes) {
                meshes[t].count = counts[t];
                meshes[t].instanceMatrix.needsUpdate = true;
                if (counts[t] > 0) meshes[t].computeBoundingSphere();
            }
            chunks.set(key, { meshes, blocks, cx, cz });
        }

        function rebuildChunkMesh(chunk) {
            const counts = {}; for (const type in chunk.meshes) counts[type] = 0; 
            const dummy = new THREE.Object3D();
            
            const getBlockProcedural = (x, y, z) => {
                const pk = `${x},${y},${z}`;
                if (chunk.blocks.has(pk)) return chunk.blocks.get(pk);
                const globalT = getBlock(x, y, z);
                if (globalT !== null && globalT !== undefined) return globalT;
                if (currentDimension === 'overworld') {
                    const sY = Math.floor(noise2D(x * 0.04, z * 0.04) * 5);
                    if (y <= sY) return 'stone';
                    if (y <= 0) return 'water';
                }
                return null;
            };
            const isAir = (t) => t === null || t === undefined;
            const isWater = (t) => t === 'water';

            for (const [posKey, type] of chunk.blocks.entries()) { 
                const [bx, by, bz] = posKey.split(',').map(Number); 
                dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5); dummy.updateMatrix();
                if (type === 'water') {
                    if (!isWater(getBlockProcedural(bx, by + 1, bz))) chunk.meshes.water_top.setMatrixAt(counts.water_top++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx, by - 1, bz))) chunk.meshes.water_bottom.setMatrixAt(counts.water_bottom++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx, by, bz - 1))) chunk.meshes.water_north.setMatrixAt(counts.water_north++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx, by, bz + 1))) chunk.meshes.water_south.setMatrixAt(counts.water_south++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx + 1, by, bz))) chunk.meshes.water_east.setMatrixAt(counts.water_east++, dummy.matrix);
                    if (isAir(getBlockProcedural(bx - 1, by, bz))) chunk.meshes.water_west.setMatrixAt(counts.water_west++, dummy.matrix);
                } else {
                    chunk.meshes[type].setMatrixAt(counts[type]++, dummy.matrix);
                }
            }
            for (const t in chunk.meshes) {
                chunk.meshes[t].count = counts[t];
                chunk.meshes[t].instanceMatrix.needsUpdate = true;
                if (counts[t] > 0) chunk.meshes[t].computeBoundingSphere();
            }
        }

        function unloadChunk(key) { const chunk = chunks.get(key); if (!chunk) return; for (const type in chunk.meshes) { scene.remove(chunk.meshes[type]); chunk.meshes[type].dispose(); } for (const posKey of chunk.blocks.keys()) worldBlocks.delete(posKey); chunks.delete(key); }

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