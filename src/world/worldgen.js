// ════════════════════════════════════════════════════════════════
//  WORLD GENERATION
//  Procedural terrain using fractional Brownian motion (fBm).
//
//  Want different terrain? Tweak fbm() octave weights/frequencies,
//  or add biome logic by checking the fbm value ranges.
// ════════════════════════════════════════════════════════════════

import { WSIZ, WMAXH, SEA, sB, markAllDirty } from './world.js';

// ── Noise helpers ────────────────────────────────────────────────
function hash(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function smoo(t) { return t * t * (3 - 2 * t); }

function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix,        fz = z - iz;
  const ux = smoo(fx),      uz = smoo(fz);
  return hash(ix   + iz*57)*(1-ux)*(1-uz)
       + hash(ix+1 + iz*57)*   ux *(1-uz)
       + hash(ix   +(iz+1)*57)*(1-ux)*uz
       + hash(ix+1 +(iz+1)*57)*   ux *uz;
}

export function fbm(x, z) {
  return vnoise(x*.040, z*.040)*.52
       + vnoise(x*.090, z*.090)*.26
       + vnoise(x*.200, z*.200)*.13
       + vnoise(x*.460, z*.460)*.06
       + vnoise(x*.900, z*.900)*.03;
}

// ── Biome noise (large scale, smooth) ───────────────────────────
function biomeNoise(x, z) {
  return vnoise(x*.012, z*.012)*.6
       + vnoise(x*.025, z*.025)*.4;
}

// ── Biome types: 0=plains, 1=desert, 2=snowy, 3=forest ──────────
function getBiome(x, z) {
  const n = biomeNoise(x, z);
  if (n < 0.28) return 1;
  if (n < 0.42) return 0;
  if (n < 0.64) return 3;
  return 2;
}

// ── Tree planting ────────────────────────────────────────────────
function plantTree(x, h, z) {
  const th = 4 + Math.floor(Math.random() * 3);
  for (let ty = 1; ty <= th; ty++) sB(x, h+ty, z, 4);
  for (let lx = -2; lx <= 2; lx++)
    for (let lz = -2; lz <= 2; lz++)
      for (let ly = -1; ly <= 2; ly++) {
        if (Math.abs(lx)+Math.abs(lz)+Math.abs(ly) <= 3)
          sB(x+lx, h+th+ly, z+lz, 5);
      }
}

// ── Cactus planting ──────────────────────────────────────────────
function plantCactus(x, h, z) {
  const ch = 1 + Math.floor(Math.random() * 3);
  for (let ty = 1; ty <= ch; ty++) sB(x, h+ty, z, 13);
}

// ── Snowy tree ───────────────────────────────────────────────────
function plantSnowyTree(x, h, z) {
  const th = 3 + Math.floor(Math.random() * 2);
  for (let ty = 1; ty <= th; ty++) sB(x, h+ty, z, 4);
  for (let lx = -1; lx <= 1; lx++)
    for (let lz = -1; lz <= 1; lz++)
      for (let ly = 0; ly <= 2; ly++) {
        if (Math.abs(lx)+Math.abs(lz)+Math.abs(ly) <= 2)
          sB(x+lx, h+th+ly, z+lz, ly === 2 ? 11 : 5);
      }
}

// ── Main generation ──────────────────────────────────────────────
export function genWorld() {
  for (let x = 0; x < WSIZ; x++) {
    for (let z = 0; z < WSIZ; z++) {
      const biome = getBiome(x, z);
      const h     = Math.round(fbm(x,z) * 18 + SEA - 2) | 0;
      const sand  = h <= SEA + 1;

      sB(x, 0, z, 3); // stone floor

      for (let y = 1; y <= h; y++) {
        if (y === h) {
          // Top block per biome
          if      (sand)         sB(x, y, z, 6);  // sand near water
          else if (biome === 1)  sB(x, y, z, 6);  // desert: sand
          else if (biome === 2)  sB(x, y, z, 11); // snowy: snow
          else                   sB(x, y, z, 1);  // others: grass
        } else if (y >= h-3) {
          sB(x, y, z, biome === 1 ? 18 : 2);      // desert: sandstone, else dirt
        } else {
          sB(x, y, z, 3);                          // stone
        }
      }

      // Gravel under beaches
      if (sand && h > 4)
        for (let y = h-1; y >= Math.max(1, h-2); y--) sB(x, y, z, 8);

      // Water fill
      for (let y = h+1; y <= SEA; y++) sB(x, y, z, 7);

      // Frozen lakes in snowy biome
      if (biome === 2 && h === SEA) sB(x, SEA, z, 12);

      // Vegetation by biome
      if (!sand && h > SEA+1) {
        if      (biome === 1 && Math.random() < 0.012) plantCactus(x, h, z);
        else if (biome === 2 && Math.random() < 0.014) plantSnowyTree(x, h, z);
        else if (biome === 3 && Math.random() < 0.040) plantTree(x, h, z);
        else if (biome === 0 && Math.random() < 0.018) plantTree(x, h, z);
      }
    }
  }
  markAllDirty();
}
