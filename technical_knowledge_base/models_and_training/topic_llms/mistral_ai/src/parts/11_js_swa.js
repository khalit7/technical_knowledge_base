// ---- Mistral 7B's cache, animated: the same 32,768-token input through a rolling buffer with GQA, a full GQA cache (Mixtral) and full MHA ----
(function(){
  const card=$('swa');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR=3600,MOVE=0.7,W=4096,N=32768,SQ=32*MiB,P=9,C=7;
  const BT={swa:2*32*8*128*2,gqa:2*32*8*128*2,mha:2*32*32*128*2};
  const WEIGHTS=7.24e9*2; // bytes, BF16
  const NM={swa:'Mistral 7B: GQA + rolling buffer',gqa:'Full GQA cache (Mixtral\'s attention)',mha:'Full multi-head attention'};
  const TGT=[[0,4096],[4096,4097],[4097,8192],[8192,32768],[32768,32768],[32768,32768]];
  const H=(t,c)=>({t,c});
  const CAP={
   swa:[H('Tokens 1 to 4,096 arrive','Each token leaves one key and one value in each of 32 layers, for 8 key-value heads of 128 numbers: 2 × 32 × 8 × 128 × 2 bytes = 131,072 bytes, 128 KiB. Until the window is full the rolling buffer fills like any cache: 4,096 tokens, 512 MiB. One square is 32 MiB, 256 positions.'),
    H('Token 4,097 overwrites token 1','Position <i>i</i> (counting from 0) is written to slot <i>i</i> mod <i>W</i>. Position 4,096 lands in slot 4,096 mod 4,096 = 0, over the oldest token, which has just left every layer\'s window. The buffer is a fixed ring and never holds more than 4,096 positions.'),
    H('To 8,192 tokens, the context Mistral 7B was trained on','The second lap overwrites every slot (colour shows the lap that wrote it). Still 512 MiB; the dashed outline is what a cache without the window would hold by now, 1 GiB.'),
    H('To 32,768 tokens','Eight laps. Without a window the cache would hold 32,768 positions, 4 GiB; the rolling buffer still holds 4,096, 512 MiB. That is the 8x saving the paper reports for a 32k sequence.'),
    H('How far back can the last token reach?','Each layer looks back 4,096 positions, but layer 2 reads layer-1 states that already summarise the 4,096 before them, like stacked convolutions. After <i>k</i> layers the reach is about <i>k</i> × 4,096: 8 layers cover all 32,768, and 32 layers reach 131,072, the paper\'s "theoretical attention span". It is an upper bound: anything beyond the window arrives only through what the intermediate states carried, so exact long-range recall is weaker than with full attention.'),
    H('The two savings multiply','GQA divides the per-token cost by 4 (8 key-value heads instead of 32); the window caps the positions at 4,096, a factor of 8 at this length. Together: 512 MiB against 16 GiB for full multi-head attention, 32 times less. The full MHA cache would be larger than the model\'s own 14.5 GB of weights.')],
   gqa:[H('Tokens 1 to 4,096 arrive','Mixtral kept Mistral 7B\'s attention shape (32 query heads sharing 8 key-value heads), so a token still costs 128 KiB, but it dropped the window. The first 4,096 tokens look exactly like the rolling buffer: 512 MiB.'),
    H('Token 4,097 is appended','Without a window nothing is overwritten: position 4,096 gets a new slot and the cache keeps growing by 128 KiB per token.'),
    H('To 8,192 tokens','1 GiB, twice the rolling buffer.'),
    H('To 32,768 tokens','4 GiB, the "without the window" line of the worked example: 32,768 × 128 KiB. Mixtral supports "a fully dense context length of 32k tokens".'),
    H('How far back can the last token reach?','Every layer reads every earlier position directly, so recall is exact at any distance inside the context. That is what the window gave up, and why Mixtral and the field moved away from windowing every layer.'),
    H('Compared with the other two','Eight times the rolling buffer at 32k, a quarter of full multi-head attention. GQA alone saves the factor of 4 at every length; the window\'s saving grows with the sequence.')],
   mha:[H('Tokens 1 to 4,096 arrive','A hypothetical Mistral 7B with one key-value head per query head: 2 × 32 × 32 × 128 × 2 = 524,288 bytes, 512 KiB per token. 4,096 tokens already need 2 GiB.'),
    H('Token 4,097 is appended','No window and no sharing: every token keeps 32 heads of keys and values in every layer.'),
    H('To 8,192 tokens','4 GiB.'),
    H('To 32,768 tokens','16 GiB: four times the full GQA cache, and more than the 14.5 GB the model\'s weights take in 16-bit. Decoding reads this whole cache for every new token, which is why the cache, not the arithmetic, limits throughput.'),
    H('How far back can the last token reach?','Every layer reads every earlier position directly.'),
    H('Compared with the other two','Thirty-two times the rolling buffer with GQA: the factor of 4 from sharing key-value heads times the factor of 8 from the window at 32k.')]};
  const WIDE={W:660,H:372,ru:[20,640,34],gr:[20,96],rp:[360,96,280],bars:[20,286]};
  const NAR={W:360,H:560,ru:[16,344,34],gr:[20,96],rp:[16,262,328],bars:[16,452]};
  const st={m:'swa',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),lerp=(a,b,u)=>a+(b-a)*u;
  const T=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.w?' font-weight="600"':'')+'>'+s+'</text>';
  const G=(op,s)=>'<g opacity="'+(+op).toFixed(3)+'">'+s+'</g>';
  const LAPC=['var(--c3)','var(--c6)','var(--c1)','var(--c4)','var(--c5)','var(--c2)','var(--good)','var(--acc)'];
  const nNow=()=>{const [a,b]=TGT[st.k],e=RM?1:ease(cl(st.t/MOVE));return Math.round(lerp(a,b,e))};
  const held=(m,n)=>m==='swa'?Math.min(n,W):n;
  const bytes=(m,n)=>BT[m]*held(m,n);
  function draw(){
    const L=card.clientWidth<560?NAR:WIDE,k=st.k,m=st.m,e=RM?1:ease(cl(st.t/MOVE)),n=nNow();
    const cW='var(--good)',cF='var(--acc)';let s='';
    // ruler of positions
    const [r0,r1,ry]=L.ru,X=p=>r0+(r1-r0)*p/N;
    s+=T(r0,ry-16,'The sequence: positions 0 to 32,768',{fs:11,c:'var(--mute)'});
    s+='<rect x="'+r0+'" y="'+ry+'" width="'+(r1-r0)+'" height="14" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
    if(n>0){s+='<rect x="'+r0+'" y="'+ry+'" width="'+(X(n)-r0).toFixed(1)+'" height="14" rx="3" fill="var(--dim)"/>';
      const a=m==='swa'?Math.max(0,n-W):0;s+='<rect x="'+X(a).toFixed(1)+'" y="'+ry+'" width="'+Math.max(1.5,X(n)-X(a)).toFixed(1)+'" height="14" rx="3" fill="'+(m==='swa'?cW:cF)+'" fill-opacity=".75"/>';
      s+='<line x1="'+X(n).toFixed(1)+'" x2="'+X(n).toFixed(1)+'" y1="'+(ry-4)+'" y2="'+(ry+18)+'" stroke="var(--ink)" stroke-width="1.5"/>'}
    [[0,'0'],[4096,'4,096'],[8192,'8,192'],[16384,'16,384'],[32768,'32,768']].forEach(([p,l])=>{s+='<line x1="'+X(p)+'" x2="'+X(p)+'" y1="'+(ry+14)+'" y2="'+(ry+18)+'" stroke="var(--mute)"/>'+T(X(p),ry+29,l,{fs:10,a:p===0?'start':p===N?'end':'middle',c:'var(--mute)'})});
    s+=T(r1,ry-16,(m==='swa'?'window: last 4,096 attended':'all earlier positions attended'),{fs:10.5,a:'end',c:m==='swa'?cW:cF});
    // cache grid: one square = 32 MiB
    const [gx,gy]=L.gr,sqN=Math.ceil(bytes(m,n)/SQ-1e-9);
    s+=T(gx,gy-12,'Cache now: one square = 32 MiB',{fs:11,c:'var(--mute)'});
    let d='';const cellAt=(i)=>[gx+(i%32)*P,gy+Math.floor(i/32)*P];
    if(m==='swa'){
      // ghost of the full cache this length would need
      const ghost=Math.ceil(BT.gqa*n/SQ-1e-9);let gd='';for(let i=16;i<ghost;i++){const [x,y]=cellAt(i);gd+='M'+x+' '+y+'h'+C+'v'+C+'h-'+C+'z'}
      if(gd)s+='<path d="'+gd+'" fill="none" stroke="var(--mute)" stroke-dasharray="2 1.5" stroke-width=".8" opacity=".7"/>';
      // ring of 16 squares, coloured by the lap that last wrote each one
      for(let q=0;q<16;q++){const lo=q*256;if(n<=lo)continue;const laps=Math.floor((n-1-lo)/W);const [x,y]=cellAt(q);
        s+='<rect x="'+x+'" y="'+y+'" width="'+C+'" height="'+C+'" rx="1" fill="'+LAPC[laps%8]+'"/>'}
      const ly0=gy+Math.max(1,Math.ceil(ghost/32))*P+16;
      if(n>0){const slot=(n-1)%W,q=Math.floor(slot/256),[x,y]=cellAt(q);s+='<path d="M'+(x+C/2)+' '+(y-1)+'l-3.5 -5h7z" fill="var(--ink)"/>';
        s+=T(gx,ly0,'write head ▼: slot '+fmt(slot)+' = position '+fmt(n-1)+' mod 4,096',{fs:10.5});
        s+=T(gx,ly0+14,'lap '+(Math.floor((n-1)/W)+1)+' of the ring'+(n>W?'; older laps overwritten':''),{fs:10.5,c:'var(--mute)'})}
      if(n>4096&&k>=2)s+=G(cl(k>2?1:e*2),T(gx,ly0+28,'dashed: what a cache without the window would hold',{fs:10.5,c:'var(--mute)'}));
    }else{
      for(let i=0;i<sqN;i++){const [x,y]=cellAt(i);d+='M'+x+' '+y+'h'+C+'v'+C+'h-'+C+'z'}
      if(d)s+='<path d="'+d+'" fill="'+(m==='mha'?'var(--c2)':cF)+'" fill-opacity=".8"/>';
      const rows=Math.ceil(sqN/32);s+=T(gx,gy+rows*P+14,fmt(sqN)+(sqN===1?' square':' squares')+', '+fmt(n)+' positions held',{fs:10.5,c:'var(--mute)'});
    }
    // reach panel
    const [px,py,pw]=L.rp,Y=i=>py+12+i*13,XR=p=>px+pw*p/N;
    const rop=k>=4?1:.32;let rs=T(px,py-8,'Reach of the last token, by layer',{fs:11,c:'var(--mute)'});
    const kk=k===4?Math.max(1,Math.ceil(8*e)):(k>4?8:0);
    for(let i=0;i<8;i++){const lay=i+1,on=lay<=kk;const a=m==='swa'?Math.max(0,N-lay*W):0;
      rs+=T(px,Y(i)+9,'layer '+lay,{fs:10,c:'var(--mute)'});
      const x0=px+44,ww=pw-44,XX=p=>x0+ww*p/N;
      rs+='<rect x="'+x0+'" y="'+Y(i)+'" width="'+ww+'" height="9" rx="2" fill="var(--soft)"/>';
      if(on)rs+='<rect x="'+XX(a).toFixed(1)+'" y="'+Y(i)+'" width="'+(XX(N)-XX(a)).toFixed(1)+'" height="9" rx="2" fill="'+(m==='swa'?cW:cF)+'" fill-opacity=".8"/>';
      if(on&&m==='swa'){const lx=XX(a)-3;rs+=lx>x0+34?T(lx,Y(i)+8,fmt(lay*W),{fs:9.5,a:'end'}):T(XX(a)+4,Y(i)+8,fmt(lay*W),{fs:9.5,c:'var(--bg)'})}}
    rs+=T(px,Y(8)+10,m==='swa'?'… layer 32: 32 × 4,096 = 131,072 positions (bound)':'every layer: all 32,768 positions, directly',{fs:10.5,c:m==='swa'?cW:cF});
    s+=G(rop,rs);
    // to-scale bars: cache of each design at the current length, against the BF16 weights
    const [bx0,by]=L.bars,lw=L.W<500?118:170,x0=bx0+lw,ww=L.W-14-x0,MAX=16*GiB,XB=v=>x0+ww*Math.min(1,v/MAX);
    s+=T(bx0,by-8,'Cache at '+fmt(n)+(n===1?' token':' tokens')+', to scale',{fs:11,c:'var(--mute)'});
    [['mha','Full MHA','var(--c2)'],['gqa','GQA, full (Mixtral)',cF],['swa','GQA + window (7B)',cW]].forEach(([mm,lab,col],i)=>{const y=by+i*20,v=bytes(mm,n),on=mm===m;
      s+=G(on?1:.5,T(bx0,y+10,lab,{fs:10.5,w:on})+'<rect x="'+x0+'" y="'+y+'" width="'+ww+'" height="12" rx="2" fill="var(--soft)"/><rect x="'+x0+'" y="'+y+'" width="'+Math.max(v?1.5:0,XB(v)-x0).toFixed(1)+'" height="12" rx="2" fill="'+col+'"/>'+(XB(v)+60>L.W?T(XB(v)-4,y+10,fmtBytes(v),{fs:10.5,a:'end',c:'var(--bg)'}):T(XB(v)+5,y+10,fmtBytes(v),{fs:10.5})))});
    const wx=XB(WEIGHTS);s+='<line x1="'+wx.toFixed(1)+'" x2="'+wx.toFixed(1)+'" y1="'+(by-4)+'" y2="'+(by+62)+'" stroke="var(--ink)" stroke-dasharray="3 2"/>'+T(wx-4,by+74,'weights in BF16, 14.5 GB',{fs:10,a:'end',c:'var(--mute)'});
    $('swaSvg').innerHTML=svgEl(L.W,L.H,s,NM[m]+', step '+(k+1));
    if(st.lk!==k||st.lm!==m){const S=CAP[m][k];$('swaStep').innerHTML='Step '+(k+1)+' of 6: '+S.t;$('swaCap').innerHTML=S.c;st.lk=k;st.lm=m}
    $('swaCnt').innerHTML=stat('Tokens so far',fmt(n),'of the 32,768-token input')+stat('Positions held',fmt(held(m,n)),m==='swa'?'min(n, 4,096)':'n')+stat('Bytes per token',fmtBytes(BT[m]),m==='mha'?'2 × 32 × 32 × 128 × 2':'2 × 32 × 8 × 128 × 2')+stat('Cache now',fmtBytes(bytes(m,n)),fmt(bytes(m,n))+' bytes');
    const sc=$('swaScrub');sc.max=600;sc.value=Math.round((k+st.t)*100);
    const pb=$('swaPlay'),end=k===5&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<5){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('swaPlay').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===5&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<5){st.k++;st.t=0}st.play=true;st.last=0;kick()}draw()});
  $('swaFwd').addEventListener('click',()=>{pause();st.k=Math.min(5,st.k+1);st.t=1;draw()});
  $('swaBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('swaScrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(5,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('swaSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('swaM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
