// Keeps generated audio aligned with the same state transitions that pause gameplay.
export function bindAudioLifecycle(gameState, sfx, playingState) {
  return gameState.subscribe((next) => {
    if (next === playingState) {
      void sfx.resume();
      return;
    }
    sfx.setDanger(false);
    void sfx.pause();
  });
}
