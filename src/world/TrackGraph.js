// Generates and recycles an arc-length sampled track so every moving system shares one deterministic coordinate frame.
const TRACK_TYPES = Object.freeze({
  STRAIGHT: 'STRAIGHT',
  TURN_L: 'TURN_L',
  TURN_R: 'TURN_R',
  SLOPE_UP: 'SLOPE_UP',
  SLOPE_DOWN: 'SLOPE_DOWN',
  GAP: 'GAP',
  START: 'START',
});

const TURN_TYPES = new Set([TRACK_TYPES.TURN_L, TRACK_TYPES.TURN_R]);

export class TrackGraph {
  constructor({ Vector3, config, random = Math.random }) {
    this.Vector3 = Vector3;
    this.config = config;
    this.random = random;
    this.capacity = config.track.samplePoolSize;
    this.sampleRing = new Array(this.capacity);
    this.freeSamples = [];
    this.sampleHead = 0;
    this.activeSampleCount = 0;
    this.segmentRing = new Array(config.track.segmentPoolSize);
    this.freeSegments = [];
    this.segmentHead = 0;
    this.activeSegmentCount = 0;
    this.totalLength = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.currentZ = 0;
    this.currentYaw = 0;
    this.lastWasTurn = false;
    this.lastWasGap = false;
    this.revision = 0;
    this.result = {
      position: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
    };

    this._preallocate();
    this._appendSample(this._acquireSample(), 0, 0, 0, 0, 0, 0, TRACK_TYPES.START);
  }

  trackLength() {
    return this.totalLength;
  }

  sampleCount() {
    return this.activeSampleCount;
  }

  firstSampleS() {
    return this._sampleAt(0).s;
  }

  getSampleAt(index) {
    return this._sampleAt(index);
  }

  getSegmentSnapshots() {
    const snapshots = [];
    for (let index = 0; index < this.activeSegmentCount; index += 1) {
      const segment = this._segmentAt(index);
      snapshots.push({
        type: segment.type,
        length: segment.length,
        entryYaw: segment.entryYaw,
        curvature: segment.curvature,
        slope: segment.slope,
        startS: segment.startS,
        endS: segment.endS,
      });
    }
    return snapshots;
  }

  gapStartAt(s) {
    for (let index = 0; index < this.activeSegmentCount; index += 1) {
      const segment = this._segmentAt(index);
      if (segment.type === TRACK_TYPES.GAP && s >= segment.startS && s <= segment.endS) {
        return segment.startS;
      }
    }
    return null;
  }

  ensureAhead(playerS, distanceAhead) {
    const targetLength = playerS + distanceAhead;
    while (this.totalLength < targetLength) {
      this._generateSegment();
    }
    this.recycleBefore(playerS - this.config.track.recycleBehind);
  }

  reset() {
    for (let index = 0; index < this.activeSampleCount; index += 1) {
      const ringIndex = (this.sampleHead + index) % this.capacity;
      const sample = this.sampleRing[ringIndex];
      if (sample) this.freeSamples.push(sample);
      this.sampleRing[ringIndex] = null;
    }
    for (let index = 0; index < this.activeSegmentCount; index += 1) {
      const ringIndex = (this.segmentHead + index) % this.segmentRing.length;
      const segment = this.segmentRing[ringIndex];
      if (segment) this.freeSegments.push(segment);
      this.segmentRing[ringIndex] = null;
    }
    this.sampleHead = 0;
    this.activeSampleCount = 0;
    this.segmentHead = 0;
    this.activeSegmentCount = 0;
    this.totalLength = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.currentZ = 0;
    this.currentYaw = 0;
    this.lastWasTurn = false;
    this.lastWasGap = false;
    this.revision += 1;
    this._appendSample(this._acquireSample(), 0, 0, 0, 0, 0, 0, TRACK_TYPES.START);
  }

