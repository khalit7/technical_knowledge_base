// ---- Reading section 3: the same 16 guesses judged by two exact rules, on real p and q ----
(function(){
  const D=SD.D,P=D.rulepos,card=document.getElementById('sd-rule-card');if(!card||!P||!P.length)return;
  let mode='lev',pi=0,draws=null;const N=16;
  const sample=(w,u)=>{let s=0;for(const x of w)s+=x;let c=0;for(let i=0;i<w.length;i++){c+=w[i]/s;if(u<c)return i}return w.length-1};
  function prep(){const f=P[pi].full,p=f.map(r=>r[1]),q=f.map(r=>r[2]),R=SD.rng(20261008+pi);
    const res=f.map((r,i)=>Math.max(0,p[i]-q[i]));
    draws=[];for(let i=0;i<N;i++){const x=sample(q,R()),u=R(),ur=R(),ut=R();
      const ratio=q[x]>0?Math.min(1,p[x]/q[x]):0,lev=u<ratio,levOut=lev?x:sample(res,ur),t=sample(p,ut),sac=t===x;
      draws.push({x,u,ratio,lev,levOut,t,sac,sacOut:t})}}
  function draw(step){const f=P[pi].full,el=document.getElementById('sd-rule-svg');
    const W=Math.max(280,Math.min(860,SD.width(el))),show=f.slice(0,8),cur=step>0?draws[step-1]:null;
    const rowH=24,top=18,lab=Math.min(110,W*0.26),bw=W-lab-60,H=top+show.length*rowH+8;
    const mx=Math.max(...show.map(r=>Math.max(r[1],r[2])));
    let s='<text x="'+lab+'" y="12" font-size="10.5" fill="var(--c1)">target p</text><text x="'+(lab+70)+'" y="12" font-size="10.5" fill="var(--c2)">draft q</text><text x="'+(lab+130)+'" y="12" font-size="10.5" fill="var(--good)">overlap min(p, q)</text>';
    show.forEach((r,i)=>{const y=top+i*rowH,wp=bw*r[1]/mx,wq=bw*r[2]/mx,wm=bw*Math.min(r[1],r[2])/mx,hl=cur&&(f.indexOf(r)===cur.x||(mode==='lev'?f.indexOf(r)===cur.levOut:f.indexOf(r)===cur.t));
      s+=(hl?'<rect x="0" y="'+(y-2)+'" width="'+W+'" height="'+(rowH-2)+'" fill="var(--hl)"/>':'')+
        '<text x="'+(lab-6)+'" y="'+(y+13)+'" text-anchor="end" font-size="11.5">'+SD.esc(SD.vis(r[0]).slice(0,14))+'</text>'+
        '<rect x="'+lab+'" y="'+(y+2)+'" width="'+wp.toFixed(1)+'" height="8" fill="var(--c1)" opacity=".85"/>'+
        '<rect x="'+lab+'" y="'+(y+11)+'" width="'+wq.toFixed(1)+'" height="8" fill="var(--c2)" opacity=".85"/>'+
        '<rect x="'+lab+'" y="'+(y+2)+'" width="'+wm.toFixed(1)+'" height="17" fill="none" stroke="var(--good)" stroke-width="1.5"/>'+
        '<text x="'+(lab+Math.max(wp,wq)+4)+'" y="'+(y+14)+'" font-size="10" fill="var(--mute)">'+SD.fmt(r[1],2)+' / '+SD.fmt(r[2],2)+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="target and draft distributions">'+s+'</svg>'+
      '<div class="small" style="margin-top:4px">'+draws.slice(0,step).map((d,i)=>{const ok=mode==='lev'?d.lev:d.sac,out=mode==='lev'?d.levOut:d.sacOut;
        return '<span style="display:inline-block;margin:2px 3px;padding:1px 6px;border-radius:5px;border:1px solid '+(ok?'var(--good)':'var(--bad)')+';background:'+(ok?'var(--open2)':'var(--soft)')+(i===step-1?';outline:2px solid var(--ink)':'')+'">'+SD.esc(f[d.x][0])+(ok?' &#10003;':' &rarr; '+SD.esc(f[out][0]))+'</span>'}).join('')+'</div>';
    const cap=document.getElementById('sd-rule-cap'),pos=P[pi];
    if(!cur){cap.innerHTML='<div class="t">Position: &hellip;'+SD.esc(pos.ctx)+' &#9646;</div><p>The target wrote '+SD.esc(JSON.stringify(pos.tok))+' here. Its distribution p (blue) and the draft\'s q (orange) overlap by &alpha; = &Sigma; min(p, q) = '+SD.fmt(pos.a,3)+'. Press play: the draft makes 16 independent guesses from q at this position.</p>'}
    else{const r=f[cur.x];let t;
      if(mode==='lev'){t=cur.lev?(r[1]>=r[2]?'p ('+SD.fmt(r[1],3)+') &ge; q ('+SD.fmt(r[2],3)+'): accepted for sure.':'p/q = '+SD.fmt(cur.ratio,2)+'; the coin gave '+SD.fmt(cur.u,2)+', below it: accepted.')
        :'p/q = '+SD.fmt(cur.ratio,2)+'; the coin gave '+SD.fmt(cur.u,2)+': rejected. Replacement drawn from the residual max(0, p &minus; q): '+SD.esc(JSON.stringify(f[cur.levOut][0]))+'.'}
      else t=cur.sac?'The target sampled its own token from p and got the same one: accepted.':'The target sampled '+SD.esc(JSON.stringify(f[cur.t][0]))+' from p, not the guess: rejected, and the target\'s sample is the output.';
      cap.innerHTML='<div class="t">Guess '+step+' of '+N+': the draft proposed '+SD.esc(JSON.stringify(r[0]))+' (q = '+SD.fmt(r[2],3)+', p = '+SD.fmt(r[1],3)+')</div><p>'+t+'</p>'}
    const acc=draws.slice(0,step).filter(d=>mode==='lev'?d.lev:d.sac).length;
    document.getElementById('sd-rule-cnt').innerHTML=RD.stat('Accepted so far',acc+' of '+step)+
      RD.stat(mode==='lev'?'Expected rate &Sigma; min(p, q)':'Expected rate &Sigma; p&middot;q',SD.fmt(mode==='lev'?pos.a:pos.spq,3))+
      RD.stat('Other rule, same guesses',draws.slice(0,step).filter(d=>mode==='lev'?d.sac:d.lev).length+' of '+step,mode==='lev'?'sample and compare':'min(1, p/q)');
  }
  prep();
  const A=RD.anim({card:'sd-rule-card',ctl:'sd-rule-ctl',n:N+1,ms:1300,draw,label:'Guess'});
  SD.segs(document.getElementById('sd-rule-mode'),[['lev','min(1, p/q) with residual (the paper, vLLM)'],['sac','Sample the target, accept if equal (llama.cpp, mlx-lm)']],'lev',m=>{mode=m;A.redraw()});
  SD.segs(document.getElementById('sd-rule-pos'),P.map((p,i)=>[String(i),'…'+p.ctx.slice(-22)+' (α '+SD.fmt(p.a,2)+')']),'0',m=>{pi=+m;prep();A.reset(N+1)});
  RD.onResize(()=>A.redraw());
})();
