        // ==========================================
        // 独立环境检测（双重保险）
        const isLocalMode = (window.location.protocol === 'file:');
        const CACHE_V = isLocalMode ? "" : ("?v=" + Date.now());
        const itemPixels = {};
        const textureLoader = new THREE.TextureLoader();
        if (isLocalMode) textureLoader.setCrossOrigin('anonymous');
        
        const destroyStages = [];
        for (let i = 0; i <= 9; i++) {
            const fileName = 'destroy_stage_' + i;
            const path = 'textures/' + fileName + '.png' + CACHE_V;
            const source = (window.TEXTURE_DATA && window.TEXTURE_DATA[fileName]) ? window.TEXTURE_DATA[fileName] : path;
            
            const dImg = new Image();
            const dt = new THREE.Texture(dImg);
            dImg.onload = () => { dt.needsUpdate = true; };
            dImg.src = source;
            dt.magFilter = THREE.NearestFilter;
            destroyStages.push(new THREE.MeshBasicMaterial({ map: dt, transparent: true, alphaTest: 0.1, polygonOffset: true, polygonOffsetFactor: -1 }));
        }

        // ==================== 核心光影黑科技：程序化 3D 浮雕法线贴图生成器 ====================
        window.generateProceduralNormalMap = function(img, strength = 1.0) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width || 16;
                canvas.height = img.height || 16;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                return window.generateProceduralNormalMapFromCanvas(canvas, strength);
            } catch (e) {
                console.warn("Procedural normal map failed", e);
                return null;
            }
        };

        window.generateProceduralNormalMapFromCanvas = function(canvas, strength = 1.0) {
            try {
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;
                const width = canvas.width;
                const height = canvas.height;
                const normalData = new Uint8ClampedArray(data.length);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4;
                        const getVal = (px, py) => {
                            const nx = (px + width) % width;
                            const ny = (py + height) % height;
                            const nIdx = (ny * width + nx) * 4;
                            return (data[nIdx] * 0.299 + data[nIdx+1] * 0.587 + data[nIdx+2] * 0.114) / 255.0;
                        };

                        // 索贝尔算子 (Sobel Operator)
                        const dx = 
                            -1 * getVal(x-1, y-1) + 1 * getVal(x+1, y-1) +
                            -2 * getVal(x-1, y)   + 2 * getVal(x+1, y) +
                            -1 * getVal(x-1, y+1) + 1 * getVal(x+1, y+1);

                        const dy = 
                            -1 * getVal(x-1, y-1) - 2 * getVal(x, y-1) - 1 * getVal(x+1, y-1) +
                            1 * getVal(x-1, y+1) + 2 * getVal(x, y+1) + 1 * getVal(x+1, y+1);

                        let nx = -dx * strength;
                        let ny = -dy * strength;
                        let nz = 1.0;

                        const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
                        nx /= len; ny /= len; nz /= len;

                        // 映射法线向量分量到 0-255 RGB 像素空间
                        normalData[idx]   = Math.floor((nx * 0.5 + 0.5) * 255);
                        normalData[idx+1] = Math.floor((ny * 0.5 + 0.5) * 255);
                        normalData[idx+2] = Math.floor((nz * 0.5 + 0.5) * 255);
                        normalData[idx+3] = 255;
                    }
                }

                const normalCanvas = document.createElement('canvas');
                normalCanvas.width = width;
                normalCanvas.height = height;
                const normalCtx = normalCanvas.getContext('2d');
                const normalImgData = normalCtx.createImageData(width, height);
                normalImgData.data.set(normalData);
                normalCtx.putImageData(normalImgData, 0, 0);

                const normalTexture = new THREE.CanvasTexture(normalCanvas);
                normalTexture.magFilter = THREE.NearestFilter;
                normalTexture.minFilter = THREE.NearestFilter;
                normalTexture.wrapS = THREE.RepeatWrapping;
                normalTexture.wrapT = THREE.RepeatWrapping;
                return normalTexture;
            } catch (e) {
                console.warn("Canvas normal map processing failed", e);
                return null;
            }
        };

        window.generateWaterNormalMap = function() {
            try {
                const size = 32;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const imgData = ctx.createImageData(size, size);
                const data = imgData.data;

                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const idx = (y * size + x) * 4;
                        // 生成波光粼粼的正弦波起伏高程
                        const val1 = Math.sin(x * 0.4) * Math.cos(y * 0.4);
                        const val2 = Math.sin(x * 0.2 + y * 0.2) * 0.5;
                        const h = (val1 + val2 + 1.5) / 3.0;

                        const gray = Math.floor(h * 255);
                        data[idx] = gray;
                        data[idx+1] = gray;
                        data[idx+2] = gray;
                        data[idx+3] = 255;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                return window.generateProceduralNormalMapFromCanvas(canvas, 2.0); // 调高强度以凸显水面动态反射
            } catch (e) {
                console.warn("Water normal map failed", e);
                return null;
            }
        };
        // ======================================================================================

        function createPixelTexture(type) {
            const fileName = (type === 'door') ? 'oak_door' : type;
            const path = 'textures/' + fileName + '.png' + CACHE_V;
            
            // 优先使用 Base64 嵌入数据，以支持直接打开 index.html
            const source = (window.TEXTURE_DATA && window.TEXTURE_DATA[fileName]) ? window.TEXTURE_DATA[fileName] : path;
            
            const img = new Image();
            const texture = new THREE.Texture(img);
            texture.blockType = type; // 绑定方块类型以在后面执行细分 PBR 个性化修饰

            img.onload = () => {
                // 针对新版 Three.js 的深度更新
                if (texture.source) texture.source.needsUpdate = true;
                try {
                    const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 16, 16);
                    
                    // Populate itemPixels for 3D hand items
                    const imgData = ctx.getImageData(0, 0, 16, 16);
                    itemPixels[type] = new Uint8ClampedArray(imgData.data);

                    // 程序化生成该贴图对应的微表面 3D 法线贴图
                    if (window.shadowsEnabled) {
                        try {
                            const normalTex = window.generateProceduralNormalMap(img, 1.2);
                            if (normalTex) {
                                texture.normalMap = normalTex;
                                
                                // 全局遍历材质，把生成的法线贴图绑定到引用本材质的物体上
                                for (let key in materials) {
                                    const matObj = materials[key];
                                    if (Array.isArray(matObj)) {
                                        matObj.forEach(m => {
                                            if (m && m.map === texture) {
                                                m.normalMap = normalTex;
                                                m.normalScale = new THREE.Vector2(1.2, 1.2);
                                                m.needsUpdate = true;
                                            }
                                        });
                                    } else if (matObj) {
                                        if (matObj.map === texture) {
                                            matObj.normalMap = normalTex;
                                            matObj.normalScale = new THREE.Vector2(1.2, 1.2);
                                            matObj.needsUpdate = true;
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn("Could not generate normal map for", type, err);
                        }
                    }
                    
                    // 染色逻辑：草(顶面和侧面)、叶子、水
                    const tintTypes = { 
                        grass: 0x77ab43, 
                        grass_top: 0x77ab43, 
                        grass_side: 0x77ab43, // 新增：修复侧面黑白Bug
                        tall_grass: 0x77ab43, 
                        leaves: 0x48b518, 
                        water: 0x3f76e4,
                        swamp_grass: 0x4c5e31,
                        swamp_leaves: 0x3e4d28,
                        lily_pad: 0x1c4d06
                    };
                    const tinted = ['grass', 'leaves', 'grass_side', 'tall_grass', 'water', 'water_top', 'water_bottom', 'water_north', 'water_south', 'water_east', 'water_west', 'swamp_grass', 'swamp_leaves', 'lily_pad'];
                    if (tintTypes[type]) {
                        // 应用染色到像素数据（用于手持3D模型）
                        const c = tintTypes[type];
                        const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
                        for (let i = 0; i < itemPixels[type].length; i += 4) {
                            itemPixels[type][i] = (itemPixels[type][i] * r) / 255;
                            itemPixels[type][i+1] = (itemPixels[type][i+1] * g) / 255;
                            itemPixels[type][i+2] = (itemPixels[type][i+2] * b) / 255;
                        }
                        
                        // 应用染色到 Canvas（用于 UI 图标）
                        ctx.clearRect(0, 0, 16, 16);
                        ctx.drawImage(img, 0, 0, 16, 16);
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                        ctx.fillRect(0, 0, 16, 16);
                        ctx.globalCompositeOperation = 'destination-atop';
                        ctx.drawImage(img, 0, 0, 16, 16);
                        icons[type] = canvas.toDataURL();
                    } else {
                        icons[type] = canvas.toDataURL();
                    }
                } catch (e) {
                    console.warn("Canvas texture processing skipped (CORS/Security):", type);
                    if (!icons[type]) icons[type] = path;
                }
                
                texture.needsUpdate = true;
                if (typeof updateHeldItem3D === 'function') updateHeldItem3D();
                if (typeof renderInventoryUI === 'function') renderInventoryUI();
            };
            img.src = source;

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
            torch: new THREE.BoxGeometry(0.125, 0.625, 0.125),
            door_top: (function(){ const g = new THREE.BoxGeometry(1, 1, 0.1); g.translate(0, 0, -0.45); return g; })(),
            door_bottom: (function(){ const g = new THREE.BoxGeometry(1, 1, 0.1); g.translate(0, 0, -0.45); return g; })(),
            door_top_open: (function(){ const g = new THREE.BoxGeometry(0.1, 1, 1); g.translate(-0.45, 0, 0); return g; })(),
            door_bottom_open: (function(){ const g = new THREE.BoxGeometry(0.1, 1, 1); g.translate(-0.45, 0, 0); return g; })(),
            water_low: new THREE.BoxGeometry(1, 1, 1),
            water_high: new THREE.BoxGeometry(1.002, 1.002, 1.002),
            // 修正：确保所有水面法线全部朝向外部
            water_top: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.5, 0),
            water_bottom: new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2).translate(0, -0.5, 0),
            water_north: new THREE.PlaneGeometry(1, 1).rotateY(Math.PI).translate(0, 0, -0.5), // 修正旋转
            water_south: new THREE.PlaneGeometry(1, 1).translate(0, 0, 0.5),                   // 修正旋转
            water_east: new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0.5, 0, 0),
            water_west: new THREE.PlaneGeometry(1, 1).rotateY(-Math.PI / 2).translate(-0.5, 0, 0)
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
            cactus: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('cactus_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('cactus_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('cactus_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('cactus_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('cactus_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('cactus_side') })
            ],
            snow: new THREE.MeshLambertMaterial({ map: createPixelTexture('snow') }),
            ice: new THREE.MeshLambertMaterial({ map: createPixelTexture('ice'), transparent: true, opacity: 0.8 }),
            lily_pad: new THREE.MeshLambertMaterial({ map: createPixelTexture('lily_pad'), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }),
            swamp_grass: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side'), color: 0x4c5e31 }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side'), color: 0x4c5e31 }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_top'), color: 0x4c5e31 }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('dirt') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side'), color: 0x4c5e31 }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side'), color: 0x4c5e31 })
            ],
            swamp_leaves: new THREE.MeshLambertMaterial({ map: createPixelTexture('leaves'), transparent: true, alphaTest: 0.1, color: 0x3e4d28 }),
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
            ],
            chest: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('chest_front') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('chest_front') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('chest_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('chest_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('chest_front') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('chest_front') })
            ],
            door_top: (function(){
                const mat = new THREE.MeshLambertMaterial({ map: createPixelTexture('oak_door_top'), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
                const trans = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
                return [mat, mat, trans, trans, mat, mat];
            })(),
            door_bottom: (function(){
                const mat = new THREE.MeshLambertMaterial({ map: createPixelTexture('oak_door_bottom'), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
                const trans = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
                return [mat, mat, trans, trans, mat, mat];
            })(),
            door_top_open: (function(){
                const mat = new THREE.MeshLambertMaterial({ map: createPixelTexture('oak_door_top'), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
                const trans = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
                return [mat, mat, trans, trans, mat, mat];
            })(),
            door_bottom_open: (function(){
                const mat = new THREE.MeshLambertMaterial({ map: createPixelTexture('oak_door_bottom'), transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
                const trans = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
                return [mat, mat, trans, trans, mat, mat];
            })()
        };
        // 确保所有物品（包括非方块）都有对应的材质，用于掉落物和 3D 手持显示
        allItemTypes.forEach(k => { 
            if (!materials[k]) {
                materials[k] = new THREE.MeshLambertMaterial({ map: createPixelTexture(k), transparent: true, alphaTest: 0.1 });
            }
        });
        
        const icons = {}; 
        for (let key of allItemTypes) { 
            if (materials[key]) {
                if (Array.isArray(materials[key])) {
                    if (key === 'furnace') icons[key] = 'textures/furnace_front.png';
                    else if (key === 'chest') icons[key] = 'textures/chest_front.png';
                    else icons[key] = materials[key][0].map ? materials[key][0].map.uiIcon : 'textures/' + key + '.png';
                } else {
                    icons[key] = materials[key].map ? materials[key].map.uiIcon : 'textures/' + key + '.png';
                }
            } else {
                if (key === 'door') icons[key] = 'textures/oak_door.png';
                else icons[key] = 'textures/' + key + '.png';
            }
            // Ensure icons are pre-loaded for 3D hand view
            if (!itemPixels[key]) createPixelTexture(key);
        }

        // ==========================================