// Reuses arc-length decoration records so infinite scenery never grows the heap during a run.
export class ChunkPool {
  constructor({ size = 32, create = () => ({}) }) {
    this.items = new Array(size);
    this.free = [];
    this.active = [];
    this.create = create;
    for (let index = 0; index < size; index += 1) {
      const slot = { item: create(), s: 0, kind: '', active: false };
      this.items[index] = slot;
      this.free.push(slot);
    }
  }

  acquire(s, kind = '') {
    const slot = this.free.pop();
    if (!slot) return null;
    slot.s = s;
    slot.kind = kind;
    slot.active = true;
    this.active.push(slot);
    return slot;
  }

  recycleBefore(s, onRecycle = () => {}) {
    let index = 0;
    while (index < this.active.length) {
      const slot = this.active[index];
      if (slot.s >= s) {
        index += 1;
        continue;
      }
      this.active[index] = this.active[this.active.length - 1];
      this.active.pop();
      slot.active = false;
      onRecycle(slot);
      this.free.push(slot);
    }
  }

  reset(onRecycle = () => {}) {
    while (this.active.length > 0) {
      const slot = this.active.pop();
      slot.active = false;
      onRecycle(slot);
      this.free.push(slot);
    }
  }

  activeCount() {
    return this.active.length;
  }

  freeCount() {
    return this.free.length;
  }
}
