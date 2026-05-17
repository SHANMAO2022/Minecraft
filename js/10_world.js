        // ==========================================
        let lastChunkX = -999; let lastChunkZ = -999;
        window.chestInventories = {};
        window.fillChestLoot = (x, y, z) => {
            const key = `${x},${y},${z}`;
            if (window.chestInventories[key]) return; 
            const inv = new Array(27).fill(null);
            const pool = [
                { type: 'iron_ingot', prob: 0.6, max: 4 },
                { type: 'gold_ingot', prob: 0.4, max: 3 },
                { type: 'diamond', prob: 0.1, max: 1 },
                { type: 'cooked_porkchop', prob: 0.7, max: 5 }
            ];
            for (let i = 0; i < 6; i++) {
                const item = pool[Math.floor(Math.random() * pool.length)];
                if (Math.random() < item.prob) {
                    const slot = Math.floor(Math.random() * 27);
                    inv[slot] = { type: item.type, count: Math.floor(Math.random() * item.max) + 1 };
                }
            }
            window.chestInventories[key] = inv;
        };

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
            
            if (dimensionState[newDim].playerPos && (newDim !== 'nether' || dimensionState[newDim].playerPos.y > 15)) {
                camera.position.copy(dimensionState[newDim].playerPos);
            } else { 
                if (newDim === 'overworld') camera.position.set(0, 20, 0); 
                if (newDim === 'nether') {
                    // 确保下界出生点有传送门和平台
                    const px = 0, py = 26, pz = 0;
                    // 1. 生成传送门平台
                    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
                        setBlock(px + x, py - 1, pz + z, 'obsidian');
                        for (let y = 0; y < 4; y++) setBlock(px + x, py + y, pz + z, null);
                    }
                    // 2. 生成传送门框架
                    for (let y = 0; y < 4; y++) for (let x = -1; x <= 1; x++) {
                        const isFrame = (y === 0 || y === 3 || x === -1 || x === 1);
                        setBlock(px + x, py + y, pz, isFrame ? 'obsidian' : 'nether_portal');
                    }
                    // 3. 紧贴传送门生成小型要塞 (左侧刷怪笼，右侧宝箱)
                    for (let x = 3; x <= 7; x++) for (let z = -2; z <= 2; z++) {
                        setBlock(px + x, py - 1, pz + z, 'nether_bricks'); // 右侧地基
                        if (x === 5 && z === 0) setBlock(px + x, py, pz + z, 'spawner');
                    }
                    for (let x = -7; x <= -3; x++) for (let z = -2; z <= 2; z++) {
                        setBlock(px + x, py - 1, pz + z, 'nether_bricks'); // 左侧地基
                        if (x === -5 && z === 0) {
                            setBlock(px + x, py, pz + z, 'chest');
                            window.fillChestLoot(px + x, py, pz + z);
                        }
                    }
                    camera.position.set(px, py + 1.6, pz + 2); 
                }
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
                        meshes[ft].renderOrder = 10; counts[ft] = 0;
                        meshes[ft].castShadow = false;
                        meshes[ft].receiveShadow = window.shadowsEnabled;
                        scene.add(meshes[ft]);
                    });
                    continue;
                }
                const geo = typeGeometries[type] || blockGeometry;
                meshes[type] = new THREE.InstancedMesh(geo, materials[type], maxBlocksPerType[type]); 
                if (type === 'glass' || type === 'lava') meshes[type].renderOrder = 10;
                counts[type] = 0; 
                const isWaterOrGlass = type === 'water' || type === 'glass' || type.startsWith('water');
                meshes[type].castShadow = !isWaterOrGlass && window.shadowsEnabled;
                meshes[type].receiveShadow = window.shadowsEnabled;
                scene.add(meshes[type]);
            }
            
            // 生物群系定义与分布逻辑 (优化：分形噪声 + 领域扭曲)
            const getBiome = (gx, gz) => {
                // 领域扭曲：让边界弯曲自然
                const ox = noise2D(gx * 0.01, gz * 0.01) * 20;
                const oz = noise2D(gz * 0.01, gx * 0.01) * 20;
                
                // 分形群系噪声 (2层叠加)
                const nx = (gx + ox) * 0.002;
                const nz = (gz + oz) * 0.002;
                let bv = (biomeNoise(nx, nz) + 1) / 2;
                bv = bv * 0.7 + (biomeNoise(nx * 4, nz * 4) + 1) / 2 * 0.3; // 叠加细节

                if (bv < 0.1) return { name: '海洋', hMult: 0.5, hBase: -12, top: 'sand', sub: 'sand' };
                if (bv < 0.22) return { name: '冰川', hMult: 0.8, hBase: 2, top: 'snow', sub: 'ice' };
                if (bv < 0.38) return { name: '沙漠', hMult: 0.6, hBase: 1, top: 'sand', sub: 'sand' };
                if (bv < 0.48) return { name: '河流', hMult: 0.3, hBase: -4, top: 'dirt', sub: 'dirt' };
                if (bv < 0.58) return { name: '沼泽', hMult: 0.5, hBase: 0.5, top: 'swamp_grass', sub: 'dirt' }; // 增加陆地
                if (bv < 0.82) return { name: '平原', hMult: 0.8, hBase: 0, top: 'grass', sub: 'dirt' };
                if (bv < 0.95) return { name: '树林', hMult: 1.2, hBase: 2, top: 'grass', sub: 'dirt' };
                return { name: '高山', hMult: 2.5, hBase: 12, top: 'stone', sub: 'stone' };
            };

            const blocks = new Map();
            const dummy = new THREE.Object3D();
            
            // 阶段 1：生成区块原始数据
            for (let x = 0; x < chunkSize; x++) {
                for (let z = 0; z < chunkSize; z++) {
                    const wx = cx * chunkSize + x; const wz = cz * chunkSize + z;
                    if (currentDimension === 'overworld') {
                        const biome = getBiome(wx, wz);
                        const surfaceY = Math.floor(noise2D(wx * 0.04, wz * 0.04) * 6 * biome.hMult + biome.hBase); 
                        const bottomY = -64;
                        
                        for (let y = bottomY; y <= surfaceY; y++) {
                            let type = 'stone'; 
                            if (y === bottomY || y === bottomY + 1) type = 'bedrock'; 
                            else if (y === surfaceY) {
                                type = biome.top;
                                if (surfaceY < 0 && (type === 'grass' || type === 'swamp_grass')) type = (biome.name === '沼泽' ? 'dirt' : 'sand');
                                if (biome.name === '高山' && y > 15) type = 'snow';
                            } else if (y > surfaceY - 3) {
                                type = biome.sub;
                            }
                            blocks.set(`${wx},${y},${wz}`, type);
                        }
                        
                        // 水填充 (只有在 surfaceY < 0 时才填充，确保不与陆地重叠)
                        if (surfaceY < 0) { 
                            for (let wy = surfaceY + 1; wy <= 0; wy++) {
                                blocks.set(`${wx},${wy},${wz}`, 'water'); 
                            }
                        }

                        // 特色生成 (确保在海平面以上)
                        const rand = Math.random();
                        const currentTop = blocks.get(`${wx},${surfaceY},${wz}`);
                        
                        // --- 新增：要塞生成 (固定在 64, 64 附近地底) ---
                        const SH_X = 64, SH_Y = -25, SH_Z = 64;
                        if (wx >= SH_X - 10 && wx <= SH_X + 10 && wz >= SH_Z - 10 && wz <= SH_Z + 10) {
                            const dx = wx - SH_X, dz = wz - SH_Z;
                            // 生成 15x15x6 的石砖空间
                            for (let dy = -3; dy <= 3; dy++) {
                                const y = SH_Y + dy;
                                const isWall = (Math.abs(dx) === 7 || Math.abs(dz) === 7 || dy === -3 || dy === 3);
                                if (Math.abs(dx) <= 7 && Math.abs(dz) <= 7) {
                                    if (isWall) blocks.set(`${wx},${y},${wz}`, 'stone_brick');
                                    else blocks.delete(`${wx},${y},${wz}`); // 真正掏空
                                }
                                // 末地传送门框架 (3x3 环绕)
                                if (dy === -1) {
                                    const isPortalFrame = (Math.abs(dx) === 2 && Math.abs(dz) <= 1) || (Math.abs(dz) === 2 && Math.abs(dx) <= 1);
                                    if (isPortalFrame) blocks.set(`${wx},${y},${wz}`, 'end_portal_frame_filled');
                                    if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) blocks.set(`${wx},${y},${wz}`, 'end_portal');
                                }
                            }
                        }

                        if (surfaceY >= 0) {
                            // 树木生成 (树林和沼泽都有树)
                            if ((biome.name === '树林' && rand < 0.02) || (biome.name === '沼泽' && rand < 0.015)) {
                                if (currentTop === 'grass' || currentTop === 'swamp_grass') {
                                    const trunkHeight = biome.name === '沼泽' ? 4 : 5;
                                    const leafType = biome.name === '沼泽' ? 'swamp_leaves' : 'leaves';
                                    for (let ty = 1; ty <= trunkHeight; ty++) blocks.set(`${wx},${surfaceY + ty},${wz}`, 'log');
                                    for (let lx = -2; lx <= 2; lx++) for (let lz = -2; lz <= 2; lz++) for (let ly = trunkHeight - 2; ly <= trunkHeight + 1; ly++) {
                                        if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly-trunkHeight) <= 3) {
                                            const lX = wx+lx, lY = surfaceY+ly, lZ = wz+lz;
                                            const lk = `${lX},${lY},${lZ}`;
                                            const targetCx = Math.floor(lX/chunkSize);
                                            const targetCz = Math.floor(lZ/chunkSize);
                                            if (targetCx === cx && targetCz === cz) {
                                                if (!blocks.has(lk)) blocks.set(lk, leafType);
                                            } else {
                                                if (!modifiedBlocks[currentDimension][lk]) {
                                                    modifiedBlocks[currentDimension][lk] = leafType;
                                                    const nChunk = chunks.get(`${targetCx},${targetCz}`);
                                                    if (nChunk && !nChunk.blocks.has(lk)) {
                                                        nChunk.blocks.set(lk, leafType);
                                                        if (typeof rebuildChunkMesh === 'function') rebuildChunkMesh(nChunk);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } 
                            // 装饰物
                            else if (biome.name === '沙漠' && rand < 0.01 && currentTop === 'sand') {
                                for (let cy = 1; cy <= 3; cy++) blocks.set(`${wx},${surfaceY + cy},${wz}`, 'cactus');
                            } else if (biome.name === '沼泽' && rand < 0.03 && surfaceY === 0) {
                                blocks.set(`${wx},1,${wz}`, 'lily_pad');
                            } else if (rand < 0.05 && (currentTop === 'grass' || currentTop === 'swamp_grass')) {
                                blocks.set(`${wx},${surfaceY + 1},${wz}`, 'tall_grass');
                            }
                        }
                    } else if (currentDimension === 'nether') {
                        // 下界要塞点位 (优化：增加小型砖块地基，提高可见性)
                        const pointFreq = 64; 
                        const px = Math.floor(wx / pointFreq);
                        const pz = Math.floor(wz / pointFreq);
                        const hasFortressPoint = (Math.abs(px * 7 + pz * 13) % 10 < 3);
                        
                        const localX = (wx % pointFreq + pointFreq) % pointFreq;
                        const localZ = (wz % pointFreq + pointFreq) % pointFreq;
                        // 定义一个 5x5 的点位区域
                        const isInPoint = (localX >= 30 && localX <= 34 && localZ >= 30 && localZ <= 34);

                        for (let y = 0; y <= 64; y++) {
                            if (y === 0 || y === 64) {
                                blocks.set(`${wx},${y},${wz}`, 'bedrock');
                            } else {
                                const n3 = noise3D(wx * 0.04, y * 0.08, wz * 0.04);
                                if (n3 > -0.15) {
                                    blocks.set(`${wx},${y},${wz}`, 'netherrack');
                                    if (n3 > 0.5 && Math.random() < 0.05) blocks.set(`${wx},${y},${wz}`, 'magma');
                                    
                                    // 检测表面并生成小型要塞结构
                                    if (hasFortressPoint && isInPoint && y > 15 && y < 50) {
                                        const n3_above = noise3D(wx * 0.04, (y + 1) * 0.08, wz * 0.04);
                                        if (n3_above <= -0.15) { 
                                            // 1. 生成下界砖地基 (5x5)
                                            blocks.set(`${wx},${y},${wz}`, 'nether_bricks');
                                            
                                            // 2. 中心点生成核心方块
                                            if (localX === 32 && localZ === 32) {
                                                const typeSeed = (Math.abs(px) + Math.abs(pz)) % 2;
                                                if (typeSeed === 0) {
                                                    blocks.set(`${wx},${y + 1},${wz}`, 'spawner');
                                                } else {
                                                    blocks.set(`${wx},${y + 1},${wz}`, 'chest');
                                                    setTimeout(() => window.fillChestLoot(wx, y + 1, wz), 1000);
                                                }
                                            }
                                        }
                                    }
                                } else if (y < 12) {
                                    blocks.set(`${wx},${y},${wz}`, 'lava');
                                }
                            }
                        }
                    } else if (currentDimension === 'end') {
                        const dist = Math.sqrt(wx * wx + wz * wz);
                        // 末地主岛：噪声边缘
                        const islandNoise = (noise2D(wx * 0.08, wz * 0.08) + 1) * 5;
                        if (dist < 45 + islandNoise) {
                            const h = 8 + noise2D(wx * 0.05, wz * 0.05) * 3;
                            for (let y = 0; y < h; y++) {
                                blocks.set(`${wx},${y},${wz}`, 'end_stone');
                            }
                        }
                        
                        // 随机浮岛 (远离中心)
                        const scatterNoise = (noise2D(wx * 0.01, wz * 0.01) + 1) / 2;
                        if (dist > 80 && scatterNoise > 0.85) {
                            const localX = (wx % 16 + 16) % 16;
                            const localZ = (wz % 16 + 16) % 16;
                            const islandH = (noise2D(wx * 0.2, wz * 0.2) + 1) * 3;
                            if (islandH > 2) {
                                for (let y = 15; y < 15 + islandH; y++) {
                                    blocks.set(`${wx},${y},${wz}`, 'end_stone');
                                }
                            }
                        }

                        // 黑曜石柱子 (固定环形分布)
                        for (let i = 0; i < 10; i++) {
                            const angle = (i / 10) * Math.PI * 2;
                            const px = Math.cos(angle) * 35;
                            const pz = Math.sin(angle) * 35;
                            const pDist = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2);
                            if (pDist < 3.5) {
                                const h = 15 + i * 2;
                                for (let y = 0; y < h; y++) {
                                    if (y >= 8 || dist < 50) blocks.set(`${wx},${y},${wz}`, 'obsidian');
                                }
                                // 柱顶末地水晶 (实体)
                                if (pDist < 1 && wx === Math.round(px) && wz === Math.round(pz)) {
                                    if (typeof spawnEnderCrystal === 'function') {
                                        setTimeout(() => spawnEnderCrystal(wx + 0.5, h, wz + 0.5), 100);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // 严防死守：非主世界绝不产生水
            if (currentDimension !== 'overworld') {
                for (let [k, v] of blocks) if (v === 'water') blocks.delete(k);
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
                
                // 2. 检查全局已修改或已加载的区块 (快速通道)
                const tCx = Math.floor(x / chunkSize);
                const tCz = Math.floor(z / chunkSize);
                if (tCx === cx && tCz === cz) return null; // 同一区块但没找到，肯定是空气
                const tChunk = chunks.get(`${tCx},${tCz}`);
                if (tChunk) {
                    if (tChunk.blocks.has(pk)) return tChunk.blocks.get(pk);
                    return null; // 邻居区块已加载但没有这个方块，说明是空气
                }
                
                // 3. 如果邻居区块未加载，通过噪声函数预测地形
                if (currentDimension === 'overworld') {
                    const sY = Math.floor(noise2D(x * 0.04, z * 0.04) * 5);
                    if (y <= sY) return 'stone'; // 预测为固体
                    if (y <= 0) return 'water';  // 预测为水
                }
                return null; // 预测为空气
            };

            const isTransparent = (t) => {
                if (t === null || t === undefined) return true;
                const tr = ['glass', 'leaves', 'swamp_leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner'];
                return tr.includes(t);
            };
            const isOpaque = (t) => {
                if (t === null || t === undefined) return false;
                const nonOpaque = ['glass', 'leaves', 'swamp_leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'end_portal_frame_empty', 'end_portal_frame_filled', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner', 'water', 'lava', 'bed', 'bed_head', 'bed_foot', 'chest', 'ice'];
                return !nonOpaque.includes(t);
            };
            const isWater = (t) => t === 'water';
            const getWaterH = (nx, ny, nz, t) => {
                if (t !== 'water') return 0;
                if (getBlockProcedural(nx, ny + 1, nz) === 'water') return 1.0;
                const nKey = `${nx},${ny},${nz}`;
                let ndist = window.waterDistances.has(nKey) ? window.waterDistances.get(nKey) : 0;
                return Math.max(0.15, 1.0 - (ndist * 0.1));
            };

            blocks.forEach((type, posKey) => {
                const [bx, by, bz] = posKey.split(',').map(Number);
                if (type === 'water') {
                    const topT = getBlockProcedural(bx, by + 1, bz);
                    let h = 1.0;
                    if (topT !== 'water') {
                        let dist = window.waterDistances.has(posKey) ? window.waterDistances.get(posKey) : 0;
                        h = Math.max(0.15, 1.0 - (dist * 0.1));
                    }
                    
                    dummy.position.set(bx + 0.5, by + h / 2, bz + 0.5);
                    dummy.scale.set(1, h, 1);
                    dummy.updateMatrix();
                    
                    if (!isWater(topT)) meshes.water_top.setMatrixAt(counts.water_top++, dummy.matrix);
                    
                    const bottomT = getBlockProcedural(bx, by - 1, bz);
                    if (isTransparent(bottomT)) meshes.water_bottom.setMatrixAt(counts.water_bottom++, dummy.matrix);

                    const sides = [
                        [0, 0, -1, 'water_north'],
                        [0, 0, 1, 'water_south'],
                        [1, 0, 0, 'water_east'],
                        [-1, 0, 0, 'water_west']
                    ];
                    for (let [dx, dy, dz, faceName] of sides) {
                        const nx = bx + dx, ny = by + dy, nz = bz + dz;
                        const nT = getBlockProcedural(nx, ny, nz);
                        if (isTransparent(nT)) {
                            meshes[faceName].setMatrixAt(counts[faceName]++, dummy.matrix);
                        } else if (nT === 'water') {
                            const nH = getWaterH(nx, ny, nz, nT);
                            if (h > nH + 0.01) {
                                meshes[faceName].setMatrixAt(counts[faceName]++, dummy.matrix);
                            }
                        }
                    }
                    dummy.scale.set(1, 1, 1); // reset
                } else {
                    let isVisible = true;
                    if (isOpaque(type)) {
                        const top = getBlockProcedural(bx, by + 1, bz);
                        const bottom = getBlockProcedural(bx, by - 1, bz);
                        const north = getBlockProcedural(bx, by, bz - 1);
                        const south = getBlockProcedural(bx, by, bz + 1);
                        const east = getBlockProcedural(bx + 1, by, bz);
                        const west = getBlockProcedural(bx - 1, by, bz);
                        if (isOpaque(top) && isOpaque(bottom) && isOpaque(north) && isOpaque(south) && isOpaque(east) && isOpaque(west)) {
                            isVisible = false;
                        }
                    }

                    if (isVisible) {
                        dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5); dummy.updateMatrix();
                        meshes[type].setMatrixAt(counts[type]++, dummy.matrix);
                    }
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

            // Rebuild loaded neighbor chunks to update occlusion culling at chunk boundaries
            const neighbors = [
                chunks.get(`${cx-1},${cz}`), chunks.get(`${cx+1},${cz}`),
                chunks.get(`${cx},${cz-1}`), chunks.get(`${cx},${cz+1}`)
            ];
            neighbors.forEach(n => { if (n) window.meshRebuildQueue.add(n); });
        }

        function rebuildChunkMesh(chunk) {
            const counts = {}; for (const type in chunk.meshes) counts[type] = 0; 
            const dummy = new THREE.Object3D();
            
            const getBlockProcedural = (x, y, z) => {
                const pk = `${x},${y},${z}`;
                if (chunk.blocks.has(pk)) return chunk.blocks.get(pk);
                
                const tCx = Math.floor(x / chunkSize);
                const tCz = Math.floor(z / chunkSize);
                if (tCx === chunk.cx && tCz === chunk.cz) return null; // 同区块无方块即空气
                const tChunk = chunks.get(`${tCx},${tCz}`);
                if (tChunk) {
                    if (tChunk.blocks.has(pk)) return tChunk.blocks.get(pk);
                    return null; // 邻居区块已加载但没方块，空气
                }
                
                if (currentDimension === 'overworld') {
                    const sY = Math.floor(noise2D(x * 0.04, z * 0.04) * 5);
                    if (y <= sY) return 'stone';
                    if (y <= 0) return 'water';
                }
                return null;
            };
            const isTransparent = (t) => {
                if (t === null || t === undefined) return true;
                const tr = ['glass', 'leaves', 'swamp_leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner'];
                return tr.includes(t);
            };
            const isOpaque = (t) => {
                if (t === null || t === undefined) return false;
                const nonOpaque = ['glass', 'leaves', 'swamp_leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'end_portal_frame_empty', 'end_portal_frame_filled', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner', 'water', 'lava', 'bed', 'bed_head', 'bed_foot', 'chest', 'ice'];
                return !nonOpaque.includes(t);
            };
            const isWater = (t) => t === 'water';
            const getWaterH = (nx, ny, nz, t) => {
                if (t !== 'water') return 0;
                if (getBlockProcedural(nx, ny + 1, nz) === 'water') return 1.0;
                const nKey = `${nx},${ny},${nz}`;
                let ndist = window.waterDistances.has(nKey) ? window.waterDistances.get(nKey) : 0;
                return Math.max(0.15, 1.0 - (ndist * 0.1));
            };

            for (const [posKey, type] of chunk.blocks.entries()) { 
                const [bx, by, bz] = posKey.split(',').map(Number); 
                if (type === 'water') {
                    const topT = getBlockProcedural(bx, by + 1, bz);
                    let h = 1.0;
                    if (topT !== 'water') {
                        let dist = window.waterDistances.has(posKey) ? window.waterDistances.get(posKey) : 0;
                        h = Math.max(0.15, 1.0 - (dist * 0.1));
                    }
                    
                    dummy.position.set(bx + 0.5, by + h / 2, bz + 0.5);
                    dummy.scale.set(1, h, 1);
                    dummy.updateMatrix();
                    
                    if (!isWater(topT)) chunk.meshes.water_top.setMatrixAt(counts.water_top++, dummy.matrix);
                    
                    const bottomT = getBlockProcedural(bx, by - 1, bz);
                    if (isTransparent(bottomT)) chunk.meshes.water_bottom.setMatrixAt(counts.water_bottom++, dummy.matrix);

                    const sides = [
                        [0, 0, -1, 'water_north'],
                        [0, 0, 1, 'water_south'],
                        [1, 0, 0, 'water_east'],
                        [-1, 0, 0, 'water_west']
                    ];
                    for (let [dx, dy, dz, faceName] of sides) {
                        const nx = bx + dx, ny = by + dy, nz = bz + dz;
                        const nT = getBlockProcedural(nx, ny, nz);
                        if (isTransparent(nT)) {
                            chunk.meshes[faceName].setMatrixAt(counts[faceName]++, dummy.matrix);
                        } else if (nT === 'water') {
                            const nH = getWaterH(nx, ny, nz, nT);
                            if (h > nH + 0.01) {
                                chunk.meshes[faceName].setMatrixAt(counts[faceName]++, dummy.matrix);
                            }
                        }
                    }
                    dummy.scale.set(1, 1, 1); // reset
                } else {
                    let isVisible = true;
                    if (isOpaque(type)) {
                        const top = getBlockProcedural(bx, by + 1, bz);
                        const bottom = getBlockProcedural(bx, by - 1, bz);
                        const north = getBlockProcedural(bx, by, bz - 1);
                        const south = getBlockProcedural(bx, by, bz + 1);
                        const east = getBlockProcedural(bx + 1, by, bz);
                        const west = getBlockProcedural(bx - 1, by, bz);
                        if (isOpaque(top) && isOpaque(bottom) && isOpaque(north) && isOpaque(south) && isOpaque(east) && isOpaque(west)) {
                            isVisible = false;
                        }
                    }

                    if (isVisible) {
                        dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5); dummy.updateMatrix();
                        chunk.meshes[type].setMatrixAt(counts[type]++, dummy.matrix);
                    }
                }
            }
            // 扫描区块是否有火把
            let chunkHasTorch = false;
            for (const [posKey, type] of chunk.blocks.entries()) {
                if (type === 'torch') {
                    chunkHasTorch = true;
                    break;
                }
            }

            // 初始化火把区域的超亮材质（使用贴图自发光，百分之百保留纹理细节，杜绝泛白闪光弹效果）
            if (chunkHasTorch && !window.torchMaterials) {
                window.torchMaterials = {};
                for (let type in materials) {
                    const mat = materials[type];
                    if (Array.isArray(mat)) {
                        window.torchMaterials[type] = mat.map(m => {
                            const cloned = m.clone();
                            const baseColor = cloned.color ? cloned.color.clone() : new THREE.Color(0xffffff);
                            if (cloned.map) {
                                cloned.emissiveMap = cloned.map;
                                cloned.emissive = baseColor.multiplyScalar(0.53); // 核心修复：乘以材质本身的基色，确保草、水等带有调色系数的方块不丢失色彩（变黑白）！
                                cloned.emissiveIntensity = 1.0;
                            } else if (cloned.emissive) {
                                cloned.emissive = baseColor.multiplyScalar(0.5); 
                                cloned.emissiveIntensity = 1.0;
                            }
                            return cloned;
                        });
                    } else if (mat) {
                        const cloned = mat.clone();
                        const baseColor = cloned.color ? cloned.color.clone() : new THREE.Color(0xffffff);
                        if (cloned.map) {
                            cloned.emissiveMap = cloned.map;
                            cloned.emissive = baseColor.multiplyScalar(0.53);
                            cloned.emissiveIntensity = 1.0;
                        } else if (cloned.emissive) {
                            cloned.emissive = baseColor.multiplyScalar(0.5);
                            cloned.emissiveIntensity = 1.0;
                        }
                        window.torchMaterials[type] = cloned;
                    }
                }
            }

            for (const t in chunk.meshes) {
                const baseType = t.startsWith('water_') ? 'water' : t;
                const matSrc = chunkHasTorch ? window.torchMaterials : materials;
                if (matSrc && matSrc[baseType]) {
                    chunk.meshes[t].material = matSrc[baseType];
                }
                
                chunk.meshes[t].count = counts[t];
                chunk.meshes[t].instanceMatrix.needsUpdate = true;
                if (counts[t] > 0) chunk.meshes[t].computeBoundingSphere();
            }
        }

        function unloadChunk(key) { const chunk = chunks.get(key); if (!chunk) return; for (const type in chunk.meshes) { scene.remove(chunk.meshes[type]); chunk.meshes[type].dispose(); } for (const posKey of chunk.blocks.keys()) worldBlocks.delete(posKey); chunks.delete(key); }

        let chunkGenQueue = [];
        let expectedChunksSet = new Set();
        window.meshRebuildQueue = new Set();

        function updateChunks() {
            const camPos = camera.position; const cx = Math.floor(camPos.x / chunkSize); const cz = Math.floor(camPos.z / chunkSize);
            if (cx !== lastChunkX || cz !== lastChunkZ) {
                lastChunkX = cx; lastChunkZ = cz; 
                expectedChunksSet.clear();
                const viewDistance = 3;
                for (let dx = -viewDistance; dx <= viewDistance; dx++) { 
                    for (let dz = -viewDistance; dz <= viewDistance; dz++) { 
                        const targetCx = cx + dx; const targetCz = cz + dz; 
                        const key = `${targetCx},${targetCz}`; 
                        expectedChunksSet.add(key); 
                        if (!chunks.has(key) && !chunkGenQueue.some(q => q.key === key)) {
                            chunkGenQueue.push({cx: targetCx, cz: targetCz, key: key, distSq: dx*dx + dz*dz});
                        }
                    } 
                }
                
                chunkGenQueue.sort((a, b) => a.distSq - b.distSq);
                
                for (const key of chunks.keys()) { 
                    if (!expectedChunksSet.has(key)) unloadChunk(key); 
                }
                chunkGenQueue = chunkGenQueue.filter(q => expectedChunksSet.has(q.key));
            }
            
            if (chunkGenQueue.length > 0) {
                const startTime = performance.now();
                while (chunkGenQueue.length > 0) {
                    const q = chunkGenQueue.shift();
                    if (!chunks.has(q.key)) {
                        generateChunk(q.cx, q.cz);
                    }
                    if (performance.now() - startTime > 8) break; // 限制每帧最多生成 8ms，避免卡顿
                }
            } else if (window.meshRebuildQueue.size > 0) {
                const startTime = performance.now();
                for (let n of window.meshRebuildQueue) {
                    window.meshRebuildQueue.delete(n);
                    rebuildChunkMesh(n);
                    if (performance.now() - startTime > 8) break;
                }
            }
        }

        function generateReturnPortal() {
            const cx = 0; const cz = 0; const cKey = `${cx},${cz}`; let chunk = chunks.get(cKey); if (!chunk) return;
            const surfaceY = Math.floor(8 + (biomeNoise(0, 0) || 0) * 3); // 匹配末地主岛高度
            const py = surfaceY + 1;
            for (let x = -2; x <= 2; x++) { 
                for (let z = -2; z <= 2; z++) { 
                    const k = `${x},${py},${z}`; 
                    if (Math.abs(x) === 2 || Math.abs(z) === 2) { 
                        chunk.blocks.set(k, 'bedrock'); worldBlocks.add(k); 
                    } else { 
                        chunk.blocks.set(k, 'return_portal'); 
                    } 
                } 
            }
            rebuildChunkMesh(chunk);
        }

        updateChunks();

        const raycaster = new THREE.Raycaster(); raycaster.far = 5; const center = new THREE.Vector2(0, 0);
        const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005); const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const highlightBox = new THREE.LineSegments(new THREE.EdgesGeometry(highlightGeo), highlightMat); highlightBox.visible = false; scene.add(highlightBox);
        const miningOverlay = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), destroyStages[0]); miningOverlay.visible = false; scene.add(miningOverlay);
        const controls = new PointerLockControls(camera, document.body);
        window.controls = controls;
        const inventoryUiEl = document.getElementById('inventory-ui'); const debugUiEl = document.getElementById('debug-ui'); const chatContainer = document.getElementById('chat-container'); const chatInput = document.getElementById('chat-input');
        const uiLayer = document.getElementById('ui-layer'); const titleScreen = document.getElementById('title-screen'); const worldSelectScreen = document.getElementById('world-select-screen'); const createWorldScreen = document.getElementById('create-world-screen'); const pauseScreen = document.getElementById('pause-screen');

        // ==========================================