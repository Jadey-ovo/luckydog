import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
function launch(script, args, env = {}) {
  const child = spawn(process.execPath, [script, ...args], { cwd:root, env:{...process.env, CI:'true', ...env}, stdio:['ignore','pipe','pipe'] });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const done = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => resolve(code)); });
  return { child, done, output:()=>output };
}
async function until(check, message, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(150); }
  throw new Error(message());
}
async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function stop(process) {
  if (!process || process.child.exitCode !== null) return;
  process.child.kill('SIGTERM');
  const timer = setTimeout(()=>process.child.kill('SIGKILL'), 6000);
  try { await process.done; } finally { clearTimeout(timer); }
}

test('local dev upgrades a 0004 database, restarts for new migrations, and stops on failure without resetting data', {timeout:120000}, async () => {
  await mkdir('.wrangler', {recursive:true});
  const fixture = await mkdtemp(resolve('.wrangler/dev-migration-test-'));
  const migrations = join(fixture, 'migrations');const state = join(fixture, 'state');const config = join(fixture, 'wrangler.json');
  let supervisor;
  try {
    await mkdir(migrations);
    const migrationNames = ['0001_sharing.sql','0002_ephemeral_sessions.sql','0003_room_results.sql','0004_activity_history.sql'];
    for (const file of migrationNames) await copyFile(resolve('migrations', file), join(migrations, file));
    await writeFile(config, JSON.stringify({name:'luckydog-dev-test',main:resolve('worker/index.mjs'),compatibility_date:'2026-07-01',
      d1_databases:[{binding:'DB',database_name:'local-test',database_id:'00000000-0000-0000-0000-000000000000',migrations_dir:'migrations'}]}));
    const run = async args => {
      const command = launch(wrangler, [...args, '--config',config,'--persist-to',state]);
      assert.equal(await command.done, 0, command.output());return command.output();
    };
    await run(['d1','migrations','apply','DB','--local']);
    const id='e'.repeat(48),owner='f'.repeat(48),voter='d'.repeat(48),now=Date.now();
    const winners=JSON.stringify([{id:'seed-person',name:'迁移回归演示'}]);
    await run(['d1','execute','DB','--local','--command',`INSERT INTO rooms (id,owner,open,join_expires,expires) VALUES ('${id}','${owner}',1,${now+300000},${now+86400000}); INSERT INTO participants (id,room_id,name,voter) VALUES ('seed-person','${id}','迁移回归演示','${voter}');`]);
    // Registration guards prohibit joining after the result exists. Seed the saved round afterwards.
    await run(['d1','execute','DB','--local','--command',`UPDATE rooms SET open=0,result_winners='${winners}',result_timestamp=123 WHERE id='${id}';`]);
    await copyFile(resolve('migrations/0005_round_history.sql'), join(migrations,'0005_round_history.sql'));
    await copyFile(resolve('migrations/0006_result_session.sql'), join(migrations,'0006_result_session.sql'));
    const port=await freePort();const url=`http://127.0.0.1:${port}/api/rooms/${id}`;
    const start = () => launch(resolve('scripts/dev-worker.mjs'), [], {LUCKYDOG_DEV_CONFIG:config,LUCKYDOG_DEV_STATE:state,LUCKYDOG_DEV_PORT:String(port)});
    const statuses=[];
    const read = async()=>{try{const response=await fetch(url,{headers:{Cookie:`luckydog-voter=${voter}`},signal:AbortSignal.timeout(1000)});statuses.push(response.status);return response.ok?await response.json():null;}catch{return null;}};
    supervisor=start();
    await until(async()=>(await read())?.history?.length===1,()=>supervisor.output());
    assert.deepEqual((await read()).history,[{round:1,timestamp:123,won:true}]);
    assert.match(supervisor.output(),/数据库已就绪/);
    await writeFile(join(migrations,'0007_local_probe.sql'),'CREATE TABLE local_migration_probe (value TEXT);');
    await until(()=>supervisor.output().split('数据库已就绪').length===3,()=>supervisor.output());
    await until(async()=>(await read())?.history?.length===1,()=>supervisor.output());
    assert.match(supervisor.output(),/检测到新增迁移/);
    await run(['d1','execute','DB','--local','--command',"INSERT INTO local_migration_probe VALUES ('applied');"]);
    await writeFile(join(migrations,'0008_invalid.sql'),'THIS IS NOT VALID SQL;');
    await until(()=>supervisor.child.exitCode!==null,()=>supervisor.output());
    assert.equal(await supervisor.done,1);
    assert.match(supervisor.output(),/本地数据库迁移失败，服务未启动/);
    assert.equal(await read(),null);
    await rm(join(migrations,'0008_invalid.sql'));
    supervisor=start();
    await until(async()=>(await read())?.history?.length===1,()=>supervisor.output());
    assert.equal((await read()).participant.name,'迁移回归演示');
    assert.match(await run(['d1','execute','DB','--local','--command','SELECT value FROM local_migration_probe;']),/applied/);
    // Changing an already applied migration cannot be silently ignored by Wrangler.
    await writeFile(join(migrations,'0007_local_probe.sql'),'CREATE TABLE changed_probe (value TEXT);');
    await until(()=>supervisor.child.exitCode!==null,()=>supervisor.output());
    assert.equal(await supervisor.done,1);assert.match(supervisor.output(),/已有迁移被修改或删除/);
    assert.equal(await read(),null);
    assert.ok(!statuses.includes(500), 'The API must not serve a Worker against the old database schema');
  } finally { await stop(supervisor);await rm(fixture,{recursive:true,force:true}); }
});
