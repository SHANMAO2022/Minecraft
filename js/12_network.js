// ==========================================
let myPeer = null, myConnection = null, connectedClients = [];
let isMultiplayerHost = false; let multiplayerPeers = {};

function startLanServer() {
    if (!window.Peer) return alert("多人组件加载失败 (请检查网络连接)");
    
    isMultiplayerHost = true;
    appendChat("正在创建局域网房间...");
    
    // 立即锁定鼠标，锁定成功后 lock 事件会自动隐藏菜单
    if (window.controls) window.controls.lock();
    
    myPeer = new Peer(); // 自动生成随机 ID
    myPeer.on('open', id => {
        appendChat("房间创建成功！房间号: " + id + " (已自动复制到剪贴板)");
        navigator.clipboard.writeText(id).catch(() => { });
    });
    myPeer.on('connection', conn => {
        connectedClients.push(conn);
        // 发送种子和当前所有方块修改给新加入的访客
        const worldData = Array.from(worldBlocks.entries());
        conn.send({ 
            type: 'world_sync', 
            data: worldData, 
            seed: mcSeed,
            mods: modifiedBlocks,
            chests: window.chestInventories,
            furnaces: window.furnaceStates
        });
        
        conn.on('data', data => { 
            handleNetworkData(data, conn.peer); 
            // 房主作为中心节点转发消息给其他所有人
            connectedClients.forEach(c => { if (c.peer !== conn.peer) c.send(data); }); 
        });
        conn.on('close', () => { 
            removeNetworkPlayer(conn.peer); 
            connectedClients = connectedClients.filter(c => c !== conn); 
        });
    });
    myPeer.on('error', err => {
        appendChat("网络错误: " + err.type);
    });
}
window.startLanServer = startLanServer;

function handleNetworkData(data, senderId) {
    if (data.type === 'pos') {
        const id = data.id;
        if (!multiplayerPeers[id]) {
            const mesh = buildPlayerMesh(data.skin, data.name || 'Player');
            scene.add(mesh);
            multiplayerPeers[id] = { 
                mesh, 
                targetPos: new THREE.Vector3(...data.pos), 
                targetRot: data.rot[0], 
                anim: data.anim, 
                dim: data.dim 
            };
            appendChat((data.name || 'Player') + ' 加入了游戏');
        }
        const p = multiplayerPeers[id];
        p.targetPos.set(...data.pos);
        p.targetRot = data.rot[0];
        p.anim = data.anim;
        p.dim = data.dim;
    } else if (data.type === 'block') {
        // 收到其他玩家放置或破坏方块的消息
        setBlock(data.bx, data.by, data.bz, data.bt, true, data.dim);
    } else if (data.type === 'world_sync') {
        // 访客同步世界种子和修改记录
        mcSeed = data.seed;
        initNoise(); // 必须重新初始化噪声，否则地形会对不上
        modifiedBlocks = data.mods;
        window.chestInventories = data.chests || {};
        window.furnaceStates = data.furnaces || {};
        
        // 重载所有区块
        chunks.forEach(c => {
            for (const t in c.meshes) {
                scene.remove(c.meshes[t]);
                c.meshes[t].dispose();
            }
        });
        chunks.clear();
        worldBlocks.clear();
        lastChunkX = -999;
        updateChunks();
        
        appendChat("已同步房主世界 (Seed: " + mcSeed + ")");
    } else if (data.type === 'chat') {
        appendChat(data.name + ": " + data.message);
    } else if (data.type === 'mobs') {
        if (currentDimension !== data.dim) return;
        const now = performance.now();
        const seenMobIds = new Set(data.mobs.map(m => m.id));
        
        // 更新本地实体
        data.mobs.forEach(m => {
            let localMob = entities.find(e => e.id === m.id);
            if (!localMob) {
                if (m.type === 'pig') spawnPig(m.pos[0], m.pos[2], m.pos[1]-2);
                else if (m.type === 'cow') spawnCow(m.pos[0], m.pos[2], m.pos[1]-2);
                else if (m.type === 'zombie') spawnZombie(m.pos[0], m.pos[2], m.pos[1]-2);
                else if (m.type === 'spider') spawnSpider(m.pos[0], m.pos[2], m.pos[1]-1);
                else if (m.type === 'blaze') spawnBlaze(m.pos[0], m.pos[2], m.pos[1]-2);
                else if (m.type === 'enderman') spawnEnderman(m.pos[0], m.pos[2], m.pos[1]-2);
                
                localMob = entities[entities.length - 1];
                if (localMob) localMob.id = m.id;
            }
            if (localMob) {
                localMob.networkControlled = true;
                localMob.lastNetworkSeen = now;
                localMob.persistent = true;
                localMob.mesh.position.set(m.pos[0], m.pos[1], m.pos[2]);
                if (localMob.mesh.rotation) localMob.mesh.rotation.y = m.rot;
                localMob.hp = m.hp;
            }
        });
        
        // 移除服务器已不存在的实体
        for (let i = entities.length - 1; i >= 0; i--) {
            const e = entities[i];
            if (['pig', 'cow', 'zombie', 'spider', 'blaze', 'enderman'].includes(e.type)) {
                if (e.networkControlled && !seenMobIds.has(e.id) && now - (e.lastNetworkSeen || 0) > 5000) {
                    scene.remove(e.mesh);
                    entities.splice(i, 1);
                }
            }
        }
    } else if (data.type === 'containers') {
        window.chestInventories = data.chests;
        window.furnaceStates = data.furnaces;
        if (window.renderInventoryUI) window.renderInventoryUI();
    }
}

