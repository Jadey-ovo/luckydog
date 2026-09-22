export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown, owner?: string): Promise<T> {
  try {
    if (location.protocol === 'file:') {
      if (!window.luckydogDesktop) throw new Error('当前桌面版本尚未启用在线邀请，请更新到最新版本');
      const response = await window.luckydogDesktop.request({ path, method, body, owner });
      const value = response.value as { error?: string };
      if (!response.ok) throw new ApiError(value?.error || '在线邀请服务暂时不可用', response.status);
      return response.value as T;
    }
    const response = await fetch(`/api/${path}`, { method, headers: { ...(method !== 'GET' ? {'Content-Type':'application/json'} : {}), ...(owner ? {Authorization:`Bearer ${owner}`} : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('此站点尚未启用在线分享服务，请使用已部署分享服务的网页版');
    const value = await response.json();
    if (!response.ok) throw new ApiError(value.error || '分享服务暂时不可用', response.status);
    return value;
  } catch (error) { throw error instanceof Error ? error : new Error('网络异常，请重试'); }
}

export function disposeShare(path: string, owner: string) {
  if (location.protocol === 'file:') { void window.luckydogDesktop?.request({path,method:'DELETE',body:{},owner}).catch(()=>{}); return; }
  void fetch(`/api/${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner}` },
    body: '{}',
    keepalive: true,
  }).catch(() => {});
}
export const shareUrl = (kind: 'join' | 'result', id: string) => new URL(`#${kind}=${id}`, location.protocol === 'file:' ? 'https://luckydog-draw.jadey-owo.chatgpt.site/' : location.href.split('#')[0]).href;
