// ---- Architecture map: timeline by lab lane, colour by attention or FFN kind, year sweep, shift flags ----
(function(){
  const A=window.AM;if(!A||!A.$('am-tl'))return;
  const {$,esc,rows}=A;
  let mode='att',sel=null,anim=null;
  const T0=2019,TB=2023,T1=2026.75;
  // flags: where each shift first appears in this map, computed from the rows (sorted by date)
  const FL=[
    ['Pre-norm',r=>r.nk!=='post','Norm moved inside the residual branch: deep stacks train without warm-up tricks.'],
    ['Multi-query attention',r=>r.Hkv===1,'One K and V head shared by every query head: the decode cache shrinks by the head count.'],
    ['RoPE',r=>/[RP]/.test(r.pos),'Position as a rotation of q and k: no table, and attention sees relative offsets.'],
    ['Gated FFN',r=>/GLU/.test(r.ffa||''),'Three matrices with a gate (SwiGLU): lower perplexity at equal parameters.'],
    ['RMSNorm',r=>/RMS/.test(r.nt||''),'No mean subtraction, no bias: half the norm parameters.'],
    ['Grouped KV heads',r=>r.Hkv>1&&r.Hkv<r.H,'Query heads share KV heads in groups: the cache shrinks by H / Hkv.'],
    ['Sliding window',r=>r.mix.indexOf('S')>=0,'Layers keep only the last W tokens, so their cache stops growing.'],
    ['Mixture of experts',r=>r.ffn.indexOf('e')>=0,'Many experts, few active per token: parameters grow, compute per token does not.'],
    ['SSM hybrid',r=>/[LH]/.test(r.mix),'Most layers keep a fixed-size state instead of a growing cache.'],
    ['Multi-head latent attention',r=>!!r.dc,'Cache one compressed latent per token instead of per-head K and V.'],
    ['QK-norm',r=>!!r.qk,'Normalise q and k per head: bounded logits, fewer loss spikes.'],
    ['Trained sparse attention',r=>r.mix.indexOf('D')>=0,'A learned indexer picks which cached tokens each query reads (GPT-3\'s 2020 banded layers were sparse by a fixed pattern, not learned).']
  ].map((f,i)=>{const r=rows.find(f[1]);return {i:i+1,name:f[0],r,note:f[2]}}).filter(f=>f.r);
  const QS=[];for(let y=T0;y<=2026;y++)for(let q=0;q<4;q++){const t=y+(q+1)/4;if(t<=T1+0.01)QS.push(t)}
  function legend(){
    const L=mode==='att'?A.ATT:A.FFN;
    $('am-tl-leg').innerHTML=L.map(a=>'<span><i class="am-dot" style="background:var('+a[1]+')"></i>'+esc(a[2])+'</span>').join('')+
      '<span><i class="am-dot" style="background:transparent;border:2px solid var(--ink)"></i>sliding-window layers</span><span><i class="am-dot" style="background:transparent;border:1.5px dashed var(--mute)"></i>closed weights</span>'}
  function draw(i){
    const el=$('am-tl'),w=A.width(el),nar=w<520;
    const lw=nar?58:82,pr=10,top=nar?40:34,rh=nar?21:25,H=top+A.LANES.length*rh+26;
    const pw=w-lw-pr,fb=0.2;
    const X=t=>{t=Math.max(T0,Math.min(T1,t));return lw+(t<TB?(t-T0)/(TB-T0)*pw*fb:pw*fb+(t-TB)/(T1-TB)*pw*(1-fb))};
    const cur=i==null?T1+1:QS[i];
    let s='';
    // lanes
    A.LANES.forEach((l,k)=>{const y=top+k*rh;s+='<rect x="'+lw+'" y="'+y+'" width="'+pw+'" height="'+rh+'" fill="'+(k%2?'var(--soft)':'var(--bg)')+'"/>'+
      '<text x="'+(lw-5)+'" y="'+(y+rh/2+4)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+esc(l)+'</text>'});
    // axis
    const yA=top+A.LANES.length*rh;
    [2019,2021,2023,2024,2025,2026].forEach(y=>{const x=X(y);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+yA+'" stroke="var(--line)"/>'+
      '<text x="'+x+'" y="'+(yA+14)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+(nar&&y===2021?'':y)+'</text>'});
    const xb=X(TB)-3;s+='<text x="'+(lw+pw*fb/2)+'" y="'+(yA+24)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(nar?'compressed':'2019 to 2022 compressed')+'</text>'+
      '<path d="M'+(xb-3)+' '+(yA-4)+' l4 8 M'+(xb+1)+' '+(yA-4)+' l4 8" stroke="var(--mute)"/>';
    // flags
    const fx=[];FL.forEach(f=>{const x=X(A.t2x(f.r.dt));let row=0;while(fx.some(o=>o.row===row&&Math.abs(o.x-x)<15))row++;fx.push({x,row});
      const y=10+row*13,on=A.t2x(f.r.dt)<=cur;
      s+='<g class="am-fl" data-f="'+f.i+'" style="cursor:pointer;opacity:'+(on?1:.25)+'"><line x1="'+x+'" x2="'+x+'" y1="'+(y+6)+'" y2="'+top+'" stroke="var(--acc)" stroke-dasharray="2 2"/>'+
      '<circle cx="'+x+'" cy="'+y+'" r="6.5" fill="var(--acc)"/><text x="'+x+'" y="'+(y+3.5)+'" text-anchor="middle" font-size="10" fill="var(--bg)" font-weight="700">'+f.i+'</text><title>'+esc(f.i+'. '+f.name+': '+f.r.n)+'</title></g>'});
    // dots, with vertical jitter inside a lane when they collide
    const placed={};
    rows.forEach(r=>{const k=A.LANES.indexOf(r.lane);if(k<0)return;const x=X(A.t2x(r.dt));
      const pl=placed[k]=placed[k]||[];let j=0;const offs=[0,-5,5,-9,9];while(j<offs.length-1&&pl.some(o=>Math.abs(o.x-x)<9&&o.o===offs[j]))j++;pl.push({x,o:offs[j]});
      const y=top+k*rh+rh/2+offs[j]*(nar?.8:1),on=A.t2x(r.dt)<=cur;
      const c=mode==='att'?A.colAtt(r.attk):A.colFfn(r.ffk),R=nar?4.5:5.5;
      const closed=r.lk==='closed';
      s+='<g class="am-pt" data-id="'+r.id+'" style="cursor:pointer;opacity:'+(on?1:.12)+'">'+
        (r.mix.indexOf('S')>=0?'<circle cx="'+x+'" cy="'+y+'" r="'+(R+2.6)+'" fill="none" stroke="var(--ink)" stroke-width="1.3"/>':'')+
        '<circle cx="'+x+'" cy="'+y+'" r="'+R+'" fill="'+(closed?'var(--bg)':c)+'" stroke="'+(closed?'var(--mute)':(sel===r.id?'var(--ink)':'none'))+'" stroke-width="'+(sel===r.id?2:1.5)+'"'+(closed?' stroke-dasharray="2 1.5"':'')+'/>'+
        '<circle cx="'+x+'" cy="'+y+'" r="11" fill="transparent"/><title>'+esc(r.n+' ('+r.dt+'): '+r.att)+'</title></g>'});
    if(i!=null&&cur<=T1){const x=X(cur);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+yA+'" stroke="var(--bad)" stroke-width="1.5"/>'}
    el.innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Timeline of decoder architectures by lab">'+s+'</svg>';
    stats(cur);
  }
  function stats(cur){
    const v=rows.filter(r=>A.t2x(r.dt)<=cur);const n=v.length||1;
    const pct=f=>Math.round(100*v.filter(f).length/n)+'%';
    const yr=cur>T1?'all 46 models':'up to '+Math.floor(cur-0.001)+' Q'+(Math.round(((cur-Math.floor(cur-0.001))*4))||4);
    $('am-tl-stats').innerHTML=A.esc?[['Models',v.length,yr],['Fewer KV heads than query heads',pct(r=>r.dc||r.Hkv<r.H),'GQA, MQA or MLA'],
      ['Mixture of experts',pct(r=>r.ffn.indexOf('e')>=0),'dense FFN in the rest'],['Sliding-window layers',pct(r=>r.mix.indexOf('S')>=0),''],
      ['Hybrid mixers',pct(r=>/[LH]/.test(r.mix)),'SSM or linear attention'],['QK-norm',pct(r=>r.qk),'']].map(a=>'<div class="stat"><div class="k">'+a[0]+'</div><div class="v am-num">'+a[1]+'</div><div class="d">'+a[2]+'</div></div>').join(''):'';
  }
  function select(id){sel=id;const r=A.byId[id];$('am-tl-sel').innerHTML=r?A.detail(r):'';anim?anim.redraw():draw(null)}
  function flags(){
    $('am-tl-flags').innerHTML=FL.map(f=>'<button data-f="'+f.i+'"><b>'+f.i+'</b> '+esc(f.name)+': first in this map in <b style="color:var(--ink)">'+esc(f.r.n)+'</b> ('+esc(f.r.dt.slice(0,7))+')<span class="am-sub">'+esc(f.note)+'</span></button>').join('')}
  $('am-tl').addEventListener('click',e=>{const p=e.target.closest('.am-pt');if(p){select(p.dataset.id);return}const f=e.target.closest('.am-fl');if(f){const F=FL.find(x=>x.i==f.dataset.f);if(F)select(F.r.id)}});
  $('am-tl-flags').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const F=FL.find(x=>x.i==b.dataset.f);if(F){select(F.r.id);$('am-tl-sel').scrollIntoView({block:'nearest'})}});
  A.seg($('am-tl-col'),m=>{mode=m;legend();anim.redraw()});
  legend();flags();
  $('am-tl-sel').innerHTML='<p class="small mute">Click a dot or a flag to see that model\'s card.</p>';
  anim=A.anim({card:'am-tl-card',ctl:'am-tl-ctl',n:QS.length,start:QS.length-1,ms:450,label:'Quarter',draw:i=>draw(i)});
  A.tabLinks($('am-tl-sel'));
  A.onRender(()=>anim.redraw());A.onResize(()=>anim.redraw());
})();
