import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { CONFIG } from '../src/core/Config.js';
import { TrackGraph } from '../src/world/TrackGraph.js';
import { TrackMesh } from '../src/world/TrackMesh.js';

test('track art repeats by arc length and keeps bounded reusable bridge rails', () => {
  const track = new TrackGraph({ Vector3: THREE.Vector3, config: CONFIG, random: () => 0.7 });
  track.ensureAhead(0, 24);
  const view = new TrackMesh({ THREE, track, config: CONFIG, palette: {
    sand: 0xE3C68B,
    paper: 0xF6E7C8,
    muralGold: 0xE8B23A,
    muralBlue: 0x244B7A,
    bronze: 0x6B5A3E,
  } });

  const uv = view.geometry.getAttribute('uv');
  assert.equal(uv.count, CONFIG.track.samplePoolSize * 2);
  assert.equal(uv.getX(0), 0);
  assert.equal(uv.getX(1), 1);
  assert.equal(uv.getY(0), track.getSampleAt(0).s / 4);
  assert.ok(view.railBody.isInstancedMesh);
  assert.ok(view.railTrim.isInstancedMesh);
  assert.ok(view.railBody.count > 0);
  assert.ok(view.railBody.count <= (CONFIG.track.samplePoolSize - 1) * 2);

  const uvBefore = uv;
  track.ensureAhead(0, 50);
  view.updateFromTrack();
  assert.equal(view.geometry.getAttribute('uv'), uvBefore, 'track growth reuses its UV buffer');
});
