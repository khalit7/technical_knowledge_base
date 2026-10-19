// ---- MLA explainer: one token through one layer, animated (MLA against standard MHA) ----
(function(){
  const card=$('mlx');if(!card)return;
  const P=7,C=6,DUR=3400,MOVE=0.62; // cell pitch and size (one cell = 64 numbers), ms per step at 1x, share of a step spent moving
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const nums={mla:576,mha:32768},LAY=61;
  const H=(t,c)=>({t,c});
  const SM=[
    H('1. A token arrives','Token <i>t</i> enters one of V3\'s 61 attention layers as its hidden state <b>h</b><sub><i>t</i></sub>: 7,168 numbers, 112 squares. Nothing of it is cached yet; the cache on the right already holds the entries of every earlier token.'),
    H('2. Compress into the latent','The down-projection <i>W</i><sup>DKV</sup> maps <b>h</b><sub><i>t</i></sub> to the latent <b>c</b><sup>KV</sup><sub><i>t</i></sub> of <i>d<sub>c</sub></i> = 512 numbers. This one vector stands in for the keys and values of all 128 heads, which is where the saving comes from: 512 instead of 2 × 128 × 128.'),
    H('3. Add the decoupled RoPE key','Rotary position embeddings cannot pass through the absorbed product (it would differ for every pair of positions), so a separate key <b>k</b><sup>R</sup><sub><i>t</i></sub> = RoPE(<i>W</i><sup>KR</sup><b>h</b><sub><i>t</i></sub>) carries position: <i>d<sup>R</sup><sub>h</sub></i> = 64 numbers, one copy shared by all 128 heads.'),
    H('4. Write 576 numbers to the cache','Only [<b>c</b><sup>KV</sup><sub><i>t</i></sub> ; <b>k</b><sup>R</sup><sub><i>t</i></sub>], 512 + 64 = 576 numbers, is written to this layer\'s cache. That is the whole per-token cost of MLA: (<i>d<sub>c</sub></i> + <i>d<sup>R</sup><sub>h</sub></i>) × <i>l</i> = 576 × 61 = 35,136 numbers, 70,272 bytes in BF16.'),
    H('5. Prefill: rebuild the heads (MHA mode)','In training and prefill attention is compute-bound and many queries run at once, so each head\'s own slice of <i>W</i><sup>UK</sup> and <i>W</i><sup>UV</sup> rebuilds its 128-number key and value from the latent, and every key is extended by the shared <b>k</b><sup>R</sup>. These 2 × 128 × 128 = 32,768 numbers per token (dashed) are computed, used and discarded: never cached.'),
    H('6. Decode: absorb, every head reads one entry (MQA mode)','In decode <i>W</i><sup>UK</sup><sub><i>i</i></sub> moves onto the query side, (<i>W</i><sup>UK</sup><sub><i>i</i></sub>)<sup>⊤</sup><b>q</b><sub><i>t,i</i></sub> scored straight against <b>c</b><sup>KV</sup><sub><i>j</i></sub>, and <i>W</i><sup>UV</sup><sub><i>i</i></sub> folds into <i>W</i><sup>O</sup>. All 128 query heads read the same 576-number entry of every earlier token, its first 512 serving as the value: nothing is expanded, so a decoded token reads 576 numbers per earlier token per layer, not 32,768.'),
    H('7. Compare with standard MHA','Per token per layer MLA caches 576 numbers where standard MHA with V3\'s 128 heads of 128 would cache 2 × 128 × 128 = 32,768: about 57 times fewer, the size of GQA with only 2.25 groups (V2 paper). Over 61 layers that is 68.6 KiB per token against 3.81 MiB.')];
  const SH=[
    H('1. A token arrives','Token <i>t</i> enters one attention layer as its hidden state <b>h</b><sub><i>t</i></sub>: 7,168 numbers, 112 squares. Behind it, the cache holds the keys and values of every earlier token.'),
    H('2. Project the keys','<i>W</i><sup>K</sup> projects <b>h</b><sub><i>t</i></sub> into one 128-number key per head: 128 × 128 = 16,384 numbers, 256 squares.'),
    H('3. Project the values','<i>W</i><sup>V</sup> does the same for the values: another 16,384 numbers. Every head\'s key and value are its own; nothing is shared between heads.'),
    H('4. Write 32,768 numbers to the cache','All of it is cached, because every later token attends to every earlier key and value: 2<i>n<sub>h</sub>d<sub>h</sub></i> = 32,768 numbers in this layer, 1,998,848 over 61 layers, 3,997,696 bytes (3.81 MiB) per token in BF16.'),
    H('5. Decode: each head reads its own keys and values','Each decoded token\'s 128 query heads read their own keys and values for every earlier token: 32,768 numbers per earlier token per layer, all moved from memory for every decoded token. That read sets serving throughput, and it is the number MLA attacks.'),
    H('6. Compare with MLA','Standard MHA caches 32,768 numbers per token per layer; MLA at the same 128 heads of 128 caches 576, about 57 times fewer. Over 61 layers: 3.81 MiB against 68.6 KiB per token.')];
  const WIDE={W:660,H:352,ht:[14,62],pA:[90,60,84,40],pB:[90,150,84,40],pK:[90,60,84,40],pV:[90,196,84,40],cc:[214,50],kr:[214,166],gK:[196,40],gV:[196,176],
    up:[318,118,58,58],upA:[[392,128,378,142],[318,140,311,96],[318,156,311,232]],qd:[196,48],o1:[196,150,112,40],o2:[196,212,112,40],oA:[[388,70,310,166],[252,190,252,210]],
    cache:[384,24,264,274],col0:[394,58],cK:[394,46],cV:[522,46],bus:[390,52],busH:[392,102],qOut:'right',qTxt:[196,120],bars:[14,316]};
  const NAR={W:360,H:520,ht:[10,46],pA:[76,52,80,40],pB:[76,120,80,40],pK:[76,52,80,40],pV:[76,176,80,40],cc:[188,40],kr:[188,118],gK:[170,30],gV:[170,160],
    up:[292,120,58,58],upA:[[321,300,321,180],[292,149,286,95],[292,149,286,215]],qd:[170,40],o1:[10,212,150,40],o2:[10,152,150,40],oA:[[60,306,60,254],[60,212,60,194]],
    cache:[8,286,344,172],col0:[20,318],cK:[20,306],cV:[150,306],bus:[226,312],busH:[76,304],qOut:'down',qTxt:[10,206],bars:[10,484]};
  const st={m:'mla',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const steps=()=>st.m==='mla'?SM:SH;
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),lerp=(a,b,u)=>a+(b-a)*u;
  // n cells of a grid as one path
  function cells(x,y,cols,n,fill,op,dash){let d='';for(let i=0;i<n;i++)d+='M'+(x+(i%cols)*P)+' '+(y+Math.floor(i/cols)*P)+'h'+C+'v'+C+'h-'+C+'z';
    return n>0?'<path d="'+d+'" fill="'+fill+'"'+(op!=null?' fill-opacity="'+op+'"':'')+'/>':''}
  const frame=(x,y,cols,rows,col,op)=>'<rect x="'+(x-2.5)+'" y="'+(y-2.5)+'" width="'+(cols*P+4)+'" height="'+(rows*P+4)+'" rx="3" fill="none" stroke="'+col+'" stroke-dasharray="4 3" opacity="'+(op==null?1:op)+'"/>';
  const T=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11.5)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>';
  const G=(op,s)=>'<g opacity="'+op.toFixed(3)+'">'+s+'</g>';
  const box=(b,lines,cls,op)=>G(op==null?1:op,bx(b[0],b[1],b[2],b[3],cls||'box',lines,11.5));
  const arr=(a,op,dash)=>G(op==null?1:op,ar(a[0],a[1],a[2],a[3],dash));
  function packets(pts,u,col){let s='';const seg=[];let tot=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);tot+=l}
    for(let j=0;j<6;j++){const f=cl(u*1.7-j*.14);if(f<=0||f>=1)continue;let d=f*tot,i=0;while(i<seg.length-1&&d>seg[i]){d-=seg[i];i++}
      const r=seg[i]?d/seg[i]:0,x=lerp(pts[i][0],pts[i+1][0],r),y=lerp(pts[i][1],pts[i+1][1],r);s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3" fill="'+col+'" opacity="'+(1-Math.abs(f-.5)).toFixed(2)+'"/>'}
    return s}
  const ctr=b=>[b[0]+b[2]/2,b[1]+b[3]/2];
  function draw(){
    const L=card.clientWidth<560?NAR:WIDE,k=st.k,e=RM?1:ease(cl(st.t/MOVE)),ph=RM?-1:(st.t*2.2)%1,mla=st.m==='mla';
    const cK='var(--c2)',cV='var(--c4)',cC='var(--good)',cR='var(--c6)',cH='var(--acc)';
    let s='';
    const writeK=3,cmpK=mla?6:5,decK=mla?5:4;
    // cache region
    const cb=L.cache;s+='<rect x="'+cb[0]+'" y="'+cb[1]+'" width="'+cb[2]+'" height="'+cb[3]+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>';
    s+=T(cb[0]+8,cb[1]+14,'KV cache of this layer (1 of 61)',{c:'var(--mute)',fs:11});
    const nx=L.col0[0]+20*12; // the new token's column (MLA)
    if(mla){for(let j=0;j<20;j++){const x=L.col0[0]+j*12;s+=cells(x,L.col0[1],1,8,cC,.45)+cells(x,L.col0[1]+58,1,1,cR,.45)}
      s+=T(L.col0[0],L.col0[1]+80,'earlier tokens: 9 squares (576 numbers) each',{c:'var(--mute)',fs:10.5});
      s+=T(nx+3,L.col0[1]+80,'t',{a:'middle',fs:10.5,op:k>=writeK?1:.35});
      s+='<rect x="'+(nx-2)+'" y="'+(L.col0[1]-2)+'" width="10" height="69" rx="2" fill="none" stroke="var(--mute)" stroke-dasharray="2 2" opacity="'+(k>=writeK?0:.6)+'"/>';
    }else{for(let g=2;g>=1;g--){const o=g*5;s+=G(.5,frame(L.cK[0]+o,L.cK[1]+o,16,16,'var(--mute)')+frame(L.cV[0]+o,L.cV[1]+o,16,16,'var(--mute)'))}
      s+=T(L.cK[0],L.cK[1]+134,'keys 16,384',{fs:10.5,c:'var(--mute)'})+T(L.cV[0],L.cV[1]+134,'values 16,384',{fs:10.5,c:'var(--mute)'});
      s+=T(L.cK[0],L.cK[1]+148,'behind: every earlier token, 512 squares each',{fs:10.5,c:'var(--mute)'});
      if(k<writeK)s+=frame(L.cK[0],L.cK[1],16,16,'var(--mute)',.6)+frame(L.cV[0],L.cV[1],16,16,'var(--mute)',.6);}
    // hidden state
    const htOp=k===0?1:(k>=(mla?4:4)?.3:.85),htN=k===0?Math.round(112*e):112;
    s+=G(htOp,cells(L.ht[0],L.ht[1],8,htN,cH,.7)+T(L.ht[0],L.ht[1]-8,'hₜ · 7,168',{fs:12}));
    if(mla){
      const pOp=k<1?0:k===1?e:k>=4?(k===4?.3:0):1;
      s+=box(L.pA,['Wᴰᴷⱽ','down-projection'],'box',pOp);
      s+=box(L.pB,['Wᴷᴿ, RoPE','decoupled key'],'box',k<2?0:k===2?e:k>=4?(k===4?.3:0):1);
      const hO=[L.ht[0]+56,L.ht[1]+49];
      if(k===1&&!RM)s+=packets([hO,ctr(L.pA),[L.cc[0]+3,L.cc[1]+28]],e,cC);
      if(k===2&&!RM)s+=packets([hO,ctr(L.pB),[L.kr[0]+3,L.kr[1]+3]],e,cR);
      // latent and RoPE key: made, then moved into the cache
      if(k>=1){const u=k===writeK?e:(k>writeK?1:0),x=lerp(L.cc[0],nx,u),y=lerp(L.cc[1],L.col0[1],u),n=k===1?Math.round(8*cl((e-.35)/.65)):8;
        s+=cells(x,y,1,n,cC);if(k<writeK)s+=T(L.cc[0]+14,L.cc[1]+26,'cᴷⱽₜ',{fs:12})+T(L.cc[0]+14,L.cc[1]+41,'512 numbers',{fs:10.5,c:'var(--mute)'})}
      if(k>=2){const u=k===writeK?e:(k>writeK?1:0),x=lerp(L.kr[0],nx,u),y=lerp(L.kr[1],L.col0[1]+58,u),op=k===2?cl((e-.4)/.6):1;
        s+=G(op,cells(x,y,1,1,cR));if(k<writeK)s+=G(op,T(L.kr[0]+14,L.kr[1]+7,'kᴿₜ · 64, all heads',{fs:11}))}
      if(k===writeK)s+=G(cl(e*3),T(nx+3,L.col0[1]-6,'+576',{a:'middle',fs:11,c:cC}));
      if(k===4){ // prefill: rebuild per-head keys and values, not cached
        s+=box(L.up,['Wᵁᴷᵢ','Wᵁⱽᵢ'],'boxa',cl(e*2));L.upA.forEach(a=>s+=arr(a,cl(e*2)));
        const n=Math.round(256*e);s+=cells(L.gK[0],L.gK[1],16,n,cK,.35)+cells(L.gV[0],L.gV[1],16,n,cV,.35)+frame(L.gK[0],L.gK[1],16,16,cK)+frame(L.gV[0],L.gV[1],16,16,cV);
        s+=T(L.gK[0],L.gK[1]-6,'kᵢ = [kᶜᵢ ; kᴿ], 128 heads',{fs:10.5})+T(L.gV[0],L.gV[1]-6,'vᵢ, 128 heads: not cached',{fs:10.5});
      }
      if(k===decK){ // decode: absorbed queries all read the same entries
        const q=L.qd,op=cl(e*2);let ln='';
        s+=G(op,cells(q[0],q[1],16,128,cH,.8)+T(q[0],q[1]-6,'128 heads, (Wᵁᴷᵢ)ᵀqᵢ',{fs:10.5}));
        const pts=[];for(let r=0;r<8;r++)pts.push(L.qOut==='right'?[q[0]+16*P,q[1]+3+r*P]:[q[0]+3+r*14,q[1]+8*P]);
        pts.forEach(p=>{ln+='<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+L.bus[0]+'" y2="'+L.bus[1]+'" stroke="'+cH+'" stroke-width="1" opacity=".55"/>';if(ph>=0)ln+='<circle cx="'+lerp(p[0],L.bus[0],ph).toFixed(1)+'" cy="'+lerp(p[1],L.bus[1],ph).toFixed(1)+'" r="2.4" fill="'+cH+'"/>'});
        const bx0=L.col0[0]-2,bx1=nx+8,by=L.col0[1]-5;ln+='<path d="M'+bx0+' '+(by+4)+'V'+by+'H'+bx1+'V'+(by+4)+'" fill="none" stroke="'+cH+'" stroke-width="1.6"/>';
        if(L.qOut!=='right')ln+='<line x1="'+L.bus[0]+'" y1="'+L.bus[1]+'" x2="'+L.bus[0]+'" y2="'+by+'" stroke="'+cH+'"/>';
        s+=G(op,ln);
        s+=G(cl(e*2-.4),bx(L.o1[0],L.o1[1],L.o1[2],L.o1[3],'boxa',['Σⱼ aⱼ cᴷⱽⱼ','512, per head'],11)+bx(L.o2[0],L.o2[1],L.o2[2],L.o2[3],'box',['Wᵁⱽᵢ folded','into Wᴼ'],11));
        L.oA.forEach(a=>s+=arr(a,cl(e*2-.4)));
      }
    }else{
      s+=box(L.pK,['Wᴷ','keys, per head'],'box',k<1?0:k===1?e:k>=4?0:1);
      s+=box(L.pV,['Wⱽ','values, per head'],'box',k<2?0:k===2?e:k>=4?0:1);
      const hO=[L.ht[0]+56,L.ht[1]+49];
      if(k===1&&!RM)s+=packets([hO,ctr(L.pK),[L.gK[0]+56,L.gK[1]+56]],e,cK);
      if(k===2&&!RM)s+=packets([hO,ctr(L.pV),[L.gV[0]+56,L.gV[1]+56]],e,cV);
      if(k>=1){const u=k===writeK?e:(k>writeK?1:0),n=k===1?Math.round(256*cl((e-.3)/.7)):256;
        s+=cells(lerp(L.gK[0],L.cK[0],u),lerp(L.gK[1],L.cK[1],u),16,n,cK,.85);if(k<writeK)s+=T(L.gK[0],L.gK[1]-6,'k₁ … k₁₂₈ · 16,384',{fs:10.5})}
      if(k>=2){const u=k===writeK?e:(k>writeK?1:0),n=k===2?Math.round(256*cl((e-.3)/.7)):256;
        s+=cells(lerp(L.gV[0],L.cV[0],u),lerp(L.gV[1],L.cV[1],u),16,n,cV,.85);if(k<writeK)s+=T(L.gV[0],L.gV[1]-6,'v₁ … v₁₂₈ · 16,384',{fs:10.5})}
      if(k===writeK)s+=G(cl(e*3),T(L.cV[0]+112,L.cK[1]-4,'+32,768',{a:'end',fs:11,c:cK}));
      if(k===decK){const q=L.qd,op=cl(e*2);let ln='';
        s+=G(op,cells(q[0],q[1],16,128,cH,.8)+T(q[0],q[1]-6,'128 query heads',{fs:10.5}));
        const pts=[];for(let r=0;r<8;r++)pts.push(L.qOut==='right'?[q[0]+16*P,q[1]+3+r*P]:[q[0]+3+r*14,q[1]+8*P]);
        pts.forEach(p=>{ln+='<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+L.busH[0]+'" y2="'+L.busH[1]+'" stroke="'+cH+'" stroke-width="1" opacity=".55"/>';if(ph>=0)ln+='<circle cx="'+lerp(p[0],L.busH[0],ph).toFixed(1)+'" cy="'+lerp(p[1],L.busH[1],ph).toFixed(1)+'" r="2.4" fill="'+cH+'"/>'});
        ln+=frame(L.cK[0],L.cK[1],16,16,cH)+frame(L.cV[0],L.cV[1],16,16,cH);
        s+=G(op,ln)+G(cl(e*2-.4),T(L.qTxt[0],L.qTxt[1],'head i reads its own kᵢ, vᵢ',{fs:10.5})+T(L.qTxt[0],L.qTxt[1]+14,'for every earlier token',{fs:10.5,c:'var(--mute)'}));
      }
    }
    // to-scale bars: numbers cached per token per layer
    const b=L.bars,x0=b[0]+104,x1=L.W-12,wB=x1-x0,cur=cntNow();
    s+=T(b[0],b[1]-4,'Cached per token per layer, to scale',{fs:11,c:'var(--mute)'});
    const row=(y,name,val,full,col,op)=>G(op,T(b[0],y+9,name,{fs:11})+'<rect x="'+x0+'" y="'+y+'" width="'+wB+'" height="10" rx="2" fill="var(--soft)"/>'+'<rect x="'+x0+'" y="'+y+'" width="'+Math.max(val?1.5:0,wB*val/32768).toFixed(1)+'" height="10" rx="2" fill="'+col+'"/>'+(full?'':T(x0+Math.max(4,wB*val/32768)+6,y+9,fmt(val),{fs:10.5})));
    const mhaV=mla?(k===cmpK?Math.round(32768*e):0):cur,mlaV=mla?cur:(k===cmpK?Math.round(576*e):0);
    s+=row(b[1]+2,'MHA '+fmt(mhaV),mhaV,mhaV>20000,cK,mla?(k===cmpK?1:.35):1);
    s+=row(b[1]+18,'MLA '+fmt(mlaV),mlaV,false,cC,mla?1:(k===cmpK?1:.35));
    if(k===cmpK)s+=G(cl(e*2-.5),T(L.W-12,b[1]-4,'about 57 times fewer',{a:'end',fs:11,c:cC}));
    $('mlxSvg').innerHTML=svgEl(L.W,L.H,s,'One token through '+(mla?'multi-head latent attention':'standard multi-head attention')+', step '+(k+1));
    // text: step caption only when the step changes, counter every frame
    if(st.lk!==k||st.lm!==st.m){const S=steps()[k];$('mlxStep').innerHTML='Step '+(k+1)+' of '+steps().length+': '+S.t.replace(/^\d+\. /,'');$('mlxCap').innerHTML=S.c;st.lk=k;st.lm=st.m}
    const c=cur;$('mlxCnt').innerHTML=stat('Numbers cached for this token, this layer',fmt(c),mla?'MLA writes 512 + 64':'MHA writes 2 × 128 × 128')+stat('Over all 61 layers',fmt(c*LAY),'numbers per token')+stat('In BF16',fmtBytes(c*LAY*2),fmt(c*LAY*2)+' bytes per token');
    const n=steps().length,sc=$('mlxScrub');sc.max=n*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('mlxPlay'),end=k===n-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  function cntNow(){const k=st.k,e=RM?1:ease(cl(st.t/MOVE)),N=nums[st.m];return k<3?0:k===3?Math.round(N*e):N}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const n=steps().length;if(st.t>=1){if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('mlxPlay').addEventListener('click',()=>{if(st.play){pause()}else{const n=steps().length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('mlxFwd').addEventListener('click',()=>{pause();st.k=Math.min(steps().length-1,st.k+1);st.t=1;draw()});
  $('mlxBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('mlxScrub').addEventListener('input',e=>{pause();const n=steps().length,v=+e.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('mlxSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('mlxM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM&&!st.play){st.play=true}draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});rw=card.clientWidth<560;
  draw();
})();
