import { spawnSync } from 'node:child_process';
if(!process.argv.includes('--confirm-delete-local-data')){
  console.error('DESTRUCTIVE: deletes HireHelper Compose database, inbox and uploaded images. Back up first. Run node scripts/reset.mjs --confirm-delete-local-data to confirm.');process.exit(1);
}
if(process.env.NODE_ENV==='production'){console.error('Reset is disabled in production.');process.exit(1);}
const result=spawnSync('docker',['compose','down','--volumes'],{stdio:'inherit',shell:false});
process.exit(result.status??1);
