// Evaluates deterministic track-space obstacle collisions with deliberate player-friendly tolerances.
const JUMP_TYPES = new Set(['LOW_BARRIER', 'FIRE', 'GAP']);

export function isObstacleHit(runner, obstacle, config) {
  const collision = config.collision;
  const obstacleLane = config.laneOffsets[obstacle.lane];
  const laneTolerance = collision.laneHalfWidth * collision.forgivingMultiplier;
  const sTolerance = (obstacle.depth + collision.runnerDepth) / 2;
  if (Math.abs(runner.s - obstacle.s) > sTolerance || Math.abs(runner.lateral - obstacleLane) >= laneTolerance) {
    return false;
  }
  if (obstacle.type === 'BEAM') {
    return runner.collisionHeight > collision.slideClearance;
  }
  if (JUMP_TYPES.has(obstacle.type)) {
    return runner.verticalOffset < obstacle.height - collision.jumpClearance;
  }
  return true;
}

export class CollisionSystem {
  constructor({ config, track = null, onHit, onSmash = () => {} }) {
    this.config = config;
    this.track = track;
    this.onHit = onHit;
    this.onSmash = onSmash;
    this.activeGapStartS = null;
  }

  update(runner, obstacleSpawner, { invulnerable = false } = {}) {
    let penaltyConsumed = this._checkTrackGap(runner, invulnerable);
    for (let index = 0; index < obstacleSpawner.obstacleCount(); index += 1) {
      const obstacle = obstacleSpawner.getObstacleAt(index);
      if (!obstacle.resolved && isObstacleHit(runner, obstacle, this.config)) {
        obstacle.resolved = true;
        if (invulnerable) {
          this.onSmash(obstacle);
        } else if (!penaltyConsumed) {
          this.onHit(obstacle);
          penaltyConsumed = true;
        }
      }
    }
  }

  _checkTrackGap(runner, invulnerable) {
    if (!this.track?.gapStartAt) return false;
    const gapStartS = this.track.gapStartAt(runner.s);
    if (gapStartS === null) {
      this.activeGapStartS = null;
      return false;
    }
    if (gapStartS === this.activeGapStartS) return false;
    this.activeGapStartS = gapStartS;
    if (runner.verticalOffset >= this.config.collision.jumpClearance) return false;
    const gap = {
      s: runner.s,
      lane: runner.laneIndex ?? 1,
      type: 'GAP',
      height: this.config.collision.jumpClearance,
      depth: this.config.track.gapLength,
    };
    if (invulnerable) this.onSmash(gap);
    else this.onHit(gap);
    return true;
  }
}
