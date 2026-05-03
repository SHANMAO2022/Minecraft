        // ==========================================
        const dimensionState = {
            overworld: { chunks: new Map(), worldBlocks: new Set(), entities: [], playerPos: null },
            nether: { chunks: new Map(), worldBlocks: new Set(), entities: [], playerPos: null },
            end: { chunks: new Map(), worldBlocks: new Set(), entities: [], playerPos: null }
        };

        let currentDimension = 'overworld';
        let chunks = dimensionState.overworld.chunks; let worldBlocks = dimensionState.overworld.worldBlocks; let entities = dimensionState.overworld.entities;

        const scene = new THREE.Scene(); scene.background = new THREE.Color(0x87CEEB); scene.fog = new THREE.Fog(0x87CEEB, 40, 80);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); camera.position.set(0, 20, 0);
        let spawnPoint = null;

        const heldItemGroup = new THREE.Group(); heldItemGroup.position.set(0.4, -0.4, -0.6); camera.add(heldItemGroup); scene.add(camera);
        const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(window.devicePixelRatio); document.body.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); scene.add(directionalLight);
        const skyColors = { overworld: new THREE.Color(0x87CEEB), dusk: new THREE.Color(0xfd5e53), night: new THREE.Color(0x050510), nether: new THREE.Color(0x330000), end: new THREE.Color(0x0a0a1a) }; const skyCurrent = new THREE.Color();

        function getBlock(x, y, z) {
            const cx = Math.floor(x / chunkSize); const cz = Math.floor(z / chunkSize);
            const chunk = chunks.get(`${cx},${cz}`); if (!chunk) return null; return chunk.blocks.get(`${x},${y},${z}`);
        }

        function setBlock(x, y, z, type, fromNetwork = false, targetDim = currentDimension) {
            const cx = Math.floor(x / chunkSize); const cz = Math.floor(z / chunkSize);
            const key = `${x},${y},${z}`;
            modifiedBlocks[targetDim][key] = type === null ? 'null' : type;
            if (targetDim === currentDimension) {
                const chunk = chunks.get(`${cx},${cz}`);
                if (chunk) {
                    if (type === null) { chunk.blocks.delete(key); worldBlocks.delete(key); }
                    else { chunk.blocks.set(key, type); if (type !== 'water' && type !== 'lava' && type !== 'tall_grass' && type !== 'end_portal_frame_empty') worldBlocks.add(key); }
                    rebuildChunkMesh(chunk);
                }
            }
            if (!fromNetwork && myPeer) {
                const netData = { type: 'block', bx: x, by: y, bz: z, bt: type, dim: currentDimension };
                if (isMultiplayerHost) connectedClients.forEach(c => c.send(netData));
                else if (myConnection) myConnection.send(netData);
            }
        }

        // ==========================================