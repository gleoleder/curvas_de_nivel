/* ================================================
   CURVAS DE NIVEL - JAVASCRIPT INTERACTIVO
   Elaborado por John Leonardo Cabrera Espíndola
   ================================================ */

// Global variables
let terrainData = [];
let resolution = 150;
let maxHeight = 200;
let contourInterval = 20;
let profileLine = { start: null, end: null };
let isDragging = false;

// Three.js variables
let scene, camera, renderer, terrain3D;
let currentRenderStyle = 'elevation';

// Camera control variables
let targetRotationX = 0.6;
let targetRotationY = 0;
let cameraDistance = 2.5;
let isMouseDown = false;
let mouseX = 0, mouseY = 0;

// OPTIMIZATION: Cache variables
let terrainImageCache = null;
let isAnimationFramePending = false;
let lastDrawTime = 0;
const THROTTLE_MS = 32; // ~30fps during drag for smooth performance

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initCanvas2D();
    initCanvasProfile();
    initCanvas3D();
    
    // Set default profile line
    profileLine = {
        start: { x: 0.15, y: 0.5 },
        end: { x: 0.85, y: 0.5 }
    };
    
    updateTerrain();
});

// Section navigation
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
    
    if (sectionId === 'interactive') {
        setTimeout(() => {
            resizeCanvases();
            updateTerrain();
        }, 100);
    }
}

// ============================================
// TERRAIN GENERATION FUNCTIONS
// ============================================

function generateTerrain(type) {
    const res = parseInt(document.getElementById('resolution').value);
    resolution = res;
    maxHeight = parseInt(document.getElementById('maxHeight').value);
    document.getElementById('heightValue').textContent = maxHeight;
    
    terrainData = [];
    
    for (let y = 0; y < res; y++) {
        terrainData[y] = [];
        for (let x = 0; x < res; x++) {
            const nx = x / res - 0.5;
            const ny = y / res - 0.5;
            let elevation = 0;
            
            switch(type) {
                case 'mountain': elevation = mountainTerrain(nx, ny); break;
                case 'valley': elevation = valleyTerrain(nx, ny); break;
                case 'ridge': elevation = ridgeTerrain(nx, ny); break;
                case 'crater': elevation = craterTerrain(nx, ny); break;
                case 'hills': elevation = hillsTerrain(nx, ny); break;
                case 'plateau': elevation = plateauTerrain(nx, ny); break;
                case 'canyon': elevation = canyonTerrain(nx, ny); break;
                case 'volcanic': elevation = volcanicTerrain(nx, ny); break;
                case 'archipelago': elevation = archipelagoTerrain(nx, ny); break;
                case 'glacier': elevation = glacierTerrain(nx, ny); break;
                case 'karst': elevation = karstTerrain(nx, ny); break;
                case 'dunes': elevation = dunesTerrain(nx, ny); break;
                case 'fjord': elevation = fjordTerrain(nx, ny); break;
                case 'caldera': elevation = calderaTerrain(nx, ny); break;
                case 'badlands': elevation = badlandsTerrain(nx, ny); break;
                case 'terraces': elevation = terracesTerrain(nx, ny); break;
            }
            
            terrainData[y][x] = Math.max(0, elevation * maxHeight);
        }
    }
    
    // Invalidate cache when terrain changes
    terrainImageCache = null;
    
    return terrainData;
}

