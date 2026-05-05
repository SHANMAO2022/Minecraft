        // ==========================================
        let currentHealth = 20; let currentHunger = 20; let isDead = false;
        const healthBarEl = document.getElementById('health-bar'); const hungerBarEl = document.getElementById('hunger-bar'); const armorBarEl = document.getElementById('armor-bar'); const deathScreenEl = document.getElementById('death-screen');
        const tooltipEl = document.getElementById('item-tooltip');

        function updateStatusUI() {
            let healthHtml = '';
            for (let i = 0; i < 10; i++) {
                let h = currentHealth - i * 2;
                if (h >= 2) healthHtml += '❤️';
                else if (h === 1) healthHtml += '💔';
                else healthHtml += '🖤';
            }
            healthBarEl.innerHTML = healthHtml;
            hungerBarEl.innerHTML = ''; for (let i = 0; i < 10; i++) hungerBarEl.innerHTML += (i >= 10 - Math.ceil(currentHunger / 2)) ? '🍗' : '🦴'; // Deplete from left to right
            
            // 计算护甲值
            let totalArmorValue = 0;
            if (window.invState && invState.armor) {
                invState.armor.forEach(item => { if (item && ITEMS[item.type]) totalArmorValue += (ITEMS[item.type].armorValue || 0); });
            }
            armorBarEl.innerHTML = ''; 
            if (totalArmorValue > 0) {
                let armorHtml = "";
                let fullIcons = Math.floor(totalArmorValue / 2);
                let halfIcon = totalArmorValue % 2;
                for (let i = 0; i < fullIcons; i++) armorHtml += "🥼";
                if (halfIcon) armorHtml += "👟";
                armorBarEl.innerText = armorHtml;
                armorBarEl.style.display = 'flex';
            } else {
                armorBarEl.style.display = 'none';
            }

            document.getElementById('status-bars').style.opacity = (gameMode === 0) ? '0' : '1';
        }

        function takeDamage(amount) {
            if (isDead || playerInvulnTimer > 0 || gameMode === 0) return;
            
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

        // ==========================================