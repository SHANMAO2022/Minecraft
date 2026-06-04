        // ==========================================
        const STRONGHOLD_POS = { x: 64, y: -25, z: 64 };
        const particles = [];
        window.particles = particles;

        function getBlockColor(blockType) {
            if (!blockType) return 0x808080;
            const base = window.getBaseType ? window.getBaseType(blockType) : blockType;
            if (base.includes('grass')) return 0x557a46;
            if (base.includes('leaves') || base.includes('vine')) return 0x2d5a27;
            if (base.includes('wood') || base.includes('planks') || base.includes('log') || base.includes('chest') || base.includes('crafting') || base.includes('fence') || base.includes('door') || base.includes('bed')) return 0x9b7653;
            if (base.includes('dirt')) return 0x866043;
            if (base.includes('sand')) return 0xdfd5a5;
            if (base.includes('gravel')) return 0x696969;
            if (base.includes('snow') || base.includes('ice')) return 0xf0f8ff;
            if (base.includes('netherrack')) return 0x731a1a;
            if (base.includes('obsidian')) return 0x1a1126;
            if (base.includes('coal')) return 0x303030;
            if (base.includes('iron')) return 0xd8c8b8;
            if (base.includes('gold')) return 0xfcdb03;
            if (base.includes('diamond')) return 0x2de0e6;
            return 0x808080; // stone default
        }
        window.getBlockColor = getBlockColor;

        function spawnParticle(pos, colorHex, size = 0.15, customVel = null, lifeTime = 0.8) {
            const p = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size), 
                new THREE.MeshBasicMaterial({ color: colorHex })
            );
            p.position.copy(pos);
            scene.add(p);
            
            const vel = customVel || new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 4 + 2,
                (Math.random() - 0.5) * 4
            );
            
            particles.push({ 
                mesh: p, 
                life: lifeTime, 
                maxLife: lifeTime,
                vel: vel 
            });
        }
        window.spawnParticle = spawnParticle;

        function spawnBlockBreakParticles(bx, by, bz, blockType) {
            const blockColor = window.getBlockColor ? window.getBlockColor(blockType) : 0x808080;
            for (let pIdx = 0; pIdx < 16; pIdx++) {
                const pPos = new THREE.Vector3(
                    bx + 0.2 + Math.random() * 0.6,
                    by + 0.2 + Math.random() * 0.6,
                    bz + 0.2 + Math.random() * 0.6
                );
                const vel = new THREE.Vector3(
                    (Math.random() - 0.5) * 3.5,
                    Math.random() * 3.5 + 1.5,
                    (Math.random() - 0.5) * 3.5
                );
                window.spawnParticle(pPos, blockColor, 0.08 + Math.random() * 0.08, vel, 0.6 + Math.random() * 0.4);
            }
        }
        window.spawnBlockBreakParticles = spawnBlockBreakParticles;

        function moveMobSafely(mob, dx, dz, yOffset, radius, height) {
            const maxStep = 0.18;
            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / maxStep));
            let moved = false;
            for (let i = 0; i < steps; i++) {
                const sx = dx / steps;
                const sz = dz / steps;
                const px = mob.mesh.position.x;
                const py = mob.mesh.position.y + yOffset;
                const pz = mob.mesh.position.z;
                if (sx !== 0 && !checkCollisionGeneric(px + sx, py, pz, radius, height)) {
                    mob.mesh.position.x += sx;
                    moved = true;
                } else if (sx !== 0) {
                    mob.velocity.x = 0;
                    dx = 0;
                }
                if (sz !== 0 && !checkCollisionGeneric(mob.mesh.position.x, py, pz + sz, radius, height)) {
                    mob.mesh.position.z += sz;
                    moved = true;
                } else if (sz !== 0) {
                    mob.velocity.z = 0;
                    dz = 0;
                }
            }
            if (!moved) {
                tryResolveMobStuck(mob, yOffset, radius, height);
            }
            return moved;
        }
        window.moveMobSafely = moveMobSafely;

        function getMobCollisionProfile(type) {
            if (type === 'spider') return { yOffset: 0, radius: 0.45, height: 0.6 };
            if (type === 'enderman') return { yOffset: -0.5, radius: 0.4, height: 2.8 };
            if (type === 'blaze') return { yOffset: 0, radius: 0.4, height: 1.8 };
            if (type === 'pig') return { yOffset: -0.2, radius: 0.4, height: 0.8 };
            if (type === 'cow') return { yOffset: -0.2, radius: 0.45, height: 1.2 };
            if (type === 'zombie') return { yOffset: -0.15, radius: 0.35, height: 1.8 };
            if (type === 'villager') return { yOffset: -0.2, radius: 0.35, height: 1.8 };
            return { yOffset: -0.2, radius: 0.4, height: 1.8 };
        }
        window.getMobCollisionProfile = getMobCollisionProfile;

        const MOB_SOUND_FILES = {
            pig: {
                ambient: ['sounds/mob/pig/say1.ogg', 'sounds/mob/pig/say2.ogg'],
                hurt: ['sounds/mob/pig/death.ogg']
            },
            cow: {
                ambient: ['sounds/mob/cow/say1.ogg', 'sounds/mob/cow/say2.ogg'],
                hurt: ['sounds/mob/cow/hurt1.ogg', 'sounds/mob/cow/hurt2.ogg']
            },
            zombie: {
                ambient: ['sounds/mob/zombie/say1.ogg', 'sounds/mob/zombie/say2.ogg'],
                hurt: ['sounds/mob/zombie/hurt1.ogg', 'sounds/mob/zombie/hurt2.ogg']
            },
            spider: {
                ambient: ['sounds/mob/spider/say1.ogg', 'sounds/mob/spider/say2.ogg'],
                hurt: ['sounds/mob/spider/say1.ogg', 'sounds/mob/spider/say2.ogg']
            },
            blaze: {
                ambient: ['sounds/mob/blaze/breathe1.ogg', 'sounds/mob/blaze/breathe2.ogg'],
                hurt: ['sounds/mob/blaze/hit1.ogg', 'sounds/mob/blaze/hit2.ogg']
            },
            enderman: {
                ambient: ['sounds/mob/endermen/idle1.ogg', 'sounds/mob/endermen/idle2.ogg'],
                hurt: ['sounds/mob/endermen/hit1.ogg', 'sounds/mob/endermen/hit2.ogg']
            },
            villager: {
                ambient: ['sounds/mob/villager/idle1.ogg', 'sounds/mob/villager/idle2.ogg'],
                hurt: ['sounds/mob/villager/hit1.ogg', 'sounds/mob/villager/hit2.ogg']
            }
        };
        const mobSoundPools = {};

        function playMobSound(mob, kind = 'ambient') {
            const files = mob && MOB_SOUND_FILES[mob.type] && MOB_SOUND_FILES[mob.type][kind];
            if (!files || !files.length || !mob.mesh || typeof camera === 'undefined') return;
            const distance = mob.mesh.position.distanceTo(camera.position);
            const maxDistance = kind === 'hurt' ? 42 : 32;
            if (distance > maxDistance) return;
            const path = files[Math.floor(Math.random() * files.length)];
            if (!mobSoundPools[path]) mobSoundPools[path] = [];
            const pool = mobSoundPools[path];
            let audio = pool.find(item => item.paused || item.ended);
            if (!audio && pool.length < 3) {
                audio = new Audio(path);
                audio.preload = 'auto';
                pool.push(audio);
            }
            if (!audio) return;
            const distanceVolume = Math.max(0, 1 - distance / maxDistance);
            const volume = distanceVolume * distanceVolume * (kind === 'hurt' ? 1.0 : 0.78);
            if (window.prepareBoostedEffectAudio) window.prepareBoostedEffectAudio(audio, volume, 2.2);
            else audio.volume = Math.min(1, volume);
            audio.playbackRate = 0.92 + Math.random() * 0.16;
            try { audio.currentTime = 0; } catch {}
            const promise = audio.play();
            if (promise) promise.catch(() => {});
        }
        window.playMobSound = playMobSound;

        function updateMobAmbientSound(mob, delta, distSq) {
            if (!MOB_SOUND_FILES[mob.type] || mob.dying || mob.hp <= 0) return;
            if (!Number.isFinite(mob.ambientSoundTimer)) mob.ambientSoundTimer = 2 + Math.random() * 8;
            mob.ambientSoundTimer -= delta;
            if (mob.ambientSoundTimer > 0) return;
            mob.ambientSoundTimer = 7 + Math.random() * 13;
            if (distSq <= 24 * 24) playMobSound(mob, 'ambient');
        }
        window.updateMobAmbientSound = updateMobAmbientSound;

        function reactMobToDamage(mob, sourcePosition) {
            if (!mob || !mob.mesh || mob.type === 'dragon' || mob.type === 'crystal') return;
            playMobSound(mob, 'hurt');
            const source = sourcePosition && sourcePosition.isVector3 ? sourcePosition : camera.position;
            mob.fleeFrom = source.clone();
            mob.fleeTimer = 2.2 + Math.random() * 1.4;
            mob.timer = Math.max(mob.timer || 0, mob.fleeTimer);
            if (mob.target && mob.target.isVector3) {
                const away = new THREE.Vector3().subVectors(mob.mesh.position, source);
                away.y = 0;
                if (away.lengthSq() < 0.001) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
                away.normalize();
                mob.target.copy(mob.mesh.position).addScaledVector(away, 12);
                mob.mesh.lookAt(mob.target.x, mob.mesh.position.y, mob.target.z);
                if (mob.type !== 'enderman') mob.state = 'wander';
            }
        }
        window.reactMobToDamage = reactMobToDamage;

        function updateMobFlee(mob, delta) {
            if (!mob || !mob.mesh || !mob.fleeFrom || !(mob.fleeTimer > 0) || mob.dying || mob.hp <= 0) return false;
            mob.fleeTimer -= delta;
            const away = new THREE.Vector3().subVectors(mob.mesh.position, mob.fleeFrom);
            away.y = 0;
            if (away.lengthSq() < 0.001) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
            away.normalize();
            const profile = getMobCollisionProfile(mob.type);
            const speed = ['pig', 'cow', 'villager'].includes(mob.type) ? 6.0 : 7.0;
            moveMobSafely(mob, away.x * speed * delta, away.z * speed * delta, profile.yOffset, profile.radius, profile.height);
            mob.mesh.lookAt(mob.mesh.position.x + away.x, mob.mesh.position.y, mob.mesh.position.z + away.z);
            if (mob.fleeTimer <= 0) {
                mob.fleeFrom = null;
                if (mob.state === 'wander') mob.timer = Math.min(mob.timer || 0, 0.6);
            }
            return true;
        }
        window.updateMobFlee = updateMobFlee;

        function tryResolveMobStuck(mob, yOffset, radius, height) {
            if (!mob || !mob.mesh || !checkCollisionGeneric) return false;
            const px = mob.mesh.position.x;
            const py = mob.mesh.position.y + yOffset;
            const pz = mob.mesh.position.z;
            if (!checkCollisionGeneric(px, py, pz, radius, height)) return false;

            const tryOffsets = [
                [0, 0], [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35],
                [0.35, 0.35], [0.35, -0.35], [-0.35, 0.35], [-0.35, -0.35],
                [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]
            ];
            const maxLift = 2.5;
            for (let lift = 0; lift <= maxLift; lift += 0.25) {
                for (let i = 0; i < tryOffsets.length; i++) {
                    const ox = tryOffsets[i][0];
                    const oz = tryOffsets[i][1];
                    const nx = px + ox;
                    const ny = mob.mesh.position.y + lift;
                    const nz = pz + oz;
                    if (!checkCollisionGeneric(nx, ny + yOffset, nz, radius, height)) {
                        mob.mesh.position.set(nx, ny, nz);
                        if (mob.velocity && mob.velocity.y < 0) mob.velocity.y = 0;
                        return true;
                    }
                }
            }
            return false;
        }
        window.tryResolveMobStuck = tryResolveMobStuck;

        function resolveSafeSpawnPosition(x, z, y, yOffset, radius, height) {
            const tryPos = (sx, sy, sz) => {
                if (checkCollisionGeneric(sx, sy + yOffset, sz, radius, height)) return false;
                if (!checkCollisionGeneric(sx, sy + yOffset - 0.08, sz, radius, 0.1)) return false;
                return true;
            };

            const startY = (Number.isFinite(y) ? y : 0) + 2.0;
            const yCandidates = [];
            for (let dy = 0; dy <= 6; dy += 0.5) yCandidates.push(startY + dy);
            for (let dy = 0.5; dy <= 8; dy += 0.5) yCandidates.push(startY - dy);

            for (let yi = 0; yi < yCandidates.length; yi++) {
                if (tryPos(x, yCandidates[yi], z)) return { x, y: yCandidates[yi], z };
            }

            const rings = [0.8, 1.4, 2.0, 2.8];
            for (let ri = 0; ri < rings.length; ri++) {
                const r = rings[ri];
                for (let a = 0; a < 16; a++) {
                    const ang = (a / 16) * Math.PI * 2;
                    const sx = x + Math.cos(ang) * r;
                    const sz = z + Math.sin(ang) * r;
                    for (let yi = 0; yi < yCandidates.length; yi++) {
                        if (tryPos(sx, yCandidates[yi], sz)) return { x: sx, y: yCandidates[yi], z: sz };
                    }
                }
            }

            return { x, y: startY, z };
        }

        function spawnMobSmoke(pos, count = 8) {
            for (let i = 0; i < count; i++) {
                const pPos = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.8, (Math.random() - 0.5) * 0.8));
                const vel = new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8);
                spawnParticle(pPos, 0x777777, 0.12 + Math.random() * 0.08, vel, 0.7 + Math.random() * 0.4);
            }
        }

        function handleMobDeath(mob, delta, drops, xpCount, xpValue) {
            if (!mob.dying) {
                mob.dying = true;
                mob.deathTimer = 0;
                mob.deathRollDir = Math.random() < 0.5 ? -1 : 1;
                mob.deathDropped = false;
                mob.velocity.set(0, 0, 0);
                if (window.trackMonsterKill && ['zombie', 'spider', 'enderman', 'blaze'].includes(mob.type)) {
                    window.trackMonsterKill(mob.type);
                }
            }

            mob.deathTimer += delta;
            const t = Math.min(1, mob.deathTimer / 0.55);
            mob.mesh.rotation.z = mob.deathRollDir * (Math.PI / 2) * t;
            mob.mesh.rotation.x *= 0.9;
            if (Math.random() < 0.35) spawnMobSmoke(mob.mesh.position, 1);

            if (mob.deathTimer >= 0.8 && !mob.deathDropped) {
                mob.deathDropped = true;
                drops.forEach(drop => {
                    const count = typeof drop.count === 'function' ? drop.count() : drop.count;
                    if (count > 0) spawnDroppedItem(mob.mesh.position.x, mob.mesh.position.y, mob.mesh.position.z, drop.type, count);
                });
                for (let i = 0; i < xpCount; i++) spawnXPOrb(mob.mesh.position.x, mob.mesh.position.y, mob.mesh.position.z, xpValue);
                spawnMobSmoke(mob.mesh.position, 10);
            }
            return mob.deathTimer > 1.15;
        }

        const MOB_TEXTURE_SIZE = {
            zombie: { w: 64, h: 64 },
            villager: { w: 64, h: 64 },
            steve: { w: 64, h: 64 },
            pig: { w: 64, h: 32 },
            cow: { w: 64, h: 32 },
            spider: { w: 64, h: 32 },
            enderman: { w: 64, h: 32 },
            blaze: { w: 64, h: 32 },
            dragon: { w: 256, h: 256 },
            end_crystal: { w: 128, h: 64 }
        };
        const mobTexs = {};
        function loadMobTexture(mobType) {
            const basePath = 'textures/' + mobType + '.png';
            const versionedPath = basePath + CACHE_V;
            const sources = window.getTextureSources ? window.getTextureSources(mobType) : [
                (window.TEXTURE_DATA && window.TEXTURE_DATA[mobType]) ? window.TEXTURE_DATA[mobType] : null,
                versionedPath,
                basePath,
                window.MISSING_TEXTURE_DATA_URL
            ].filter(Boolean);

            const img = new Image();
            if (window.location.protocol !== 'file:') img.crossOrigin = 'anonymous';
            const tex = new THREE.Texture(img);
            tex._mobClones = [];
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.colorSpace = THREE.SRGBColorSpace;

            let sourceIndex = 0;
            img.onload = () => {
                tex.needsUpdate = true;
                if (tex._mobClones) tex._mobClones.forEach(t => { t.needsUpdate = true; });
            };
            img.onerror = () => {
                sourceIndex++;
                if (sourceIndex < sources.length) img.src = sources[sourceIndex];
                else {
                    console.warn('Mob texture load failed:', mobType, sources);
                    if (window.MISSING_TEXTURE_DATA_URL && img.src !== window.MISSING_TEXTURE_DATA_URL) img.src = window.MISSING_TEXTURE_DATA_URL;
                }
            };
            img.src = sources[0];
            return tex;
        }
        ['zombie', 'pig', 'spider', 'enderman', 'blaze', 'dragon', 'end_crystal', 'cow', 'villager'].forEach(m => {
            mobTexs[m] = loadMobTexture(m);
        });

        function getMobPartMats(mob, ox, oy, w, h, d, tw = null, th = null) {
            const tex = mobTexs[mob];
            const size = MOB_TEXTURE_SIZE[mob] || { w: 64, h: 32 };
            tw = tw || size.w;
            th = th || size.h;
            function getFace(x, y, fw, fh) {
                if (!tex) return new THREE.MeshLambertMaterial({ color: 0xffffff });
                const t = tex.clone();
                if (tex._mobClones) tex._mobClones.push(t);
                t.needsUpdate = true;
                t.magFilter = THREE.NearestFilter;
                t.minFilter = THREE.NearestFilter;
                t.colorSpace = THREE.SRGBColorSpace;
                t.wrapS = THREE.ClampToEdgeWrapping;
                t.wrapT = THREE.ClampToEdgeWrapping;
                t.repeat.set(fw / tw, fh / th);
                t.offset.set(x / tw, 1 - (y + fh) / th);
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

        function getMobPlaneMat(mob, x, y, w, h, tw = null, th = null) {
            const tex = mobTexs[mob];
            const size = MOB_TEXTURE_SIZE[mob] || { w: 64, h: 32 };
            tw = tw || size.w;
            th = th || size.h;
            if (!tex) return new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
            const t = tex.clone();
            if (tex._mobClones) tex._mobClones.push(t);
            t.needsUpdate = true;
            t.magFilter = THREE.NearestFilter;
            t.minFilter = THREE.NearestFilter;
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = THREE.ClampToEdgeWrapping;
            t.wrapT = THREE.ClampToEdgeWrapping;
            t.repeat.set(w / tw, h / th);
            t.offset.set(x / tw, 1 - (y + h) / th);
            return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
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
                            e.lastDamageSource = 'player';
                            if (e.type === 'crystal') e.hp = 0;
                            e.redTimer = 0.3;
                            e.mesh.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(0xaa0000); });
                            
                            const hitPos = this.mesh.position;
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
                                spawnParticle(pPos, 0xbf1515, 0.08 + Math.random() * 0.06, vel, 0.4 + Math.random() * 0.3);
                            }

                            if (e.type !== 'crystal' && e.type !== 'dragon') {
                                const source = e.mesh.position.clone().addScaledVector(this.velocity.clone().normalize(), -2);
                                reactMobToDamage(e, source);
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
                type: 'cow', mesh: cGroup, hp: 10, maxHp: 10, legs: legs, state: 'idle', timer: 0, velocity: new THREE.Vector3(), target: new THREE.Vector3(), persistent: true,
                update: function (delta, time) {
                    if (this.hp <= 0 || this.dying) return handleMobDeath(this, delta, [
                        { type: 'raw_beef', count: () => Math.floor(Math.random() * 2) + 1 },
                        { type: 'leather', count: () => Math.floor(Math.random() * 2) }
                    ], 12, 2);
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
                            if (!moveMobSafely(this, stepX, stepZ, -0.2, 0.45, 1.2)) { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            const ls = Math.sin(time * 10) * 0.5; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls; this.legs[2].rotation.x = -ls; this.legs[3].rotation.x = ls;
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.2, this.mesh.position.z, 0.45, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.2) + 1 + 0.2; this.velocity.y = 0; }

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
                type: 'pig', mesh: pGroup, hp: 10, maxHp: 10, legs: legs, state: 'idle', timer: 0, velocity: new THREE.Vector3(), target: new THREE.Vector3(), persistent: true,
                update: function (delta, time) {
                    if (this.hp <= 0 || this.dying) return handleMobDeath(this, delta, [
                        { type: 'raw_porkchop', count: 1 }
                    ], 8, 1);
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
                            if (!moveMobSafely(this, stepX, stepZ, -0.2, 0.4, 0.8)) { this.timer = 0; if (this.velocity.y === 0) this.velocity.y = 6; }
                            const ls = Math.sin(time * 15) * 0.5; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls; this.legs[2].rotation.x = -ls; this.legs[3].rotation.x = ls;
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.2, this.mesh.position.z, 0.4, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.2) + 1 + 0.2; this.velocity.y = 0; }

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
            const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), getMobPartMats('zombie', 32, 48, 4, 12, 4)); armL.position.set(0.35, 1.2, 0.2); armL.rotation.x = Math.PI / 2; zGroup.add(armL);
            const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), getMobPartMats('zombie', 40, 16, 4, 12, 4)); armR.position.set(-0.35, 1.2, 0.2); armR.rotation.x = Math.PI / 2; zGroup.add(armR);
            const legs = [];
            const legL = new THREE.Mesh(zLegGeo, getMobPartMats('zombie', 16, 48, 4, 12, 4)); legL.position.set(0.15, 0.6, 0); zGroup.add(legL); legs.push(legL);
            const legR = new THREE.Mesh(zLegGeo, getMobPartMats('zombie', 0, 16, 4, 12, 4)); legR.position.set(-0.15, 0.6, 0); zGroup.add(legR); legs.push(legR);

            zGroup.position.set(x, y + 2, z); scene.add(zGroup);
            entities.push({
                type: 'zombie', mesh: zGroup, legs: legs, hp: 20, maxHp: 20, velocity: new THREE.Vector3(), burnTimer: 0, attackCooldown: 0, persistent: true,
                update: function (delta, time, sunHeight, isNight) {
                    if (this.hp <= 0 || this.dying) return handleMobDeath(this, delta, [
                        { type: 'rotten_flesh', count: 1 }
                    ], 20, 3);
                    const sSurfaceY = Math.floor(noise2D(this.mesh.position.x * 0.04, this.mesh.position.z * 0.04) * 5);
                    if (!isNight && this.mesh.position.y >= sSurfaceY && currentDimension === 'overworld') {
                        this.burnTimer += delta;
                        if (this.burnTimer > 1) { this.hp -= 2; this.burnTimer = 0; this.redTimer = 0.3; this.mesh.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(0xaa0000); }); }
                    }
                    if (this.attackCooldown > 0) this.attackCooldown -= delta;
                    let targetPos = null;
                    let targetVillager = null;
                    let targetDist = Infinity;
                    if (!isDead && gameMode !== 2) {
                        const playerDist = this.mesh.position.distanceTo(camera.position);
                        if (playerDist < 20) {
                            targetDist = playerDist;
                            targetPos = camera.position;
                        }
                    }
                    for (let i = 0; i < entities.length; i++) {
                        const e = entities[i];
                        if (e.type !== 'villager' || e.hp <= 0 || e.dying) continue;
                        const d = this.mesh.position.distanceTo(e.mesh.position);
                        if (d < 18 && d < targetDist) {
                            targetDist = d;
                            targetPos = e.mesh.position;
                            targetVillager = e;
                        }
                    }

                    if (targetPos) {
                        const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
                        dir.y = 0;
                        if (dir.lengthSq() > 0.0001) dir.normalize();
                        this.mesh.lookAt(targetPos.x, this.mesh.position.y, targetPos.z);
                        if (targetVillager) {
                            if (targetDist < 1.35 && this.attackCooldown <= 0) {
                                targetVillager.hp -= 3;
                                targetVillager.lastDamageSource = 'monster';
                                targetVillager.redTimer = 0.3;
                                reactMobToDamage(targetVillager, this.mesh.position);
                                this.attackCooldown = 0.9;
                            }
                        } else if (targetDist < 1.5 && playerInvulnTimer <= 0 && gameMode === 1) {
                            takeDamage(3);
                            velocity.x = dir.x * -15;
                            velocity.z = dir.z * -15;
                        }
                        if (targetDist > 1.0) {
                            const stepX = dir.x * 3.5 * delta; const stepZ = dir.z * 3.5 * delta;
                            if (!moveMobSafely(this, stepX, stepZ, -0.15, 0.35, 1.8) && this.velocity.y === 0) this.velocity.y = 6.5;
                            const ls = Math.sin(time * 10) * 0.6; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls;
                        } else {
                            this.legs.forEach(leg => leg.rotation.x = 0);
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }

                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.15, this.mesh.position.z, 0.35, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.15) + 1 + 0.15; this.velocity.y = 0; }

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
            // Spider legs use their own texture strip (avoid sampling from body area).
            for (let i = 0; i < 8; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), getMobPartMats('spider', 0, 16, 2, 8, 2)); spGroup.add(leg); legs.push(leg); }

            spGroup.position.set(x, y + 1, z); scene.add(spGroup);
            entities.push({
                type: 'spider', mesh: spGroup, legs: legs, hp: 16, maxHp: 16, velocity: new THREE.Vector3(), target: new THREE.Vector3(), state: 'idle', timer: 0, persistent: true,
                update: function (delta, time) {
                    if (this.hp <= 0 || this.dying) return handleMobDeath(this, delta, [
                        { type: 'string', count: () => Math.floor(Math.random() * 2) + 5 }
                    ], 20, 2);
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (dist < 16 && !isDead && gameMode !== 2) {
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position); dir.y = 0; dir.normalize();
                        this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);
                        if (dist < 1.5 && playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(2); velocity.x = dir.x * -10; velocity.z = dir.z * -10; }
                        if (dist > 1.2) {
                            const stepX = dir.x * 2.5 * delta; const stepZ = dir.z * 2.5 * delta;
                            const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                            if (!moveMobSafely(this, stepX, stepZ, 0, 0.45, 0.6) && this.velocity.y === 0) this.velocity.y = 6;
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
                                if (!moveMobSafely(this, stepX, stepZ, 0, 0.45, 0.6)) this.timer = 0;
                                for (let i = 0; i < 8; i++) { const side = i % 2 === 0 ? 1 : -1; const offset = Math.floor(i / 2); this.legs[i].position.set(side * (0.45 + Math.abs(Math.sin(time * 10 + offset)) * 0.2), 0.3, (offset - 1.5) * 0.3); this.legs[i].rotation.z = side * Math.PI / 4; }
                            }
                        } else { for (let i = 0; i < 8; i++) { const side = i % 2 === 0 ? 1 : -1; const offset = Math.floor(i / 2); this.legs[i].position.set(side * 0.45, 0.3, (offset - 1.5) * 0.3); this.legs[i].rotation.z = side * Math.PI / 4; } }
                    }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 0.45, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y) + 1; this.velocity.y = 0; }

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
                type: 'blaze', mesh: bGroup, rods: rods, hp: 20, maxHp: 20, velocity: new THREE.Vector3(), targetY: y + 2, persistent: true,
                update: function (delta, time) {
                    if (this.hp <= 0 || this.dying) return handleMobDeath(this, delta, [
                        { type: 'blaze_rod', count: () => Math.floor(Math.random() * 2) + 2 }
                    ], 40, 5);
                    for (let i = 0; i < 8; i++) { const rRadius = i < 4 ? 0.6 : 0.8; const rSpeed = i < 4 ? 2 : -1.5; const rHeight = i < 4 ? 1.4 : 1.0; const angle = time * rSpeed + (i * Math.PI / 2); this.rods[i].position.set(Math.cos(angle) * rRadius, rHeight + Math.sin(time * 5 + i) * 0.2, Math.sin(angle) * rRadius); }
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (dist < 20 && !isDead && gameMode !== 2) {
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position); dir.y = 0; dir.normalize();
                        this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);
                        if (dist < 2.0 && playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(2); velocity.x = dir.x * -15; velocity.z = dir.z * -15; }
                        if (dist > 1.5) {
                            const stepX = dir.x * 3.0 * delta; const stepZ = dir.z * 3.0 * delta;
                            const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                            moveMobSafely(this, stepX, stepZ, 0, 0.4, 1.8);
                        }
                        this.targetY = camera.position.y;
                    } else { this.targetY = y + 2 + Math.sin(time) * 1.5; }
                    const dY = this.targetY - this.mesh.position.y;
                    this.velocity.y += dY * delta * 5; this.velocity.y *= 0.9; this.mesh.position.y += this.velocity.y * delta;

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
                type: 'enderman', mesh: eGroup, legs: legs, arms: [armL, armR], hp: 40, maxHp: 40, velocity: new THREE.Vector3(), state: 'idle', target: new THREE.Vector3(), timer: 0, persistent: true,
                update: function (delta, time) {
                    if (this.hp <= 0 || this.dying) return handleMobDeath(this, delta, [
                        { type: 'ender_pearl', count: 1 }
                    ], 32, 5);
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (this.state === 'aggro') {
                        if (dist < 30 && !isDead && gameMode !== 2) {
                            const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position); dir.y = 0; dir.normalize();
                            this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);
                            this.arms.forEach(a => a.rotation.x = Math.PI / 2 + Math.sin(time * 20) * 0.2);
                            if (dist < 2.0 && playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(5); velocity.x = dir.x * -20; velocity.z = dir.z * -20; }
                            if (dist > 1.5) {
                                const stepX = dir.x * 6.0 * delta; const stepZ = dir.z * 6.0 * delta;
                                const px = this.mesh.position.x; const py = this.mesh.position.y; const pz = this.mesh.position.z;
                                if (!moveMobSafely(this, stepX, stepZ, -0.5, 0.4, 2.8) && this.velocity.y === 0) this.velocity.y = 7.5;
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
                            moveMobSafely(this, stepX, stepZ, -0.5, 0.4, 2.8);
                            const ls = Math.sin(time * 8) * 0.4; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls;
                        } else { this.legs.forEach(leg => leg.rotation.x = 0); }
                    }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.5, this.mesh.position.z, 0.4, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.5) + 1 + 0.5; this.velocity.y = 0; }

                    return false;
                },
                onHit: function () { this.state = 'aggro'; }
            });
        }

        function tryOpenDoorAt(x, y, z) {
            const bt = getBlock(x, y, z);
            if (bt !== 'door_top' && bt !== 'door_bottom' && bt !== 'door_top_open' && bt !== 'door_bottom_open') return false;
            const isTop = bt === 'door_top' || bt === 'door_top_open';
            const isOpen = bt === 'door_top_open' || bt === 'door_bottom_open';
            if (isOpen) return false;
            const bottomY = isTop ? y - 1 : y;
            const topY = bottomY + 1;
            const fullBottom = getFullBlock(x, bottomY, z);
            const fullTop = getFullBlock(x, topY, z);
            const facing = window.getTypeFacing ? (window.getTypeFacing(fullBottom) || window.getTypeFacing(fullTop)) : null;
            const suffix = facing ? `_${facing}` : '';
            setBlock(x, bottomY, z, 'door_bottom_open' + suffix);
            setBlock(x, topY, z, 'door_top_open' + suffix);
            return true;
        }

        function tryVillagerOpenNearbyDoor(villager, dirX, dirZ) {
            if (!villager || !villager.mesh) return false;
            const len = Math.hypot(dirX, dirZ);
            if (len < 0.0001) return false;
            const nx = dirX / len;
            const nz = dirZ / len;
            const baseY = Math.floor(villager.mesh.position.y + 0.2);
            const aheadX = villager.mesh.position.x + nx * 0.75;
            const aheadZ = villager.mesh.position.z + nz * 0.75;
            const cx = Math.floor(aheadX);
            const cz = Math.floor(aheadZ);
            const candidates = [
                [cx, baseY, cz], [cx, baseY + 1, cz],
                [Math.floor(villager.mesh.position.x), baseY, Math.floor(villager.mesh.position.z)],
                [Math.floor(villager.mesh.position.x), baseY + 1, Math.floor(villager.mesh.position.z)]
            ];
            for (let i = 0; i < candidates.length; i++) {
                const [x, y, z] = candidates[i];
                if (tryOpenDoorAt(x, y, z)) return true;
            }
            return false;
        }

        function spawnVillager(x, z, y, villageSpawnKey = null, homeBed = null) {
            if (villageSpawnKey && entities.some(e => e.type === 'villager' && e.villageSpawnKey === villageSpawnKey)) {
                return;
            }
            const vGroup = new THREE.Group();
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), getMobPartMats('villager', 0, 0, 8, 8, 8, 64, 64)); head.position.y = 1.55; vGroup.add(head);
            const hat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), getMobPartMats('villager', 32, 0, 8, 8, 8, 64, 64)); hat.position.y = 1.55; vGroup.add(hat);
            const nose = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.1), getMobPartMats('villager', 24, 0, 2, 4, 2, 64, 64)); nose.position.set(0, 1.48, 0.32); vGroup.add(nose);
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.32), getMobPartMats('villager', 16, 20, 8, 12, 4, 64, 64)); body.position.y = 0.9; vGroup.add(body);
            const robe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.36), getMobPartMats('villager', 16, 20, 8, 12, 4, 64, 64)); robe.position.y = 0.58; vGroup.add(robe);
            const armMat = getMobPartMats('villager', 44, 22, 4, 12, 4, 64, 64);
            const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), armMat); armL.position.set(0.27, 0.95, 0.16); armL.rotation.x = Math.PI / 2.8; vGroup.add(armL);
            const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), armMat); armR.position.set(-0.27, 0.95, 0.16); armR.rotation.x = Math.PI / 2.8; vGroup.add(armR);
            const legGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18); legGeo.translate(0, -0.275, 0);
            const legs = [];
            const legL = new THREE.Mesh(legGeo, getMobPartMats('villager', 0, 22, 4, 12, 4, 64, 64)); legL.position.set(0.13, 0.55, 0); vGroup.add(legL); legs.push(legL);
            const legR = new THREE.Mesh(legGeo, getMobPartMats('villager', 0, 22, 4, 12, 4, 64, 64)); legR.position.set(-0.13, 0.55, 0); vGroup.add(legR); legs.push(legR);

            // Safe spawn: avoid spawning inside blocks (covers summon and village generation paths).
            const spawnPos = resolveSafeSpawnPosition(x, z, y, -0.2, 0.35, 1.8);
            vGroup.position.set(spawnPos.x, spawnPos.y, spawnPos.z); scene.add(vGroup);
            entities.push({
                type: 'villager', mesh: vGroup, legs: legs, hp: 20, maxHp: 20, velocity: new THREE.Vector3(), target: new THREE.Vector3(), timer: 0, state: 'idle', persistent: true, villageSpawnKey: villageSpawnKey || null, homeBed: homeBed || null, sleeping: false,
                update: function(delta, time) {
                    if (this.hp <= 0 || this.dying) {
                        if (!this.deathTracked && typeof window.markVillageVillagerKilled === 'function') {
                            window.markVillageVillagerKilled(this, this.lastDamageSource);
                            this.deathTracked = true;
                        }
                        return handleMobDeath(this, delta, [], 12, 2);
                    }
                    const isNightNow = (time % CYCLE_LENGTH) >= DAY_LENGTH;
                    if (isNightNow && this.homeBed) {
                        const bedX = this.homeBed.x + 0.5;
                        const bedY = this.homeBed.y + 0.42;
                        const bedZ = this.homeBed.z + 0.5;
                        const toBed = new THREE.Vector3(bedX - this.mesh.position.x, 0, bedZ - this.mesh.position.z);
                        const dist = Math.sqrt(toBed.x * toBed.x + toBed.z * toBed.z);
                        if (dist > 0.28) {
                            toBed.normalize();
                            this.mesh.lookAt(bedX, this.mesh.position.y, bedZ);
                            tryVillagerOpenNearbyDoor(this, toBed.x, toBed.z);
                            if (!moveMobSafely(this, toBed.x * 1.25 * delta, toBed.z * 1.25 * delta, -0.2, 0.35, 1.8)) this.timer = 0;
                            const ls = Math.sin(time * 8) * 0.35; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls;
                            this.sleeping = false;
                            this.mesh.rotation.x = 0;
                            this.mesh.rotation.z = 0;
                        } else {
                            this.sleeping = true;
                            this.mesh.position.x += (bedX - this.mesh.position.x) * Math.min(1, delta * 8);
                            this.mesh.position.z += (bedZ - this.mesh.position.z) * Math.min(1, delta * 8);
                            this.mesh.position.y = bedY;
                            this.velocity.y = 0;
                            this.legs.forEach(leg => leg.rotation.x = 0);
                            if (Math.abs(this.homeBed.dx) > 0) this.mesh.rotation.y = this.homeBed.dx > 0 ? -Math.PI / 2 : Math.PI / 2;
                            else this.mesh.rotation.y = this.homeBed.dz > 0 ? Math.PI : 0;
                            this.mesh.rotation.x = -Math.PI / 2;
                            this.mesh.rotation.z = 0;
                            return false;
                        }
                    } else if (this.sleeping) {
                        this.sleeping = false;
                        this.mesh.rotation.x = 0;
                        this.mesh.rotation.z = 0;
                    }
                    this.timer -= delta;
                    if (this.timer <= 0) {
                        if (this.state === 'idle') {
                            this.state = 'wander';
                            this.timer = 2 + Math.random() * 3;
                            this.target.set(this.mesh.position.x + (Math.random() - 0.5) * 8, this.mesh.position.y, this.mesh.position.z + (Math.random() - 0.5) * 8);
                            this.mesh.lookAt(this.target.x, this.mesh.position.y, this.target.z);
                        } else {
                            this.state = 'idle';
                            this.timer = 1 + Math.random() * 3;
                        }
                    }
                    if (this.state === 'wander') {
                        const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position); dir.y = 0;
                        if (dir.length() > 0.2) {
                            dir.normalize();
                            tryVillagerOpenNearbyDoor(this, dir.x, dir.z);
                            if (!moveMobSafely(this, dir.x * 1.2 * delta, dir.z * 1.2 * delta, -0.2, 0.35, 1.8)) this.timer = 0;
                            const ls = Math.sin(time * 8) * 0.45; this.legs[0].rotation.x = ls; this.legs[1].rotation.x = -ls;
                        }
                    } else { this.legs.forEach(leg => leg.rotation.x = 0); }
                    this.velocity.y -= 25.0 * delta; this.mesh.position.y += this.velocity.y * delta;
                    if (checkCollisionGeneric(this.mesh.position.x, this.mesh.position.y - 0.2, this.mesh.position.z, 0.35, 0.1)) { this.mesh.position.y = Math.floor(this.mesh.position.y - 0.2) + 1 + 0.2; this.velocity.y = 0; }
                    return false;
                }
            });
        }
        window.spawnVillager = spawnVillager;

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
            const dGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 8), getMobPartMats('dragon', 0, 0, 24, 24, 64, 256, 256)); dGroup.add(body);
            const chest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.1, 2.2), getMobPartMats('dragon', 0, 32, 24, 24, 24, 256, 256)); chest.position.set(0, 0.05, 2.4); dGroup.add(chest);
            const neckMat = getMobPartMats('dragon', 112, 88, 10, 10, 10, 256, 256);
            for (let i = 0; i < 3; i++) {
                const neck = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.9), neckMat);
                neck.position.set(0, 0.35 + i * 0.12, 3.2 + i * 0.7);
                dGroup.add(neck);
            }
            const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 2), getMobPartMats('dragon', 176, 44, 24, 24, 32, 256, 256)); head.position.set(0, 0.75, 5.45); dGroup.add(head);
            const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 1.45), getMobPartMats('dragon', 176, 88, 22, 8, 24, 256, 256)); jaw.position.set(0, 0.35, 5.75); dGroup.add(jaw);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
            const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), eyeMat); eyeL.position.set(0.42, 1.0, 6.5); dGroup.add(eyeL);
            const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), eyeMat); eyeR.position.set(-0.42, 1.0, 6.5); dGroup.add(eyeR);
            for (let i = 0; i < 4; i++) { const spike = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.5), new THREE.MeshLambertMaterial({ color: 0x333333 })); spike.position.set(0, 1.5, 2 - i * 2); dGroup.add(spike); }
            const wingGeo = new THREE.BoxGeometry(12, 0.1, 4); wingGeo.translate(6, 0, 0);
            const wingMat = getMobPlaneMat('dragon', 0, 128, 112, 88, 256, 256);
            const wingL = new THREE.Mesh(wingGeo, wingMat); wingL.position.set(1, 1, 0); dGroup.add(wingL);
            const wingR = new THREE.Mesh(wingGeo, wingMat.clone()); wingR.position.set(-1, 1, 0); wingR.rotation.z = Math.PI; dGroup.add(wingR);
            const tailMat = getMobPartMats('dragon', 112, 88, 10, 10, 10, 256, 256);
            for (let i = 0; i < 5; i++) {
                const tail = new THREE.Mesh(new THREE.BoxGeometry(0.95 - i * 0.08, 0.95 - i * 0.08, 1.4), tailMat);
                tail.position.set(0, -0.05 - i * 0.03, -4.6 - i * 1.25);
                dGroup.add(tail);
            }
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
                    if (this.hp <= 0 && this.phase !== 'dying') { 
                        this.phase = 'dying';
                        this.deathTimer = 0;
                        barContainer.style.display = 'none';
                        this.velocity.set(0, 0, 0);
                    }
                    if (this.phase === 'dying') {
                        this.deathTimer += delta;
                        if (Math.random() < 0.5) {
                            const offset = new THREE.Vector3((Math.random()-0.5)*15, (Math.random()-0.5)*15, (Math.random()-0.5)*15);
                            spawnParticle(this.mesh.position.clone().add(offset), Math.random() < 0.5 ? 0xffaa00 : 0xff0000);
                        }
                        if (Math.random() < 0.2) {
                            spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 1000 * 4);
                        }
                        
                        this.mesh.position.y += delta * 2;
                        this.mesh.rotation.x += delta * 0.5;
                        this.mesh.rotation.z += delta * 0.5;
                        this.wings[0].position.x -= delta * 5;
                        this.wings[1].position.x += delta * 5;
                        this.wings[0].rotation.y += delta;
                        this.wings[1].rotation.y -= delta;
                        
                        if (this.deathTimer > 5) {
                            for (let i = 0; i < 50; i++) spawnParticle(this.mesh.position, 0xff00ff);
                            activateReturnPortal(); 
                            for(let i=0; i<80; i++) spawnXPOrb(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, 1000 * 4);
                            return true; 
                        }
                        return false;
                    }
                    const flap = Math.sin(time * 8) * 0.5; this.wings[0].rotation.z = flap; this.wings[1].rotation.z = Math.PI - flap;
                    this.timer += delta;
                    if (this.phase === 'circle') { 
                        this.angle += delta * 0.5; 
                        const targetPos = new THREE.Vector3(Math.cos(this.angle) * 30, 50 + Math.sin(time * 2) * 5, Math.sin(this.angle) * 30); 
                        this.mesh.position.lerp(targetPos, delta * 2); 
                        this.mesh.lookAt(targetPos); 
                        if (this.timer > 10 && Math.random() < 0.05 && gameMode !== 2) { 
                            if (Math.random() < 0.5) { this.phase = 'swoop'; } else { this.phase = 'perch'; }
                            this.timer = 0; 
                        } 
                    }
                    else if (this.phase === 'swoop') { 
                        const targetPos = camera.position.clone(); targetPos.y += 2; 
                        this.mesh.position.lerp(targetPos, delta * 3); 
                        this.mesh.lookAt(targetPos); 
                        if (this.mesh.position.distanceTo(camera.position) < 8) { 
                            if (playerInvulnTimer <= 0 && gameMode === 1) { takeDamage(6); velocity.y = 15; } 
                            this.phase = 'circle'; this.timer = 0; 
                        } 
                        if (this.timer > 5) { this.phase = 'circle'; this.timer = 0; } 
                    }
                    else if (this.phase === 'perch') {
                        const targetPos = new THREE.Vector3(0, 15, 0);
                        this.mesh.position.lerp(targetPos, delta * 2);
                        this.mesh.lookAt(new THREE.Vector3(camera.position.x, 15, camera.position.z));
                        if (this.timer > 20) { this.phase = 'circle'; this.timer = 0; }
                    }

                    return false;
                }
            });
        }

        var spawnXPOrb = function(x, y, z, value) {
            const xpMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshBasicMaterial({ color: 0x55ff55, wireframe: true }));
            xpMesh.position.set(x, y, z);
            scene.add(xpMesh);
            entities.push({
                type: 'xp', mesh: xpMesh, xpValue: value, velocity: new THREE.Vector3((Math.random()-0.5)*4, 5+Math.random()*3, (Math.random()-0.5)*4), life: 300,
                update: function(delta, time) {
                    this.life -= delta; if (this.life <= 0) return true;
                    this.mesh.rotation.y += delta * 5;
                    const dist = this.mesh.position.distanceTo(camera.position);
                    if (dist < 1.5) {
                        currentXP += this.xpValue;
                        if (currentXP >= (currentLevel + 1) * 100) { currentXP -= (currentLevel + 1) * 100; currentLevel++; }
                        updateStatusUI(); return true;
                    }
                    if (dist < 6.0) {
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position).normalize();
                        this.velocity.lerp(dir.multiplyScalar(12), delta * 4);
                    } else {
                        this.velocity.y -= 15 * delta;
                        this.velocity.x *= 0.98; this.velocity.z *= 0.98;
                    }
                    const step = this.velocity.clone().multiplyScalar(delta);
                    const nextPos = this.mesh.position.clone().add(step);
                    if (checkCollisionGeneric(nextPos.x, nextPos.y-0.1, nextPos.z, 0.1, 0.1)) {
                        this.velocity.y = 0; this.velocity.x *= 0.8; this.velocity.z *= 0.8;
                    } else { this.mesh.position.copy(nextPos); }
                    return false;
                }
            });
        };
        window.spawnXPOrb = spawnXPOrb;

        // --- 新增：3D 掉落物系统 ---
        function spawnDroppedItem(x, y, z, type, count = 1, velocity = null) {
            if (!type || type === 'null') return;
            
            // 规范化方向和拐角方块为基础物品类型，避免掉落隐藏/临时方块
            if (type.includes('oak_stairs')) type = 'oak_stairs';
            else if (type.includes('stone_stairs')) type = 'stone_stairs';
            else if (type.includes('cobblestone_stairs')) type = 'cobblestone_stairs';
            else if (type.includes('oak_fence_gate')) type = 'oak_fence_gate';
            else if (type.endsWith('_north') || type.endsWith('_south') || type.endsWith('_east') || type.endsWith('_west')) {
                if (type.endsWith('_north') || type.endsWith('_south')) type = type.slice(0, -6);
                else type = type.slice(0, -5);
            }
            
            // 创建掉落物模型：方块用 0.3 的小方块，普通物品用薄片
            let geo;
            const isBlock = ITEMS[type] && ITEMS[type].type === 'block';
            if (isBlock) {
                geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            } else {
                geo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
            }
            
            const mat = materials[type] || new THREE.MeshLambertMaterial({ color: 0xffffff });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            scene.add(mesh);

            // 初始随机散开速度
            const vel = velocity || new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                4 + Math.random() * 2,
                (Math.random() - 0.5) * 3
            );

            entities.push({
                type: 'dropped_item',
                itemType: type,
                count: count,
                mesh: mesh,
                velocity: vel,
                life: 300, // 5分钟后消失
                pickupDelay: 0.8, // 刚丢出时不能立刻捡起
                update: function(delta, time) {
                    this.life -= delta;
                    if (this.pickupDelay > 0) this.pickupDelay -= delta;
                    if (this.life <= 0) return true;

                    // 旋转和悬浮动画
                    this.mesh.rotation.y += delta * 2;
                    this.mesh.position.y += Math.sin(time * 3) * 0.002;

                    const dist = this.mesh.position.distanceTo(camera.position);
                    
                    // 靠近捡起逻辑
                    if (dist < 1.5 && this.pickupDelay <= 0) {
                        addBlockToInventory(this.itemType, this.count);
                        if (window.awardAchievement && this.itemType === 'diamond') window.awardAchievement('diamonds');
                        renderInventoryUI();
                        // 播放一个简单的粒子效果或提示（可选）
                        return true;
                    }

                    // 吸引逻辑：距离小于 4 时飞向玩家
                    if (dist < 4.0 && this.pickupDelay <= 0) {
                        const dir = new THREE.Vector3().subVectors(camera.position, this.mesh.position).normalize();
                        this.velocity.lerp(dir.multiplyScalar(10), delta * 5);
                    } else {
                        // 重力
                        this.velocity.y -= 15 * delta;
                        this.velocity.x *= 0.95;
                        this.velocity.z *= 0.95;
                    }

                    const step = this.velocity.clone().multiplyScalar(delta);
                    const nextPos = this.mesh.position.clone().add(step);

                    // 简单的地面碰撞
                    if (checkCollisionGeneric(nextPos.x, nextPos.y - 0.15, nextPos.z, 0.15, 0.1)) {
                        this.velocity.y = 0;
                        this.velocity.x *= 0.7;
                        this.velocity.z *= 0.7;
                    } else {
                        this.mesh.position.copy(nextPos);
                    }
                    return false;
                }
            });
        }
        window.spawnDroppedItem = spawnDroppedItem;

        let zombieSpawnTimer = 0; let endermanSpawnTimer = 0; let blazeSpawnTimer = 0; let pigSpawnTimer = 0;
        
        // ==========================================
