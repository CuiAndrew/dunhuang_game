// Builds reusable procedural silhouettes for the Dunhuang adapter.
// Geometry and materials are created while a pooled visual is initialized; variant setters only toggle them.
const visualCache = new WeakMap();

function getVisualCache(THREE, palette) {
  let paletteCache = visualCache.get(THREE);
  if (!paletteCache) {
    paletteCache = new WeakMap();
    visualCache.set(THREE, paletteCache);
  }
  let cache = paletteCache.get(palette);
  if (!cache) {
    cache = {};
    paletteCache.set(palette, cache);
  }
  return cache;
}

function variantMap(root, names) {
  return new Map(names.map((name) => [name, root.getObjectByName(name.toLowerCase())]));
}

function attachObstacleApi(root, names, config) {
  const variants = variantMap(root, names);
  root.userData.config = config;
  root.setType = (type) => {
    const activeType = variants.has(type) ? type : 'LOW_BARRIER';
    for (const [name, variant] of variants) variant.visible = name === activeType;
    root.visible = true;
    root.userData.obstacleType = activeType;
    root.userData.heightOffset = variants.get(activeType).userData.heightOffset;
  };
  return root;
}

function attachPickupApi(root, names) {
  const variants = variantMap(root, names);
  root.setType = (nextType) => {
    const activeType = variants.has(nextType) ? nextType : 'COIN';
    for (const [name, variant] of variants) variant.visible = name === activeType;
    root.visible = true;
    root.userData.kind = activeType;
  };
  return root;
}

function attachEnvironmentApi(root, names) {
  const variants = variantMap(root, names);
  root.setKind = (kind) => {
    const activeKind = variants.has(kind) ? kind : 'DUNE';
    for (const [name, variant] of variants) variant.visible = name === activeKind;
    root.userData.activeKind = activeKind;
  };
  return root;
}

function color(palette, primary, fallback) {
  return palette[primary] ?? palette[fallback];
}

function standardMaterial(THREE, palette, key, fallback, options = {}, texture = null) {
  const material = new THREE.MeshStandardMaterial({
    color: color(palette, key, fallback),
    roughness: 0.72,
    ...options,
  });
  if (texture) {
    material.map = texture;
    material.needsUpdate = true;
  }
  return material;
}

function makeRibbon(THREE, material, name) {
  const ribbon = new THREE.Group();
  ribbon.name = name;
  const upper = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 6, 18, Math.PI * 0.72), material);
  const lower = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 6, 16, Math.PI * 0.68), material);
  upper.rotation.y = Math.PI * 0.2;
  upper.rotation.z = Math.PI * 0.18;
  upper.position.x = 0.12;
  lower.rotation.y = -Math.PI * 0.18;
  lower.rotation.z = -Math.PI * 0.22;
  lower.position.set(0.26, -0.28, 0.02);
  ribbon.add(upper, lower);
  return ribbon;
}

function addFaceMark(THREE, root, palette, runner) {
  const faceMark = new THREE.Group();
  faceMark.name = 'face-mark';
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: color(palette, 'ink', 'bronze') });
  const eyeGeometry = new THREE.SphereGeometry(0.035, 8, 6);
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.11, runner.bodyHeight / 2 + 0.02, runner.headRadius * 0.92);
  rightEye.position.set(0.11, runner.bodyHeight / 2 + 0.02, runner.headRadius * 0.92);
  faceMark.add(leftEye, rightEye);
  root.add(faceMark);
  return faceMark;
}

