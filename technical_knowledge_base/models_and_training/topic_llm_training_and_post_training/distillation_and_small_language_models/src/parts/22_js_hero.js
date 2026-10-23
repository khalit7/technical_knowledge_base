// ---- Reading, hero: one position under the three training signals, from the toy's real teacher and student ----
(function(){
  const $=id=>document.getElementById(id);if(!$('heroG'))return;
  if(!DS.toy||!DS.toy.anim){$('heroF').textContent='Toy data not built yet.';return}
  const G=DS.toy.graph,A=DS.toy.anim,NM=G.names,EOS=G.n+1;
  const nm=v=>v===EOS?'end':v===G.n?'sep':NM[v];
  const tp=A.routes.teacher.pos[1],sr=A.routes.student,sp=sr.pos[7];
  const top=(d,k)=>Object.keys(d).map(Number).sort((a,b)=>d[b]-d[a]).slice(0,k);
  function bars(el,rows,col){
    const W=RD.width(el),rh=22,H=rows.length*rh+8,lw=46,vw=58,bw=Math.max(40,W-lw-vw);
    let s='';rows.forEach((r,i)=>{const y=4+i*rh;
      s+='<text x="'+(lw-6)+'" y="'+(y+14)+'" text-anchor="end" font-size="12"'+(r.b?' font-weight="700"':'')+'>'+r.n+'</text>';
      s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+bw+'" height="14" rx="3" fill="var(--soft)"/>';
      s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+Math.max(r.v>0?1.5:0,bw*r.v).toFixed(1)+'" height="14" rx="3" fill="var('+(r.c||col)+')"/>';
      s+='<text x="'+(lw+bw+6)+'" y="'+(y+14)+'" font-size="11.5">'+r.t+'</text>'});
    el.innerHTML=PF.svg(W,H,rows.map(r=>r.n+' '+r.t).join(', '),s);
  }
  const pc=v=>v<0.0001?'&lt;0.01%':v<0.01?PF.pct(v,2):PF.pct(v,0);
  const P=[
    {h:'Sequence-level: SFT on the teacher\'s text',s:'Teacher wrote '+NM[A.s]+' '+NM[tp.at]+' <b>'+nm(tp.next)+'</b>; the target at this position:',
      rows:()=>top(tp.t,4).map(k=>({n:nm(k),v:k===tp.next?1:0,t:k===tp.next?'100%':'0%',b:k===tp.next})),
      c:'One token. The teacher sampled '+nm(tp.next)+', but put '+PF.pct(tp.t[top(tp.t,1)[0]],0)+' on '+nm(top(tp.t,1)[0])+': that opinion is thrown away.'},
    {h:'Logit: the teacher\'s distribution, same text',s:'Same position, same teacher text; the target:',
      rows:()=>top(tp.t,4).map(k=>({n:nm(k),v:tp.t[k],t:pc(tp.t[k]),b:k===tp.next})),
      c:'Every next node the teacher rates, and how much: '+Object.keys(tp.t).length+' plausible continuations, not one, from the same text.'},
    {h:'On-policy: the teacher grades the student\'s text',s:'The student wrote its own route and is at '+NM[sp.at]+'; it chose <b>'+nm(sp.next)+'</b>. The teacher:',
      rows:()=>top(sp.t,3).concat(top(sp.t,3).includes(sp.next)?[]:[sp.next]).map(k=>({n:nm(k),v:sp.t[k]||0,t:pc(sp.t[k]||0),b:k===sp.next})),
      c:'The teacher would almost surely stop here ('+PF.pct(sp.t[EOS],0)+' on end); the student\'s '+nm(sp.next)+' gets a grade of '+sp.rkl.toFixed(2)+' nats of reverse KL, a state off-policy training never visits.'}
  ];
  $('heroG').innerHTML=P.map((p,i)=>'<div><div class="hh">'+(i+1)+'. '+p.h+'</div><div class="hs">'+p.s+'</div><div id="heroB'+i+'"></div><p class="hc">'+p.c+'</p></div>').join('');
  function draw(){P.forEach((p,i)=>bars($('heroB'+i),p.rows(),'--c1'))}
  $('heroF').innerHTML='Real numbers from this page\'s toy (routes on a 32-node graph, from '+NM[A.s]+' to '+NM[A.t]+'): teacher '+PF.comma(DS.toy.teacher.params)+' parameters, student '+PF.comma(DS.toy.student.params)+' at checkpoint "'+A.ckpt+'". Blue is the training target; orange is the student\'s own choice. Pruning, the third choice, is drawn in <a href="#s-prune">Prune, then distil</a>.';
  RD.onRender(draw);RD.onResize(draw);draw();
})();
