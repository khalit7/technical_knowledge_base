// ---- Reading section 5 (moved from the Training lab tab, 2026-10-24): exact cosines around one claim, frame by frame through the fine-tune ----
(function(){
  if(!document.getElementById('emb-tl-body'))return;
  const E=window.EMB,esc=RD.esc,lab=E.lab;
  const pend=document.getElementById('emb-tl-pend'),body=document.getElementById('emb-tl-body');
  if(!lab){pend.hidden=false;body.hidden=true;
    pend.innerHTML='<b>Pending run.</b> This lab is drawn from the tiny fine-tune\'s snapshots (the vectors of 72 fixed texts re-encoded every 4 training steps). The training script and this lab were built and tested on a CPU toy run; the real run needs the shared GPU and is waiting for a slot. Nothing is shown until it has run: the toy run\'s numbers would teach the wrong sizes.';return}
  if(lab.dev){pend.hidden=false;pend.innerHTML='<b>Development data.</b> These frames come from a CPU toy run (64 pairs, 8 steps) used only to build this lab; they are not a result.'}
  const arms=Object.keys(lab.arms),AN={inbatch:'in-batch negatives only',dense_f:'+ dense negatives, filtered'};
  const segEl=document.getElementById('emb-tl-arm');segEl.innerHTML=arms.map((a,i)=>'<button data-m="'+a+'"'+(i===0?' class="on"':'')+'>'+(AN[a]||a)+'</button>').join('');
  let arm=arms[0],gi=0;
  // one radial scale for every frame of every arm: from the lowest cosine seen (rounded down to 0.1) to 1
  let cmin=1;arms.forEach(a=>lab.arms[a].frames.forEach(fr=>fr.forEach(r=>r.forEach(c=>{if(c<cmin)cmin=c}))));cmin=Math.max(-1,Math.floor(cmin*10)/10);
  const rings=[];for(let c=Math.ceil(cmin*10)/10;c<0.999;c+=0.1)rings.push(+c.toFixed(1));
  const sel=document.getElementById('emb-tl-claim');
  lab.groups.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+lab.items[g.claim].text.slice(0,70);sel.appendChild(o)});
  const KC={pos:'var(--good)',neg:'var(--bad)',other:'var(--c1)',rand:'var(--mute)'};
  const KN={pos:'its labelled abstract',neg:'its 3 hardest unlabelled abstracts (starting model)',other:'the other 11 claims\' abstracts',rand:'12 random abstracts'};
  const svgEl=document.getElementById('emb-tl-svg');
  function angles(kinds){const n=kinds.length;const out=[];let k=0;
    // group by kind in a fixed order around the circle, the positive at the top
    const order=['pos','neg','other','rand'];const idx=[];order.forEach(kd=>kinds.forEach((x,i)=>{if(x===kd)idx.push(i)}));
    idx.forEach((i,j)=>{out[i]=-Math.PI/2+2*Math.PI*j/n});return out}
  function margin(fr,g){const c=fr;const p=c[0];let best=-2;g.kinds.forEach((k,j)=>{if(k!=='pos')best=Math.max(best,c[j])});return p-best}
  function draw(f){const A=lab.arms[arm];f=Math.min(f,A.frames.length-1);const g=lab.groups[gi],fr=A.frames[f][gi],f0=A.frames[0][gi];
    const W=Math.max(260,Math.min(RD.width(svgEl),440)),cx=W/2,cy=W/2,R=W/2-18;const ang=angles(g.kinds);
    const rad=c=>Math.min(1,Math.max(0,(1-c)/(1-cmin)))*R;let s='';
    rings.filter((c,i)=>rings.length<6||i%2===rings.length%2).forEach(c=>{s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+rad(c)+'" fill="none" stroke="var(--line)"/>'+RD.t(cx+3,cy-rad(c)+11,'cos '+c.toFixed(1),{fs:11,fill:'var(--mute)'})});
    g.kinds.forEach((k,j)=>{const x0=cx+rad(f0[j])*Math.cos(ang[j]),y0=cy+rad(f0[j])*Math.sin(ang[j]),x=cx+rad(fr[j])*Math.cos(ang[j]),y=cy+rad(fr[j])*Math.sin(ang[j]);
      if(f>0)s+='<line x1="'+x0.toFixed(1)+'" y1="'+y0.toFixed(1)+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+KC[k]+'" stroke-opacity=".45"/>';
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(k==='pos'?7:k==='neg'?5.5:4)+'" fill="'+KC[k]+'"><title>'+esc(lab.items[g.rel[j]].text.slice(0,120)+' | cosine '+fr[j].toFixed(3))+'</title></circle>'});
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="var(--ink)"/>';
    svgEl.innerHTML=RD.svg(W,W,s,'cosines around one claim');
    const m=margin(fr,g),m0=margin(f0,g);const step=A.steps[f],loss=A.loss[f];
    document.getElementById('emb-tl-cap').innerHTML='<b>'+esc(lab.items[g.claim].text)+'</b><br>'+(f===0?'Before training: the starting model.':'After '+step+' training steps ('+esc(AN[arm]||arm)+').')+' The labelled abstract is at cosine '+fr[0].toFixed(3)+(f>0?' (was '+f0[0].toFixed(3)+')':'')+'.';
    document.getElementById('emb-tl-ctr').innerHTML='<span>step <b>'+step+'</b></span>'+(loss!=null?'<span>training loss <b>'+loss.toFixed(3)+'</b></span>':'')+'<span>margin <b>'+(m>=0?'+':'')+m.toFixed(3)+'</b> (start '+(m0>=0?'+':'')+m0.toFixed(3)+')</span>';
    document.getElementById('emb-tl-key').innerHTML=Object.keys(KN).map(k=>'<div class="emb-it"><i style="background:'+KC[k]+'"></i>'+KN[k]+'</div>').join('')+
      '<div class="emb-it mute">'+g.kinds.map((k,j)=>[k,j]).filter(x=>x[0]==='neg').map(x=>'hard '+(x[1])+': cos '+fr[x[1]].toFixed(3)+' (was '+f0[x[1]].toFixed(3)+')').join('<br>')+'</div>';
    // all claims' margins at this frame
    const rows=lab.groups.map((gg,i)=>{const mm=margin(A.frames[f][i],gg);return {name:(i+1)+'. '+lab.items[gg.claim].text.slice(0,40),v:mm,txt:(mm>=0?'+':'')+mm.toFixed(3),color:mm>=0?'var(--good)':'var(--bad)',hl:i===gi}});
    const mxm=Math.max(0.05,...rows.map(r=>Math.abs(r.v)));
    document.getElementById('emb-tl-bars').innerHTML='<div class="bars">'+rows.map(r=>{const w=50*Math.abs(r.v)/mxm;return '<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</div><div class="track"><div style="position:absolute;left:50%;top:0;bottom:0;border-left:1px solid var(--mute)"></div><div class="fill" style="left:'+(r.v>=0?50:50-w).toFixed(1)+'%;width:'+w.toFixed(1)+'%;background:'+r.color+'"></div></div><div class="val">'+r.txt+'</div></div>'}).join('')+'</div>'}
  let an=null;
  function setN(){const n=lab.arms[arm].frames.length;if(an){const i=an.i;an.reset(n);an.go(Math.min(i,n-1))}}
  an=RD.anim({card:'emb-tl-body',ctl:'emb-tl-ctl',n:lab.arms[arm].frames.length,draw,ms:900,label:'Training snapshot'});
  RD.seg(segEl,v=>{arm=v;const i=an.i;setN();an.go(i)});
  sel.addEventListener('change',()=>{gi=+sel.value;an.redraw()});
  // runs table
  (function(){const t=document.getElementById('emb-tl-runs'),note=document.getElementById('emb-tl-note');
    if(!E.ft){t.innerHTML='<tr><td><span class="emb-pend">pending run</span> the table of all runs (6 arms &times; 3 seeds) appears here.</td></tr>';return}
    let h='<tr><th>arm</th><th class="num">seed</th><th class="num">steps</th><th class="num">SciFact nDCG@10</th><th class="num">NFCorpus nDCG@10</th><th class="num">training s</th></tr>';
    h+='<tr><td>starting model</td><td></td><td></td><td class="num">'+E.ft.base.scifact.ndcg10.toFixed(3)+'</td><td class="num">'+E.ft.base.nfcorpus.ndcg10.toFixed(3)+'</td><td></td></tr>';
    Object.keys(E.ft.arms).forEach(a=>E.ft.arms[a].forEach(r=>{h+='<tr><td>'+esc(a)+'</td><td class="num">'+r.seed+'</td><td class="num">'+r.steps+'</td><td class="num">'+r.scifact.toFixed(3)+'</td><td class="num">'+r.nfcorpus.toFixed(3)+'</td><td class="num">'+r.train_s+'</td></tr>'}));
    t.innerHTML=h;note.textContent='Measured on Apple M1 Pro (MPS); training time includes snapshot encoding.'})();
  RD.onResize(()=>an.redraw());
})();
