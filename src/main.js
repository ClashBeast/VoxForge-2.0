// ════════════════════════════════════════════════════════════════
//  MAIN – Game Loop & Boot
// ════════════════════════════════════════════════════════════════

import { genWorld }                         from './world/worldgen.js';
import { sB, solid, WSIZ, WMAXH, saveWorld, loadWorld, hasSave, deleteSave } from './world/world.js';
import { PLACE_IDS, BD }                    from './world/blocks.js';
import { initThree, scene, camera, renderer, updateDayNight, updateHighlight, dayTime } from './render/renderer.js';
import { initMesher, flushDirtyChunks, rebuildChunk } from './render/mesher.js';
import { CX, CZ, chunkDirty, gB }           from './world/world.js';
import { PL, updatePlayer, eyePos, pMin, pMax } from './player/physics.js';
import { raycast }                          from './player/raycast.js';
import { updateBreaking }                   from './player/breaking.js';
import { initInput, keys, jumpPress, setJumpPress, lmb, rmb, placeCD, setPlaceCD, selSlot, setStarted, dead, showDebug } from './player/input.js';
import { buildHUD, buildBars, killPlayer, isPaused } from './ui/hud.js';
import { fbm }                              from './world/worldgen.js';

// ── Minimap ───────────────────────────────────────────────────────
const mmCanvas = document.getElementById('minimap');
const mmCtx    = mmCanvas.getContext('2d');
const MM_SIZE  = 100;
const MM_RANGE = 50; // blocks radius shown
let mmTimer    = 0;

// Biome colors for minimap
const BIOME_COLORS = ['#5d9e2f','#c8b44a','#aaccdd','#3a7a3a'];

function getBiomeForMM(x, z) {
  // Simple inline biome detect using fbm-style approach
  const bx = x * 0.012, bz = z * 0.012;
  const bx2 = x * 0.025, bz2 = z * 0.025;
  // Approximate biome noise
  const n = (Math.sin(bx * 127.1 + bz * 311.7) * 0.6 + 0.5) * 0.6
          + (Math.sin(bx2 * 127.1 + bz2 * 311.7) * 0.6 + 0.5) * 0.4;
  if (n < 0.28) return 1;
  if (n < 0.42) return 0;
  if (n < 0.64) return 3;
  return 2;
}

function updateMinimap() {
  const px = PL.feet.x | 0, pz = PL.feet.z | 0;
  const scale = MM_RANGE * 2 / MM_SIZE;
  const imgData = mmCtx.createImageData(MM_SIZE, MM_SIZE);
  const d = imgData.data;

  for (let my = 0; my < MM_SIZE; my++) {
    for (let mx = 0; mx < MM_SIZE; mx++) {
      const wx = px - MM_RANGE + mx * scale | 0;
      const wz = pz - MM_RANGE + my * scale | 0;
      if (wx < 0 || wx >= WSIZ || wz < 0 || wz >= WSIZ) {
        const i = (my * MM_SIZE + mx) * 4;
        d[i]=20; d[i+1]=20; d[i+2]=20; d[i+3]=255;
        continue;
      }
      // Find top block
      let topId = 0, topY = 0;
      for (let y = WMAXH; y >= 0; y--) {
        const b = gB(wx, y, wz);
        if (b && b !== 0) { topId = b; topY = y; break; }
      }
      const i = (my * MM_SIZE + mx) * 4;
      let r=60, g=60, b2=60;
      if      (topId === 1)  { r=88;  g=148; b2=50; }
      else if (topId === 2)  { r=132; g=94;  b2=40; }
      else if (topId === 3)  { r=100; g=100; b2=100; }
      else if (topId === 6)  { r=214; g=198; b2=128; }
      else if (topId === 7)  { r=42;  g=100; b2=200; }
      else if (topId === 8)  { r=148; g=140; b2=130; }
      else if (topId === 9)  { r=112; g=108; b2=104; }
      else if (topId === 11) { r=230; g=240; b2=255; }
      else if (topId === 12) { r=160; g=200; b2=240; }
      else if (topId === 13) { r=42;  g=130; b2=42; }
      // Shading by height
      const shade = 0.7 + (topY / WMAXH) * 0.5;
      d[i]   = Math.min(255, r * shade) | 0;
      d[i+1] = Math.min(255, g * shade) | 0;
      d[i+2] = Math.min(255, b2 * shade) | 0;
      d[i+3] = 255;
    }
  }
  mmCtx.putImageData(imgData, 0, 0);

  // Player dot
  mmCtx.fillStyle = '#fff';
  mmCtx.beginPath();
  mmCtx.arc(MM_SIZE/2, MM_SIZE/2, 2.5, 0, Math.PI*2);
  mmCtx.fill();

  // Direction indicator
  const dx = -Math.sin(PL.yaw) * 8;
  const dz = -Math.cos(PL.yaw) * 8;
  mmCtx.strokeStyle = '#fff';
  mmCtx.lineWidth = 1.5;
  mmCtx.beginPath();
  mmCtx.moveTo(MM_SIZE/2, MM_SIZE/2);
  mmCtx.lineTo(MM_SIZE/2 + dx, MM_SIZE/2 + dz);
  mmCtx.stroke();
}

