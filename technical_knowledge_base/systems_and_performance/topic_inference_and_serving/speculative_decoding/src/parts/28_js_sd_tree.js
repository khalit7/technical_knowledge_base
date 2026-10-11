// ---- Reading section 7: one position, a chain of 8 against a tree of 8 nodes (real draft and target, greedy) ----
(function(){
  const D=SD.D,T=D.tree,card=document.getElementById('sd-tree-card');if(!card||!T)return;
  const ex=T.examples;let mode='chain',ei=0;
  const nodes=()=>{const e=ex[ei];if(mode==='chain')return e.chain.map((t,i)=>({path:e.chain.slice(0,i+1),tok:t}));
    return e.tree8.map(n=>({path:n.path,tok:n.path[n.path.length-1],cp:n.cp,p:n.p}))};
  const matchLen=(path,g)=>{let m=0;while(m<path.length&&path[m]===g[m])m++;return m};
  function nsteps(){return Math.max(...nodes().map(n=>n.path.length))+2}
  function draw(step){const e=ex[ei],ns=nodes(),dmax=nsteps()-2,el=document.getElementById('sd-tree-svg');
    const W=Math.max(280,Math.min(860,SD.width(el))),verify=step>=dmax+1;
    const cols=dmax+1,cw=(W-10)/cols;const byD={};ns.forEach(n=>{(byD[n.path.length]=byD[n.path.length]||[]).push(n)});
    const rows=Math.max(1,...Object.values(byD).map(a=>a.length)),rh=30,H=24+rows*rh;
    const pos=new Map();
    Object.keys(byD).forEach(d=>byD[d].forEach((n,i)=>pos.set(n.path.join('\u0001'),[5+d*cw,24+i*rh+rh/2])));
    const root=[5+cw*0.45,24+rh/2];let s='<text x="'+root[0]+'" y="'+(root[1]+4)+'" text-anchor="middle" font-size="11" fill="var(--mute)">context</text>';
    const best=ns.reduce((m,n)=>Math.max(m,matchLen(n.path,e.g)===n.path.length?n.path.length:0),0);
    ns.forEach(n=>{if(n.path.length>step)return;const k=n.path.join('\u0001'),[x,y]=pos.get(k);
      const par=n.path.length===1?[root[0]+cw*0.4,root[1]]:pos.get(n.path.slice(0,-1).join('\u0001'));
      const on=verify&&matchLen(n.path,e.g)===n.path.length;const bad=verify&&!on;
      if(par)s+='<line x1="'+(par[0]+(n.path.length===1?0:cw*0.8))+'" y1="'+par[1]+'" x2="'+(x+cw*0.05)+'" y2="'+y+'" stroke="'+(on?'var(--good)':'var(--dim)')+'" stroke-width="'+(on?2.2:1.2)+'"/>';
      s+='<rect x="'+(x+cw*0.05)+'" y="'+(y-11)+'" width="'+(cw*0.75)+'" height="22" rx="5" fill="'+(on?'var(--open2)':'var(--soft)')+'" stroke="'+(on?'var(--good)':bad?'var(--bad)':'var(--line)')+'"/>'+
        '<text x="'+(x+cw*0.425)+'" y="'+(y+4)+'" text-anchor="middle" font-size="11">'+SD.esc(SD.vis(n.tok).slice(0,Math.max(3,Math.floor(cw/8))))+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="draft '+mode+'">'+s+'</svg>';
    const cap=document.getElementById('sd-tree-cap');
    if(step===0)cap.innerHTML='<div class="t">&hellip;'+SD.esc(e.context)+' &#9646;</div><p>The target\'s own next tokens here are '+SD.esc(SD.vis(e.g.slice(0,6).join('')))+'&hellip; The draft has to guess them; the target checks 8 candidate tokens in one pass.</p>';
    else if(!verify)cap.innerHTML='<div class="t">Drafting, depth '+step+'</div><p>'+(mode==='chain'?'The chain extends its single best guess one token at a time.':'The tree keeps the candidates with the highest cumulative draft probability, so it branches where the draft is unsure.')+'</p>';
    else cap.innerHTML='<div class="t">Verify: the target keeps the longest path it agrees with</div><p>'+(mode==='chain'?'Accepted '+e.match_chain+' of the chain\'s tokens.':'Accepted '+best+' tokens along the best branch.')+' Then it adds one token of its own.</p>';
    document.getElementById('sd-tree-cnt').innerHTML=RD.stat('Accepted, chain of 8',verify?String(Math.min(8,e.match_chain)):'?')+RD.stat('Accepted, tree of 8',verify?String(e.match_tree8):'?')+RD.stat('Tokens checked per pass','8');
  }
  const A=RD.anim({card:'sd-tree-card',ctl:'sd-tree-ctl',n:nsteps(),ms:1100,draw,label:'Step'});
  SD.segs(document.getElementById('sd-tree-mode'),[['chain','Chain of 8 (one guess, deep)'],['tree','Tree of 8 nodes (EAGLE-2 style)']],'chain',m=>{mode=m;A.reset(nsteps())});
  SD.segs(document.getElementById('sd-tree-ex'),ex.map((e,i)=>[String(i),'Example '+(i+1)+' ('+e.prompt+')']),'0',m=>{ei=+m;A.reset(nsteps())});
  RD.onResize(()=>A.redraw());
})();
