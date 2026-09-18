import { describe, it, expect, vi, afterEach } from 'vitest';
import { pickWinners, secureRandomInt } from '../utils/random';
import { importParticipants, parseParticipants } from '../services/participants';
afterEach(() => vi.restoreAllMocks());
describe('random draw', () => {
  it('rejects biased tail values', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementationOnce((a: any) => { a[0] = 4294967295; return a; }).mockImplementationOnce((a: any) => { a[0] = 7; return a; });
    expect(secureRandomInt(3)).toBe(1); expect(spy).toHaveBeenCalledTimes(2);
  });
  it('selects unique winners without changing input', () => {
    const p = importParticipants('甲\n乙\n丙', []); const copy = structuredClone(p);
    expect(new Set(pickWinners(p, 3).map(x => x.id)).size).toBe(3); expect(p).toEqual(copy);
    for (const n of [0, -1, 4, NaN, 1.5]) expect(() => pickWinners(p, n)).toThrow();
  });
});
describe('participants', () => {
  it('preserves empty lists and rejects corrupt storage', () => {
    expect(parseParticipants('[]')).toEqual([]); expect(parseParticipants(null)).toEqual([]);
    for (const raw of ['bad', '{}', '[{"id":"1","name":3}]', '[{"id":"1","name":"A"},{"id":"1","name":"B"}]']) expect(() => parseParticipants(raw)).toThrow();
  });
  it('handles duplicate names and Chinese delimiters', () => {
    expect(importParticipants('张三，张三；李四', []).map(p => p.name)).toEqual(['张三', '张三 1', '李四']);
  });
});
