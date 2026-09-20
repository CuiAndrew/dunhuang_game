// Keeps the camera stable in the moving track frame while preserving visible lane motion and speed feedback.
export class CameraRig {
  constructor({ camera, Vector3, track, config }) {
    this.camera = camera;
    this.track = track;
    this.config = config;
    this.runnerFrame = {
      position: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
    };
    this.lookFrame = {
      position: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
    };
  }

  snapTo(runner) {
    this._positionCamera(runner, 1);
  }

  update(runner, dt) {
    const blend = 1 - Math.exp(-this.config.camera.followRate * dt);
    this._positionCamera(runner, blend);
  }

  _positionCamera(runner, blend) {
    const cameraConfig = this.config.camera;
    this.track.evalTrack(runner.s, this.runnerFrame);
    this.track.evalTrack(runner.s + cameraConfig.lookAhead, this.lookFrame);

    const lateral = runner.lateral * cameraConfig.lateralFollow;
    const targetX = this.runnerFrame.position.x
      - this.runnerFrame.forward.x * cameraConfig.offsetBack
      + this.runnerFrame.right.x * lateral;
    const targetY = this.runnerFrame.position.y + cameraConfig.offsetUp;
    const targetZ = this.runnerFrame.position.z
      - this.runnerFrame.forward.z * cameraConfig.offsetBack
      + this.runnerFrame.right.z * lateral;
    this.camera.position.set(
      this.camera.position.x + (targetX - this.camera.position.x) * blend,
      this.camera.position.y + (targetY - this.camera.position.y) * blend,
      this.camera.position.z + (targetZ - this.camera.position.z) * blend,
    );
    this.camera.lookAt(
      this.lookFrame.position.x,
      this.lookFrame.position.y + cameraConfig.lookHeight,
      this.lookFrame.position.z,
    );

    const speedRange = this.config.runner.maxSpeed - this.config.runner.baseSpeed;
    const speedRatio = Math.min(1, Math.max(0, (runner.speed - this.config.runner.baseSpeed) / speedRange));
    const nextFov = cameraConfig.fovBase + (cameraConfig.fovMax - cameraConfig.fovBase) * speedRatio;
    if (this.camera.fov !== nextFov) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