export function createRunnerVisual(THREE, palette, config, textures = {}) {
  const runner = config.runner;
  const root = new THREE.Group();
  root.name = 'runner';

  const robeMaterial = standardMaterial(THREE, palette, 'vermilion', 'ochreRed', { roughness: 0.62 }, textures.mural);
  const plasterMaterial = standardMaterial(THREE, palette, 'paper', 'plaster', { roughness: 0.82 }, textures.paper);
  const goldMaterial = standardMaterial(THREE, palette, 'muralGold', 'dunhuangGold', { roughness: 0.48 });
  const blueMaterial = standardMaterial(THREE, palette, 'muralBlue', 'stoneBlue', { roughness: 0.68 });
  const turquoiseMaterial = standardMaterial(THREE, palette, 'turquoise', 'stoneGreen', { roughness: 0.62 });
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(runner.capsuleRadius * 1.08, runner.capsuleLength * 0.82, 5, 12),
    robeMaterial,
  );
  body.name = 'robe-body';
  body.scale.set(0.86, 1, 0.72);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(runner.headRadius * 1.1, 16, 12),
    plasterMaterial,
  );
  head.name = 'mural-face';
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(runner.haloRadius * 0.72, 0.055, 8, 24),
    new THREE.MeshBasicMaterial({
      color: color(palette, 'muralGold', 'dunhuangGold'),
      transparent: true,
      opacity: 0.74,
      side: THREE.DoubleSide,
    }),
  );
  halo.name = 'mural-halo';
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.065, 6, 18), turquoiseMaterial);
  belt.name = 'turquoise-belt';
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.038, 6, 18), goldMaterial);
  sash.name = 'gold-sash';
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.045), goldMaterial);
  scarf.name = 'gold-scarf';
  const ribbon = makeRibbon(THREE, turquoiseMaterial, 'flying-ribbon');
  const legGeometry = new THREE.CapsuleGeometry(runner.legRadius * 1.18, runner.legLength * 0.68, 4, 8);
  const leftLeg = new THREE.Mesh(legGeometry, blueMaterial);
  const rightLeg = new THREE.Mesh(legGeometry, blueMaterial);
  leftLeg.name = 'left-leg';
  rightLeg.name = 'right-leg';
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(runner.shadowRadius, runner.shadowSegments),
    new THREE.MeshBasicMaterial({ color: color(palette, 'ink', 'bronze'), transparent: true, opacity: 0.28 }),
  );
  shadow.name = 'runner-shadow';

  head.position.set(0, runner.bodyHeight / 2, 0);
  halo.position.set(0, runner.bodyHeight / 2 + 0.03, runner.bodyDepth * 0.72);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.02;
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.05;
  scarf.position.set(runner.bodyWidth * 0.38, 0.15, runner.bodyDepth * 0.58);
  scarf.rotation.z = -0.35;
  ribbon.position.set(-runner.bodyWidth * 0.5, 0.22, -runner.bodyDepth * 0.12);
  ribbon.rotation.y = Math.PI * 0.14;
  leftLeg.position.set(-runner.legOffset, -runner.legHipHeight, 0);
  rightLeg.position.set(runner.legOffset, -runner.legHipHeight, 0);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -config.scene.runnerBaseHeight + config.track.laneMarkHeight;
  root.add(shadow, body, head, halo, belt, sash, scarf, ribbon, leftLeg, rightLeg);
  addFaceMark(THREE, root, palette, runner);
  return { root, leftLeg, rightLeg };
}