window.syncContainerState = function() {
    if (myPeer) {
        const netData = { type: 'containers', chests: window.chestInventories, furnaces: window.furnaceStates };
        if (isMultiplayerHost) connectedClients.forEach(c => c.send(netData));
        else if (myConnection) myConnection.send(netData);
    }
};

function removeNetworkPlayer(id) {
    if (multiplayerPeers[id]) {
        scene.remove(multiplayerPeers[id].mesh);
        delete multiplayerPeers[id];
    }
}

// 事件监听与原有联机逻辑保持一致，但修复了加入时的延迟
document.getElementById('btn-singleplayer').addEventListener('click', async () => { titleScreen.style.display = 'none'; worldSelectScreen.style.display = 'flex'; await renderWorldList(); });
document.getElementById('btn-world-back').addEventListener('click', () => { worldSelectScreen.style.display = 'none'; titleScreen.style.display = 'flex'; });
document.getElementById('btn-goto-create').addEventListener('click', () => { worldSelectScreen.style.display = 'none'; createWorldScreen.style.display = 'flex'; });
document.getElementById('btn-cancel-create').addEventListener('click', () => { createWorldScreen.style.display = 'none'; worldSelectScreen.style.display = 'flex'; });
document.getElementById('btn-toggle-mode').addEventListener('click', (e) => { pendingCreateMode = pendingCreateMode === 1 ? 0 : 1; e.target.innerText = `游戏模式: ${pendingCreateMode === 1 ? '生存' : '创造'}`; });
document.getElementById('btn-confirm-create').addEventListener('click', () => { 
    const nameStr = document.getElementById('world-name-input').value.trim() || '新的世界';
    const seedStr = document.getElementById('seed-input').value.trim(); 
    startNewGame(seedStr, pendingCreateMode, nameStr); 
});
document.getElementById('btn-play-world').addEventListener('click', async () => { if (selectedFilename) await loadGame(selectedFilename); });
document.getElementById('btn-delete-world').addEventListener('click', async () => { 
    if (selectedFilename) { 
        if (confirm('确定要删除世界 "' + selectedFilename + '" 吗？此操作无法撤销。')) {
            await window.deleteSave(selectedFilename);
            selectedFilename = null;
            await renderWorldList(); 
        }
    } 
});
document.getElementById('btn-export-world').addEventListener('click', () => { if (selectedFilename) exportWorld(selectedFilename); else alert("请先选择一个世界"); });
document.getElementById('btn-import-world').addEventListener('click', () => { document.getElementById('import-input').click(); });
document.getElementById('import-input').addEventListener('change', (e) => { const file = e.target.files[0]; if (file) importWorld(file); });

