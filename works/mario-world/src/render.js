(function(root){
'use strict';
const sprites={
 mario:['.....RRRRR......','....RRRRRRRRR...','....BBBSSBS.....','...BSBSSSBS.....','...BSBBSSSBS....','....BSSSSBB.....','.....SSSSSS.....','....RRBRR.......','...RRRBRRBRRR...','..RRRRBBBBRRRR..','..SSRBYYBYBRSS..','..SSSBBBBBBSSS..','....BBBBBBBB....','...BBBB..BBBB...','..BBBB....BBBB..','..KKK......KKK..'],
 goomba:['.....BBBBBB.....','...BBBBBBBBBB...','..BBBBBBBBBBBB..','.BBBWWBBBBWWBBB.','.BBBWKBBBBKWBBB.','BBBBBBBBBBBBBBBB','BBBSSSSSSSSSSBBB','..SSSSSSSSSSSS..','...SSSSSSSSSS...','..KKKK....KKKK..','.KKKKK....KKKKK.'],
 koopa:['.....GGGG.......','....GSSSGG......','....SWKSSG......','....SSSSSG......','.....SSSS.......','...GGGGGGGG.....','..GGWGGGGWGG....','.GGWGGGGGGWGG...','.GWWGGGGGGWWG...','..GGGGGGGGGG....','...SSSSSSSS.....','..SSS....SSS....','..KKK....KKK....'],
 mushroom:['.....RRRRRR.....','...RRWWRRWWRR...','..RRWWWRRWWWRR..','.RRRWWRRRRWWRRR.','RRRRRRRRRRRRRRRR','RRWWRRRRRRRRWWRR','RRWWRRRRRRRRWWRR','..SSSSSSSSSSSS..','....SSSSSSSS....','....SSKSSKSS....','....SSSSSSSS....'],
 flower:['.....YYYYYY.....','...YYRRRRRRYY...','..YRRWWWWWWRRY..','..YRRWWKKWWRRY..','...YYRRRRRRYY...','.....YYYYYY.....','.......GG.......','...GG..GG..GG...','....GGGGGGGG....','......GGGG......'],
 bowser:['.....GGGG.......','...GGGGGGGG.....','..GSSGGGSSGG....','.GGWKGGGKWGG....','.GGSSSSSSSSGG...','..SSKSSSSKSSG...','...SSSSSSSSGG...','..GGGGGGGGGGGG..','.GWWGSSSSGGWWGG.','GGWGSSSSSSGWGGGG','GGGGSSSSSSGGGGGG','..GGSSSSSSGGGG..','..GGGGGGGGGGG...','..SSGGGGGGSS....','.SSSS....SSSS...'],
 fish:['.....RRRR.......','...RRRRRRRR.....','..RRWWRRRRRR....','.RRRWKRRRSSRR...','RRRRRRRRSSSSRR..','.RRRRRSSSSSSR...','..RRRSSSSSSR....','....RRRRRR......'],
 blooper:['....WWWWWW......','..WWWWWWWWWW....','.WWWWWWWWWWWW...','WWWWKKWWKKWWWW..','WWWWWWWWWWWWWW..','..WWWWWWWWWW....','...WWWWWWWW.....','..WW.WW.WW.WW...','.WW..WW.WW..WW..'],
 princess:['......YYYY......','.....YRYRY......','.....SSSSS......','....SSKSKSS.....','.....SSSSS......','....PPPPPPP.....','...PPPPPPPPP....','..PPPPPPPPPPP...','.PPPPPPPPPPPPP..','...SS....SS.....']
};
const pal={R:'#e83c23',B:'#91491e',S:'#ffb778',K:'#241912',W:'#fff6dc',G:'#60b62d',Y:'#ffd44a',P:'#ff819d'};
function pixel(ctx,name,x,y,w,h,flip=false,colors={}){const rows=sprites[name]||sprites.goomba;ctx.save();ctx.translate(Math.round(x)+(flip?w:0),Math.round(y));ctx.scale(flip?-1:1,1);for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const c=rows[j][i];if(c!=='.'){ctx.fillStyle=colors[c]||pal[c];ctx.fillRect(Math.floor(i*w/16),Math.floor(j*h/rows.length),Math.ceil(w/16),Math.ceil(h/rows.length));}}ctx.restore();}
function render(ctx,s){
 const theme=s.bonus?'cave':s.level.theme,night=['night','cave','castle','snow'].includes(theme),water=s.water,cam=Math.floor(s.camera),age=s.age,p=s.player;
 const sky=theme==='water'?'#2055d5':theme==='cave'?'#10121c':theme==='castle'?'#100d16':night?'#10162c':'#5c94fc';ctx.fillStyle=sky;ctx.fillRect(0,0,768,448);
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
 if(['day','night','trees','snow','bridge'].includes(theme)){
  for(let i=0;i<20;i++){let x=i*200-cam*.3;if(x< -200||x>800)continue;
   if(night){rect(x+30,87,3,3,'#fff5c0');rect(x+109,140,2,2,'#fff5c0');}
   else{rect(x,112,64,16,'#fff8e8');rect(x+12,100,40,16,'#fff8e8');rect(x+24,92,16,16,'#fff8e8');rect(x+7,126,50,6,'#bccbf8');}
   const y=384;ctx.fillStyle=theme==='snow'?'#f2efe5':'#29983f';ctx.beginPath();ctx.moveTo(x-60,y);ctx.lineTo(x+20,y-70);ctx.lineTo(x+38,y-80);ctx.lineTo(x+58,y-70);ctx.lineTo(x+138,y);ctx.fill();rect(x+33,y-54,5,11,'#183c29');
   if(!night){rect(x+104,352,64,32,'#5cce32');rect(x+116,340,40,20,'#5cce32');rect(x+132,329,16,20,'#5cce32');}
  }
 }
 if(water){for(let i=0;i<20;i++){const x=i*110-cam*.45;for(let k=0;k<3;k++){ctx.strokeStyle='#96c9fa';ctx.strokeRect(Math.floor(x+k*19),Math.floor(370-((age*35+i*61+k*42)%280)),5,6);}for(let j=0;j<5;j++)rect(x+j*7,342+j%2*8,5,42-j%2*8,'#b03564');}}
 if(theme==='castle'){for(let x=0;x<800;x+=64)for(let y=64;y<384;y+=32){ctx.strokeStyle='#292030';ctx.strokeRect(x-(cam%64)+(y%64?32:0),y,64,32);}rect(0,390,768,58,'#e33c16');for(let x=0;x<768;x+=32)rect(x,390+Math.sin(age*6+x)*3,24,7,'#ffd76d');}
 if(theme==='bridge'){rect(0,390,768,58,'#234fb5');for(let x=0;x<768;x+=32)rect(x,392+Math.sin(age*4+x)*3,20,3,'#9dd9ff');}
 for(const b of s.solids){if(b.removed||b.x+b.w<cam||b.x>cam+768)continue;const x=b.x-cam,y=b.y-(b.bump>0?Math.sin(b.bump/.18*Math.PI)*7:0);
  if(b.type==='pipe'){rect(x,y,b.w,b.h,'#247c12');rect(x+5,y+5,10,b.h-5,'#a6e63a');rect(x+18,y+5,8,b.h-5,'#69bd25');rect(x+46,y+5,8,b.h-5,'#17480d');rect(x-3,y,b.w+6,20,'#183807');rect(x-1,y+2,b.w+2,15,'#62bf22');rect(x+4,y+3,10,14,'#b1ed4c');
   if(b.plant){const h=Math.max(0,Math.min(42,Math.sin(age*1.2+b.x)*42+16));if(Math.abs(p.x-b.x)>42&&h>8){rect(x+30,y-h+15,5,h-15,'#56b837');rect(x+21,y-h,22,20,'#d93830');rect(x+23,y-h+2,5,5,'#fff1d3');rect(x+35,y-h+8,5,5,'#fff1d3');}}
  }else if(b.type==='cannon'){rect(x,y,32,b.h,'#202225');rect(x+3,y+5,26,20,'#747881');rect(x+6,y+8,20,13,'#161923');}
  else if(b.type==='moving'){rect(x,y,b.w,16,'#bc6544');for(let k=0;k<b.w;k+=16)rect(x+k+2,y+2,12,4,'#f9d5a6');}
  else if(b.type==='platform'&&['trees','snow'].includes(theme)){rect(x+12,y+32,8,448-y,theme==='snow'?'#a8b2c9':'#aa7134');rect(x,y,32,18,theme==='snow'?'#eef2ff':'#da7731');rect(x+2,y+18,28,10,theme==='snow'?'#a8b2c9':'#ffe5a4');}
  else if(b.type==='platform'&&theme==='bridge'){rect(x,y,32,8,'#ffb66a');rect(x,y+8,32,12,'#864329');rect(x+12,y+20,8,15,'#f6ba70');}
  else if(b.type==='question'){rect(x,y,32,32,b.used?'#934620':'#f3a23c');rect(x+2,y+2,28,2,'#ffdc87');rect(x+28,y+2,3,28,'#7d3918');rect(x+3,y+3,3,3,'#713517');rect(x+25,y+25,3,3,'#713517');if(!b.used){ctx.fillStyle='#fff2be';ctx.font='bold 25px monospace';ctx.fillText('?',x+8,y+26);}}
  else{const cave=['cave','water'].includes(theme),castle=theme==='castle';rect(x,y,b.w,b.h,cave?'#22799e':castle?'#68647b':'#b95b27');rect(x+1,y+1,b.w-2,3,cave?'#59c9e8':castle?'#9c95ad':'#edaa72');ctx.strokeStyle=cave?'#092537':castle?'#241c30':'#4e281b';for(let yy=0;yy<b.h;yy+=16){ctx.beginPath();ctx.moveTo(x,y+yy+15);ctx.lineTo(x+b.w,y+yy+15);ctx.moveTo(x+(yy%32?8:22),y+yy);ctx.lineTo(x+(yy%32?8:22),y+yy+16);ctx.stroke();}}
 }
 for(const it of s.items){const x=it.x-cam;if(it.kind==='coin'){rect(x+6,it.y,10,24,'#ffe776');rect(x+9,it.y+4,3,16,'#bb7b1c');}else if(it.kind==='star'){ctx.fillStyle=age% .2<.1?'#ffd447':'#faf4dd';ctx.font='28px sans-serif';ctx.fillText('★',x,it.y+25);}else pixel(ctx,it.kind==='flower'?'flower':'mushroom',x,it.y,it.w,it.h);}
 for(const e of s.enemies){if(!e.alive||e.x<cam-64||e.x>cam+800)continue;const x=e.x-cam;
  if(e.type==='shell'){rect(x,e.y+5,e.w,19,'#488e23');rect(x+3,e.y,22,12,'#80c438');rect(x,e.y+20,e.w,4,'#fff4d6');}
  else if(e.type==='bullet'){rect(x,e.y,e.w,e.h,'#171c26');rect(x+4,e.y+4,6,6,'#fff1d6');rect(x+e.w-6,e.y+5,6,14,'#8b92a5');}
  else if(e.type==='lakitu'){rect(x-5,e.y+17,48,20,'#fff5df');pixel(ctx,'koopa',x,e.y-10,30,30);}
  else pixel(ctx,e.type==='hammer'?'koopa':e.type==='flyingfish'?'fish':e.type==='spiny'?'goomba':e.type,x,e.y,e.w,e.h,e.vx>0,e.type==='spiny'?{B:'#d74124'}:{});
 }
 for(const bar of s.firebars){const a=age*(.9+s.level.world*.04)+bar.phase;for(let k=0;k<=bar.length;k++){const x=bar.x+Math.cos(a)*k*16-cam,y=bar.y+Math.sin(a)*k*16;rect(x-6,y-6,12,12,'#ff5623');rect(x-3,y-3,6,6,'#ffeda3');}}
 for(const sh of s.shots){rect(sh.x-cam,sh.y,sh.w,sh.h,sh.hammer?'#ae9f88':'#ff642a');rect(sh.x-cam+3,sh.y+3,sh.w-6,sh.h-6,'#ffe768');}
 for(const it of s.particles)rect(it.x-cam,it.y,8,8,'#c2743f');
 if(s.level.theme==='castle'&&!s.bonus){const x=s.goal-cam;rect(x,250,6,134,'#bdb5ad');rect(x-5,251,25,18,'#ddd7c5');rect(x+32,318,30,65,'#984939');pixel(ctx,s.index===31?'princess':'mushroom',x+35,322,26,40);}
 else if(!s.bonus){const x=s.goal-cam;rect(x,112,5,272,'#faf1c9');rect(x-3,105,11,11,'#7ace48');rect(x-34,119,34,24,'#64c230');rect(x+60,312,96,72,'#ae5c39');rect(x+76,289,64,30,'#ae5c39');rect(x+96,340,24,44,'#241912');for(let k=0;k<5;k++)rect(x+61+k*20,300,13,14,'#ae5c39');}
 if(p.invincible<=0||Math.floor(age*14)%2===0)pixel(ctx,'mario',p.x-cam,p.y,p.w,p.h,p.face<0,p.star>0?{R:Math.floor(age*8)%2?'#ffd64c':'#ffffff',B:'#38c5bc'}:p.power===2?{R:'#fff2dc',B:'#ea4426'}:{});
 // Fixed HUD remains crisp at any CSS scale.
 rect(0,0,768,63,night?'#10121ce6':'#5c94fc');ctx.fillStyle='#fff8db';ctx.font='bold 16px monospace';ctx.textBaseline='top';
 const text=(t,x,y)=>ctx.fillText(t,x,y);text('MARIO',32,14);text(String(s.score).padStart(6,'0'),32,35);text('COIN',215,14);text('× '+String(s.coins).padStart(2,'0'),215,35);text('WORLD',385,14);text(s.level.id,401,35);text('TIME',526,14);text(String(Math.ceil(s.time)).padStart(3,'0'),535,35);text('LIVES',658,14);text('× '+s.lives,673,35);
 if(s.bonus){text('COIN ROOM · ↓ EXIT',236,82);}else if(['4-4','7-4'].includes(s.level.id)){text(s.route===0?'ROUTE 1: TAKE THE HIGH PATH':s.route===1?'ROUTE 2: TAKE THE LOW PATH':'THE AXE IS AHEAD',170,82);}
 ctx.textBaseline='alphabetic';
}
root.MarioRender={render,pixel};
})(typeof window==='undefined'?globalThis:window);
