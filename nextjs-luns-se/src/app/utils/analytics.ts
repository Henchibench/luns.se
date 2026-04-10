export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && (window as any).umami) {
    (window as any).umami.track(name, data);
  }
}
