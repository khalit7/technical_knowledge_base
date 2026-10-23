// ---- Reading 3.4 and 3.6: a custom Function in the graph (static SVG); checkpoint variants on the whole model (SVG bars) ----
(function(){
const D=window.TDA, A=D.ag, U=window.TDAU, $=id=>document.getElementById(id);
const tx=(x,y,s,c,a)=>'<text x="'+x+'" y="'+y+'"'+(a?' text-anchor="'+a+'"':'')+(c?' class="'+c+'"':'')+'>'+s+'</text>';
const mk=(id,c)=>'<marker id="'+id+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="'+c+'"/></marker>';
// 3.4: the custom Function as one node
(function(){const el=$('tda-cfn');if(!el)return;
  const fw=[['MyGelu.apply(x)','enters through apply'],['forward(x)','runs with recording off'],['setup_context','ctx.save_for_backward(x)']];
  const bw=[['MyGeluBackward','one node = y.grad_fn'],['backward(ctx, g)','called by the engine'],['AccumulateGrad','writes x.grad']];
  function draw(){const W=RD.width(el), wide=W>=640, bh=44;let s='<defs>'+mk('tda-c-a','var(--acc)')+mk('tda-c-g','var(--good)')+'</defs>',H;
    const box=(x,y,w,[t,d],col,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+bh+'" rx="7" fill="'+(fill||'var(--bg)')+'" stroke="'+col+'" stroke-width="1.5"/>'+tx(x+8,y+18,t,'mono b')+tx(x+8,y+35,d,'m');
    const ar=(x1,y1,x2,y2,c)=>'<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" stroke="'+(c==='g'?'var(--good)':'var(--acc)')+'" stroke-width="1.6" fill="none" marker-end="url(#tda-c-'+c+')"/>';
    if(wide){const gap=26, bwid=(W-2*gap)/3;
      s+=tx(0,12,'forward','b');fw.forEach((b,i)=>{const x=i*(bwid+gap);s+=box(x,20,bwid,b,'var(--acc)');if(i)s+=ar(x-gap+2,42,x-2,42,'a')});
      s+=tx(0,96,'backward','b');[bw[2],bw[1],bw[0]].forEach((b,i)=>{const x=i*(bwid+gap);s+=box(x,104,bwid,b,i===2?'var(--acc)':'var(--good)',i===2?'var(--acc2)':'');if(i)s+=ar(x-2,126,x-gap+2,126,'g')});
      s+=ar(2*(bwid+gap)+bwid/2,66,2*(bwid+gap)+bwid/2,102,'a');H=150}
    else{const all=[...fw,...bw];all.forEach((b,i)=>{const y=i*(bh+16);s+=box(0,y,W,b,i<3?'var(--acc)':'var(--good)',i===3?'var(--acc2)':'');if(i)s+=ar(W/2,y-14,W/2,y-2,i<3?'a':'g')});H=all.length*(bh+16)-14}
    el.innerHTML=RD.svg(W,H,s,'How a custom autograd Function plugs into the graph')}
  RD.onRender(draw);RD.onResize(draw);draw();})();
// 3.6: checkpoint variants on the whole running example
(function(){const el=$('tda-ckbars');if(!el)return;const ck=A.checkpoint_variants;
  const vs=[['plain','plain'],['non-reentrant','non-reentrant'],['reentrant','reentrant']];
  const groups=[['live after forward',k=>ck[k].live_after_forward,v=>U.mb(v)],['aten calls in backward',k=>ck[k].backward_calls,v=>U.fmt(v)],['matmuls recomputed (addmm)',k=>ck[k].addmm_in_backward,v=>U.fmt(v)]];
  function draw(){const W=RD.width(el), lw=W<460?100:120, bw=W-lw-70, rh=22;let s='',y=0;
    groups.forEach(([g,f,fmt])=>{s+=tx(0,y+13,g,'b');y+=20;const mx=Math.max(1,...vs.map(([k])=>f(k)));
      vs.forEach(([k,l],i)=>{const v=f(k), w=Math.max(1,bw*v/mx);
        s+=tx(lw-8,y+15,l,'mono','end')+'<rect x="'+lw+'" y="'+(y+3)+'" width="'+w+'" height="'+(rh-7)+'" rx="3" fill="'+(i?'var(--c2)':'var(--c1)')+'"/>'+tx(lw+w+6,y+15,fmt(v),'b');y+=rh});y+=8});
    el.innerHTML=RD.svg(W,y,s,'Memory after forward, backward calls and recomputed matmuls for plain and checkpointed runs')}
  RD.onRender(draw);RD.onResize(draw);draw();})();
})();
