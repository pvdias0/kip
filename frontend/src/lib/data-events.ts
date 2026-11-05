const EVENT = "kip:data-changed";

/** Avisa a interface (listas, totais, visao geral) que os dados mudaram. */
export function notifyDataChanged() {
  window.dispatchEvent(new Event(EVENT));
}

export function onDataChanged(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
