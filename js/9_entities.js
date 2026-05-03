        // ==========================================
        const STRONGHOLD_POS = { x: 64, y: -25, z: 64 };
        const particles = [];
        function spawnParticle(pos, colorHex) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: colorHex })); p.position.copy(pos); scene.add(p); particles.push({ mesh: p, life: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 15, Math.random() * 15, (Math.random() - 0.5) * 15) }); }

        const zHeadMatBase = new THREE.MeshLambertMaterial({ color: 0x3b8526 });
        const zBodyMatBase = new THREE.MeshLambertMaterial({ color: 0x00aaff });
        const zLegMatBase = new THREE.MeshLambertMaterial({ color: 0x4a2a75 });
        const zLegGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25); zLegGeo.translate(0, -0.375, 0);

        function spawnEnderEyeEntity(x, y, z) {
            const eyeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: 0x55ffaa, emissive: 0x228855 }));
            eyeMesh.position.set(x, y, z);
            scene.add(eyeMesh);

            entities.push({
                type: 'eye', mesh: eyeMesh, life: 3.0, timer: 0,
                startX: x, startY: y, startZ: z,
                update: function (delta, time) {
                    this.life -= delta;
                    this.timer += delta;

                    if (this.life <= 0) {
                        for (let i = 0; i < 15; i++) spawnParticle(this.mesh.position, 0x55ffaa);
                        if (Math.random() > 0.2) {
                            addBlockToInventory('ender_eye', 1);
                            renderInventoryUI();
                        }
                        return true;
                    }

                    const dx = STRONGHOLD_POS.x - this.startX;
                    const dz = STRONGHOLD_POS.z - this.startZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    let dirX = 0; let dirZ = 0;
                    if (dist > 0) { dirX = dx / dist; dirZ = dz / dist; }

                    const speed = 10.0;
                    const progress = this.timer * speed;
                    const moveDist = Math.min(progress, dist);

                    this.mesh.position.x = this.startX + dirX * moveDist;
                    this.mesh.position.z = this.startZ + dirZ * moveDist;

                    const normalizedTime = this.timer / 3.0;
                    this.mesh.position.y = this.startY + Math.sin(normalizedTime * Math.PI) * 4.0;

                    if (Math.random() < 0.5) spawnParticle(this.mesh.position, 0xcc00ff);

                    return false;
                }
            });
        }

        function spawnArrow(pos, dir) {
            const arrowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), new THREE.MeshLambertMaterial({ color: 0xffffff }));
            arrowMesh.position.copy(pos); arrowMesh.lookAt(pos.clone().add(dir));
            scene.add(arrowMesh);

            entities.push({
                type: 'arrow', mesh: arrowMesh, velocity: dir.clone().multiplyScalar(60), life: 5,
                update: function (delta) {
                    this.life -= delta;
                    if (this.life <= 0) return true;

                    for (let e of entities) {
                        if (e === this || e.type === 'arrow' || e.type === 'eye') continue;
                        let hitRadius = 1.2; let targetY = e.mesh.position.y;
                        if (e.type === 'dragon') { hitRadius = 12.0; targetY += 2; }
                        else if (e.type === 'crystal') { hitRadius = 2.0; targetY += 1; }
                        else if (e.type === 'enderman') { hitRadius = 1.5; targetY += 1.5; }
                        else if (e.type === 'zombie' || e.type === 'blaze') { hitRadius = 1.2; targetY += 1.2; }
                        else if (e.type === 'spider') { hitRadius = 1.5; targetY += 0.4; }
                        else if (e.type === 'pig') { hitRadius = 1.2; targetY += 0.5; }

                        const dist = new THREE.Vector3(e.mesh.position.x, targetY, e.mesh.position.z).distanceTo(this.mesh.position);
                        if (dist < hitRadius) {
                            let dmg = 8; e.hp -= dmg;
                            if (e.type === 'crystal') e.hp = 0;
                            if (e.mesh.children) e.mesh.children.forEach(c => { if (c.material && c.material.emissive) c.material.emissive.setHex(0xaa0000); });
                            if (e.type === 'enderman' && e.onHit) e.onHit();
                            if (e.type === 'pig' || e.type === 'zombie' || e.type === 'blaze' || e.type === 'spider') {
                                const kb = this.velocity.clone().normalize();
                                if (e.type === 'pig') { e.target.copy(e.mesh.position).addScaledVector(kb, 3); e.state = 'wander'; e.timer = 2; }
                                else { e.mesh.position.addScaledVector(kb, 1); }
                            }
                            return true;
                        }
                    }

                    const step = this.velocity.clone().multiplyScalar(delta);
                    this.mesh.position.add(step);
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 0.1, 0.1)) return true;
                    return false;
                }
            });
        }

        function spawnPig(x, z, y) {
            const pMat = new THREE.MeshLambertMaterial({ color: 0xffb6c1 }); const sMat = new THREE.MeshLambertMaterial({ color: 0xff8899 });
            const pigGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), pMat); body.position.y = 0.5; pigGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), pMat); head.position.set(0, 0.8, 0.7); pigGroup.add(head);
            const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), sMat); snout.position.set(0, 0.7, 1.05); pigGroup.add(snout);
            const legPos = [[-0.3, 0.2, 0.4], [0.3, 0.2, 0.4], [-0.3, 0.2, -0.4], [0.3, 0.2, -0.4]]; const legs = [];
            const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2); legGeo.translate(0, -0.2, 0);
            legPos.forEach(pos => { const leg = new THREE.Mesh(legGeo, pMat); leg.position.set(...pos); pigGroup.add(leg); legs.push(leg); });
            pigGroup.position.set(x, y + 2, z); scene.add(pigGroup);

            entities.push({
                type: 'pig', mesh: pigGroup, hp: 10, legs: legs, state: 'idle', timer: 0, velocity: new THREE.Vector3(), target: new THREE.Vector3(),
                update: function (delta, time) {
                    if (this.hp <= 0) { addBlockToInventory('raw_porkchop', 1); renderInventoryUI(); return true; }
                    this.timer -= delta;
                    if (this.timer <= 0) {
                        if (this.state === 'idle') { this.state = 'wander'; this.timer = 2 + Math.random() * 3; this.target.set(this.mesh.position.x + (Math.random() - 0.5) * 10, this.mesh.position.y, this.mesh.position.z + (Math.random() - 0.5) * 10); this.mesh.lookAt(this.target.x, this.mesh.position.y, this.target.z); }
                        else { this.state = 'idle'; this.timer = 1 + Math.random() * 4; }
                    }
                    if (this.state === 'wander') {
                        const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position); dir.y = 0;
                        if (dir.length() > 0.1) {
                            dir.normalize(); const stepX = dir.x * 1.5 * delta; const stepZ = dir.z * 1.5 * delta;
                            const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                            if (!checkCollisionGeneric(px + stepX, py - 0.2, pz, 0.3, 0.5)) this.mesh.position.x += stepX; else { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            if (!checkCollisionGeneric(px, py - 0.2, pz + stepZ, 0.3, 0.5)) this.mesh.position.z += stepZ; else { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            const ls = Math.sin(time * 15) * 0.5; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls; this.legs[2].rotation.x = -ls; this.legs[3].rotation.x = ls;
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }

                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.2, this.mesh.position.z, 0.3, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.2) + 1 + 0.2; this.velocity.y = 0; }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); c.material.emissive.g = Math.max(0, c.material.emissive.g - delta * 10); c.material.emissive.b = Math.max(0, c.material.emissive.b - delta * 10); } });
                    return false;
                }
            });
        }

        function spawnZombie(x, z, y) {
            const zhm = zHeadMatBase.clone(); const zbm = zBodyMatBase.clone(); const zlm = zLegMatBase.clone();
            const zGroup = new THREE.Group();
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), zhm); head.position.y = 1.6; zGroup.add(head);
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), zbm); body.position.y = 1.0; zGroup.add(body);
            const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), zhm); armL.position.set(0.35, 1.2, 0.2); armL.rotation.x = Math.PI / 2; zGroup.add(armL);
            const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), zhm); armR.position.set(-0.35, 1.2, 0.2); armR.rotation.x = Math.PI / 2; zGroup.add(armR);
            const legs = [];
            const legL = new THREE.Mesh(zLegGeo, zlm); legL.position.set(0.15, 0.6, 0); zGroup.add(legL); legs.push(legL);
            const legR = new THREE.Mesh(zLegGeo, zlm); legR.position.set(-0.15, 0.6, 0); zGroup.add(legR); legs.push(legR);

            zGroup.position.set(x, y + 2, z); scene.add(zGroup);
            entities.push({
                type: 'zombie', mesh: zGroup, legs: legs, hp: 20, velocity: new THREE.Vector3(), burnTimer: 0,
                update: function (delta, time, sunHeight, isNight) {
                    if (this.hp <= 0) { addBlockToInventory('rotten_flesh', 1); renderInventoryUI(); return true; }
                    const sSurfaceY = Math.floor(noise2D(this.mesh.position.x * 0.04, this.mesh.position.z * 0.04) * 5);
                    if (!isNight && this.mesh.position.y >= sSurfaceY && currentDimension === 'overworld') {
                        this.burnTimer += delta;
                        if (this.burnTimer > 1) { this.hp -= 2; this.burnTimer = 0; this.mesh.children.forEach(c => c.material.emissive.setHex(0xffaa00)); }
                    }
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (dist < 20 && !isDead) {
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position); dir.y = 0; dir.normalize();
                        this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);
                        if (dist < 1.5 && playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(3); velocity.x = dir.x * -15; velocity.z = dir.z * -15; }
                        if (dist > 1.0) {
                            const stepX = dir.x * 3.5 * delta; const stepZ = dir.z * 3.5 * delta;
                            const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                            if (!checkCollisionGeneric(px + stepX, py - 0.15, pz, 0.35, 1.8)) this.mesh.position.x += stepX; else if (this.velocity.y === 0) this.velocity.y = 6.5;
                            if (!checkCollisionGeneric(px, py - 0.15, pz + stepZ, 0.35, 1.8)) this.mesh.position.z += stepZ; else if (this.velocity.y === 0) this.velocity.y = 6.5;
                            const ls = Math.sin(time * 10) * 0.6; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls;
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }

                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.15, this.mesh.position.z, 0.35, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.15) + 1 + 0.15; this.velocity.y = 0; }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); c.material.emissive.g = Math.max(0, c.material.emissive.g - delta * 10); c.material.emissive.b = Math.max(0, c.material.emissive.b - delta * 10); } });
                    return false;
                }
            });
        }

        function spawnSpider(x, z, y) {
            const bMat = new THREE.MeshLambertMaterial({ color: 0x221111 }); const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const spGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), bMat); body.position.y = 0.2; spGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), bMat); head.position.set(0, 0.2, 0.6); spGroup.add(head);
            const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat); eye1.position.set(0.12, 0.25, 0.85); spGroup.add(eye1);
            const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat); eye2.position.set(-0.12, 0.25, 0.85); spGroup.add(eye2);

            const legs = [];
            for (let i = 0; i < 8; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), bMat); spGroup.add(leg); legs.push(leg); }

            spGroup.position.set(x, y + 1, z); scene.add(spGroup);
            entities.push({
                type: 'spider', mesh: spGroup, legs: legs, hp: 16, velocity: new THREE.Vector3(), target: new THREE.Vector3(), state: 'idle', timer: 0,
                update: function (delta, time) {
                    if (this.hp <= 0) { addBlockToInventory('string', Math.floor(Math.random() * 2) + 5); renderInventoryUI(); return true; }
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (dist < 16 && !isDead) {
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position); dir.y = 0; dir.normalize();
                        this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);
                        if (dist < 1.5 && playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(2); velocity.x = dir.x * -10; velocity.z = dir.z * -10; }
                        if (dist > 1.2) {
                            const stepX = dir.x * 2.5 * delta; const stepZ = dir.z * 2.5 * delta;
                            const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                            if (!checkCollisionGeneric(px + stepX, py, pz, 0.45, 0.6)) this.mesh.position.x += stepX; else if (this.velocity.y === 0) this.velocity.y = 6;
                            if (!checkCollisionGeneric(px, py, pz + stepZ, 0.45, 0.6)) this.mesh.position.z += stepZ; else if (this.velocity.y === 0) this.velocity.y = 6;
                            for (let i = 0; i < 8; i++) { const side = i % 2 === 0 ? 1 : -1; const offset = Math.floor(i / 2); this.legs[i].position.set(side * (0.45 + Math.abs(Math.sin(time * 15 + offset)) * 0.2), 0.3, (offset - 1.5) * 0.3); this.legs[i].rotation.z = side * Math.PI / 4; }
                        }
                    } else {
                        this.timer -= delta;
                        if (this.timer <= 0) {
                            if (this.state === 'idle') { this.state = 'wander'; this.timer = 2 + Math.random() * 3; this.target.set(this.mesh.position.x + (Math.random() - 0.5) * 10, this.mesh.position.y, this.mesh.position.z + (Math.random() - 0.5) * 10); this.mesh.lookAt(this.target.x, this.mesh.position.y, this.target.z); }
                            else { this.state = 'idle'; this.timer = 1 + Math.random() * 4; }
                        }
                        if (this.state === 'wander') {
                            const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position); dir.y = 0;
                            if (dir.length() > 0.1) {
                                dir.normalize(); const stepX = dir.x * 1.0 * delta; const stepZ = dir.z * 1.0 * delta;
                                const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                                if (!checkCollisionGeneric(px + stepX, py, pz, 0.45, 0.6)) this.mesh.position.x += stepX; else this.timer = 0;
                                if (!checkCollisionGeneric(px, py, pz + stepZ, 0.45, 0.6)) this.mesh.position.z += stepZ; else this.timer = 0;
                                for (let i = 0; i < 8; i++) { const side = i % 2 === 0 ? 1 : -1; const offset = Math.floor(i / 2); this.legs[i].position.set(side * (0.45 + Math.abs(Math.sin(time * 10 + offset)) * 0.2), 0.3, (offset - 1.5) * 0.3); this.legs[i].rotation.z = side * Math.PI / 4; }
                            }
                        } else { for (let i = 0; i < 8; i++) { const side = i % 2 === 0 ? 1 : -1; const offset = Math.floor(i / 2); this.legs[i].position.set(side * 0.45, 0.3, (offset - 1.5) * 0.3); this.legs[i].rotation.z = side * Math.PI / 4; } }
                    }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 0.45, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y) + 1; this.velocity.y = 0; }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); c.material.emissive.g = Math.max(0, c.material.emissive.g - delta * 10); c.material.emissive.b = Math.max(0, c.material.emissive.b - delta * 10); } });
                    return false;
                }
            });
        }

        function spawnBlaze(x, z, y) {
            const bMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 }); const bGroup = new THREE.Group();
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), bMat); head.position.y = 1.8; bGroup.add(head);
            const rods = [];
            for (let i = 0; i < 8; i++) { const rod = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), bMat); bGroup.add(rod); rods.push(rod); }
            bGroup.position.set(x, y + 2, z); scene.add(bGroup);
            entities.push({
                type: 'blaze', mesh: bGroup, rods: rods, hp: 20, velocity: new THREE.Vector3(), targetY: y + 2,
                update: function (delta, time) {
                    if (this.hp <= 0) { addBlockToInventory('blaze_rod', Math.floor(Math.random() * 2) + 2); renderInventoryUI(); return true; }
                    for (let i = 0; i < 8; i++) { const rRadius = i < 4 ? 0.6 : 0.8; const rSpeed = i < 4 ? 2 : -1.5; const rHeight = i < 4 ? 1.4 : 1.0; const angle = time * rSpeed + (i * Math.PI / 2); this.rods[i].position.set(Math.cos(angle) * rRadius, rHeight + Math.sin(time * 5 + i) * 0.2, Math.sin(angle) * rRadius); }
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (dist < 20 && !isDead) {
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position); dir.y = 0; dir.normalize();
                        this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);
                        if (dist < 2.0 && playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(2); velocity.x = dir.x * -15; velocity.z = dir.z * -15; }
                        if (dist > 1.5) {
                            const stepX = dir.x * 3.0 * delta; const stepZ = dir.z * 3.0 * delta;
                            const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                            if (!checkCollisionGeneric(px + stepX, py, pz, 0.4, 1.8)) this.mesh.position.x += stepX;
                            if (!checkCollisionGeneric(px, py, pz + stepZ, 0.4, 1.8)) this.mesh.position.z += stepZ;
                        }
                        this.targetY = camera.position.y;
                    } else { this.targetY = y + 2 + Math.sin(time) * 1.5; }
                    const dY = this.targetY - this.mesh.position.y;
                    this.velocity.y += dY * delta * 5; this.velocity.y *= 0.9; this.mesh.position.y += this.velocity.y * delta;
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); c.material.emissive.g = Math.max(0, c.material.emissive.g - delta * 10); c.material.emissive.b = Math.max(0, c.material.emissive.b - delta * 10); } });
                    return false;
                }
            });
        }

        function spawnEnderman(x, z, y) {
            const eMat = new THREE.MeshLambertMaterial({ color: 0x111111 }); const eyeMat = new THREE.MeshBasicMaterial({ color: 0xcc00ff });
            const eGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.3), eMat); body.position.y = 1.6; eGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), eMat); head.position.y = 2.45; eGroup.add(head);
            const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.52), eyeMat); eyes.position.y = 2.45; eGroup.add(eyes);
            const armGeo = new THREE.BoxGeometry(0.15, 1.5, 0.15); armGeo.translate(0, -0.75, 0);
            const armL = new THREE.Mesh(armGeo, eMat); armL.position.set(0.35, 2.1, 0); eGroup.add(armL);
            const armR = new THREE.Mesh(armGeo, eMat); armR.position.set(-0.35, 2.1, 0); eGroup.add(armR);
            const legGeo = new THREE.BoxGeometry(0.15, 1.5, 0.15); legGeo.translate(0, -0.75, 0);
            const legs = [];
            const legL = new THREE.Mesh(legGeo, eMat); legL.position.set(0.15, 1.0, 0); eGroup.add(legL); legs.push(legL);
            const legR = new THREE.Mesh(legGeo, eMat); legR.position.set(-0.15, 1.0, 0); eGroup.add(legR); legs.push(legR);

            eGroup.position.set(x, y + 2, z); scene.add(eGroup);
            entities.push({
                type: 'enderman', mesh: eGroup, legs: legs, arms: [armL, armR], hp: 40, velocity: new THREE.Vector3(), state: 'idle', target: new THREE.Vector3(), timer: 0,
                update: function (delta, time) {
                    if (this.hp <= 0) { addBlockToInventory('ender_pearl', 1); renderInventoryUI(); return true; }
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (this.state === 'aggro') {
                        if (dist < 30 && !isDead) {
                            const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position); dir.y = 0; dir.normalize();
                            this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);
                            this.arms.forEach(a => a.rotation.x = Math.PI / 2 + Math.sin(time * 20) * 0.2);
                            if (dist < 2.0 && playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(5); velocity.x = dir.x * -20; velocity.z = dir.z * -20; }
                            if (dist > 1.5) {
                                const stepX = dir.x * 6.0 * delta; const stepZ = dir.z * 6.0 * delta;
                                const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                                if (!checkCollisionGeneric(px + stepX, py - 0.5, pz, 0.4, 2.8)) this.mesh.position.x += stepX; else if (this.velocity.y === 0) this.velocity.y = 7.5;
                                if (!checkCollisionGeneric(px, py - 0.5, pz + stepZ, 0.4, 2.8)) this.mesh.position.z += stepZ; else if (this.velocity.y === 0) this.velocity.y = 7.5;
                                const ls = Math.sin(time * 15) * 0.8; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls;
                            }
                        } else { this.state = 'idle'; }
                    } else {
                        this.timer -= delta; this.arms.forEach(a => a.rotation.x = 0);
                        if (this.timer <= 0) {
                            if (Math.random() < 0.3) { this.target.set(this.mesh.position.x + (Math.random() - 0.5) * 20, this.mesh.position.y, this.mesh.position.z + (Math.random() - 0.5) * 20); this.mesh.lookAt(this.target.x, this.mesh.position.y, this.target.z); this.timer = 3; }
                            else { this.timer = 2; this.target.copy(this.mesh.position); }
                        }
                        const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position); dir.y = 0;
                        if (dir.length() > 0.5) {
                            dir.normalize(); const stepX = dir.x * 2.0 * delta; const stepZ = dir.z * 2.0 * delta;
                            const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                            if (!checkCollisionGeneric(px + stepX, py - 0.5, pz, 0.4, 2.8)) this.mesh.position.x += stepX;
                            if (!checkCollisionGeneric(px, py - 0.5, pz + stepZ, 0.4, 2.8)) this.mesh.position.z += stepZ;
                            const ls = Math.sin(time * 8) * 0.4; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls;
                        } else { this.legs.forEach(leg => leg.rotation.x = 0); }
                    }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.5, this.mesh.position.z, 0.4, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.5) + 1 + 0.5; this.velocity.y = 0; }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); } });
                    return false;
                },
                onHit: function () { this.state = 'aggro'; }
            });
        }

        function spawnEnderCrystal(x, y, z) {
            const cGroup = new THREE.Group();
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), new THREE.MeshBasicMaterial({ color: 0xff55ff, wireframe: true }));
            crystal.position.y = 1; cGroup.add(crystal);
            const core = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0x550055 }));
            core.position.y = 1; cGroup.add(core); cGroup.position.set(x, y, z); scene.add(cGroup);
            const mat = new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0 });
            const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 10, 0)]);
            const beam = new THREE.Line(geo, mat); cGroup.add(beam);
            entities.push({
                type: 'crystal', mesh: cGroup, beam: beam, hp: 1, update: function (delta, time) {
                    if (this.hp <= 0) { for (let i = 0; i < 30; i++) spawnParticle(this.mesh.position, 0xff55ff); return true; }
                    crystal.rotation.y += delta; crystal.rotation.x += delta * 0.5; crystal.position.y = 1 + Math.sin(time * 3) * 0.3;
                    core.rotation.y -= delta; core.position.y = 1 + Math.sin(time * 3) * 0.3;
                    const dragon = entities.find(e => e.type === 'dragon');
                    if (dragon && this.mesh.position.distanceTo(dragon.mesh.position) < 30) {
                        this.beam.material.opacity = 0.8; const localTarget = this.mesh.worldToLocal(dragon.mesh.position.clone());
                        this.beam.geometry.setFromPoints([new THREE.Vector3(0, 1, 0), localTarget]); dragon.hp = Math.min(200, dragon.hp + delta * 5);
                    } else { this.beam.material.opacity = 0; }
                    return false;
                }
            });
        }

        function spawnEnderDragon() {
            const dMat = new THREE.MeshLambertMaterial({ color: 0x1a0a2a }); const dGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 8), dMat); dGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 2), dMat); head.position.set(0, 0.5, 5); dGroup.add(head);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
            const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), eyeMat); eyeL.position.set(0.8, 0.8, 5.5); dGroup.add(eyeL);
            const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), eyeMat); eyeR.position.set(-0.8, 0.8, 5.5); dGroup.add(eyeR);
            for (let i = 0; i < 4; i++) { const spike = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.5), new THREE.MeshLambertMaterial({ color: 0x333333 })); spike.position.set(0, 1.5, 2 - i * 2); dGroup.add(spike); }
            const wingGeo = new THREE.BoxGeometry(12, 0.1, 4); wingGeo.translate(6, 0, 0);
            const wingL = new THREE.Mesh(wingGeo, dMat); wingL.position.set(1, 1, 0); dGroup.add(wingL);
            const wingR = new THREE.Mesh(wingGeo, dMat); wingR.position.set(-1, 1, 0); wingR.rotation.z = Math.PI; dGroup.add(wingR);
            const tail = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 6), dMat); tail.position.set(0, 0, -7); dGroup.add(tail);
            dGroup.scale.set(2, 2, 2); dGroup.position.set(0, 50, 0); scene.add(dGroup);
            document.getElementById('boss-bar-container').style.display = 'flex';
            entities.push({
                type: 'dragon', mesh: dGroup, wings: [wingL, wingR], hp: 200, maxHp: 200, phase: 'circle', timer: 0, angle: 0,
                update: function (delta, time) {
                    if (isGameClear) return false;
                    document.getElementById('boss-bar-fill').style.width = `${(this.hp / this.maxHp) * 100}%`;
                    if (this.hp <= 0) { document.getElementById('boss-bar-container').style.display = 'none'; for (let i = 0; i < 30; i++) spawnParticle(this.mesh.position, 0xff00ff); generateReturnPortal(); return true; }
                    const flap = Math.sin(time * 8) * 0.5; this.wings[0].rotation.z = flap; this.wings[1].rotation.z = Math.PI - flap;
                    this.timer += delta;
                    if (this.phase === 'circle') { this.angle += delta * 0.5; const targetPos = new THREE.Vector3(Math.cos(this.angle) * 30, 50 + Math.sin(time * 2) * 5, Math.sin(this.angle) * 30); this.mesh.position.lerp(targetPos, delta * 2); this.mesh.lookAt(targetPos); if (this.timer > 10 && Math.random() < 0.05) { this.phase = 'swoop'; this.timer = 0; } }
                    else if (this.phase === 'swoop') { const targetPos = camera.position.clone(); targetPos.y += 2; this.mesh.position.lerp(targetPos, delta * 3); this.mesh.lookAt(targetPos); if (this.mesh.position.distanceTo(camera.position) < 8) { if (playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(6); velocity.y = 15; } this.phase = 'circle'; this.timer = 0; } if (this.timer > 5) { this.phase = 'circle'; this.timer = 0; } }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); } });
                    return false;
                }
            });
        }

        let zombieSpawnTimer = 0; let endermanSpawnTimer = 0; let blazeSpawnTimer = 0; let pigSpawnTimer = 0;
        
        // ==========================================