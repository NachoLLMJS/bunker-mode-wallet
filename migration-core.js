(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.BunkerModeWalletCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
  const isAddress=value=>ADDRESS.test(String(value||'').trim());
  const normalizeAddress=value=>{
    const v=String(value||'').trim();
    if(!isAddress(v)) throw new Error('Invalid Ethereum address');
    return '0x'+v.slice(2).toLowerCase();
  };
  const uint=value=>{
    try{const n=typeof value==='bigint'?value:BigInt(value);if(n<0n||n>=(1n<<256n))throw new Error();return n}catch{throw new Error('Invalid uint256 value')}
  };
  const word=value=>uint(value).toString(16).padStart(64,'0');
  const addressWord=value=>'0'.repeat(24)+normalizeAddress(value).slice(2);
  function parseUnits(value,decimals){
    const d=Number(decimals); const s=String(value??'').trim();
    if(!Number.isInteger(d)||d<0||d>255||!/^\d+(?:\.\d+)?$/.test(s))return null;
    const [whole,fraction='']=s.split('.'); if(fraction.length>d)return null;
    return BigInt(whole)*10n**BigInt(d)+BigInt((fraction+'0'.repeat(d)).slice(0,d)||'0');
  }
  function formatUnits(value,decimals,maxFraction=6){
    const n=uint(value),d=Number(decimals),base=10n**BigInt(d),whole=n/base;
    if(!d)return whole.toString();
    let fraction=(n%base).toString().padStart(d,'0').slice(0,Math.max(0,maxFraction)).replace(/0+$/,'');
    return whole+(fraction?'.'+fraction:'');
  }
  const encodeErc20Transfer=(to,amount)=>'0xa9059cbb'+addressWord(to)+word(amount);
  const encodeErc721SafeTransferFrom=(from,to,tokenId)=>'0x42842e0e'+addressWord(from)+addressWord(to)+word(tokenId);
  const encodeErc1155SafeTransferFrom=(from,to,id,amount)=>'0xf242432a'+addressWord(from)+addressWord(to)+word(id)+word(amount)+word(160n)+word(0n);
  const encodeBalanceOf=owner=>'0x70a08231'+addressWord(owner);
  const encodeOwnerOf=id=>'0x6352211e'+word(id);
  const encodeErc1155BalanceOf=(owner,id)=>'0x00fdd58e'+addressWord(owner)+word(id);
  const decodeUint=hex=>BigInt(hex&&hex!=='0x'?hex:'0x0');
  function decodeString(hex){
    if(!hex||hex==='0x')return '';
    const raw=hex.slice(2);
    try{
      if(raw.length===64)return BufferLike(raw).replace(/\0+$/,'');
      const offset=Number(BigInt('0x'+raw.slice(0,64)))*2;
      const length=Number(BigInt('0x'+raw.slice(offset,offset+64)))*2;
      return BufferLike(raw.slice(offset+64,offset+64+length));
    }catch{return ''}
  }
  function BufferLike(hex){
    if(typeof Buffer!=='undefined')return Buffer.from(hex,'hex').toString('utf8');
    const bytes=new Uint8Array((hex.match(/.{1,2}/g)||[]).map(x=>parseInt(x,16)));
    return new TextDecoder().decode(bytes);
  }
  function orderPlan(items){return [...items].sort((a,b)=>(a.type==='ETH')-(b.type==='ETH'))}
  function assertMigrationReady({source,destination,confirmed,items}){
    const s=normalizeAddress(source),d=normalizeAddress(destination);
    if(s===d)throw new Error('Source and destination must be different');
    if(!confirmed)throw new Error('Verify the destination before migration');
    if(!Array.isArray(items)||!items.length)throw new Error('Add at least one asset');
    for(const item of items){
      if(!['ETH','ERC20','ERC721','ERC1155'].includes(item.type))throw new Error('Unsupported asset type');
      if(item.type!=='ETH')normalizeAddress(item.contract);
      if('amount' in item&&uint(item.amount)<=0n)throw new Error('Amount must be greater than zero');
      if('tokenId' in item)uint(item.tokenId);
    }
    return true;
  }
  const HASH=/^0x[0-9a-fA-F]{64}$/;
  const QUANTITY=/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;
  const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
  function exactKeys(value,allowed){return plain(value)&&Object.keys(value).every(key=>allowed.includes(key))&&allowed.every(key=>key in value)}
  function validateReceipt(receipt,expectedHash){
    if(!plain(receipt)||!HASH.test(expectedHash)||String(receipt.transactionHash||'').toLowerCase()!==expectedHash.toLowerCase())throw new Error('Receipt identity does not match the submitted transaction');
    if(!HASH.test(receipt.blockHash||'')||!QUANTITY.test(receipt.blockNumber||'')||!['0x0','0x1'].includes(receipt.status))throw new Error('Receipt is not a valid mined Ethereum receipt');
    return receipt.status;
  }
  function destinationConsentMatches(destination,confirmedDestination){
    try{return normalizeAddress(destination)===normalizeAddress(confirmedDestination)}catch{return false}
  }
  function validateJournalTransaction(step,journal){
    const tx=step.tx,source=normalizeAddress(journal.source),destination=normalizeAddress(journal.destination);
    if(!exactKeys(tx,['from','to','value','data'])||normalizeAddress(tx.from)!==source||!isAddress(tx.to)||!QUANTITY.test(tx.value)||!/^0x(?:[0-9a-fA-F]{2})*$/.test(tx.data))throw new Error('Invalid migration journal transaction');
    const data=tx.data.toLowerCase(),raw=data.slice(2),words=[];for(let i=8;i<raw.length;i+=64)words.push(raw.slice(i,i+64));
    const addressAt=i=>'0x'+(words[i]||'').slice(24);
    const uintAt=i=>BigInt('0x'+(words[i]||'0'));
    if(step.type==='ETH'){
      if(normalizeAddress(tx.to)!==destination||tx.value==='0x0'||data!=='0x')throw new Error('Invalid migration journal ETH transaction');
    }else if(step.type==='ERC20'){
      if(tx.value!=='0x0'||raw.length!==136||!data.startsWith('0xa9059cbb')||normalizeAddress(addressAt(0))!==destination||uintAt(1)<=0n)throw new Error('Invalid migration journal ERC20 transaction');
    }else if(step.type==='ERC721'){
      if(tx.value!=='0x0'||raw.length!==200||!data.startsWith('0x42842e0e')||normalizeAddress(addressAt(0))!==source||normalizeAddress(addressAt(1))!==destination)throw new Error('Invalid migration journal ERC721 transaction');
    }else if(step.type==='ERC1155'){
      if(tx.value!=='0x0'||raw.length!==392||!data.startsWith('0xf242432a')||normalizeAddress(addressAt(0))!==source||normalizeAddress(addressAt(1))!==destination||uintAt(3)<=0n||uintAt(4)!==160n||uintAt(5)!==0n)throw new Error('Invalid migration journal ERC1155 transaction');
    }
  }
  function validateJournal(journal){
    const journalKeys=['version','chainId','source','destination','createdAt','steps'];
    const created=journal&&typeof journal.createdAt==='string'?Date.parse(journal.createdAt):NaN;
    if(!exactKeys(journal,journalKeys)||journal.version!==2||journal.chainId!=='0x1'||!isAddress(journal.source)||!isAddress(journal.destination)||normalizeAddress(journal.source)===normalizeAddress(journal.destination)||!Number.isFinite(created)||created>Date.now()+300000||!Array.isArray(journal.steps)||journal.steps.length>256)throw new Error('Invalid migration journal');
    const ids=new Set();
    for(const step of journal.steps){
      const base=['id','type','label','tx','status'],keys=step&&step.hash!==undefined?[...base,'hash']:base;
      if(!exactKeys(step,keys)||typeof step.id!=='string'||!step.id||ids.has(step.id)||!['ETH','ERC20','ERC721','ERC1155'].includes(step.type)||typeof step.label!=='string'||!step.label||step.label.length>160||!['prepared','pending','confirmed','reverted','indeterminate'].includes(step.status))throw new Error('Invalid migration journal step');
      ids.add(step.id);validateJournalTransaction(step,journal);
      if(step.hash!==undefined&&!HASH.test(step.hash))throw new Error('Invalid migration journal hash');
      if(step.status==='prepared'&&step.hash!==undefined)throw new Error('Invalid migration journal prepared state');
      if(['pending','confirmed','reverted'].includes(step.status)&&!step.hash)throw new Error('Invalid migration journal terminal state');
    }
    return journal;
  }
  function journalHasUnresolved(journal){return validateJournal(journal).steps.some(step=>['prepared','pending','indeterminate'].includes(step.status))}
  function transactionFor(item,source,destination){
    const from=normalizeAddress(source),to=normalizeAddress(destination);
    if(item.type==='ETH')return {from,to,value:'0x'+uint(item.amount).toString(16),data:'0x'};
    const contract=normalizeAddress(item.contract);
    if(item.type==='ERC20')return {from,to:contract,value:'0x0',data:encodeErc20Transfer(to,item.amount)};
    if(item.type==='ERC721')return {from,to:contract,value:'0x0',data:encodeErc721SafeTransferFrom(from,to,item.tokenId)};
    if(item.type==='ERC1155')return {from,to:contract,value:'0x0',data:encodeErc1155SafeTransferFrom(from,to,item.tokenId,item.amount)};
    throw new Error('Unsupported asset type');
  }
  return {isAddress,normalizeAddress,parseUnits,formatUnits,encodeErc20Transfer,encodeErc721SafeTransferFrom,encodeErc1155SafeTransferFrom,encodeBalanceOf,encodeOwnerOf,encodeErc1155BalanceOf,decodeUint,decodeString,orderPlan,assertMigrationReady,validateReceipt,destinationConsentMatches,validateJournal,journalHasUnresolved,transactionFor};
});
