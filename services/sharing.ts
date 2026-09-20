export async function api<T>(path: string, method = 'GET', body?: unknown, owner?: string): Promise<T> {
  if (location.protocol === 'file:') throw new Error('请在支持在线分享的网页版使用此功能');
  try {
    const response = await fetch(`/api/${path}`, { method, headers: { ...(method !== 'GET' ? {'Content-Type':'application/json'} : {}), ...(owner ? {Authorization:`Bearer ${owner}`} : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('此站点尚未启用在线分享服务，请使用已部署分享服务的网页版');
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || '分享服务暂时不可用');
    return value;
  } catch (error) { throw new Error(error instanceof Error ? error.message : '网络异常，请重试'); }
}

export function disposeShare(path: string, owner: string) {
  if (location.protocol === 'file:') return;
  void fetch(`/api/${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner}` },
    body: '{}',
    keepalive: true,
  }).catch(() => {});
}
export const shareUrl = (kind: 'join' | 'result', id: string) => new URL(`#${kind}=${id}`, location.href.split('#')[0]).href;
