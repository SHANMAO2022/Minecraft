// ==========================================
function buildPlayerMesh(skinDataURL, playerName) {
    const group = new THREE.Group();
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = skinDataURL || 'textures/steve.png';
    
    img.onload = () => {
        function getTex(x, y, tw, th) {
            const c = document.createElement('canvas'); c.width = tw; c.height = th;
            const ctx = c.getContext('2d'); ctx.drawImage(img, x, y, tw, th, 0, 0, tw, th);
            const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
            return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
        }
        function getBoxMats(ox, oy, w, h, d) {
            return [
                getTex(ox + d + w, oy + d, d, h), // Right
                getTex(ox, oy + d, d, h),         // Left
                getTex(ox + d, oy, w, d),         // Top
                getTex(ox + d + w, oy, w, d),     // Bottom
                getTex(ox + d, oy + d, w, h),     // Front
                getTex(ox + d + w + d, oy + d, w, h) // Back
            ];
        }
        function buildPart(ox, oy, w, h, d, inflate = 0) {
            const geo = new THREE.BoxGeometry(w / 16 + inflate, h / 16 + inflate, d / 16 + inflate);
            return new THREE.Mesh(geo, getBoxMats(ox, oy, w, h, d));
        }

        // --- 核心坐标对齐 (以脚底为 0,0,0) ---
        // 腿部 (4x12x4)
        const legL = buildPart(16, 48, 4, 12, 4); 
        legL.position.set(2/16, 6/16, 0); 
        group.add(legL);
        
        const legR = buildPart(0, 16, 4, 12, 4); 
        legR.position.set(-2/16, 6/16, 0); 
        group.add(legR);

        // 身体 (8x12x4)
        const body = buildPart(16, 16, 8, 12, 4);
        body.position.set(0, 18/16, 0);
        group.add(body);

        // 手臂 (4x12x4)
        const armL = buildPart(32, 48, 4, 12, 4);
        armL.position.set(6/16, 18/16, 0);
        group.add(armL);
        
        const armR = buildPart(40, 16, 4, 12, 4);
        armR.position.set(-6/16, 18/16, 0);
        group.add(armR);

        // 头部 (8x8x8)
        const head = buildPart(0, 0, 8, 8, 8);
        head.position.set(0, 28/16, 0);
        group.add(head);

        // 盔甲/外层
        const hat = buildPart(32, 0, 8, 8, 8, 0.05);
        head.add(hat);

        const jacket = buildPart(16, 32, 8, 12, 4, 0.05);
        body.add(jacket);

        group.arms = [armL, armR];
        group.legs = [legL, legR];
    };

    // 名字标签
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d'); 
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = 'white'; ctx.font = '30px Arial'; ctx.textAlign = 'center'; 
    ctx.fillText(playerName || 'Player', 128, 40);
    const nameTex = new THREE.CanvasTexture(canvas);
    const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex }));
    nameSprite.position.y = 2.5; 
    nameSprite.scale.set(1.5, 0.375, 1);
    group.add(nameSprite);
    group.nameSprite = nameSprite;

    group.arms = []; group.legs = []; // 初始化防止报错
    return group;
}
// ==========================================