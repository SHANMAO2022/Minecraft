        // ==========================================
// ==========================================
        let currentHealth = 20; let currentHunger = 20; let isDead = false;
        // currentXP and currentLevel are now in globals.js
        const healthBarEl = document.getElementById('health-bar'); const hungerBarEl = document.getElementById('hunger-bar'); const armorBarEl = document.getElementById('armor-bar'); const deathScreenEl = document.getElementById('death-screen');
        const xpContainerEl = document.getElementById('xp-container'); const xpFillEl = document.getElementById('xp-bar-fill'); const xpLevelEl = document.getElementById('xp-level');
        const tooltipEl = document.getElementById('item-tooltip');

        var addXP = function (amount) {
            window.currentXP += amount;
            while (true) {
                const xpRequired = 100 + window.currentLevel * 50;
                if (window.currentXP >= xpRequired) {
                    window.currentXP -= xpRequired;
                    window.currentLevel++;
                    console.log("Leveled Up! Current Level: " + window.currentLevel);
                } else {
                    break;
                }
            }
            updateStatusUI();
            if (typeof saveGame === 'function') saveGame();
        };
        window.addXP = addXP;

        var updateStatusUI = function() {
            const hudIcon = (type) => `<span class="hud-icon hud-${type}"></span>`;
            let healthHtml = '';
            for (let i = 0; i < 10; i++) {
                let h = currentHealth - i * 2;
                if (h >= 2) healthHtml += hudIcon('heart-full');
                else if (h > 0) healthHtml += hudIcon('heart-half');
                else healthHtml += hudIcon('heart-empty');
            }
            healthBarEl.innerHTML = healthHtml;
            hungerBarEl.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const food = currentHunger - (9 - i) * 2;
                hungerBarEl.innerHTML += food >= 2 ? hudIcon('food-full') : (food > 0 ? hudIcon('food-half') : hudIcon('food-empty'));
            }
            
            // 计算护甲值
            let totalArmorValue = 0;
            if (window.invState && invState.armor) {
                invState.armor.forEach(item => { if (item && ITEMS[item.type]) totalArmorValue += (ITEMS[item.type].armorValue || 0); });
            }
            armorBarEl.innerHTML = ''; 
            if (totalArmorValue > 0) {
                let armorHtml = "";
                for (let i = 0; i < 10; i++) {
                    const armor = totalArmorValue - i * 2;
                    armorHtml += armor >= 2 ? hudIcon('armor-full') : (armor > 0 ? hudIcon('armor-half') : hudIcon('armor-empty'));
                }
                armorBarEl.innerHTML = armorHtml;
                armorBarEl.style.display = 'flex';
            } else {
                armorBarEl.style.display = 'none';
            }

            // 更新经验条
            if (xpContainerEl) {
                if (gameMode === 1) {
                    xpContainerEl.style.display = 'flex';
                    const xpRequired = 100 + window.currentLevel * 50;
                    const percent = Math.min(100, (window.currentXP / xpRequired) * 100);
                    if (xpFillEl) xpFillEl.style.width = percent + '%';
                    if (xpLevelEl) xpLevelEl.innerText = window.currentLevel > 0 ? window.currentLevel : '';
                } else {
                    xpContainerEl.style.display = 'none';
                }
                console.log(`XP Update: ${window.currentXP}/${100 + window.currentLevel * 50} (Lvl ${window.currentLevel})`);
            }

            document.getElementById('status-bars').style.opacity = (gameMode === 0 || gameMode === 2) ? '0' : '1';
        };
        window.updateStatusUI = updateStatusUI;



        function takeDamage(amount) {
            if (isDead || playerInvulnTimer > 0 || gameMode === 0 || gameMode === 2) return;
            
            // 护甲减免 (每 1 点 ArmorValue 减免约 4%，最高 20 点减免 80%)
            let totalArmorValue = 0;
            const currentInv = window.invState || (typeof invState !== 'undefined' ? invState : null);
            if (currentInv && currentInv.armor) {
                currentInv.armor.forEach(item => { if (item && ITEMS[item.type]) totalArmorValue += (ITEMS[item.type].armorValue || 0); });
            }
            const reduction = Math.min(0.8, totalArmorValue * 0.04);
            const finalDamage = amount * (1 - reduction);

            currentHealth -= finalDamage; updateStatusUI(); playerInvulnTimer = 0.5;
            const flash = document.createElement('div'); flash.style.position = 'absolute'; flash.style.top = '0'; flash.style.left = '0'; flash.style.width = '100%'; flash.style.height = '100%'; flash.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; flash.style.pointerEvents = 'none'; flash.style.zIndex = '90'; document.body.appendChild(flash); setTimeout(() => { if (flash.parentNode) document.body.removeChild(flash); }, 200);
            if (currentHealth <= 0) { isDead = true; controls.unlock(); deathScreenEl.style.display = 'flex'; }
        }

        document.getElementById('respawn-btn').addEventListener('click', () => {
            currentHealth = 20; currentHunger = 20; isDead = false; updateStatusUI(); deathScreenEl.style.display = 'none';
            if (currentDimension !== 'overworld') switchDimension('overworld');
            if (spawnPoint && currentDimension === 'overworld') { camera.position.copy(spawnPoint); dimensionState.overworld.playerPos = camera.position.clone(); } else { camera.position.set(0, 20, 0); dimensionState.overworld.playerPos = camera.position.clone(); }
            velocity.set(0, 0, 0); highestY = 20; isFalling = false; isFlying = false;
            isSpawnImmunity = true; playerInvulnTimer = 5.0;
            gameStartTime = 0; jumpPressed = false; isPlaying = true; controls.lock();
        });

        // 初始化 UI
        setTimeout(() => { if (window.updateStatusUI) window.updateStatusUI(); }, 500);

        // ==========================================
