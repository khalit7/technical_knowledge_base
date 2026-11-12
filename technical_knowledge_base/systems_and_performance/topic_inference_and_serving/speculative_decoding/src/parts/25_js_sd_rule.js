// ---- Reading section 3: the same 16 guesses judged by two exact rules, on real p and q (2D animation, RD.anim with a step list) ----
// 2026-11-12: the 17 one-guess frames are grouped into 6 explained steps (the long-replay rule): the position, four groups of four guesses, the tally.
// Each rule has its own step list (sx-rule-lev, sx-rule-sac); the readout under the chart gives the specific numbers of the current step.
(function(){
  const D=SD.D,P=D.rulepos,card=document.getElementById('sd-rule-card');if(!card||!P||!P.length)return;
  let mode='lev',pi=0,draws=null;const N=16,G=4,NS=N/G+2;
  const sample=(w,u)=>{let s=0;for(const x of w)s+=x;let c=0;for(let i=0;i<w.length;i++){c+=w[i]/s;if(u<c)return i}return w.length-1};
  function prep(){const f=P[pi].full,p=f.map(r=>r[1]),q=f.map(r=>r[2]),R=SD.rng(20261008+pi);
    const res=f.map((r,i)=>Math.max(0,p[i]-q[i]));
    draws=[];for(let i=0;i<N;i++){const x=sample(q,R()),u=R(),ur=R(),ut=R();
      const ratio=q[x]>0?Math.min(1,p[x]/q[x]):0,lev=u<ratio,levOut=lev?x:sample(res,ur),t=sample(p,ut),sac=t===x;
      draws.push({x,u,ratio,lev,levOut,t,sac,sacOut:t})}}
  const kept=d=>mode==='lev'?d.lev:d.sac,outOf=d=>mode==='lev'?d.levOut:d.sacOut;
  function draw(step){const f=P[pi].full,el=document.getElementById('sd-rule-svg'),pos=P[pi];
    const n=step===0?0:Math.min(N,step*G),g0=step>=1&&step<=G?(step-1)*G:-1,grp=g0<0?[]:draws.slice(g0,g0+G);
    const W=Math.max(280,Math.min(860,SD.width(el))),show=f.slice(0,8);
    const rowH=26,top=20,lab=Math.min(110,W*0.26),bw=W-lab-80,H=top+show.length*rowH+8;
    const mx=Math.max(...show.map(r=>Math.max(r[1],r[2])));
    const hit=new Set();grp.forEach(d=>{hit.add(d.x);hit.add(outOf(d))});
    let s='<text x="'+lab+'" y="13" font-size="12" fill="var(--c1)">target p</text><text x="'+(lab+70)+'" y="13" font-size="12" fill="var(--c2)">draft q</text><text x="'+(lab+130)+'" y="13" font-size="12" fill="var(--good)">overlap min(p, q)</text>';
    show.forEach((r,i)=>{const y=top+i*rowH,wp=bw*r[1]/mx,wq=bw*r[2]/mx,wm=bw*Math.min(r[1],r[2])/mx,hl=hit.has(i);
      s+=(hl?'<rect x="0" y="'+(y-2)+'" width="'+W+'" height="'+(rowH-2)+'" fill="var(--hl)"/>':'')+
        '<text x="'+(lab-6)+'" y="'+(y+14)+'" text-anchor="end" font-size="12">'+SD.esc(SD.vis(r[0]).slice(0,14))+'</text>'+
        '<rect x="'+lab+'" y="'+(y+2)+'" width="'+wp.toFixed(1)+'" height="9" fill="var(--c1)" opacity=".85"/>'+
        '<rect x="'+lab+'" y="'+(y+12)+'" width="'+wq.toFixed(1)+'" height="9" fill="var(--c2)" opacity=".85"/>'+
        '<rect x="'+lab+'" y="'+(y+2)+'" width="'+wm.toFixed(1)+'" height="19" fill="none" stroke="var(--good)" stroke-width="1.5"/>'+
        '<text x="'+(lab+Math.max(wp,wq)+4)+'" y="'+(y+15)+'" font-size="11" fill="var(--mute)">'+SD.fmt(r[1],2)+' / '+SD.fmt(r[2],2)+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="target and draft distributions">'+s+'</svg>'+
      '<div class="small" style="margin-top:4px;min-height:3.4em">'+draws.slice(0,n).map((d,i)=>{const ok=kept(d),out=outOf(d),cur=i>=g0&&i<g0+G;
        return '<span class="'+(cur?'rd-new':'')+'" style="display:inline-block;margin:2px 3px;padding:1px 6px;border-radius:5px;border:1px solid '+(ok?'var(--good)':'var(--bad)')+';background:'+(ok?'var(--open2)':'var(--soft)')+(cur?';outline:2px solid var(--ink)':'')+'">'+SD.esc(f[d.x][0])+(ok?' &#10003;':' &rarr; '+SD.esc(f[out][0]))+'</span>'}).join('')+'</div>';
    // the readout: the specific numbers of this step (the step list says what the step does)
    const ro=document.getElementById('sd-rule-ro');let t='';
    if(step===0)t='Position: &hellip;'+SD.esc(pos.ctx)+' &#9646; (the target wrote '+SD.esc(JSON.stringify(pos.tok))+'). &alpha; = &Sigma; min(p, q) = '+SD.fmt(pos.a,3)+'; &Sigma; p&middot;q = '+SD.fmt(pos.spq,3)+'.';
    else if(step<=G)t='Guesses '+(g0+1)+' to '+(g0+G)+': '+grp.map(d=>{const r=f[d.x];return SD.esc(JSON.stringify(r[0]))+(mode==='lev'?(r[1]>=r[2]?' kept (p &ge; q)':' p/q '+SD.fmt(d.ratio,2)+', coin '+SD.fmt(d.u,2)+(d.lev?', kept':', rejected, residual gave '+SD.esc(JSON.stringify(f[d.levOut][0])))):(d.sac?' kept (target drew the same)':' rejected (target drew '+SD.esc(JSON.stringify(f[d.t][0]))+')'))}).join('; ')+'.';
    else{const a=draws.filter(d=>d.lev).length,b=draws.filter(d=>d.sac).length;t='All 16: min(1, p/q) kept '+a+' (expected '+SD.fmt(N*pos.a,1)+'); sample and compare kept '+b+' (expected '+SD.fmt(N*pos.spq,1)+').'}
    ro.innerHTML=t;
    const acc=draws.slice(0,n).filter(kept).length;
    document.getElementById('sd-rule-cnt').innerHTML=RD.stat('Kept so far',acc+' of '+n)+
      RD.stat(mode==='lev'?'Expected rate &Sigma; min(p, q)':'Expected rate &Sigma; p&middot;q',SD.fmt(mode==='lev'?pos.a:pos.spq,3))+
      RD.stat('Other rule, same guesses',draws.slice(0,n).filter(d=>mode==='lev'?d.sac:d.lev).length+' of '+n,mode==='lev'?'sample and compare':'min(1, p/q)');
  }
  prep();
  const lists=m=>{['lev','sac'].forEach(x=>{const l=document.getElementById('sx-rule-'+x);if(l)l.hidden=x!==m})};lists(mode);
  const A=RD.anim({card:'sd-rule-card',ctl:'sd-rule-ctl',n:NS,ms:4200,draw,label:'Step',list:'sx-rule-lev'});
  window.SD_RULE=A;
  SD.segs(document.getElementById('sd-rule-mode'),[['lev','min(1, p/q) with residual (the paper, vLLM)'],['sac','Sample the target, accept if equal (llama.cpp, mlx-lm)']],'lev',m=>{mode=m;lists(m);A.reset(NS,'sx-rule-'+m)});
  SD.segs(document.getElementById('sd-rule-pos'),P.map((p,i)=>[String(i),'…'+p.ctx.slice(-22)+' (α '+SD.fmt(p.a,2)+')']),'0',m=>{pi=+m;prep();A.reset(NS)});
  RD.onResize(()=>A.redraw());
})();