export function createObstacleVisual(THREE, palette, config, textures = {}) {
  const cache = getVisualCache(THREE, palette);
  const variantNames = ['BEAM', 'PILLAR', 'FIRE', 'GAP', 'LOW_BARRIER'];
  if (cache.obstacle) {
    const root = cache.obstacle.clone(true);
    root.name = 'dunhuang-obstacle';
    root.visible = false;
    return attachObstacleApi(root, variantNames, config);
  }
  const root = new THREE.Group();
  root.name = 'dunhuang-obstacle';
  root.userData.config = config;
  const variants = new Map();
  const materials = {
    bronze: standardMaterial(THREE, palette, 'muralBlue', 'bronze', { roughness: 0.78 }),
    red: standardMaterial(THREE, palette, 'vermilion', 'cinnabar', { roughness: 0.64 }, textures.mural),
    gold: standardMaterial(THREE, palette, 'muralGold', 'dunhuangGold', { roughness: 0.48 }),
    dark: standardMaterial(THREE, palette, 'ink', 'bronze', { roughness: 0.94 }),
    plaster: standardMaterial(THREE, palette, 'paper', 'plaster', { roughness: 0.82 }, textures.paper),
    turquoise: standardMaterial(THREE, palette, 'turquoise', 'stoneGreen', { roughness: 0.64 }),
  };
  const addVariant = (type, children, heightOffset) => {
    const variant = new THREE.Group();
    variant.name = type.toLowerCase();
    variant.add(...children);
    variant.visible = false;
    variant.userData.heightOffset = heightOffset;
    variants.set(type, variant);
    root.add(variant);
  };

  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.48, 0.42), materials.red);
  const beamBandGeometry = new THREE.BoxGeometry(0.16, 0.64, 0.52);
  const beamBandLeft = new THREE.Mesh(beamBandGeometry, materials.gold);
  const beamBandRight = new THREE.Mesh(beamBandGeometry, materials.gold);
  const beamCloudLeft = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 12, Math.PI), materials.gold);
  const beamCloudRight = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 12, Math.PI), materials.gold);
  beamBandLeft.position.x = -0.98;
  beamBandRight.position.x = 0.98;
  beamCloudLeft.name = 'beam-cloud-left';
  beamCloudRight.name = 'beam-cloud-right';
  beamCloudLeft.position.set(-1.2, 0.26, 0);
  beamCloudRight.position.set(1.2, 0.26, 0);
  beamCloudLeft.rotation.y = Math.PI / 2;
  beamCloudRight.rotation.y = -Math.PI / 2;
  addVariant('BEAM', [beam, beamBandLeft, beamBandRight, beamCloudLeft, beamCloudRight], 1.25);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 2.9, 12), materials.bronze);
  const pillarBase = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 1.55), materials.gold);
  const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.2, 1.25), materials.red);
  const pillarBand = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.06, 6, 16), materials.turquoise);
  pillarBase.position.y = -1.45;
  pillarCap.position.y = 1.48;
  pillarBand.rotation.x = Math.PI / 2;
  pillarBand.position.y = 0.82;
  addVariant('PILLAR', [pillar, pillarBase, pillarCap, pillarBand], 1.6);

  const fireBase = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.82, 0.28, 12), materials.dark);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.25, 9), materials.red);
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.78, 8), materials.gold);
  const fireGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.96, 12, 8),
    new THREE.MeshBasicMaterial({ color: color(palette, 'apricot', 'dunhuangGold'), transparent: true, opacity: 0.1 }),
  );
  fireGlow.name = 'fire-glow';
  fireBase.position.y = -0.47;
  flame.position.y = 0.1;
  flameCore.position.set(0, 0.2, 0.06);
  fireGlow.position.y = 0.18;
  addVariant('FIRE', [fireBase, flame, flameCore, fireGlow], 0.55);

  const gap = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 4), materials.dark);
  const gapDepth = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.03, 3.78), materials.bronze);
  const gapEdgeGeometry = new THREE.BoxGeometry(0.08, 0.08, 4.05);
  const gapEdgeLeft = new THREE.Mesh(gapEdgeGeometry, materials.gold);
  const gapEdgeRight = new THREE.Mesh(gapEdgeGeometry, materials.gold);
  gapDepth.position.y = -0.02;
  gapEdgeLeft.position.x = -1.28;
  gapEdgeRight.position.x = 1.28;
  addVariant('GAP', [gap, gapDepth, gapEdgeLeft, gapEdgeRight], 0.03);

  const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.62, 0.7), materials.plaster);
  const barrierTop = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.1, 0.76), materials.red);
  const barrierBand = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 6, 12, Math.PI), materials.gold);
  const barrierLegGeometry = new THREE.BoxGeometry(0.14, 0.9, 0.78);
  const barrierLegLeft = new THREE.Mesh(barrierLegGeometry, materials.bronze);
  const barrierLegRight = new THREE.Mesh(barrierLegGeometry, materials.bronze);
  barrier.position.y = 0.18;
  barrierTop.position.y = 0.53;
  barrierLegLeft.position.set(-0.88, -0.22, 0);
  barrierLegRight.position.set(0.88, -0.22, 0);
  barrierBand.position.set(0, 0.54, 0.38);
  barrierBand.rotation.x = Math.PI / 2;
  addVariant('LOW_BARRIER', [barrier, barrierTop, barrierLegLeft, barrierLegRight, barrierBand], 0.4);

  attachObstacleApi(root, variantNames, config);
  root.setType('LOW_BARRIER');
  root.visible = false;
  cache.obstacle = root.clone(true);
  return root;
}

export function createPursuerVisual(THREE, palette, textures = {}) {
  const root = new THREE.Group();
  root.name = 'bronze-stone-beast';
  const stoneMaterial = standardMaterial(THREE, palette, 'muralBlue', 'bronze', { roughness: 0.86 }, textures.stone);
  const faceMaterial = standardMaterial(THREE, palette, 'paper', 'plaster', { roughness: 0.78 }, textures.paper);
  const goldMaterial = standardMaterial(THREE, palette, 'muralGold', 'dunhuangGold', { roughness: 0.46 });
  const redMaterial = new THREE.MeshBasicMaterial({ color: color(palette, 'vermilion', 'cinnabar') });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.08, 14, 10), stoneMaterial);
  body.name = 'beast-body';
  body.scale.set(1.35, 0.9, 1.05);
  body.position.y = 1;
  const jaw = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.5, 4, 10), faceMaterial);
  jaw.name = 'beast-face';
  jaw.position.set(0, 0.52, 0.28);
  const mane = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.14, 6, 12), stoneMaterial);
  mane.name = 'beast-mane';
  mane.rotation.x = Math.PI / 2;
  mane.position.y = 1.12;
  const hornGeometry = new THREE.ConeGeometry(0.25, 0.9, 6);
  const leftHorn = new THREE.Mesh(hornGeometry, goldMaterial);
  const rightHorn = new THREE.Mesh(hornGeometry, goldMaterial);
  leftHorn.position.set(-0.55, 1.85, 0);
  rightHorn.position.set(0.55, 1.85, 0);
  leftHorn.rotation.z = -0.28;
  rightHorn.rotation.z = 0.28;
  const eyeGeometry = new THREE.SphereGeometry(0.09, 8, 6);
  const leftEye = new THREE.Mesh(eyeGeometry, redMaterial);
  const rightEye = new THREE.Mesh(eyeGeometry, redMaterial);
  leftEye.name = 'beast-eye-left';
  rightEye.name = 'beast-eye-right';
  leftEye.position.set(-0.3, 1.2, 0.9);
  rightEye.position.set(0.3, 1.2, 0.9);
  const forehead = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), goldMaterial);
  forehead.name = 'beast-brow';
  forehead.position.set(0, 1.48, 0.85);
  root.add(body, jaw, mane, leftHorn, rightHorn, leftEye, rightEye, forehead);
  root.visible = false;
  return root;
}

