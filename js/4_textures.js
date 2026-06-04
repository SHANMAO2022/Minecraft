        // ==========================================
        // 独立环境检测（双重保险）
        const isLocalMode = (window.location.protocol === 'file:');
        const CACHE_V = isLocalMode ? "" : ("?v=" + Date.now());
        const itemPixels = {};
        const textureIconCanvases = {};
        const textureLoader = new THREE.TextureLoader();
        if (isLocalMode) textureLoader.setCrossOrigin('anonymous');

        function createMissingTextureDataUrl(label = 'missing') {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const checker = ((x >> 2) + (y >> 2)) % 2;
                    ctx.fillStyle = checker ? '#111111' : '#d119d1';
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(1, 1, 14, 1);
            ctx.fillRect(1, 14, 14, 1);
            ctx.fillRect(1, 1, 1, 14);
            ctx.fillRect(14, 1, 1, 14);
            return canvas.toDataURL();
        }
        window.MISSING_TEXTURE_DATA_URL = window.MISSING_TEXTURE_DATA_URL || createMissingTextureDataUrl();

        function getTextureSources(fileName, fallbackName = fileName) {
            const rawPath = 'textures/' + fileName + '.png';
            const sources = [];
            const pushSource = (src) => {
                if (src && !sources.includes(src)) sources.push(src);
            };
            if (window.TEXTURE_DATA && window.TEXTURE_DATA[fileName]) pushSource(window.TEXTURE_DATA[fileName]);
            if (window.TEXTURE_DATA && window.TEXTURE_DATA[fallbackName]) pushSource(window.TEXTURE_DATA[fallbackName]);
            pushSource(rawPath + CACHE_V);
            pushSource(rawPath);
            pushSource(window.MISSING_TEXTURE_DATA_URL);
            return sources;
        }
        window.getTextureSources = getTextureSources;
        window.getTextureSource = function(fileName, fallbackName = fileName) {
            return getTextureSources(fileName, fallbackName)[0];
        };
        
        const destroyStages = [];
        for (let i = 0; i <= 9; i++) {
            const fileName = 'destroy_stage_' + i;
            const path = 'textures/' + fileName + '.png' + CACHE_V;
            const source = (window.getTextureSource ? window.getTextureSource(fileName) : ((window.TEXTURE_DATA && window.TEXTURE_DATA[fileName]) ? window.TEXTURE_DATA[fileName] : path));
            
            const dImg = new Image();
            const dt = new THREE.Texture(dImg);
            dImg.onload = () => { dt.needsUpdate = true; };
            dImg.onerror = () => { dImg.src = window.MISSING_TEXTURE_DATA_URL; };
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

        function generateIconFromPixels(parentImg, shape) {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            
            if (shape === 'slab') {
                ctx.drawImage(parentImg, 0, 8, 16, 8, 0, 8, 16, 8);
            } else if (shape === 'stairs') {
                ctx.drawImage(parentImg, 0, 8, 16, 8, 0, 8, 16, 8);
                ctx.drawImage(parentImg, 8, 0, 8, 8, 8, 0, 8, 8);
            } else if (shape === 'fence') {
                ctx.drawImage(parentImg, 6, 0, 4, 16, 6, 0, 4, 16);
                ctx.drawImage(parentImg, 0, 3, 16, 2, 0, 3, 16, 2);
                ctx.drawImage(parentImg, 0, 11, 16, 2, 0, 11, 16, 2);
            } else if (shape === 'fence_gate') {
                ctx.drawImage(parentImg, 0, 0, 3, 16, 0, 0, 3, 16);
                ctx.drawImage(parentImg, 13, 0, 3, 16, 13, 0, 3, 16);
                ctx.drawImage(parentImg, 3, 4, 10, 2, 3, 4, 10, 2);
                ctx.drawImage(parentImg, 3, 10, 10, 2, 3, 10, 10, 2);
                ctx.drawImage(parentImg, 7, 4, 2, 8, 7, 4, 2, 8);
            } else if (shape === 'fence_gate_open') {
                ctx.drawImage(parentImg, 0, 0, 3, 16, 0, 0, 3, 16);
                ctx.drawImage(parentImg, 13, 0, 3, 16, 13, 0, 3, 16);
                ctx.drawImage(parentImg, 3, 4, 2, 8, 1, 4, 2, 8);
                ctx.drawImage(parentImg, 11, 4, 2, 8, 13, 4, 2, 8);
            } else {
                ctx.drawImage(parentImg, 0, 0, 16, 16);
            }
            return canvas.toDataURL();
        }

        function updateGrassBlockIcon() {
            const top = textureIconCanvases.grass_top;
            const side = textureIconCanvases.grass_side;
            if (!top || !side) return;
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(side, 0, 0, 16, 16);
            icons.grass = canvas.toDataURL();
        }

        function getTextureFileName(type) {
            const mapping = {
                door: 'oak_door',
                door_top: 'oak_door_top',
                door_bottom: 'oak_door_bottom',
                door_top_open: 'oak_door_top',
                door_bottom_open: 'oak_door_bottom',
                oak_stairs: 'planks',
                oak_stairs_inner_left: 'planks',
                oak_stairs_inner_right: 'planks',
                oak_slab: 'planks',
                oak_fence: 'planks',
                oak_fence_gate: 'planks',
                oak_fence_gate_open: 'planks',
                stone_stairs: 'stone',
                stone_stairs_inner_left: 'stone',
                stone_stairs_inner_right: 'stone',
                stone_slab: 'stone',
                cobblestone_stairs: 'cobblestone',
                cobblestone_stairs_inner_left: 'cobblestone',
                cobblestone_stairs_inner_right: 'cobblestone',
                cobblestone_slab: 'cobblestone',
                bed_head: 'bed',
                bed_foot: 'bed',
                bed: 'bed',
                composter: 'composter_side'
            };
            return mapping[type] || type;
        }

        function createPixelTexture(type) {
            const fileName = getTextureFileName(type);
            const rawPath = 'textures/' + fileName + '.png';
            const path = rawPath + CACHE_V;
            const sources = window.getTextureSources ? window.getTextureSources(fileName, type) : [path, rawPath];
            
            const img = new Image();
            const texture = new THREE.Texture(img);
            texture.blockType = type; // 绑定方块类型以在后面执行细分 PBR 个性化修饰
            let sourceIndex = 0;

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
                        tall_grass: 0x77ab43, 
                        water: 0x3f76e4,
                        lily_pad: 0x1c4d06
                    };
                    const tinted = ['tall_grass', 'water', 'water_top', 'water_bottom', 'water_north', 'water_south', 'water_east', 'water_west', 'lily_pad'];
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
                        const tintedIcon = canvas.toDataURL();
                        icons[type] = tintedIcon;
                        texture.uiIcon = tintedIcon;
                    } else {
                        if (!icons[type] || !icons[type].startsWith('data:')) {
                            icons[type] = canvas.toDataURL();
                        }
                    }
                    textureIconCanvases[type] = canvas;
                    if (type === 'grass' || type === 'grass_side' || type === 'grass_top') updateGrassBlockIcon();

                    // Procedural sub-item icons
                    if (type === 'planks') {
                        const slabIcon = generateIconFromPixels(img, 'slab');
                        const stairIcon = generateIconFromPixels(img, 'stairs');
                        icons['oak_slab'] = slabIcon;
                        icons['oak_stairs'] = stairIcon;
                        icons['oak_stairs_inner_left'] = stairIcon;
                        icons['oak_stairs_inner_right'] = stairIcon;
                        icons['oak_fence'] = generateIconFromPixels(img, 'fence');
                        icons['oak_fence_gate'] = generateIconFromPixels(img, 'fence_gate');
                        icons['oak_fence_gate_open'] = generateIconFromPixels(img, 'fence_gate_open');
                    } else if (type === 'stone') {
                        const slabIcon = generateIconFromPixels(img, 'slab');
                        const stairIcon = generateIconFromPixels(img, 'stairs');
                        icons['stone_slab'] = slabIcon;
                        icons['stone_stairs'] = stairIcon;
                        icons['stone_stairs_inner_left'] = stairIcon;
                        icons['stone_stairs_inner_right'] = stairIcon;
                    } else if (type === 'cobblestone') {
                        const slabIcon = generateIconFromPixels(img, 'slab');
                        const stairIcon = generateIconFromPixels(img, 'stairs');
                        icons['cobblestone_slab'] = slabIcon;
                        icons['cobblestone_stairs'] = stairIcon;
                        icons['cobblestone_stairs_inner_left'] = stairIcon;
                        icons['cobblestone_stairs_inner_right'] = stairIcon;
                    }
                } catch (e) {
                    console.warn("Canvas texture processing skipped (CORS/Security):", type);
                    if (!icons[type]) icons[type] = path;
                }
                
                texture.needsUpdate = true;
                if (typeof updateHeldItem3D === 'function') updateHeldItem3D();
                if (typeof renderInventoryUI === 'function') renderInventoryUI();
            };
            img.onerror = () => {
                sourceIndex++;
                if (sourceIndex < sources.length) {
                    texture.uiIcon = sources[sourceIndex];
                    img.src = sources[sourceIndex];
                } else {
                    console.warn("Texture load failed:", type, sources);
                    texture.uiIcon = window.MISSING_TEXTURE_DATA_URL;
                    img.src = window.MISSING_TEXTURE_DATA_URL;
                }
            };
            img.src = sources[0];

            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.uiIcon = sources[0] || path;
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

        function mergeGeometries(geo1, geo2) {
            const merged = new THREE.BufferGeometry();
            const pos1 = geo1.attributes.position.array;
            const pos2 = geo2.attributes.position.array;
            const positions = new Float32Array(pos1.length + pos2.length);
            positions.set(pos1);
            positions.set(pos2, pos1.length);
            merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const uv1 = geo1.attributes.uv.array;
            const uv2 = geo2.attributes.uv.array;
            const uvs = new Float32Array(uv1.length + uv2.length);
            uvs.set(uv1);
            uvs.set(uv2, uv1.length);
            merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            
            const norm1 = geo1.attributes.normal.array;
            const norm2 = geo2.attributes.normal.array;
            const normals = new Float32Array(norm1.length + norm2.length);
            normals.set(norm1);
            normals.set(norm2, norm1.length);
            merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
            
            if (geo1.index && geo2.index) {
                const idx1 = geo1.index.array;
                const idx2 = geo2.index.array;
                const indices = new (idx1.constructor)(idx1.length + idx2.length);
                indices.set(idx1);
                const offset = geo1.attributes.position.count;
                for (let i = 0; i < idx2.length; i++) {
                    indices[idx1.length + i] = idx2[i] + offset;
                }
                merged.setIndex(new THREE.BufferAttribute(indices, 1));
            }
            return merged;
        }

        function createCroppedBoxGeometry(w, h, d, x, y, z) {
            const geo = new THREE.BoxGeometry(w, h, d);
            geo.translate(x, y, z);
            const uvAttr = geo.attributes.uv;
            const posAttr = geo.attributes.position;
            const uvs = uvAttr.array;
            const positions = posAttr.array;
            const normals = geo.attributes.normal.array;
            
            for (let i = 0; i < posAttr.count; i++) {
                const px = positions[i * 3];
                const py = positions[i * 3 + 1];
                const pz = positions[i * 3 + 2];
                const nx = Math.abs(normals[i * 3]);
                const ny = Math.abs(normals[i * 3 + 1]);
                const nz = Math.abs(normals[i * 3 + 2]);
                
                if (nx > 0.5) {
                    uvs[i * 2] = pz + 0.5;
                    uvs[i * 2 + 1] = py + 0.5;
                } else if (ny > 0.5) {
                    uvs[i * 2] = px + 0.5;
                    uvs[i * 2 + 1] = pz + 0.5;
                } else if (nz > 0.5) {
                    uvs[i * 2] = px + 0.5;
                    uvs[i * 2 + 1] = py + 0.5;
                }
            }
            uvAttr.needsUpdate = true;
            return geo;
        }

        const slabGeo = createCroppedBoxGeometry(1, 0.5, 1, 0, -0.25, 0);
        
        const bottomSlab = createCroppedBoxGeometry(1, 0.5, 1, 0, -0.25, 0);
        const qNW = createCroppedBoxGeometry(0.5, 0.5, 0.5, -0.25, 0.25, -0.25);
        const qNE = createCroppedBoxGeometry(0.5, 0.5, 0.5, 0.25, 0.25, -0.25);
        const qSW = createCroppedBoxGeometry(0.5, 0.5, 0.5, -0.25, 0.25, 0.25);
        const qSE = createCroppedBoxGeometry(0.5, 0.5, 0.5, 0.25, 0.25, 0.25);
        
        const stairGeo = mergeGeometries(bottomSlab, mergeGeometries(qSW, qSE));
        const stairGeoInnerLeft = mergeGeometries(bottomSlab, mergeGeometries(mergeGeometries(qSW, qSE), qNW));
        const stairGeoInnerRight = mergeGeometries(bottomSlab, mergeGeometries(mergeGeometries(qSW, qSE), qNE));
        const stairGeoOuterLeft = mergeGeometries(bottomSlab, qSW);
        const stairGeoOuterRight = mergeGeometries(bottomSlab, qSE);
        
        const fencePost = new THREE.BoxGeometry(0.25, 1, 0.25);
        const barX1 = new THREE.BoxGeometry(1, 0.12, 0.12).translate(0, 0.2, 0);
        const barX2 = new THREE.BoxGeometry(1, 0.12, 0.12).translate(0, -0.2, 0);
        const barZ1 = new THREE.BoxGeometry(0.12, 0.12, 1).translate(0, 0.2, 0);
        const barZ2 = new THREE.BoxGeometry(0.12, 0.12, 1).translate(0, -0.2, 0);
        const fenceGeo = mergeGeometries(
            mergeGeometries(mergeGeometries(fencePost, barX1), barX2),
            mergeGeometries(barZ1, barZ2)
        );
        
        const gatePost1 = new THREE.BoxGeometry(0.15, 1, 0.15).translate(-0.4, 0, 0);
        const gatePost2 = new THREE.BoxGeometry(0.15, 1, 0.15).translate(0.4, 0, 0);
        const gateBar1 = new THREE.BoxGeometry(0.65, 0.12, 0.1).translate(0, 0.2, 0);
        const gateBar2 = new THREE.BoxGeometry(0.65, 0.12, 0.1).translate(0, -0.2, 0);
        const gateDiv = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const fenceGateGeo = mergeGeometries(
            mergeGeometries(mergeGeometries(gatePost1, gatePost2), gateBar1),
            mergeGeometries(gateBar2, gateDiv)
        );

        const gateBar1Open = new THREE.BoxGeometry(0.1, 0.12, 0.65).translate(0, 0.2, 0);
        const gateBar2Open = new THREE.BoxGeometry(0.1, 0.12, 0.65).translate(0, -0.2, 0);
        const fenceGateOpenGeo = mergeGeometries(
            mergeGeometries(mergeGeometries(gatePost1, gatePost2), gateBar1Open),
            mergeGeometries(gateBar2Open, gateDiv)
        );

        const bedGeo = new THREE.BoxGeometry(1, 0.56, 1);
        bedGeo.translate(0, -0.22, 0);
        const typeGeometries = {
            tall_grass: crossGeometry,
            end_rod: rodGeometry,
            torch: new THREE.BoxGeometry(0.125, 0.625, 0.125),
            bed: bedGeo,
            bed_head: bedGeo,
            bed_foot: bedGeo,
            door_top: (function(){ const g = new THREE.BoxGeometry(1, 1, 0.1); g.translate(0, 0, -0.45); return g; })(),
            door_bottom: (function(){ const g = new THREE.BoxGeometry(1, 1, 0.1); g.translate(0, 0, -0.45); return g; })(),
            door_top_open: (function(){ const g = new THREE.BoxGeometry(0.1, 1, 1); g.translate(-0.45, 0, 0); return g; })(),
            door_bottom_open: (function(){ const g = new THREE.BoxGeometry(0.1, 1, 1); g.translate(-0.45, 0, 0); return g; })(),
            water_low: new THREE.BoxGeometry(1, 1, 1),
            water_high: new THREE.BoxGeometry(1.002, 1.002, 1.002),
            water_top: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.5, 0),
            water_bottom: new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2).translate(0, -0.5, 0),
            water_north: new THREE.PlaneGeometry(1, 1).rotateY(Math.PI).translate(0, 0, -0.5),
            water_south: new THREE.PlaneGeometry(1, 1).translate(0, 0, 0.5),
            water_east: new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0.5, 0, 0),
            water_west: new THREE.PlaneGeometry(1, 1).rotateY(-Math.PI / 2).translate(-0.5, 0, 0),
            
            // Custom geometries
            oak_slab: slabGeo,
            stone_slab: slabGeo,
            cobblestone_slab: slabGeo,
            oak_stairs: stairGeo,
            oak_stairs_inner_left: stairGeoInnerRight,
            oak_stairs_inner_right: stairGeoInnerLeft,
            stone_stairs: stairGeo,
            stone_stairs_inner_left: stairGeoInnerRight,
            stone_stairs_inner_right: stairGeoInnerLeft,
            cobblestone_stairs: stairGeo,
            cobblestone_stairs_inner_left: stairGeoInnerRight,
            cobblestone_stairs_inner_right: stairGeoInnerLeft,
            oak_fence: fenceGeo,
            oak_fence_gate: fenceGateGeo,
            oak_fence_gate_open: fenceGateOpenGeo
        };
        window.typeGeometries = typeGeometries;
        const oakStairsMat = new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') });
        const stoneStairsMat = new THREE.MeshLambertMaterial({ map: createPixelTexture('stone') });
        const cobblestoneStairsMat = new THREE.MeshLambertMaterial({ map: createPixelTexture('cobblestone') });
        const materials = {
            grass: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('grass_top') }),
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
            leaves: new THREE.MeshLambertMaterial({ map: createPixelTexture('leaves'), transparent: true, alphaTest: 0.1 }),
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
            bed: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_head_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_head_end') })
            ],
            bed_head: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_head_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_head_end') })
            ],
            bed_foot: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_foot_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('bed_foot_end') })
            ],
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
            composter: [
                new THREE.MeshLambertMaterial({ map: createPixelTexture('composter_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('composter_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('composter_top') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('composter_bottom') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('composter_side') }),
                new THREE.MeshLambertMaterial({ map: createPixelTexture('composter_side') })
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
            })(),
            cobblestone: new THREE.MeshLambertMaterial({ map: createPixelTexture('cobblestone') }),
            oak_slab: new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') }),
            stone_slab: new THREE.MeshLambertMaterial({ map: createPixelTexture('stone') }),
            cobblestone_slab: new THREE.MeshLambertMaterial({ map: createPixelTexture('cobblestone') }),
            oak_stairs: oakStairsMat,
            oak_stairs_inner_left: oakStairsMat,
            oak_stairs_inner_right: oakStairsMat,
            stone_stairs: stoneStairsMat,
            stone_stairs_inner_left: stoneStairsMat,
            stone_stairs_inner_right: stoneStairsMat,
            cobblestone_stairs: cobblestoneStairsMat,
            cobblestone_stairs_inner_left: cobblestoneStairsMat,
            cobblestone_stairs_inner_right: cobblestoneStairsMat,
            oak_fence: new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') }),
            oak_fence_gate: new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') }),
            oak_fence_gate_open: new THREE.MeshLambertMaterial({ map: createPixelTexture('planks') })
        };
        // 确保所有物品（包括非方块）都有对应的材质，用于掉落物和 3D 手持显示
        allItemTypes.forEach(k => { 
            if (!materials[k]) {
                materials[k] = new THREE.MeshLambertMaterial({ map: createPixelTexture(k), transparent: true, alphaTest: 0.1 });
            }
        });
        window.updateSpectatorXrayMaterials = function(enabled) {
            if (window._spectatorXrayActive === enabled) return;
            window._spectatorXrayActive = enabled;
            Object.keys(materials).forEach(key => {
                if (key === 'water' || key === 'lava' || key === 'nether_portal' || key === 'end_portal' || key === 'return_portal') return;
                const matObj = materials[key];
                const list = Array.isArray(matObj) ? matObj : [matObj];
                list.forEach(m => {
                    if (!m) return;
                    if (m._spectatorBaseOpacity === undefined) {
                        m._spectatorBaseOpacity = m.opacity === undefined ? 1 : m.opacity;
                        m._spectatorBaseTransparent = !!m.transparent;
                        m._spectatorBaseDepthWrite = m.depthWrite !== false;
                    }
                    if (enabled) {
                        m.transparent = true;
                        m.opacity = Math.min(m._spectatorBaseOpacity, 0.28);
                        m.depthWrite = false;
                    } else {
                        m.transparent = m._spectatorBaseTransparent;
                        m.opacity = m._spectatorBaseOpacity;
                        m.depthWrite = m._spectatorBaseDepthWrite;
                    }
                    m.needsUpdate = true;
                });
            });
        };

        function createReserved6Icon() {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const checker = ((x >> 2) + (y >> 2)) % 2;
                    ctx.fillStyle = checker ? '#7a2fb7' : '#23122f';
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            ctx.strokeStyle = '#e7b6ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 14, 14);
            return canvas.toDataURL();
        }
        window.RESERVED6_ICON = createReserved6Icon();
        
        const icons = {}; 
        for (let key of allItemTypes) { 
            if (materials[key]) {
                if (Array.isArray(materials[key])) {
                    if (key === 'furnace') icons[key] = window.getTextureSource ? window.getTextureSource('furnace_front') : 'textures/furnace_front.png';
                    else if (key === 'chest') icons[key] = window.getTextureSource ? window.getTextureSource('chest_front') : 'textures/chest_front.png';
                    else icons[key] = materials[key][0].map ? materials[key][0].map.uiIcon : (window.getTextureSource ? window.getTextureSource(key) : 'textures/' + key + '.png');
                } else {
                    icons[key] = materials[key].map ? materials[key].map.uiIcon : (window.getTextureSource ? window.getTextureSource(key) : 'textures/' + key + '.png');
                }
            } else {
                if (key === 'door') icons[key] = window.getTextureSource ? window.getTextureSource('oak_door') : 'textures/oak_door.png';
                else icons[key] = window.getTextureSource ? window.getTextureSource(key) : 'textures/' + key + '.png';
            }
            // Ensure icons are pre-loaded for 3D hand view
            if (!itemPixels[key]) createPixelTexture(key);
        }

        // 为转角楼梯指定基础楼梯的 UI 图标，使其在物品栏中正常显示
        ['oak_stairs', 'stone_stairs', 'cobblestone_stairs'].forEach(base => {
            ['inner_left', 'inner_right'].forEach(suffix => {
                icons[`${base}_${suffix}`] = icons[base];
            });
        });

        // ==========================================
