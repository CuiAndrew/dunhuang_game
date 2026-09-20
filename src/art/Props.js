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
  return mesh;
}
