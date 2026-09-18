import type { Participant } from '../types';
// Rejection sampling prevents modulo bias for ranges that do not divide 2^32.
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('无效随机数范围');
  const limit = Math.floor(2 ** 32 / max) * max;
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % max;
}
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function pickWinners(participants: Participant[], count: number): Participant[] {
  if (!Number.isInteger(count) || count < 1 || count > participants.length) throw new RangeError('中奖名额必须在参与人数范围内');
  return secureShuffle(participants).slice(0, count);
}
