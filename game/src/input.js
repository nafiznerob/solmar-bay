// Keyboard and mouse. Held keys give the drive and walk axes; one-shot keys
// (enter a car, punch, pause, mission log) are queued and taken once by the
// loop, so a press between two frames is never lost or counted twice.

export const KEY_ENTER_CAR = 'KeyE';
export const KEY_PUNCH = 'KeyF';
export const KEY_PAUSE = 'KeyP';
export const KEY_LOG = 'KeyM';
export const KEY_MUTE = 'KeyN';
export const KEY_HANDBRAKE = 'Space';

const DRIVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const ONE_SHOT = new Set([KEY_ENTER_CAR, KEY_PUNCH, KEY_PAUSE, KEY_LOG, KEY_MUTE, 'Enter', 'Escape']);

export function createControls(canvas) {
  const held = new Set();
  const queued = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('keydown', (event) => {
    if (DRIVE_KEYS.has(event.code) || ONE_SHOT.has(event.code)) event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (ONE_SHOT.has(event.code)) queued.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of all of them on blur.
  window.addEventListener('blur', () => {
    held.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });

  function axis(neg, pos) {
    return (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0);
  }

  return {
    /** -1..1 on each axis: WASD or the arrow keys. */
    moveX() { return axis('KeyA', 'KeyD') || axis('ArrowLeft', 'ArrowRight'); },
    moveY() { return axis('KeyW', 'KeyS') || axis('ArrowUp', 'ArrowDown'); },
    accelerate() { return held.has('KeyW') || held.has('ArrowUp'); },
    brake() { return held.has('KeyS') || held.has('ArrowDown'); },
    steer() { return axis('KeyA', 'KeyD') || axis('ArrowLeft', 'ArrowRight'); },
    handbrake() { return held.has(KEY_HANDBRAKE); },
    mouse,
    /** True once for each press of the named key since the last call. */
    pressed(code) {
      if (!queued.has(code)) return false;
      queued.delete(code);
      return true;
    },
    /** True while the left mouse button is held, and once per click. */
    takeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was;
    },
  };
}
