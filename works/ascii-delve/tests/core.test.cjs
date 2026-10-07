const test=require('node:test');const assert=require('node:assert/strict');const C=require('../src/core.js');
test('seeded floors are deterministic and every room, key, shop and exit is reachable',()=>{
 for(let seed=0;seed<60;seed++)for(let floor=1;floor<=5;floor++){
  const s=C.generate(seed,floor);assert.deepEqual(s,C.generate(seed,floor));const seen=new Set([C.pos(s.start.x,s.start.y)]),q=[s.start];
  for(let i=0;i<q.length;i++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let x=q[i].x+dx,y=q[i].y+dy,k=C.pos(x,y);if(C.walkable(s,x,y)&&!seen.has(k)){seen.add(k);q.push({x,y});}}
  for(const i of [...s.items,s.exit])assert.ok(seen.has(C.pos(i.x,i.y)));assert.equal(s.items.filter(i=>i.type==='key').length,1);assert.equal(s.enemies.filter(e=>e.boss).length,floor===5?1:0);
  const all=[s.start,s.exit,...s.items,...s.enemies];assert.equal(new Set(all.map(i=>C.pos(i.x,i.y))).size,all.length);
 }
});
test('invalid moves never spend turns; fog respects walls',()=>{const s=C.newGame();const t=s.turn;assert.equal(C.step(s,{type:'move',dx:2,dy:0}),false);assert.equal(s.turn,t);assert.equal(s.visible[C.pos(s.player.x,s.player.y)],true);assert.ok(s.seen.some(v=>!v));});
test('combat, healing, experience and death are turn based',()=>{
 const s=C.newGame();s.enemies=[{x:s.player.x+1,y:s.player.y,id:0,name:'鼠',char:'r',hp:2,maxHp:2,attack:3,xp:20,boss:false}];s.tiles[C.pos(s.player.x+1,s.player.y)]='.';
 C.step(s,{type:'move',dx:1,dy:0});assert.equal(s.kills,1);assert.equal(s.player.level,2);assert.equal(s.enemies.length,0);
 s.player.hp=1;s.player.potions=1;C.step(s,{type:'heal'});assert.equal(s.player.hp,21);assert.equal(s.player.potions,0);
 s.enemies=[{x:s.player.x+1,y:s.player.y,id:1,name:'敌人',char:'s',hp:20,maxHp:20,attack:99,xp:8,boss:false,awake:true}];C.step(s,{type:'wait'});assert.equal(s.status,'dead');const turn=s.turn;C.step(s,{type:'heal'});assert.equal(s.turn,turn);
});
test('stairs require key and last floor requires defeating boss',()=>{const s=C.newGame();s.player.x=s.exit.x;s.player.y=s.exit.y;C.step(s,{type:'interact'});assert.equal(s.floor,1);s.player.key=true;C.step(s,{type:'interact'});assert.equal(s.floor,2);assert.equal(s.player.key,false);
 s.floor=5;Object.assign(s,C.generate(s.seed,5));s.player.x=s.exit.x;s.player.y=s.exit.y;s.player.key=true;C.step(s,{type:'interact'});assert.equal(s.status,'playing');s.enemies=[];C.step(s,{type:'interact'});assert.equal(s.status,'won');});
test('shop enforces proximity, prices and funds',()=>{const s=C.newGame();s.gold=100;assert.equal(C.step(s,{type:'buy',item:'attack'}),false);const m=s.items.find(i=>i.type==='merchant');s.player.x=m.x;s.player.y=m.y;const atk=s.player.attack;C.step(s,{type:'buy',item:'attack'});assert.equal(s.gold,70);assert.equal(s.player.attack,atk+1);s.gold=0;C.step(s,{type:'buy',item:'potion'});assert.equal(s.gold,0);});
test('save round trip retains exploration; malformed saves are rejected',()=>{const s=C.newGame('test','scout');const r=C.restore(C.serialize(s));assert.equal(r.seed,s.seed);assert.deepEqual(r.seen,s.seen);for(const input of ['null','{}','bad',JSON.stringify({...s,floor:9}),JSON.stringify({...s,tiles:[]}),JSON.stringify({...s,player:{...s.player,x:-1}})])assert.equal(C.restore(input),null);});
