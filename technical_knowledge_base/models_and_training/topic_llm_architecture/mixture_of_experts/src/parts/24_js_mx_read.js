// ---- Reading tab visuals: drawn-to-scale experts, one real token through both router rules, loads after training,
// the capacity sweep, dense vs MoE curves and table, the real-config table, and the predict drills ----
(function(){
  const M=window.MX;if(!M||!window.RD)return;const {D,$,f,pct,tx,svg,esc,EC,RC}=M;
  M.drills();
  // 1. drawn to scale -------------------------------------------------------------------------------------------
  if($('mx-scale')){
    let mode='dense';
    const pick=run=>{const r=D.runs[run];if(!r||!r.seq)return [];const k=r.seq.k;return r.seq.top[0].slice(k,2*k).split('').map(c=>parseInt(c,16))};
    function draw(){
      const el=$('mx-scale-svg'),W=M.width(el),nar=W<520;let s='',H,cap;
      const sq=nar?7:9,g=1.5;
      if(mode==='ds'){const per=nar?19:33,rows=Math.ceil(257/per),u=Math.min(sq+4,(W-20)/per-2);H=rows*(u+2)+14;
        const lit=[3,17,40,77,120,150,201,233];
        for(let i=0;i<257;i++){const x=10+(i%per)*(u+2),y=10+Math.floor(i/per)*(u+2),sh=i===256,on=sh||lit.includes(i);
          s+='<rect x="'+x+'" y="'+y+'" width="'+u+'" height="'+u+'" rx="1.5" fill="'+(sh?'var(--good)':on?'var(--acc)':'var(--dim)')+'"/>'}
        
        cap='<b>Scale: one square = one expert (44,040,192 weights); green: the shared expert; blue: 8 routed (an illustrative choice).</b> DeepSeek-V3, one MoE layer, drawn at a different scale: 257 experts of 3 &times; 7,168 &times; 2,048 weights each (11.32 billion with the router), of which a token uses 9 (396 million, 3.5%). The router itself (256 &times; 7,168) would be 1/24 of one square.';
      }else{
        const groups=mode==='dense'?[{n:16,on:true}]:mode==='m8'?Array.from({length:8},(_,i)=>({n:8,on:pick('moe8').includes(i)})):
          Array.from({length:17},(_,i)=>({n:4,on:i===16||pick('moe16s').includes(i),sh:i===16}));
        const cols=mode==='dense'?16:mode==='m8'?4:2,gw=cols*(sq+g)+8;const perRow=Math.max(1,Math.floor((W-20)/gw));
        const rowsPer=n=>Math.ceil(n/cols);const gh=rowsPer(groups[0].n)*(sq+g)+20;
        H=Math.ceil(groups.length/perRow)*gh+10;
        groups.forEach((G,j)=>{const gx=10+(j%perRow)*gw,gy=8+Math.floor(j/perRow)*gh;
          for(let i=0;i<G.n;i++){const x=gx+(i%cols)*(sq+g),y=gy+Math.floor(i/cols)*(sq+g);
            s+='<rect x="'+x+'" y="'+y+'" width="'+sq+'" height="'+sq+'" rx="1" fill="'+(G.sh?'var(--good)':G.on?'var(--acc)':'var(--dim)')+'"/>'}
          if(groups.length>1)s+=tx(gx,gy+rowsPer(G.n)*(sq+g)+11,G.sh?'shared':'E'+j,{fs:10.5,fill:G.on?'var(--ink)':'var(--mute)'})});
        
        cap=mode==='dense'?'Dense FFN of the tiny GPT: 524,288 weights per layer (16 squares), all used by every token.':
          mode==='m8'?'moe8top2: 8 experts of 262,144 weights (8 squares each) stored, 2 used: the same 16 squares of compute, 4 times the storage. The two experts lit are the ones the trained model actually chose for "Once" in layer 1.':
          'moe16top3_shared: 16 routed experts of 131,072 (4 squares) plus 1 shared, 3 routed + the shared one used: again 16 squares of compute, 4.25 times the storage, and C(16, 3) = 560 possible routed sets instead of C(8, 2) = 28.';
      }
      el.innerHTML=svg(W,H,s,'Expert weights drawn to scale');$('mx-scale-cap').innerHTML=(mode==='ds'?'':'<b>Scale: one square = 32,768 weights; coloured: used by token 1 of the running sequence ("Once") in layer 1.</b> ')+cap}
    RD.seg($('mx-scale-m'),m=>{mode=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
  }
  // 2. one real token through softmax and sigmoid ---------------------------------------------------------------
  if($('mx-rc')&&D.runs.moe8&&D.runs.moe8.seq){
    const LG=D.runs.moe8.seq.logits8,X=[0,8,24,56,248];const st={t:0,l:0,x:0};
    $('mx-rc-ctl').innerHTML='<label>Token <select id="mx-rc-t">'+[1,2,3,4,5,6,7,8].map((p,i)=>'<option value="'+i+'">'+i+': '+M.show(M.piece(p))+'</option>').join('')+'</select></label>'+
      '<label>Layer <select id="mx-rc-l">'+LG.map((_,i)=>'<option value="'+i+'">'+(i+1)+'</option>').join('')+'</select></label>'+
      '<label>Extra experts with logit 0 <b id="mx-rc-xv"></b><input type="range" id="mx-rc-x" min="0" max="4" step="1" value="0"></label>';
    function draw(){const s=LG[st.l][st.t],E=s.length,extra=X[st.x];
      const mx=Math.max(...s,0),Z=s.reduce((a,v)=>a+Math.exp(v-mx),0)+extra*Math.exp(-mx);
      const p=s.map(v=>Math.exp(v-mx)/Z),sg=s.map(v=>1/(1+Math.exp(-v)));
      const ord=[...s.keys()].sort((a,b)=>s[b]-s[a]),top=ord.slice(0,2);
      const sp=top.reduce((a,i)=>a+p[i],0),ss=top.reduce((a,i)=>a+sg[i],0);
      const el=$('mx-rc-svg'),W=M.width(el),nar=W<520,H=nar?220:200,pl=30,pt=22,pb=24,gw=(W-pl-6)/2,ch=H-pt-pb;let o='';
      [['Softmax p, then gate',p,top.map(i=>p[i]/sp)],['Sigmoid, then gate',sg,top.map(i=>sg[i]/ss)]].forEach(([ti,v,g],j)=>{const x0=pl+j*gw,bw=(gw-10)/E;
        o+=tx(x0+gw/2,13,ti,{a:'middle',fs:11.5,w:600});
        [0,.5,1].forEach(t=>{const y=pt+ch*(1-t);o+='<line x1="'+x0+'" x2="'+(x0+gw-8)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+(j===0?tx(pl-4,y+4,t,{a:'end',fs:10,fill:'var(--mute)'}):'')});
        for(let i=0;i<E;i++){const x=x0+2+i*bw,on=top.includes(i),gi=top.indexOf(i);
          o+='<rect x="'+x.toFixed(1)+'" y="'+(pt+ch*(1-v[i])).toFixed(1)+'" width="'+(bw*0.5).toFixed(1)+'" height="'+(ch*v[i]).toFixed(1)+'" fill="'+EC[i]+'" fill-opacity="'+(on?0.95:0.3)+'"><title>E'+i+' score '+f(v[i],3)+'</title></rect>';
          if(on)o+='<rect x="'+(x+bw*0.5).toFixed(1)+'" y="'+(pt+ch*(1-g[gi])).toFixed(1)+'" width="'+(bw*0.4).toFixed(1)+'" height="'+(ch*g[gi]).toFixed(1)+'" fill="none" stroke="'+EC[i]+'" stroke-width="2"><title>gate '+f(g[gi],3)+'</title></rect>';
          o+=tx(x+bw*0.45,H-pb+14,(nar?'':'E')+i,{a:'middle',fs:10.5,fill:on?'var(--ink)':'var(--mute)'})}});
      el.innerHTML=svg(W,H,o,'Softmax and sigmoid scores for one token')+'<p class="small mute" style="margin:2px 0">Filled bars: scores before selection; outlined: the two gate weights after renormalisation. Logits recorded from the trained moe8top2 model (layer '+(st.l+1)+').</p>';
      $('mx-rc-xv').textContent=extra?'+'+extra+' ('+(E+extra)+' experts)':'none';
      const gs=top.map(i=>p[i]/sp),gg=top.map(i=>sg[i]/ss);
      $('mx-rc-out').innerHTML=RD.stat('Chosen (both rules)','E'+top.join(' + E'),'logits '+top.map(i=>f(s[i],2)).join(' and '))+
        RD.stat('Softmax gates',gs.map(v=>f(v,3)).join(', '),'ratio '+f(gs[0]/gs[1],2)+' : 1')+RD.stat('Sigmoid gates',gg.map(v=>f(v,3)).join(', '),'ratio '+f(gg[0]/gg[1],2)+' : 1')+
        RD.stat('Top expert score, '+(E+extra)+' experts','p '+f(p[top[0]],3)+' / &sigma; '+f(sg[top[0]],3),extra?'softmax diluted, sigmoid unchanged':'add experts to dilute the softmax')}
    $('mx-rc-t').addEventListener('change',e=>{st.t=+e.target.value;draw()});$('mx-rc-l').addEventListener('change',e=>{st.l=+e.target.value;draw()});
    $('mx-rc-x').addEventListener('input',e=>{st.x=+e.target.value;draw()});RD.onRender(draw);RD.onResize(draw);draw();
  }
  // 3. loads after training, per layer, for the balancing schemes -------------------------------------------------
  if($('mx-bal')){
    const keys=['none','moe8','bias','sbias'].filter(k=>D.runs[k]&&D.runs[k].heldout&&D.runs[k].heldout.share);let cur=keys.includes('none')?'none':keys[0];
    if(cur){M.seg($('mx-bal-m'),keys.map(k=>[k,D.runs[k].short]),cur,m=>{cur=m;draw()});
    function draw(){const r=D.runs[cur],sh=r.heldout.share,L=sh.length,E=sh[0].length,el=$('mx-bal-svg'),W=M.width(el),nar=W<520;
      const pl=30,pt=8,pb=34,H=nar?200:220,gw=(W-pl-4)/L,bw=(gw-8)/E,ymax=Math.max(0.5,Math.ceil(Math.max(...sh.flat())*10)/10);let s='';
      const Y=v=>pt+(H-pt-pb)*(1-v/ymax);
      [0,ymax/2,ymax].forEach(v=>{s+='<line x1="'+pl+'" x2="'+W+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+tx(pl-3,Y(v)+4,f(v,2),{a:'end',fs:10,fill:'var(--mute)'})});
      sh.forEach((l,j)=>{const x0=pl+j*gw+4;l.forEach((v,i)=>{s+='<rect x="'+(x0+i*bw).toFixed(1)+'" y="'+Y(v).toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+(Y(0)-Y(v)).toFixed(1)+'" fill="'+EC[i]+'"><title>layer '+(j+1)+' E'+i+': '+pct(v)+'</title></rect>'});
        s+='<line x1="'+x0+'" x2="'+(x0+E*bw)+'" y1="'+Y(1/E)+'" y2="'+Y(1/E)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
        s+=tx(x0+E*bw/2,H-pb+14,(nar?'L':'layer ')+(j+1),{a:'middle',fs:10.5,fill:'var(--mute)'})+tx(x0+E*bw/2,H-pb+27,(nar?'':'MaxVio ')+f(r.heldout.maxvio[j],2),{a:'middle',fs:10,fill:'var(--mute)'})});
      el.innerHTML=svg(W,H,s,'Expert load per layer');
      $('mx-bal-cap').innerHTML='<b>'+esc(r.label)+'</b>: held-out loss '+f(r.heldout.loss,3)+', MaxVio averaged over layers '+f(r.heldout.maxvio.reduce((a,b)=>a+b,0)/L,2)+' (perfect balance 0; with top 2 the ceiling is 3, one expert in every token\'s pair).'}
    RD.onRender(draw);RD.onResize(draw);draw()}
  }
  // 4. capacity sweep at inference -------------------------------------------------------------------------------
  if($('mx-cf')){
    const keys=['moe8','cap1','none','moe16s'].filter(k=>D.runs[k]&&D.runs[k].iv);let met='loss';
    if(keys.length){M.seg($('mx-cf-m'),[['loss','held-out loss'],['drop','assignments dropped']],met,m=>{met=m;draw()});
    const CF=['0.5','0.75','1.0','1.25','1.5','2.0','None'];
    function draw(){const se=keys.map(k=>({name:D.runs[k].short,color:RC[k],dots:true,pts:CF.map((c,i)=>[i,D.runs[k].iv.cf[c][met]])}));
      M.lines($('mx-cf-svg'),se,{x0:0,x1:6,xt:[0,1,2,3,4,5,6],xf:i=>CF[i]==='None'?'dropless':CF[i],xl:'capacity factor at inference',yd:met==='loss'?2:2,y0:met==='drop'?0:undefined,label:'Loss against capacity factor'});
      const m=D.runs.moe8.iv.cf;$('mx-cf-cap').innerHTML='moe8top2: dropless '+f(m.None.loss,3)+'; CF 1.25 '+f(m['1.25'].loss,3)+' ('+pct(m['1.25'].drop)+' of assignments dropped); CF 1.0 '+f(m['1.0'].loss,3)+' ('+pct(m['1.0'].drop)+'); CF 0.5 '+f(m['0.5'].loss,3)+' ('+pct(m['0.5'].drop)+').'}
    M.onTab('t-read',draw);RD.onRender(draw);draw()}
  }
  // 5. dense vs MoE curves and table --------------------------------------------------------------------------------
  if($('mx-cmp')){
    const keys=['dense','moe8','moe16s','bias','sbias','none','cap1','moe8_s1','dense_s1'].filter(k=>D.runs[k]);
    function draw(){const se=keys.map(k=>({name:D.runs[k].short,color:RC[k],dash:k.endsWith('_s1'),pts:D.runs[k].log.eval.filter(p=>p[0]>=250)}));
      M.lines($('mx-cmp-svg'),se,{xt:[250,500,750,1000,1250,1500],xl:'training step (8,192 tokens each)',yd:2,label:'Held-out loss during training'})}
    let h='<table><thead><tr><th>run</th><th class="num">held-out loss</th><th class="num">MaxVio (mean over layers)</th><th class="num">total params</th><th class="num">active</th><th class="num">tokens/s (rough)</th></tr></thead><tbody>';
    keys.forEach(k=>{const r=D.runs[k],mv=r.heldout&&r.heldout.maxvio;h+='<tr><td>'+esc(r.label)+'</td><td class="num">'+f(r.heldout?r.heldout.loss:r.log.final,3)+'</td><td class="num">'+(mv?f(mv.reduce((a,b)=>a+b,0)/mv.length,2):'&minus;')+'</td><td class="num">'+f(r.log.params.total,0)+'</td><td class="num">'+f(r.log.params.active,0)+'</td><td class="num">'+f(r.log.tok_s,0)+'</td></tr>'});
    $('mx-cmp-tbl').innerHTML=h+'</tbody></table><p class="small mute">Held-out loss: 20 fixed validation batches (163,840 tokens), recomputed on CPU from the final checkpoint; the training log\'s own final value agrees to the third decimal.</p>';
    RD.onRender(draw);RD.onResize(draw);draw();
  }
  // 6. real configs ------------------------------------------------------------------------------------------------
  if($('mx-cfg')){
    let ord='date';const R=D.cfgs;
    function draw(){const rows=R.slice().sort((a,b)=>ord==='date'?(a.date<b.date?-1:1):ord==='kE'?((a.k_over_E||0)-(b.k_over_E||0)):((a[ord]||0)-(b[ord]||0)));
      const v=x=>x===null||x===undefined?'&minus;':esc(x);
      let h='<table class="mx-tbl"><thead><tr><th>model</th><th>date</th><th class="num">total / active</th><th class="num">E</th><th class="num">k</th><th class="num">shared</th><th class="num">width / d</th><th class="num">MoE layers</th><th>router</th><th>balancing</th><th class="num">groups</th><th class="num">scale</th><th class="num">log10 C(E,k)</th></tr></thead><tbody>';
      rows.forEach(r=>{h+='<tr><td>'+esc(r.name)+'</td><td>'+r.date+'</td><td class="num">'+r.tot+' / '+r.act+'</td><td class="num">'+v(r.E)+'</td><td class="num">'+v(r.k)+'</td><td class="num">'+v(r.shared)+'</td><td class="num">'+v(r.expert_ff)+' / '+v(r.d_model)+(r.latent?'<br><span class="mute">latent '+r.latent+'</span>':'')+'</td><td class="num">'+v(r.moe_layers)+' / '+v(r.layers)+(r.hash_layers?'<br><span class="mute">'+r.hash_layers+' hash</span>':'')+'</td><td>'+v(r.router)+'</td><td>'+v(r.balancing)+'</td><td class="num">'+(r.n_group?r.n_group+'/'+r.topk_group:'&minus;')+'</td><td class="num">'+v(r.routed_scale)+'</td><td class="num">'+v(r.log10_combos)+'</td></tr>'});
      $('mx-cfg-tbl').innerHTML=h+'</tbody></table>'}
    RD.seg($('mx-cfg-m'),m=>{ord=m;draw()});draw();
  }
})();
