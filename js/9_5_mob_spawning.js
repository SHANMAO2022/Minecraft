        // ==========================================
        let cowSpawnTimer = 0; let spawnerTimer = 0;
        function handleMobSpawning(delta, isNight) {
            if (currentDimension === 'overworld') { 
                pigSpawnTimer += delta; 
                if (pigSpawnTimer > 5 && !isNight && entities.filter(e => e.type === 'pig').length < 10) { 
                    pigSpawnTimer = 0; const angle = Math.random() * Math.PI * 2; const r = 10 + Math.random() * 15; const sx = camera.position.x + Math.cos(angle) * r; const sz = camera.position.z + Math.sin(angle) * r; const sSurfaceY = Math.floor(noise2D(sx * 0.04, sz * 0.04) * 5); if (worldBlocks.has(`${Math.floor(sx)},${sSurfaceY},${Math.floor(sz)}`)) spawnPig(sx, sz, sSurfaceY + 1); 
                }
                cowSpawnTimer += delta;
                if (cowSpawnTimer > 8 && !isNight && entities.filter(e => e.type === 'cow').length < 8) {
                    cowSpawnTimer = 0; const angle = Math.random() * Math.PI * 2; const r = 15 + Math.random() * 15; const sx = camera.position.x + Math.cos(angle) * r; const sz = camera.position.z + Math.sin(angle) * r; const sSurfaceY = Math.floor(noise2D(sx * 0.04, sz * 0.04) * 5); if (worldBlocks.has(`${Math.floor(sx)},${sSurfaceY},${Math.floor(sz)}`)) spawnCow(sx, sz, sSurfaceY + 1);
                }
                zombieSpawnTimer += delta; if (zombieSpawnTimer > 3 && entities.filter(e => e.type === 'zombie' || e.type === 'spider').length < 15) { zombieSpawnTimer = 0; const angle = Math.random() * Math.PI * 2; const r = 10 + Math.random() * 10; const sx = camera.position.x + Math.cos(angle) * r; const sz = camera.position.z + Math.sin(angle) * r; const sSurfaceY = Math.floor(noise2D(sx * 0.04, sz * 0.04) * 5); if (isNight) { if (worldBlocks.has(`${Math.floor(sx)},${sSurfaceY},${Math.floor(sz)}`)) { if (Math.random() < 0.4) spawnSpider(sx, sz, sSurfaceY + 1); else spawnZombie(sx, sz, sSurfaceY + 1); } } else if (camera.position.y < 0) { const cy = camera.position.y + (Math.random() - 0.5) * 10; if (!worldBlocks.has(`${Math.floor(sx)},${Math.floor(cy)},${Math.floor(sz)}`) && worldBlocks.has(`${Math.floor(sx)},${Math.floor(cy) - 1},${Math.floor(sz)}`)) { if (Math.random() < 0.3) spawnSpider(sx, sz, cy); else spawnZombie(sx, sz, cy); } } } endermanSpawnTimer += delta; if (endermanSpawnTimer > 5 && isNight && entities.filter(e => e.type === 'enderman').length < 3) { endermanSpawnTimer = 0; const angle = Math.random() * Math.PI * 2; const r = 15 + Math.random() * 10; const sx = camera.position.x + Math.cos(angle) * r; const sz = camera.position.z + Math.sin(angle) * r; const sSurfaceY = Math.floor(noise2D(sx * 0.04, sz * 0.04) * 5); if (worldBlocks.has(`${Math.floor(sx)},${sSurfaceY},${Math.floor(sz)}`)) spawnEnderman(sx, sz, sSurfaceY + 1); } 
            }
            else if (currentDimension === 'nether') { 
                blazeSpawnTimer += delta; 
                if (blazeSpawnTimer > 6.0 && entities.filter(e => e.type === 'blaze').length < 15) { 
                    const angle = Math.random() * Math.PI * 2; const r = 10 + Math.random() * 15; const sx = camera.position.x + Math.cos(angle) * r; const sz = camera.position.z + Math.sin(angle) * r; 
                    for (let cy = Math.floor(camera.position.y) + 5; cy > Math.floor(camera.position.y) - 10; cy--) { 
                        if (!getBlock(Math.floor(sx), cy, Math.floor(sz)) && getBlock(Math.floor(sx), cy - 1, Math.floor(sz))) { spawnBlaze(sx, sz, cy); break; } 
                    } 
                }
                // 刷怪笼逻辑：每秒检测附近的刷怪笼
                spawnerTimer += delta;
                if (spawnerTimer > 1.0) {
                    spawnerTimer = 0;
                    const px = Math.floor(camera.position.x), py = Math.floor(camera.position.y), pz = Math.floor(camera.position.z);
                    const range = 16;
                    for (let x = -range; x <= range; x += 4) {
                        for (let y = -range; y <= range; y += 4) {
                            for (let z = -range; z <= range; z += 4) {
                                if (getBlock(px + x, py + y, pz + z) === 'spawner') {
                                    if (Math.random() < 0.3) spawnBlaze(px + x + 0.5, pz + z + 0.5, py + y + 1);
                                }
                            }
                        }
                    }
                }
            }
            else if (currentDimension === 'end') { endermanSpawnTimer += delta; if (endermanSpawnTimer > 2 && entities.filter(e => e.type === 'enderman').length < 25) { endermanSpawnTimer = 0; const angle = Math.random() * Math.PI * 2; const r = 10 + Math.random() * 30; const sx = camera.position.x + Math.cos(angle) * r; const sz = camera.position.z + Math.sin(angle) * r; spawnEnderman(sx, sz, 22); } }
        }

        // ==========================================