        // ==========================================
        let currentHealth = 20; let currentHunger = 20; let isDead = false;
        const healthBarEl = document.getElementById('health-bar'); const hungerBarEl = document.getElementById('hunger-bar'); const deathScreenEl = document.getElementById('death-screen');
        const tooltipEl = document.getElementById('item-tooltip');

        function updateStatusUI() {
            healthBarEl.innerHTML = ''; for (let i = 0; i < 10; i++) healthBarEl.innerHTML += (i < Math.ceil(currentHealth / 2)) ? '❤️' : '🖤';
            hungerBarEl.innerHTML = ''; for (let i = 0; i < 10; i++) hungerBarEl.innerHTML += (i < Math.ceil(currentHunger / 2)) ? '🍗' : '🦴';
            document.getElementById('status-bars').style.opacity = (gameMode === 0) ? '0' : '1';
        }

        function takeDamage(amount) {
            if (isDead || playerInvulnTimer > 0 || gameMode === 0) return;
            currentHealth -= amount; updateStatusUI(); playerInvulnTimer = 0.5;
            const flash = document.createElement('div'); flash.style.position = 'absolute'; flash.style.top = '0'; flash.style.left = '0'; flash.style.width = '100%'; flash.style.height = '100%'; flash.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; flash.style.pointerEvents = 'none'; flash.style.zIndex = '90'; document.body.appendChild(flash); setTimeout(() => { if (flash.parentNode) document.body.removeChild(flash); }, 200);
            if (currentHealth <= 0) { isDead = true; controls.unlock(); }
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