document.getElementById('btn-save-quit').addEventListener('click', async () => { 
    await saveGame(); 
    isPlaying = false; 
    pauseScreen.style.display = 'none'; 
    titleScreen.style.display = 'flex';
});

document.getElementById('btn-options-title').addEventListener('click', () => { titleScreen.style.display = 'none'; document.getElementById('options-screen').style.display = 'flex'; document.getElementById('player-name-input').value = localStorage.getItem('mc_playerName') || 'Player'; });
document.getElementById('btn-options-pause').addEventListener('click', () => { pauseScreen.style.display = 'none'; document.getElementById('options-screen').style.display = 'flex'; document.getElementById('player-name-input').value = localStorage.getItem('mc_playerName') || 'Player'; });

async function savePlayerSettings() {
    try {
        const host = window.location.hostname || 'localhost';
        const settings = {
            playerName: localStorage.getItem('mc_playerName') || 'Player',
            playerSkin: localStorage.getItem('mc_playerSkin') || ''
        };
        await fetch(`http://${host}:8000/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
    } catch(e) {}
}

document.getElementById('btn-save-options').addEventListener('click', () => { 
    localStorage.setItem('mc_playerName', document.getElementById('player-name-input').value.trim() || 'Player'); 
    savePlayerSettings();
    document.getElementById('options-screen').style.display = 'none'; 
    if (isPlaying) pauseScreen.style.display = 'flex'; 
    else titleScreen.style.display = 'flex'; 
});

document.getElementById('skin-upload').addEventListener('change', (e) => { 
    const file = e.target.files[0]; 
    if (file) { 
        const reader = new FileReader(); 
        reader.onload = (ev) => { 
            localStorage.setItem('mc_playerSkin', ev.target.result); 
            savePlayerSettings();
            if (typeof renderInventoryUI === 'function') renderInventoryUI(); 
        }; 
        reader.readAsDataURL(file); 
    } 
});

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
        const worldData = Array.from(worldBlocks.entries());
        conn.send({ type: 'world_sync', data: worldData, seed: mcSeed, mods: modifiedBlocks, chests: window.chestInventories, furnaces: window.furnaceStates });
        conn.on('data', data => { handleNetworkData(data, conn.peer); connectedClients.forEach(c => { if (c.peer !== conn.peer) c.send(data); }); });
        conn.on('close', () => { removeNetworkPlayer(conn.peer); connectedClients = connectedClients.filter(c => c !== conn); });
    });
    myPeer.on('error', err => appendChat("网络错误: " + err.type));
});

document.getElementById('btn-join-game').addEventListener('click', () => {
    const joinId = document.getElementById('join-id-input').value.trim();
    if (!joinId) return alert("请输入房间号");
    if (!window.Peer) return alert("多人组件加载失败");
    isMultiplayerHost = false;
    document.getElementById('multiplayer-screen').style.display = 'none';
    startNewGame("Joining...", pendingCreateMode); // 先启动一个临时世界，随后同步房主种子
    appendChat("正在连接到房间...");
    myPeer = new Peer();
    myPeer.on('open', id => {
        myConnection = myPeer.connect(joinId);
        myConnection.on('open', () => { 
            appendChat("连接成功！同步种子中..."); 
        });
        myConnection.on('data', data => { handleNetworkData(data, myConnection.peer); });
        myConnection.on('close', () => { appendChat("连接已断开"); removeNetworkPlayer(joinId); });
        myConnection.on('error', err => appendChat("连接错误: " + err.type));
    });
    myPeer.on('error', err => appendChat("网络错误: " + err.type));
});

uiLayer.style.display = 'flex'; titleScreen.style.display = 'flex'; worldSelectScreen.style.display = 'none'; createWorldScreen.style.display = 'none'; pauseScreen.style.display = 'none';

// 在游戏启动时尝试从服务器读取玩家设置
(async function initPlayerSettings() {
    try {
        const host = window.location.hostname || 'localhost';
        const res = await fetch(`http://${host}:8000/api/settings`);
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success' && data.content) {
                if (data.content.playerName) localStorage.setItem('mc_playerName', data.content.playerName);
                if (data.content.playerSkin) localStorage.setItem('mc_playerSkin', data.content.playerSkin);
            }
        }
    } catch(e) {}
})();

// ==========================================
