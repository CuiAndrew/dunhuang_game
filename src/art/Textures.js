// Creates and caches all CanvasTexture artwork so repeated meshes share one procedural texture instance.
const textureCache = new Map();

export function createTextureSet(THREE, doc = document, palette, themeId = 'dunhuang') {
  const size = 256;
  const colors = palette ?? {
    muralBlue: 0x244B7A,
    turquoise: 0x3D9B9B,
    vermilion: 0xD84B35,
    apricot: 0xF3C77B,
    muralGold: 0xE8B23A,
    paper: 0xF6E7C8,
    caveNight: 0x172536,
    plaster: 0xF0E2C8,
    sand: 0xE3C68B,
    ochreRed: 0xA63B29,
    stoneGreen: 0x3E7C59,
    stoneBlue: 0x2E5C8A,
    dunhuangGold: 0xE8B23A,
    cinnabar: 0xC8402F,
  };
  const css = (value) => typeof value === 'number'
    ? `#${value.toString(16).padStart(6, '0')}`
    : value;
  const make = (name, draw) => {
    const cacheKey = `${themeId}:${name}`;
    if (textureCache.has(cacheKey)) {
      return textureCache.get(cacheKey);
    }
    const canvas = doc.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    draw(canvas.getContext('2d'));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    textureCache.set(cacheKey, texture);
    return texture;
  };
  const stone = make('stone', (ctx) => {
    ctx.fillStyle = css(colors.plaster);
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 400; index += 1) {
      const shade = 220 + (index % 16);
      ctx.fillStyle = `rgb(${shade} ${shade - 4} ${shade - 18} / 35%)`;
      ctx.fillRect((index * 37) % size, (index * 61) % size, 1, 1);
    }
    ctx.strokeStyle = `${css(colors.ochreRed)}33`;
    for (let index = 0; index < 12; index += 1) {
      ctx.beginPath();
      ctx.moveTo((index * 41) % size, (index * 17) % size);
      ctx.lineTo((index * 53 + 90) % size, (index * 29 + 18) % size);
      ctx.stroke();
    }
  });
  const sand = make('sand', (ctx) => {
    ctx.fillStyle = css(colors.sand);
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 3000; index += 1) {
      const shade = index % 2 === 0 ? 115 : 245;
      ctx.fillStyle = `rgb(${shade} ${shade - 12} ${shade - 35} / 20%)`;
      ctx.fillRect((index * 19) % size, (index * 47) % size, 1, 1);
    }
  });
  const mural = make('mural', (ctx) => {
    ctx.fillStyle = css(colors.vermilion ?? colors.ochreRed);
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = css(colors.turquoise ?? colors.stoneGreen);
    ctx.lineWidth = 4;
    for (let index = 0; index < 6; index += 1) {
      ctx.beginPath();
      ctx.arc(32 + index * 44, 80 + (index % 2) * 40, 26, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = css(colors.paper ?? colors.plaster);
    for (let index = 0; index < 24; index += 1) {
      ctx.beginPath();
      ctx.ellipse((index * 47) % size, (index * 71) % size, 12, 6, index, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const paper = make('paper', (ctx) => {
    ctx.fillStyle = css(colors.paper ?? colors.plaster);
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = `${css(colors.apricot ?? colors.sand)}66`;
    for (let index = 0; index < 240; index += 1) {
      const x = (index * 47) % size;
      const y = (index * 83) % size;
      ctx.fillRect(x, y, 2 + (index % 3), 1 + (index % 2));
    }
    ctx.strokeStyle = `${css(colors.muralGold ?? colors.dunhuangGold)}99`;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, size - 20, size - 20);
    ctx.strokeStyle = `${css(colors.vermilion ?? colors.ochreRed)}66`;
    ctx.strokeRect(18, 18, size - 36, size - 36);
  });
  const clouds = make('clouds', (ctx) => {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = `${css(colors.turquoise ?? colors.stoneGreen)}BB`;
    ctx.lineWidth = 10;
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath();
      ctx.arc(36 + index * 48, 92 + (index % 2) * 22, 24, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = `${css(colors.muralGold ?? colors.dunhuangGold)}88`;
    ctx.lineWidth = 3;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.arc(24 + index * 68, 174 - (index % 2) * 14, 15, Math.PI * 1.05, Math.PI * 1.8);
      ctx.stroke();
    }
  });
  const caisson = make('caisson', (ctx) => {
    ctx.fillStyle = css(colors.stoneBlue);
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = css(colors.dunhuangGold);
    ctx.lineWidth = 5;
    for (let index = 0; index < 4; index += 1) {
      const inset = index * 22 + 12;
      ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
    }
    ctx.strokeStyle = css(colors.cinnabar);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 58, 0, Math.PI * 2);
    ctx.stroke();
  });
  const sky = make('sky', (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, css(colors.caveNight ?? colors.stoneBlue));
    gradient.addColorStop(0.48, css(colors.muralBlue ?? colors.stoneBlue));
    gradient.addColorStop(0.78, css(colors.apricot ?? colors.dunhuangGold));
    gradient.addColorStop(1, css(colors.sand));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = `${css(colors.paper ?? colors.plaster)}CC`;
    ctx.beginPath();
    ctx.arc(192, 58, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `${css(colors.muralGold ?? colors.dunhuangGold)}BB`;
    for (let index = 0; index < 18; index += 1) {
      ctx.fillRect((index * 71 + 16) % size, (index * 43 + 12) % 86, 1 + (index % 2), 1 + (index % 2));
    }
  });
  return { stone, sand, mural, paper, clouds, caisson, sky };
}
