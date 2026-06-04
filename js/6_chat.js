        // ==========================================
        function appendChat(msg) {
            const hist = document.getElementById('chat-history');
            const p = document.createElement('div');
            p.innerText = msg;
            hist.appendChild(p);
            hist.scrollTop = hist.scrollHeight;
            setTimeout(() => {
                p.style.opacity = '0';
            }, 8000);
        }

        const DAY_LENGTH = 300; const NIGHT_LENGTH = 180; const CYCLE_LENGTH = DAY_LENGTH + NIGHT_LENGTH;

        function handleCommand(cmd) {
            if (cmd.startsWith('/')) {
                appendChat(`> ${cmd}`);
            } else {
                appendChat(`<玩家> ${cmd}`);
            }
            const args = cmd.trim().split(' ').filter(Boolean);
            if (args.length === 0) return;
            const command = args[0].toLowerCase();

            if (command === '/gamemode') {
                if (args[1] === 'creative') { gameMode = 0; document.getElementById('gamemode-display').innerText = '模式: 创造 [双击空格飞行]'; appendChat('已切换到 创造模式'); updateStatusUI(); if (window.updateHeldItem3D) window.updateHeldItem3D(); }
                else if (args[1] === 'survival') { gameMode = 1; isFlying = false; document.getElementById('gamemode-display').innerText = '模式: 生存 [按 T 输入指令]'; appendChat('已切换到 生存模式'); updateStatusUI(); if (window.updateHeldItem3D) window.updateHeldItem3D(); }
                else if (args[1] === 'spectator') { gameMode = 2; isFlying = true; document.getElementById('gamemode-display').innerText = '模式: 旁观者 [穿墙飞行模式]'; appendChat('已切换到 旁观者模式'); updateStatusUI(); if (window.updateHeldItem3D) window.updateHeldItem3D(); }
                else { appendChat('未知模式，请使用 /gamemode survival, /gamemode creative 或 /gamemode spectator'); }
            }
            else if (command === '/time') {
                if (args[1] === 'set') {
                    let val = args[2];
                    if (val === 'day') worldTime = Math.floor(worldTime / CYCLE_LENGTH) * CYCLE_LENGTH;
                    else if (val === 'night') worldTime = Math.floor(worldTime / CYCLE_LENGTH) * CYCLE_LENGTH + DAY_LENGTH;
                    else if (!isNaN(parseFloat(val))) worldTime = parseFloat(val);
                    else { appendChat('用法: /time set <day/night/数字>'); return; }
                    appendChat(`时间已设置为 ${val}`);
                } else if (args[1] === 'add') {
                    let val = parseFloat(args[2]);
                    if (!isNaN(val)) { worldTime += val; appendChat(`时间增加了 ${val}`); }
                    else appendChat('用法: /time add <数字>');
                } else { appendChat('用法: /time <set/add> <值>'); }
            }
            else if (command === '/summon') {
                const type = args[1];
                const pDirection = new THREE.Vector3();
                camera.getWorldDirection(pDirection);
                const px = camera.position.x + pDirection.x * 2;
                const py = camera.position.y;
                const pz = camera.position.z + pDirection.z * 2;

                if (type === 'pig') { spawnPig(px, pz, py); appendChat('已召唤 猪'); }
                else if (type === 'zombie') { spawnZombie(px, pz, py); appendChat('已召唤 僵尸'); }
                else if (type === 'spider') { spawnSpider(px, pz, py); appendChat('已召唤 蜘蛛'); }
                else if (type === 'blaze') { spawnBlaze(px, pz, py); appendChat('已召唤 烈焰人'); }
                else if (type === 'enderman') { spawnEnderman(px, pz, py); appendChat('已召唤 末影人'); }
                else if (type === 'villager') {
                    if (!window.update100Enabled) { appendChat('1.00 更新未开启，无法召唤村民'); return; }
                    if (window.spawnVillager) { window.spawnVillager(px, pz, py); appendChat('已召唤 村民'); } else { appendChat('村民生成器未加载'); }
                }
                else if (type === 'crystal') { spawnEnderCrystal(px, py, pz); appendChat('已召唤 末地水晶'); }
                else if (type === 'dragon') { spawnEnderDragon(); appendChat('已召唤 末影龙'); }
                else { appendChat('未知生物。可召唤: pig, zombie, spider, blaze, enderman, villager, crystal, dragon'); }
            }
            else if (command === '/setblock') {
                if (args.length < 5) { appendChat('用法: /setblock <x> <y> <z> <方块名>'); return; }
                const parseCoord = (val, current) => { if (val.startsWith('~')) { return Math.floor(current + (parseFloat(val.slice(1)) || 0)); } return Math.floor(parseFloat(val)); };
                const x = parseCoord(args[1], camera.position.x);
                const y = parseCoord(args[2], camera.position.y);
                const z = parseCoord(args[3], camera.position.z);
                const type = args[4].toLowerCase();
                if (blockTypes.includes(type)) {
                    if (window.canUseItemType && !window.canUseItemType(type)) { appendChat('1.00 更新未开启，无法使用该方块'); return; }
                    setBlock(x, y, z, type); appendChat(`已在 [${x}, ${y}, ${z}] 放置 ${ITEM_NAMES[type] || type}`);
                }
                else if (type === 'air' || type === 'null') { setBlock(x, y, z, null); appendChat(`已在 [${x}, ${y}, ${z}] 移除方块`); }
                else { appendChat(`未知方块: ${type}`); }
            }
            else if (command === '/tp') {
                const parseCoord = (val, current) => { if (val.startsWith('~')) { return current + (parseFloat(val.slice(1)) || 0); } return parseFloat(val); };
                if (args.length === 2) { /* tp to player logic if needed */ }
                else if (args.length >= 4) {
                    const x = parseCoord(args[1], camera.position.x);
                    const y = parseCoord(args[2], camera.position.y);
                    const z = parseCoord(args[3], camera.position.z);
                    camera.position.set(x, y, z); velocity.set(0, 0, 0); appendChat(`已传送至 [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
                }
            }
            else { 
                if (command.startsWith('/')) {
                    appendChat('未知指令。');
                } else {
                    // Do nothing for handleCommand, this was normal chat
                }
            }
        }

        // ==========================================
