import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/core/Config.js';

class TestVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

async function loadTrackGraph() {
  try {
    return await import('../src/world/TrackGraph.js');
  } catch {
    return null;
  }
}

test('TrackGraph keeps the requested path ahead and evaluates normalized frame vectors', async () => {
  const module = await loadTrackGraph();
  assert.ok(module, 'TrackGraph module must exist');

  const graph = new module.TrackGraph({ Vector3: TestVector3, config: CONFIG, random: () => 0.7 });
  graph.ensureAhead(0, CONFIG.track.keepAhead);

  assert.ok(graph.trackLength() >= CONFIG.track.keepAhead);
  const frame = graph.evalTrack(0);
  assert.equal(frame.position.z, 0);
  assert.ok(Math.abs(frame.forward.x) < 0.0001);
  assert.equal(frame.forward.z, 1);
  assert.equal(frame.right.x, 1);

  graph.ensureAhead(350, 260);
  const segments = graph.getSegmentSnapshots();
  const firstTurnIndex = segments.findIndex((segment) => segment.type === 'TURN_L');
  assert.ok(firstTurnIndex >= 0, 'medium-distance generation should include a left turn for random=0.7');
  assert.notEqual(segments[firstTurnIndex + 1].type, 'TURN_L');
  assert.notEqual(segments[firstTurnIndex + 1].type, 'TURN_R');

  const turn = segments[firstTurnIndex];
  const turnFrame = graph.evalTrack(turn.startS + turn.length / 2);
  const forwardLength = Math.hypot(turnFrame.forward.x, turnFrame.forward.y, turnFrame.forward.z);
  const rightLength = Math.hypot(turnFrame.right.x, turnFrame.right.y, turnFrame.right.z);
  assert.ok(Math.abs(forwardLength - 1) < 0.0001);
  assert.ok(Math.abs(rightLength - 1) < 0.0001);
  assert.ok(turnFrame.forward.x < 0, 'TURN_L must rotate the +Z heading toward world -X');
});

test('TrackGraph permits gaps only in high-distance generation and recycles spent samples', async () => {
  const module = await loadTrackGraph();
  assert.ok(module, 'TrackGraph module must exist');

  const graph = new module.TrackGraph({ Vector3: TestVector3, config: CONFIG, random: () => 0.99 });
  graph.ensureAhead(1000, CONFIG.track.keepAhead);

  const gap = graph.getSegmentSnapshots().find((segment) => segment.type === 'GAP');
  assert.ok(gap, 'high-distance generation should include a gap for random=0.99');
  assert.equal(gap.length, CONFIG.track.gapLength);

  graph.recycleBefore(200);
  assert.ok(graph.firstSampleS() >= 200);
  assert.ok(graph.sampleCount() < CONFIG.track.samplePoolSize);
});

test('TrackGraph reset restores the origin after samples have been recycled', async () => {
  const module = await loadTrackGraph();
  assert.ok(module, 'TrackGraph module must exist');
  const graph = new module.TrackGraph({ Vector3: TestVector3, config: CONFIG, random: () => 0.7 });
  graph.ensureAhead(600, CONFIG.track.keepAhead);
  graph.recycleBefore(500);
  assert.ok(graph.firstSampleS() > 0);

  graph.reset();

  assert.equal(graph.firstSampleS(), 0);
  assert.equal(graph.trackLength(), 0);
  assert.equal(graph.sampleCount(), 1);
  graph.ensureAhead(0, 30);
  assert.equal(graph.firstSampleS(), 0);
});
