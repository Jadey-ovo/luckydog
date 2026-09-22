export {};

declare global {
  interface Window {
    luckydogDesktop?: {
      request(request: { path: string; method: string; body?: unknown; owner?: string }): Promise<{
        ok: boolean;
        status: number;
        value: unknown;
      }>;
    };
  }
}
