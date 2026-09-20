// Owns the player’s track-relative position and a lightweight procedural traveler silhouette.
export const RUNNER_STATES = Object.freeze({
  RUN: 'RUN',
  JUMP: 'JUMP',
  SLIDE: 'SLIDE',
  STUMBLE: 'STUMBLE',
  DEAD: 'DEAD',
});

export class Runner {
  constructor({ THREE, Vector3, track, config, palette }) {
    this.THREE = THREE;
    this.track = track;
    this.config = config;
    this.palette = palette;
    this.s = 0;
    this.speed = config.runner.baseSpeed;
    this.lateral = 0;
    this.runTime = 0;
    this.laneIndex = 1;
    this.laneFrom = config.laneOffsets[this.laneIndex];
    this.laneTarget = this.laneFrom;
    this.laneElapsed = config.runner.laneChangeTime;
    this.edgeBounceElapsed = config.runner.edgeBounceTime;
    this.edgeBounceDirection = 0;
    this.jumpElapsed = 0;
    this.slideElapsed = 0;
    this.jumpBufferRemaining = 0;
    this.coyoteRemaining = config.runner.coyoteTime;
    this.verticalOffset = 0;
    this.collisionHeight = config.runner.runCollisionHeight;
    this.state = RUNNER_STATES.RUN;
    this.trackFrame = {
      position: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
    };
    this.root = new THREE.Group();
    this.root.name = 'runner';
    this._buildMesh();
    this.syncToTrack();
  }

  reset() {
    this.s = 0;
    this.speed = this.config.runner.baseSpeed;
    this.lateral = 0;
    this.runTime = 0;
    this.laneIndex = 1;
    this.laneFrom = this.config.laneOffsets[this.laneIndex];
    this.laneTarget = this.laneFrom;
    this.laneElapsed = this.config.runner.laneChangeTime;
    this.edgeBounceElapsed = this.config.runner.edgeBounceTime;
    this.edgeBounceDirection = 0;
    this.jumpElapsed = 0;
    this.slideElapsed = 0;
    this.jumpBufferRemaining = 0;
    this.coyoteRemaining = this.config.runner.coyoteTime;
    this.verticalOffset = 0;
    this.collisionHeight = this.config.runner.runCollisionHeight;
    this.state = RUNNER_STATES.RUN;
    this.root.scale.y = 1;
    this.syncToTrack();
  }

  update(dt) {
    this.speed = Math.min(
      this.config.runner.maxSpeed,
      this.config.runner.baseSpeed + this.s * this.config.runner.accelPerMeter,
    );
    this.s += this.speed * dt;
    this.runTime += dt;
    this._updateActionState(dt);
    this.syncToTrack();
    this._animateLegs();
  }

  updatePreview(dt) {
    this.runTime += dt;
    this.syncToTrack();
    this.root.position.y += Math.sin(this.runTime * this.config.runner.previewSpeed) * this.config.runner.previewBobHeight;
    this._animateLegs();
  }

  syncToTrack() {
    this.track.evalTrack(this.s, this.trackFrame);
    this.root.position.set(
      this.trackFrame.position.x + this.trackFrame.right.x * this.lateral,
      this.trackFrame.position.y + this.config.scene.runnerBaseHeight + this.verticalOffset,
      this.trackFrame.position.z + this.trackFrame.right.z * this.lateral,
    );
    this.root.rotation.y = Math.atan2(-this.trackFrame.forward.x, this.trackFrame.forward.z);
  }

  handleAction(action) {
    if (action === 'LEFT') {
      this.moveLane(-1);
      return;
    }
    if (action === 'RIGHT') {
      this.moveLane(1);
      return;
    }
    if (action === 'JUMP') {
      if (this.state === RUNNER_STATES.RUN || this.coyoteRemaining > 0) {
        this._startJump();
      } else {
        this.jumpBufferRemaining = this.config.runner.inputBuffer;
      }
      return;
    }
    if (action === 'SLIDE' && this.state === RUNNER_STATES.RUN) {
      this.state = RUNNER_STATES.SLIDE;
      this.slideElapsed = 0;
      this.collisionHeight = this.config.runner.slideCollisionHeight;
      this.root.scale.y = this.config.runner.slideScaleY;
    }
  }

  moveLane(direction) {
    const requestedLane = this.laneIndex + direction;
    if (requestedLane < 0 || requestedLane >= this.config.laneOffsets.length) {
      this.edgeBounceElapsed = 0;
      this.edgeBounceDirection = direction;
      return;
    }
    this.laneFrom = this.lateral;
    this.laneIndex = requestedLane;
    this.laneTarget = this.config.laneOffsets[this.laneIndex];
    this.laneElapsed = 0;
  }

