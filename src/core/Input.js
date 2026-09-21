// Converts keyboard, touch, mouse and device-tilt gestures into one-shot semantic runner actions.
const KEY_ACTIONS = Object.freeze({
  a: 'LEFT',
  arrowleft: 'LEFT',
  d: 'RIGHT',
  arrowright: 'RIGHT',
  w: 'JUMP',
  arrowup: 'JUMP',
  ' ': 'JUMP',
  spacebar: 'JUMP',
  s: 'SLIDE',
  arrowdown: 'SLIDE',
  escape: 'PAUSE',
  p: 'PAUSE',
});

export class Input {
  constructor({ target, config, onAction }) {
    this.target = target;
    this.config = config;
    this.onAction = onAction;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.mouseStartX = 0;
    this.mouseStartY = 0;
    this.touchActive = false;
    this.mouseActive = false;
    this.tiltCooldown = 0;
    this.nonPassiveOptions = { passive: false };
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
  }

  attach() {
    this.target.addEventListener('keydown', this.handleKeyDown);
    this.target.addEventListener('touchstart', this.handleTouchStart, this.nonPassiveOptions);
    this.target.addEventListener('touchend', this.handleTouchEnd, this.nonPassiveOptions);
    this.target.addEventListener('mousedown', this.handleMouseDown, this.nonPassiveOptions);
    this.target.addEventListener('mouseup', this.handleMouseUp, this.nonPassiveOptions);
    this.target.addEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  detach() {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('touchstart', this.handleTouchStart, this.nonPassiveOptions);
    this.target.removeEventListener('touchend', this.handleTouchEnd, this.nonPassiveOptions);
    this.target.removeEventListener('mousedown', this.handleMouseDown, this.nonPassiveOptions);
    this.target.removeEventListener('mouseup', this.handleMouseUp, this.nonPassiveOptions);
    this.target.removeEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  update(dt) {
    this.tiltCooldown = Math.max(0, this.tiltCooldown - dt);
  }

  handleKeyDown(event) {
    const action = KEY_ACTIONS[event.key.toLowerCase()];
    if (!action || event.repeat) {
      return;
    }
    event.preventDefault();
    this._emit(action);
  }

  handleTouchStart(event) {
    if (this._isInteractiveTarget(event.target)) return;
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchActive = true;
  }

  handleTouchEnd(event) {
    if (this._isInteractiveTarget(event.target)) return;
    event.preventDefault();
    if (!this.touchActive) {
      return;
    }
    const touch = event.changedTouches[0];
    this.touchActive = false;
    if (touch) {
      this._emitSwipe(touch.clientX - this.touchStartX, touch.clientY - this.touchStartY);
    }
  }

  handleMouseDown(event) {
    if (this._isInteractiveTarget(event.target)) return;
    event.preventDefault();
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.mouseActive = true;
  }

  handleMouseUp(event) {
    if (this._isInteractiveTarget(event.target)) return;
    event.preventDefault();
    if (!this.mouseActive) {
      return;
    }
    this.mouseActive = false;
    this._emitSwipe(event.clientX - this.mouseStartX, event.clientY - this.mouseStartY);
  }

  handleDeviceOrientation(event) {
    if (this.tiltCooldown > 0 || event.gamma === null) {
      return;
    }
    if (event.gamma >= this.config.input.tiltThreshold) {
      this.tiltCooldown = this.config.input.tiltRepeatDelay;
      this._emit('RIGHT');
    } else if (event.gamma <= -this.config.input.tiltThreshold) {
      this.tiltCooldown = this.config.input.tiltRepeatDelay;
      this._emit('LEFT');
    }
  }

  _emitSwipe(dx, dy) {
    const threshold = this.config.input.swipeThreshold;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      this._emit(dx > 0 ? 'RIGHT' : 'LEFT');
      return;
    }
    this._emit(dy < 0 ? 'JUMP' : 'SLIDE');
  }

  _emit(action) {
    this.onAction(action);
  }

  _isInteractiveTarget(target) {
    return Boolean(target?.closest?.('button, a, input, select, textarea'));
  }
}
