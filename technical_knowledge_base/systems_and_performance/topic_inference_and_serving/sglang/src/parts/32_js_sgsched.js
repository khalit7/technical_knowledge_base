// ---- Scheduling lab (t-sgsched) ----
(function(){
  const root=document.getElementById('t-sgsched');if(!root||!window.SG)return;
  const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('en-US');
  const POL=['fcfs','lpm','dfs-weight','random'];let mode='fcfs',res=null,A=null,trace=null,prm=null;
  const col=d=>'hsl('+Math.round((d*360/Math.max(1,prm.nd))+15)%360+',62%,52%)';
  function params(){return {nq:+$('sgs-nq').value,nd:+$('sgs-nd').value,dl:+$('sgs-dl').value,cap:+$('sgs-cap').value,seed:+$('sgs-seed').value}}
  function compute(){prm=params();$('sgs-nqv').textContent=prm.nq;$('sgs-ndv').textContent=prm.nd;$('sgs-dlv').textContent=fmt(prm.dl)+' tokens';$('sgs-seedv').textContent=prm.seed;
    const minCap=prm.dl+80+80;if(prm.cap<minCap){prm.cap=Math.ceil(minCap/500)*500;$('sgs-cap').value=prm.cap}
    $('sgs-capv').textContent=fmt(prm.cap)+' tokens (about '+(prm.cap/(prm.dl+50)).toFixed(1)+' documents)';
    trace=SG.ragTrace(prm.nd,prm.dl,prm.nq,5);const byId=new Map(trace.map(q=>[q.id,q]));
    const docIds=d=>{const q={g:d,S:prm.dl,conv:0};return SG.tokens({g:d,S:prm.dl,conv:0,P:prm.dl},prm.dl)};
    const docs=[];for(let d=0;d<prm.nd;d++)docs.push(docIds(d));
    res={};for(const p of POL){res[p]=SG.schedRun(trace,prm.cap,p,prm.seed,prm.seed,t=>docs.map(ids=>t.peek(ids)/prm.dl));res[p].byId=byId}
    let h='';const best=Math.max(...POL.map(p=>res[p].hit_tokens));
    for(const p of POL){const r=res[p],v=100*r.hit_tokens/r.prompt_tokens;
      h+='<div class="row'+(r.hit_tokens===best?' hl':'')+'"><div class="nm">'+p+(p==='fcfs'?' (default)':'')+'<span class="ml">'+r.rounds.length+' rounds, '+fmt(r.prefill_tokens)+' computed'+(p==='lpm'&&prm.nq>128?'; off while &gt;128 wait':'')+'</span></div><div class="track"><div class="fill" style="width:'+v.toFixed(1)+'%;background:var(--acc)"></div></div><div class="val">'+v.toFixed(1)+'%</div></div>'}
    h='<p class="small">Share of prompt tokens served from the cache:</p>'+h;
    $('sgs-bars').innerHTML=h;
    if(A)A.reset(res[mode].rounds.length+1);}
  function draw(i){if(!res)return;const r=res[mode],el=$('sgs-svg'),w=RD.width(el);const n=prm.nq,cols=Math.max(8,Math.floor((w-4)/13)),cell=Math.min(12,(w-4)/cols-1);
    if(i===0){el.innerHTML=RD.svg(w,40,RD.t(4,24,'Before round 1: '+n+' questions waiting, nothing cached.',{fs:12}),'');$('sgs-cap-t').innerHTML='<div class="t">'+mode+'</div><p>Press play or step forward.</p>';$('sgs-cnt').innerHTML='';return}
    const rd=r.rounds[i-1],adm=new Set(rd.admitted),rowsQ=Math.ceil(rd.wait.length/cols),hq=rowsQ*(cell+1)+6,hd=prm.nd*14+20,h=hq+hd+20;let b='';
    rd.wait.forEach((id,k)=>{const q=r.byId.get(id),x=2+(k%cols)*(cell+1),y=2+Math.floor(k/cols)*(cell+1);
      b+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+cell.toFixed(1)+'" height="'+cell.toFixed(1)+'" fill="'+col(q.g)+'" opacity="'+(adm.has(id)?1:0.45)+'"'+(adm.has(id)?' stroke="var(--ink)" stroke-width="1.5"':'')+'><title>question '+id+', document '+(q.g+1)+'</title></rect>'});
    const y0=hq+16;b+=RD.t(2,y0-4,'Cached share of each document after the round',{fs:10.5,fill:'var(--mute)'});
    const bwid=w-60;rd.snap.forEach((f,d)=>{const y=y0+d*14;b+=RD.t(2,y+10,'doc '+(d+1),{fs:10,fill:'var(--mute)'})+'<rect x="44" y="'+y+'" width="'+bwid+'" height="10" fill="var(--soft)"/><rect x="44" y="'+y+'" width="'+(bwid*f).toFixed(1)+'" height="10" fill="'+col(d)+'"/>'});
    el.innerHTML=RD.svg(w,h,b,'Queue order and cached documents');
    let cumH=0,cumP=0;for(let k=0;k<i;k++){cumH+=r.rounds[k].hit;cumP+=r.rounds[k].prefill}
    const docsAdm=new Set(rd.admitted.map(id=>r.byId.get(id).g));
    $('sgs-cap-t').innerHTML='<div class="t">Round '+i+' of '+r.rounds.length+': '+rd.admitted.length+' admitted, '+docsAdm.size+' document'+(docsAdm.size>1?'s':'')+'</div><p>'+(mode==='fcfs'?'Arrival order: whatever document comes next.':mode==='lpm'?(rd.wait.length>128?'More than 128 waiting: lpm falls back to arrival order this round.':'Longest cached prefix first; questions sharing an uncached document wait behind the first of them (in-batch prefix caching).'):mode==='dfs-weight'?'Depth first through the tree, the subtree with most waiting questions first.':'A seeded shuffle.')+' This round reused '+fmt(rd.hit)+' tokens and computed '+fmt(rd.prefill)+'.</p>';
    $('sgs-cnt').innerHTML=RD.stat('Waiting',rd.wait.length)+RD.stat('Reused so far',fmt(cumH))+RD.stat('Computed so far',fmt(cumP))+RD.stat('Reuse so far',(100*cumH/Math.max(1,cumH+cumP)).toFixed(1)+'%')}
  function tabAnim(){// same controller as the Reading tab's, registered on this tab
    const card=$('sgs-anim-card'),ctl=$('sgs-ctl');const st={i:0,n:res[mode].rounds.length+1,play:false,timer:0,spd:1};
    ctl.innerHTML='<button id="sgs-ctl-b" aria-label="Previous round">&#9664;&#9664;</button><button id="sgs-ctl-p" class="an-play" aria-label="Play">&#9654; Play</button><button id="sgs-ctl-f" aria-label="Next round">&#9654;&#9654;</button><input type="range" id="sgs-ctl-s" min="0" max="'+(st.n-1)+'" value="0" aria-label="Round"><label class="small">Speed <select id="sgs-ctl-v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const show=()=>{$('sgs-ctl-s').max=st.n-1;$('sgs-ctl-s').value=st.i;draw(st.i)};
    const live=()=>!root.hidden&&!document.hidden;
    const tick=()=>{st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setP(false);return}st.i++;show();st.timer=setTimeout(tick,1200/st.spd)};
    const setP=p=>{st.play=p;$('sgs-ctl-p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p){if(st.i>=st.n-1){st.i=0;show()}if(!st.timer)st.timer=setTimeout(tick,1200/st.spd)}};
    $('sgs-ctl-p').addEventListener('click',()=>setP(!st.play));
    $('sgs-ctl-f').addEventListener('click',()=>{setP(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('sgs-ctl-b').addEventListener('click',()=>{setP(false);st.i=Math.max(0,st.i-1);show()});
    $('sgs-ctl-s').addEventListener('input',e=>{setP(false);st.i=+e.target.value;show()});
    $('sgs-ctl-v').addEventListener('change',e=>{st.spd=+e.target.value});
    document.addEventListener('visibilitychange',()=>{if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,1200/st.spd)});
    show();return {reset(n){setP(false);st.n=n;st.i=0;show()},redraw(){show()},play(){if(!RD.RM)setP(true)}}}
  let started=false;
  function render(){if(root.hidden)return;if(!res)compute();if(!A)A=tabAnim();else A.redraw();m1();
    if(SGD&&SGD.check_sched)$('sgs-checked').textContent=SGD.check_sched.orders_checked.toLocaleString('en-US')+' queue orderings and prefix matches, '+SGD.check_sched.mismatches+' mismatches';
    if(!started){started=true;A.play()}}
  function m1(){const m=window.SGD&&SGD.m1&&SGD.m1.sched,el=$('sgs-m1');if(!m){el.innerHTML='<p class="small">Real-engine runs pending.</p>';return}
    let h='<p class="small">SGLang v0.5.21 on the M1 Pro (MLX backend, Qwen3-0.6B 4-bit): 64 questions of 40 tokens about 8 documents of 800 tokens, sent at once in one shuffled order, 16 output tokens each, at most 8 running; KV pool 24,000 tokens, roomy because this backend crashed whenever the tree had to evict, so the policies differ only by in-batch sharing here; two runs per policy where the server survived, restarted for each. <span class="meas">measured on Apple M1 Pro</span></p><div class="tw"><table><thead><tr><th>Policy</th><th class="num">Prompt tokens from cache</th><th class="num">Batch time, s (min to max)</th><th class="num">Mean TTFT, s</th></tr></thead><tbody>';
    for(const p of POL){const r=m[p];h+='<tr><td>'+p+'</td><td class="num">'+r.cached_pct.toFixed(1)+'% ('+r.cached_min.toFixed(1)+' to '+r.cached_max.toFixed(1)+')</td><td class="num">'+r.makespan.toFixed(1)+' ('+r.makespan_min.toFixed(1)+' to '+r.makespan_max.toFixed(1)+')</td><td class="num">'+r.ttft_mean.toFixed(2)+'</td></tr>'}
    el.innerHTML=h+'</tbody></table></div><p class="small">The isolated model above admits a whole round under a token budget rather than 8 requests at a time, so it does not reproduce these digits; compare the direction only.</p>'}
  ['sgs-nq','sgs-nd','sgs-dl','sgs-cap','sgs-seed'].forEach(id=>$(id).addEventListener('input',()=>{compute();draw(0)}));
  RD.seg($('sgs-mode'),m=>{mode=m;if(A){A.reset(res[m].rounds.length+1);A.play()}});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sgsched']=[render];
  addEventListener('resize',()=>{if(!root.hidden&&A){clearTimeout(root._t);root._t=setTimeout(()=>A.redraw(),80)}});
})();
