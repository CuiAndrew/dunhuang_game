// Loads optional theme image trees once and leaves a null fallback at each failed leaf.
export async function loadImageTextures(THREE, assetTree, loader = new THREE.TextureLoader()) {
  async function loadNode(value) {
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        const texture = await loader.loadAsync(value);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      } catch {
        return null;
      }
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map(loadNode));
    }
    if (value && typeof value === 'object') {
      const entries = await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await loadNode(child)]));
      return Object.fromEntries(entries);
    }
    return null;
  }

  return loadNode(assetTree);
}