export function createPickupVisual(THREE, palette, type = 'COIN', textures = {}) {
  const cache = getVisualCache(THREE, palette);
  const variantNames = ['COIN', 'SHIELD', 'BOOST', 'MAGNET'];
  if (cache.pickup) {
    const root = cache.pickup.clone(true);
    root.name = 'dunhuang-pickup';
    root.visible = false;
    attachPickupApi(root, variantNames);
    root.setType(type);
    root.visible = false;
    return root;
  }
  const root = new THREE.Group();
  root.name = 'dunhuang-pickup';
  const variants = new Map();
  const gold = standardMaterial(THREE, palette, 'muralGold', 'dunhuangGold', { emissive: color(palette, 'muralGold', 'dunhuangGold'), emissiveIntensity: 0.18, roughness: 0.4 });
  const blue = standardMaterial(THREE, palette, 'turquoise', 'stoneBlue', { emissive: color(palette, 'turquoise', 'stoneBlue'), emissiveIntensity: 0.18, roughness: 0.4 });
  const red = standardMaterial(THREE, palette, 'vermilion', 'cinnabar', { emissive: color(palette, 'vermilion', 'cinnabar'), emissiveIntensity: 0.2, roughness: 0.42 });
  const ink = standardMaterial(THREE, palette, 'ink', 'bronze', { roughness: 0.9 });
  const addVariant = (name, group) => {
    group.name = name.toLowerCase();
    group.visible = false;
    variants.set(name, group);
    root.add(group);
  };

  const coinShape = new THREE.Shape();
  coinShape.moveTo(-0.34, -0.34);
  coinShape.lineTo(0.34, -0.34);
  coinShape.lineTo(0.34, 0.34);
  coinShape.lineTo(-0.34, 0.34);
  coinShape.closePath();
  const coinHole = new THREE.Path();
  coinHole.moveTo(-0.12, -0.12);
  coinHole.lineTo(0.12, -0.12);
  coinHole.lineTo(0.12, 0.12);
  coinHole.lineTo(-0.12, 0.12);
  coinHole.closePath();
  coinShape.holes.push(coinHole);
  const coin = new THREE.Mesh(new THREE.ShapeGeometry(coinShape), gold);
  coin.name = 'coin-face';
  coin.rotation.x = Math.PI / 2;
  const coinBorder = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 5, 12), gold);
  coinBorder.name = 'coin-border';
  coinBorder.rotation.x = Math.PI / 2;
  const coinHoleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), ink);
  coinHoleMesh.name = 'coin-hole';
  coinHoleMesh.position.y = 0.03;
  addVariant('COIN', new THREE.Group());
  variants.get('COIN').add(coin, coinBorder, coinHoleMesh);

  const shield = new THREE.Group();
  const shieldFace = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), blue);
  shieldFace.name = 'shield-face';
  const shieldRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 12), gold);
  shieldRing.name = 'shield-apse';
  const shieldGem = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), gold);
  shieldGem.name = 'shield-gem';
  shield.add(shieldFace, shieldRing, shieldGem);
  shield.children[1].rotation.x = Math.PI / 2;
  shield.children[2].position.z = 0.08;
  addVariant('SHIELD', shield);

  const boost = new THREE.Group();
  const seal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), red);
  seal.name = 'boost-seal';
  const ribbonGeometry = new THREE.BoxGeometry(0.12, 0.8, 0.04);
  const ribbonLeft = new THREE.Mesh(ribbonGeometry, gold);
  const ribbonRight = new THREE.Mesh(ribbonGeometry, gold);
  ribbonLeft.name = 'boost-ribbon-left';
  ribbonRight.name = 'boost-ribbon-right';
  ribbonLeft.position.x = -0.25;
  ribbonRight.position.x = 0.25;
  ribbonLeft.rotation.z = -0.3;
  ribbonRight.rotation.z = 0.3;
  boost.add(seal, ribbonLeft, ribbonRight);
  addVariant('BOOST', boost);

  const magnet = new THREE.Group();
  const magnetRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 12), gold);
  magnetRing.name = 'magnet-ring';
  const magnetCap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.18), red);
  magnetCap.name = 'magnet-cap';
  magnet.add(magnetRing, magnetCap);
  magnet.children[1].position.y = -0.22;
  addVariant('MAGNET', magnet);

  attachPickupApi(root, variantNames);
  root.setType(type);
  root.visible = false;
  cache.pickup = root.clone(true);
  return root;
}