// ── Compass & Biome ───────────────────────────────────────────────
const COMPASS_DIRS = ['N','NE','E','SE','S','SW','W','NW'];
function updateCompass() {
  const deg = ((PL.yaw * 180 / Math.PI) % 360 + 360) % 360;
  const idx = Math.round(deg / 45) % 8;
  document.getElementById('compass').textContent = COMPASS_DIRS[idx];
}

function updateBiomeTag() {
  const biomeNames = ['🌿 Plains','🏜 Desert','❄ Snowy','🌲 Forest'];
  const n = (Math.sin(PL.feet.x * 0.012 * 127.1 + PL.feet.z * 0.012 * 311.7) * 0.6 + 0.5) * 0.6
          + (Math.sin(PL.feet.x * 0.025 * 127.1 + PL.feet.z * 0.025 * 311.7) * 0.6 + 0.5) * 0.4;
  const b = n < 0.28 ? 1 : n < 0.42 ? 0 : n < 0.64 ? 3 : 2;
  document.getElementById('biometag').textContent = biomeNames[b];
}

// ── Block tooltip ─────────────────────────────────────────────────
function updateBlockTip(ray) {
  const el = document.getElementById('blocktip');
  if (ray) {
    const id = gB(...ray.hit);
    if (id && BD[id]) {
      el.textContent = BD[id].name;
      el.style.display = 'block';
      return;
    }
  }
  el.style.display = 'none';
}
initThree();
initMesher(scene);
initInput();

// Show CONTINUE button on title screen if save exists
if (hasSave()) {
  document.getElementById('loadWorldBtn').style.display = 'block';
}

// ── MENU BACKGROUND: live 3D world orbit ──────────────────────────
// IMPORTANT: deferred via setTimeout so this module finishes loading
// first — _startGame etc. must be registered before anything runs.
let menuLoopActive = true;
let menuT = 0;
const ORBIT_SPEED = 0.018;
let menuGroundY = 12;
let centerX = WSIZ / 2, centerZ = WSIZ / 2;
let menuPrevT = -1;

function menuLoop(t) {
  if (!menuLoopActive) return;
  requestAnimationFrame(menuLoop);
  if (menuPrevT < 0) { menuPrevT = t; return; }
  const dt = Math.min((t - menuPrevT) / 1000, 0.04);
  menuPrevT = t;
  menuT += dt;

  const angle = menuT * ORBIT_SPEED * Math.PI * 2;
  const cx = centerX + Math.cos(angle) * 24;
  const cz = centerZ + Math.sin(angle) * 24;
  const cy = menuGroundY + 13 + Math.sin(menuT * 0.28) * 2.8;

  camera.position.set(cx, cy, cz);
  camera.rotation.order = 'YXZ';
  const dx = centerX - cx, dz = centerZ - cz;
  camera.rotation.y = Math.atan2(-dx, -dz);
  camera.rotation.x = Math.atan2((menuGroundY + 4) - cy, Math.sqrt(dx*dx + dz*dz)) * 0.82;
  camera.rotation.z = 0;

  updateDayNight(dt * 0.55);
  flushDirtyChunks();
  renderer.render(scene, camera);
}

// Defer world gen to AFTER module fully loads so _startGame is registered
setTimeout(() => {
  genWorld();
  fullRebuild();
  for (let y = WMAXH; y >= 0; y--) {
    if (solid(centerX | 0, y, centerZ | 0)) { menuGroundY = y; break; }
  }
  requestAnimationFrame(menuLoop);
}, 0);

// ── Helpers ───────────────────────────────────────────────────────
function spawnPlayer() {
  const spx = Math.floor(WSIZ / 2), spz = Math.floor(WSIZ / 2);
  let spy = 1;
  for (let y = WMAXH; y >= 0; y--) { if (solid(spx, y, spz)) { spy = y+1; break; } }
  PL.feet.set(spx + .5, spy, spz + .5);
}

function fullRebuild() {
  for (let cz = 0; cz < CZ; cz++)
    for (let cx = 0; cx < CX; cx++) rebuildChunk(cx, cz);
  chunkDirty.fill(0);
}

function showSaveMsg(msg, color='#8f8') {
  const el = document.getElementById('saveMsg');
  el.style.color = color;
  el.textContent = msg;
  setTimeout(() => el.textContent = '', 2500);
}

function flashAutosave() {
  const el = document.getElementById('autosave');
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 2000);
}

// ── Game loop ─────────────────────────────────────────────────────
let prevT = -1;  // -1 = uninitialized
let autoSaveTimer = 0;

