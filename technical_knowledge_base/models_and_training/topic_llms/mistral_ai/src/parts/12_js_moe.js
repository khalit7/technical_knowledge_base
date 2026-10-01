// ---- One token through one layer, animated: Mixtral 8x7B's eight big experts, Mistral 7B's dense block, Small 4's 128 small experts ----
(function(){
  const card=$('moe');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR=3600,MOVE=0.62,K=3; // side of a square = K * sqrt(millions of parameters): area is to scale
  const Mm=1e6;
  // per-layer parameter counts from the configs (millions)
  const D={
    d7:{attn:41.943,ex:176.161,E:1,top:1,sh:0,router:0,L:32,emb:262.144,tot:7.242,act:7.242,name:'Mistral 7B (dense)'},
    x7:{attn:41.943,ex:176.161,E:8,top:2,sh:0,router:0.033,L:32,emb:262.144,tot:46.703,act:12.880,name:'Mixtral 8x7B'},
    s4:{attn:28.051,ex:25.166,E:128,top:4,sh:1,router:0.524,L:36,emb:1073.742,tot:119.401,act:6.10,name:'Mistral Small 4'}};
  const PICK={d7:[0],x7:[2,5],s4:[17,58,90,121]},WT={d7:[1],x7:[0.62,0.38],s4:[0.34,0.27,0.22,0.17]};
  const H=(t,c)=>({t,c});
  const CAP={
   x7:[H('A token arrives','Token <i>t</i> enters one of Mixtral\'s 32 layers as 4,096 numbers. Area is to scale: each block\'s area is its parameter count.'),
    H('Attention: shared, exactly Mistral 7B\'s','32 query heads sharing 8 key-value heads, model width 4,096: 41.9M parameters, run in full for every token. Only the feed-forward part is replicated, so attention is counted once, not eight times.'),
    H('The router picks 2 of 8','A linear router, 4,096 × 8 = 32,768 parameters, scores the eight experts. The top 2 are kept and a softmax over just those two sets their weights (shown 0.62 and 0.38; the choice and the weights here are illustrative).'),
    H('Two experts run, outputs mixed','Each expert is a full Mistral 7B feed-forward network: 3 × 4,096 × 14,336 = 176.2M parameters. The token passes through two of them, 352.3M, and the layer output is the weighted sum.'),
    H('Six experts sit idle','1,057M parameters of this layer are held in memory but not read for this token. Memory pays for all eight; compute pays for two. The next token may pick a different pair: Mistral found consecutive tokens repeat their expert far more often than chance in the higher layers.'),
    H('The whole model: 46.7B stored, 12.9B touched','32 layers × (41.9M + 8 × 176.2M + router) + 0.26B of embeddings = 46.7B. Per token: 32 × (41.9M + 2 × 176.2M) + 0.26B = 12.9B. "8x7B" read as eight 7B models would be 58B (56B in round numbers); attention and embeddings are not copied.')],
   d7:[H('A token arrives','Token <i>t</i> enters one of Mistral 7B\'s 32 layers as 4,096 numbers. Area is to scale.'),
    H('Attention','The same block Mixtral kept: 32 query heads, 8 key-value heads, 41.9M parameters.'),
    H('One feed-forward network','No router: every token goes through the single SwiGLU feed-forward network, 3 × 4,096 × 14,336 = 176.2M parameters.'),
    H('Every parameter is touched','Dense means stored equals touched: 218.1M parameters per layer, all read for every token.'),
    H('Nothing idles','The whole layer is busy for every token, so the work per token rises with every parameter added.'),
    H('The whole model: 7.24B','32 × 218.1M + 0.26B of embeddings (32,000 × 4,096, input and output) = 7.24B, all active. Mixtral replaces the one 176.2M network with eight.')],
   s4:[H('A token arrives','Token <i>t</i> enters one of Small 4\'s 36 layers as 4,096 numbers, at the same scale as the other two modes.'),
    H('Attention: latent, DeepSeek-style','Small 4\'s config uses multi-head latent attention (a 256-number key-value latent plus a 64-number position key, cached instead of full keys and values): 28.1M parameters per layer.'),
    H('The router picks 4 of 128, plus the shared expert','A 4,096 × 128 router scores 128 small experts and keeps the top 4; one shared expert runs for every token regardless. (Which experts, and the weights 0.34, 0.27, 0.22 and 0.17, are illustrative.)'),
    H('Five small experts run','Each expert is 3 × 4,096 × 2,048 = 25.2M parameters, a seventh of a Mixtral expert. Four routed plus one shared: 125.8M.'),
    H('124 experts sit idle','3,121M parameters of this layer are held but not read, against 1,057M idle in a Mixtral layer: fine-grained experts make the layer far sparser.'),
    H('The whole model: 119B stored, about 6B touched','36 layers × 3,275M + 1.07B of embeddings + a 0.43B vision encoder = 119.4B, Mistral\'s 119B. Per token: 36 × 154.4M = 5.56B in the layers, 6.1B with the output layer; Mistral says 6B, the model card 6.5B (the Weights and cache tab sums it every way). Ratio about 20, against Mixtral\'s 3.6.')]};
  const WIDE={W:660,H:330,tok:[16,120],at:[78,120],ro:[150,120],gx:[214,40],out:[600,120],bars:[16,262],horiz:true};
  const NAR={W:360,H:480,tok:[30,30],at:[30,84],ro:[30,150],gx:[24,200],out:[300,150],bars:[16,400],horiz:false};
  const st={m:'x7',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),lerp=(a,b,u)=>a+(b-a)*u;
  const T=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.w?' font-weight="600"':'')+'>'+s+'</text>';
  const G=(op,s)=>'<g opacity="'+(+op).toFixed(3)+'">'+s+'</g>';
  const side=p=>K*Math.sqrt(p);
  function layout(L,m){const d=D[m],sd=side(d.ex),gap=m==='s4'?2:6,cols=m==='s4'?16:m==='x7'?4:1;const cells=[];
    const n=d.E+d.sh;for(let i=0;i<n;i++){const c=i%cols,r=Math.floor(i/cols);cells.push([L.gx[0]+c*(sd+gap),L.gx[1]+r*(sd+gap)])}
    const rows=Math.ceil(n/cols);return {cells,sd,w:cols*(sd+gap)-gap,h:rows*(sd+gap)-gap}}
  function packets(a,b,u,col){let s='';for(let j=0;j<4;j++){const f=cl(u*1.6-j*.16);if(f<=0||f>=1)continue;s+='<circle cx="'+lerp(a[0],b[0],f).toFixed(1)+'" cy="'+lerp(a[1],b[1],f).toFixed(1)+'" r="2.8" fill="'+col+'" opacity="'+(1-Math.abs(f-.5)).toFixed(2)+'"/>'}return s}
  function draw(){
    const L=card.clientWidth<560?NAR:WIDE,k=st.k,m=st.m,d=D[m],e=RM?1:ease(cl(st.t/MOVE)),ph=RM?1:e;
    const cA='var(--acc)',cE='var(--c2)',cS='var(--c4)',cI='var(--dim)';let s='';
    const lay=layout(L,m),pick=PICK[m],wt=WT[m],sd=lay.sd;
    // grid placement depends on its size
    const gy=L.horiz?Math.max(28,L.tok[1]-lay.h/2):L.gx[1];lay.cells.forEach(c=>{c[1]+=gy-L.gx[1]});
    const tokC=[L.tok[0]+18,L.horiz?L.tok[1]:L.tok[1]];
    // token
    s+=G(1,'<rect x="'+L.tok[0]+'" y="'+(tokC[1]-14)+'" width="36" height="28" rx="5" fill="var(--acc2)" stroke="'+cA+'"/>'+T(tokC[0],tokC[1]+4,'token',{fs:10.5,a:'middle'}));
    // attention block, area to scale
    const as=side(d.attn),ax=L.horiz?L.at[0]:L.at[0]+60,ay=(L.horiz?L.at[1]:L.at[1]+12)-as/2,aOn=k>=1;
    s+='<rect x="'+ax+'" y="'+ay.toFixed(1)+'" width="'+as.toFixed(1)+'" height="'+as.toFixed(1)+'" rx="2" fill="'+(aOn?cA:'var(--soft)')+'" fill-opacity="'+(aOn?(k===1?.4+.5*e:.75):1)+'" stroke="'+cA+'"/>';
    s+=T(ax+as/2,ay-5,(m==='s4'?'MLA ':'attention ')+fmt(d.attn,1)+'M',{fs:10,a:'middle'});
    if(k===1&&!RM)s+=packets([tokC[0]+18,tokC[1]],[ax,ay+as/2],ph,cA);
    // router
    const rx=L.horiz?L.ro[0]:L.ro[0]+60,ry=L.horiz?L.ro[1]:L.ro[1]-8;
    if(m!=='d7'){s+=G(k>=2?1:.35,'<rect x="'+rx+'" y="'+(ry-11)+'" width="40" height="22" rx="4" fill="var(--soft)" stroke="var(--mute)"/>'+T(rx+20,ry+4,'router',{fs:10,a:'middle'}));
      if(k===2&&!RM)s+=packets([ax+as,ay+as/2],[rx,ry],ph,cA)}
    // output
    const ox=L.horiz?L.out[0]:L.out[0],oy=L.horiz?L.out[1]:L.out[1];
    if(k>=3){let o='<rect x="'+(ox-4)+'" y="'+(oy-14)+'" width="50" height="28" rx="5" fill="var(--acc2)" stroke="'+cA+'"/>'+T(ox+21,oy+4,m==='d7'?'output':'Σ w·E(x)',{fs:10.5,a:'middle'});
      if(m!=='d7'&&L.horiz)pick.concat(d.sh?[d.E]:[]).forEach(i=>{const c=lay.cells[i];o+='<line x1="'+(c[0]+sd).toFixed(1)+'" y1="'+(c[1]+sd/2).toFixed(1)+'" x2="'+(ox-4)+'" y2="'+oy+'" stroke="var(--mute)" stroke-width=".8" stroke-dasharray="3 2"/>'});
      s+=G(k===3?cl(e*1.5-.3):1,o)}
    // experts
    lay.cells.forEach((c,i)=>{const shared=i>=d.E,sel=shared||pick.indexOf(i)>=0;let fill='var(--soft)',op=1,stroke='var(--line)';
      if(k>=3&&sel){fill=shared?cS:cE;op=k===3?.35+.6*e:.85;stroke=fill}
      else if(k>=2&&sel){stroke=shared?cS:cE}
      if(k>=4&&!sel){fill=cI;op=k===4?1-.45*e:.55}
      if(m==='d7'&&k>=2){fill=cE;op=k===2?.35+.6*e:.85;stroke=cE}
      s+='<rect x="'+c[0].toFixed(1)+'" y="'+c[1].toFixed(1)+'" width="'+sd.toFixed(1)+'" height="'+sd.toFixed(1)+'" rx="'+(sd>20?3:1.5)+'" fill="'+fill+'" fill-opacity="'+op.toFixed(2)+'" stroke="'+stroke+'"'+(k>=2&&sel?' stroke-width="1.6"':'')+'/>';
      if(m==='x7'){const pi=pick.indexOf(i),wOn=k>=2&&pi>=0;s+=T(c[0]+sd/2,c[1]+sd/2+(wOn?-1:4),'E'+(i+1),{fs:10,a:'middle',c:k>=3&&sel?'var(--bg)':'var(--mute)'});
        if(wOn)s+=G(k===2?e:1,T(c[0]+sd/2,c[1]+sd/2+11,'w '+wt[pi].toFixed(2),{fs:9.5,a:'middle',c:k>=3?'var(--bg)':cE,w:1}))}
      if(m==='d7')s+=T(c[0]+sd/2,c[1]+sd/2+4,'FFN',{fs:10,a:'middle',c:k>=2?'var(--bg)':'var(--mute)'});
    });
    const gl=lay.cells[0];
    s+=T(gl[0],gl[1]-6,m==='d7'?'feed-forward network '+fmt(d.ex,1)+'M':m==='x7'?'8 experts × '+fmt(d.ex,1)+'M':'128 experts × '+fmt(d.ex,1)+'M, plus 1 shared (purple)',{fs:10});
    // router lines to chosen experts
    if(k>=2&&m!=='d7'){let ln='';pick.concat(d.sh?[d.E]:[]).forEach(i=>{const c=lay.cells[i];const to=[c[0]+sd/2,c[1]+sd/2];ln+='<line x1="'+(rx+40)+'" y1="'+ry+'" x2="'+to[0].toFixed(1)+'" y2="'+to[1].toFixed(1)+'" stroke="'+(i>=d.E?cS:cE)+'" stroke-width="1.2" opacity=".7"/>';if(k===3&&!RM)ln+=packets([rx+40,ry],to,ph,i>=d.E?cS:cE)});s+=G(k===2?e:1,ln)}
    if(m==='d7'&&k>=2){const c=lay.cells[0];s+=G(k===2?e:1,'<line x1="'+(ax+as)+'" y1="'+(ay+as/2)+'" x2="'+c[0]+'" y2="'+(c[1]+sd/2)+'" stroke="'+cE+'" stroke-width="1.2"/>');if(k===2&&!RM)s+=packets([ax+as,ay+as/2],[c[0],c[1]+sd/2],ph,cE)}
    if(k>=4&&m!=='d7'){const idle=(d.E-d.top)*d.ex;s+=G(k===4?e:1,T(gl[0],gl[1]+lay.h+(m==='x7'?28:16),'grey: '+(d.E-d.top)+' idle experts, '+fmt(idle,0)+'M stored, not read',{fs:10.5,c:'var(--mute)'}))}
    // to-scale bars: this layer, stored against touched; whole model in step 6
    const [bx0,by]=L.bars,lw=L.W<500?96:130,x0=bx0+lw,ww=L.W-14-x0;
    const stL=d.attn+d.router+(d.E+d.sh)*d.ex,tuL=d.attn+d.router+(d.top+d.sh)*d.ex;
    const whole=k===5,MAX=whole?(m==='x7'?58:m==='s4'?120:58):3275,sv=whole?d.tot:stL,tv=whole?(k===5?lerp(d.tot,d.act,m==='d7'?0:e):d.act):(k>=3?tuL:0);
    s+=T(bx0,by-8,whole?'Whole model, billions of parameters, to scale':'This layer, millions of parameters, to scale (max: a Small 4 layer)',{fs:11,c:'var(--mute)'});
    const row=(y,lab,v,col,txt)=>T(bx0,y+10,lab,{fs:10.5})+'<rect x="'+x0+'" y="'+y+'" width="'+ww+'" height="12" rx="2" fill="var(--soft)"/><rect x="'+x0+'" y="'+y+'" width="'+Math.max(v?1.5:0,ww*Math.min(1,v/MAX)).toFixed(1)+'" height="12" rx="2" fill="'+col+'"/>'+(x0+ww*Math.min(1,v/MAX)+70>L.W?T(x0+ww*Math.min(1,v/MAX)-4,y+10,txt,{fs:10.5,a:'end',c:'var(--bg)'}):T(x0+ww*v/MAX+5,y+10,txt,{fs:10.5}));
    s+=row(by,'stored (memory)',sv,'var(--mute)',whole?fmt(sv,1)+'B':fmt(sv,0)+'M');
    s+=row(by+20,'touched (compute)',tv,cE,whole?fmt(tv,1)+'B':fmt(tv,0)+'M');
    if(whole&&m==='x7')s+=G(e,row(by+40,'"8 × 7B" misread',8*7.242,'var(--bad)','8 × 7.24B = 57.9B'));
    $('moeSvg').innerHTML=svgEl(L.W,L.H,s,d.name+': one token through one layer, step '+(k+1));
    if(st.lk!==k||st.lm!==m){const S=CAP[m][k];$('moeStep').innerHTML='Step '+(k+1)+' of 6: '+S.t;$('moeCap').innerHTML=S.c;st.lk=k;st.lm=m}
    $('moeCnt').innerHTML=stat('Stored in this layer',fmt(stL,1)+'M','attention + router + '+(d.E+d.sh)+(d.E+d.sh>1?' experts':' FFN'))+stat('Touched by this token',(k>=3?fmt(tuL,1):k>=1?fmt(d.attn+(k>=2?d.router:0),1):'0')+'M',k>=3?'attention + router + '+(d.top+d.sh)+(d.top+d.sh>1?' experts':' FFN'):'so far')+stat('Whole model',fmt(d.tot,1)+'B stored',(m==='s4'?'≈ ':'')+fmt(d.act,1)+'B touched per token')+stat('Sparsity ratio r',(d.tot/d.act).toFixed(1),'total ÷ active');
    const sc=$('moeScrub');sc.max=600;sc.value=Math.round((k+st.t)*100);
    const pb=$('moePlay'),end=k===5&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<5){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('moePlay').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===5&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<5){st.k++;st.t=0}st.play=true;st.last=0;kick()}draw()});
  $('moeFwd').addEventListener('click',()=>{pause();st.k=Math.min(5,st.k+1);st.t=1;draw()});
  $('moeBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('moeScrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(5,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('moeSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('moeM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
