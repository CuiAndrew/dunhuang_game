// Generates pooled obstacle groups with a lane-level solvability guarantee before any visual placement occurs.
export class ObstacleSpawner {
  constructor({ config, random = Math.random, createVisual = () => null }) {
    this.config = config;
    this.random = random;
    this.createVisual = createVisual;
    this.activeGroups = new Array(config.spawn.obstacleGroupPoolSize);
    this.freeGroups = [];
    this.activeObstacles = new Array(config.spawn.obstaclePoolSize);
    this.freeObstacles = [];
    this.activeGroupCount = 0;
    this.activeObstacleCount = 0;
    this.allVisuals = [];
    this.nextSpawnS = config.spawn.obstacleStartDistance;
    this.groupSerial = 0;
    this._preallocate();
  }

  ensureAhead(playerS, distanceAhead, difficulty) {
    const targetS = playerS + distanceAhead;
    while (this.nextSpawnS < targetS) {
      this._spawnGroup(difficulty);
    }
  }

  recycleBefore(s) {
    let groupIndex = 0;
    while (groupIndex < this.activeGroupCount) {
      const group = this.activeGroups[groupIndex];
      if (group.s < s) {
        this._releaseGroup(groupIndex);
      } else {
        groupIndex += 1;
      }
    }

    let obstacleIndex = 0;
    while (obstacleIndex < this.activeObstacleCount) {
      const obstacle = this.activeObstacles[obstacleIndex];
      if (obstacle.s < s) {
        this._releaseObstacle(obstacleIndex);
      } else {
        obstacleIndex += 1;
      }
    }
  }

  getGroupSnapshots() {
    const snapshots = [];
    for (let index = 0; index < this.activeGroupCount; index += 1) {
      const group = this.activeGroups[index];
      snapshots.push({ s: group.s, occupiedLanes: group.occupiedLanes.slice(0, group.laneCount) });
    }
    return snapshots;
  }

  getObstacleAt(index) {
    return this.activeObstacles[index];
  }

  obstacleCount() {
    return this.activeObstacleCount;
  }

  forEachVisual(callback) {
    for (const visual of this.allVisuals) {
      callback(visual);
    }
  }

  reset() {
    for (let index = 0; index < this.activeObstacleCount; index += 1) {
      const obstacle = this.activeObstacles[index];
      obstacle.visual?.setType && (obstacle.visual.visible = false);
      this.freeObstacles.push(obstacle);
      this.activeObstacles[index] = null;
    }
    for (let index = 0; index < this.activeGroupCount; index += 1) {
      this.freeGroups.push(this.activeGroups[index]);
      this.activeGroups[index] = null;
    }
    this.activeObstacleCount = 0;
    this.activeGroupCount = 0;
    this.nextSpawnS = this.config.spawn.obstacleStartDistance;
    this.groupSerial = 0;
  }

  _preallocate() {
    for (let index = 0; index < this.config.spawn.obstacleGroupPoolSize; index += 1) {
      this.freeGroups.push({ s: 0, id: 0, laneCount: 0, occupiedLanes: new Array(this.config.laneOffsets.length) });
    }
    for (let index = 0; index < this.config.spawn.obstaclePoolSize; index += 1) {
      const visual = this.createVisual();
      this.allVisuals.push(visual);
      this.freeObstacles.push({
        s: 0,
        lane: 0,
        groupId: 0,
        type: 'LOW_BARRIER',
        resolved: false,
        visual,
      });
    }
  }

  _spawnGroup(difficulty) {
    const group = this._acquireGroup();
    const canUseTwoLanes = difficulty > 0.6;
    const requestedLaneCount = canUseTwoLanes && this.random() > 0.5 ? 2 : 1;
    group.s = this.nextSpawnS;
    group.id = this.groupSerial;
    group.laneCount = 0;
    this.groupSerial += 1;

    while (group.laneCount < requestedLaneCount) {
      const lane = Math.floor(this.random() * this.config.laneOffsets.length);
      if (!this._groupContainsLane(group, lane)) {
        group.occupiedLanes[group.laneCount] = lane;
        group.laneCount += 1;
      }
    }

    for (let index = 0; index < group.laneCount; index += 1) {
      const obstacle = this._acquireObstacle();
      obstacle.s = group.s;
      obstacle.lane = group.occupiedLanes[index];
      obstacle.groupId = group.id;
      obstacle.type = this._pickType();
      obstacle.resolved = false;
      obstacle.visual?.setType?.(obstacle.type);
    }

    const spawn = this.config.spawn;
    const minimumGap = Math.max(
      spawn.obstacleGapMin,
      spawn.obstacleGapBase - group.s * spawn.obstacleGapShrinkPerMeter,
    );
    this.nextSpawnS += minimumGap + this.random() * spawn.obstacleGapVariance;
  }

  _pickType() {
    const types = this.config.spawn.obstacleTypes;
    return types[Math.floor(this.random() * types.length)];
  }

  _groupContainsLane(group, lane) {
    for (let index = 0; index < group.laneCount; index += 1) {
      if (group.occupiedLanes[index] === lane) {
        return true;
      }
    }
    return false;
  }

  _acquireGroup() {
    const group = this.freeGroups.pop();
    if (!group) {
      throw new Error('Obstacle group pool exhausted; increase CONFIG.spawn.obstacleGroupPoolSize.');
    }
    this.activeGroups[this.activeGroupCount] = group;
    this.activeGroupCount += 1;
    return group;
  }

  _acquireObstacle() {
    const obstacle = this.freeObstacles.pop();
    if (!obstacle) {
      throw new Error('Obstacle pool exhausted; increase CONFIG.spawn.obstaclePoolSize.');
    }
    this.activeObstacles[this.activeObstacleCount] = obstacle;
    this.activeObstacleCount += 1;
    return obstacle;
  }

  _releaseGroup(index) {
    const lastIndex = this.activeGroupCount - 1;
    const group = this.activeGroups[index];
    this.activeGroups[index] = this.activeGroups[lastIndex];
    this.activeGroups[lastIndex] = null;
    this.activeGroupCount = lastIndex;
    this.freeGroups.push(group);
  }

  _releaseObstacle(index) {
    const lastIndex = this.activeObstacleCount - 1;
    const obstacle = this.activeObstacles[index];
    this.activeObstacles[index] = this.activeObstacles[lastIndex];
    this.activeObstacles[lastIndex] = null;
    this.activeObstacleCount = lastIndex;
    this.freeObstacles.push(obstacle);
    if (obstacle.visual) {
      obstacle.visual.visible = false;
    }
  }
}
