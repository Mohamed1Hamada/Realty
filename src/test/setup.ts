import { afterEach, beforeEach } from "vitest";

/* Polyfills ناقصة في jsdom ومطلوبة لمكونات Radix / Recharts */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

window.HTMLElement.prototype.scrollIntoView = () => {};

if (!("PointerEvent" in window)) {
  class PointerEventStub extends MouseEvent {}
  (window as unknown as { PointerEvent: typeof PointerEventStub }).PointerEvent =
    PointerEventStub;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});
