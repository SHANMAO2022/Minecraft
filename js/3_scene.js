        // ==========================================
        window.liquidQueue = new Set();
        window.liquidTimer = 0;
        window.waterDistances = new Map();
        window.lavaDistances = new Map();
        
        const dimensionState = {
            overworld: { chunks: new Map(), worldBlocks: new Set(), entities: [], playerPos: null },
            nether: { chunks: new Map(), worldBlocks: new Set(), entities: [], playerPos: null },
            end: { chunks: new Map(), worldBlocks: new Set(), entities: [], playerPos: null }
        };
        window.dimensionState = dimensionState;

        var currentDimension = 'overworld';
        var chunks = dimensionState.overworld.chunks; 
        var worldBlocks = dimensionState.overworld.worldBlocks; 
        var entities = dimensionState.overworld.entities;
        
        var scene = new THREE.Scene(); scene.background = new THREE.Color(0x87CEEB); 
        // 核心光影黑科技：超强光影下采用指数级高度拟真雾气（FogExp2），普通光影采用线性雾气
        if (window.shadowsEnabled) {
            scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);
        } else {
            scene.fog = new THREE.Fog(0x87CEEB, 40, 80);
        }
        
        // 核心光影黑科技：重写 scene.add，让所有未来加入场景的物体（生物、掉落物等）自动继承阴影属性
        const originalSceneAdd = scene.add;
        scene.add = function(object) {
            if (window.shadowsEnabled && object) {
                object.traverse(node => {
                    if (node.isMesh) {
                        const isWaterOrGlass = node.material && (node.material.opacity < 0.9 && node.material.transparent);
                        node.castShadow = !isWaterOrGlass;
                        node.receiveShadow = true;
                    }
                });
            }
            return originalSceneAdd.apply(this, arguments);
        };
        var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); camera.position.set(0, 20, 0);
        var spawnPoint = null;
        
        var heldItemGroup = new THREE.Group(); heldItemGroup.position.set(0.4, -0.4, -0.6); camera.add(heldItemGroup); scene.add(camera);
        var renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(window.devicePixelRatio);
        // When "超强光影" is off, fully disable shadow map work.
        renderer.shadowMap.enabled = !!window.shadowsEnabled;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; document.body.appendChild(renderer.domElement);

        // 核心光影黑科技：超强光影下开启高动态光照辉光（HDR Bloom）后处理流程
        var composer = null;
        if (window.shadowsEnabled && window.EffectComposer) {
            composer = new window.EffectComposer(renderer);
            const renderPass = new window.RenderPass(scene, camera);
            composer.addPass(renderPass);

            // UnrealBloomPass 参数：分辨率，强度，半径，阈值
            const bloomPass = new window.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.35,  // 辉光强度 (让火把、岩浆、传送门完美散发光晕)
                0.4,   // 辉光半径
                0.7    // 辉光阈值
            );
            composer.addPass(bloomPass);

            const outputPass = new window.OutputPass();
            composer.addPass(outputPass);
            window.composer = composer;
        }

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.castShadow = window.shadowsEnabled;
        
        // 核心修复：开启超强光影时，阴影贴图大小直接翻倍（4096），实现电影级细腻柔和的接触阴影！
        if (window.shadowsEnabled) {
            directionalLight.shadow.mapSize.width = 4096;
            directionalLight.shadow.mapSize.height = 4096;
            directionalLight.shadow.bias = -0.00018; // 精密阴影偏移，完美杜绝漏光与摩尔纹
            directionalLight.shadow.radius = 4.5;    // 开启高精度 PCF 软阴影平滑边缘
        } else {
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.bias = -0.0004;
        }
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 150;
        const d = 50;
        directionalLight.shadow.camera.left = -d;
        directionalLight.shadow.camera.right = d;
        directionalLight.shadow.camera.top = d;
        directionalLight.shadow.camera.bottom = -d;
        scene.add(directionalLight);
        const skyColors = { overworld: new THREE.Color(0x87CEEB), dusk: new THREE.Color(0xfd5e53), night: new THREE.Color(0x050510), nether: new THREE.Color(0x330000), end: new THREE.Color(0x0a0a1a) }; const skyCurrent = new THREE.Color();

        function getBlock(x, y, z) {
            const cx = Math.floor(x / chunkSize); const cz = Math.floor(z / chunkSize);
            const chunk = chunks.get(`${cx},${cz}`); if (!chunk) return null;
            const type = chunk.blocks.get(`${x},${y},${z}`);
            if (!type) return null;
            if (type.endsWith('_north')) return type.slice(0, -6);
            if (type.endsWith('_south')) return type.slice(0, -6);
            if (type.endsWith('_east')) return type.slice(0, -5);
            if (type.endsWith('_west')) return type.slice(0, -5);
            return type;
        }

        function getFullBlock(x, y, z) {
            const cx = Math.floor(x / chunkSize); const cz = Math.floor(z / chunkSize);
            const chunk = chunks.get(`${cx},${cz}`); if (!chunk) return null; return chunk.blocks.get(`${x},${y},${z}`);
        }
        window.getBlock = getBlock;
        window.getFullBlock = getFullBlock;

        function setBlock(x, y, z, type, fromNetwork = false, targetDim = currentDimension) {
            if (type && window.canUseItemType && !window.canUseItemType(type)) return false;
            const oldFullType = getFullBlock(x, y, z);
            const oldType = oldFullType && window.getBaseType ? window.getBaseType(oldFullType) : oldFullType;
            const baseType = type && window.getBaseType ? window.getBaseType(type) : type;
            const cx = Math.floor(x / chunkSize); const cz = Math.floor(z / chunkSize);
            const key = `${x},${y},${z}`;
            
            if (window.isPlaying && targetDim === currentDimension && oldFullType !== type) {
                if (type === null) {
                    if (oldType && oldType !== 'water' && oldType !== 'lava') {
                        window.playBlockSound(oldType, 'dig');
                    }
                } else {
                    if (baseType !== 'water' && baseType !== 'lava') {
                        window.playBlockSound(baseType, 'step');
                    }
                }
            }

            modifiedBlocks[targetDim][key] = type === null ? 'null' : type;
            if (targetDim === currentDimension) {
                const chunk = chunks.get(`${cx},${cz}`);
                if (chunk) {
                    if (type === null) { chunk.blocks.delete(key); worldBlocks.delete(key); }
                    else { 
                        chunk.blocks.set(key, type); 
                        const nonSolid = ['water', 'lava', 'tall_grass', 'end_portal_frame_empty', 'torch', 'end_rod', 'door_top_open', 'door_bottom_open'];
                        if (!nonSolid.includes(baseType)) worldBlocks.add(key); 
                    }
                    rebuildChunkMesh(chunk);

                    // Rebuild neighbor chunks if on boundary to update occlusion culling
                    const localX = (x % chunkSize + chunkSize) % chunkSize;
                    const localZ = (z % chunkSize + chunkSize) % chunkSize;
                    if (localX === 0) { const n = chunks.get(`${cx-1},${cz}`); if (n) rebuildChunkMesh(n); }
                    if (localX === chunkSize - 1) { const n = chunks.get(`${cx+1},${cz}`); if (n) rebuildChunkMesh(n); }
                    if (localZ === 0) { const n = chunks.get(`${cx},${cz-1}`); if (n) rebuildChunkMesh(n); }
                    if (localZ === chunkSize - 1) { const n = chunks.get(`${cx},${cz+1}`); if (n) rebuildChunkMesh(n); }

                    // Liquid update trigger
                    if (type === 'water' || type === 'lava') {
                        window.liquidQueue.add(key);
                        const distMap = type === 'lava' ? window.lavaDistances : window.waterDistances;
                        if (!fromNetwork && !distMap.has(key)) {
                            distMap.set(key, 0);
                        }
                    } else if (type === null) {
                        // Notify neighboring liquids to flow into newly opened space.
                        const dirs = [[0,1,0], [0,-1,0], [1,0,0], [-1,0,0], [0,0,1], [0,0,-1]];
                        dirs.forEach(d => {
                            const nx = x + d[0], ny = y + d[1], nz = z + d[2];
                            const neighborType = getBlock(nx, ny, nz);
                            if (neighborType === 'water' || neighborType === 'lava') window.liquidQueue.add(`${nx},${ny},${nz}`);
                        });
                    }
                }
            }
            if (!fromNetwork && typeof myPeer !== 'undefined' && myPeer) {
                const netData = { type: 'block', bx: x, by: y, bz: z, bt: type, dim: currentDimension };
                if (typeof isMultiplayerHost !== 'undefined' && isMultiplayerHost) {
                    if (typeof connectedClients !== 'undefined') connectedClients.forEach(c => c.send(netData));
                } else if (typeof myConnection !== 'undefined' && myConnection) {
                    myConnection.send(netData);
                }
            }
        }

        // ==========================================
