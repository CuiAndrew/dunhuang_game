// Owns the player’s track-relative position and a lightweight procedural traveler silhouette.
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
    this.syncToTrack();
  }

  update(dt) {
    this.speed = Math.min(
      this.config.runner.maxSpeed,
      this.config.runner.baseSpeed + this.s * this.config.runner.accelPerMeter,
    );
    this.s += this.speed * dt;
    this.runTime += dt;
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
      this.trackFrame.position.y + this.config.scene.runnerBaseHeight,
      this.trackFrame.position.z + this.trackFrame.right.z * this.lateral,
    );
    this.root.rotation.y = Math.atan2(-this.trackFrame.forward.x, this.trackFrame.forward.z);
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
}
