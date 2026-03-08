// ════════════════════════════════════════════════════════════════
//  BLOCK REGISTRY
//  Add new block types here. Each block needs:
//  - name, top/side/bot colors (RGB arrays)
//  - solid: can you walk on it?
//  - opaque: does it hide neighbour faces?
//  - hardness: seconds to break
//  - alpha (optional): transparency 0-1
//  - light (optional): is it a light source?
// ════════════════════════════════════════════════════════════════

export const BD = {
  1:  { name:'Grass',  top:[88,148,50],   side:[118,170,82],  bot:[132,94,40],   solid:true,  opaque:true,  hardness:0.9 },
  2:  { name:'Dirt',   top:[132,94,40],   side:[132,94,40],   bot:[132,94,40],   solid:true,  opaque:true,  hardness:0.8 },
  3:  { name:'Stone',  top:[134,134,134], side:[134,134,134], bot:[134,134,134], solid:true,  opaque:true,  hardness:2.5 },
  4:  { name:'Wood',   top:[158,122,52],  side:[106,74,24],   bot:[158,122,52],  solid:true,  opaque:true,  hardness:1.5 },
  5:  { name:'Leaves', top:[52,100,28],   side:[52,100,28],   bot:[52,100,28],   solid:true,  opaque:false, hardness:0.4 },
  6:  { name:'Sand',   top:[214,198,128], side:[214,198,128], bot:[214,198,128], solid:true,  opaque:true,  hardness:0.8 },
  7:  { name:'Water',  top:[42,100,200],  side:[42,100,200],  bot:[42,100,200],  solid:false, opaque:false, alpha:0.70,   hardness:99 },
  8:  { name:'Gravel', top:[148,140,130], side:[148,140,130], bot:[148,140,130], solid:true,  opaque:true,  hardness:0.8 },
  9:  { name:'Cobble', top:[112,108,104], side:[112,108,104], bot:[112,108,104], solid:true,  opaque:true,  hardness:2.0 },
  10: { name:'Torch',     top:[220,180,60],  side:[220,180,60],  bot:[220,180,60],  solid:false, opaque:false, hardness:0.1, light:true  },
  11: { name:'Snow',      top:[235,245,255], side:[220,232,248], bot:[220,232,248], solid:true,  opaque:true,  hardness:0.3 },
  12: { name:'Ice',       top:[160,200,240], side:[160,200,240], bot:[160,200,240], solid:true,  opaque:false, hardness:0.5, alpha:0.75 },
  13: { name:'Cactus',    top:[42,130,42],   side:[34,110,34],   bot:[42,130,42],   solid:true,  opaque:true,  hardness:0.4 },
  14: { name:'Glowstone', top:[255,220,100], side:[255,200,80],  bot:[255,220,100], solid:true,  opaque:true,  hardness:0.3, light:true  },
  15: { name:'Glass',     top:[180,220,240], side:[180,220,240], bot:[180,220,240], solid:true,  opaque:false, hardness:0.3, alpha:0.45 },
  16: { name:'Obsidian',  top:[30,20,45],    side:[25,15,40],    bot:[30,20,45],    solid:true,  opaque:true,  hardness:8.0 },
  17: { name:'Brick',     top:[178,98,72],   side:[178,98,72],   bot:[178,98,72],   solid:true,  opaque:true,  hardness:2.0 },
  18: { name:'Sandstone', top:[228,214,150], side:[210,196,130], bot:[228,214,150], solid:true,  opaque:true,  hardness:1.2 },
};

// Block IDs available in the player's hotbar
export const PLACE_IDS = [1, 2, 3, 4, 5, 6, 8, 9, 11, 14, 15, 16, 17, 18];