  recycleBefore(s) {
    while (this.activeSampleCount > 1 && this._sampleAt(0).s < s) {
      const sample = this._sampleAt(0);
      this.freeSamples.push(sample);
      this.sampleRing[this.sampleHead] = null;
      this.sampleHead = (this.sampleHead + 1) % this.capacity;
      this.activeSampleCount -= 1;
    }

    while (this.activeSegmentCount > 1 && this._segmentAt(0).endS < s) {
      const segment = this._segmentAt(0);
      this.freeSegments.push(segment);
      this.segmentRing[this.segmentHead] = null;
      this.segmentHead = (this.segmentHead + 1) % this.segmentRing.length;
      this.activeSegmentCount -= 1;
    }
  }

  evalTrack(s, out = this.result) {
    const first = this._sampleAt(0);
    const last = this._sampleAt(this.activeSampleCount - 1);

    if (s <= first.s) {
      return this._copyFrame(first, out);
    }
    if (s >= last.s) {
      return this._copyFrame(last, out);
    }

    let low = 0;
    let high = this.activeSampleCount - 1;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (this._sampleAt(middle).s <= s) {
        low = middle;
      } else {
        high = middle;
      }
    }

    const from = this._sampleAt(low);
    const to = this._sampleAt(high);
    const ratio = (s - from.s) / (to.s - from.s);
    out.position.set(
      from.position.x + (to.position.x - from.position.x) * ratio,
      from.position.y + (to.position.y - from.position.y) * ratio,
      from.position.z + (to.position.z - from.position.z) * ratio,
    );
    out.forward.set(
      from.forward.x + (to.forward.x - from.forward.x) * ratio,
      from.forward.y + (to.forward.y - from.forward.y) * ratio,
      from.forward.z + (to.forward.z - from.forward.z) * ratio,
    );
    this._normalize(out.forward);
    out.right.set(
      from.right.x + (to.right.x - from.right.x) * ratio,
      from.right.y + (to.right.y - from.right.y) * ratio,
      from.right.z + (to.right.z - from.right.z) * ratio,
    );
    this._normalize(out.right);
    return out;
  }

  _preallocate() {
    for (let index = 0; index < this.capacity; index += 1) {
      this.freeSamples.push({
        s: 0,
        type: TRACK_TYPES.START,
        position: new this.Vector3(),
        forward: new this.Vector3(),
        right: new this.Vector3(),
      });
    }

    for (let index = 0; index < this.segmentRing.length; index += 1) {
      this.freeSegments.push({
        type: TRACK_TYPES.STRAIGHT,
        length: 0,
        entryYaw: 0,
        curvature: 0,
        slope: 0,
        startS: 0,
        endS: 0,
        startX: 0,
        startY: 0,
        startZ: 0,
      });
    }
  }

  _generateSegment() {
    const segment = this._acquireSegment();
    const type = this._nextType();
    const track = this.config.track;
    const isTurn = TURN_TYPES.has(type);
    const isSlope = type === TRACK_TYPES.SLOPE_UP || type === TRACK_TYPES.SLOPE_DOWN;
    const isGap = type === TRACK_TYPES.GAP;
    const length = isTurn ? track.turnArcLength : (isGap ? track.gapLength : track.segmentLength);
    const direction = type === TRACK_TYPES.TURN_L ? 1 : (type === TRACK_TYPES.TURN_R ? -1 : 0);

    segment.type = type;
    segment.length = length;
    segment.entryYaw = this.currentYaw;
    segment.curvature = direction * (Math.PI / 2) / length;
    segment.slope = isSlope ? (type === TRACK_TYPES.SLOPE_UP ? track.slopeAmount : -track.slopeAmount) : 0;
    segment.startS = this.totalLength;
    segment.endS = segment.startS + length;
    segment.startX = this.currentX;
    segment.startY = this.currentY;
    segment.startZ = this.currentZ;
    this._appendSegment(segment);

    const sampleStep = isTurn ? track.turnSampleStep : track.straightSampleStep;
    const steps = Math.ceil(length / sampleStep);
    for (let index = 1; index <= steps; index += 1) {
      const localS = length * index / steps;
      this._writePointOnSegment(segment, localS, this.result);
      this._appendSample(
        this._acquireSample(),
        segment.startS + localS,
        this.result.position.x,
        this.result.position.y,
        this.result.position.z,
        segment.entryYaw + segment.curvature * localS,
        segment.slope,
        type,
      );
    }

    this._writePointOnSegment(segment, length, this.result);
    this.currentX = this.result.position.x;
    this.currentY = this.result.position.y;
    this.currentZ = this.result.position.z;
    this.currentYaw = segment.entryYaw + segment.curvature * length;
    this.totalLength = segment.endS;
    this.lastWasTurn = isTurn;
    this.lastWasGap = isGap;
    this.revision += 1;
  }

  _nextType() {
    if (this.lastWasTurn || this.lastWasGap) {
      return TRACK_TYPES.STRAIGHT;
    }

    const track = this.config.track;
    const weights = this.totalLength < track.earlyDistanceEnd
      ? track.earlyWeights
      : (this.totalLength < track.mediumDistanceEnd ? track.mediumWeights : track.lateWeights);
    const roll = this.random();
    let cumulative = 0;
    for (const [type, weight] of weights) {
      cumulative += weight;
      if (roll < cumulative) {
        return type;
      }
    }
    return weights[weights.length - 1][0];
  }

  _writePointOnSegment(segment, localS, out) {
    const horizontalRatio = 1 / Math.sqrt(1 + segment.slope * segment.slope);
    const planarS = localS * horizontalRatio;
    const yaw = segment.entryYaw + segment.curvature * localS;
    let x;
    let z;

    if (segment.curvature === 0) {
      x = segment.startX - Math.sin(segment.entryYaw) * planarS;
      z = segment.startZ + Math.cos(segment.entryYaw) * planarS;
    } else {
      x = segment.startX + (Math.cos(yaw) - Math.cos(segment.entryYaw)) / segment.curvature;
      z = segment.startZ + (Math.sin(yaw) - Math.sin(segment.entryYaw)) / segment.curvature;
    }

    out.position.set(x, segment.startY + segment.slope * planarS, z);
    out.forward.set(
      -Math.sin(yaw) * horizontalRatio,
      segment.slope * horizontalRatio,
      Math.cos(yaw) * horizontalRatio,
    );
    out.right.set(Math.cos(yaw), 0, Math.sin(yaw));
  }

  _appendSample(sample, s, x, y, z, yaw, slope, type) {
    const index = (this.sampleHead + this.activeSampleCount) % this.capacity;
    const horizontalRatio = 1 / Math.sqrt(1 + slope * slope);
    sample.s = s;
    sample.type = type;
    sample.position.set(x, y, z);
    sample.forward.set(-Math.sin(yaw) * horizontalRatio, slope * horizontalRatio, Math.cos(yaw) * horizontalRatio);
    sample.right.set(Math.cos(yaw), 0, Math.sin(yaw));
    this.sampleRing[index] = sample;
    this.activeSampleCount += 1;
  }

  _appendSegment(segment) {
    const index = (this.segmentHead + this.activeSegmentCount) % this.segmentRing.length;
    this.segmentRing[index] = segment;
    this.activeSegmentCount += 1;
  }

  _acquireSample() {
    const sample = this.freeSamples.pop();
    if (!sample) {
      throw new Error('Track sample pool exhausted; increase CONFIG.track.samplePoolSize.');
    }
    return sample;
  }

  _acquireSegment() {
    const segment = this.freeSegments.pop();
    if (!segment) {
      throw new Error('Track segment pool exhausted; increase CONFIG.track.segmentPoolSize.');
    }
    return segment;
  }

  _sampleAt(index) {
    return this.sampleRing[(this.sampleHead + index) % this.capacity];
  }

  _segmentAt(index) {
    return this.segmentRing[(this.segmentHead + index) % this.segmentRing.length];
  }

  _copyFrame(sample, out) {
    out.position.set(sample.position.x, sample.position.y, sample.position.z);
    out.forward.set(sample.forward.x, sample.forward.y, sample.forward.z);
    out.right.set(sample.right.x, sample.right.y, sample.right.z);
    return out;
  }

  _normalize(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z);
    vector.set(vector.x / length, vector.y / length, vector.z / length);
  }
}

export { TRACK_TYPES };
