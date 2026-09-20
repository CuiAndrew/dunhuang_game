// Implements the explicit game-state transitions so systems never infer lifecycle from UI state.
export const GAME_STATES = Object.freeze({
  LOADING: 'LOADING',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  DEAD: 'DEAD',
});

const TRANSITIONS = Object.freeze({
  [GAME_STATES.LOADING]: new Set([GAME_STATES.MENU]),
  [GAME_STATES.MENU]: new Set([GAME_STATES.PLAYING]),
  [GAME_STATES.PLAYING]: new Set([GAME_STATES.PAUSED, GAME_STATES.DEAD]),
  [GAME_STATES.PAUSED]: new Set([GAME_STATES.PLAYING, GAME_STATES.MENU]),
  [GAME_STATES.DEAD]: new Set([GAME_STATES.PLAYING, GAME_STATES.MENU]),
});

export class GameState {
  constructor(initial = GAME_STATES.LOADING) {
    this.current = initial;
    this.previous = null;
    this.listeners = new Set();
  }

  transition(next) {
    if (!TRANSITIONS[this.current].has(next)) {
      return false;
    }

    this.previous = this.current;
    this.current = next;
    for (const listener of this.listeners) {
      listener(next, this.previous);
    }
    return true;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
