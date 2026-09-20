// Builds shared procedural obstacle silhouettes so the gameplay layer never depends on binary art assets.
export function createObstacleVisual(THREE, palette, config) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: palette.bronze, roughness: 0.78 }),
  );
  mesh.castShadow = true;
  mesh.visible = false;
  mesh.setType = (type) => {
    mesh.visible = true;
    mesh.userData.obstacleType = type;
    if (type === 'BEAM') {
      mesh.scale.set(2.6, 0.5, 0.4);
      mesh.userData.heightOffset = 1.25;
      mesh.material.color.setHex(palette.cinnabar);
    } else if (type === 'PILLAR') {
      mesh.scale.set(1.4, 3.2, 1.4);
      mesh.userData.heightOffset = 1.6;
      mesh.material.color.setHex(palette.bronze);
    } else if (type === 'FIRE') {
      mesh.scale.set(1.6, 1.1, 1.6);
      mesh.userData.heightOffset = 0.55;
      mesh.material.color.setHex(palette.cinnabar);
    } else if (type === 'GAP') {
      mesh.scale.set(2.6, 0.05, 2.4);
      mesh.userData.heightOffset = 0.03;
      mesh.material.color.setHex(palette.ink);
    } else {
      mesh.scale.set(2.2, 0.8, 0.7);
      mesh.userData.heightOffset = 0.4;
      mesh.material.color.setHex(palette.plaster);
    }
  };
  mesh.userData.config = config;
  return mesh;
}

export function createPursuerVisual(THREE, palette) {
  const root = new THREE.Group();
  root.name = 'bronze-stone-beast';
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), new THREE.MeshStandardMaterial({ color: palette.bronze, roughness: 0.9 }));
  body.scale.set(1.35, 0.9, 1.05);
  body.position.y = 1;
  const hornGeometry = new THREE.ConeGeometry(0.25, 0.9, 6);
  const hornMaterial = new THREE.MeshStandardMaterial({ color: palette.dunhuangGold, roughness: 0.65 });
  const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
  const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
  leftHorn.position.set(-0.55, 1.85, 0);
  rightHorn.position.set(0.55, 1.85, 0);
  leftHorn.rotation.z = -0.28;
  rightHorn.rotation.z = 0.28;
  const eyeGeometry = new THREE.SphereGeometry(0.09, 8, 6);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: palette.cinnabar });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.3, 1.2, 0.9);
  rightEye.position.set(0.3, 1.2, 0.9);
  root.add(body, leftHorn, rightHorn, leftEye, rightEye);
  root.visible = false;
  return root;
}

export function createPickupVisual(THREE, palette, type = 'COIN') {
  const color = type === 'COIN' ? palette.dunhuangGold : (type === 'SHIELD' ? palette.stoneBlue : palette.cinnabar);
  const geometry = type === 'COIN' ? new THREE.TorusGeometry(0.24, 0.08, 6, 12) : new THREE.OctahedronGeometry(0.32, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.45 }));
  mesh.rotation.x = Math.PI / 2;
  mesh.visible = false;
  mesh.userData.kind = type;
  mesh.setType = (nextType) => {
    const nextColor = nextType === 'SHIELD' ? palette.stoneBlue : palette.cinnabar;
    mesh.userData.kind = nextType;
    mesh.material.color.setHex(nextColor);
    mesh.material.emissive.setHex(nextColor);
  };
  return mesh;
}

export function createEnvironmentVisual(THREE, palette) {
  const root = new THREE.Group();
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
  const poleGeometry = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6);

  const dune = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.5, 12), new THREE.MeshStandardMaterial({ color: palette.sand, roughness: 1 }));
  dune.position.y = 1.1;
  make('DUNE', [dune]);

  const templeBase = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 2.6), stone);
  templeBase.position.y = 1.3;
  const templeRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), red);
  templeRoof.position.y = 3.2;
  templeRoof.rotation.y = Math.PI / 4;
  make('TEMPLE', [templeBase, templeRoof]);

  const cave = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 3.2, 12, 1, false, 0, Math.PI), plaster);
  cave.rotation.z = Math.PI / 2;
  cave.position.y = 1.6;
  make('CAVE', [cave]);

  const lanternPole = new THREE.Mesh(poleGeometry, stone);
  lanternPole.position.y = 2.1;
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), gold);
  lantern.position.y = 4.0;
  make('LANTERN', [lanternPole, lantern]);

  const flagPole = new THREE.Mesh(poleGeometry, stone);
  flagPole.position.y = 2.1;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 0.05), green);
  flag.position.set(0.75, 3.7, 0);
  make('FLAG', [flagPole, flag]);

  root.setKind = (kind) => {
    for (const [name, variant] of variants) variant.visible = name === kind;
  };
  root.setKind('DUNE');
  root.visible = false;
  return root;
}
