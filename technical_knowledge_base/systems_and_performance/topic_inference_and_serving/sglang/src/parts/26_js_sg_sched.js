// ---- Reading section 4: four queue policies on one queue, round by round (was the Scheduling lab tab) ----
(function(){
  const root=document.getElementById('sgs-anim-card'),rd=document.getElementById('t-read');if(!root||!window.SG)return;
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
  compute();
  A=RD.anim({card:'sgs-anim-card',ctl:'sgs-ctl',n:res[mode].rounds.length+1,draw:draw,ms:1200,label:'Round'});
  ['sgs-nq','sgs-nd','sgs-dl','sgs-cap','sgs-seed'].forEach(id=>$(id).addEventListener('input',()=>compute()));
  RD.seg($('sgs-mode'),m=>{mode=m;A.reset(res[m].rounds.length+1)});
  RD.onResize(()=>A.redraw());
})();
