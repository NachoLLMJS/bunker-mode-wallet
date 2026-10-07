const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
for(const id of ['connectWallet','migrationDestination','assetType','addAsset','migrationPlan','executePlan','reconcileJournal','destinationConfirmed','walletState']){
  if(!html.includes(`id="${id}"`)) throw new Error(`missing operational control ${id}`);
}
if(!html.includes('<script src="migration-core.js"></script>')) throw new Error('migration core is not loaded');
if(!html.includes('<script src="migration-app.js"></script>')) throw new Error('migration app is not loaded');
if(/no transaction execution is enabled/i.test(html)) throw new Error('stale scanner-only disclaimer remains');
for(const asset of ['assets/bunker-mode-wallet-logo.png','assets/bunker-mode-wallet-hero.png','assets/favicon.ico']){
  if(!html.includes(asset)) throw new Error(`missing supplied bunker asset reference ${asset}`);
  if(!fs.existsSync(asset)) throw new Error(`missing supplied bunker asset file ${asset}`);
}
if(html.includes('class="vault"')||html.includes('class="vault-core"')) throw new Error('old procedural vault visual remains');
console.log('operational UI structure tests passed');