function loop(t) {
  requestAnimationFrame(loop);
  // FIX: on the very first frame prevT=0 causes dt=(page load time) which
  // spikes physics. Seed prevT on first real call instead.
  if (prevT < 0) { prevT = t; return; }
  const dt = Math.min((t - prevT) / 1000, 0.033); // cap at 33ms (~30fps) not 50ms
  prevT = t;
  if (isPaused() || dead) return;

  const newJump = updatePlayer(dt, keys, jumpPress);
  if (newJump !== undefined) setJumpPress(newJump);

  updateDayNight(dt);
  flushDirtyChunks();
  setPlaceCD(placeCD - dt);

  const ray = raycast();
  updateHighlight(ray ? ray.hit : null);
  updateBreaking(dt, ray, lmb);
  updateBlockTip(ray);

  // Update minimap every 0.25s (not every frame - performance)
  mmTimer += dt;
  if (mmTimer > 0.25) { mmTimer = 0; updateMinimap(); updateBiomeTag(); }
  updateCompass();

  // Block placement
  if (rmb && placeCD <= 0 && ray) {
    const [px, py, pz] = ray.prev;
    const pm = pMin(), pM = pMax();
    if (!(pm.x < px+1 && pM.x > px && pm.y < py+1 && pM.y > py && pm.z < pz+1 && pM.z > pz)) {
      sB(px, py, pz, PLACE_IDS[selSlot]);
      PL.score++;
      buildBars();
    }
    setPlaceCD(0.25);
  }

  // Auto-save every 60 seconds
  autoSaveTimer += dt;
  if (autoSaveTimer >= 60) {
    autoSaveTimer = 0;
    saveWorld();
    flashAutosave();
  }

  // Camera + walk bob
  const eyP     = eyePos();
  const bob     = Math.sin(PL.bobPhase) * 0.048;
  const bobSide = Math.sin(PL.bobPhase * 0.5) * 0.022;
  camera.position.set(eyP.x + bobSide, eyP.y + bob, eyP.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = PL.yaw;
  camera.rotation.x = PL.pitch;
  camera.rotation.z = bobSide * 0.4;

  if (PL.hp <= 0) killPlayer();

  if (showDebug) {
    const f = PL.feet;
    const spd = Math.sqrt(PL.vel.x**2 + PL.vel.z**2).toFixed(1);
    const t2  = dayTime;
    const timeStr = t2 < 0.25 ? '🌙 Night' : t2 < 0.5 ? '🌅 Dawn' : t2 < 0.75 ? '☀ Day' : '🌇 Dusk';
    document.getElementById('info').innerHTML =
      `XYZ ${f.x.toFixed(1)} / ${f.y.toFixed(1)} / ${f.z.toFixed(1)}<br>` +
      `Speed ${spd} m/s  |  ${PL.fly ? '✈ FLY' : PL.inWater ? '🌊 SWIM' : PL.onGround ? 'Ground' : 'Air'}<br>` +
      `Time: ${timeStr}  |  Score: ${PL.score}<br>` +
      `[Tab] toggle debug  |  [Ctrl+S] save`;
  }

  renderer.render(scene, camera);
}

// ── Button handlers ───────────────────────────────────────────────

// New world
window._startGame = function () {
  menuLoopActive = false;
  document.getElementById('overlay').style.display = 'none';
  genWorld();
  spawnPlayer();
  fullRebuild();
  setStarted(true);
  document.body.requestPointerLock();
  buildHUD(selSlot);
  prevT = -1;
  requestAnimationFrame(loop);
};

// Continue from save
window._loadAndStart = function () {
  menuLoopActive = false;
  if (loadWorld()) {
    spawnPlayer();
    fullRebuild();
    document.getElementById('overlay').style.display = 'none';
    setStarted(true);
    document.body.requestPointerLock();
    buildHUD(selSlot);
    prevT = -1;
    requestAnimationFrame(loop);
  }
};

// Resume from pause
window._resumeGame = function () {
  import('./player/input.js').then(m => {
    m.setPaused(false);
    document.getElementById('pause').style.display = 'none';
    document.body.requestPointerLock();
  });
};

// Save from pause menu
window._saveGame = function () {
  const ok = saveWorld();
  showSaveMsg(ok ? '✅ World saved!' : '❌ Save failed!', ok ? '#8f8' : '#f88');
  document.getElementById('loadWorldBtn').style.display = 'block';
};

// Load from pause menu
window._loadGame = function () {
  if (!hasSave()) { showSaveMsg('❌ No save found!', '#f88'); return; }
  loadWorld();
  fullRebuild();
  showSaveMsg('✅ World loaded!');
};

// New world from pause menu
window._newGame = function () {
  if (!confirm('Delete your save and start a new world?')) return;
  menuLoopActive = false;
  deleteSave();
  genWorld();
  spawnPlayer();
  fullRebuild();
  document.getElementById('loadWorldBtn').style.display = 'none';
  prevT = -1;
  import('./player/input.js').then(m => {
    m.setPaused(false);
    document.getElementById('pause').style.display = 'none';
    document.body.requestPointerLock();
    requestAnimationFrame(loop);
  });
};

// Respawn
window._respawn = function () {
  import('./ui/hud.js').then(m => m.respawn());
};

// Ctrl+S to save anytime
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.code === 'KeyS') {
    e.preventDefault();
    saveWorld();
    flashAutosave();
  }
});
