// ---- the toy graph in 2D (used by the Distil a toy student tab) ----
window.TOYG=(function(){
  // draw the toy graph; opts: {route:[nodes], upto:k, s, t, bad:Set of step indices with no edge, cur:node}
  function draw(el,G,o){
    const W=RD.width(el),H=Math.round(Math.min(340,Math.max(220,W*0.78))),pad=16;
    const X=x=>pad+x*(W-2*pad),Y=y=>pad+y*(H-2*pad);
    let s='';
    G.edges.forEach(([a,b])=>{s+='<line x1="'+X(G.xy[a][0])+'" y1="'+Y(G.xy[a][1])+'" x2="'+X(G.xy[b][0])+'" y2="'+Y(G.xy[b][1])+'" stroke="var(--line)" stroke-width="1.5"/>'});
    (o.paths||[]).forEach(pth=>{let prev=pth.from;pth.route.forEach((v,i)=>{if(i>=pth.upto)return;const bad=pth.bad&&pth.bad.has(i);
      s+='<line x1="'+X(G.xy[prev][0])+'" y1="'+Y(G.xy[prev][1])+'" x2="'+X(G.xy[v][0])+'" y2="'+Y(G.xy[v][1])+'" stroke="var('+(bad?'--bad':pth.col)+')" stroke-width="'+(pth.w||3.5)+'" stroke-linecap="round"'+(bad?' stroke-dasharray="5 4"':'')+' opacity="'+(pth.op||1)+'"/>';prev=v})});
    for(let i=0;i<G.n;i++){const isS=i===o.s,isT=i===o.t,isC=i===o.cur;
      s+='<circle cx="'+X(G.xy[i][0])+'" cy="'+Y(G.xy[i][1])+'" r="'+(isS||isT?10:8)+'" fill="'+(isS?'var(--c3)':isT?'var(--c4)':'var(--bg)')+'" stroke="'+(isC?'var(--acc)':'var(--mute)')+'" stroke-width="'+(isC?3:1)+'"/>';
      s+='<text x="'+X(G.xy[i][0])+'" y="'+(Y(G.xy[i][1])+3.5)+'" text-anchor="middle" font-size="9.5" fill="'+(isS||isT?'var(--bg)':'var(--ink)')+'">'+G.names[i]+'</text>'}
    el.innerHTML=PF.svg(W,H,o.label||'The toy graph',s);
  }
  return {draw};
})();