// Noise function for complex terrains
function noise2D(x, y, seed) {
    seed = seed || 0;
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

function smoothNoise(x, y, scale, seed) {
    seed = seed || 0;
    const sx = x * scale;
    const sy = y * scale;
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const fx = sx - x0;
    const fy = sy - y0;
    
    const v00 = noise2D(x0, y0, seed);
    const v10 = noise2D(x0 + 1, y0, seed);
    const v01 = noise2D(x0, y0 + 1, seed);
    const v11 = noise2D(x0 + 1, y0 + 1, seed);
    
    const i1 = v00 * (1 - fx) + v10 * fx;
    const i2 = v01 * (1 - fx) + v11 * fx;
    
    return i1 * (1 - fy) + i2 * fy;
}

function fbm(x, y, octaves, seed) {
    octaves = octaves || 4;
    seed = seed || 0;
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    
    for (let i = 0; i < octaves; i++) {
        value += amplitude * smoothNoise(x, y, frequency * 4, seed + i * 100);
        amplitude *= 0.5;
        frequency *= 2;
    }
    
    return value;
}

// Basic terrain types
function mountainTerrain(x, y) {
    const dist = Math.sqrt(x*x + y*y);
    const base = Math.max(0, 1 - dist * 2.2) * Math.exp(-dist * 1.5);
    const detail = fbm(x, y, 3, 42) * 0.15;
    return base + detail * (1 - dist * 2);
}

function valleyTerrain(x, y) {
    const ridge = Math.abs(x) * 2;
    const valleyShape = Math.pow(Math.abs(y), 0.6);
    const detail = fbm(x, y, 3, 123) * 0.1;
    return 0.25 + ridge * 0.5 + valleyShape * 0.4 + detail;
}

function ridgeTerrain(x, y) {
    const mainRidge = Math.exp(-Math.pow(y * 2.5, 2)) * (1 - Math.abs(x) * 1.3);
    const secondary = Math.exp(-Math.pow((y - 0.25) * 4, 2)) * 0.6 * (1 - Math.abs(x + 0.15) * 2);
    const tertiary = Math.exp(-Math.pow((y + 0.2) * 3.5, 2)) * 0.4 * (1 - Math.abs(x - 0.1) * 2);
    const detail = fbm(x, y, 3, 77) * 0.08;
    return Math.max(0, mainRidge + secondary + tertiary + detail) * 0.75 + 0.1;
}

function craterTerrain(x, y) {
    const dist = Math.sqrt(x*x + y*y);
    const rim = Math.exp(-Math.pow((dist - 0.28) * 7, 2));
    const floor = Math.max(0, 0.25 - dist * 0.6);
    const ejecta = Math.exp(-dist * 3) * 0.15;
    const detail = fbm(x, y, 2, 55) * 0.05;
    return rim * 0.85 + floor * 0.3 + ejecta + detail + 0.08;
}

function hillsTerrain(x, y) {
    let elevation = 0;
    const hills = [
        {x: 0.22, y: 0.18, h: 0.85, r: 0.16},
        {x: -0.18, y: -0.12, h: 0.65, r: 0.13},
        {x: 0.08, y: -0.28, h: 0.75, r: 0.19},
        {x: -0.16, y: 0.22, h: 0.55, r: 0.11},
        {x: 0.32, y: -0.12, h: 0.45, r: 0.09},
        {x: -0.3, y: -0.25, h: 0.5, r: 0.12},
        {x: 0.15, y: 0.35, h: 0.4, r: 0.1}
    ];
    
    for (let i = 0; i < hills.length; i++) {
        const hill = hills[i];
        const dist = Math.sqrt(Math.pow(x - hill.x, 2) + Math.pow(y - hill.y, 2));
        elevation += hill.h * Math.exp(-Math.pow(dist / hill.r, 2));
    }
    
    const detail = fbm(x, y, 3, 88) * 0.1;
    return elevation * 0.65 + detail + 0.08;
}

function plateauTerrain(x, y) {
    const dist = Math.max(Math.abs(x), Math.abs(y));
    const plateau = dist < 0.28 ? 0.85 : 0.85 * Math.exp(-Math.pow((dist - 0.28) * 4.5, 2));
    const edge = Math.max(0, 1 - dist * 1.8) * 0.08;
    const erosion = fbm(x, y, 4, 33) * 0.12;
    return plateau * 0.75 + edge + erosion + 0.08;
}

function canyonTerrain(x, y) {
    const canyonWidth = 0.09 + Math.sin(y * 8) * 0.035 + Math.sin(y * 15) * 0.015;
    const inCanyon = Math.abs(x) < canyonWidth;
    const canyonDepth = inCanyon ? Math.pow(Math.abs(x) / canyonWidth, 0.4) : 1;
    const walls = Math.exp(-Math.pow((Math.abs(x) - canyonWidth) * 8, 2)) * 0.35;
    const detail = fbm(x, y, 3, 44) * 0.08;
    return canyonDepth * 0.65 + walls + detail + 0.18;
}

function volcanicTerrain(x, y) {
    const dist = Math.sqrt(x*x + y*y);
    const cone = Math.max(0, 1 - dist * 1.8) * 0.95;
    const crater = dist < 0.12 ? -0.35 * (1 - dist / 0.12) : 0;
    const lavaFlows = Math.sin(Math.atan2(y, x) * 6) * 0.06 * (1 - dist);
    const detail = fbm(x, y, 2, 66) * 0.06;
    return Math.max(0, cone + crater + lavaFlows + detail + 0.08);
}

// Advanced terrain types
function archipelagoTerrain(x, y) {
    let elevation = 0;
    const islands = [
        {x: 0.0, y: 0.0, h: 0.9, r: 0.2},
        {x: 0.3, y: 0.15, h: 0.6, r: 0.12},
        {x: -0.25, y: 0.2, h: 0.5, r: 0.1},
        {x: 0.15, y: -0.3, h: 0.7, r: 0.14},
        {x: -0.35, y: -0.15, h: 0.4, r: 0.08},
        {x: 0.35, y: -0.2, h: 0.35, r: 0.07},
        {x: -0.1, y: 0.35, h: 0.45, r: 0.09},
        {x: 0.25, y: 0.35, h: 0.3, r: 0.06}
    ];
    
    for (let i = 0; i < islands.length; i++) {
        const island = islands[i];
        const dist = Math.sqrt(Math.pow(x - island.x, 2) + Math.pow(y - island.y, 2));
        const peak = island.h * Math.exp(-Math.pow(dist / island.r, 1.8));
        elevation = Math.max(elevation, peak);
    }
    
    const seaLevel = 0.2;
    const underwater = fbm(x, y, 3, 111) * 0.15;
    return Math.max(elevation, seaLevel + underwater * 0.3);
}

function glacierTerrain(x, y) {
    const mainGlacier = Math.exp(-Math.pow(x * 2.5, 2)) * (0.8 - y * 0.8);
    const cirque = Math.exp(-Math.pow((y + 0.35) * 3, 2) - Math.pow(x * 2, 2)) * 0.3;
    const moraine = Math.exp(-Math.pow((y - 0.2) * 5, 2)) * Math.abs(x) * 0.4;
    const crevasses = Math.sin(x * 30 + y * 10) * 0.02 * mainGlacier;
    const detail = fbm(x, y, 3, 222) * 0.08;
    return Math.max(0, mainGlacier + cirque + moraine + crevasses + detail + 0.1);
}

function karstTerrain(x, y) {
    let elevation = 0.6;
    
    for (let i = 0; i < 12; i++) {
        const sx = (noise2D(i * 7, 0, 333) - 0.5) * 0.9;
        const sy = (noise2D(0, i * 7, 333) - 0.5) * 0.9;
        const sr = 0.05 + noise2D(i, i, 333) * 0.08;
        const dist = Math.sqrt(Math.pow(x - sx, 2) + Math.pow(y - sy, 2));
        if (dist < sr) {
            elevation -= (sr - dist) / sr * 0.4;
        }
    }
    
    for (let i = 0; i < 8; i++) {
        const tx = (noise2D(i * 5, 100, 444) - 0.5) * 0.8;
        const ty = (noise2D(100, i * 5, 444) - 0.5) * 0.8;
        const dist = Math.sqrt(Math.pow(x - tx, 2) + Math.pow(y - ty, 2));
        elevation += 0.35 * Math.exp(-Math.pow(dist / 0.08, 2));
    }
    
    const detail = fbm(x, y, 4, 555) * 0.12;
    return Math.max(0.1, elevation + detail);
}

function dunesTerrain(x, y) {
    const mainDunes = Math.sin(x * 15 + y * 3) * 0.15 + Math.sin(x * 8 - y * 2) * 0.1;
    const megaDune = Math.exp(-Math.pow(y * 2, 2)) * 0.3;
    const windward = (Math.sin(x * 15 + y * 3) > 0) ? 0.05 : 0;
    const ripples = Math.sin(x * 40 + y * 8) * 0.02;
    const variation = fbm(x, y, 2, 666) * 0.1;
    return 0.3 + mainDunes + megaDune + windward + ripples + variation;
}

function fjordTerrain(x, y) {
    const fjordPath = Math.sin(y * 4) * 0.15;
    const inFjord = Math.abs(x - fjordPath) < 0.1;
    const fjordDepth = inFjord ? Math.pow(Math.abs(x - fjordPath) / 0.1, 0.3) * 0.3 : 0.8;
    const cliffs = Math.exp(-Math.pow((Math.abs(x - fjordPath) - 0.1) * 8, 2)) * 0.5;
    const mountains = (1 - Math.abs(x - fjordPath) * 1.5) * 0.4 * (1 + Math.sin(y * 6) * 0.3);
    const detail = fbm(x, y, 3, 777) * 0.1;
    return Math.max(fjordDepth, cliffs + mountains) + detail;
}

function calderaTerrain(x, y) {
    const dist = Math.sqrt(x*x + y*y);
    const outerRim = Math.exp(-Math.pow((dist - 0.35) * 5, 2)) * 0.9;
    const innerRim = Math.exp(-Math.pow((dist - 0.2) * 8, 2)) * 0.4;
    const floor = dist < 0.18 ? 0.25 : 0;
    const resurgentDome = Math.exp(-Math.pow(dist / 0.08, 2)) * 0.35;
    const erosion = fbm(x, y, 3, 888) * 0.08;
    const asymmetry = Math.exp(-Math.pow((dist - 0.35) * 5, 2)) * Math.sin(Math.atan2(y, x) * 3) * 0.15;
    return outerRim + innerRim + floor + resurgentDome + erosion + asymmetry + 0.1;
}

function badlandsTerrain(x, y) {
    const baseSlope = 0.5 - y * 0.3;
    const gullies = Math.sin(x * 20 + fbm(x, y, 2, 999) * 5) * 0.1;
    const ridges = Math.abs(Math.sin(x * 12 + y * 3)) * 0.15;
    const hoodoos = fbm(x * 3, y * 3, 4, 1000) * 0.2;
    const erosionChannels = Math.sin(y * 25 + x * 5) * 0.05 * (0.5 + y);
    return Math.max(0.1, baseSlope + gullies + ridges + hoodoos + erosionChannels);
}

function terracesTerrain(x, y) {
    const baseSlope = 0.8 - y * 0.6 - x * 0.2;
    const numTerraces = 8;
    const terraceHeight = 1.0 / numTerraces;
    const terraced = Math.floor(baseSlope / terraceHeight) * terraceHeight;
    const risers = (baseSlope % terraceHeight) < 0.02 ? 0.03 : 0;
    const irrigation = Math.sin(x * 30 + y * 5) * 0.01;
    const variation = fbm(x, y, 2, 1111) * 0.05;
    return Math.max(0.1, terraced + risers + irrigation + variation);
}

// ============================================
// CANVAS 2D SETUP AND DRAWING
// ============================================

function initCanvas2D() {
    const canvas = document.getElementById('canvas2d');
    resizeCanvas2D();
    
    canvas.addEventListener('mousedown', startProfile);
    canvas.addEventListener('mousemove', throttledUpdateProfile);
    canvas.addEventListener('mouseup', endProfile);
    canvas.addEventListener('mouseleave', endProfile);
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', endProfile);
}

function resizeCanvas2D() {
    const canvas = document.getElementById('canvas2d');
    const wrapper = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    canvas.width = wrapper.clientWidth * dpr;
    canvas.height = wrapper.clientHeight * dpr;
    canvas.style.width = wrapper.clientWidth + 'px';
    canvas.style.height = wrapper.clientHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    terrainImageCache = null;
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    startProfile({ 
        clientX: touch.clientX, 
        clientY: touch.clientY, 
        target: e.target 
    });
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    throttledUpdateProfile({ 
        clientX: touch.clientX, 
        clientY: touch.clientY, 
        target: e.target 
    });
}

function startProfile(e) {
    isDragging = true;
    const rect = e.target.getBoundingClientRect();
    profileLine.start = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
    };
    profileLine.end = { x: profileLine.start.x, y: profileLine.start.y };
}

