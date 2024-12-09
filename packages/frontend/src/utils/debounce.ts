/* eslint-disable @typescript-eslint/no-explicit-any */

export function debounce(callback: (...args: any[]) => void, wait = 300): () => void {
  let timeoutId: number | undefined;
  return (...args: any[]): void => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
}
