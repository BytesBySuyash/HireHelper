import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Configuration remains local and isolated; test keys are never accepted in production.
process.env.DATABASE_URL='postgresql://test:test@localhost:5432/hirehelper_test';
process.env.SESSION_SECRET='test-only-session-secret-at-least-32-characters';
process.env.OTP_SECRET='test-only-otp-secret-at-least-32-characters';
process.env.APP_ORIGIN='http://localhost:4200';
import {CsrfGuard,digest,same} from '../src/security';
import {Tasks} from '../src/tasks';
import {Events} from '../src/events';
test('CSRF requires matching signed cookie/header and allowed origin',()=>{
  const guard=new CsrfGuard();const nonce='test-nonce';const value=`${nonce}.${digest(`csrf:${nonce}`)}`;
  const context=(origin:string,header:string,cookie:string)=>({switchToHttp:()=>({getRequest:()=>({method:'POST',headers:{origin,'x-csrf-token':header},cookies:{hh_csrf:cookie}})})} as any);
  assert.equal(guard.canActivate(context('http://localhost:4200',value,value)),true);
  assert.throws(()=>guard.canActivate(context('https://evil.test',value,value)));
  assert.throws(()=>guard.canActivate(context('http://localhost:4200','wrong',value)));
  assert.throws(()=>guard.canActivate(context('http://localhost:4200','forged.forged','forged.forged')));
});
test('OTP hashes are bound to purpose and challenge and safe equality handles lengths',()=>{
  assert.notEqual(digest('id:LOGIN:user:123456'),digest('id:RESET:user:123456'));
  assert.notEqual(digest('id:LOGIN:user:123456'),digest('other:LOGIN:user:123456'));
  assert.equal(same('short','longer'),false);
});
test('task scheduling rejects past, ambiguous local timestamps and reversed ranges',()=>{
  const tasks=new Tasks({} as any,new Events());const future=new Date(Date.now()+86400000).toISOString();
  const base={title:'A real task',description:'A meaningful task description',location:'District',startAt:future};
  assert.equal(tasks.schedule(base).startAt.toISOString(),future);
  assert.throws(()=>tasks.schedule({...base,startAt:'2020-01-01T10:00:00Z'}));
  assert.throws(()=>tasks.schedule({...base,startAt:future.slice(0,-1)}));
  assert.throws(()=>tasks.schedule({...base,endAt:new Date(Date.now()+3600000).toISOString()}));
});
test('SSE delivers only recipient events and logout completes connection',async()=>{
  const bus=new Events();let seen=0,completed=false;
  const sub=bus.stream('owner','session',async()=>true).subscribe({next:()=>seen++,complete:()=>completed=true});
  bus.publish('helper',{private:true});assert.equal(seen,0);
  bus.publish('owner',{taskId:'task'});assert.equal(seen,1);
  bus.close('session');assert.equal(completed,true);sub.unsubscribe();
});
