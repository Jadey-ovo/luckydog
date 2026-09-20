import { useEffect, useState } from 'react';
import { parseParticipants, STORAGE_KEY } from '../services/participants';

const isDesktop = window.location.protocol === 'file:';
const LEGACY_REMEMBER_KEY = 'luckydog-remember-participants';

export function useParticipants() {
  const [initial] = useState(() => {
    try {
      // The web version is deliberately memory-only. The desktop app remains
      // convenient offline by restoring its local list between launches.
      if (!isDesktop) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_REMEMBER_KEY);
      }
      return { data: isDesktop ? parseParticipants(localStorage.getItem(STORAGE_KEY)) : [], error: '' };
    } catch {
      return { data: [], error: '本机名单读取失败，原始数据未覆盖。导入新名单或清空后可重新保存。' };
    }
  });
  const [participants, setParticipants] = useState(initial.data);
  const [storageError, setStorageError] = useState(initial.error);

  useEffect(() => {
    if (!isDesktop || (initial.error && participants === initial.data)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
      setStorageError('');
    } catch {
      setStorageError('名单无法保存到本机，当前页面仍可抽奖，关闭后可能丢失修改。');
    }
  }, [participants, initial]);

  return { participants, setParticipants, storageError, isDesktop };
}
