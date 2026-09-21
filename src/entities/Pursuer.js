// Models the bronze stone beast as a forgiving distance economy behind the runner.
export class Pursuer {
  constructor({ config, createVisual = () => null }) {
    this.config = config;
    this.distance = config.pursuer.startDistance;
    this.dead = false;
    this.speedPenaltyRemaining = 0;
    this.roarPlayed = false;
    this.visual = createVisual();
    this.positionS = 0;
  }

  reset() {
    this.distance = this.config.pursuer.startDistance;
    this.dead = false;
    this.speedPenaltyRemaining = 0;
    this.roarPlayed = false;
  }

  update(runner, dt) {
    if (this.dead) {
      return;
    }
    this.distance = Math.min(
      this.config.pursuer.maxDistance,
      this.distance + this.config.pursuer.recoverRate * dt,
    );
    this.positionS = Math.max(0, runner.s - this.distance);
    if (this.speedPenaltyRemaining > 0) {
      this.speedPenaltyRemaining = Math.max(0, this.speedPenaltyRemaining - dt);
      const recovery = 1 - this.speedPenaltyRemaining / this.config.runner.hitRecoverTime;
      runner.speedPenaltyFactor = this.config.runner.hitSpeedPenalty
        + recovery * (1 - this.config.runner.hitSpeedPenalty);
    } else {
      runner.speedPenaltyFactor = 1;
    }
    if (this.distance <= this.config.pursuer.killDistance) {
      this.dead = true;
    }
  }

  registerHit(runner) {
    this.distance -= this.config.pursuer.hitPushBack;
    runner.speedPenaltyFactor = this.config.runner.hitSpeedPenalty;
    runner.speed *= this.config.runner.hitSpeedPenalty;
    this.speedPenaltyRemaining = this.config.runner.hitRecoverTime;
    if (this.distance <= this.config.pursuer.killDistance) {
      this.dead = true;
    }
  }

  consumeRoarCue() {
    if (this.distance >= this.config.pursuer.roarDistance) {
      this.roarPlayed = false;
      return false;
    }
    if (this.roarPlayed) return false;
    this.roarPlayed = true;
    return true;
  }
}
