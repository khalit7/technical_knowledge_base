// ---- One decoded token, three ways: MSA (M3) against full GQA (M2) and the lightning hybrid (01), animated on a canvas ----
(function(){
  const card=$('ax');if(!card)return;
  const DUR=3200,RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const GC=['--c1','--c4','--c5','--c6'];
  const cl=x=>Math.max(0,Math.min(1,x)),ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2,lerp=(a,b,u)=>a+(b-a)*u;
  const st={m:'msa',k:0,t:RM?1:0,play:false,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  let n=131072,heat=null,blk=null,sel=null;
  const H=(t,c)=>({t,c});
  function gen(){const nb=n/KB,R=mulberry32(7+nb);heat=[];blk=[];sel=[];
    const hot=[0,1,2,3].map(g=>[0,1,2].map(()=>Math.floor(R()*(nb-2))));
    for(let g=0;g<4;g++){const h=new Float32Array(nb);
      for(let b=0;b<nb;b++){let v=R()*0.35;v+=Math.exp(-b/2)*1.2;v+=Math.exp(-(nb-1-b)/3)*0.9;hot[g].forEach((c,j)=>{v+=(0.9-0.15*j)*Math.exp(-Math.abs(b-c)/(1.5+nb/600))});h[b]=v}
      heat.push(h);
      const order=[...h.keys()].filter(b=>b!==nb-1).sort((a,b)=>h[b]-h[a]).slice(0,KSEL-1);sel.push(new Set([nb-1,...order]))}}
  function steps(){const N=fmt(n),nb=fmt(n/KB);
    if(st.m==='msa')return[
      H('1. A token arrives','The new token, at position '+N+', enters one of M3\'s 57 MSA layers. It forms 64 query heads of 128 (4 GQA groups of 16), its key and value for each of the 4 KV heads, and for the index branch 4 index queries (one per group) and one shared index key, all of dimension 128.'),
      H('2. Write to the cache: nothing is dropped','Its keys and values (2 × 4 × 128 × 2 = 2,048 bytes) and its index key (256 bytes, BF16 assumed) are appended. The grid is the whole context, '+nb+' blocks of 128 tokens, and every block stays resident: MSA never shrinks what is stored, it only chooses what to read.'),
      H('3. The index branch scores every earlier token','Each of the 4 index queries is dotted with the index key of every earlier token: 4 × 128 × '+N+' multiply-adds, reading all '+N+' index keys ('+fmtBytes(n*256)+'). This is the one part of MSA that still grows with the context, which is why it is kept so light.'),
      H('4. Max-pool into block scores','Each block of 128 tokens takes the maximum of its tokens\' index scores, so one strongly relevant token is enough to lift its whole block. Shade shows each block\'s score for group 1 (illustrative scores).'),
      H('5. Each group keeps its own 16 blocks','Every GQA group ranks the blocks by raw score (exp-free top-k) and keeps 16, always including the block that holds the query. The four colours are the four groups: they share the local block and the sink at the start, but retrieve different long-range blocks. 64 of '+nb+' squares are lit.'),
      H('6. Exact softmax attention on 2,048 keys per group','Each group\'s 16 query heads run ordinary softmax attention over the 16 × 128 = 2,048 selected keys of their own KV head, reading 4 × 2,048 × 2 × 128 × 2 bytes = 4 MiB. Nothing was compressed, so if the right blocks were chosen, the lookup is exact.'),
      H('7. Compare, to scale','Read by this token in this layer: '+fmtBytes(readL('msa'))+' (index keys plus selected blocks) against M2\'s '+fmtBytes(readL('full'))+'. Stored: '+fmtBytes(storeL('msa'))+' against '+fmtBytes(storeL('full'))+'; the difference in storage comes from 4 KV heads instead of 8, not from MSA.')];
    if(st.m==='full')return[
      H('1. A token arrives','The new token, at position '+N+', enters one of M2\'s 62 layers. It forms 48 query heads of 128 (8 GQA groups of 6) and its key and value for each of the 8 KV heads.'),
      H('2. Write to the cache','Its keys and values, 2 × 8 × 128 × 2 = 4,096 bytes, are appended to the cache, which already holds every earlier token: '+nb+' blocks of 128.'),
      H('3. Every query head scores every earlier key','There is no selection: each head\'s query is dotted with all '+N+' keys of its group\'s KV head, so the token reads every key, '+fmtBytes(n*2048)+', and does 48 × 128 × '+N+' multiply-adds for the scores.'),
      H('4. Softmax over everything, then the values','The softmax normalises over all '+N+' scores and the weighted sum reads every value ('+fmtBytes(n*2048)+' more): another 48 × 128 × '+N+' multiply-adds. Exact, and the reference quality the other two routes are measured against; its cost grows with every token, in every layer.'),
      H('5. Compare, to scale','M2 reads and stores '+fmtBytes(readL('full'))+' in this layer for this one token at this context. That is why M2 stopped at a 196,608-token window and why M3 needed MSA to reach 1M.')];
    return[
      H('1. A token arrives','The new token enters one of MiniMax-01\'s 70 lightning layers and forms 64 heads of query, key and value, each of dimension 128.'),
      H('2. No cache: update the state','Nothing is appended per token. Each head adds k<sup>⊤</sup>v to its fixed 128 × 128 state: 64 × 128 × 128 multiply-adds. The grid is faded because the earlier tokens are not kept in this layer at all, only summarised.'),
      H('3. Read the state, not the history','The output is q times the state: another 64 × 128 × 128 multiply-adds, reading 64 × 128 × 128 × 2 bytes = 2 MiB whatever the context. This is the cheapest route by far, and the one that lost exact recall: a fixed state cannot hand back one earlier token verbatim.'),
      H('4. The 8th layer is still softmax','One layer in every eight is softmax GQA with 8 KV heads: it caches 4,096 bytes per token and reads all '+N+' of them, as M2 does. That is MiniMax-01\'s 40 KiB per token: only 10 of its 80 layers grow with context.'),
      H('5. Compare, to scale','Per lightning layer, '+fmtBytes(readL('lin'))+' read and stored at any context, against '+fmtBytes(readL('full'))+' for a full-attention layer here. MiniMax gave this up in M2 for quality on multi-hop reasoning and retrieval, not for speed.')]}
  const readL=m=>m==='msa'?n*256+4*SELT*2*128*2:m==='full'?n*4096:64*128*128*2;
  const storeL=m=>m==='msa'?n*2304:m==='full'?n*4096:64*128*128*2;
  function counters(){const k=st.k,e=RM?1:ease(cl(st.t/0.8)),f=(a,b)=>k>a?1:k===a?e:(k<a?0:1);let rd=0,cp=0;
    if(st.m==='msa'){rd=n*256*f(2)+4*SELT*512*f(5);cp=4*128*n*f(2)+2*64*128*SELT*f(5)}
    else if(st.m==='full'){rd=n*2048*f(2)+n*2048*f(3);cp=48*128*n*f(2)+48*128*n*f(3)}
    else{rd=STATE01/70*f(2);cp=64*128*128*f(1)+64*128*128*f(2)}
    return{rd,cp,stv:storeL(st.m)}}
  let cv=null,ctx=null,cols={};
  function colours(){const cs=getComputedStyle(document.body),g=v=>cs.getPropertyValue(v).trim()||'#888';cols={ink:g('--ink'),mute:g('--mute'),line:g('--line'),soft:g('--soft'),acc:g('--acc'),bad:g('--bad'),good:g('--good'),lin:g('--c3'),full:g('--c2'),bg:g('--bg'),dim:g('--dim'),grp:GC.map(g)}}
  function draw(){
    const box=$('axSvg'),w=box.clientWidth;if(!w)return;
    if(!cv){cv=document.createElement('canvas');cv.setAttribute('role','img');box.appendChild(cv);ctx=cv.getContext('2d')}
    colours();
    const nb=n/KB,gc=Math.ceil(Math.sqrt(nb*3)),gr=Math.ceil(nb/gc),gw=w-8,cs=gw/gc,gh=cs*gr,top=46,barTop=top+gh+36,Ht=barTop+128;
    const dpr=window.devicePixelRatio||1;if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(Ht*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(Ht*dpr);cv.style.width=w+'px';cv.style.height=Ht+'px'}
    const c=ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,Ht);c.font='12px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';c.textBaseline='alphabetic';
    const k=st.k,e=RM?1:ease(cl(st.t/0.8)),m=st.m;
    // header: the token and what it forms
    const tk=k===0?e:1;c.globalAlpha=tk;c.fillStyle=cols.acc;c.fillRect(4,8,14,14);c.globalAlpha=1;c.fillStyle=cols.ink;
    const nw=w<560;c.fillText(m==='msa'?(nw?'new token: 64 q heads, 4 KV heads, 4 + 1 index heads':'new token: 64 query heads, 4 KV heads, 4 index queries + 1 index key'):m==='full'?'new token: 48 query heads, 8 KV heads':(nw?'new token: 64 heads of q, k, v':'new token: 64 heads of q, k, v (lightning layer)'),24,20);
    c.fillStyle=cols.mute;c.fillText(fmt(n)+' earlier tokens = '+fmt(nb)+' squares of 128',4,38);
    // grid
    const pos=b=>[4+(b%gc)*cs,top+Math.floor(b/gc)*cs];const pad=cs>4?1:cs>2.5?0.5:0;
    let fade=m==='lin'&&k<3?0.25:1;if(m==='lin'&&k>=3)fade=k===3?lerp(.25,1,e):1;
    const sweep=(m==='msa'&&k===2)||(m==='full'&&k===2)?e:-1;
    for(let b=0;b<nb;b++){const [x,y]=pos(b);let col=cols.dim,a=fade*0.6;
      if(m==='msa'){if(k===2&&b/nb<=sweep){col=cols.acc;a=0.18+0.5*cl(heat[0][b]/1.6)}
        else if(k===3){col=cols.acc;a=0.12+0.85*cl(heat[0][b]/1.6)}
        else if(k>=4){a=0.5}}
      if(m==='full'&&(k===2&&b/nb<=sweep||k>=3)){col=cols.full;a=k===3?0.5+0.4*Math.sin(Math.PI*e*2+b*0.01)**2:0.55}
      if(m==='lin'&&k===3&&b/nb<=e){col=cols.full;a=0.55}
      if(m==='lin'&&k>=4){col=cols.full;a=0.55}
      c.globalAlpha=a;c.fillStyle=col;c.fillRect(x+pad/2,y+pad/2,Math.max(cs-pad,0.6),Math.max(cs-pad,0.6))}
    c.globalAlpha=1;
    if(m==='msa'&&k>=4){const big=Math.max(cs*1.6,4.5),grow=k===4?e:1;
      for(let g=3;g>=0;g--){c.fillStyle=cols.grp[g];sel[g].forEach(b=>{const [x,y]=pos(b),s=lerp(cs,big,grow),o=(s-cs)/2;c.globalAlpha=k===5?0.6+0.4*Math.abs(Math.sin(Math.PI*(st.t*2+g/4))):0.95;
        const q=cs>=8?s/2:s,qx=cs>=8?(g%2)*q:0,qy=cs>=8?Math.floor(g/2)*q:0;c.fillRect(x-o+qx,y-o+qy,q,q)})}
      c.globalAlpha=1}
    // new token's slot written at the end (step 2)
    if((m==='msa'||m==='full')&&k===1){const [x,y]=pos(nb-1);c.strokeStyle=cols.ink;c.lineWidth=2;c.globalAlpha=e;c.strokeRect(x-1,y-1,cs+2,cs+2);c.globalAlpha=1;c.fillStyle=cols.ink;c.textAlign='right';c.fillText((m==='msa'?'+2,304 bytes':'+4,096 bytes')+' appended',w-4,top+gh+15);c.textAlign='left'}
    if(m==='lin'&&k>=1&&k<=2){c.fillStyle=cols.lin;c.globalAlpha=k===1?e:1;const sw=Math.min(120,w*0.3);c.fillRect(w/2-sw/2,top+gh/2-24,sw,48);c.globalAlpha=1;c.fillStyle=cols.bg;c.textAlign='center';c.fillText('state 64 × 128 × 128',w/2,top+gh/2-4);c.fillText('2 MiB, fixed',w/2,top+gh/2+12);c.textAlign='left'}
    if(m==='lin'&&k===3){c.fillStyle=cols.ink;c.textAlign='right';c.fillText('the softmax layer (1 in 8) reads its whole cache',w-4,top+gh+15);c.textAlign='left'}
    if(m==='msa'&&k>=4){c.font='11px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';let lx=4;['group 1','group 2','group 3','group 4'].forEach((t,g)=>{c.fillStyle=cols.grp[g];c.fillRect(lx,top+gh+6,9,9);c.fillStyle=cols.mute;c.fillText(t,lx+12,top+gh+15);lx+=c.measureText(t).width+26})}
    // bars to scale: read and stored, this layer
    c.font='11px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';
    const R=[['msa','MSA (M3)',cols.acc],['full','Full (M2)',cols.full],['lin','Lightning (01)',cols.lin]];
    const isCmp=k===steps().length-1,cn=counters();
    const grp=(y0,title,fn,cur)=>{c.fillStyle=cols.mute;c.fillText(title,4,y0);const mx=Math.max(...R.map(r=>fn(r[0]))),x0=Math.min(110,w*0.28),bw=w-x0-82;
      R.forEach((r,i)=>{const y=y0+6+i*16,me=r[0]===m,val=me?cur:(isCmp?fn(r[0])*e:0);c.globalAlpha=me||isCmp?1:0.45;c.fillStyle=cols.ink;c.fillText(r[1],4,y+9);c.fillStyle=cols.soft;c.fillRect(x0,y,bw,11);c.fillStyle=r[2];c.fillRect(x0,y,Math.max(val?1.5:0,bw*val/mx),11);c.fillStyle=cols.mute;c.fillText(val?fmtBytes(val):'',x0+bw+6,y+9);c.globalAlpha=1})};
    grp(barTop,'Read by this token, this layer (to scale)',readL,cn.rd);
    grp(barTop+66,'Stored for the whole context, this layer (to scale)',storeL,cn.stv);
    cv.setAttribute('aria-label','One decoded token through one '+(m==='msa'?'MSA':m==='full'?'full-attention':'lightning')+' layer, step '+(k+1));
    if(st.lk!==k||st.lm!==m+n){const S=steps()[k];$('axStep').innerHTML='Step '+(k+1)+' of '+steps().length+': '+S.t.replace(/^\d+\. /,'');$('axCap').innerHTML=S.c;st.lk=k;st.lm=m+n}
    const L=m==='msa'?57:m==='full'?62:70;
    $('axCnt').innerHTML=stat('Read by this token, this layer',fmtBytes(cn.rd),'× '+L+(m==='msa'?' MSA layers (+3 full)':m==='full'?' layers':' lightning layers (+10 softmax)'))+stat('Attention multiply-adds, this layer',cn.cp?sci(cn.cp,2):'0',m==='msa'?'index branch + 2,048 selected keys':m==='full'?'scores + weighted values over all keys':'state update + state read')+stat('Stored for the context, this layer',fmtBytes(cn.stv),m==='lin'?'fixed, whatever the context':'grows with every token');
    const ns=steps().length,sc=$('axScrub');sc.max=ns*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('axPlay'),end=k===ns-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play')}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const ns=steps().length;if(st.t>=1){if(st.k<ns-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('axPlay').addEventListener('click',()=>{if(st.play){pause()}else{const ns=steps().length;if(st.k===ns-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<ns-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('axFwd').addEventListener('click',()=>{pause();st.k=Math.min(steps().length-1,st.k+1);st.t=1;draw()});
  $('axBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('axScrub').addEventListener('input',e=>{pause();const ns=steps().length,v=+e.target.value;st.k=Math.min(ns-1,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('axSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('axT').addEventListener('change',e=>{n=+e.target.value;gen();st.k=0;st.t=RM?1:0;draw()});
  const seg=$('axM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&!RM){st.started=true;st.play=true}kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener('change',draw);
  let rw=0;addEventListener('resize',()=>{const ww=$('axSvg').clientWidth;if(ww!==rw){rw=ww;draw()}});
  onTab('t-read',()=>draw());
  gen();draw();
})();
