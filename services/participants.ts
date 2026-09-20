import type { Participant } from '../types';
export const STORAGE_KEY = 'aimall-draw-participants';
export function parseParticipants(raw: string | null): Participant[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim()) || new Set(value.map(p => p.id)).size !== value.length) {
    throw new Error('名单数据格式无效');
  }
  return value;
}
export function importParticipants(text: string, existing: Participant[]): Participant[] {
  const names = text.split(/[\n,;，；\s]+/).map(n => n.trim()).filter(Boolean);
  return mergeParticipantNames(names, existing);
}
export function mergeParticipantNames(names: string[], existing: Participant[]): Participant[] {
  const used = new Set(existing.map(p => p.name));
  return [...existing, ...names.map(name => {
    let unique = name;
    let suffix = 1;
    while (used.has(unique)) unique = `${name} ${suffix++}`;
    used.add(unique);
    return { id: crypto.randomUUID(), name: unique };
  })];
}
