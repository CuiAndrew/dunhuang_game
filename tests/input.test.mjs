import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG } from '../src/core/Config.js';

class EventTargetDouble {
  constructor() {
    this.listeners = [];
  }

  addEventListener(type, listener, options) {
    this.listeners.push({ type, listener, options });
  }

  removeEventListener() {}
}

async function loadInput() {
  try {
    return await import('../src/core/Input.js');
  } catch {
    return null;
  }
}

test('Input emits exactly one semantic action for keyboard, touch and mouse gestures', async () => {
  const module = await loadInput();
  assert.ok(module, 'Input module must exist');

  const target = new EventTargetDouble();
  const actions = [];
  const input = new module.Input({ target, config: CONFIG, onAction: (action) => actions.push(action) });
  input.attach();

  let prevented = 0;
  input.handleKeyDown({ key: 'ArrowLeft', repeat: false, preventDefault: () => { prevented += 1; } });
  input.handleKeyDown({ key: ' ', repeat: false, preventDefault: () => { prevented += 1; } });
  input.handleTouchStart({ touches: [{ clientX: 100, clientY: 100 }], preventDefault: () => { prevented += 1; } });
  input.handleTouchEnd({ changedTouches: [{ clientX: 145, clientY: 102 }], preventDefault: () => { prevented += 1; } });
  input.handleMouseDown({ clientX: 100, clientY: 100, preventDefault: () => { prevented += 1; } });
  input.handleMouseUp({ clientX: 100, clientY: 50, preventDefault: () => { prevented += 1; } });

  assert.deepEqual(actions, ['LEFT', 'JUMP', 'RIGHT', 'JUMP']);
  assert.equal(prevented, 6);
  assert.ok(target.listeners.filter((entry) => entry.type.startsWith('touch') || entry.type.startsWith('mouse')).every((entry) => entry.options.passive === false));
});

test('Input leaves taps on native controls available for their click handlers', async () => {
  const module = await loadInput();
  assert.ok(module, 'Input module must exist');
  const target = new EventTargetDouble();
  const actions = [];
  const input = new module.Input({ target, config: CONFIG, onAction: (action) => actions.push(action) });
  let prevented = 0;
  const buttonTarget = { closest: () => ({ tagName: 'BUTTON' }) };

  input.handleTouchStart({
    target: buttonTarget,
    touches: [{ clientX: 100, clientY: 100 }],
    preventDefault: () => { prevented += 1; },
  });
  input.handleTouchEnd({
    target: buttonTarget,
    changedTouches: [{ clientX: 160, clientY: 100 }],
    preventDefault: () => { prevented += 1; },
  });

  assert.deepEqual(actions, []);
  assert.equal(prevented, 0);
});
