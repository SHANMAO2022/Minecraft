        // ==========================================
        function appendChat(msg) { const hist = document.getElementById('chat-history'); const p = document.createElement('div'); p.innerText = msg; hist.appendChild(p); hist.scrollTop = hist.scrollHeight; }

        const DAY_LENGTH = 300; const NIGHT_LENGTH = 180; const CYCLE_LENGTH = DAY_LENGTH + NIGHT_LENGTH;

        function handleCommand(cmd) {
            appendChat(`> ${cmd}`);
            const args = cmd.trim().split(' ').filter(Boolean);
            if (args.length === 0) return;
            const command = args[0].toLowerCase();

            if (command === '/gamemode') {
                if (args[1] === 'creative') { gameMode = 0; document.getElementById('gamemode-display').innerText = '模式: 创造 [双击空格飞行]'; appendChat('已切换到 创造模式'); updateStatusUI(); }
                else if (args[1] === 'survival') { gameMode = 1; isFlying = false; document.getElementById('gamemode-display').innerText = '模式: 生存 [按 T 输入指令]'; appendChat('已切换到 生存模式'); updateStatusUI(); }
                else { appendChat('未知模式，请使用 /gamemode survival 或 /gamemode creative'); }
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
                else if (type === 'crystal') { spawnEnderCrystal(px, py, pz); appendChat('已召唤 末地水晶'); }
                else if (type === 'dragon') { spawnEnderDragon(); appendChat('已召唤 末影龙'); }
                else { appendChat('未知生物。可召唤: pig, zombie, spider, blaze, enderman, crystal, dragon'); }
            }
            else { appendChat('未知指令。'); }
        }

        // ==========================================