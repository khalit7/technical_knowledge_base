// ---- The paper tab: animations, the gate, the scan, IO and memory calculators, inline charts ----
const RCX=PAPER.rc,TBX=PAPER.tables,MV=window.MBW.variants,PB=PAPER.rc.probe;
const TOKC=['var(--dim)','var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)','var(--c8)','var(--ink)'];
const pct=(v,d)=>(v*100).toFixed(d==null?(v>0.999&&v<1?2:1):d)+'%';
// measured toy numbers written into the prose
document.querySelectorAll('.rv').forEach(e=>{const [v,k]=e.dataset.k.split('.');const r=MV[v]&&MV[v].res_q;if(r)e.textContent=pct(r[k])});

// ---------- 1 and 2 (the KV cache against a fixed state; Selective Copying through the toys) are the 3D stages 31_js_sc_cache.js and 32_js_sc_sel.js ----------

// ---------- 3. Delta as a gate (Theorem 1) ----------
(function(){
  const sp=z=>z>20?z:Math.log1p(Math.exp(z)),sg=z=>1/(1+Math.exp(-z));
  function draw(W){const z=+$('gateZ').value;$('gateZv').textContent=z.toFixed(2);
    const H=200,pl=36,pr=10,pt=10,pb=28,X=v=>pl+(W-pl-pr)*(v+6)/12,Y=v=>pt+(H-pt-pb)*(1-Math.min(v,2.5)/2.5);let s='';
    [0,.5,1,1.5,2,2.5].forEach(v=>{s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    [-6,-3,0,3,6].forEach(v=>{s+=tx(X(v),H-pb+15,v,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'z',{fs:11,a:'middle',c:'var(--mute)'});
    const path=(f,c,da)=>{let d='';for(let i=0;i<=120;i++){const v=-6+i/10;d+=(i?'L':'M')+X(v).toFixed(1)+' '+Y(f(v)).toFixed(1)}return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'};
    s+=path(v=>1-sg(v),'var(--c2)')+path(sg,'var(--c1)')+path(sp,'var(--c3)','5 4');
    const pts=[[1-sg(z),'var(--c2)'],[sg(z),'var(--c1)'],[sp(z),'var(--c3)']];pts.forEach(([v,c])=>{s+='<circle cx="'+X(z)+'" cy="'+Y(v)+'" r="4" fill="'+c+'"/>'});
    const lg=legend([['Ā = exp(−Δ): keep the state','var(--c2)'],['B̄ = 1 − Ā = σ(z): write the token (theorem)','var(--c1)'],['B̄ = Δ (released code)','var(--c3)','5 4']],pl,H+14,W-pl);
    $('gateSvg').innerHTML=svgW(W,H+lg.h+6,s+lg.s,'gate curves');
    $('gateOut').innerHTML=stat('Δ = softplus(z)',sp(z).toFixed(3))+stat('Ā = exp(Δ · (−1))',(1-sg(z)).toFixed(3),'share of the old state kept')+stat('B̄, zero-order hold',sg(z).toFixed(3),'= g in Theorem 1')+stat('B̄, released code',sp(z).toFixed(3),sp(z)>sg(z)+.005?'larger than the gate':'about the gate')}
  fit($('gateSvg'),draw);$('gateZ').addEventListener('input',()=>refit($('gateSvg')));
})();

// ---------- 4. Sequential loop against the Blelloch scan ----------
(function(){
  const r=mulberry32(11),n=8,E=[];for(let i=0;i<n;i++)E.push([+(0.3+0.65*r()).toFixed(2),+(2*r()-1).toFixed(2)]);
  const comb=(p,q)=>[p[0]*q[0],q[0]*p[1]+q[1]];// p then q
  const seqH=[];let h=0;E.forEach(([a,b])=>{h=a*h+b;seqH.push(h)});
  // Blelloch levels, each a list of [i, j] (combine) and the array after it
  const lev=[],x=E.map(e=>e.slice());lev.push({ops:[],arr:x.map(v=>v.slice()),name:'start: (Ā_t, B̄_t x_t) pairs'});
  for(let d=1;d<n;d*=2){const ops=[];for(let j=2*d-1;j<n;j+=2*d){const i=j-d;x[j]=comb(x[i],x[j]);ops.push([i,j])}lev.push({ops,arr:x.map(v=>v.slice()),name:'up-sweep, stride '+d})}
  x[n-1]=[1,0];lev.push({ops:[],arr:x.map(v=>v.slice()),name:'clear the root to the identity (1, 0)',clear:true});
  for(let d=n/2;d>=1;d/=2){const ops=[];for(let j=2*d-1;j<n;j+=2*d){const i=j-d,t=x[i];x[i]=x[j];x[j]=comb(x[j],t);ops.push([i,j])}lev.push({ops,arr:x.map(v=>v.slice()),name:'down-sweep, stride '+d})}
  const fin=x.map((p,i)=>comb(p,E[i]));lev.push({ops:E.map((_,i)=>[i,i]),arr:fin,name:'combine each prefix with its own element',final:true});
  const parH=fin.map(p=>p[1]),err=Math.max(...parH.map((v,i)=>Math.abs(v-seqH[i])));
  const work={seq:n,par:lev.reduce((a,l)=>a+l.ops.length,0)};
  const SEQ=[0,3,6,7];   // the sequential loop in four stretches: h0; h1 to h3; h4 to h6; h7
  const modes={seq:SEQ.map(i=>({t:'h'+i})),par:lev.map(l=>({t:l.name}))};
  {const el=$('scnErr');if(el)el.textContent=err.toExponential(1)}
  makeAnim({id:'scn',mode:'seq',modes,lists:{seq:'sx-scn-seq',par:'sx-scn-par'},dur:1700,
    draw(m,k,e,W){const pad=4,cw=(W-2*pad)/n,rowH=32;let s='';
      for(let i=0;i<n;i++)s+=tx(pad+i*cw+cw/2,12,'t = '+i,{fs:11,a:'middle',c:'var(--mute)'});
      if(m==='seq'){// input row and output row
        E.forEach(([a,b],i)=>{s+=rc(pad+i*cw+2,20,cw-4,26,'var(--soft)',{s:'var(--line)'})+tx(pad+i*cw+cw/2,37,b.toFixed(2),{fs:11,a:'middle'})});
        s+=tx(pad,62,'inputs B̄x (Ā between 0.30 and 0.95)',{fs:11,c:'var(--mute)'});
        const hi=SEQ[k],lo=k?SEQ[k-1]+1:0,shown=Math.floor(lo+(hi-lo+1)*e-1e-9);
        for(let i=0;i<=hi;i++){const op=i<lo?1:i<=shown?1:0;s+=G(op,rc(pad+i*cw+2,74,cw-4,26,'var(--acc2)',{s:'var(--acc)'})+tx(pad+i*cw+cw/2,91,seqH[i].toFixed(2),{fs:11,a:'middle'}));if(i>0)s+=G(op,ln2(pad+(i-1)*cw+cw-2,87,pad+i*cw+2,87,'var(--acc)',{sw:1.5}))}
        s+=tx(pad,116,'states h_t, one after another',{fs:11,c:'var(--mute)'});return svgW(W,124,s,'sequential scan')}
      const show=Math.min(k,lev.length-1);
      for(let li=0;li<=show;li++){const L=lev[li],y=20+li*rowH,op=li<show?1:e;
        L.arr.forEach((p,i)=>{const hit=L.ops.some(o=>o[1]===i||(L.name.startsWith('down')&&o[0]===i));s+=G(li===0||li<show?1:(hit?op:1),rc(pad+i*cw+2,y,cw-4,22,L.final?'var(--acc2)':hit?'var(--hl)':'var(--soft)',{s:L.final?'var(--acc)':'var(--line)'})+tx(pad+i*cw+cw/2,y+15,p[1].toFixed(2),{fs:11,a:'middle'}))});
        L.ops.forEach(([i,j])=>{if(i!==j)s+=G(op*.8,ln2(pad+i*cw+cw/2,y-10,pad+j*cw+cw/2,y,'var(--acc)',{sw:1.4}))})}
      return svgW(W,24+(show+1)*rowH,s,'parallel scan')},
    counters(m,k){if(m==='seq'){const d=SEQ[k]+1;return stat('dependent steps',d+' of 8')+stat('combines',d)+stat('h₇ (loop)',d===8?seqH[7].toFixed(4):'not yet')}
      const done=lev.slice(0,k+1).reduce((a,l)=>a+l.ops.length,0);return stat('parallel steps',k+' of '+(lev.length-1))+stat('combines so far',done,'work stays O(L): '+work.par+' for 8')+stat('h₇ (scan)',k===lev.length-1?parH[7].toFixed(4):'not yet',k===lev.length-1?'loop: '+seqH[7].toFixed(4):'')}});
})();

// ---------- 5. IO count of the scan ----------
(function(){
  function io(L,D,N){const naive=2*L*D+2*L*N+D*N+2*L*D*N+3*L*D*N+L*D*N+L*N+L*D,fused=3*L*D+2*L*N+D*N;return [naive,fused]}
  function draw(W){const L=2**+$('ioL').value,N=+$('ioN').value,D=+$('ioD').value;$('ioLv').textContent=fmt(L);$('ioNv').textContent=N;$('ioDv').textContent=fmt(D);
    const [a,b]=io(L,D,N),bw=W-150;let s='';s+=tx(0,16,'naive',{fs:12})+rc(70,4,bw,18,'var(--c2)')+tx(76,17,fmtBytes(2*a),{fs:11,c:'var(--bg)'});
    s+=tx(0,46,'fused',{fs:12})+rc(70,34,Math.max(2,bw*b/a),18,'var(--c1)')+tx(70+Math.max(2,bw*b/a)+6,47,fmtBytes(2*b),{fs:11});
    $('ioSvg').innerHTML=svgW(W,60,s,'HBM traffic');
    $('ioOut').innerHTML=stat('naive HBM traffic',fmtBytes(2*a),'≈ 6 L·D·N elements, bf16')+stat('fused',fmtBytes(2*b),'≈ 3 L·D elements')+stat('ratio',(a/b).toFixed(1)+'×','about 2N')}
  fit($('ioSvg'),draw);['ioL','ioN','ioD'].forEach(i=>$(i).addEventListener(i==='ioL'?'input':'change',()=>refit($('ioSvg'))));
})();

// ---------- 6. The block diagram ----------
(function(){
  let mode='mamba';const P=RCX.twelve_d2;
  function box(x,y,w,h,t,cls){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" class="'+(cls||'box')+'"/>'+tx(x+w/2,y+h/2+4,t,{fs:12,a:'middle'})}
  const ar=(x1,y1,x2,y2)=>ln2(x1,y1,x2,y2,'var(--mute)',{sw:1.4});
  function draw(W){const cx=W/2,bw=Math.min(120,W*.3),L=cx-bw-14,R=cx+14,H=300;let s='';
    s+=tx(cx,H-6,'input x',{fs:11,a:'middle',c:'var(--mute)'})+tx(cx,14,'output',{fs:11,a:'middle',c:'var(--mute)'});
    if(mode==='mamba'){s+=box(L,236,bw,28,'Linear (×E)')+box(R,236,bw,28,'Linear (×E)')+box(L,190,bw,28,'Conv (k = 4)','boxa')+box(L,148,bw,28,'σ (SiLU)')+box(L,104,bw,30,'selective SSM','boxc')+box(R,148,bw,28,'σ (SiLU)')+box(cx-bw/2,24,bw,28,'Linear (to D)');
      s+=ar(L+bw/2,236,L+bw/2,218)+ar(L+bw/2,190,L+bw/2,176)+ar(L+bw/2,148,L+bw/2,134)+ar(R+bw/2,236,R+bw/2,176)+ar(L+bw/2,104,cx-8,76)+ar(R+bw/2,148,cx+8,76)+'<circle cx="'+cx+'" cy="70" r="9" class="box"/>'+tx(cx,74,'⊗',{fs:12,a:'middle'})+ar(cx,61,cx,52)+ar(cx,H-18,L+bw/2,264)+ar(cx,H-18,R+bw/2,264)}
    else if(mode==='mlp'){s+=box(L,236,bw,28,'Linear (×E)')+box(R,236,bw,28,'Linear (×E)')+box(R,148,bw,28,'σ (SiLU)')+box(cx-bw/2,24,bw,28,'Linear (to D)');
      s+=ar(L+bw/2,236,cx-8,76)+ar(R+bw/2,236,R+bw/2,176)+ar(R+bw/2,148,cx+8,76)+'<circle cx="'+cx+'" cy="70" r="9" class="box"/>'+tx(cx,74,'⊗',{fs:12,a:'middle'})+ar(cx,61,cx,52)+ar(cx,H-18,L+bw/2,264)+ar(cx,H-18,R+bw/2,264)}
    else{s+=box(L,236,bw,28,'Linear')+box(R,236,bw,28,'Linear')+box(L,190,bw,28,'Conv (shift SSM)','boxa')+box(cx-bw/2,104,bw,30,'SSM (LTI)','boxc')+box(cx-bw/2,24,bw,28,'Linear');
      s+=ar(L+bw/2,236,L+bw/2,218)+ar(L+bw/2,190,cx-8,166)+ar(R+bw/2,236,cx+8,166)+'<circle cx="'+cx+'" cy="160" r="9" class="box"/>'+tx(cx,164,'⊗',{fs:12,a:'middle'})+ar(cx,151,cx,134)+ar(cx,104,cx,80)+'<circle cx="'+cx+'" cy="70" r="9" class="box"/>'+tx(cx,74,'⊗',{fs:12,a:'middle'})+ar(cx,61,cx,52)+ar(cx,H-18,L+bw/2,264)+ar(cx,H-18,R+bw/2,264)+tx(R+bw+2,70,'⊗ third projection',{fs:11,c:'var(--mute)'})}
    $('blkSvg').innerHTML=svgW(W,H,s,'block diagram');
    const d=P.d,per=P.two_blocks/2;
    $('blkOut').innerHTML=mode==='mamba'?stat('parameters per block (D = 2,560)',fmt(per),'projections 6D² = '+fmt(6*d*d))+stat('two blocks against 12D²',(P.ratio).toFixed(3)+'×',fmt(P.two_blocks)+' against '+fmt(P.twelve_d2))+stat('SSM-specific share',P.ssm_extra_pct+'%','conv, Δ, B, C projections, A, skip')
      :mode==='mlp'?stat('what Mamba adds','conv + SSM','on the main branch, before the gate')+stat('with E = 2','6D²','the same projection budget as Mamba')
      :stat('what Mamba changes','first gate → σ','and one homogeneous block instead of H3 + MLP')+stat('SSM','LTI (S4)','Mamba makes it selective')}
  segBind('blkM',m=>{mode=m;refit($('blkSvg'))});fit($('blkSvg'),draw);
})();

// ---------- 7. Zero-shot average against size ----------
function sizeOf(n){const m=n.match(/([\d.]+)\s*([MB])\b/i);return m?(+m[1])*(m[2].toUpperCase()==='B'?1e9:1e6):null}
onTab('t-read',()=>fit($('zsSvg'),W=>{const rows=TBX.t3.rows,H=250,pl=40,pr=12,pt=10,pb=34;const F=logFrame({W,H,pl,pr,pt,pb,x:[1e8,1e10],y:[1,1],xt:[[1e8,'100M'],[3e8,'300M'],[1e9,'1B'],[3e9,'3B'],[1e10,'10B']],yt:[],xl:'parameters (log scale)'});
  const Y=v=>pt+(H-pt-pb)*(1-(v-38)/(66-38));let s=F.s;[40,45,50,55,60,65].forEach(v=>{s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
  const fam=[['Mamba','var(--c1)'],['Pythia','var(--c2)'],['RWKV','var(--c3)']];
  fam.forEach(([f,c])=>{const pts=rows.filter(r=>r.model.startsWith(f)).map(r=>[F.lx(sizeOf(r.model)),Y(+r.v[8])]);s+='<polyline points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+pts.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="'+c+'"/>').join('')});
  rows.filter(r=>!fam.some(([f])=>r.model.startsWith(f))).forEach(r=>{s+='<circle cx="'+F.lx(sizeOf(r.model))+'" cy="'+Y(+r.v[8])+'" r="3" fill="none" stroke="var(--mute)"><title>'+r.model+' '+r.v[8]+'</title></circle>'});
  const lg=legend([['Mamba','var(--c1)'],['Pythia','var(--c2)'],['RWKV','var(--c3)'],['others (open circles)','var(--mute)','2 3']],pl,H+12,W-pl);
  $('zsSvg').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'zero-shot average against size')}));

// ---------- 8. Inference memory and batch size ----------
(function(){const M=RCX.mem_28;
  function draw(W){const T=2**+$('memT').value,G=+$('memG').value;$('memTv').textContent=fmt(T);$('memGv').textContent=G+' GB';
    const kv=T*M.kv_per_token,st=M.state_bytes,free=G*1e9-2.8e9*2,bk=Math.max(0,Math.floor(free/kv)),bm=Math.max(0,Math.floor(free/st));
    const mx=Math.max(kv,st),bw=W-130;let s='';s+=tx(0,16,'Pythia-2.8B',{fs:12})+rc(90,4,Math.max(2,bw*kv/mx),18,'var(--c2)')+tx(96+Math.max(2,bw*kv/mx)*(kv/mx>.5?0:1),17,fmtBytes(kv),{fs:11,c:kv/mx>.5?'var(--bg)':null});
    s+=tx(0,46,'Mamba-2.8B',{fs:12})+rc(90,34,Math.max(2,bw*st/mx),18,'var(--c1)')+tx(96+Math.max(2,bw*st/mx)*(st/mx>.5?0:1),47,fmtBytes(st),{fs:11,c:st/mx>.5?'var(--bg)':null});
    $('memSvg').innerHTML=svgW(W,60,s,'memory per sequence');
    $('memOut').innerHTML=stat('Transformer: sequences that fit',fmt(bk),fmtBytes(kv)+' each')+stat('Mamba: sequences that fit',fmt(bm),fmtBytes(st)+' each')+stat('ratio',kv>st?(kv/st).toFixed(1)+'× more for Mamba':'cache is smaller here',T<M.crossover_tokens?'below the '+M.crossover_tokens+'-token crossover':'')}
  fit($('memSvg'),draw);$('memT').addEventListener('input',()=>refit($('memSvg')));$('memG').addEventListener('change',()=>refit($('memSvg')));
})();

// ---------- 9. Predict reveals ----------
PRED_REVEAL['pr-ext']=()=>fit($('prExt'),W=>{const ex=window.MBW.extrap||{},paper=TBX.t11.rows,mult=[1,2,4,8,16,32,64],H=170,pl=36,pt=12,pb=30;
  const rope=paper[1][2].slice(2,9),mam=paper[5][2].slice(2,9),val=v=>v==='ok'?100:+v;
  const toy=k=>ex[k]?mult.map((_,i)=>ex[k][String(6+i)]?100*ex[k][String(6+i)].acc:null):null;
  const series=[['paper MHA-RoPE',rope.map(val),'var(--c2)'],['paper Mamba',mam.map(val),'var(--c1)'],['toy attention (RoPE)',toy('ih_attn'),'var(--c2)','5 4'],['toy Mamba (S6)',toy('ih_s6'),'var(--c1)','5 4']].filter(x=>x[1]);
  const X=i=>pl+(W-pl-12)*i/(mult.length-1),Y=v=>pt+(H-pt-pb)*(1-v/100);let s='';
  [0,25,50,75,100].forEach(v=>{s+=ln2(pl,Y(v),W-12,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
  mult.forEach((m,i)=>{s+=tx(X(i),H-pb+15,'×'+m,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'test length / training length',{fs:11,a:'middle',c:'var(--mute)'});
  series.forEach(([n,v,c,da])=>{const pts=v.map((y,i)=>y==null?null:[X(i),Y(y)]).filter(Boolean);s+='<polyline points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'});
  const lg=legend(series.map(x=>[x[0],x[2],x[3]]),pl,H+12,W-pl);$('prExt').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'extrapolation')});
PRED_REVEAL['pr-n']=()=>fit($('prN'),W=>{const t=TBX.t10,H=170,pl=36,pt=12,pb=30,X=i=>pl+(W-pl-12)*i/4,Y=v=>pt+(H-pt-pb)*(1-(v-8.6)/(10-8.6));let s='';
  [8.6,9,9.4,9.8].forEach(v=>{s+=ln2(pl,Y(v),W-12,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
  t.const.forEach((r,i)=>{s+=tx(X(i),H-pb+15,'N = '+r[0],{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'state size (perplexity, lower is better)',{fs:11,a:'middle',c:'var(--mute)'});
  [['B, C constant',t.const,'var(--c2)'],['B, C selective',t.sel,'var(--c1)']].forEach(([n,rows,c])=>{s+='<polyline points="'+rows.map((r,i)=>X(i)+','+Y(r[2])).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+rows.map((r,i)=>'<circle cx="'+X(i)+'" cy="'+Y(r[2])+'" r="3.5" fill="'+c+'"/>').join('')});
  const lg=legend([['B, C constant','var(--c2)'],['B, C selective','var(--c1)']],pl,H+12,W-pl);$('prN').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'state size ablation')});
