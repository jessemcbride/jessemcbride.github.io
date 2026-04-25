(function () {
    'use strict';

    const canvas = document.getElementById('forest-canvas');
    const ctx = canvas.getContext('2d');

    let W, H, groundY;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        groundY = Math.floor(H * 0.68);
    }
    window.addEventListener('resize', resize);
    resize();

    // ── helpers ──────────────────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

    function lerpColor(a, b, t) {
        return [
            Math.round(lerp(a[0], b[0], t)),
            Math.round(lerp(a[1], b[1], t)),
            Math.round(lerp(a[2], b[2], t))
        ];
    }
    function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

    // ── stars ────────────────────────────────────────────────────────────────

    const STARS = Array.from({ length: 120 }, (_, i) => ({
        x: (i * 4397 + 113) % 1000 / 1000,
        y: (i * 2711 + 71) % 1000 / 1000 * 0.62,
        r: 0.5 + (i * 313) % 10 / 10 * 1.2,
        twinkle: (i * 179) % 1000 / 1000 * Math.PI * 2
    }));

    function drawStars(progress, elapsed) {
        const alpha = clamp(1 - progress / 0.25, 0, 1);
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        STARS.forEach(s => {
            const tw = 0.6 + 0.4 * Math.sin(elapsed * 1.1 + s.twinkle);
            ctx.fillStyle = `rgba(255,255,240,${tw})`;
            ctx.beginPath();
            ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    // ── sky ──────────────────────────────────────────────────────────────────

    function drawSky(progress) {
        const night  = [8, 8, 28];
        const dawn   = [255, 120, 60];
        const midday = [100, 180, 255];
        const dusk   = [255, 100, 80];

        let topC, botC;
        if (progress < 0.35) {
            const t = ease(progress / 0.35);
            topC = lerpColor(night, lerpColor(night, [40,10,60], 0.5), t);
            botC = lerpColor(night, dawn, t);
        } else {
            const t = ease(clamp((progress - 0.35) / 0.65, 0, 1));
            topC = lerpColor([10, 20, 80], midday, t);
            botC = lerpColor(dawn, [180, 225, 255], t);
        }

        const g = ctx.createLinearGradient(0, 0, 0, groundY);
        g.addColorStop(0, rgb(topC));
        g.addColorStop(1, rgb(botC));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, groundY);
    }

    // ── sun ──────────────────────────────────────────────────────────────────

    function drawSun(progress) {
        if (progress < 0.15) return;
        const t = ease(clamp((progress - 0.15) / 0.75, 0, 1));
        const sx = W * (0.12 + t * 0.55);
        const sy = groundY * (0.82 - t * 0.62);
        const r = 28;
        const alpha = clamp((progress - 0.15) / 0.15, 0, 1);

        ctx.save();
        ctx.globalAlpha = alpha * 0.35;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
        glow.addColorStop(0, 'rgba(255,220,80,0.8)');
        glow.addColorStop(1, 'rgba(255,180,40,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = t < 0.3 ? '#FF9040' : '#FFD700';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── ground ───────────────────────────────────────────────────────────────

    function drawGround(progress) {
        const soilDark = lerpColor([55, 30, 10], [50, 80, 30], clamp(progress * 2, 0, 1));
        const soilLight = lerpColor([90, 55, 20], [80, 130, 50], clamp(progress * 2, 0, 1));

        const g = ctx.createLinearGradient(0, groundY, 0, H);
        g.addColorStop(0, rgb(soilLight));
        g.addColorStop(0.3, rgb(soilDark));
        g.addColorStop(1, rgb([30, 15, 5]));
        ctx.fillStyle = g;
        ctx.fillRect(0, groundY, W, H - groundY);
    }

    // ── grass ────────────────────────────────────────────────────────────────

    const GRASS = Array.from({ length: 80 }, (_, i) => ({
        x: (i * 293 + 17) % 1000 / 1000,
        h: 8 + (i * 137) % 14,
        lean: ((i * 73) % 20 - 10) * 0.06,
        thick: 1 + (i * 47) % 3
    }));

    function drawGrass(progress) {
        if (progress <= 0) return;
        const alpha = ease(clamp(progress / 0.4, 0, 1));
        ctx.save();
        ctx.globalAlpha = alpha;

        const green = lerpColor([30, 100, 30], [60, 160, 60], clamp(progress, 0, 1));
        ctx.strokeStyle = rgb(green);

        GRASS.forEach(g => {
            ctx.lineWidth = g.thick;
            const bx = g.x * W;
            const by = groundY - 1;
            const tip = g.h * ease(clamp(progress * 3, 0, 1));
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(
                bx + g.lean * tip * 0.7, by - tip * 0.6,
                bx + g.lean * tip, by - tip
            );
            ctx.stroke();
        });
        ctx.restore();
    }

    // ── underground seed ─────────────────────────────────────────────────────

    function drawSeed(progress) {
        const alpha = clamp(1 - progress / 0.08, 0, 1);
        if (alpha <= 0) return;

        const x = W / 2, y = groundY + 38;
        ctx.save();
        ctx.globalAlpha = alpha;

        // tiny root lines
        ctx.strokeStyle = '#7a5c2a';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x - 8, y + 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + 6, y + 20); ctx.stroke();

        ctx.fillStyle = '#8B6914';
        ctx.strokeStyle = '#5a3d0a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // seed line
        ctx.strokeStyle = '#c8a050';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 11); ctx.stroke();
        ctx.restore();
    }

    // ── sprout ───────────────────────────────────────────────────────────────

    function drawSprout(progress) {
        if (progress <= 0) return;
        const fadeOut = progress > 0.75 ? clamp(1 - (progress - 0.75) / 0.25, 0, 1) : 1;
        if (fadeOut <= 0) return;

        const h = 32 * ease(clamp(progress / 0.5, 0, 1));
        const x = W / 2;

        ctx.save();
        ctx.globalAlpha = fadeOut;

        // stem
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.bezierCurveTo(x + 3, groundY - h * 0.4, x - 3, groundY - h * 0.7, x, groundY - h);
        ctx.stroke();

        // cotyledon leaves
        if (progress > 0.3) {
            const lt = ease(clamp((progress - 0.3) / 0.5, 0, 1));
            const ls = 13 * lt;
            ctx.fillStyle = '#66bb6a';
            ctx.save();
            ctx.translate(x, groundY - h + 4);
            ctx.rotate(-0.25);
            ctx.beginPath();
            ctx.ellipse(-ls * 0.9, 0, ls, ls * 0.45, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.translate(x, groundY - h + 4);
            ctx.rotate(0.25);
            ctx.beginPath();
            ctx.ellipse(ls * 0.9, 0, ls, ls * 0.45, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    // ── tree branch (recursive) ──────────────────────────────────────────────

    function branch(x, y, angle, len, depth, leafAlpha, windOffset) {
        if (depth === 0 || len < 2) return;
        const wo = windOffset * (1 / (depth + 1));
        const ex = x + Math.sin(angle + wo) * len;
        const ey = y - Math.cos(angle + wo) * len;

        ctx.lineWidth = Math.max(0.8, depth * 1.3);
        ctx.strokeStyle = depth > 2 ? '#5a3410' : '#3d6e30';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        if (depth <= 2 && leafAlpha > 0) {
            const lr = len * 0.9;
            ctx.save();
            ctx.globalAlpha *= leafAlpha;
            const hue = 110 + depth * 8;
            ctx.fillStyle = `hsl(${hue},60%,35%)`;
            ctx.beginPath();
            ctx.arc(ex, ey, lr, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const spread = 0.38 + depth * 0.015;
        branch(ex, ey, angle - spread, len * 0.68, depth - 1, leafAlpha, windOffset);
        branch(ex, ey, angle + spread, len * 0.68, depth - 1, leafAlpha, windOffset);
        if (depth > 3) {
            branch(ex, ey, angle, len * 0.6, depth - 2, leafAlpha, windOffset);
        }
    }

    function drawTree(cx, baseY, progress, maxH, maxDepth, windOffset, leafAlpha) {
        if (progress <= 0) return;
        const h = maxH * ease(clamp(progress, 0, 1));
        const trunkW = Math.max(2, h * 0.038);

        // trunk
        ctx.strokeStyle = '#4a2508';
        ctx.lineWidth = trunkW;
        ctx.beginPath();
        ctx.moveTo(cx, baseY);
        ctx.lineTo(cx, baseY - h);
        ctx.stroke();

        // branches
        if (progress > 0.25) {
            const bp = clamp((progress - 0.25) / 0.75, 0, 1);
            const depth = Math.max(1, Math.floor(bp * maxDepth));
            const la = leafAlpha * ease(clamp((progress - 0.4) / 0.6, 0, 1));
            branch(cx, baseY - h, 0, h * 0.42, depth, la, windOffset);
        }
    }

    // ── forest layout ─────────────────────────────────────────────────────────

    const SIDE_TREES = [
        // [xFrac, groundYFrac, delay, scaleH, maxDepth, leafBrightness]
        [0.28, 1.0,  0.10, 0.82, 5, 1.0],
        [0.72, 1.0,  0.14, 0.85, 5, 1.0],
        [0.10, 1.02, 0.24, 0.60, 4, 0.8],
        [0.90, 1.02, 0.28, 0.62, 4, 0.8],
        [0.44, 1.0,  0.38, 0.70, 4, 0.9],
        [0.58, 1.0,  0.42, 0.68, 4, 0.9],
        [0.04, 1.04, 0.52, 0.50, 3, 0.7],
        [0.96, 1.04, 0.55, 0.48, 3, 0.7],
        [0.18, 1.01, 0.60, 0.55, 3, 0.75],
        [0.82, 1.01, 0.63, 0.58, 3, 0.75],
    ];

    function drawForest(forestProgress, windOffset) {
        SIDE_TREES.forEach(([xf, gyf, delay, scale, depth, lb]) => {
            const tp = clamp((forestProgress - delay) / (1 - delay + 0.001), 0, 1);
            if (tp <= 0) return;
            const maxH = H * 0.42 * scale;
            drawTree(W * xf, groundY * gyf, tp, maxH, depth, windOffset * 0.6, lb);
        });
    }

    // ── birds ─────────────────────────────────────────────────────────────────

    const BIRDS = Array.from({ length: 6 }, (_, i) => ({
        x: -60 - i * 110,
        y: H * (0.12 + i * 0.04),
        spd: 0.9 + i * 0.25,
        phase: i * 1.3,
        sz: 0.7 + i * 0.12
    }));

    function updateBirds(dt, progress) {
        if (progress < 0.78) return;
        BIRDS.forEach(b => {
            b.x += b.spd * dt * 60;
            if (b.x > W + 80) b.x = -80 - Math.random() * 100;
            b.phase += dt * 2.8;
        });
    }

    function drawBirds(progress) {
        if (progress < 0.78) return;
        const alpha = ease(clamp((progress - 0.78) / 0.12, 0, 1));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(30,20,10,0.7)';
        BIRDS.forEach(b => {
            const flap = Math.sin(b.phase) * 6 * b.sz;
            ctx.lineWidth = 1.2 * b.sz;
            ctx.beginPath();
            ctx.moveTo(b.x - 9 * b.sz, b.y - flap);
            ctx.quadraticCurveTo(b.x, b.y + 2, b.x + 9 * b.sz, b.y - flap);
            ctx.stroke();
        });
        ctx.restore();
    }

    // ── nameplate ─────────────────────────────────────────────────────────────

    function drawNameplate(progress) {
        if (progress < 0.72) return;
        const alpha = ease(clamp((progress - 0.72) / 0.2, 0, 1));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tx = W / 2;
        const ty = H * 0.84;

        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 12;
        ctx.font = `bold ${Math.round(W * 0.032)}px Ubuntu, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText('Jesse McBride', tx, ty);

        ctx.shadowBlur = 6;
        ctx.font = `300 ${Math.round(W * 0.016)}px Ubuntu, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText('Full-stack developer · Orlando, FL', tx, ty + Math.round(W * 0.032) * 1.4);

        ctx.restore();
    }

    // ── main loop ─────────────────────────────────────────────────────────────

    const TOTAL = 36; // seconds for full animation
    let startTime = null;
    let lastTime = null;
    let elapsed = 0;

    function frame(ts) {
        if (!startTime) startTime = ts;
        const dt = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0;
        lastTime = ts;
        elapsed = (ts - startTime) / 1000;

        const progress = clamp(elapsed / TOTAL, 0, 1);

        // gentle wind sway
        const wind = Math.sin(elapsed * 0.4) * 0.04 + Math.sin(elapsed * 1.1) * 0.02;

        ctx.clearRect(0, 0, W, H);

        drawSky(progress);
        drawStars(progress, elapsed);
        drawSun(progress);
        drawGround(progress);
        drawGrass(clamp((progress - 0.09) / 0.5, 0, 1));

        // seed: visible before sprout (0–0.06)
        drawSeed(progress);

        // sprout: 0.05–0.22
        drawSprout(clamp((progress - 0.05) / 0.17, 0, 1));

        // main tree: 0.18–0.58
        const mainTreeP = clamp((progress - 0.18) / 0.4, 0, 1);
        drawTree(W / 2, groundY, mainTreeP, H * 0.45, 6, wind, 1.0);

        // forest: 0.5–0.95
        const forestP = clamp((progress - 0.5) / 0.45, 0, 1);
        drawForest(forestP, wind);

        updateBirds(dt, progress);
        drawBirds(progress);
        drawNameplate(progress);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();
