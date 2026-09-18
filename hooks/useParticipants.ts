import { useEffect, useState } from 'react';
import { parseParticipants, STORAGE_KEY } from '../services/participants';

const REMEMBER_KEY = 'luckydog-remember-participants';
const isDesktop = window.location.protocol === 'file:';

export function useParticipants() {
  const [initial] = useState(() => {
    try {
      const remember = isDesktop || localStorage.getItem(REMEMBER_KEY) === 'true';
      return { data: remember ? parseParticipants(localStorage.getItem(STORAGE_KEY)) : [], remember, error: '' };
    } catch {
      return { data: [], remember: isDesktop, error: '本机名单读取失败，原始数据未覆盖。导入新名单或清空后可重新保存。' };
    }
  });
  const [participants, setParticipants] = useState(initial.data);
  const [remember, setRemember] = useState(initial.remember);
  const [storageError, setStorageError] = useState(initial.error);

  useEffect(() => {
    if (initial.error && participants === initial.data && remember === initial.remember) return;
    // A fresh web visit stays in memory and makes no storage writes.
    if (!remember) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
      setStorageError('');
    } catch {
      setStorageError('名单无法保存到本机，当前页面仍可抽奖，关闭后可能丢失修改。');
    }
  }, [participants, remember, initial]);

  function changeRemember(value: boolean) {
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
        if (!isDesktop) localStorage.setItem(REMEMBER_KEY, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(REMEMBER_KEY);
      }
      setRemember(value);
      setStorageError('');
    } catch {
      setStorageError('浏览器未允许修改本机存储，请在浏览器设置中清除此站点数据。');
    }
  }

  return { participants, setParticipants, storageError, remember, changeRemember, isDesktop };
}
