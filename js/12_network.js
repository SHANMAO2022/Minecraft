        // ==========================================
        let myPeer = null, myConnection = null, connectedClients = [];
        let isMultiplayerHost = false; let multiplayerPeers = {}; let lastSyncTime = 0;

        function handleNetworkData(data, senderId) {
            if (data.type === 'pos') {
                const id = data.id;
                if (!multiplayerPeers[id]) {
                    const mesh = buildPlayerMesh(data.skin, data.name || 'Player');
                    scene.add(mesh);
                    multiplayerPeers[id] = { mesh, targetPos: new THREE.Vector3(...data.pos), targetRot: data.rot[0], anim: data.anim, dim: data.dim };
                    appendChat((data.name || 'Player') + ' 加入了游戏');
                    if (!data.skin && !data.name) {
                        const req = { type: 'request_profile', id: id };
                        if (isMultiplayerHost) connectedClients.forEach(c => c.send(req));
                        else if (myConnection) myConnection.send(req);
                    }
                }
                multiplayerPeers[id].targetPos.set(...data.pos);
                multiplayerPeers[id].targetRot = data.rot[0];
                multiplayerPeers[id].anim = data.anim;
                multiplayerPeers[id].dim = data.dim;
            } else if (data.type === 'block') {
                setBlock(data.bx, data.by, data.bz, data.bt, true, data.dim);
            } else if (data.type === 'request_world' && isMultiplayerHost) {
                const targetConn = connectedClients.find(c => c.peer === senderId);
                if (targetConn) {
                    targetConn.send({
                        type: 'world_sync',
                        seed: mcSeed,
                        time: worldTime,
                        blocks: modifiedBlocks
                    });
                }
            } else if (data.type === 'world_sync') {
                mcSeed = data.seed;
                initNoise();
                modifiedBlocks = data.blocks;
                worldTime = data.time;
                chunks.forEach(c => blockTypes.forEach(t => scene.remove(c.meshes[t])));
                chunks.clear();
                worldBlocks.clear();
                lastChunkX = -999;
                updateChunks();
                appendChat("世界数据同步完成！");
            } else if (data.type === 'request_profile') {
                if (data.id === myPeer.id) {
                    const prof = { type: 'profile', id: myPeer.id, name: localStorage.getItem('mc_playerName'), skin: localStorage.getItem('mc_playerSkin') };
                    if (isMultiplayerHost) connectedClients.forEach(c => c.send(prof));
                    else if (myConnection) myConnection.send(prof);
                }
            } else if (data.type === 'profile') {
                const id = data.id;
                if (multiplayerPeers[id]) {
                    scene.remove(multiplayerPeers[id].mesh);
                    const mesh = buildPlayerMesh(data.skin, data.name || 'Player');
                    scene.add(mesh);
                    mesh.position.copy(multiplayerPeers[id].mesh.position);
                    mesh.rotation.y = multiplayerPeers[id].mesh.rotation.y;
                    multiplayerPeers[id].mesh = mesh;
                }
            }
        }

        function removeNetworkPlayer(id) {
            if (multiplayerPeers[id]) {
                scene.remove(multiplayerPeers[id].mesh);
                delete multiplayerPeers[id];
            }
        }

        document.getElementById('btn-singleplayer').addEventListener('click', () => { titleScreen.style.display = 'none'; worldSelectScreen.style.display = 'flex'; renderWorldList(); });
        document.getElementById('btn-world-back').addEventListener('click', () => { worldSelectScreen.style.display = 'none'; titleScreen.style.display = 'flex'; });
        document.getElementById('btn-goto-create').addEventListener('click', () => { worldSelectScreen.style.display = 'none'; createWorldScreen.style.display = 'flex'; });
        document.getElementById('btn-cancel-create').addEventListener('click', () => { createWorldScreen.style.display = 'none'; worldSelectScreen.style.display = 'flex'; });
        document.getElementById('btn-toggle-mode').addEventListener('click', (e) => { pendingCreateMode = pendingCreateMode === 1 ? 0 : 1; e.target.innerText = `游戏模式: ${pendingCreateMode === 1 ? '生存' : '创造'}`; });
        document.getElementById('btn-confirm-create').addEventListener('click', () => { const seedStr = document.getElementById('seed-input').value.trim(); startNewGame(seedStr, pendingCreateMode); });
        document.getElementById('btn-play-world').addEventListener('click', () => { if (isWorldSelected) loadGame(); });
        document.getElementById('btn-delete-world').addEventListener('click', () => { if (isWorldSelected) { localStorage.removeItem('mc_player'); localStorage.removeItem('mc_mods'); renderWorldList(); } });
        document.getElementById('btn-resume').addEventListener('click', () => { uiLayer.style.display = 'none'; pauseScreen.style.display = 'none'; controls.lock(); });
        document.getElementById('btn-save-quit').addEventListener('click', () => { saveGame(); isPlaying = false; pauseScreen.style.display = 'none'; titleScreen.style.display = 'flex'; });

        document.getElementById('btn-options-title').addEventListener('click', () => { titleScreen.style.display = 'none'; document.getElementById('options-screen').style.display = 'flex'; document.getElementById('player-name-input').value = localStorage.getItem('mc_playerName') || 'Player'; });
        document.getElementById('btn-options-pause').addEventListener('click', () => { pauseScreen.style.display = 'none'; document.getElementById('options-screen').style.display = 'flex'; document.getElementById('player-name-input').value = localStorage.getItem('mc_playerName') || 'Player'; });
        document.getElementById('btn-save-options').addEventListener('click', () => { localStorage.setItem('mc_playerName', document.getElementById('player-name-input').value.trim() || 'Player'); document.getElementById('options-screen').style.display = 'none'; if (isPlaying) pauseScreen.style.display = 'flex'; else titleScreen.style.display = 'flex'; });
        document.getElementById('skin-upload').addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => localStorage.setItem('mc_playerSkin', ev.target.result); reader.readAsDataURL(file); } });

        document.getElementById('btn-multiplayer').addEventListener('click', () => { titleScreen.style.display = 'none'; document.getElementById('multiplayer-screen').style.display = 'flex'; });
        document.getElementById('btn-multiplayer-back').addEventListener('click', () => { document.getElementById('multiplayer-screen').style.display = 'none'; titleScreen.style.display = 'flex'; });

        document.getElementById('btn-host-game').addEventListener('click', () => {
            if (!window.Peer) return alert("多人组件加载失败");
            isMultiplayerHost = true;
            document.getElementById('multiplayer-screen').style.display = 'none';
            startNewGame(document.getElementById('seed-input').value.trim(), pendingCreateMode);
            appendChat("正在创建房间...");
            myPeer = new Peer();
            myPeer.on('open', id => {
                appendChat("房间创建成功！你的房间号是: " + id + " (已复制到剪贴板)");
                navigator.clipboard.writeText(id).catch(() => { });
            });
            myPeer.on('connection', conn => {
                connectedClients.push(conn);
                conn.on('data', data => { handleNetworkData(data, conn.peer); connectedClients.forEach(c => { if (c.peer !== conn.peer) c.send(data); }); });
                conn.on('close', () => { removeNetworkPlayer(conn.peer); connectedClients = connectedClients.filter(c => c !== conn); });
            });
            myPeer.on('error', err => appendChat("网络错误: " + err));
        });

        document.getElementById('btn-join-game').addEventListener('click', () => {
            const joinId = document.getElementById('join-id-input').value.trim();
            if (!joinId) return alert("请输入房间号");
            if (!window.Peer) return alert("多人组件加载失败");
            isMultiplayerHost = false;
            document.getElementById('multiplayer-screen').style.display = 'none';
            startNewGame(document.getElementById('seed-input').value.trim(), pendingCreateMode);
            appendChat("正在连接到房间...");
            myPeer = new Peer();
            myPeer.on('open', id => {
                myConnection = myPeer.connect(joinId);
                myConnection.on('open', () => {
                    appendChat("连接成功！正在同步世界数据...");
                    myConnection.send({ type: 'request_world' });
                });
                myConnection.on('data', data => { handleNetworkData(data, myConnection.peer); });
                myConnection.on('close', () => { appendChat("连接已断开"); removeNetworkPlayer(joinId); });
                myConnection.on('error', err => appendChat("连接错误: " + err));
            });
            myPeer.on('error', err => appendChat("网络错误: " + err));
        });

        uiLayer.style.display = 'flex'; titleScreen.style.display = 'flex'; worldSelectScreen.style.display = 'none'; createWorldScreen.style.display = 'none'; pauseScreen.style.display = 'none';

        // ==========================================