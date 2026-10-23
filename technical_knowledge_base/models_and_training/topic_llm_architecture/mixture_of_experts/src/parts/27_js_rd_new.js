// ---- Reading visuals added on 2026-10-23: the hero (one recorded token through one MoE layer), the dense-twin stepper
// (moved from the root's Config calculator), the fine-grained figure, the expert-parallel stepper (recorded counts) and
// the decode-reads slider. Nothing moves until the reader steps or presses play. ----
(function(){
  const M=window.MX;if(!M||!window.RD)return;const {D,$,f,pct,tx,svg,esc,EC}=M;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(o.rx===undefined?4:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!==undefined?' fill-opacity="'+o.op+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.2)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!==undefined?' stroke-opacity="'+o.op+'"':'')+'/>'};
  const G=n=>n>=1e12?f(n/1e12,2)+'T':n>=1e9?f(n/1e9,2)+'B':n>=1e6?f(n/1e6,1)+'M':f(n,0);
  const GB=b=>b>=1e12?f(b/1e12,2)+' TB':b>=1e9?f(b/1e9,1)+' GB':f(b/1e6,1)+' MB';
  const FL=n=>n>=1e12?f(n/1e12,2)+' TFLOP':n>=1e9?f(n/1e9,1)+' GFLOP':f(n/1e6,1)+' MFLOP';

  // 1. hero: token 1 ("Once"), layer 1, moe8top2, recorded logits ------------------------------------------------------
  if($('mx-hero')&&D.runs.moe8&&D.runs.moe8.seq){
    const lg=D.runs.moe8.seq.logits8[0][0],E=lg.length,mx=Math.max(...lg),Z=lg.reduce((a,v)=>a+Math.exp(v-mx),0);
    const p=lg.map(v=>Math.exp(v-mx)/Z),top=[...p.keys()].sort((a,b)=>p[b]-p[a]).slice(0,2),sp=top.reduce((a,i)=>a+p[i],0),g=top.map(i=>p[i]/sp);
    function draw(){const el=$('mx-hero-svg'),W=M.width(el),nar=W<560,pl=nar?6:150,cw=(W-pl-6)/E,H=nar?300:262;let s='';
      const yT=8,yR=nar?62:56,yE=nar?140:124,yC=nar?236:204;
      // token
      s+=box(pl+((W-pl)/2)-95,yT,190,30,{fill:'var(--bg)',stroke:'var(--ink)'})+tx(pl+(W-pl)/2-6,yT+19,'token h: "Once" (256 numbers)',{a:'middle',fs:11.5,w:600});
      // router scores
      if(!nar)s+=tx(pl-10,yR+12,'router Wᵣh',{a:'end',fs:11.5,w:600})+tx(pl-10,yR+27,'softmax over 8',{a:'end',fs:10.5,fill:'var(--mute)'});
      else s+=tx(6,yR-8,'router: one softmax score per expert',{fs:11,w:600});
      for(let i=0;i<E;i++){const x=pl+i*cw+2,on=top.includes(i),bh=34*p[i]/Math.max(...p);
        s+=box(x,yR,cw-4,36,{fill:'var(--bg)'})+box(x+2,yR+36-bh-1,cw-8,bh,{fill:EC[i],op:on?0.95:0.3,rx:2,stroke:'none'})+tx(x+(cw-4)/2,yR+50,f(p[i],2),{a:'middle',fs:10.5,fill:on?'var(--ink)':'var(--mute)',w:on?600:400});
        s+=line(pl+(W-pl)/2,yT+30,x+(cw-4)/2,yR,{op:0.35})}
      // experts
      if(!nar)s+=tx(pl-10,yE+16,'8 experts',{a:'end',fs:11.5,w:600})+tx(pl-10,yE+31,'262,144 weights each',{a:'end',fs:10.5,fill:'var(--mute)'});
      else s+=tx(6,yE-8,'8 experts, all in memory; 2 computed',{fs:11,w:600});
      for(let i=0;i<E;i++){const x=pl+i*cw+2,on=top.includes(i),gi=top.indexOf(i);
        s+=box(x,yE,cw-4,40,{fill:on?'var(--acc2)':'var(--soft)',stroke:on?'var(--acc)':'var(--line)',sw:on?2:1})+tx(x+(cw-4)/2,yE+17,'E'+i,{a:'middle',fs:11,w:on?600:400,fill:on?'var(--ink)':'var(--mute)'})+tx(x+(cw-4)/2,yE+32,on?'g '+f(g[gi],2):'idle',{a:'middle',fs:10.5,fill:on?'var(--ink)':'var(--mute)'});
        if(on)s+=line(x+(cw-4)/2,yR+54,x+(cw-4)/2,yE,{c:'var(--acc)',w:2})}
      // brackets: stored vs computed
      const by=yE+50;s+=line(pl+2,by,W-8,by,{c:'var(--mute)'})+line(pl+2,by-4,pl+2,by+4)+line(W-8,by-4,W-8,by+4)+tx(pl+(W-pl)/2,by+14,'stored (memory): all 8 = 2,097,152 weights per layer',{a:'middle',fs:nar?10.5:11,fill:'var(--mute)'});
      // combine
      const cx=pl+(W-pl)/2;top.forEach(i=>{s+=line(pl+i*cw+cw/2,yE+40,cx,yC,{c:'var(--acc)',w:1.6,op:0.8})});
      const lab='y = h + '+f(g[0],2)+' · E'+top[0]+'(h) + '+f(g[1],2)+' · E'+top[1]+'(h)';
      s+=box(cx-(nar?150:170),yC,nar?300:340,30,{fill:'var(--bg)',stroke:'var(--acc)',sw:1.5})+tx(cx,yC+19,lab,{a:'middle',fs:nar?11:12,w:600});
      s+=tx(cx,yC+46,'computed: 2 experts = 524,288 weights, the dense FFN\'s cost',{a:'middle',fs:nar?10.5:11,fill:'var(--mute)'});
      el.innerHTML=svg(W,H,s,'One token routed to 2 of 8 experts')}
    RD.onRender(draw);RD.onResize(draw);draw();
  }

  // 2. dense twin stepper (the root's Config calculator idea, on this page's configs) -----------------------------------
  if($('mx-twin')&&window.CC&&D.cc){
    const CC=window.CC,WB=2;
    const models=D.cc.filter(m=>{try{const s=CC.normalise(m.cfg);return s.layers.some(l=>l.ffn&&(l.ffn.t==='moe'||l.ffn.t==='glu'))}catch(e){return false}});
    let key=models.some(m=>m.key==='mixtral-8x7b')?'mixtral-8x7b':models[0].key;
    $('mx-twin-m').innerHTML=models.map(m=>'<option value="'+m.key+'"'+(m.key===key?' selected':'')+'>'+esc(m.label)+'</option>').join('');
    function twins(sp){
      const moeL=sp.layers.some(l=>l.ffn&&l.ffn.t==='moe');
      if(moeL){const dense=Object.assign({},sp,{layers:sp.layers.map(l=>l.ffn&&l.ffn.t==='moe'?Object.assign({},l,{ffn:{t:'glu',ff:l.ffn.k*l.ffn.ff+l.ffn.sff,bias:false}}):l)});
        const fz=sp.layers.find(l=>l.ffn&&l.ffn.t==='moe').ffn;return {dense,moe:sp,E:fz.E,k:fz.k,made:'from'}}
      const moe=Object.assign({},sp,{layers:sp.layers.map(l=>l.ffn&&l.ffn.t==='glu'?Object.assign({},l,{ffn:{t:'moe',E:8,k:2,ff:l.ffn.ff/2,sff:0,sgate:false,rbias:false,cbias:false,ebias:false}}):l)});
      return {dense:sp,moe,E:8,k:2,made:'to'}}
    function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
    function union(E,k,B){const r=rng(12345+E*7+k),hit=new Set();for(let b=0;b<B;b++){const ch=new Set();while(ch.size<k)ch.add(Math.floor(r()*E));ch.forEach(e=>hit.add(e))}return hit}
    const NS=6;
    function draw(i){
      const m=models.find(x=>x.key===key),T=twins(CC.normalise(m.cfg)),pd=CC.params(T.dense),pm=CC.params(T.moe);
      const Bs=i>=5?64:i>=4?8:1,frac=1-Math.pow(1-T.k/T.E,Bs),routed=pm.breakdown.moe_routed,shown=i>=1?pm:pd;
      const readM=i>=1?(pm.total-routed+routed*(Bs===1?T.k/T.E:frac))*WB:pd.total*WB;
      const rows=[['Total parameters',pd.total,shown.total,G],['Active parameters per token',pd.active,shown.active,G],['FLOPs per token (weights)',2*pd.matmul_active,2*shown.matmul_active,FL],
        ['Weight memory (BF16)',pd.total*WB,shown.total*WB,GB],['Weights read per decode step, batch '+Bs,pd.total*WB,readM,GB]];
      let h='';rows.forEach(([nm,a,b,fm],j)=>{const mx=Math.max(a,b),hl=(i===1&&j<2)||(i===2&&j===2)||(i===3&&j===3)||(i>=4&&j===4);
        h+='<div class="bars"><div class="tw-mt'+(hl?' on':'')+'">'+nm+'</div>'+
          '<div class="row"><span class="nm mute">dense twin</span><span class="track"><span class="fill" style="width:'+(100*a/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+fm(a)+'</span></div>'+
          '<div class="row"><span class="nm mute">MoE</span><span class="track"><span class="fill" style="width:'+(100*b/mx).toFixed(1)+'%;background:var(--c2)"></span></span><span class="val">'+fm(b)+'</span></div></div>'});
      $('mx-twin-bars').innerHTML=h;
      const E=T.E,grid=$('mx-twin-grid');let cols=E<=16?E:0;if(!cols)for(const c of [32,24,20,16,12,10,8])if(E%c===0&&E/c>=c/4){cols=c;break}if(!cols)cols=Math.ceil(Math.sqrt(E*2));
      grid.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';grid.style.maxWidth=Math.min(560,cols*22)+'px';
      const hit=Bs>1?union(E,T.k,Bs):null;let g='';
      for(let e=0;e<E;e++){const exists=i>=1||e<T.k,on=e<T.k;g+='<span'+(!exists?' style="visibility:hidden"':'')+' class="'+(hit?(hit.has(e)?'hit':''):(on?'on':''))+'"></span>'}
      grid.innerHTML=g;
      $('mx-twin-lab').textContent=hit?('Experts of one layer touched by a batch of '+Bs+' sequences (uniform routing, illustrative): '+hit.size+' of '+E):('Experts of one layer: '+E+(i>=1?', the '+T.k+' this token uses lit':' (only the '+T.k+' slices of the twin exist yet)'));
      const nm=esc(m.label),caps=[
        ['The dense twin','The dense twin '+(T.made==='from'?'of '+nm+': each MoE layer replaced by one FFN as wide as the '+T.k+' routed experts plus the shared ones a token uses.':'is '+nm+' itself; read each FFN as '+T.k+' slices side by side.')+' Same active parameters, same FLOPs per token.'],
        ['Add the other '+(E-T.k)+' experts','Total parameters grow from '+G(pd.total)+' to '+G(pm.total)+' ('+f(pm.total/pd.total,1)+'&times;); a token still runs through only '+T.k+', so active parameters stay at '+G(pm.active)+'.'],
        ['FLOPs barely move','The only new compute is the router, one '+f(T.moe.d,0)+' &times; '+E+' matrix per layer ('+G(pm.breakdown.router)+' parameters in all). Capacity went up '+f(pm.total/pd.total,1)+'&times; at almost the same compute: the reason MoE exists.'],
        ['The bill is memory','Every expert must be loaded, '+GB(pm.total*WB)+' against '+GB(pd.total*WB)+' for the twin, whichever experts a token picks.'],
        ['Batch 8: more experts read','Decode reads weights from memory every step. With 8 sequences each picking '+T.k+', about '+Math.round(E*(1-Math.pow(1-T.k/E,8)))+' of '+E+' experts per layer are needed (uniform routing), so the step reads '+GB(readM)+'.'],
        ['Batch 64: nearly all of them','About '+Math.round(E*frac)+' of '+E+' experts per layer are touched: the step reads '+GB(readM)+', '+f(readM/(pd.total*WB),1)+'&times; the dense twin. MoE saves FLOPs at every batch size but memory bandwidth only at small batches (section 8).']];
      $('mx-twin-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+NS+': '+caps[i][0]+'</div><p>'+caps[i][1]+'</p>';
    }
    const A=RD.anim({card:'mx-twin',ctl:'mx-twin-ctl',n:NS,ms:2600,label:'MoE step',draw});
    $('mx-twin-m').addEventListener('change',e=>{key=e.target.value;A.reset(NS)});
  }

  // 3. fine-grained and shared, drawn at equal compute ---------------------------------------------------------------------
  if($('mx-fg')){
    const pick=(run,k)=>{const r=D.runs[run];if(!r||!r.seq)return [];return r.seq.top[0].slice(k,2*k).split('').map(c=>parseInt(c,16))};
    const p8=pick('moe8',2),p16=pick('moe16s',3),pB=[1,6,9,14];
    function draw(){const el=$('mx-fg-svg'),W=M.width(el),nar=W<560,pl=6,gap=2,avail=W-pl-8,u=Math.min(34,(avail-21*gap)/17),rh=nar?34:30;let s='',y=4;
      const rows=[['8 experts, top 2: C(8, 2) = 28 sets',8,2,p8,false],['16 experts, top 4: C(16, 4) = 1,820 sets',16,1,pB,false],['16 + 1 shared, top 3: C(16, 3) = 560 routed sets',16,1,p16,true]];
      rows.forEach(([lab,n,wm,lit,sh])=>{s+=tx(pl,y+12,lab,{fs:11.5,w:600});y+=18;let x=pl;
        for(let i=0;i<n;i++){const w=u*wm+(wm-1)*gap,on=lit.includes(i);s+=box(x,y,w,rh-8,{fill:on?'var(--acc)':'var(--dim)',stroke:'none',rx:2});x+=w+gap}
        if(sh){x+=gap*2;s+=box(x,y,u,rh-8,{fill:'var(--good)',stroke:'none',rx:2})+tx(x+u/2,y+rh+4,'shared',{a:'middle',fs:10.5,fill:'var(--mute)'})}
        y+=rh+(sh?8:2)});
      if(nar){s+=tx(pl,y+8,'filled: computed for one token, same area in each row;',{fs:10.5,fill:'var(--mute)'})+tx(pl,y+22,'box width = expert hidden size',{fs:10.5,fill:'var(--mute)'});y+=14}
      else s+=tx(pl,y+8,'filled: computed for one token, the same area in every row; box width = expert hidden size',{fs:10.5,fill:'var(--mute)'});
      el.innerHTML=svg(W,y+14,s,'Fine-grained and shared experts at equal compute')}
    RD.onRender(draw);RD.onResize(draw);draw();
  }

  // 4. expert parallelism over four ranks, recorded counts -------------------------------------------------------------------
  if($('ep-anim')&&D.ep){
    const ep=D.ep,Wn=ep.world,S=ep.send_matrix,recv=[...Array(Wn).keys()].map(r=>S.reduce((a,row)=>a+row[r],0)),sent=S.map(r=>r.reduce((a,b)=>a+b,0));
    const mean=recv.reduce((a,b)=>a+b,0)/Wn,busy=Math.max(...recv),RC=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
    const STEPS=[['Four ranks, '+ep.tokens_per_rank+' tokens each','Each rank holds '+ep.experts_per_rank+' of the layer\'s '+ep.experts+' experts and a copy of the router; attention ran before this on each rank\'s own tokens.'],
      ['Route locally','Each rank runs its router on its own tokens: '+ep.tokens_per_rank+' tokens &times; top '+ep.top_k+' = '+sent[0]+' assignments per rank, coloured by the rank that owns the chosen expert.'],
      ['Exchange counts','A small all-to-all of '+Wn+' integers per rank tells every rank how many rows it will receive from each other rank (the matrix).'],
      ['Dispatch: the all-to-all','Each assignment sends the token\'s hidden state ('+ep.d_model+' numbers) to the expert\'s rank; line width is the count. '+Math.round(100*ep.local_copies.reduce((a,b)=>a+b,0)/sent.reduce((a,b)=>a+b,0))+'% of copies stay home (dashed).'],
      ['Compute: receives are uneven','Ranks receive '+Math.min(...recv)+' to '+busy+' rows against a mean of '+f(mean,0)+': the busiest does '+f(busy/mean,2)+' times the mean expert work, and everyone waits for it.'],
      ['Combine: the reverse all-to-all','Outputs go home and are weighted by the gates. The distributed layer equals the one-process layer '+(ep.max_abs_diff_vs_one_process===0?'bit for bit (maximum difference 0.0).':'to '+ep.max_abs_diff_vs_one_process+'.')]];
    function draw(i){const el=$('ep-svg'),W=M.width(el),nar=W<520,H=nar?264:250,bw=(W-20)/Wn,yT=8,yB=H-74,bh=34;let s='';
      for(let r=0;r<Wn;r++){const x=10+r*bw+4;
        s+=box(x,yT,bw-8,bh,{fill:'var(--bg)',stroke:RC[r],sw:1.6})+tx(x+(bw-8)/2,yT+14,'rank '+r,{a:'middle',fs:11,w:600})+tx(x+(bw-8)/2,yT+28,'E'+(2*r)+', E'+(2*r+1),{a:'middle',fs:10.5,fill:'var(--mute)'});
        if(i>=1){let xx=x;S[r].forEach((c,d)=>{const w=(bw-8)*c/sent[r];s+=box(xx,yT+bh+3,w,7,{fill:RC[d],stroke:'none',rx:1});xx+=w})}
        s+=box(x,yB,bw-8,bh,{fill:i>=4&&recv[r]===busy?'var(--acc2)':'var(--bg)',stroke:RC[r],sw:1.6})+tx(x+(bw-8)/2,yB+14,'rank '+r+(nar?'':' experts'),{a:'middle',fs:11,w:600})+tx(x+(bw-8)/2,yB+28,i>=4?'receives '+recv[r]:i>=5?'':'',{a:'middle',fs:10.5,fill:i>=4&&recv[r]===busy?'var(--ink)':'var(--mute)',w:i>=4&&recv[r]===busy?600:400});
        if(i>=4){s+=box(x,yB+bh+4,(bw-8)*recv[r]/busy,8,{fill:RC[r],stroke:'none',rx:1})}}
      if(i>=4){for(let r=0;r<Wn;r++){const x=10+r*bw+4+(bw-8)*mean/busy;s+=line(x,yB+bh+1,x,yB+bh+15,{c:'var(--ink)',dash:'2 2'})}s+=tx(W/2,H-4,'bars: rows received; dashed tick: the mean, '+f(mean,0),{a:'middle',fs:10.5,fill:'var(--mute)'})}
      if(i===2){const cy=yT+bh+24,ch=(yB-cy-6)/(Wn+1);s+=tx(W/2,cy,'rows each rank sends to each rank',{a:'middle',fs:10.5,fill:'var(--mute)'});
        for(let a=0;a<Wn;a++)for(let b=0;b<Wn;b++){const x=10+b*bw+bw/2,y=cy+ch*(a+1)+4;s+=tx(x,y,(nar?'':'r'+a+'→ ')+S[a][b],{a:'middle',fs:10.5,fill:RC[a],w:a===b?600:400})}}
      if(i===3||i===5){const mxc=Math.max(...S.flat());for(let a=0;a<Wn;a++)for(let b=0;b<Wn;b++){const xa=10+a*bw+bw/2+(b-1.5)*4,xb=10+b*bw+bw/2+(a-1.5)*4;
        const [x1,y1,x2,y2]=i===3?[xa,yT+bh+12,xb,yB]:[xb,yB,xa,yT+bh+12];s+=line(x1,y1,x2,y2,{c:RC[i===3?b:a],w:0.6+4*S[a][b]/mxc,op:0.75,dash:a===b?'4 3':''})}
        if(i===3)for(let b=0;b<Wn;b++)s+=tx(10+b*bw+bw/2,yB-5,'+'+recv[b],{a:'middle',fs:10.5,fill:'var(--mute)'})}
      el.innerHTML=svg(W,H,s,'Expert-parallel dispatch over four ranks');
      $('ep-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+STEPS[i][0]+'</div><p>'+STEPS[i][1]+'</p>'}
    const A=RD.anim({card:'ep-anim',ctl:'ep-ctl',n:STEPS.length,ms:2200,label:'Expert-parallel step',draw});RD.onResize(()=>A.redraw());
  }

  // 5. decode: experts touched against batch (DeepSeek-V3: E = 256, k = 8) ------------------------------------------------------
  if($('mx-dec')){
    const E=256,k=8,BS=[1,2,4,8,16,32,64,128,256,512,1024];
    function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
    const grid=$('mx-dec-grid');grid.style.gridTemplateColumns='repeat(32,minmax(0,1fr))';grid.style.maxWidth='560px';
    function draw(){const B=BS[+$('mx-dec-b').value],ex=E*(1-Math.pow(1-k/E,B)),r=rng(777),hit=new Set();
      for(let b=0;b<B;b++){const ch=new Set();while(ch.size<k)ch.add(Math.floor(r()*E));ch.forEach(e=>hit.add(e))}
      let g='';for(let e=0;e<E;e++)g+='<span class="'+(hit.has(e)?'hit':'')+'"></span>';grid.innerHTML=g;
      $('mx-dec-bv').textContent=B;
      $('mx-dec-out').innerHTML=RD.stat('Experts touched per layer (expected)',f(ex,ex<10?1:0)+' of 256',pct(ex/E,0)+' of the routed weights read')+
        RD.stat('Tokens per touched expert',f(B*k/ex,1),'B &middot; k / experts touched')+RD.stat('This draw',hit.size+' lit','one seeded random draw, illustrative')}
    $('mx-dec-b').addEventListener('input',draw);draw();
  }
})();