// OPTIMIZATION: Throttled update function
function throttledUpdateProfile(e) {
    if (!isDragging) return;
    
    const now = Date.now();
    if (now - lastDrawTime < THROTTLE_MS) {
        return;
    }
    lastDrawTime = now;
    
    const rect = e.target.getBoundingClientRect();
    profileLine.end = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    };
    
    if (!isAnimationFramePending) {
        isAnimationFramePending = true;
        requestAnimationFrame(function() {
            draw2DOptimized();
            drawProfileOptimized();
            isAnimationFramePending = false;
        });
    }
}

function endProfile() {
    if (isDragging) {
        isDragging = false;
        draw2D();
        drawProfile();
    }
}

// OPTIMIZATION: Create terrain image cache
function createTerrainCache() {
    const canvas = document.getElementById('canvas2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Draw background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(1, '#0d1f35');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    // Draw elevation colors
    const cellW = width / resolution;
    const cellH = height / resolution;
    
    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const elev = terrainData[y][x];
            ctx.fillStyle = getElevationColor(elev / maxHeight);
            ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
        }
    }
    
    // Draw contour lines
    contourInterval = parseInt(document.getElementById('contourInterval').value);
    const levels = [];
    for (let h = contourInterval; h <= maxHeight; h += contourInterval) {
        levels.push(h);
    }
    
    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const isMaster = level % (contourInterval * 5) === 0;
        ctx.strokeStyle = isMaster ? '#fbbf24' : 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = isMaster ? 2.5 : 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        drawContourLevel(ctx, level, width, height);
        
        if (isMaster) {
            drawContourLabels(ctx, level, width, height);
        }
    }
    
    terrainImageCache = offscreen;
    updateLegend(levels);
}

