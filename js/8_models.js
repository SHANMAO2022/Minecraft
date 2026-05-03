        // ==========================================
        function buildPlayerMesh(skinDataURL, playerName) {
            const group = new THREE.Group();
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = skinDataURL || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAABlBMVEUAAAAAAAClZ7nPAAAAAXRSTlMAQObYZgAAACdJREFUeNpjYBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAVDAgAEcAABXjOSGwAAAABJRU5ErkJggg==';
            img.onload = () => {
                function getTex(x, y, tw, th) {
                    const c = document.createElement('canvas'); c.width = tw; c.height = th;
                    const ctx = c.getContext('2d'); ctx.drawImage(img, x, y, tw, th, 0, 0, tw, th);
                    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
                    return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
                }
                function getBoxMats(ox, oy, w, h, d) {
                    return [getTex(ox + d + w, oy + d, d, h), getTex(ox, oy + d, d, h), getTex(ox + d, oy, w, d), getTex(ox + d + w, oy, w, d), getTex(ox + d, oy + d, w, h), getTex(ox + d + w + d, oy + d, w, h)];
                }
                function buildPart(ox, oy, w, h, d, inflate = 0) {
                    const geo = new THREE.BoxGeometry(w / 16 + inflate, h / 16 + inflate, d / 16 + inflate);
                    return new THREE.Mesh(geo, getBoxMats(ox, oy, w, h, d));
                }
                const head = buildPart(0, 0, 8, 8, 8); const hat = buildPart(32, 0, 8, 8, 8, 0.05); head.add(hat); head.position.y = 24 / 16; group.add(head);
                const body = buildPart(16, 16, 8, 12, 4); const jacket = buildPart(16, 32, 8, 12, 4, 0.05); body.add(jacket); body.position.y = 10 / 16; group.add(body);
                const armR = buildPart(40, 16, 4, 12, 4); const sleeveR = buildPart(40, 32, 4, 12, 4, 0.05); armR.add(sleeveR); armR.geometry.translate(0, -4 / 16, 0); sleeveR.geometry.translate(0, -4 / 16, 0); armR.position.set(-6 / 16, 14 / 16, 0); group.add(armR);
                const armL = buildPart(32, 48, 4, 12, 4); const sleeveL = buildPart(48, 48, 4, 12, 4, 0.05); armL.add(sleeveL); armL.geometry.translate(0, -4 / 16, 0); sleeveL.geometry.translate(0, -4 / 16, 0); armL.position.set(6 / 16, 14 / 16, 0); group.add(armL);
                const legR = buildPart(0, 16, 4, 12, 4); const pantsR = buildPart(0, 32, 4, 12, 4, 0.05); legR.add(pantsR); legR.geometry.translate(0, -6 / 16, 0); pantsR.geometry.translate(0, -6 / 16, 0); legR.position.set(-2 / 16, 6 / 16, 0); group.add(legR);
                const legL = buildPart(16, 48, 4, 12, 4); const pantsL = buildPart(0, 48, 4, 12, 4, 0.05); legL.add(pantsL); legL.geometry.translate(0, -6 / 16, 0); pantsL.geometry.translate(0, -6 / 16, 0); legL.position.set(2 / 16, 6 / 16, 0); group.add(legL);
                group.arms = [armL, armR]; group.legs = [legL, legR];
            };
            const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, 256, 64);
            ctx.fillStyle = 'white'; ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.fillText(playerName || 'Player', 128, 40);
            const nameTex = new THREE.CanvasTexture(canvas);
            const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex }));
            nameSprite.position.y = 2.2; nameSprite.scale.set(1.5, 0.375, 1);
            group.add(nameSprite); group.nameSprite = nameSprite;
            group.arms = []; group.legs = [];
            return group;
        }

        // ==========================================