import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/core/Config.js';

test('EnvironmentSystem keeps decorative props in a bounded arc-length pool', async () => {
  const { EnvironmentSystem } = await import('../src/world/Environment.js');
  const track = {
    evalTrack(s, out) {
      out.position.set(s, 0, 0);
      out.forward.set(0, 0, 1);
      out.right.set(-1, 0, 0);
    },
  };
  const makeVisual = () => ({ visible: false, position: { set() {} }, rotation: { y: 0 } });
  const environment = new EnvironmentSystem({ config: CONFIG, track, createVisual: makeVisual });
  const visuals = [];
  environment.forEachVisual((visual) => visuals.push(visual));
  assert.equal(visuals.length, CONFIG.art.decorationPoolSize);
  assert.equal(visuals.every(Boolean), true);
  environment.ensureAhead(0, 5000);
  const first = environment.poolStats();
  assert.equal(first.active <= CONFIG.art.decorationPoolSize, true);
  environment.recycleBefore(4900);
  const second = environment.poolStats();
  assert.equal(second.free > first.free, true);
  environment.ensureAhead(4900, 200);
  assert.equal(environment.poolStats().active <= CONFIG.art.decorationPoolSize, true);
});

test('EnvironmentSystem cycles the complete Dunhuang silhouette catalogue', async () => {
  const { EnvironmentSystem } = await import('../src/world/Environment.js');
  const kinds = [];
  let call = 0;
  const track = {
    evalTrack(s, out) {
      out.position.set(s, 0, 0);
      out.forward.set(0, 0, 1);
      out.right.set(-1, 0, 0);
    },
  };
  const makeVisual = () => ({
    visible: false,
    position: { set() {} },
    rotation: { y: 0 },
    setKind(kind) { kinds.push(kind); },
  });
  const environment = new EnvironmentSystem({
    config: CONFIG,
    track,
    createVisual: makeVisual,
    random: () => {
      const value = call % 2 === 0 ? Math.floor(call / 2) / 5 : 0;
      call += 1;
      return value;
    },
  });
  environment.ensureAhead(0, CONFIG.scene.roadStart + CONFIG.art.decorationSpacing * 4 + 1);
  assert.deepEqual([...new Set(kinds)], ['DUNE', 'TEMPLE', 'CAVE', 'LANTERN', 'FLAG']);
});
