// ---- Batch roofline (Gemma on one machine): arithmetic intensity, critical batch, experts touched ----
(function(){
  const CH={
    v5e:{n:'TPU v5e',F:1.97e14,W:8.2e11,src:'{{Scaling Book|@sbtpu}}'},
    v6e:{n:'TPU v6e',F:918e12,W:1638e9,src:'{{Cloud TPU v6e|@v6e}}'},
    i7:{n:'Ironwood, bf16',F:2307e12,W:7380e9,src:'{{Cloud TPU7x|@tpu7x}}'}
  };
  const nE=128,kE=8;
  const Eb=B=>nE*(1-(1-kE/nE)**B);
  let wq='bf';
  // weight bytes read per step; MoE split back-solved from resident and active bytes (by construction)
  function mods(){const G=window.GEMMA.GM,m26=G[1],m31=G[2];
    const pe=(m26.wt[wq]-m26.aw[wq])*1e9/(nE-kE),ps=m26.aw[wq]*1e9-kE*pe;
    return [{m:m26,n:'26B A4B',N:m26.act*1e9,P:B=>ps+Eb(B)*pe,pe,ps,c:m26.c},{m:m31,n:'31B',N:m31.act*1e9,P:()=>m31.wt[wq]*1e9,c:m31.c}]}
  const I=(o,B)=>2*B*o.N/o.P(B);
  // batch at which intensity reaches F/W (intensity rises monotonically with B)
  function cross(o,r){let lo=1,hi=1e6;if(I(o,lo)>=r)return 1;for(let i=0;i<200;i++){const mid=Math.sqrt(lo*hi);if(I(o,mid)<r)lo=mid;else hi=mid}return hi}
  function step(o,B,ch,kv){const tk=B*kv/ch.W,tc=2*B*o.N/ch.F,tm=o.P(B)/ch.W;return {tk,tc,tm,t:tk+Math.max(tc,tm),bound:tc>tm?'compute':'memory'}}
  window.drawRoof=function(){
    if(!window.GEMMA||$('t-gemma').hidden)return;
    const GE=window.GEMMA,T=GE.Ts[+$('gmT').value],cb=GE.cb(),kvOn=$('gmKV').checked;
    const B=Math.round(2**(+$('rfB').value/10)),ck=$('rfC').value,ch=CH[ck],r=ch.F/ch.W;
    $('rfBv').textContent=fmt(B)+' sequence'+(B>1?'s':'');
    const M=mods(),cr=M.map(o=>cross(o,r));
    const kvs=M.map(o=>GE.kvB(o.m,T,cb,kvOn));
    const st=M.map((o,i)=>step(o,B,ch,kvs[i])),st1=M.map((o,i)=>step(o,1,ch,kvs[i]));
    const tps=st.map(s=>B/s.t),adv=tps[0]/tps[1],adv1=(1/st1[0].t)/(1/st1[1].t);
    const eB=Eb(B);
    // pin
    const def=ck==='v5e'&&wq==='bf'&&B===32;
    $('rfPin').innerHTML='<div class="t">'+(def?'Defaults reproduce the Scaling Book\'s critical batch on TPU v5e (independent)':'At these settings')+'</div>'
      +'B<sub>crit</sub> = F / W = '+sci(ch.F)+' / '+sci(ch.W)+' = '+fmt(r)+' on '+ch.n+(ck==='v5e'?' (Scaling Book: 240, {{inference chapter|@sbinf}})':'')+'. '
      +'A batch of '+fmt(B)+' touches E('+fmt(B)+') = 128 × [1 − (120/128)<sup>'+fmt(B)+'</sup>] = '+eB.toFixed(1)+' of 128 experts per layer ('+(100*eB/nE).toFixed(0)+'%, <span class="ill">uniform routing, illustrative</span>), so the MoE reads '+(M[0].P(B)/1e9).toFixed(1)+' GB of weights per step, not '+M[0].m.aw[wq]+'.';
    $('rfOut').innerHTML=stat('Critical batch, chip','B = '+fmt(r),'F / W, bf16 weights, no shared layers')
      +stat('31B turns compute-bound at','B ≈ '+fmt(cr[1]),'2 B N / P = F / W, P = '+M[1].m.wt[wq]+' GB')
      +stat('26B A4B turns compute-bound at','B ≈ '+fmt(cr[0]),'with P(B) growing as experts are touched')
      +stat('MoE tokens/s over 31B','×'+adv.toFixed(2)+' at B = '+fmt(B),'×'+adv1.toFixed(1)+' at B = 1');
    // intensity plot
    const W=640,H=280,xr=[1,4096],yr=[0.5,20000];
    const xt=[1,4,16,64,256,1024,4096].map(v=>[v,fmt(v)]),yt=[[1,'1'],[10,'10'],[100,'100'],[1000,'1,000'],[10000,'10,000']];
    const f=logFrame({W,H,pl:56,pr:120,pt:12,pb:34,x:xr,y:yr,xt,yt,xl:'batch B (log)',yl:'FLOP per weight byte'});
    let s=f.s;const cl=v=>Math.min(Math.max(v,yr[0]),yr[1]);
    s+='<line x1="56" x2="'+(W-120)+'" y1="'+f.ly(r)+'" y2="'+f.ly(r)+'" stroke="var(--ink)" stroke-dasharray="5 3"/><text x="'+(W-116)+'" y="'+(f.ly(r)+4)+'" font-size="11">'+ch.n+': '+fmt(r)+'</text>';
    s+='<text x="62" y="'+(f.ly(r)-6)+'" font-size="10.5" fill="var(--mute)">compute-bound above, memory-bound below</text>';
    s+='<line x1="'+f.lx(B)+'" x2="'+f.lx(B)+'" y1="12" y2="'+(H-34)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    const ends=[];
    M.forEach((o,i)=>{const pts=[];for(let e=0;e<=12.0001;e+=0.1){const b=2**e;pts.push(f.lx(b).toFixed(1)+','+f.ly(cl(I(o,b))).toFixed(1))}
      s+='<path d="M'+pts.join('L')+'" fill="none" stroke="'+o.c+'" stroke-width="2"/>';
      s+='<circle cx="'+f.lx(B)+'" cy="'+f.ly(cl(I(o,B)))+'" r="3.5" fill="'+o.c+'"><title>'+o.n+': '+I(o,B).toFixed(1)+' FLOP/byte at B = '+fmt(B)+'</title></circle>';
      if(cr[i]<=4096)s+='<circle cx="'+f.lx(cr[i])+'" cy="'+f.ly(r)+'" r="5" fill="none" stroke="'+o.c+'" stroke-width="2"/><text x="'+f.lx(cr[i])+'" y="'+(f.ly(r)+(i?-10:18))+'" font-size="10.5" text-anchor="middle" fill="'+o.c+'">'+fmt(cr[i])+'</text>';
      ends.push({y:f.ly(cl(I(o,4096))),c:o.c,n:o.n,how:o.n+': 2 B N / P(B)'})});
    s+=endLabels(ends,W-116,14);
    $('rfPlot').innerHTML=svgEl(W,H,s,'Arithmetic intensity against batch size');
    // experts touched
    const EH=200,pl=56,pr=120,pt=12,pb=34,lx=f.lx,ly=v=>pt+(EH-pt-pb)*(1-v/nE);
    let q='';[0,32,64,96,128].forEach(v=>{q+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    xt.forEach(([v,l])=>{q+='<text x="'+lx(v)+'" y="'+(EH-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    q+='<text x="'+((pl+W-pr)/2)+'" y="'+(EH-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">batch B (log)</text><text x="12" y="'+((pt+EH-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+EH-pb)/2)+')">experts of 128</text>';
    const pts=[];for(let e=0;e<=12.0001;e+=0.1){const b=2**e;pts.push(lx(b).toFixed(1)+','+ly(Eb(b)).toFixed(1))}
    q+='<path d="M'+pts.join('L')+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    [8,32].forEach(b=>{q+='<circle cx="'+lx(b)+'" cy="'+ly(Eb(b))+'" r="3" fill="var(--mute)"/><text x="'+(lx(b)+6)+'" y="'+(ly(Eb(b))+14)+'" font-size="10.5" fill="var(--mute)">B = '+b+': '+Eb(b).toFixed(1)+'</text>'});
    q+='<circle cx="'+lx(B)+'" cy="'+ly(eB)+'" r="4.5" fill="var(--acc)"/><text x="'+(W-pr+6)+'" y="'+(ly(eB)+4)+'" font-size="11" fill="var(--acc)">'+eB.toFixed(1)+' ('+(100*eB/nE).toFixed(0)+'%)</text>';
    $('rfExp').innerHTML=svgEl(W,EH,q,'Experts touched against batch size');
    // step table
    const ms=v=>(v*1e3).toFixed(v<0.01?2:1)+' ms';
    let t='<tr><th>Model, B = '+fmt(B)+', '+ch.n+'</th><th class="num">Weights read, P(B)</th><th class="num">Cache read, B S<sub>KV</sub></th><th class="num">Compute 2BN/F</th><th class="num">Weights P/W</th><th class="num">Cache BS/W</th><th class="num">Step</th><th class="num">Tokens/s</th><th>Matmul is</th></tr>';
    M.forEach((o,i)=>{const z=st[i];t+='<tr><td>'+o.n+'</td><td class="num">'+(o.P(B)/1e9).toFixed(1)+' GB</td><td class="num">'+(B*kvs[i]/1e9).toFixed(2)+' GB</td><td class="num">'+ms(z.tc)+'</td><td class="num">'+ms(z.tm)+'</td><td class="num">'+ms(z.tk)+'</td><td class="num">'+ms(z.t)+'</td><td class="num">'+fmt(B/z.t)+'</td><td>'+z.bound+'-bound</td></tr>'});
    $('rfTab').innerHTML=t+'<tr><td colspan="9" class="small mute">Cache at '+fmt(T)+' tokens, '+(cb===1?'int8':'bf16')+(kvOn?', keys reused as values':'')+' (the controls at the top of the tab). Step = cache term + the larger of compute and weights. Tokens/s = B / step, an upper bound.</td></tr>';
    // chip table
    let c='<tr><th>Chip</th><th class="num">F, bf16</th><th class="num">W</th><th class="num">B<sub>crit</sub> = F/W</th><th class="num">31B crossover</th><th class="num">26B A4B crossover</th><th>Source</th></tr>';
    Object.entries(CH).forEach(([k,h])=>{const rr=h.F/h.W;c+='<tr'+(k===ck?' style="background:var(--acc2)"':'')+'><td>'+h.n+'</td><td class="num">'+fmt(h.F/1e12)+' TFLOP/s</td><td class="num">'+fmt(h.W/1e9)+' GB/s</td><td class="num">'+fmt(rr)+'</td><td class="num">'+fmt(cross(M[1],rr))+'</td><td class="num">'+fmt(cross(M[0],rr))+'</td><td>'+h.src+'</td></tr>'});
    $('rfChip').innerHTML=c+'<tr><td colspan="7" class="small mute">Crossovers use the '+(wq==='q4'?'Q4_0':'bf16')+' weight bytes above with bf16 arithmetic. Scaling Book check: v5e '+fmt(1.97e14/8.2e11)+' against its stated 240.</td></tr>';
  };
  segBind('rfW',m=>{wq=m;drawRoof()});['rfB','rfC'].forEach(id=>$(id).addEventListener('input',drawRoof));
  onTab('t-gemma',()=>drawRoof());
})();
