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
