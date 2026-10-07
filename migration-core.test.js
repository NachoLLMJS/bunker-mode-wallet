const assert = require('assert');
const core = require('./migration-core.js');

const source = '0x1111111111111111111111111111111111111111';
const destination = '0x2222222222222222222222222222222222222222';

assert.equal(core.isAddress(source), true, 'accepts a valid EVM address');
assert.equal(core.isAddress('0x1234'), false, 'rejects a malformed address');
assert.equal(core.parseUnits('1.25', 6), 1250000n, 'parses decimal token units exactly');
assert.equal(core.parseUnits('0.0000001', 6), null, 'rejects excess decimal precision');
assert.equal(core.formatUnits(1250000n, 6, 6), '1.25', 'formats token units');
assert.equal(core.encodeErc20Transfer(destination, 5n), '0xa9059cbb' + '0'.repeat(24) + destination.slice(2).toLowerCase() + '0'.repeat(63) + '5', 'encodes ERC-20 transfer');
assert.equal(core.encodeErc721SafeTransferFrom(source, destination, 7n).slice(0,10), '0x42842e0e', 'uses ERC-721 safeTransferFrom selector');
assert.equal(core.encodeErc1155SafeTransferFrom(source, destination, 7n, 3n).slice(0,10), '0xf242432a', 'uses ERC-1155 safeTransferFrom selector');
assert.equal(core.decodeUint('0x' + '0'.repeat(63) + 'a'), 10n, 'decodes uint256 RPC output');
assert.deepEqual(core.orderPlan([{type:'ETH',id:'gas'},{type:'ERC20',id:'token'}]).map(x=>x.id), ['token','gas'], 'always places native ETH last');
assert.throws(() => core.assertMigrationReady({source,destination:source,confirmed:true,items:[{type:'ETH',amount:1n}]}), /different/i, 'rejects same destination');
assert.throws(() => core.assertMigrationReady({source,destination,confirmed:false,items:[{type:'ETH',amount:1n}]}), /verify/i, 'requires destination confirmation');
assert.equal(core.assertMigrationReady({source,destination,confirmed:true,items:[{type:'ETH',amount:1n}]}), true, 'accepts a confirmed direct plan');
assert.equal(core.journalHasUnresolved({version:2,chainId:'0x1',source,destination,createdAt:'2026-10-07T00:00:00.000Z',steps:[{id:'1',type:'ETH',label:'pending ETH',tx:{from:source,to:destination,value:'0x1',data:'0x'},status:'pending',hash:'0x'+'a'.repeat(64)}]}), true, 'blocks duplicate execution while a hash is unresolved');
assert.equal(core.journalHasUnresolved({version:2,chainId:'0x1',source,destination,createdAt:'2026-10-07T00:00:00.000Z',steps:[{id:'1',type:'ETH',label:'confirmed ETH',tx:{from:source,to:destination,value:'0x1',data:'0x'},status:'confirmed',hash:'0x'+'a'.repeat(64)}]}), false, 'allows a new plan after all steps are terminal');
console.log('migration-core tests passed');
