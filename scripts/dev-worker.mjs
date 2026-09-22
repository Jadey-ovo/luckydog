// Local-only development supervisor. Schema changes must finish before the API restarts.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const config = resolve(process.env.LUCKYDOG_DEV_CONFIG || 'wrangler.json');
const state = resolve(process.env.LUCKYDOG_DEV_STATE || '.wrangler/state');
const port = process.env.LUCKYDOG_DEV_PORT || '3001';
const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
let child;
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stopping = true;
  child?.kill('SIGTERM');
});

function launch(args) {
  const processChild = spawn(process.execPath, [wrangler, ...args, '--config', config, '--persist-to', state], {
    stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, CI: 'true' },
  });
  // Attach listeners immediately so even an early launch failure cannot be missed.
  const done = new Promise(resolve => {
    processChild.once('error', error => resolve({ code: 1, error }));
    processChild.once('close', (code, signal) => resolve({ code, signal }));
  });
  child = processChild;
  return { processChild, done };
}
async function stop(running) {
  if (running.processChild.exitCode !== null) return;
  running.processChild.kill('SIGTERM');
  const timer = setTimeout(() => running.processChild.kill('SIGKILL'), 5000);
  try { await running.done; } finally { clearTimeout(timer); }
}
async function snapshot(directory) {
  const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort();
  return Object.fromEntries(await Promise.all(files.map(async file => [file,
    createHash('sha256').update(await readFile(resolve(directory, file))).digest('hex'),
  ])));
}
function checkAppendOnly(before, after) {
  if (Object.entries(before).some(([file, hash]) => after[file] !== hash)) {
    throw new Error('已有迁移被修改或删除。请恢复原文件并追加新迁移，然后重新运行 npm run dev:worker。');
  }
}

async function main() {
  const settings = JSON.parse(await readFile(config, 'utf8'));
  const binding = settings.d1_databases?.find(database => database.binding === 'DB');
  if (!binding) throw new Error('本地配置缺少 DB 数据库绑定');
  const migrations = resolve(dirname(config), binding.migrations_dir || 'migrations');
  let baseline = await snapshot(migrations);
  while (!stopping) {
    console.log('[Luckydog 本地开发] 正在应用本地数据库迁移；成功后才启动服务。');
    const migration = launch(['d1', 'migrations', 'apply', 'DB', '--local']);
    const migrated = await migration.done;
    if (stopping) return;
    if (migrated.code !== 0) throw new Error('本地数据库迁移失败，服务未启动。请修复新增迁移后重新运行 npm run dev:worker；现有数据未重置。');
    const afterMigration = await snapshot(migrations);
    checkAppendOnly(baseline, afterMigration);
    if (JSON.stringify(afterMigration) !== JSON.stringify(baseline)) {
      baseline = afterMigration;
      continue; // A migration arrived during the previous migration command.
    }
    console.log(`[Luckydog 本地开发] 数据库已就绪，启动 http://127.0.0.1:${port}；正在监测新增 SQL 迁移。`);
    const running = launch(['dev', '--local', '--ip', '127.0.0.1', '--port', port]);
    let event;
    void running.done.then(result => { event = result; });
    try {
      for (;;) {
        await delay(500);
        if (stopping) return;
        if (event) throw new Error(`本地服务已退出（${event.code ?? event.signal}）。请检查端口占用或上方错误后重新启动。`);
        const current = await snapshot(migrations);
        if (JSON.stringify(current) === JSON.stringify(baseline)) continue;
        checkAppendOnly(baseline, current);
        console.log('[Luckydog 本地开发] 检测到新增迁移，停止服务并更新数据库，随后自动重启。');
        baseline = current;
        break;
      }
    } finally { await stop(running); }
  }
}
main().catch(error => {
  console.error(`[Luckydog 本地开发] ${error.message}`);
  process.exitCode = 1;
});