// OPTIMIZATION: Fast draw using cache
function draw2DOptimized() {
    const canvas = document.getElementById('canvas2d');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    
    if (!terrainImageCache) {
        createTerrainCache();
    }
    
    ctx.drawImage(terrainImageCache, 0, 0, width, height);
    drawProfileLine(ctx, width, height);
}

function draw2D() {
    const canvas = document.getElementById('canvas2d');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    
    if (!terrainImageCache) {
        createTerrainCache();
    }
    
    ctx.drawImage(terrainImageCache, 0, 0, width, height);
    drawProfileLine(ctx, width, height);
}

function drawProfileLine(ctx, width, height) {
    if (!profileLine.start || !profileLine.end) return;
    
    ctx.save();
    
    // Glow effect
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 15;
    
    const gradient = ctx.createLinearGradient(
        profileLine.start.x * width, profileLine.start.y * height,
        profileLine.end.x * width, profileLine.end.y * height
    );
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#ffa500');
    gradient.addColorStop(1, '#ff6b6b');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(profileLine.start.x * width, profileLine.start.y * height);
    ctx.lineTo(profileLine.end.x * width, profileLine.end.y * height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw endpoints
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(profileLine.start.x * width, profileLine.start.y * height, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(profileLine.end.x * width, profileLine.end.y * height, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', profileLine.start.x * width, profileLine.start.y * height - 18);
    ctx.fillText('B', profileLine.end.x * width, profileLine.end.y * height - 18);
    
    ctx.restore();
}

function drawContourLevel(ctx, level, width, height) {
    ctx.beginPath();
    
    for (let y = 0; y < resolution - 1; y++) {
        for (let x = 0; x < resolution - 1; x++) {
            const v0 = terrainData[y][x];
            const v1 = terrainData[y][x + 1];
            const v2 = terrainData[y + 1][x + 1];
            const v3 = terrainData[y + 1][x];
            
            const px = x * width / resolution;
            const py = y * height / resolution;
            const cellW = width / resolution;
            const cellH = height / resolution;
            
            const config = 
                (v0 >= level ? 8 : 0) +
                (v1 >= level ? 4 : 0) +
                (v2 >= level ? 2 : 0) +
                (v3 >= level ? 1 : 0);
            
            const points = getMarchingSquaresPoints(config, v0, v1, v2, v3, level, px, py, cellW, cellH);
            
            for (let i = 0; i < points.length; i += 2) {
                ctx.moveTo(points[i].x, points[i].y);
                ctx.lineTo(points[i + 1].x, points[i + 1].y);
            }
        }
    }
    
    ctx.stroke();
}

function getMarchingSquaresPoints(config, v0, v1, v2, v3, level, px, py, w, h) {
    const points = [];
    
    function getT(va, vb) {
        const diff = vb - va;
        if (Math.abs(diff) < 0.0001) return 0.5;
        return Math.max(0, Math.min(1, (level - va) / diff));
    }
    
    const top = { x: px + w * getT(v0, v1), y: py };
    const right = { x: px + w, y: py + h * getT(v1, v2) };
    const bottom = { x: px + w * getT(v3, v2), y: py + h };
    const left = { x: px, y: py + h * getT(v0, v3) };
    
    switch(config) {
        case 1: case 14: points.push(left, bottom); break;
        case 2: case 13: points.push(bottom, right); break;
        case 3: case 12: points.push(left, right); break;
        case 4: case 11: points.push(top, right); break;
        case 5: points.push(left, top, bottom, right); break;
        case 6: case 9: points.push(top, bottom); break;
        case 7: case 8: points.push(left, top); break;
        case 10: points.push(left, bottom, top, right); break;
    }
    
    return points;
}

function drawContourLabels(ctx, level, width, height) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    for (let y = resolution / 4; y < resolution * 3/4; y += resolution / 6) {
        for (let x = resolution / 4; x < resolution * 3/4; x += resolution / 6) {
            const fy = Math.floor(y);
            const fx = Math.floor(x);
            if (fy >= 0 && fy < resolution && fx >= 0 && fx < resolution) {
                const v = terrainData[fy][fx];
                if (Math.abs(v - level) < contourInterval / 2) {
                    const px = x * width / resolution;
                    const py = y * height / resolution;
                    
                    ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
                    const textWidth = ctx.measureText(level + 'm').width;
                    ctx.fillRect(px - textWidth/2 - 4, py - 11, textWidth + 8, 16);
                    
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillText(level + 'm', px, py + 1);
                    return;
                }
            }
        }
    }
}

function getElevationColor(t) {
    const colors = [
        { r: 15, g: 45, b: 65 },
        { r: 20, g: 80, b: 70 },
        { r: 45, g: 120, b: 80 },
        { r: 100, g: 160, b: 90 },
        { r: 180, g: 170, b: 100 },
        { r: 160, g: 120, b: 80 },
        { r: 130, g: 100, b: 90 },
        { r: 200, g: 200, b: 210 },
        { r: 250, g: 250, b: 255 }
    ];
    
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    
    if (i >= colors.length - 1) {
        const c = colors[colors.length - 1];
        return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
    }
    
    const c1 = colors[i];
    const c2 = colors[i + 1];
    
    const r = Math.round(c1.r + (c2.r - c1.r) * f);
    const g = Math.round(c1.g + (c2.g - c1.g) * f);
    const b = Math.round(c1.b + (c2.b - c1.b) * f);
    
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function updateLegend(levels) {
    const legend = document.getElementById('legend2d');
    legend.innerHTML = '';
    
    const masterLevels = [];
    for (let i = 0; i < levels.length; i++) {
        if (levels[i] % (contourInterval * 5) === 0) {
            masterLevels.push(levels[i]);
        }
    }
    
    const maxItems = Math.min(6, masterLevels.length);
    for (let i = 0; i < maxItems; i++) {
        const level = masterLevels[i];
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = '<div class="legend-color" style="background: ' + getElevationColor(level / maxHeight) + '"></div><span>' + level + 'm</span>';
        legend.appendChild(item);
    }
}

// ============================================
// PROFILE CANVAS
// ============================================

function initCanvasProfile() {
    const canvas = document.getElementById('canvasProfile');
    resizeCanvasProfile();
}

function resizeCanvasProfile() {
    const canvas = document.getElementById('canvasProfile');
    const wrapper = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    canvas.width = wrapper.clientWidth * dpr;
    canvas.height = wrapper.clientHeight * dpr;
    canvas.style.width = wrapper.clientWidth + 'px';
    canvas.style.height = wrapper.clientHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
}

// OPTIMIZATION: Simplified profile for dragging
function drawProfileOptimized() {
    const canvas = document.getElementById('canvasProfile');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    
    // Clear
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(1, '#0d1f35');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    if (!profileLine.start || !profileLine.end) return;
    
    const padding = { left: 70, right: 30, top: 40, bottom: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    
    // Fewer samples during drag
    const samples = 60;
    const profileData = [];
    let maxElev = 0;
    let minElev = maxHeight;
    
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const px = profileLine.start.x + (profileLine.end.x - profileLine.start.x) * t;
        const py = profileLine.start.y + (profileLine.end.y - profileLine.start.y) * t;
        
        const gridX = Math.min(resolution - 1, Math.max(0, Math.floor(px * resolution)));
        const gridY = Math.min(resolution - 1, Math.max(0, Math.floor(py * resolution)));
        
        const elev = terrainData[gridY][gridX];
        profileData.push({ t: t, elev: elev });
        if (elev > maxElev) maxElev = elev;
        if (elev < minElev) minElev = elev;
    }
    
    const elevMargin = (maxElev - minElev) * 0.15 || 15;
    const plotMinElev = Math.max(0, minElev - elevMargin);
    const plotMaxElev = maxElev + elevMargin;
    
    // Simple grid
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (plotHeight * i / 4);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }
    
    // Draw terrain fill
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    
    for (let i = 0; i < profileData.length; i++) {
        const point = profileData[i];
        const x = padding.left + point.t * plotWidth;
        const y = padding.top + plotHeight - (point.elev - plotMinElev) / (plotMaxElev - plotMinElev) * plotHeight;
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(130, 100, 90, 0.9)');
    gradient.addColorStop(0.5, 'rgba(45, 120, 80, 0.6)');
    gradient.addColorStop(1, 'rgba(15, 45, 65, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Profile line
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < profileData.length; i++) {
        const point = profileData[i];
        const x = padding.left + point.t * plotWidth;
        const y = padding.top + plotHeight - (point.elev - plotMinElev) / (plotMaxElev - plotMinElev) * plotHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', padding.left, height - padding.bottom + 45);
    ctx.fillText('B', width - padding.right, height - padding.bottom + 45);
}

// Full quality profile
function drawProfile() {
    const canvas = document.getElementById('canvasProfile');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    
    // Clear
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(1, '#0d1f35');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    
    if (!profileLine.start || !profileLine.end) return;
    
    const padding = { left: 70, right: 30, top: 40, bottom: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    
    const samples = 120;
    const profileData = [];
    let maxElev = 0;
    let minElev = maxHeight;
    
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const px = profileLine.start.x + (profileLine.end.x - profileLine.start.x) * t;
        const py = profileLine.start.y + (profileLine.end.y - profileLine.start.y) * t;
        
        // Bilinear interpolation
        const gx = px * resolution;
        const gy = py * resolution;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const fx = gx - x0;
        const fy = gy - y0;
        
        const safeX0 = Math.max(0, Math.min(resolution - 1, x0));
        const safeY0 = Math.max(0, Math.min(resolution - 1, y0));
        const safeX1 = Math.max(0, Math.min(resolution - 1, x0 + 1));
        const safeY1 = Math.max(0, Math.min(resolution - 1, y0 + 1));
        
        const v00 = terrainData[safeY0][safeX0];
        const v10 = terrainData[safeY0][safeX1];
        const v01 = terrainData[safeY1][safeX0];
        const v11 = terrainData[safeY1][safeX1];
        
        const elev = v00 * (1-fx) * (1-fy) + v10 * fx * (1-fy) + v01 * (1-fx) * fy + v11 * fx * fy;
        
        profileData.push({ t: t, elev: elev });
        if (elev > maxElev) maxElev = elev;
        if (elev < minElev) minElev = elev;
    }
    
    // Calculate distance
    const dx = (profileLine.end.x - profileLine.start.x) * 1000;
    const dy = (profileLine.end.y - profileLine.start.y) * 1000;
    const totalDistance = Math.sqrt(dx * dx + dy * dy);
    
    const elevRange = maxElev - minElev;
    const elevMargin = elevRange * 0.15 || 15;
    const plotMinElev = Math.max(0, minElev - elevMargin);
    const plotMaxElev = maxElev + elevMargin;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    ctx.font = '12px Inter, sans-serif';
    
    // Horizontal grid
    const elevStep = Math.ceil((plotMaxElev - plotMinElev) / 6 / 10) * 10;
    if (elevStep > 0) {
        for (let elev = Math.ceil(plotMinElev / elevStep) * elevStep; elev <= plotMaxElev; elev += elevStep) {
            const y = padding.top + plotHeight - (elev - plotMinElev) / (plotMaxElev - plotMinElev) * plotHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'right';
            ctx.fillText(elev.toFixed(0) + 'm', padding.left - 10, y + 4);
        }
    }
    
    // Vertical grid
    if (totalDistance > 0) {
        const distStep = Math.ceil(totalDistance / 6 / 50) * 50;
        if (distStep > 0) {
            for (let dist = 0; dist <= totalDistance; dist += distStep) {
                const x = padding.left + (dist / totalDistance) * plotWidth;
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
                ctx.beginPath();
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, height - padding.bottom);
                ctx.stroke();
                
                ctx.fillStyle = '#94a3b8';
                ctx.textAlign = 'center';
                ctx.fillText(dist.toFixed(0) + 'm', x, height - padding.bottom + 22);
            }
        }
    }
    
    // Draw terrain fill
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    
    for (let i = 0; i < profileData.length; i++) {
        const point = profileData[i];
        const x = padding.left + point.t * plotWidth;
        const y = padding.top + plotHeight - (point.elev - plotMinElev) / (plotMaxElev - plotMinElev) * plotHeight;
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(130, 100, 90, 0.9)');
    gradient.addColorStop(0.3, 'rgba(100, 160, 90, 0.7)');
    gradient.addColorStop(0.6, 'rgba(45, 120, 80, 0.6)');
    gradient.addColorStop(1, 'rgba(15, 45, 65, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Profile line with glow
    ctx.save();
    ctx.shadowColor = '#00d4aa';
    ctx.shadowBlur = 8;
    
    const lineGradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
    lineGradient.addColorStop(0, '#00d4aa');
    lineGradient.addColorStop(0.5, '#00f5ff');
    lineGradient.addColorStop(1, '#00d4aa');
    
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    for (let i = 0; i < profileData.length; i++) {
        const point = profileData[i];
        const x = padding.left + point.t * plotWidth;
        const y = padding.top + plotHeight - (point.elev - plotMinElev) / (plotMaxElev - plotMinElev) * plotHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    ctx.restore();
    
    // Contour level indicators
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    
    for (let elev = contourInterval; elev <= maxElev; elev += contourInterval) {
        if (elev >= plotMinElev && elev <= plotMaxElev) {
            const y = padding.top + plotHeight - (elev - plotMinElev) / (plotMaxElev - plotMinElev) * plotHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    
    // Labels A and B
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', padding.left, height - padding.bottom + 45);
    ctx.fillText('B', width - padding.right, height - padding.bottom + 45);
    
    // Axis labels
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Distancia Horizontal', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(18, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Elevación', 0, 0);
    ctx.restore();
    
    // Update statistics
    let maxSlope = 0;
    for (let i = 1; i < profileData.length; i++) {
        const dElev = profileData[i].elev - profileData[i-1].elev;
        const dDist = (totalDistance / samples);
        if (dDist > 0) {
            const slope = Math.abs(dElev / dDist * 100);
            if (slope > maxSlope) maxSlope = slope;
        }
    }
    
    document.getElementById('statMaxElev').textContent = maxElev.toFixed(0) + 'm';
    document.getElementById('statMinElev').textContent = minElev.toFixed(0) + 'm';
    document.getElementById('statDistance').textContent = totalDistance.toFixed(0);
    document.getElementById('statSlope').textContent = maxSlope.toFixed(1) + '%';
}

// ============================================
// THREE.JS 3D VISUALIZATION
// ============================================

function initCanvas3D() {
    const container = document.getElementById('canvas3d');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    
    camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(1.5, 1.5, 1.5);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 3, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0x6366f1, 0.3);
    fillLight.position.set(-2, 1, -1);
    scene.add(fillLight);
    
    scene.fog = new THREE.Fog(0x0a1628, 3, 8);
    
    // Mouse controls - CORRECTED
    renderer.domElement.addEventListener('mousedown', function(e) {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    renderer.domElement.addEventListener('mousemove', function(e) {
        if (!isMouseDown) return;
        
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        
        targetRotationY -= deltaX * 0.01;
        targetRotationX -= deltaY * 0.01;
        targetRotationX = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, targetRotationX));
        
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    renderer.domElement.addEventListener('mouseup', function() { isMouseDown = false; });
    renderer.domElement.addEventListener('mouseleave', function() { isMouseDown = false; });
    
    renderer.domElement.addEventListener('wheel', function(e) {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.003;
        cameraDistance = Math.max(1, Math.min(5, cameraDistance));
    }, { passive: false });
    
    // Touch controls
    var touchStartX, touchStartY, lastTouchDistance;
    
    renderer.domElement.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            lastTouchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            var deltaX = e.touches[0].clientX - touchStartX;
            var deltaY = e.touches[0].clientY - touchStartY;
            
            targetRotationY -= deltaX * 0.01;
            targetRotationX -= deltaY * 0.01;
            targetRotationX = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, targetRotationX));
            
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            var touchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            cameraDistance += (lastTouchDistance - touchDistance) * 0.01;
            cameraDistance = Math.max(1, Math.min(5, cameraDistance));
            lastTouchDistance = touchDistance;
        }
    }, { passive: false });
    
    function animate() {
        requestAnimationFrame(animate);
        
        camera.position.x = cameraDistance * Math.sin(targetRotationX) * Math.sin(targetRotationY);
        camera.position.y = cameraDistance * Math.cos(targetRotationX);
        camera.position.z = cameraDistance * Math.sin(targetRotationX) * Math.cos(targetRotationY);
        camera.lookAt(0, 0, 0);
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    window.addEventListener('resize', function() {
        var container = document.getElementById('canvas3d');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

function update3D() {
    if (terrain3D) {
        scene.remove(terrain3D);
        if (terrain3D.geometry) terrain3D.geometry.dispose();
        if (terrain3D.material) terrain3D.material.dispose();
    }
    
    var res = resolution;
    var exag = parseFloat(document.getElementById('verticalExag').value);
    document.getElementById('exagValue').textContent = exag.toFixed(1);
    
    var geometry = new THREE.PlaneGeometry(2, 2, res - 1, res - 1);
    var vertices = geometry.attributes.position.array;
    var colors = [];
    
    for (var i = 0; i < res; i++) {
        for (var j = 0; j < res; j++) {
            var idx = (i * res + j) * 3;
            var elev = terrainData[i][j] / maxHeight * 0.5 * exag;
            vertices[idx + 2] = elev;
            
            var color = getVertexColor(terrainData[i][j] / maxHeight, i, j);
            colors.push(color.r, color.g, color.b);
        }
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.rotateX(-Math.PI / 2);
    
    var style = document.getElementById('renderStyle').value;
    var material;
    
    if (style === 'wireframe') {
        material = new THREE.MeshBasicMaterial({
            color: 0x00d4aa,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
    } else {
        material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: style === 'contours3d',
            wireframe: false,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.1
        });
    }
    
    terrain3D = new THREE.Mesh(geometry, material);
    terrain3D.receiveShadow = true;
    terrain3D.castShadow = true;
    scene.add(terrain3D);
    
    if (style === 'contours3d') {
        addContourLines3D();
    }
}

function getVertexColor(t, yi, xi) {
    var style = document.getElementById('renderStyle').value;
    
    if (style === 'slope') {
        var slope = 0;
        if (yi > 0 && yi < resolution - 1 && xi > 0 && xi < resolution - 1) {
            var dzdx = (terrainData[yi][xi+1] - terrainData[yi][xi-1]) / 2;
            var dzdy = (terrainData[yi+1][xi] - terrainData[yi-1][xi]) / 2;
            slope = Math.sqrt(dzdx*dzdx + dzdy*dzdy) / maxHeight * 5;
        }
        
        return {
            r: Math.min(1, slope * 2),
            g: Math.max(0.2, 0.8 - slope * 0.8),
            b: Math.min(1, 0.4 + slope * 0.6)
        };
    } else if (style === 'contours3d') {
        var elev = t * maxHeight;
        var band = Math.floor(elev / contourInterval);
        var bandT = band / (maxHeight / contourInterval);
        
        var colors = [
            { r: 0.06, g: 0.18, b: 0.25 },
            { r: 0.08, g: 0.31, b: 0.27 },
            { r: 0.18, g: 0.47, b: 0.31 },
            { r: 0.39, g: 0.63, b: 0.35 },
            { r: 0.71, g: 0.67, b: 0.39 },
            { r: 0.63, g: 0.47, b: 0.31 },
            { r: 0.51, g: 0.39, b: 0.35 },
            { r: 0.78, g: 0.78, b: 0.82 }
        ];
        
        var idx = Math.min(colors.length - 1, Math.floor(bandT * colors.length));
        return colors[idx];
    } else {
        var colors = [
            { r: 0.06, g: 0.18, b: 0.25 },
            { r: 0.08, g: 0.31, b: 0.27 },
            { r: 0.18, g: 0.47, b: 0.31 },
            { r: 0.39, g: 0.63, b: 0.35 },
            { r: 0.71, g: 0.67, b: 0.39 },
            { r: 0.63, g: 0.47, b: 0.31 },
            { r: 0.51, g: 0.39, b: 0.35 },
            { r: 0.78, g: 0.78, b: 0.82 },
            { r: 0.98, g: 0.98, b: 1.0 }
        ];
        
        var idx = t * (colors.length - 1);
        var i = Math.floor(idx);
        var f = idx - i;
        
        if (i >= colors.length - 1) return colors[colors.length - 1];
        
        var c1 = colors[i];
        var c2 = colors[i + 1];
        
        return {
            r: c1.r + (c2.r - c1.r) * f,
            g: c1.g + (c2.g - c1.g) * f,
            b: c1.b + (c2.b - c1.b) * f
        };
    }
}

function addContourLines3D() {
    var exag = parseFloat(document.getElementById('verticalExag').value);
    
    for (var level = contourInterval; level <= maxHeight; level += contourInterval) {
        var isMaster = level % (contourInterval * 5) === 0;
        var points = [];
        
        for (var y = 0; y < resolution - 1; y++) {
            for (var x = 0; x < resolution - 1; x++) {
                var v0 = terrainData[y][x];
                var v1 = terrainData[y][x + 1];
                
                if ((v0 <= level && v1 > level) || (v0 > level && v1 <= level)) {
                    var t = (level - v0) / (v1 - v0);
                    var px = (x + t) / resolution * 2 - 1;
                    var py = y / resolution * 2 - 1;
                    var pz = level / maxHeight * 0.5 * exag + 0.003;
                    points.push(new THREE.Vector3(px, pz, py));
                }
            }
        }
        
        if (points.length > 0) {
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            var material = new THREE.PointsMaterial({
                color: isMaster ? 0xfbbf24 : 0xffffff,
                size: isMaster ? 0.018 : 0.01,
                opacity: 0.85,
                transparent: true
            });
            var contourPoints = new THREE.Points(geometry, material);
            terrain3D.add(contourPoints);
        }
    }
}

function update3DExaggeration() {
    update3D();
}

function updateRenderStyle() {
    update3D();
}

// ============================================
// MAIN UPDATE FUNCTIONS
// ============================================

function updateTerrain() {
    var type = document.getElementById('terrainType').value;
    generateTerrain(type);
    
    terrainImageCache = null;
    
    draw2D();
    drawProfile();
    update3D();
}

function resizeCanvases() {
    resizeCanvas2D();
    resizeCanvasProfile();
    terrainImageCache = null;
}

window.addEventListener('resize', function() {
    resizeCanvases();
    draw2D();
    drawProfile();
});
