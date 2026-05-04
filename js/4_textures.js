        // ==========================================
        const itemPixels = {};

        const textureLoader = new THREE.TextureLoader();
        const destroyStages = [];
        for (let i = 0; i <= 9; i++) {
            const t = textureLoader.load('textures/destroy_stage_' + i + '.png');
            t.magFilter = THREE.NearestFilter;
            destroyStages.push(new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.1, polygonOffset: true, polygonOffsetFactor: -1 }));
        }
        function createPixelTexture(type) {
            const path = 'textures/' + type + '.png';
            const texture = textureLoader.load(path, (tex) => {
                const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(tex.image, 0, 0, 16, 16);
                
                // Populate itemPixels for 3D hand items
                const imgData = ctx.getImageData(0, 0, 16, 16);
                itemPixels[type] = new Uint8ClampedArray(imgData.data);
                
                // Tint icon if needed
                const tintTypes = { grass: 0x77ab43, grass_top: 0x77ab43, tall_grass: 0x77ab43, leaves: 0x48b518, water: 0x3f76e4 };
                if (tintTypes[type]) {
                    ctx.globalCompositeOperation = 'multiply';
                    const c = tintTypes[type];
                    ctx.fillStyle = `rgb(${(c>>16)&255}, ${(c>>8)&255}, ${c&255})`;
                    ctx.fillRect(0, 0, 16, 16);
                    ctx.globalCompositeOperation = 'destination-atop';
                    ctx.drawImage(tex.image, 0, 0, 16, 16);
                    icons[type] = canvas.toDataURL();
                }

                if (typeof updateHeldItem3D === 'function') updateHeldItem3D();
                if (typeof renderInventoryUI === 'function') renderInventoryUI();
            });
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.uiIcon = path;
            return texture;
        }

        const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Cross shape for grass
        const crossGeometry = new THREE.BufferGeometry();
        const crossVertices = new Float32Array([
            -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5, -0.5, // Plane 1
            -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5  // Plane 2
        ]);
        const crossIndices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
        const crossUvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]);
        crossGeometry.setAttribute('position', new THREE.BufferAttribute(crossVertices, 3));
        crossGeometry.setAttribute('uv', new THREE.BufferAttribute(crossUvs, 2));
        crossGeometry.setIndex(crossIndices);
        crossGeometry.computeVertexNormals();

        // Thin rod for end rods
        const rodGeometry = new THREE.BoxGeometry(0.25, 1, 0.25);

        const typeGeometries = {
            tall_grass: crossGeometry,
            end_rod: rodGeometry,
            torch: new THREE.BoxGeometry(0.125, 0.625, 0.125)
        };
        const materials = {
            grass: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_top'), color: 0x77ab43 }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('dirt') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side') })
            ],
            log: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('log_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('log_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('log_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('log_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('log_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('log_side') })
            ],
            crafting_table: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('crafting_table_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('crafting_table_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('crafting_table_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('crafting_table_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('crafting_table_side') })
            ],
            leaves: new THREE.MeshLambertMaterial({ map: createPixelTexture('leaves'), transparent: true, alphaTest: 0.1, color: 0x48b518 }),
            tall_grass: new THREE.MeshLambertMaterial({ map: createPixelTexture('tall_grass'), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, color: 0x77ab43 }),
            nether_portal: new THREE.MeshLambertMaterial({ map: createPixelTexture('nether_portal'), transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
            end_rod: new THREE.MeshLambertMaterial({ map: createPixelTexture('end_rod'), transparent: true, alphaTest: 0.1 }),
            water: new THREE.MeshLambertMaterial({ map: createPixelTexture('water'), transparent: true, opacity: 0.6, depthWrite: false, color: 0x3f76e4 }),
            lava: new THREE.MeshLambertMaterial({ map: createPixelTexture('lava'), transparent: true, opacity: 0.9 }),
            end_portal_frame_empty: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_empty') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_stone') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') })
            ],
            end_portal_frame_filled: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_filled') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_stone') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('end_portal_frame_side') })
            ],
            end_portal: new THREE.MeshBasicMaterial({ color: 0x0a0515, transparent: true, opacity: 0.9 }),
            return_portal: new THREE.MeshBasicMaterial({ color: 0x050505 }),
            bed: [new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xffffff }), new THREE.MeshLambertMaterial({ color: 0x884400 }), new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xff0000 })],
            bed_head: [new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xffffff }), new THREE.MeshLambertMaterial({ color: 0x884400 }), new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xff0000 })],
            bed_foot: [new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0x884400 }), new THREE.MeshLambertMaterial({ color: 0xff0000 }), new THREE.MeshLambertMaterial({ color: 0xff0000 })],
            torch: new THREE.MeshLambertMaterial({ map: createPixelTexture('torch'), transparent: true, alphaTest: 0.1, emissive: 0xffaa00, emissiveIntensity: 0.8, side: THREE.DoubleSide }),
            furnace: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_front') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_side') })
            ],
            furnace_on: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_front_on'), emissive: 0xffaa00, emissiveIntensity: 0.5 }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('furnace_side') })
            ]
        };
        ['dirt', 'stone', 'bedrock', 'sand', 'planks', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'obsidian', 'netherrack', 'magma', 'end_stone', 'stone_brick'].forEach(k => { if (!materials[k]) materials[k] = new THREE.MeshLambertMaterial({ map: createPixelTexture(k) }); });
        
        const icons = {}; 
        for (let key of allItemTypes) { 
            if (materials[key]) {
                if (Array.isArray(materials[key])) {
                    if (key === 'furnace') icons[key] = 'textures/furnace_front.png';
                    else icons[key] = materials[key][0].map ? materials[key][0].map.uiIcon : 'textures/' + key + '.png';
                } else {
                    icons[key] = materials[key].map ? materials[key].map.uiIcon : 'textures/' + key + '.png';
                }
            } else {
                icons[key] = 'textures/' + key + '.png';
            }
            // Ensure icons are pre-loaded for 3D hand view
            if (!itemPixels[key]) createPixelTexture(key);
        }

        // ==========================================