export function createEnvironmentVisual(THREE, palette) {
  const cache = getVisualCache(THREE, palette);
  const variantNames = ['DUNE', 'TEMPLE', 'CAVE', 'LANTERN', 'FLAG'];
  if (cache.environment) {
    const root = cache.environment.clone(true);
    root.name = 'dunhuang-environment';
    root.visible = false;
    return attachEnvironmentApi(root, variantNames);
  }
  const root = new THREE.Group();
  root.name = 'dunhuang-environment';
  const variants = new Map();
  const make = (kind, children) => {
    const variant = new THREE.Group();
    variant.name = kind.toLowerCase();
    variant.add(...children);
    variants.set(kind, variant);
    root.add(variant);
  };
  const stone = new THREE.MeshStandardMaterial({ color: palette.bronze, roughness: 0.92 });
  const plaster = new THREE.MeshStandardMaterial({ color: palette.plaster, roughness: 0.88 });
  const red = new THREE.MeshStandardMaterial({ color: palette.ochreRed, roughness: 0.72 });
  const gold = new THREE.MeshStandardMaterial({ color: palette.dunhuangGold, emissive: palette.dunhuangGold, emissiveIntensity: 0.12 });
  const green = new THREE.MeshStandardMaterial({ color: palette.stoneGreen, roughness: 0.8 });
  const blue = new THREE.MeshStandardMaterial({ color: palette.stoneBlue, roughness: 0.78 });
  const poleGeometry = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6);

  const dune = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.5, 12), new THREE.MeshStandardMaterial({ color: palette.sand, roughness: 1 }));
  const duneStripe = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.08, 5, 18, Math.PI), gold);
  dune.position.y = 1.1;
  duneStripe.rotation.x = Math.PI / 2;
  duneStripe.position.y = 0.55;
  make('DUNE', [dune, duneStripe]);

  const templeBase = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 2.6), stone);
  const templeRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), red);
  const templeDoor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.55, 0.08), blue);
  const templeLintel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.12), gold);
  templeBase.position.y = 1.3;
  templeRoof.position.y = 3.2;
  templeRoof.rotation.y = Math.PI / 4;
  templeDoor.position.set(0, 0.78, 1.34);
  templeLintel.position.set(0, 1.62, 1.38);
  make('TEMPLE', [templeBase, templeRoof, templeDoor, templeLintel]);

  const cave = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 3.2, 12, 1, false, 0, Math.PI), plaster);
  const caveInner = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 3.22, 12, 1, false, 0, Math.PI), blue);
  cave.rotation.z = Math.PI / 2;
  caveInner.rotation.z = Math.PI / 2;
  cave.position.y = 1.6;
  caveInner.position.y = 1.6;
  make('CAVE', [cave, caveInner]);

  const lanternPole = new THREE.Mesh(poleGeometry, stone);
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), gold);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.18, 6), red);
  lanternPole.position.y = 2.1;
  lantern.position.y = 4.0;
  lanternCap.position.y = 4.4;
  make('LANTERN', [lanternPole, lantern, lanternCap]);

  const flagPole = new THREE.Mesh(poleGeometry, stone);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 0.05), green);
  const flagTip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 4), gold);
  flagPole.position.y = 2.1;
  flag.position.set(0.75, 3.7, 0);
  flagTip.position.set(1.65, 3.7, 0);
  flagTip.rotation.z = -Math.PI / 2;
  make('FLAG', [flagPole, flag, flagTip]);

  attachEnvironmentApi(root, variantNames);
  root.setKind('DUNE');
  root.visible = false;
  cache.environment = root.clone(true);
  return root;
}
