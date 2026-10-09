const test=require('node:test'),assert=require('node:assert/strict');
test('gravity-settled panels preserve their suspension and compressed ties without invalid geometry',async()=>{
 const {settleCurtain}=await import('../src/cloth.js');
 for(const [width,height,side] of [[1.18,2.38,-1],[1.02,2.27,1]]){
  const {positions:p,cols,rows}=settleCurtain(width,height,side),stride=cols+1;
  assert.ok(p.every(Number.isFinite));
  for(let i=0;i<=cols;i++)assert.ok(Math.abs(p[i*3+1]-3.145)<1e-6,'suspended upper edge stays on the beam');
  const row=Math.round(rows*(side<0?.62:.57));
  for(let i=0;i<=cols;i+=3)assert.ok(Math.abs(p[(row*stride+i)*3]-(side*.24+(i/cols-.5)*.085))<1e-6,'tie compresses the fabric');
  const bottom=Array.from({length:stride},(_,i)=>p[(rows*stride+i)*3+1]);
  assert.ok(Math.min(...bottom)>.40&&Math.max(...bottom)<1.25,'cloth hangs beside the bed above the floor');
  const hemX=Array.from({length:stride},(_,i)=>p[(rows*stride+i)*3]);
  assert.ok(Math.max(...hemX)-Math.min(...hemX)>.20,'free cloth opens below the compressed tie');
  assert.equal(settleCurtain(width,height,side).positions,p,'settled geometry is reused for subsequent scene builds');
 }
});
test('the padded quilt rests above the mattress with free hems outside the bed frame',async()=>{
 const {settleQuilt}=await import('../src/cloth.js'),{positions:p}=settleQuilt();let supported=0,hanging=0;
 for(let k=0;k<p.length;k+=3){assert.ok(Number.isFinite(p[k])&&Number.isFinite(p[k+1])&&Number.isFinite(p[k+2]));if(Math.abs(p[k])<1.075&&Math.abs(p[k+2])<1.485){assert.ok(p[k+1]>=1.0449,'contact surface prevents a quilt cutting through timber or mattress');supported++;}else if(p[k+1]<.98)hanging++;}
 assert.ok(supported>1000&&hanging>20,'cloth has both a resting body and gravity-draped hems');
});
