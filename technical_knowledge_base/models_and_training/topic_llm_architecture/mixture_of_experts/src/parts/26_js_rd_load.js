// ---- Reading section 3 (moved from the retired Expert load tab on 2026-10-23): before/after animation (no balancing against a chosen scheme), a per-layer heat map
// and MaxVio / aux / dropped curves, all decoded from the training logs (window.MXD.runs[*].log.load). ----
(function(){
  const M=window.MX;if(!M||!window.RD||!M.$('ld-anim'))return;const {D,$,f,pct,tx,svg,esc,EC,RC}=M;
  const RUNS=['moe8','bias','sbias','cap1','moe16s','moe8_s1','none'].filter(k=>D.runs[k]&&D.runs[k].log.load);
  if(!RUNS.length)return;
  const cache={};
  const shares=k=>{if(cache[k])return cache[k];const ld=D.runs[k].log.load,a=M.unb64(ld.shares_b64),E=ld.E,L=ld.L,n=ld.steps.length;
    const out=[];for(let s=0;s<n;s++){const st=[];for(let l=0;l<L;l++){const r=[];for(let e=0;e<E;e++)r.push(a[(s*L+l)*E+e]/255);st.push(r)}out.push(st)}return cache[k]=out};
  const hasNone=!!(D.runs.none&&D.runs.none.log.load);
  const RIGHT=RUNS.filter(k=>k!=='none');let right=RIGHT[0];
  function panel(el,k,i){const sh=shares(k)[Math.min(i,shares(k).length-1)],L=sh.length,E=sh[0].length,W=M.width(el),H=150,pl=26,pb=18,gw=(W-pl)/L,bw=(gw-6)/E;let s='';
    const Y=v=>6+(H-6-pb)*(1-Math.min(1,v)/0.6);
    [0,0.3,0.6].forEach(v=>{s+='<line x1="'+pl+'" x2="'+W+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+tx(pl-3,Y(v)+4,f(v,1),{a:'end',fs:10,fill:'var(--mute)'})});
    sh.forEach((l,j)=>{const x0=pl+j*gw+3;l.forEach((v,e)=>{s+='<rect x="'+(x0+e*bw).toFixed(1)+'" y="'+Y(v).toFixed(1)+'" width="'+Math.max(1,bw-0.8).toFixed(1)+'" height="'+(Y(0)-Y(v)).toFixed(1)+'" fill="'+EC[e]+'"/>'});
      s+='<line x1="'+x0+'" x2="'+(x0+E*bw)+'" y1="'+Y(1/E)+'" y2="'+Y(1/E)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+tx(x0+E*bw/2,H-4,'L'+(j+1),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    el.innerHTML=svg(W,H,s,'Expert shares per layer')}
  const N=(hasNone?D.runs.none:D.runs[right]).log.load.steps.length;
  function draw(i){const steps=D.runs[right].log.load.steps,step=steps[Math.min(i,steps.length-1)];
    if(hasNone){panel($('ld-l'),'none',i);$('ld-lt').innerHTML=esc(D.runs.none.short)+': MaxVio '+f(mv('none',i),2)}
    else{$('ld-l').innerHTML='<p class="small mute">The no-balancing run is not recorded yet.</p>'}
    panel($('ld-r'),right,i);$('ld-rt').innerHTML=esc(D.runs[right].short)+': MaxVio '+f(mv(right,i),2);
    $('ld-cap').innerHTML='Step '+step+' of 1,500 ('+f(step*8192/1e6,1)+'M tokens seen). MaxVio is averaged over the 6 layers: (busiest expert &minus; mean) / mean, 0 when balanced.'}
  const mv=(k,i)=>{const a=D.runs[k].log.load.maxvio,r=a[Math.min(i,a.length-1)];return r.reduce((x,y)=>x+y,0)/r.length};
  const anim=RD.anim({card:'ld-anim',ctl:'ld-ctl',n:N,draw,ms:180,label:'Training step'});
  M.seg($('ld-right'),RIGHT.map(k=>[k,D.runs[k].short]),right,m=>{right=m;anim.redraw()});
  RD.onResize(()=>anim.redraw());
  // heat map
  let hr=hasNone?'none':RUNS[0],hl=0;
  function heat(){const sh=shares(hr),n=sh.length,E=sh[0][0].length,el=$('ld-hm'),W=M.width(el),pl=30,cw=(W-pl-4)/n,ch=E>8?9:14,H=E*ch+26;let s='';
    for(let t=0;t<n;t++)for(let e=0;e<E;e++){const v=sh[t][hl][e];s+='<rect x="'+(pl+t*cw).toFixed(2)+'" y="'+(4+e*ch)+'" width="'+(cw+0.3).toFixed(2)+'" height="'+ch+'" fill="'+EC[e]+'" fill-opacity="'+Math.min(1,0.04+1.9*v).toFixed(2)+'"/>'}
    for(let e=0;e<E;e++)s+=tx(pl-4,4+e*ch+ch-3,'E'+e,{a:'end',fs:E>8?9.5:10.5,fill:'var(--mute)'});
    const st=D.runs[hr].log.load.steps;[0,500,1000,1499].forEach(v=>{const t=st.findIndex(x=>x>=v);if(t>=0)s+=tx(pl+t*cw,H-6,v===1499?'1,500':v,{a:v===1499?'end':'middle',fs:10.5,fill:'var(--mute)'})});
    el.innerHTML=svg(W,H,s,'Expert share heat map')}
  M.seg($('ld-hrun'),RUNS.map(k=>[k,D.runs[k].short]),hr,m=>{hr=m;heat()});
  M.seg($('ld-hlay'),Array.from({length:6},(_,i)=>[String(i),'layer '+(i+1)]),'0',m=>{hl=+m;heat()});
  RD.onRender(heat);RD.onResize(heat);
  // lines
  let met='maxvio';
  function lines(){const se=RUNS.filter(k=>met!=='aux'||D.runs[k].log.config.balance==='aux').filter(k=>met!=='dropped'||k==='cap1').map(k=>{const ld=D.runs[k].log.load;
      return {name:D.runs[k].short,color:RC[k],pts:ld.steps.map((s,i)=>[s,met==='maxvio'?ld.maxvio[i].reduce((a,b)=>a+b,0)/ld.maxvio[i].length:met==='aux'?ld.aux[i]:(ld.dropped[i]||[]).reduce((a,b)=>a+b,0)/Math.max(1,(ld.dropped[i]||[]).length)])}});
    if(!se.length){$('ld-lines').innerHTML='<p class="small mute">No run records this metric yet.</p>';return}
    M.lines($('ld-lines'),se,{xt:[0,250,500,750,1000,1250,1500],xl:'training step',yd:met==='maxvio'?1:3,y0:0,label:'Imbalance over training'});
    $('ld-lines-cap').innerHTML=met==='maxvio'?'MaxVio per logged step (one training batch of 8,192 tokens), averaged over layers.':met==='aux'?'The auxiliary loss before its coefficient (the tiny GPT\'s per-layer Switch loss summed over the 6 layers: 6 at perfect balance).':'Fraction of assignments dropped per training step at capacity factor 1.0, averaged over layers.'}
  M.seg($('ld-met'),[['maxvio','MaxVio'],['aux','auxiliary loss'],['dropped','dropped (CF 1.0 run)']],met,m=>{met=m;lines()});
  RD.onRender(lines);RD.onResize(lines);
  // heat map and curves sit in a closed block: draw at the real width when it opens
  const det=$('ld-hm').closest('details');if(det)det.addEventListener('toggle',()=>{if(det.open){heat();lines()}});
})();
