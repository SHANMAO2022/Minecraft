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

        function clearChunkTorchLights(chunk) {
            if (!chunk) return;
            if (chunk.torchLights) {
                chunk.torchLights.forEach(light => scene.remove(light));
                chunk.torchLights.length = 0;
            } else {
                chunk.torchLights = [];
            }
            chunk._torchLightSig = null;
        }

        function rebuildChunkTorchLights(chunk) {
            if (!chunk || !chunk.blocks) return;
            const torchPosKeys = [];
            for (const [posKey, type] of chunk.blocks.entries()) {
                if (type === 'torch') torchPosKeys.push(posKey);
            }
            const signature = torchPosKeys.join('|');
            if (chunk._torchLightSig === signature && chunk.torchLights) return;
            clearChunkTorchLights(chunk);
            chunk.torchLights = [];
            chunk._torchLightSig = signature;
            for (const posKey of torchPosKeys) {
                const [bx, by, bz] = posKey.split(',').map(Number);
                // p19: double torch lighting reach.
                const light = new THREE.PointLight(0xffc46b, 3.1, 111.0, 1.7);
                light.position.set(bx + 0.5, by + 0.72, bz + 0.5);
                light.castShadow = false;
                chunk.torchLights.push(light);
                scene.add(light);
            }
        }
        window.clearChunkTorchLights = clearChunkTorchLights;

        function switchDimension(newDim) {
            dimensionState[currentDimension].playerPos = camera.position.clone();
            chunks.forEach(c => {
                for (let t in c.meshes) scene.remove(c.meshes[t]);
                if (c.torchLights) c.torchLights.forEach(light => scene.remove(light));
            });
            entities.forEach(e => { scene.remove(e.mesh); if (e.beam) scene.remove(e.beam); }); particles.forEach(p => scene.remove(p.mesh)); particles.length = 0;
            currentDimension = newDim; chunks = dimensionState[newDim].chunks; worldBlocks = dimensionState[newDim].worldBlocks; entities = dimensionState[newDim].entities;
            chunks.forEach(c => {
                for (let t in c.meshes) scene.add(c.meshes[t]);
                if (c.torchLights) c.torchLights.forEach(light => scene.add(light));
            });
            entities.forEach(e => { scene.add(e.mesh); if (e.beam) scene.add(e.beam); });
            document.getElementById('biome-display').innerText = `Biome: ${newDim.charAt(0).toUpperCase() + newDim.slice(1)}`;
            if (newDim === 'overworld') { 
                scene.background = skyColors.overworld; 
                if (window.shadowsEnabled) {
                    scene.fog.color = skyColors.overworld;
                    scene.fog.density = 0.007;
                } else {
                    scene.fog.color = skyColors.overworld; 
                    scene.fog.near = 40; 
                    scene.fog.far = 80; 
                }
                ambientLight.intensity = 0.6; 
                directionalLight.intensity = 0.8; 
            }
            else if (newDim === 'nether') { 
                scene.background = skyColors.nether; 
                if (window.awardAchievement) window.awardAchievement('into_nether');
                if (window.shadowsEnabled) {
                    scene.fog.color = skyColors.nether;
                    scene.fog.density = 0.035;
                } else {
                    scene.fog.color = skyColors.nether; 
                    scene.fog.near = 5; 
                    scene.fog.far = 30; 
                }
                ambientLight.intensity = 0.8; 
                directionalLight.intensity = 0; 
            }
            else if (newDim === 'end') { 
                scene.background = skyColors.end; 
                if (window.awardAchievement) window.awardAchievement('into_end');
                if (window.shadowsEnabled) {
                    scene.fog.color = skyColors.end;
                    scene.fog.density = 0.008;
                } else {
                    scene.fog.color = skyColors.end; 
                    scene.fog.near = 40; 
                    scene.fog.far = 100; 
                }
                ambientLight.intensity = 0.4; 
                directionalLight.intensity = 0.2; 
                if (entities.filter(e => e.type === 'dragon').length === 0 && !isGameClear) setTimeout(() => spawnEnderDragon(), 2000); 
                if (typeof generateEmptyReturnPortal === 'function') setTimeout(() => generateEmptyReturnPortal(), 1000);
            }
            
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

        function hash2i(a, b, seed) {
            const s = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453123;
            return s - Math.floor(s);
        }

        function getSurfaceYAt(wx, wz) {
            const biome = window.getBiome(wx, wz);
            return Math.floor(noise2D(wx * 0.04, wz * 0.04) * 6 * biome.hMult + biome.hBase);
        }

        function getFacingFromType(type) {
            if (window.getTypeFacing) return window.getTypeFacing(type);
            const m = type ? String(type).match(/_(north|south|east|west)$/) : null;
            return m ? m[1] : null;
        }

        function getBedYawByFacing(facing) {
            if (facing === 'north') return Math.PI;
            if (facing === 'east') return -Math.PI / 2;
            if (facing === 'west') return Math.PI / 2;
            return 0; // south
        }

        function getDoorYawByFacing(facing) {
            if (facing === 'east') return -Math.PI / 2;
            if (facing === 'south') return Math.PI;
            if (facing === 'west') return Math.PI / 2;
            return 0; // north
        }

        function getStairYawByFacing(facing) {
            if (facing === 'north') return Math.PI;
            if (facing === 'east') return Math.PI / 2;
            if (facing === 'west') return -Math.PI / 2;
            return 0; // south
        }

        function getBlockYawByFacing(type, baseType) {
            const facing = getFacingFromType(type);
            if (!facing) return 0;
            if (baseType && baseType.startsWith('door_')) return getDoorYawByFacing(facing);
            if (baseType === 'bed' || baseType === 'bed_head' || baseType === 'bed_foot') return getBedYawByFacing(facing);
            if (baseType && (baseType.endsWith('_stairs') || (window.isStairType && window.isStairType(baseType)))) return getStairYawByFacing(facing);
            return getBedYawByFacing(facing);
        }

        const stairFacingDirs = {
            north: { dx: 0, dz: -1 },
            south: { dx: 0, dz: 1 },
            east: { dx: 1, dz: 0 },
            west: { dx: -1, dz: 0 }
        };
        function getLeftFacing(facing) {
            return { north: 'west', west: 'south', south: 'east', east: 'north' }[facing] || 'west';
        }
        function getRightFacing(facing) {
            return { north: 'east', east: 'south', south: 'west', west: 'north' }[facing] || 'east';
        }
        function getVillageRoofStairType(root, facing, variant) {
            const variantType = window.getStairVariantType ? window.getStairVariantType(root, variant) : root;
            return window.withFacing ? window.withFacing(variantType, facing) : `${variantType}_${facing}`;
        }
        function getVillageRoofEdgeStair(h, wx, wz) {
            const minX = h.x - 1, maxX = h.x + h.w, minZ = h.z - 1, maxZ = h.z + h.d;
            const north = wz === minZ, south = wz === maxZ, west = wx === minX, east = wx === maxX;
            if (north && west) return getVillageRoofStairType('oak_stairs', 'north', 'inner_right');
            if (north && east) return getVillageRoofStairType('oak_stairs', 'north', 'inner_left');
            if (south && west) return getVillageRoofStairType('oak_stairs', 'south', 'inner_left');
            if (south && east) return getVillageRoofStairType('oak_stairs', 'south', 'inner_right');
            if (north) return getVillageRoofStairType('oak_stairs', 'north');
            if (south) return getVillageRoofStairType('oak_stairs', 'south');
            if (west) return getVillageRoofStairType('oak_stairs', 'west');
            return getVillageRoofStairType('oak_stairs', 'east');
        }

        function getSpawnGuaranteedVillages() {
            const seed = typeof window.mcSeed === 'number' ? window.mcSeed : 0;
            if (window._spawnVillageCache && window._spawnVillageCache.seed === seed) return window._spawnVillageCache.centers;

            const desiredCount = Math.floor(hash2i(11, 17, seed) * 3) + 1; // 1..3
            const centers = [];
            for (let i = 0; i < 96 && centers.length < desiredCount; i++) {
                const ang = hash2i(i, 77, seed) * Math.PI * 2;
                const dist = 500 + hash2i(i, 155, seed) * 500; // 500..1000
                const vx = Math.round(Math.cos(ang) * dist);
                const vz = Math.round(Math.sin(ang) * dist);
                const biome = window.getBiome(vx, vz);
                if (!(window.isPlainBiome ? window.isPlainBiome(biome) : (biome && biome.name === '平原'))) continue;
                const y0 = getSurfaceYAt(vx, vz);
                const y1 = getSurfaceYAt(vx + 12, vz);
                const y2 = getSurfaceYAt(vx, vz + 12);
                if (Math.max(Math.abs(y0 - y1), Math.abs(y0 - y2)) > 3) continue;
                centers.push({ x: vx, z: vz, y: y0 });
            }
            // Fallback scan: aggressively search 500~1000 ring so spawn village is always found for 1.00 mode.
            if (centers.length < desiredCount) {
                for (let dist = 500; dist <= 1000 && centers.length < desiredCount; dist += 24) {
                    for (let deg = 0; deg < 360 && centers.length < desiredCount; deg += 8) {
                        const ang = (deg * Math.PI / 180) + hash2i(dist, deg, seed) * 0.07;
                        const vx = Math.round(Math.cos(ang) * dist);
                        const vz = Math.round(Math.sin(ang) * dist);
                        if (centers.some(c => {
                            const dx = c.x - vx;
                            const dz = c.z - vz;
                            return dx * dx + dz * dz < 140 * 140;
                        })) continue;
                        const biome = window.getBiome(vx, vz);
                        if (!(window.isPlainBiome ? window.isPlainBiome(biome) : (biome && biome.name === '平原'))) continue;
                        const y0 = getSurfaceYAt(vx, vz);
                        const y1 = getSurfaceYAt(vx + 12, vz);
                        const y2 = getSurfaceYAt(vx, vz + 12);
                        if (Math.max(Math.abs(y0 - y1), Math.abs(y0 - y2)) > 3) continue;
                        centers.push({ x: vx, z: vz, y: y0 });
                    }
                }
            }
            window._spawnVillageCache = { seed, centers };
            return centers;
        }

        function getVillageCentersNearChunk(cx, cz) {
            if (!window.update100Enabled || currentDimension !== 'overworld') return [];

            const regionSize = 2048;
            const minOffset = 500;
            const maxOffset = 1000;
            const maxLocalOffset = Math.min(maxOffset, regionSize - 1);

            const wx0 = cx * chunkSize;
            const wz0 = cz * chunkSize;
            const minRx = Math.floor((wx0 - maxLocalOffset) / regionSize);
            const maxRx = Math.floor((wx0 + chunkSize + maxLocalOffset) / regionSize);
            const minRz = Math.floor((wz0 - maxLocalOffset) / regionSize);
            const maxRz = Math.floor((wz0 + chunkSize + maxLocalOffset) / regionSize);

            const out = [];
            const seen = new Set();
            const addCenter = (v) => {
                const k = `${v.x},${v.z}`;
                if (seen.has(k)) return;
                seen.add(k);
                out.push(v);
            };
            const seed = typeof window.mcSeed === 'number' ? window.mcSeed : 0;

            const nearPad = 22;
            const minX = wx0 - nearPad;
            const maxX = wx0 + chunkSize + nearPad;
            const minZ = wz0 - nearPad;
            const maxZ = wz0 + chunkSize + nearPad;
            getSpawnGuaranteedVillages().forEach(v => {
                if (v.x >= minX && v.x <= maxX && v.z >= minZ && v.z <= maxZ) addCenter(v);
            });

            for (let rx = minRx; rx <= maxRx; rx++) {
                for (let rz = minRz; rz <= maxRz; rz++) {
                    const offX = Math.floor(minOffset + hash2i(rx, rz, seed) * (maxLocalOffset - minOffset));
                    const offZ = Math.floor(minOffset + hash2i(rx + 91, rz - 37, seed) * (maxLocalOffset - minOffset));
                    const vx = rx * regionSize + offX;
                    const vz = rz * regionSize + offZ;
                    const biome = window.getBiome(vx, vz);
                    if (!(window.isPlainBiome ? window.isPlainBiome(biome) : (biome && biome.name === '平原'))) continue;
                    const y0 = getSurfaceYAt(vx, vz);
                    const y1 = getSurfaceYAt(vx + 12, vz);
                    const y2 = getSurfaceYAt(vx, vz + 12);
                    if (Math.max(Math.abs(y0 - y1), Math.abs(y0 - y2)) > 3) continue;
                    addCenter({ x: vx, z: vz, y: y0 });
                }
            }
            return out;
        }

        window.getUpdate100SpawnPos = function() {
            if (!window.update100Enabled) return null;
            const centers = getSpawnGuaranteedVillages();
            if (!centers || centers.length === 0) return null;
            const c = centers[0];
            return { x: c.x + 0.5, y: c.y + 3.0, z: c.z + 0.5 };
        };

        function setVillageBlock(blocks, cx, cz, wx, y, wz, type) {
            if (Math.floor(wx / chunkSize) !== cx || Math.floor(wz / chunkSize) !== cz) return;
            const key = `${wx},${y},${wz}`;
            if (type === null) blocks.delete(key); else blocks.set(key, type);
        }

        function applyVillageToChunk(blocks, cx, cz) {
            if (!window.update100Enabled || currentDimension !== 'overworld') return;
            const centers = getVillageCentersNearChunk(cx, cz);
            if (centers.length === 0) return;

            centers.forEach(center => {
                const baseY = center.y;
                const centerX = center.x;
                const centerZ = center.z;
                const houses = [
                    { x: centerX - 11, z: centerZ - 11, w: 7, d: 7, entrance: 'south' },
                    { x: centerX + 5, z: centerZ + 5, w: 7, d: 7, entrance: 'north' },
                    { x: centerX - 12, z: centerZ + 6, w: 6, d: 6, entrance: 'east' }
                ];
                const villageBeds = [];

                for (let wx = centerX - 18; wx <= centerX + 18; wx++) {
                    for (let wz = centerZ - 18; wz <= centerZ + 18; wz++) {
                        const rx = wx - centerX;
                        const rz = wz - centerZ;
                        for (let y = baseY - 4; y < baseY; y++) setVillageBlock(blocks, cx, cz, wx, y, wz, 'dirt');
                        const isPath = Math.abs(rx) <= 2 || Math.abs(rz) <= 2;
                        setVillageBlock(blocks, cx, cz, wx, baseY, wz, isPath ? 'cobblestone' : 'grass');
                        for (let y = baseY + 1; y <= baseY + 7; y++) setVillageBlock(blocks, cx, cz, wx, y, wz, null);
                    }
                }

                houses.forEach(h => {
                    for (let wx = h.x; wx < h.x + h.w; wx++) {
                        for (let wz = h.z; wz < h.z + h.d; wz++) {
                            setVillageBlock(blocks, cx, cz, wx, baseY, wz, 'planks');
                            for (let y = baseY + 1; y <= baseY + 5; y++) setVillageBlock(blocks, cx, cz, wx, y, wz, null);
                        }
                    }

                    let doorX = Math.floor(h.x + h.w / 2);
                    let doorZ = Math.floor(h.z + h.d / 2);
                    let frontX = doorX;
                    let frontZ = doorZ;
                    if (h.entrance === 'south') { doorZ = h.z + h.d - 1; frontZ = doorZ + 1; }
                    else if (h.entrance === 'north') { doorZ = h.z; frontZ = doorZ - 1; }
                    else if (h.entrance === 'east') { doorX = h.x + h.w - 1; frontX = doorX + 1; }
                    else { doorX = h.x; frontX = doorX - 1; }

                    for (let wx = h.x; wx < h.x + h.w; wx++) {
                        for (let wz = h.z; wz < h.z + h.d; wz++) {
                            const edge = wx === h.x || wx === h.x + h.w - 1 || wz === h.z || wz === h.z + h.d - 1;
                            if (!edge) continue;
                            for (let y = baseY + 1; y <= baseY + 3; y++) {
                                const isDoor = wx === doorX && wz === doorZ && y <= baseY + 2;
                                const isWindow = y === baseY + 2 && (
                                    ((wx === h.x || wx === h.x + h.w - 1) && wz === Math.floor(h.z + h.d / 2)) ||
                                    ((wz === h.z || wz === h.z + h.d - 1) && wx === Math.floor(h.x + h.w / 2))
                                );
                                setVillageBlock(blocks, cx, cz, wx, y, wz, isDoor ? null : (isWindow ? 'glass' : 'planks'));
                            }
                        }
                    }

                    const doorFacing = h.entrance || 'south';
                    const doorBottomType = window.withFacing ? window.withFacing('door_bottom', doorFacing) : `door_bottom_${doorFacing}`;
                    const doorTopType = window.withFacing ? window.withFacing('door_top', doorFacing) : `door_top_${doorFacing}`;
                    setVillageBlock(blocks, cx, cz, doorX, baseY + 1, doorZ, doorBottomType);
                    setVillageBlock(blocks, cx, cz, doorX, baseY + 2, doorZ, doorTopType);
                    setVillageBlock(blocks, cx, cz, frontX, baseY, frontZ, 'cobblestone');
                    setVillageBlock(blocks, cx, cz, frontX, baseY + 1, frontZ, null);
                    setVillageBlock(blocks, cx, cz, frontX, baseY + 2, frontZ, null);

                    for (let wx = h.x - 1; wx <= h.x + h.w; wx++) {
                        for (let wz = h.z - 1; wz <= h.z + h.d; wz++) {
                            const edge = wx === h.x - 1 || wx === h.x + h.w || wz === h.z - 1 || wz === h.z + h.d;
                            setVillageBlock(blocks, cx, cz, wx, baseY + 4, wz, edge ? getVillageRoofEdgeStair(h, wx, wz) : 'planks');
                            if (!edge && wx > h.x && wx < h.x + h.w - 1 && wz > h.z && wz < h.z + h.d - 1) {
                                setVillageBlock(blocks, cx, cz, wx, baseY + 5, wz, 'planks');
                            }
                        }
                    }

                    let bedFootX = Math.floor(h.x + h.w / 2);
                    let bedFootZ = Math.floor(h.z + h.d / 2);
                    let bedDx = 0, bedDz = 1;
                    if (h.entrance === 'south') { bedFootZ = h.z + h.d - 3; bedDx = 0; bedDz = -1; }
                    else if (h.entrance === 'north') { bedFootZ = h.z + 2; bedDx = 0; bedDz = 1; }
                    else if (h.entrance === 'east') { bedFootX = h.x + h.w - 3; bedDx = -1; bedDz = 0; }
                    else { bedFootX = h.x + 2; bedDx = 1; bedDz = 0; }
                    const bedHeadX = bedFootX + bedDx;
                    const bedHeadZ = bedFootZ + bedDz;
                    const bedFacing = window.getFacingFromDelta ? window.getFacingFromDelta(bedDx, bedDz) : (Math.abs(bedDx) >= Math.abs(bedDz) ? (bedDx >= 0 ? 'east' : 'west') : (bedDz >= 0 ? 'south' : 'north'));
                    const bedFootType = window.withFacing ? window.withFacing('bed_foot', bedFacing) : `bed_foot_${bedFacing}`;
                    const bedHeadType = window.withFacing ? window.withFacing('bed_head', bedFacing) : `bed_head_${bedFacing}`;
                    setVillageBlock(blocks, cx, cz, bedFootX, baseY + 1, bedFootZ, bedFootType);
                    setVillageBlock(blocks, cx, cz, bedHeadX, baseY + 1, bedHeadZ, bedHeadType);
                    villageBeds.push({ x: bedFootX, y: baseY + 1, z: bedFootZ, dx: bedDx, dz: bedDz });
                });

                [[centerX - 5, centerZ - 2], [centerX + 4, centerZ + 2], [centerX - 2, centerZ + 7]].forEach(([wx, wz]) => {
                    setVillageBlock(blocks, cx, cz, wx, baseY + 1, wz, 'composter');
                });

                const villageKey = `${centerX},${centerZ}`;
                window.villageDeferredSpawnPlans = window.villageDeferredSpawnPlans || {};
                if (!window.villageDeferredSpawnPlans[villageKey]) {
                    const villagerPositions = [
                        [centerX - 8, centerZ - 2], [centerX - 5, centerZ - 6], [centerX, centerZ - 8], [centerX + 5, centerZ - 6], [centerX + 8, centerZ - 2],
                        [centerX + 8, centerZ + 3], [centerX + 5, centerZ + 7], [centerX, centerZ + 8], [centerX - 5, centerZ + 7], [centerX - 8, centerZ + 3]
                    ];
                    const bedsForVillagers = villageBeds.length > 0 ? villageBeds : [{ x: centerX, y: baseY + 1, z: centerZ, dx: 0, dz: 1 }];
                    const waitMs = Math.max(50, Math.floor((5.0 - (typeof gameStartTime === 'number' ? gameStartTime : 0)) * 1000));
                    window.villageDeferredSpawnPlans[villageKey] = {
                        spawned: false,
                        villageKey,
                        centerX,
                        centerZ,
                        baseY,
                        positions: villagerPositions,
                        beds: bedsForVillagers,
                        combatKilledSlots: {}
                    };
                    setTimeout(function trySpawnVillageResidents() {
                        const plan = window.villageDeferredSpawnPlans && window.villageDeferredSpawnPlans[villageKey];
                        if (!plan || plan.spawned) return;
                        if (!window.update100Enabled) return;
                        if (currentDimension !== 'overworld') {
                            setTimeout(trySpawnVillageResidents, 1200);
                            return;
                        }

                        if (typeof window.ensureVillageVillagerPopulation === 'function') {
                            window.ensureVillageVillagerPopulation(plan);
                        }

                        plan.spawned = true;
                    }, waitMs);
                }
            });
        }

        function getVillagePlanSpawnKey(plan, index) {
            return `village:${plan.centerX},${plan.centerZ}:${index}`;
        }

        function isLiveVillageVillagerForSlot(spawnKey) {
            return entities.some(e => e.type === 'villager' && e.villageSpawnKey === spawnKey && e.hp > 0 && !e.dying);
        }

        function ensureVillageVillagerPopulation(plan) {
            if (!plan || !window.update100Enabled || currentDimension !== 'overworld' || typeof window.spawnVillager !== 'function') return;
            const positions = Array.isArray(plan.positions) ? plan.positions : [];
            const beds = Array.isArray(plan.beds) && plan.beds.length > 0 ? plan.beds : [{ x: plan.centerX, y: plan.baseY + 1, z: plan.centerZ, dx: 0, dz: 1 }];
            plan.combatKilledSlots = plan.combatKilledSlots || {};

            positions.forEach(([vx, vz], i) => {
                const spawnKey = getVillagePlanSpawnKey(plan, i);
                if (plan.combatKilledSlots[spawnKey] || isLiveVillageVillagerForSlot(spawnKey)) return;

                const nearbyExisting = entities.find(e =>
                    e.type === 'villager' &&
                    !e.villageSpawnKey &&
                    e.hp > 0 &&
                    !e.dying &&
                    e.mesh.position.distanceToSquared(new THREE.Vector3(vx + 0.5, plan.baseY + 1.0, vz + 0.5)) < 3.0
                );
                if (nearbyExisting) {
                    nearbyExisting.villageSpawnKey = spawnKey;
                    nearbyExisting.homeBed = nearbyExisting.homeBed || beds[i % beds.length];
                    return;
                }

                window.spawnVillager(vx + 0.5, vz + 0.5, plan.baseY, spawnKey, beds[i % beds.length]);
            });
        }
        window.ensureVillageVillagerPopulation = ensureVillageVillagerPopulation;

        window.markVillageVillagerKilled = function(villager, source) {
            if (!villager || villager.type !== 'villager' || !villager.villageSpawnKey || (source !== 'player' && source !== 'monster')) return;
            const plans = window.villageDeferredSpawnPlans || {};
            Object.keys(plans).forEach(key => {
                const plan = plans[key];
                if (!plan || !Array.isArray(plan.positions)) return;
                const prefix = `village:${plan.centerX},${plan.centerZ}:`;
                if (villager.villageSpawnKey.indexOf(prefix) !== 0) return;
                plan.combatKilledSlots = plan.combatKilledSlots || {};
                plan.combatKilledSlots[villager.villageSpawnKey] = source;
            });
        };

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
            
            const getBiome = window.getBiome;

            const blocks = new Map();
            const dummy = new THREE.Object3D();
            const applyBiomeInstanceColor = (mesh, type, x, z, index) => {
                return;
            };
            
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
                                if (surfaceY < 0 && type === 'grass') type = 'sand';
                                if (biome.name === '高山' && y > 15) type = 'snow';
                            } else if (y > surfaceY - 3) {
                                type = biome.sub;
                            }
                            
                            // 3D 矿洞与大巨洞雕刻
                            let isCarved = false;
                            if (y > bottomY + 2 && y < surfaceY - 3) {
                                // 1. 蠕虫矿洞 (中频噪声绝对值)
                                const n3 = noise3D(wx * 0.04, y * 0.08, wz * 0.04);
                                const n3_detail = noise3D(wx * 0.12, y * 0.24, wz * 0.12);
                                const wormValue = Math.abs(n3 * 0.85 + n3_detail * 0.15);
                                
                                // 2. 大矿洞巨室 (低频噪声)
                                const cavernValue = noise3D(wx * 0.015, y * 0.03, wz * 0.015);
                                
                                let wormThresh = 0.08;
                                let cavernThresh = 0.55;
                                if (window.isPlainBiome ? window.isPlainBiome(biome) : biome.name === '平原') {
                                    wormThresh = 0.16; // 平原下蠕虫通道概率翻倍
                                    cavernThresh = 0.43; // 平原下巨型大矿洞判定门槛显著降低（几率与体积变大）
                                }
                                
                                // 排除要塞核心区，以防冲刷要塞
                                const isInsideStronghold = (wx >= 54 && wx <= 74 && wz >= 54 && wz <= 74 && y >= -28 && y <= -22);
                                
                                if (!isInsideStronghold && (wormValue < wormThresh || cavernValue > cavernThresh)) {
                                    isCarved = true;
                                }
                            }
                            
                            if (!isCarved) {
                                // 3D 矿物矿脉聚集生成 (仅在 stone 层中生成)
                                if (type === 'stone') {
                                    const oreNoiseVal = noise3D(wx * 0.25, y * 0.25, wz * 0.25);
                                    if (oreNoiseVal > 0.68) { // 约占石头的 3%-5%
                                        // 确定性哈希选择矿石种类，使同一个 3x3x3 矿脉格子内生成相同的矿物
                                        const cxGrid = Math.floor(wx / 3);
                                        const cyGrid = Math.floor(y / 3);
                                        const czGrid = Math.floor(wz / 3);
                                        const seed = Math.sin(cxGrid * 12.9898 + cyGrid * 78.233 + czGrid * 37.719) * 43758.5453;
                                        const r = seed - Math.floor(seed);
                                        
                                        if (y < -45) { // 深层
                                            if (window.update100Enabled && r < 0.06) type = 'emerald_ore';
                                            else if (r < 0.14) type = 'diamond_ore';
                                            else if (r < 0.32) type = 'gold_ore';
                                            else if (r < 0.65) type = 'iron_ore';
                                            else type = 'coal_ore';
                                        } else if (y < -16) { // 中深层
                                            if (window.update100Enabled && r < 0.06) type = 'emerald_ore';
                                            else if (r < 0.20) type = 'gold_ore';
                                            else if (r < 0.55) type = 'iron_ore';
                                            else type = 'coal_ore';
                                        } else if (y < 8) { // 浅层
                                            if (r < 0.35) type = 'iron_ore';
                                            else type = 'coal_ore';
                                        } else { // 极浅层及地表附近
                                            type = 'coal_ore';
                                        }
                                    }
                                }
                                blocks.set(`${wx},${y},${wz}`, type);
                            }
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
                            // 树木与群系植被特征生成
                            const isTreeBiome = (biome.name === '树林' || biome.name === '桦木林' || biome.name === '针叶林' || biome.name === '丛林');
                            const treeChance = biome.name === '树林' ? 0.025 :
                                               biome.name === '桦木林' ? 0.025 :
                                               biome.name === '针叶林' ? 0.03 :
                                               biome.name === '丛林' ? 0.065 : 0;
                            
                            if (isTreeBiome && rand < treeChance) {
                                if ((window.getBaseType ? window.getBaseType(currentTop) : currentTop) === 'grass') {
                                    let trunkHeight = 5;
                                    let leafType = 'leaves';
                                    if (biome.name === '针叶林') {
                                        trunkHeight = 6;
                                    } else if (biome.name === '丛林') {
                                        trunkHeight = 7;
                                    } else if (biome.name === '桦木林') {
                                        trunkHeight = 5;
                                    }
                                    
                                    // 1. 生成树干
                                    for (let ty = 1; ty <= trunkHeight; ty++) {
                                        blocks.set(`${wx},${surfaceY + ty},${wz}`, 'log');
                                    }
                                    
                                    // 2. 生成树叶
                                    if (biome.name === '针叶林') {
                                        // 松树：圆锥形/塔状交错树叶
                                        for (let ly = 2; ly <= trunkHeight + 1; ly++) {
                                            let rad = 1;
                                            if (ly === trunkHeight + 1) rad = 0;
                                            else if (ly === trunkHeight) rad = 1;
                                            else if (ly % 2 === 0) rad = 2;
                                            else rad = 1;
                                            
                                            for (let lx = -rad; lx <= rad; lx++) {
                                                for (let lz = -rad; lz <= rad; lz++) {
                                                    if (Math.abs(lx) + Math.abs(lz) <= rad) {
                                                        const lX = wx + lx, lY = surfaceY + ly, lZ = wz + lz;
                                                        const lk = `${lX},${lY},${lZ}`;
                                                        const targetCx = Math.floor(lX / chunkSize);
                                                        const targetCz = Math.floor(lZ / chunkSize);
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
                                    } else {
                                        // 普通树林、丛林、桦木林：标准圆球/扁球形树叶
                                        const leafRadius = biome.name === '丛林' ? 4 : 3;
                                        for (let lx = -2; lx <= 2; lx++) {
                                            for (let lz = -2; lz <= 2; lz++) {
                                                for (let ly = trunkHeight - 2; ly <= trunkHeight + 1; ly++) {
                                                    if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly - trunkHeight) <= leafRadius) {
                                                        const lX = wx + lx, lY = surfaceY + ly, lZ = wz + lz;
                                                        const lk = `${lX},${lY},${lZ}`;
                                                        const targetCx = Math.floor(lX / chunkSize);
                                                        const targetCz = Math.floor(lZ / chunkSize);
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
                                    }
                                }
                            }
                            // 3. 其他装饰与特有物
                            else if (biome.name === '沙漠' && rand < 0.01 && currentTop === 'sand') {
                                for (let cy = 1; cy <= 3; cy++) blocks.set(`${wx},${surfaceY + cy},${wz}`, 'cactus');
                            } else if (biome.name === '红砂荒漠' && rand < 0.01 && currentTop === 'sand') {
                                // 红砂荒漠也可以有仙人掌
                                for (let cy = 1; cy <= 2; cy++) blocks.set(`${wx},${surfaceY + cy},${wz}`, 'cactus');
                            } else if (rand < 0.05 && (window.getBaseType ? window.getBaseType(currentTop) : currentTop) === 'grass') {
                                blocks.set(`${wx},${surfaceY + 1},${wz}`, 'tall_grass');
                            } else if (biome.name === '向日葵平原' && rand < 0.15 && (window.getBaseType ? window.getBaseType(currentTop) : currentTop) === 'grass') {
                                // 向日葵平原/花海有极高密度的草和植被
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

            applyVillageToChunk(blocks, cx, cz);
            
            // 合并修改过的数据
            for (const mKey in modifiedBlocks[currentDimension]) {
                const [mx, my, mz] = mKey.split(',').map(Number);
                if (Math.floor(mx/chunkSize) === cx && Math.floor(mz/chunkSize) === cz) {
                    let mt = modifiedBlocks[currentDimension][mKey];
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
                
                // 3. 如果邻居区块未加载，通过分形噪声与3D矿洞函数预测地形与洞穴，杜绝边界剔除裂隙与闪烁
                if (currentDimension === 'overworld') {
                    const biome = window.getBiome(x, z);
                    const sY = Math.floor(noise2D(x * 0.04, z * 0.04) * 6 * biome.hMult + biome.hBase);
                    
                    if (y <= sY) {
                        const bottomY = -64;
                        if (y === bottomY || y === bottomY + 1) return 'bedrock';
                        
                        // 预测 3D 矿洞与巨洞雕刻
                        if (y > bottomY + 2 && y < sY - 3) {
                            const n3 = noise3D(x * 0.04, y * 0.08, z * 0.04);
                            const n3_detail = noise3D(x * 0.12, y * 0.24, z * 0.12);
                            const wormValue = Math.abs(n3 * 0.85 + n3_detail * 0.15);
                            
                            const cavernValue = noise3D(x * 0.015, y * 0.03, z * 0.015);
                            
                            let wormThresh = 0.08;
                            let cavernThresh = 0.55;
                            if (window.isPlainBiome ? window.isPlainBiome(biome) : biome.name === '平原') {
                                wormThresh = 0.16;
                                cavernThresh = 0.43;
                            }
                            
                            const isInsideStronghold = (x >= 54 && x <= 74 && z >= 54 && z <= 74 && y >= -28 && y <= -22);
                            
                            if (!isInsideStronghold && (wormValue < wormThresh || cavernValue > cavernThresh)) {
                                return null;
                            }
                        }
                        
                        // 预测固体方块类型
                        if (y === sY) {
                            let type = biome.top;
                            if (sY < 0 && type === 'grass') type = 'sand';
                            if (biome.name === '高山' && y > 15) type = 'snow';
                            return type;
                        }
                        if (y > sY - 3) return biome.sub;
                        return 'stone';
                    }
                    if (y <= 0) return 'water';
                }
                return null;
            };

            const toBaseType = (t) => (t && window.getBaseType ? window.getBaseType(t) : t);
            const isTransparent = (t) => {
                const base = toBaseType(t);
                if (base === null || base === undefined) return true;
                const tr = ['glass', 'leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner'];
                return tr.includes(base);
            };
            const isOpaque = (t) => {
                const base = toBaseType(t);
                if (base === null || base === undefined) return false;
                const nonOpaque = ['glass', 'leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'end_portal_frame_empty', 'end_portal_frame_filled', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner', 'water', 'lava', 'bed', 'bed_head', 'bed_foot', 'chest', 'ice'];
                return !nonOpaque.includes(base);
            };
            const isWater = (t) => toBaseType(t) === 'water';
            const getWaterH = (nx, ny, nz, t) => {
                if (!isWater(t)) return 0;
                if (isWater(getBlockProcedural(nx, ny + 1, nz))) return 1.0;
                const nKey = `${nx},${ny},${nz}`;
                let ndist = window.waterDistances.has(nKey) ? window.waterDistances.get(nKey) : 0;
                return Math.max(0.15, 1.0 - (ndist * 0.1));
            };

            blocks.forEach((fullType, posKey) => {
                const [bx, by, bz] = posKey.split(',').map(Number);
                const baseType = toBaseType(fullType);
                if (baseType === 'water') {
                    const topT = getBlockProcedural(bx, by + 1, bz);
                    let h = 1.0;
                    if (!isWater(topT)) {
                        let dist = window.waterDistances.has(posKey) ? window.waterDistances.get(posKey) : 0;
                        h = Math.max(0.15, 1.0 - (dist * 0.1));
                    }
                    
                    dummy.rotation.set(0, 0, 0);
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
                        } else if (isWater(nT)) {
                            const nH = getWaterH(nx, ny, nz, nT);
                            if (h > nH + 0.01) {
                                meshes[faceName].setMatrixAt(counts[faceName]++, dummy.matrix);
                            }
                        }
                    }
                    dummy.scale.set(1, 1, 1); // reset
                    dummy.rotation.set(0, 0, 0);
                } else {
                    let isVisible = true;
                    if (isOpaque(baseType)) {
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
                        dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5);
                        dummy.rotation.set(0, getBlockYawByFacing(fullType, baseType), 0);
                        dummy.updateMatrix();
                        if (meshes[baseType]) {
                            const idx = counts[baseType]++;
                            meshes[baseType].setMatrixAt(idx, dummy.matrix);
                            applyBiomeInstanceColor(meshes[baseType], baseType, bx, bz, idx);
                        }
                    }
                    const nonSolid = ['tall_grass', 'nether_portal', 'water', 'lava', 'end_rod', 'torch', 'door_top_open', 'door_bottom_open'];
                    if (!nonSolid.includes(baseType)) worldBlocks.add(posKey);
                }
            });

            for (const t in meshes) {
                meshes[t].count = counts[t];
                meshes[t].instanceMatrix.needsUpdate = true;
                if (meshes[t].instanceColor) meshes[t].instanceColor.needsUpdate = true;
                if (counts[t] > 0) meshes[t].computeBoundingSphere();
            }
            const chunk = { meshes, blocks, cx, cz, torchLights: [] };
            chunks.set(key, chunk);
            rebuildChunkTorchLights(chunk);

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
            const applyBiomeInstanceColor = (mesh, type, x, z, index) => {
                return;
            };
            
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
                    const biome = window.getBiome(x, z);
                    const sY = Math.floor(noise2D(x * 0.04, z * 0.04) * 6 * biome.hMult + biome.hBase);
                    
                    if (y <= sY) {
                        const bottomY = -64;
                        if (y === bottomY || y === bottomY + 1) return 'bedrock';
                        
                        // 预测 3D 矿洞与巨洞雕刻
                        if (y > bottomY + 2 && y < sY - 3) {
                            const n3 = noise3D(x * 0.04, y * 0.08, z * 0.04);
                            const n3_detail = noise3D(x * 0.12, y * 0.24, z * 0.12);
                            const wormValue = Math.abs(n3 * 0.85 + n3_detail * 0.15);
                            
                            const cavernValue = noise3D(x * 0.015, y * 0.03, z * 0.015);
                            
                            let wormThresh = 0.08;
                            let cavernThresh = 0.55;
                            if (window.isPlainBiome ? window.isPlainBiome(biome) : biome.name === '平原') {
                                wormThresh = 0.16;
                                cavernThresh = 0.43;
                            }
                            
                            const isInsideStronghold = (x >= 54 && x <= 74 && z >= 54 && z <= 74 && y >= -28 && y <= -22);
                            
                            if (!isInsideStronghold && (wormValue < wormThresh || cavernValue > cavernThresh)) {
                                return null;
                            }
                        }
                        
                        // 预测固体方块类型
                        if (y === sY) {
                            let type = biome.top;
                            if (sY < 0 && type === 'grass') type = 'sand';
                            if (biome.name === '高山' && y > 15) type = 'snow';
                            return type;
                        }
                        if (y > sY - 3) return biome.sub;
                        return 'stone';
                    }
                    if (y <= 0) return 'water';
                }
                return null;
            };
            const toBaseType = (t) => (t && window.getBaseType ? window.getBaseType(t) : t);
            const isTransparent = (t) => {
                const base = toBaseType(t);
                if (base === null || base === undefined) return true;
                const tr = ['glass', 'leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner'];
                return tr.includes(base);
            };
            const isOpaque = (t) => {
                const base = toBaseType(t);
                if (base === null || base === undefined) return false;
                const nonOpaque = ['glass', 'leaves', 'tall_grass', 'torch', 'end_rod', 'nether_portal', 'end_portal', 'end_portal_frame_empty', 'end_portal_frame_filled', 'return_portal', 'door_top', 'door_bottom', 'door_top_open', 'door_bottom_open', 'cactus', 'lily_pad', 'spawner', 'water', 'lava', 'bed', 'bed_head', 'bed_foot', 'chest', 'ice'];
                return !nonOpaque.includes(base);
            };
            const isWater = (t) => toBaseType(t) === 'water';
            const getWaterH = (nx, ny, nz, t) => {
                if (!isWater(t)) return 0;
                if (isWater(getBlockProcedural(nx, ny + 1, nz))) return 1.0;
                const nKey = `${nx},${ny},${nz}`;
                let ndist = window.waterDistances.has(nKey) ? window.waterDistances.get(nKey) : 0;
                return Math.max(0.15, 1.0 - (ndist * 0.1));
            };

            for (const [posKey, fullType] of chunk.blocks.entries()) { 
                const [bx, by, bz] = posKey.split(',').map(Number); 
                const baseType = toBaseType(fullType);
                if (baseType === 'water') {
                    const topT = getBlockProcedural(bx, by + 1, bz);
                    let h = 1.0;
                    if (!isWater(topT)) {
                        let dist = window.waterDistances.has(posKey) ? window.waterDistances.get(posKey) : 0;
                        h = Math.max(0.15, 1.0 - (dist * 0.1));
                    }
                    
                    dummy.rotation.set(0, 0, 0);
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
                        } else if (isWater(nT)) {
                            const nH = getWaterH(nx, ny, nz, nT);
                            if (h > nH + 0.01) {
                                chunk.meshes[faceName].setMatrixAt(counts[faceName]++, dummy.matrix);
                            }
                        }
                    }
                    dummy.scale.set(1, 1, 1); // reset
                    dummy.rotation.set(0, 0, 0);
                } else {
                    let isVisible = true;
                    if (isOpaque(baseType)) {
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
                        dummy.position.set(bx + 0.5, by + 0.5, bz + 0.5);
                        dummy.rotation.set(0, getBlockYawByFacing(fullType, baseType), 0);
                        dummy.updateMatrix();
                        if (chunk.meshes[baseType]) {
                            const idx = counts[baseType]++;
                            chunk.meshes[baseType].setMatrixAt(idx, dummy.matrix);
                            applyBiomeInstanceColor(chunk.meshes[baseType], baseType, bx, bz, idx);
                        }
                    }
                }
            }
            for (const t in chunk.meshes) {
                const baseType = t.startsWith('water_') ? 'water' : t;
                if (materials && materials[baseType]) {
                    chunk.meshes[t].material = materials[baseType];
                }
                
                chunk.meshes[t].count = counts[t];
                chunk.meshes[t].instanceMatrix.needsUpdate = true;
                if (chunk.meshes[t].instanceColor) chunk.meshes[t].instanceColor.needsUpdate = true;
                if (counts[t] > 0) chunk.meshes[t].computeBoundingSphere();
            }
            rebuildChunkTorchLights(chunk);
        }

        function unloadChunk(key) {
            const chunk = chunks.get(key);
            if (!chunk) return;
            clearChunkTorchLights(chunk);
            for (const type in chunk.meshes) {
                scene.remove(chunk.meshes[type]);
                chunk.meshes[type].dispose();
            }
            for (const posKey of chunk.blocks.keys()) worldBlocks.delete(posKey);
            chunks.delete(key);
        }

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

        function generateEmptyReturnPortal() {
            const cx = 0; const cz = 0; const cKey = `${cx},${cz}`; let chunk = chunks.get(cKey); if (!chunk) return;
            const surfaceY = Math.floor(8 + (biomeNoise(0, 0) || 0) * 3);
            const py = surfaceY + 1;
            for (let x = -2; x <= 2; x++) { 
                for (let z = -2; z <= 2; z++) { 
                    const k = `${x},${py},${z}`; 
                    if (Math.abs(x) === 2 || Math.abs(z) === 2) { 
                        chunk.blocks.set(k, 'bedrock'); worldBlocks.add(k); 
                    } else if (Math.abs(x) === 1 && Math.abs(z) === 1) {
                        chunk.blocks.set(k, 'bedrock'); worldBlocks.add(k);
                    }
                } 
            }
            const centerK = `0,${py},0`;
            chunk.blocks.set(centerK, 'bedrock'); worldBlocks.add(centerK);
            const pillarK = `0,${py + 1},0`;
            chunk.blocks.set(pillarK, 'bedrock'); worldBlocks.add(pillarK);
            
            for(let x = -1; x <= 1; x++) {
                for(let z = -1; z <= 1; z++) {
                    if (x===0 && z===0) continue;
                    chunk.blocks.set(`${x},${py},${z}`, 'air');
                }
            }
            rebuildChunkMesh(chunk);
        }

        window.activateReturnPortal = function() {
            const cx = 0; const cz = 0; const cKey = `${cx},${cz}`; let chunk = chunks.get(cKey); if (!chunk) return;
            const surfaceY = Math.floor(8 + (biomeNoise(0, 0) || 0) * 3);
            const py = surfaceY + 1;
            for (let x = -1; x <= 1; x++) { 
                for (let z = -1; z <= 1; z++) { 
                    const k = `${x},${py},${z}`; 
                    if (!(x===0 && z===0)) {
                        chunk.blocks.set(k, 'return_portal'); 
                    }
                } 
            }
            const eggK = `0,${py + 2},0`;
            chunk.blocks.set(eggK, 'obsidian'); worldBlocks.add(eggK);
            rebuildChunkMesh(chunk);
        }

        updateChunks();

        const raycaster = new THREE.Raycaster(); raycaster.far = 5; const center = new THREE.Vector2(0, 0);
        const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005); const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const highlightBox = new THREE.LineSegments(new THREE.EdgesGeometry(highlightGeo), highlightMat); highlightBox.visible = false; scene.add(highlightBox);
        const miningOverlay = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), destroyStages[0]); miningOverlay.visible = false; scene.add(miningOverlay);
        const intersectMatrix = new THREE.Matrix4();
        const intersectPos = new THREE.Vector3();
        window.getIntersectBlockCoords = function(intersect) {
            if (intersect && intersect.object && intersect.object.isInstancedMesh && intersect.instanceId !== undefined) {
                intersect.object.getMatrixAt(intersect.instanceId, intersectMatrix);
                intersectPos.setFromMatrixPosition(intersectMatrix);
                return {
                    x: Math.floor(intersectPos.x),
                    y: Math.floor(intersectPos.y),
                    z: Math.floor(intersectPos.z)
                };
            }
            const p = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.01));
            return { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
        };
        const controls = new PointerLockControls(camera, document.body);
        window.controls = controls;
        const inventoryUiEl = document.getElementById('inventory-ui'); const debugUiEl = document.getElementById('debug-ui'); const chatContainer = document.getElementById('chat-container'); const chatInput = document.getElementById('chat-input');
        const uiLayer = document.getElementById('ui-layer'); const titleScreen = document.getElementById('title-screen'); const worldSelectScreen = document.getElementById('world-select-screen'); const createWorldScreen = document.getElementById('create-world-screen'); const pauseScreen = document.getElementById('pause-screen');

        // ==========================================
