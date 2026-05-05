        // ==========================================
        const STRONGHOLD_POS = { x: 64, y: -25, z: 64 };
        const particles = [];
        function spawnParticle(pos, colorHex) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: colorHex })); p.position.copy(pos); scene.add(p); particles.push({ mesh: p, life: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 15, Math.random() * 15, (Math.random() - 0.5) * 15) }); }

        const mobTexLoader = new THREE.TextureLoader();
        const mobTexs = {};
        ['zombie', 'pig', 'spider', 'enderman', 'blaze', 'dragon', 'end_crystal', 'cow'].forEach(m => {
            mobTexs[m] = mobTexLoader.load('textures/' + m + '.png?v=' + CACHE_V);
            mobTexs[m].magFilter = THREE.NearestFilter;
            mobTexs[m].colorSpace = THREE.SRGBColorSpace;
        });

        function getMobPartMats(mob, ox, oy, w, h, d, tw = 64, th = 32) {
            const tex = mobTexs[mob];
            const img = tex ? tex.image : null;
            function getFace(x, y, fw, fh) {
                if (!img || !img.complete || img.width === 0) return new THREE.MeshLambertMaterial({ color: 0xffffff });
                const c = document.createElement('canvas'); c.width = fw; c.height = fh;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, x, y, fw, fh, 0, 0, fw, fh);
                const t = new THREE.CanvasTexture(c);
                t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
                return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.1 });
            }
            return [
                getFace(ox, oy + d, d, h),             // +x (Right)
                getFace(ox + d + w, oy + d, d, h),     // -x (Left)
                getFace(ox + d, oy, w, d),             // +y (Top)
                getFace(ox + d + w, oy, w, d),         // -y (Bottom)
                getFace(ox + d, oy + d, w, h),         // +z (Front)
                getFace(ox + d + w + d, oy + d, w, h) // -z (Back)
            ];
        }

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

        function spawnCow(x, z, y) {
            const cGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.4), getMobPartMats('cow', 18, 4, 12, 18, 10)); body.position.y = 0.6; cGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), getMobPartMats('cow', 0, 0, 8, 8, 6)); head.position.set(0, 1.0, 0.8); cGroup.add(head);
            const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), getMobPartMats('cow', 22, 0, 1, 2, 1)); hornL.position.set(0.2, 1.35, 0.75); cGroup.add(hornL);
            const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), getMobPartMats('cow', 22, 0, 1, 2, 1)); hornR.position.set(-0.2, 1.35, 0.75); cGroup.add(hornR);
            const legPos = [[-0.35, 0.3, 0.5], [0.35, 0.3, 0.5], [-0.35, 0.3, -0.5], [0.35, 0.3, -0.5]]; const legs = [];
            const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25); legGeo.translate(0, -0.3, 0);
            legPos.forEach(pos => { const leg = new THREE.Mesh(legGeo, getMobPartMats('cow', 0, 16, 4, 12, 4)); leg.position.set(...pos); cGroup.add(leg); legs.push(leg); });
            cGroup.position.set(x, y + 2, z); scene.add(cGroup);
            entities.push({
                type: 'cow', mesh: cGroup, hp: 10, legs: legs, state: 'idle', timer: 0, velocity: new THREE.Vector3(), target: new THREE.Vector3(),
                update: function (delta, time) {
                    if (this.hp <= 0) { 
                        addBlockToInventory('raw_beef', Math.floor(Math.random() * 2) + 1); addBlockToInventory('leather', Math.floor(Math.random() * 2)); renderInventoryUI(); 
                        for(let i=0; i<3 * 4; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 2);
                        return true; 
                    }
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
                            if (!checkCollisionGeneric(px + stepX, py - 0.2, pz, 0.45, 1.2)) this.mesh.position.x += stepX; else { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            if (!checkCollisionGeneric(px, py - 0.2, pz + stepZ, 0.45, 1.2)) this.mesh.position.z += stepZ; else { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            const ls = Math.sin(time * 10) * 0.5; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls; this.legs[2].rotation.x = -ls; this.legs[3].rotation.x = ls;
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.2, this.mesh.position.z, 0.45, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.2) + 1 + 0.2; this.velocity.y = 0; }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); c.material.emissive.g = Math.max(0, c.material.emissive.g - delta * 10); c.material.emissive.b = Math.max(0, c.material.emissive.b - delta * 10); } });
                    return false;
                }
            });
        }

        function spawnPig(x, z, y) {
            const pGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), getMobPartMats('pig', 28, 8, 10, 16, 8)); body.position.y = 0.5; pGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), getMobPartMats('pig', 0, 0, 8, 8, 8)); head.position.set(0, 0.8, 0.7); pGroup.add(head);
            const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), getMobPartMats('pig', 10, 12, 4, 3, 1)); snout.position.set(0, 0.7, 1.0); pGroup.add(snout);
            const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const nostrilL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), nostrilMat); nostrilL.position.set(0.06, 0.7, 1.06); pGroup.add(nostrilL);
            const nostrilR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), nostrilMat); nostrilR.position.set(-0.06, 0.7, 1.06); pGroup.add(nostrilR);
            const legPos = [[-0.3, 0.2, 0.4], [0.3, 0.2, 0.4], [-0.3, 0.2, -0.4], [0.3, 0.2, -0.4]]; const legs = [];
            const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2); legGeo.translate(0, -0.2, 0);
            legPos.forEach(pos => { const leg = new THREE.Mesh(legGeo, getMobPartMats('pig', 0, 16, 4, 6, 4)); leg.position.set(...pos); pGroup.add(leg); legs.push(leg); });
            pGroup.position.set(x, y + 2, z); scene.add(pGroup);

            entities.push({
                type: 'pig', mesh: pGroup, hp: 10, legs: legs, state: 'idle', timer: 0, velocity: new THREE.Vector3(), target: new THREE.Vector3(),
                update: function (delta, time) {
                    if (this.hp <= 0) { 
                        addBlockToInventory('raw_porkchop', 1); renderInventoryUI(); 
                        for(let i=0; i<2 * 4; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 1);
                        return true; 
                    }
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
                            if (!checkCollisionGeneric(px + stepX, py - 0.2, pz, 0.4, 0.8)) this.mesh.position.x += stepX; else { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            if (!checkCollisionGeneric(px, py - 0.2, pz + stepZ, 0.4, 0.8)) this.mesh.position.z += stepZ; else { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            const ls = Math.sin(time * 15) * 0.5; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls; this.legs[2].rotation.x = -ls; this.legs[3].rotation.x = ls;
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.2, this.mesh.position.z, 0.4, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.2) + 1 + 0.2; this.velocity.y = 0; }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); c.material.emissive.g = Math.max(0, c.material.emissive.g - delta * 10); c.material.emissive.b = Math.max(0, c.material.emissive.b - delta * 10); } });
                    return false;
                }
            });
        }

        function spawnZombie(x, z, y) {
            const zGroup = new THREE.Group();
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), getMobPartMats('zombie', 0, 0, 8, 8, 8)); head.position.y = 1.6; zGroup.add(head);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.05), eyeMat); eyeL.position.set(0.12, 1.65, 0.26); zGroup.add(eyeL);
            const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.05), eyeMat); eyeR.position.set(-0.12, 1.65, 0.26); zGroup.add(eyeR);
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), getMobPartMats('zombie', 16, 16, 8, 12, 4)); body.position.y = 1.0; zGroup.add(body);
            const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), getMobPartMats('zombie', 40, 16, 4, 12, 4)); armL.position.set(0.35, 1.2, 0.2); armL.rotation.x = Math.PI / 2; zGroup.add(armL);
            const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), getMobPartMats('zombie', 40, 16, 4, 12, 4)); armR.position.set(-0.35, 1.2, 0.2); armR.rotation.x = Math.PI / 2; zGroup.add(armR);
            const legs = [];
            const legL = new THREE.Mesh(zLegGeo, getMobPartMats('zombie', 0, 16, 4, 12, 4)); legL.position.set(0.15, 0.6, 0); zGroup.add(legL); legs.push(legL);
            const legR = new THREE.Mesh(zLegGeo, getMobPartMats('zombie', 0, 16, 4, 12, 4)); legR.position.set(-0.15, 0.6, 0); zGroup.add(legR); legs.push(legR);

            zGroup.position.set(x, y + 2, z); scene.add(zGroup);
            entities.push({
                type: 'zombie', mesh: zGroup, legs: legs, hp: 20, velocity: new THREE.Vector3(), burnTimer: 0,
                update: function (delta, time, sunHeight, isNight) {
                    if (this.hp <= 0) { 
                        addBlockToInventory('rotten_flesh', 1); renderInventoryUI(); 
                        for(let i=0; i<5 * 4; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 3);
                        return true; 
                    }
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
            const spGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), getMobPartMats('spider', 0, 0, 10, 8, 12)); body.position.y = 0.2; spGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), getMobPartMats('spider', 32, 4, 8, 8, 8)); head.position.set(0, 0.2, 0.6); spGroup.add(head);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat); eyeL.position.set(0.12, 0.25, 0.82); spGroup.add(eyeL);
            const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), eyeMat); eyeR.position.set(-0.12, 0.25, 0.82); spGroup.add(eyeR);
            const legs = [];
            for (let i = 0; i < 8; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), getMobPartMats('spider', 0, 0, 2, 2, 8)); spGroup.add(leg); legs.push(leg); }

            spGroup.position.set(x, y + 1, z); scene.add(spGroup);
            entities.push({
                type: 'spider', mesh: spGroup, legs: legs, hp: 16, velocity: new THREE.Vector3(), target: new THREE.Vector3(), state: 'idle', timer: 0,
                update: function (delta, time) {
                    if (this.hp <= 0) { 
                        addBlockToInventory('string', Math.floor(Math.random() * 2) + 5); renderInventoryUI(); 
                        for(let i=0; i<5 * 4; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 2);
                        return true; 
                    }
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
            const bGroup = new THREE.Group();
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), getMobPartMats('blaze', 0, 0, 8, 8, 8)); head.position.y = 1.8; bGroup.add(head);
            const rods = [];
            for (let i = 0; i < 8; i++) { const rod = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), getMobPartMats('blaze', 0, 16, 2, 8, 2)); bGroup.add(rod); rods.push(rod); }
            bGroup.position.set(x, y + 2, z); scene.add(bGroup);
            entities.push({
                type: 'blaze', mesh: bGroup, rods: rods, hp: 20, velocity: new THREE.Vector3(), targetY: y + 2,
                update: function (delta, time) {
                    if (this.hp <= 0) { 
                        addBlockToInventory('blaze_rod', Math.floor(Math.random() * 2) + 2); renderInventoryUI(); 
                        for(let i=0; i<10 * 4; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 5);
                        return true; 
                    }
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
            const eGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.3), getMobPartMats('enderman', 32, 16, 8, 12, 4)); body.position.y = 1.6; eGroup.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), getMobPartMats('enderman', 0, 0, 8, 8, 8)); head.position.y = 2.45; eGroup.add(head);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
            const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.05), eyeMat); eyeL.position.set(0.12, 2.5, 0.26); eGroup.add(eyeL);
            const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.05), eyeMat); eyeR.position.set(-0.12, 2.5, 0.26); eGroup.add(eyeR);
            const armGeo = new THREE.BoxGeometry(0.15, 1.5, 0.15); armGeo.translate(0, -0.75, 0);
            const armL = new THREE.Mesh(armGeo, getMobPartMats('enderman', 56, 0, 2, 30, 2)); armL.position.set(0.35, 2.1, 0); eGroup.add(armL);
            const armR = new THREE.Mesh(armGeo, getMobPartMats('enderman', 56, 0, 2, 30, 2)); armR.position.set(-0.35, 2.1, 0); eGroup.add(armR);
            const legGeo = new THREE.BoxGeometry(0.15, 1.5, 0.15); legGeo.translate(0, -0.75, 0);
            const legs = [];
            const legL = new THREE.Mesh(legGeo, getMobPartMats('enderman', 56, 0, 2, 30, 2)); legL.position.set(0.15, 1.0, 0); eGroup.add(legL); legs.push(legL);
            const legR = new THREE.Mesh(legGeo, getMobPartMats('enderman', 56, 0, 2, 30, 2)); legR.position.set(-0.15, 1.0, 0); eGroup.add(legR); legs.push(legR);

            eGroup.position.set(x, y + 2, z); scene.add(eGroup);
            entities.push({
                type: 'enderman', mesh: eGroup, legs: legs, arms: [armL, armR], hp: 40, velocity: new THREE.Vector3(), state: 'idle', target: new THREE.Vector3(), timer: 0,
                update: function (delta, time) {
                    if (this.hp <= 0) { 
                        addBlockToInventory('ender_pearl', 1); renderInventoryUI(); 
                        for(let i=0; i<8 * 4; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 5);
                        return true; 
                    }
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
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), new THREE.MeshBasicMaterial({ map: mobTexs['end_crystal'], transparent: true }));
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
            // 初始显示判断
            document.getElementById('boss-bar-container').style.display = (currentDimension === 'end') ? 'flex' : 'none';
            entities.push({
                type: 'dragon', mesh: dGroup, wings: [wingL, wingR], hp: 200, maxHp: 200, phase: 'circle', timer: 0, angle: 0,
                update: function (delta, time) {
                    if (isGameClear) return false;
                    const barContainer = document.getElementById('boss-bar-container');
                    if (currentDimension === 'end') {
                        barContainer.style.display = 'flex';
                        document.getElementById('boss-bar-fill').style.width = `${(this.hp / this.maxHp) * 100}%`;
                    } else {
                        barContainer.style.display = 'none';
                    }
                    if (this.hp <= 0) { 
                        barContainer.style.display = 'none'; for (let i = 0; i < 30; i++) spawnParticle(this.mesh.position, 0xff00ff); generateReturnPortal(); 
                        // 末影龙掉落大量经验 (大约 100 个大经验球，每个 1000 XP，总计 100000，按公式大约 60+ 级)
                        for(let i=0; i<100; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 1000 * 4);
                        return true; 
                    }
                    const flap = Math.sin(time * 8) * 0.5; this.wings[0].rotation.z = flap; this.wings[1].rotation.z = Math.PI - flap;
                    this.timer += delta;
                    if (this.phase === 'circle') { this.angle += delta * 0.5; const targetPos = new THREE.Vector3(Math.cos(this.angle) * 30, 50 + Math.sin(time * 2) * 5, Math.sin(this.angle) * 30); this.mesh.position.lerp(targetPos, delta * 2); this.mesh.lookAt(targetPos); if (this.timer > 10 && Math.random() < 0.05) { this.phase = 'swoop'; this.timer = 0; } }
                    else if (this.phase === 'swoop') { const targetPos = camera.position.clone(); targetPos.y += 2; this.mesh.position.lerp(targetPos, delta * 3); this.mesh.lookAt(targetPos); if (this.mesh.position.distanceTo(camera.position) < 8) { if (playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(6); velocity.y = 15; } this.phase = 'circle'; this.timer = 0; } if (this.timer > 5) { this.phase = 'circle'; this.timer = 0; } }
                    this.mesh.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissive.r > 0) { c.material.emissive.r = Math.max(0, c.material.emissive.r - delta * 10); } });
                    return false;
                }
            });
        }

        var spawnXPOrb = function(x, y, z, value) {
            // 使用球形几何体，更像原版经验球，尺寸与末影之眼接近
            const orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshLambertMaterial({ color: 0x7fff00, emissive: 0x7fff00 }));
            orbMesh.position.set(x, y, z);
            scene.add(orbMesh);
            
            entities.push({
                type: 'xp_orb', mesh: orbMesh, value: value || 1, velocity: new THREE.Vector3((Math.random() - 0.5) * 4, 4 + Math.random() * 4, (Math.random() - 0.5) * 4),
                life: 300,
                update: function (delta, time) {
                    this.life -= delta;
                    if (this.life <= 0) return true;

                    // 颜色闪烁
                    const hue = (Math.sin(time * 15) + 1) / 2;
                    orbMesh.material.color.setHSL(0.2 + hue * 0.1, 1, 0.5);

                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (dist < 10) {
                        // 像末影之眼一样被玩家吸引，但是没有紫色粒子
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position).normalize();
                        const speed = Math.max(12, 25 - dist);
                        this.velocity.lerp(dir.multiplyScalar(speed), delta * 6);
                    } else {
                        this.velocity.y -= 15 * delta;
                        this.velocity.x *= 0.95;
                        this.velocity.z *= 0.95;
                    }

                    const step = this.velocity.clone().multiplyScalar(delta);
                    const nextPos = this.mesh.position.clone().add(step);
                    
                    if (checkCollisionGeneric(nextPos.x, nextPos.y, nextPos.z, 0.1, 0.1)) {
                        this.velocity.y = -this.velocity.y * 0.4;
                        this.velocity.x *= 0.4;
                        this.velocity.z *= 0.4;
                    } else {
                        this.mesh.position.copy(nextPos);
                    }

                    // 靠近玩家不到一个方块(1.2)即消失并增加经验
                    if (dist < 1.1) {
                        if (window.addXP) window.addXP(this.value);
                        return true;
                    }
                    return false;
                }
            });
        }
        window.spawnXPOrb = spawnXPOrb;

        let zombieSpawnTimer = 0; let endermanSpawnTimer = 0; let blazeSpawnTimer = 0; let pigSpawnTimer = 0;
        
        // ==========================================