/**
 * The Android back button's stack of open layers (sheets, dialogs). A layer
 * registers a close handler while it is open; back closes the most recent one
 * before it navigates or exits.
 */
const handlers = [];

/**
 * @param {() => void} handler closes the layer
 * @returns {() => void} unsubscribe (call when the layer closes)
 */
export function onBack(handler) {
  handlers.push(handler);
  return () => {
    const i = handlers.lastIndexOf(handler);
    if (i !== -1) handlers.splice(i, 1);
  };
}

/** Close the most recent open layer. @returns {boolean} whether one was open */
export function consumeBack() {
  const handler = handlers.at(-1);
  if (!handler) return false;
  handler();
  return true;
}
