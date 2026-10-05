import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { testEnv } from './test-env.mjs';
const env=testEnv();
// Explicit npm CLI path can be supplied for an isolated Node runtime.
const npm=process.env.NPM_CLI_PATH;
const run=(args)=>npm?spawnSync(process.execPath,[npm,...args],{stdio:'inherit',env}):spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',env,shell:process.platform==='win32'});
for(const args of [['run','db:generate'],['run','db:migrate'],['run','build','-w','apps/api']]){const result=run(args);if(result.status!==0)process.exit(result.status??1);}
const api=spawn(process.execPath,[resolve('apps/api/dist/main.js')],{stdio:'inherit',env,windowsHide:true});
// This runner hosts native API only. Start web separately with npm run dev:web.
const stop=()=>api.kill();process.on('SIGINT',stop);process.on('SIGTERM',stop);