  _buildMesh() {
    const runner = this.config.runner;
    const THREE = this.THREE;
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(runner.capsuleRadius, runner.capsuleLength, runner.capsuleCapSegments, runner.capsuleRadialSegments),
      new THREE.MeshStandardMaterial({ color: this.palette.ochreRed, roughness: 0.65 }),
    );
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(runner.headRadius, runner.capsuleRadialSegments, runner.capsuleCapSegments),
      new THREE.MeshStandardMaterial({ color: this.palette.plaster, roughness: 0.8 }),
    );
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(runner.haloRadius, runner.haloSegments),
      new THREE.MeshBasicMaterial({
        color: this.palette.dunhuangGold,
        transparent: true,
        opacity: 0.54,
        side: THREE.DoubleSide,
      }),
    );
    const legGeometry = new THREE.CylinderGeometry(runner.legRadius, runner.legRadius, runner.legLength, runner.capsuleCapSegments);
    const legMaterial = new THREE.MeshStandardMaterial({ color: this.palette.stoneBlue, roughness: 0.72 });
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(runner.shadowRadius, runner.shadowSegments),
      new THREE.MeshBasicMaterial({ color: this.palette.ink, transparent: true, opacity: 0.28 }),
    );

    this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    head.position.set(0, runner.bodyHeight / 2, 0);
    halo.position.set(0, runner.bodyHeight / 2, runner.bodyDepth);
    this.leftLeg.position.set(-runner.legOffset, -runner.legHipHeight, 0);
    this.rightLeg.position.set(runner.legOffset, -runner.legHipHeight, 0);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -this.config.scene.runnerBaseHeight + this.config.track.laneMarkHeight;
    this.root.add(shadow, body, head, halo, this.leftLeg, this.rightLeg);
  }

  _animateLegs() {
    const swing = Math.sin(this.runTime * this.config.runner.legRunRate) * this.config.runner.legRunAmplitude;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
  }

  _startJump() {
    this.state = RUNNER_STATES.JUMP;
    this.jumpElapsed = 0;
    this.verticalOffset = 0;
    this.jumpBufferRemaining = 0;
  }

  _updateActionState(dt) {
    const runner = this.config.runner;
    if (this.laneElapsed < runner.laneChangeTime) {
      this.laneElapsed = Math.min(runner.laneChangeTime, this.laneElapsed + dt);
      const progress = this.laneElapsed / runner.laneChangeTime;
      const eased = progress * progress * (3 - 2 * progress);
      this.lateral = this.laneFrom + (this.laneTarget - this.laneFrom) * eased;
    }

    if (this.edgeBounceElapsed < runner.edgeBounceTime) {
      this.edgeBounceElapsed = Math.min(runner.edgeBounceTime, this.edgeBounceElapsed + dt);
      const progress = this.edgeBounceElapsed / runner.edgeBounceTime;
      this.lateral = this.config.laneOffsets[this.laneIndex]
        + Math.sin(progress * Math.PI) * runner.edgeBounceDistance * this.edgeBounceDirection;
    }

    if (this.state === RUNNER_STATES.JUMP) {
      this.jumpElapsed += dt;
      if (this.jumpElapsed < runner.jumpRiseTime) {
        const riseGravity = (2 * runner.jumpHeight) / (runner.jumpRiseTime * runner.jumpRiseTime);
        const takeoffVelocity = riseGravity * runner.jumpRiseTime;
        this.verticalOffset = takeoffVelocity * this.jumpElapsed - 0.5 * riseGravity * this.jumpElapsed * this.jumpElapsed;
      } else {
        const fallElapsed = this.jumpElapsed - runner.jumpRiseTime;
        if (fallElapsed >= runner.jumpFallTime - Number.EPSILON) {
          this.state = RUNNER_STATES.RUN;
          this.verticalOffset = 0;
        } else {
          const fallGravity = (2 * runner.jumpHeight) / (runner.jumpFallTime * runner.jumpFallTime);
          this.verticalOffset = runner.jumpHeight - 0.5 * fallGravity * fallElapsed * fallElapsed;
        }
      }
    } else if (this.state === RUNNER_STATES.SLIDE) {
      this.slideElapsed += dt;
      if (this.slideElapsed >= runner.slideTime - Number.EPSILON) {
        this.state = RUNNER_STATES.RUN;
        this.collisionHeight = runner.runCollisionHeight;
        this.root.scale.y = 1;
      }
    }

    if (this.state === RUNNER_STATES.RUN && this.jumpBufferRemaining > 0) {
      this.jumpBufferRemaining = Math.max(0, this.jumpBufferRemaining - dt);
      if (this.jumpBufferRemaining > 0) {
        this._startJump();
      }
    }
  }
}
