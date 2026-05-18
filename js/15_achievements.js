// ==========================================
// Minecraft Achievements & Advancements System (Premium Edition)
// ==========================================

(function() {
    // 1. 成就配置注册表 (树状分支定义，带亲代节点、分类及积分、描述与提示)
    const ACHIEVEMENTS = {
        // --- 1. 主世界主线 (story) ---
        benchmarking: {
            id: 'benchmarking',
            tab: 'story',
            title: '这是？工作台！',
            description: '用四块木板合成并放置一个工作台。',
            hint: '达成方式：按E打开背包，在2x2合成栏中用木头制作木板，再合成工作台，并把它放置到地面上。',
            icon: 'crafting_table',
            points: 15,
            parent: null,
            x: 50,
            y: 130
        },
        upgrade_pickaxe: {
            id: 'upgrade_pickaxe',
            tab: 'story',
            title: '获得升级',
            description: '制作一把更坚固的圆石镐子。',
            hint: '达成方式：使用工作台，摆放三个圆石和两根木棍，合成一把石镐。',
            icon: 'stone_pickaxe',
            points: 20,
            parent: 'benchmarking',
            x: 200,
            y: 130
        },
        hot_topic: {
            id: 'hot_topic',
            tab: 'story',
            title: '热门话题',
            description: '制造一个熔炉来冶炼金属与烹饪食物。',
            hint: '达成方式：在工作台里用八个圆石围成一圈，制作并放置一个熔炉。',
            icon: 'furnace',
            points: 20,
            parent: 'upgrade_pickaxe',
            x: 350,
            y: 130
        },
        acquire_iron: {
            id: 'acquire_iron',
            tab: 'story',
            title: '来硬的',
            description: '冶炼铁矿石以获得一块闪亮的铁锭。',
            hint: '达成方式：挖掘铁矿，在熔炉中用煤炭进行熔炼，或者击杀怪物掉落铁锭并拾取。',
            icon: 'iron_ingot',
            points: 25,
            parent: 'hot_topic',
            x: 500,
            y: 130
        },
        diamonds: {
            id: 'diamonds',
            tab: 'story',
            title: '钻石！',
            description: '采集到极其罕见而珍贵的钻石！',
            icon: 'diamond',
            points: 50,
            parent: 'acquire_iron',
            x: 650,
            y: 50,
            frame: 'goal' // 特殊的黄金目标框
        },
        into_nether: {
            id: 'into_nether',
            tab: 'story',
            title: '勇往直下',
            description: '穿过由黑曜石构成的传送门踏入下界。',
            icon: 'obsidian',
            points: 30,
            parent: 'acquire_iron',
            x: 650,
            y: 210
        },

        // --- 2. 维度与终局 (dimension) ---
        into_end: {
            id: 'into_end',
            tab: 'dimension',
            title: '结束了？',
            description: '踏入神秘的末地传送门，来到末地维度。',
            hint: '达成方式：合成末影之眼，并在遗迹中激活末地传送门踏入其中。',
            icon: 'ender_eye',
            points: 40,
            parent: null,
            x: 100,
            y: 130
        },
        free_the_end: {
            id: 'free_the_end',
            tab: 'dimension',
            title: '解放末地',
            description: '击败盘踞末地的末影龙，夺回安全的世界。',
            hint: '达成方式：在末地维度中击杀末影龙，并跃入升起的返回传送门。',
            icon: 'gold_ore',
            points: 100,
            parent: 'into_end',
            x: 350,
            y: 130,
            frame: 'challenge' // 特殊的挑战星芒框
        },

        // --- 3. 战斗与冒险 (combat) ---
        monster_hunter: {
            id: 'monster_hunter',
            tab: 'combat',
            title: '怪物猎人',
            description: '击杀任意一只危机四伏的敌对怪兽！',
            hint: '达成方式：用剑或弓箭击败一只僵尸、蜘蛛、烈焰人或末影人。',
            icon: 'iron_sword',
            points: 15,
            parent: null,
            x: 100,
            y: 130
        },
        monsters_hunted: {
            id: 'monsters_hunted',
            tab: 'combat',
            title: '资深怪物猎人',
            description: '击杀所有种类的敌对怪兽（僵尸、蜘蛛、烈焰人、末影人）。',
            hint: '达成方式：分别击败至少一只僵尸、一只蜘蛛、一只烈焰人和一只末影人！',
            icon: 'diamond_sword',
            points: 60,
            parent: 'monster_hunter',
            x: 350,
            y: 130,
            frame: 'challenge'
        }
    };

    // 2. 进度持久化加载与全局状态定义
    window.achievementsProgress = window.achievementsProgress || {};
    window.achievementsProgress.killedMonsters = window.achievementsProgress.killedMonsters || {};

    let activeTab = 'story';

    // 3. Web Audio API 离线合成极为清脆悦耳的原版“成就获得！”八音琶音音效
    function playAchievementSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            
            const playTone = (freq, start, duration, vol = 0.15) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start);
                
                gainNode.gain.setValueAtTime(0.001, start);
                gainNode.gain.exponentialRampToValueAtTime(vol, start + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
                
                osc.start(start);
                osc.stop(start + duration);
            };

            // 经典高频上升和弦琶音 (C5 -> E5 -> G5 -> C6)
            playTone(523.25, now, 0.4);       // C5
            playTone(659.25, now + 0.08, 0.4); // E5
            playTone(783.99, now + 0.16, 0.4); // G5
            playTone(1046.50, now + 0.24, 0.6, 0.2); // C6
        } catch (e) {
            console.warn("AudioContext failed", e);
        }
    }

    // 4. 程序化动态创建 Minecraft 风格的 Toast 消息弹出浮窗
    function showAchievementToast(ach) {
        let container = document.getElementById('achievement-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'achievement-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const isChallenge = ach.frame === 'challenge';
        toast.className = `achievement-toast-item ${isChallenge ? 'toast-challenge' : ''}`;
        
        const iconUrl = (window.icons && window.icons[ach.icon]) ? window.icons[ach.icon] : 'textures/' + ach.icon + '.png';

        toast.innerHTML = `
            <div class="ach-toast-icon" style="background-image: url('${iconUrl}')"></div>
            <div class="ach-toast-details">
                <div class="ach-toast-header">${isChallenge ? '挑战达成！' : '进度达成！'}</div>
                <div class="ach-toast-name">${ach.title}</div>
            </div>
            <div class="ach-toast-points">+${ach.points}</div>
        `;

        container.appendChild(toast);

        // 延迟触发进入滑动动画
        setTimeout(() => {
            toast.classList.add('show');
        }, 50);

        // 播放合成音效
        playAchievementSound();

        // 4 秒后滑出，4.5 秒后完全移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 4000);
    }

    // 5. 授予成就全局接口
    window.awardAchievement = function(id) {
        if (!ACHIEVEMENTS[id]) return;
        if (window.achievementsProgress[id]) return; // 避免重复获得

        window.achievementsProgress[id] = true;
        
        // 弹出 Toast
        showAchievementToast(ACHIEVEMENTS[id]);
        
        // 奖励经验值 (与游戏主系统相结合)
        if (typeof window.addXP === 'function') {
            window.addXP(ACHIEVEMENTS[id].points * 10);
        } else if (window.currentXP !== undefined) {
            window.currentXP += ACHIEVEMENTS[id].points * 10;
            if (window.currentXP >= (window.currentLevel + 1) * 100) {
                window.currentXP -= (window.currentLevel + 1) * 100;
                window.currentLevel++;
            }
            if (typeof window.updateStatusUI === 'function') window.updateStatusUI();
        }

        // 保存存档
        if (typeof saveGame === 'function') {
            saveGame();
        }
    };

    // 6. 怪物猎人专属进度追踪器
    window.trackMonsterKill = function(type) {
        if (!['zombie', 'spider', 'enderman', 'blaze'].includes(type)) return;

        // 触发基础怪物猎人成就
        window.awardAchievement('monster_hunter');

        // 记录击杀历史
        window.achievementsProgress.killedMonsters = window.achievementsProgress.killedMonsters || {};
        window.achievementsProgress.killedMonsters[type] = true;

        // 检查是否所有 4 个怪物种类都已被击杀
        const killedAll = ['zombie', 'spider', 'enderman', 'blaze'].every(
            m => window.achievementsProgress.killedMonsters[m]
        );

        if (killedAll) {
            window.awardAchievement('monsters_hunted');
        }

        if (typeof saveGame === 'function') {
            saveGame();
        }
    };

    // 7. 渲染成就弹窗详情信息 (点击查看达成方法)
    function showAchievementDetail(ach) {
        const isUnlocked = !!window.achievementsProgress[ach.id];
        
        let detailModal = document.getElementById('ach-detail-modal');
        if (!detailModal) {
            detailModal = document.createElement('div');
            detailModal.id = 'ach-detail-modal';
            document.body.appendChild(detailModal);
        }

        const iconUrl = (window.icons && window.icons[ach.icon]) ? window.icons[ach.icon] : 'textures/' + ach.icon + '.png';

        detailModal.innerHTML = `
            <div class="ach-modal-backdrop"></div>
            <div class="ach-modal-box">
                <div class="ach-modal-close-btn">&times;</div>
                <div class="ach-modal-header-row">
                    <div class="ach-modal-icon" style="background-image: url('${iconUrl}')"></div>
                    <div class="ach-modal-title-area">
                        <div class="ach-modal-title">${ach.title}</div>
                        <div class="ach-modal-subtitle">${ach.frame === 'challenge' ? '【挑战进度】' : ach.frame === 'goal' ? '【目标进度】' : '【普通进度】'}</div>
                    </div>
                </div>
                <div class="ach-modal-divider"></div>
                <div class="ach-modal-body">
                    <div class="ach-modal-desc"><strong>介绍：</strong>${ach.description}</div>
                    <div class="ach-modal-hint"><strong>如何达成：</strong>${ach.hint || '按照原版流程获得对应材料或击败怪兽。'}</div>
                    <div class="ach-modal-reward">
                        <strong>成就积分：</strong><span style="color: #ffaa00;">${ach.points} PTS</span> | 
                        <strong>经验奖励：</strong><span style="color: #55ff55;">+${ach.points * 10} XP</span>
                    </div>
                    ${ach.id === 'monsters_hunted' ? `
                        <div class="ach-modal-subprogress">
                            <strong>已猎杀怪兽列表：</strong>
                            <div class="ach-subprogress-list">
                                <span class="${window.achievementsProgress.killedMonsters['zombie'] ? 'done' : ''}">僵尸 ${window.achievementsProgress.killedMonsters['zombie'] ? '✓' : '🔒'}</span>
                                <span class="${window.achievementsProgress.killedMonsters['spider'] ? 'done' : ''}">蜘蛛 ${window.achievementsProgress.killedMonsters['spider'] ? '✓' : '🔒'}</span>
                                <span class="${window.achievementsProgress.killedMonsters['blaze'] ? 'done' : ''}">烈焰人 ${window.achievementsProgress.killedMonsters['blaze'] ? '✓' : '🔒'}</span>
                                <span class="${window.achievementsProgress.killedMonsters['enderman'] ? 'done' : ''}">末影人 ${window.achievementsProgress.killedMonsters['enderman'] ? '✓' : '🔒'}</span>
                            </div>
                        </div>
                    ` : ''}
                    <div class="ach-modal-status">
                        <strong>状态：</strong>${isUnlocked ? '<span style="color:#55ff55;font-weight:bold;">已解锁 ✓</span>' : '<span style="color:#ff5555;font-weight:bold;">未解锁 🔒</span>'}
                    </div>
                </div>
                <div class="mc-button ach-modal-btn">我知道了</div>
            </div>
        `;

        detailModal.style.display = 'block';

        const closeModal = () => {
            detailModal.style.display = 'none';
        };

        detailModal.querySelector('.ach-modal-close-btn').onclick = closeModal;
        detailModal.querySelector('.ach-modal-btn').onclick = closeModal;
        detailModal.querySelector('.ach-modal-backdrop').onclick = closeModal;
    }

    // 8. 核心绘制面板：绘制包含树状分支、分类选项卡、SVG 连线的成就系统
    window.renderAchievementsList = function() {
        const container = document.getElementById('achievements-container');
        if (!container) return;

        // 重新构建容器结构，加入 Tab 导航条与 Map 视窗
        container.innerHTML = `
            <div class="ach-tabs-nav">
                <div class="ach-tab-btn ${activeTab === 'story' ? 'active' : ''}" data-tab="story">主世界</div>
                <div class="ach-tab-btn ${activeTab === 'dimension' ? 'active' : ''}" data-tab="dimension">末地与维度</div>
                <div class="ach-tab-btn ${activeTab === 'combat' ? 'active' : ''}" data-tab="combat">战斗冒险</div>
            </div>
            <div class="ach-map-viewport">
                <div class="ach-map-canvas-container" id="ach-map-canvas-container">
                    <svg class="ach-connector-svg" id="ach-connector-svg"></svg>
                    <!-- 成就节点将渲染在下方 -->
                </div>
            </div>
        `;

        // 绑定 Tab 点击事件
        const tabBtns = container.querySelectorAll('.ach-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = (e) => {
                activeTab = e.target.getAttribute('data-tab');
                window.renderAchievementsList();
            };
        });

        const mapContainer = document.getElementById('ach-map-canvas-container');
        const svgEl = document.getElementById('ach-connector-svg');
        if (!mapContainer || !svgEl) return;

        // 过滤属于当前选项卡的成就
        const tabAchs = Object.values(ACHIEVEMENTS).filter(ach => ach.tab === activeTab);

        // 自动计算画布大小
        let maxX = 700;
        let maxY = 300;
        tabAchs.forEach(ach => {
            if (ach.x + 200 > maxX) maxX = ach.x + 200;
            if (ach.y + 120 > maxY) maxY = ach.y + 120;
        });

        mapContainer.style.width = maxX + 'px';
        mapContainer.style.height = maxY + 'px';
        svgEl.setAttribute('width', maxX);
        svgEl.setAttribute('height', maxY);

        // 绘制 SVG 分支连线
        let svgContent = '';
        tabAchs.forEach(ach => {
            if (ach.parent && ACHIEVEMENTS[ach.parent]) {
                const parent = ACHIEVEMENTS[ach.parent];
                
                // 起点与终点中心点计算 (卡片大小一般为 120px X 50px)
                const startX = parent.x + 60;
                const startY = parent.y + 25;
                const endX = ach.x + 60;
                const endY = ach.y + 25;

                const parentUnlocked = !!window.achievementsProgress[parent.id];
                const childUnlocked = !!window.achievementsProgress[ach.id];

                // 连线发光等级 (两者皆解锁为黄金线，仅亲代解锁为亮绿线，未解锁为灰黑线)
                let strokeColor = '#3c3c3c';
                let strokeGlow = 'none';
                if (parentUnlocked && childUnlocked) {
                    strokeColor = '#ffff55';
                    strokeGlow = 'drop-shadow(0 0 6px #ffff55)';
                } else if (parentUnlocked) {
                    strokeColor = '#55ff55';
                    strokeGlow = 'drop-shadow(0 0 4px #55ff55)';
                }

                // 绘制带阴影的 Minecraft 双层边框连线
                svgContent += `
                    <!-- 黑色粗底线作为阴影 -->
                    <path d="M ${startX} ${startY} L ${endX} ${endY}" 
                          stroke="#111" stroke-width="8" stroke-linecap="square" fill="none" />
                    <!-- 内部发光彩色线 -->
                    <path d="M ${startX} ${startY} L ${endX} ${endY}" 
                          stroke="${strokeColor}" stroke-width="4" stroke-linecap="square" fill="none" 
                          style="filter: ${strokeGlow};" />
                `;
            }
        });
        svgEl.innerHTML = svgContent;

        // 渲染成就卡片节点
        tabAchs.forEach(ach => {
            const isUnlocked = !!window.achievementsProgress[ach.id];
            const node = document.createElement('div');
            
            // 设定卡片框架类别 (普通/目标/挑战)
            const frameType = ach.frame || 'normal';
            node.className = `ach-node-card ${frameType} ${isUnlocked ? 'unlocked' : 'locked'}`;
            node.style.left = ach.x + 'px';
            node.style.top = ach.y + 'px';

            const iconUrl = (window.icons && window.icons[ach.icon]) ? window.icons[ach.icon] : 'textures/' + ach.icon + '.png';

            node.innerHTML = `
                <div class="ach-node-icon" style="background-image: url('${iconUrl}')"></div>
                <div class="ach-node-text">
                    <div class="ach-node-title">${ach.title}</div>
                    <div class="ach-node-points">+${ach.points}</div>
                </div>
                ${isUnlocked ? '<div class="ach-node-check">✓</div>' : '<div class="ach-node-check locked-lock">🔒</div>'}
            `;

            // 点击节点查看达成方法
            node.onclick = () => {
                showAchievementDetail(ach);
            };

            mapContainer.appendChild(node);
        });

        // 渲染顶部概要进度条
        let summaryBar = document.getElementById('ach-top-summary');
        if (!summaryBar) {
            summaryBar = document.createElement('div');
            summaryBar.id = 'ach-top-summary';
            container.parentNode.insertBefore(summaryBar, container);
        }

        let unlockedCount = 0;
        let totalCount = Object.keys(ACHIEVEMENTS).length;
        let totalPoints = 0;
        for (let key in ACHIEVEMENTS) {
            if (window.achievementsProgress[key]) {
                unlockedCount++;
                totalPoints += ACHIEVEMENTS[key].points;
            }
        }

        summaryBar.innerHTML = `
            <div class="ach-summary-desc">
                已点亮进度: <span>${unlockedCount}/${totalCount}</span> | 累计成就积分: <span>${totalPoints} PTS</span>
            </div>
            <div class="ach-progress-border">
                <div class="ach-progress-fill" style="width: ${(unlockedCount / totalCount) * 100}%"></div>
            </div>
        `;
    };

    // 9. UI 事件绑定 (绑定返回按钮与成就按钮)
    setTimeout(() => {
        const btnAchievements = document.getElementById('btn-achievements');
        const btnBack = document.getElementById('btn-achievements-back');
        const achScreen = document.getElementById('achievements-screen');
        const pauseScreen = document.getElementById('pause-screen');

        if (btnAchievements) {
            btnAchievements.addEventListener('click', () => {
                window.openedAchievementsFromPause = true;
                pauseScreen.style.display = 'none';
                achScreen.style.display = 'flex';
                window.renderAchievementsList();
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', () => {
                achScreen.style.display = 'none';
                if (window.openedAchievementsFromPause) {
                    pauseScreen.style.display = 'flex';
                } else {
                    if (typeof controls !== 'undefined') controls.lock();
                }
            });
        }
    }, 1000);

    // 10. 注入完美的像素风与拟物化极高颜值的 CSS 样式
    const style = document.createElement('style');
    style.innerHTML = `
        /* Toast 弹出框容器 */
        #achievement-toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 100000;
            pointer-events: none;
        }

        /* 单个 Toast 项 */
        .achievement-toast-item {
            width: 300px;
            background: #212121;
            border: 4px solid #555;
            border-top-color: #888;
            border-left-color: #888;
            border-bottom-color: #111;
            border-right-color: #111;
            padding: 12px 18px;
            display: flex;
            align-items: center;
            gap: 14px;
            box-shadow: 4px 4px 15px rgba(0,0,0,0.6);
            transform: translateX(380px);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
            pointer-events: auto;
            position: relative;
        }

        .achievement-toast-item.toast-challenge {
            border-color: #aa00aa;
            border-top-color: #ff55ff;
            border-left-color: #ff55ff;
            background: #1a0a20;
            box-shadow: 0 0 15px rgba(255, 85, 255, 0.3);
        }

        .achievement-toast-item.show {
            transform: translateX(0);
            opacity: 1;
        }

        .ach-toast-icon {
            width: 40px;
            height: 40px;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            image-rendering: pixelated;
            flex-shrink: 0;
            filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.8));
        }

        .ach-toast-details {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .ach-toast-header {
            color: #ffff55;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 1px;
            text-shadow: 1px 1px 0 #000;
        }

        .toast-challenge .ach-toast-header {
            color: #ff55ff;
        }

        .ach-toast-name {
            color: #ffffff;
            font-size: 16px;
            font-weight: bold;
            text-shadow: 1.5px 1.5px 0 #000;
        }

        .ach-toast-points {
            position: absolute;
            right: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: #55ff55;
            font-size: 14px;
            font-family: monospace;
            font-weight: bold;
            text-shadow: 1.5px 1.5px 0 #000;
        }

        /* 顶部成就概要统计栏 */
        #ach-top-summary {
            width: 800px;
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .ach-summary-desc {
            color: #ccc;
            font-size: 16px;
            text-align: left;
            text-shadow: 1.5px 1.5px 0 #000;
        }

        .ach-summary-desc span {
            color: #ffff55;
            font-weight: bold;
        }

        .ach-progress-border {
            width: 100%;
            height: 12px;
            background: #111;
            border: 3px solid #555;
            border-bottom-color: #888;
            border-right-color: #888;
            box-sizing: border-box;
            border-radius: 2px;
            overflow: hidden;
        }

        .ach-progress-fill {
            height: 100%;
            background: #55ff55;
            box-shadow: 0 0 10px #55ff55;
            transition: width 0.5s ease-out;
        }

        /* 成就总布局视窗 */
        #achievements-container {
            width: 800px;
            height: 480px;
            background: #252525;
            border: 4px solid #3c3c3c;
            border-top-color: #1e1e1e;
            border-left-color: #1e1e1e;
            border-bottom-color: #5c5c5c;
            border-right-color: #5c5c5c;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: inset 0 0 30px rgba(0,0,0,0.85);
            position: relative;
        }

        /* 顶部选项卡 */
        .ach-tabs-nav {
            display: flex;
            background: #111;
            border-bottom: 3px solid #3c3c3c;
            height: 42px;
            flex-shrink: 0;
        }

        .ach-tab-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #aaa;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            border-right: 3px solid #3c3c3c;
            text-shadow: 1px 1px 0 #000;
            background: #1a1a1a;
            transition: color 0.15s, background-color 0.15s;
        }

        .ach-tab-btn:hover {
            color: #fff;
            background: #222;
        }

        .ach-tab-btn.active {
            color: #ffff55;
            background: #2e2e2e;
            border-bottom: 3px solid #ffff55;
            text-shadow: 1.5px 1.5px 0 #000;
        }

        /* 画布滚动视窗 */
        .ach-map-viewport {
            flex: 1;
            overflow: auto;
            position: relative;
            background: #141414;
            /* 原版深色石头底纹背景效果 */
            background-image: radial-gradient(circle, #252525 10%, transparent 11%), 
                              radial-gradient(circle, #252525 10%, transparent 11%);
            background-size: 20px 20px;
            background-position: 0 0, 10px 10px;
            box-shadow: inset 0 0 25px rgba(0,0,0,0.95);
        }

        .ach-map-canvas-container {
            position: relative;
            overflow: hidden;
        }

        .ach-connector-svg {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 1;
        }

        /* 成就节点卡片 */
        .ach-node-card {
            position: absolute;
            width: 130px;
            height: 52px;
            border: 3px solid #3c3c3c;
            padding: 5px 8px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            z-index: 2;
            box-shadow: 3px 3px 6px rgba(0,0,0,0.5);
            transition: transform 0.2s, filter 0.2s, box-shadow 0.2s;
        }

        .ach-node-card:hover {
            transform: scale(1.05);
            z-index: 10;
        }

        /* 不同类别的边框设计 */
        .ach-node-card.normal {
            background: #2e2e2e;
            border-color: #555;
            border-top-color: #888;
            border-left-color: #888;
            border-bottom-color: #1c1c1c;
            border-right-color: #1c1c1c;
            border-radius: 4px;
        }

        .ach-node-card.goal {
            background: #3e321a;
            border-color: #cda235;
            border-top-color: #ffd875;
            border-left-color: #ffd875;
            border-bottom-color: #644a10;
            border-right-color: #644a10;
            border-radius: 8px;
        }

        .ach-node-card.challenge {
            background: #2f183c;
            border-color: #a13cd3;
            border-top-color: #e58dff;
            border-left-color: #e58dff;
            border-bottom-color: #531175;
            border-right-color: #531175;
            border-radius: 50% 50% 0 0; /* 盾形 */
            clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }

        /* 锁止与解锁状态 */
        .ach-node-card.locked {
            filter: grayscale(0.85) brightness(0.6);
            opacity: 0.75;
        }

        .ach-node-card.unlocked {
            filter: none;
            opacity: 1;
        }

        .ach-node-card.unlocked.goal {
            box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
        }

        .ach-node-card.unlocked.challenge {
            box-shadow: 0 0 16px rgba(255, 85, 255, 0.45);
        }

        /* 图标 */
        .ach-node-icon {
            width: 32px;
            height: 32px;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            image-rendering: pixelated;
            flex-shrink: 0;
            filter: drop-shadow(1.5px 1.5px 0px rgba(0,0,0,0.8));
        }

        .ach-node-text {
            display: flex;
            flex-direction: column;
            text-align: left;
            overflow: hidden;
            width: 100%;
        }

        .ach-node-title {
            color: #fff;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            text-shadow: 1px 1px 0 #000;
        }

        .unlocked.goal .ach-node-title {
            color: #ffff55;
        }

        .unlocked.challenge .ach-node-title {
            color: #ff55ff;
        }

        .ach-node-points {
            color: #55ff55;
            font-size: 9px;
            font-family: monospace;
            text-shadow: 1px 1px 0 #000;
        }

        .ach-node-check {
            position: absolute;
            right: 4px;
            top: 2px;
            font-size: 9px;
            color: #55ff55;
            font-weight: bold;
            text-shadow: 1px 1px 0 #000;
        }

        .ach-node-check.locked-lock {
            color: #777;
        }

        /* 模态弹窗 - 达成方法查看 */
        #ach-detail-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 200000;
        }

        .ach-modal-backdrop {
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            position: absolute;
        }

        .ach-modal-box {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 480px;
            background: #252525;
            border: 4px solid #3c3c3c;
            border-top-color: #1e1e1e;
            border-left-color: #1e1e1e;
            border-bottom-color: #5c5c5c;
            border-right-color: #5c5c5c;
            box-shadow: 0 10px 25px rgba(0,0,0,0.85);
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 12px;
            text-align: left;
        }

        .ach-modal-close-btn {
            position: absolute;
            right: 15px;
            top: 10px;
            color: #888;
            font-size: 26px;
            cursor: pointer;
            transition: color 0.1s;
        }

        .ach-modal-close-btn:hover {
            color: #fff;
        }

        .ach-modal-header-row {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .ach-modal-icon {
            width: 52px;
            height: 52px;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            image-rendering: pixelated;
            filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.8));
        }

        .ach-modal-title-area {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .ach-modal-title {
            color: #ffff55;
            font-size: 22px;
            font-weight: bold;
            text-shadow: 2px 2px 0 #000;
        }

        .ach-modal-subtitle {
            color: #aaa;
            font-size: 12px;
            text-shadow: 1px 1px 0 #000;
        }

        .ach-modal-divider {
            height: 3px;
            background: #111;
            box-shadow: 0 1px 0 #3c3c3c;
        }

        .ach-modal-body {
            display: flex;
            flex-direction: column;
            gap: 10px;
            color: #eee;
            font-size: 14px;
            text-shadow: 1px 1px 0 #000;
        }

        .ach-modal-body strong {
            color: #ffaa00;
        }

        .ach-modal-desc, .ach-modal-hint, .ach-modal-reward, .ach-modal-status {
            line-height: 1.4;
        }

        .ach-modal-btn {
            margin-top: 10px;
            align-self: center;
            width: 140px;
        }

        /* 猎杀怪兽微型网格 */
        .ach-modal-subprogress {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin: 6px 0;
            padding: 8px;
            background: #141414;
            border: 2px solid #3c3c3c;
        }

        .ach-subprogress-list {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .ach-subprogress-list span {
            color: #888;
            font-size: 11px;
            padding: 2px 6px;
            background: #252525;
            border: 1px solid #444;
        }

        .ach-subprogress-list span.done {
            color: #55ff55;
            border-color: #55ff55;
            background: #1d2c1d;
        }
    `;
    document.head.appendChild(style);

    console.log("Minecraft Premium Achievements System fully loaded!");
})();
