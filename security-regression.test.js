const assert = require('assert');
const fs = require('fs');
const core = require('./migration-core.js');

const source = '0x1111111111111111111111111111111111111111';
const destination = '0x2222222222222222222222222222222222222222';
const txHash = '0x' + 'a'.repeat(64);
const blockHash = '0x' + 'b'.repeat(64);
const tx = {from:source,to:destination,value:'0x1',data:'0x'};

assert.equal(core.validateReceipt({transactionHash:txHash,blockHash,blockNumber:'0x10',status:'0x1'},txHash),'0x1','accepts an exact mined success receipt');
assert.throws(()=>core.validateReceipt({transactionHash:'0x'+'c'.repeat(64),blockHash,blockNumber:'0x10',status:'0x1'},txHash),/identity/i,'rejects a receipt for another transaction');
assert.throws(()=>core.validateReceipt({transactionHash:txHash,blockHash:null,blockNumber:null,status:'0x1'},txHash),/mined/i,'rejects an unmined or malformed receipt');

const journal={version:2,chainId:'0x1',source,destination,createdAt:'2026-10-07T00:00:00.000Z',steps:[{id:'step-1',type:'ETH',label:'1 wei ETH',tx,status:'pending',hash:txHash}]};
assert.equal(core.validateJournal(journal).steps[0].hash,txHash,'accepts a closed valid journal schema');
assert.throws(()=>core.validateJournal({...journal,steps:'pending'}),/journal/i,'rejects malformed journal steps');
assert.throws(()=>core.validateJournal({...journal,extra:true}),/journal/i,'rejects unknown journal fields');
assert.throws(()=>core.validateJournal({...journal,createdAt:new Date(Date.now()+3600000).toISOString()}),/journal/i,'rejects a future-dated journal');
assert.throws(()=>core.validateJournal({...journal,steps:[journal.steps[0],{...journal.steps[0]}]}),/journal/i,'rejects duplicate step IDs');
assert.throws(()=>core.validateJournal({...journal,steps:[{...journal.steps[0],status:'prepared'}]}),/journal/i,'rejects a prepared step that already has a hash');
assert.throws(()=>core.validateJournal({...journal,steps:[{...journal.steps[0],tx:{...tx,to:source}}]}),/journal/i,'rejects ETH journal transfers that do not target the journal destination');
assert.throws(()=>core.validateJournal({...journal,steps:[{...journal.steps[0],type:'ERC20',tx:{from:source,to:'0x3333333333333333333333333333333333333333',value:'0x0',data:'0xdeadbeef'}}]}),/journal/i,'rejects arbitrary ERC-20 calldata');
assert.equal(core.destinationConsentMatches(destination,destination.toUpperCase().replace('0X','0x')),true,'binds consent to a normalized destination');
assert.equal(core.destinationConsentMatches(destination,source),false,'rejects stale consent for another destination');

const app=fs.readFileSync('migration-app.js','utf8');
const scanner=fs.readFileSync('scanner.js','utf8');
assert.match(app,/navigator\.locks\.request/,'uses a cross-tab Web Lock');
assert.match(app,/state\.running=true;.*runExclusiveExecution/s,'sets the same-tab lock before the first await');
assert.match(app,/operation\.source/,'sends from an immutable operation source');
assert.match(scanner,/new Event\(['"]input/,'programmatic paste triggers destination invalidation');
assert.match(app,/recoverPreparedHash/,'supports safe prepared-step hash recovery');
assert.match(app,/\['prepared','indeterminate'\]\.includes\(x\.status\)/,'recovers hashless prepared and indeterminate sends');
assert.match(app,/state\.assets=state\.assets\.filter\(x=>x\.id!==item\.id\)/,'removes each confirmed item from the retryable plan');
assert.ok(app.indexOf("updateStep(item.id,'pending'")>app.indexOf("eth_sendTransaction"),'does not display pending before a transaction hash exists');

const html=fs.readFileSync('index.html','utf8');
assert.ok(!/<style[\s>]/i.test(html),'moves inline styles out of the wallet page');
assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html),'moves inline executable script out of the wallet page');
for(const stale of ['sweeps the remaining native balance','Reserve verified gas, then transfer the remaining ETH','measured balance change','compare balance deltas']) assert.ok(!html.includes(stale),`removes unsupported claim: ${stale}`);

const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const headers=Object.fromEntries(vercel.headers[0].headers.map(x=>[x.key.toLowerCase(),x.value]));
assert.match(headers['content-security-policy'],/frame-ancestors 'none'/,'sets CSP frame protection');
assert.equal(headers['x-frame-options'],'DENY','sets legacy frame protection');
assert.match(headers['strict-transport-security'],/max-age=/,'sets HSTS');
console.log('security regression tests passed');
