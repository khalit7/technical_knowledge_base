// ---- Vision lab: zero-shot classifier on Fashion-MNIST, prompt sets, confusion, linear probes, failure probes ----
(function(){
  const V=window.VS,D=V.D,$=V.$;if(!$('vs-zq'))return;
  const C=D.classes,MN={clip:'CLIP B/32',siglip:'SigLIP 2 B/16'};
  const TPL=D.prompt_sets.templates,NAMES=D.prompt_sets.names;
  const TK=Object.keys(TPL).concat(['ensemble']);
  const tlabel=t=>t==='ensemble'?'average of the five templates':'&#8220;'+V.esc(TPL[t]).replace('{}','&#8230;')+'&#8221;';
  // ---------------- query (cosines stored as int16, x 10,000)
  const QC={};const qcos=(w,k)=>{const id=w+k;if(!QC[id]){const b=atob(D.models[w].query_cos[k]),a=new Float64Array(b.length/2);
    for(let i=0;i<a.length;i++){let v=b.charCodeAt(2*i)|(b.charCodeAt(2*i+1)<<8);if(v>32767)v-=65536;a[i]=v/10000}QC[id]=Array.from(a)}return QC[id]};
  const zq={w:'clip',names:'official',tpl:'photo',q:0};
  V.seg($('vs-zq-m'),[['clip','CLIP B/32'],['siglip','SigLIP 2 B/16']],'clip',v=>{zq.w=v;drawZQ()});
  V.seg($('vs-zq-n'),[['official','official names'],['official_lower','official, lowercased'],['plain','plain names']],'official',v=>{zq.names=v;drawZQ()});
  const tsel=$('vs-zq-t');tsel.innerHTML=TK.map(t=>'<option value="'+t+'"'+(t==='photo'?' selected':'')+'>'+(t==='ensemble'?'average of the five templates':TPL[t].replace('{}','<class>').replace(/</g,'&lt;'))+'</option>').join('');
  tsel.addEventListener('change',()=>{zq.tpl=tsel.value;drawZQ()});
  $('vs-zq-g').innerHTML=D.query.uris.map((u,i)=>'<button class="vs-q'+(i===0?' on':'')+'" data-i="'+i+'" aria-label="test image of class '+V.esc(C[D.query.labels[i]])+'"><img src="'+u+'" alt="" width="34" height="34"></button>').join('');
  $('vs-zq-g').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{zq.q=+b.dataset.i;$('vs-zq-g').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));drawZQ()}));
  function drawZQ(){
    const m=D.models[zq.w],key=zq.names+'|'+zq.tpl,cos=qcos(zq.w,key).slice(zq.q*10,zq.q*10+10),p=V.softmax(cos.map(x=>m.scale*x+(m.bias||0)));
    const y=D.query.labels[zq.q],pred=cos.indexOf(Math.max(...cos)),mx=Math.max(...p);
    $('vs-zq-b').innerHTML=C.map((c,k)=>'<div class="row'+(k===y?' hl':'')+'"><span class="nm">'+V.esc(NAMES[zq.names][k])+(k===y?' (true)':'')+'</span><span class="track"><span class="fill" style="width:'+(100*p[k]/mx).toFixed(1)+'%;background:'+(k===pred?(k===y?'var(--good)':'var(--bad)'):'var(--dim)')+'"></span></span><span class="val">'+V.pct(p[k])+'</span></div>').join('');
    $('vs-zq-o').innerHTML='Prediction: <b>'+V.esc(NAMES[zq.names][pred])+'</b> ('+(pred===y?'right':'wrong; the label is '+V.esc(C[y]))+'). The ten texts were '+(zq.tpl==='ensemble'?'the average of five templates':'&#8220;'+V.esc(TPL[zq.tpl].replace('{}',NAMES[zq.names][0]))+'&#8221;, &#8230;')+'. This prompt set scores <b>'+V.pct(m.acc[key])+'</b> on all 10,000 test images with '+MN[zq.w]+'. Bars: softmax of '+m.scale+' &#215; cosine'+(m.bias!=null?' + bias':'')+' over the ten classes.';
  }
  // ---------------- accuracy table
  function drawZA(){
    const keys=[];['official','official_lower','plain'].forEach(n=>TK.forEach(t=>keys.push(n+'|'+t)));
    const best={clip:D.models.clip.best,siglip:D.models.siglip.best};
    let h='<table><thead><tr><th>Class names</th><th>Template</th><th class="num">CLIP B/32</th><th class="num">SigLIP 2 B/16</th></tr></thead><tbody>';
    keys.forEach(k=>{const [n,t]=k.split('|');h+='<tr><td>'+n.replace('_lower',', lowercased')+'</td><td>'+tlabel(t)+'</td>'+['clip','siglip'].map(w=>'<td class="num"'+(best[w]===k?' style="font-weight:600;color:var(--good)"':'')+'>'+V.pct(D.models[w].acc[k])+'</td>').join('')+'</tr>'});
    $('vs-za').innerHTML=h+'</tbody></table>';
  }
  // ---------------- confusion
  const zc={w:'clip',k:'best'};
  V.seg($('vs-zc-m'),[['clip','CLIP B/32'],['siglip','SigLIP 2 B/16']],'clip',v=>{zc.w=v;drawZC()});
  V.seg($('vs-zc-k'),[['best','its best prompt set'],['official|bare','bare official names']],'best',v=>{zc.k=v;drawZC()});
  function drawZC(){const m=D.models[zc.w],k=zc.k==='best'?m.best:zc.k,M=m.confusion[k];
    let h='<table class="vs-cf"><thead><tr><th>true &#8595; / predicted &#8594;</th>'+C.map((c,j)=>'<th title="'+V.esc(c)+'">'+j+'</th>').join('')+'<th class="num">right</th></tr></thead><tbody>';
    M.forEach((r,i)=>{const s=r.reduce((p,q)=>p+q,0);h+='<tr><th>'+i+' '+V.esc(C[i])+'</th>'+r.map((v,j)=>'<td style="background:'+(i===j?V.seq(v/s):V.div(-v/s*2))+'">'+v+'</td>').join('')+'<td class="num">'+V.pct(r[i]/s,0)+'</td></tr>'});
    $('vs-zc').innerHTML=h+'</tbody></table>';
    const [n,t]=k.split('|');$('vs-zc-cap').innerHTML='Counts out of 1,000 test images per class; '+MN[zc.w]+' with '+n.replace('_lower',', lowercased')+' names and '+tlabel(t)+' ('+V.pct(m.acc[k])+' overall). Blue diagonal: right; orange: where the errors go.';
  }
  // ---------------- zero-shot against linear probes
  function drawZP(){const ks=['1','4','16','64','500'];let h='';
    ['clip','siglip'].forEach(w=>{const m=D.models[w];h+='<div class="band">'+MN[w]+'</div>';
      const rows=[['zero-shot, best prompt set',m.acc[m.best],null]].concat(ks.map(k=>['linear probe, '+k+' labelled per class',m.lp[k].mean,m.lp[k]]));
      h+=rows.map(r=>'<div class="row"><span class="nm">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]).toFixed(1)+'%;background:'+(r[2]?'var(--acc)':'var(--c2)')+'"></span>'+(r[2]&&r[2].draws>1?'<span class="vs-rng" style="left:'+(100*r[2].min).toFixed(1)+'%;width:'+(100*(r[2].max-r[2].min)).toFixed(1)+'%"></span>':'')+'</span><span class="val">'+V.pct(r[1])+'</span></div>').join('')});
    h+='<div class="band">Reference</div><div class="row"><span class="nm">small CNN trained from scratch, 2 min</span><span class="track"><span class="fill" style="width:'+(100*D.fmclf).toFixed(1)+'%;background:var(--c3)"></span></span><span class="val">'+V.pct(D.fmclf,2)+'</span></div>';
    $('vs-zp').innerHTML=h}
  // ---------------- failure probes: typographic before/after animation
  const P=D.probes,ty=P.typo;const TYN=['no sticker','sticker CAT','sticker DOG','sticker BIRD','sticker CAR','small DOG sticker','large DOG sticker'];
  let tyView='prob';V.seg($('vs-ty-v'),[['prob','probabilities'],['cos','cosines']],'prob',v=>{tyView=v;TA.redraw()});
  function tyDraw(i){const im=ty.images[i];let h='<div class="vs-tyimg"><img src="'+D.probe_uris[im]+'" alt="'+TYN[i]+'" width="112" height="112"><div class="small mute">'+TYN[i]+'</div></div><div class="vs-tyb">';
    ['clip','siglip'].forEach(w=>{const m=D.models[w],cs=m.probes.typo[i],p=V.softmax(cs.map(x=>m.scale*x+(m.bias||0)));const win=cs.indexOf(Math.max(...cs));
      const v=tyView==='prob'?p:cs,mx=tyView==='prob'?1:Math.max(...D.models[w].probes.typo.flat());
      h+='<div class="band">'+MN[w]+(win===0?' &#183; still says cat':' &#183; <span style="color:var(--bad)">flips to '+ty.texts[win].replace('a photo of a ','')+'</span>')+'</div><div class="bars">'+ty.texts.map((t,k)=>'<div class="row"><span class="nm">'+V.esc(t.replace('a photo of ',''))+'</span><span class="track"><span class="fill" style="transition:width .5s;width:'+(100*v[k]/mx).toFixed(1)+'%;background:'+(k===win?(k===0?'var(--good)':'var(--bad)'):'var(--dim)')+'"></span></span><span class="val">'+(tyView==='prob'?V.pct(v[k]):v[k].toFixed(4))+'</span></div>').join('')+'</div>'});
    $('vs-ty-s').innerHTML=h+'</div>';
    $('vs-ty-cap').innerHTML='<b>Step '+(i+1)+' of '+ty.images.length+': '+TYN[i]+'.</b> '+(i===0?'The plain photo: both models pick &#8220;a photo of a cat&#8221;.':i===1?'A control: a sticker with the right word. Any change from the plain photo is the sticker itself.':'The same cat with a sticker. The four texts are scored against the same image embedding; the probability is the model&#8217;s own softmax over these four texts at its learned scale'+(tyView==='prob'?'':' (here the raw cosines)')+'.')}
  const TA=V.anim({card:'vs-ty',ctl:'vs-ty-ctl',n:ty.images.length,draw:tyDraw,ms:2200,label:'Typographic probe step'});
  // ---------------- counting, left/right, binding
  function drawPR(){let h='';
    [['count','Counting: 1 to 6 red circles; texts &#8220;a photo of one red circle&#8221; &#8230; &#8220;six red circles&#8221;'],['spatial','Left and right: the same scene and its mirror image'],['bind','Attribute binding: which shape has which colour']].forEach(([g,t])=>{
      const p=P[g];h+='<h4 class="vs-h4">'+t+'</h4><div class="tw"><table><thead><tr><th>Image</th><th>Right text</th>'+['clip','siglip'].map(w=>'<th>'+MN[w]+' picks</th>').join('')+'</tr></thead><tbody>';
      p.images.forEach((im,i)=>{h+='<tr><td><img src="'+D.probe_uris[im]+'" alt="" width="44" height="44" class="vs-pimg"></td><td>'+V.esc(p.texts[p.truth[i]])+'</td>'+['clip','siglip'].map(w=>{const cs=D.models[w].probes[g][i],win=cs.indexOf(Math.max(...cs)),ok=win===p.truth[i];
        const srt=cs.slice().sort((a,b)=>b-a);return '<td style="color:'+(ok?'var(--good)':'var(--bad)')+'">'+(ok?'&#10003; ':'&#10007; ')+V.esc(p.texts[win])+' <span class="mute small">(margin '+(srt[0]-srt[1]).toFixed(4)+')</span></td>'}).join('')+'</tr>'});
      const sc=w=>p.images.reduce((s,_,i)=>{const cs=D.models[w].probes[g][i];return s+(cs.indexOf(Math.max(...cs))===p.truth[i]?1:0)},0);
      h+='</tbody></table></div><p class="small mute">Right: CLIP '+sc('clip')+' of '+p.images.length+', SigLIP 2 '+sc('siglip')+' of '+p.images.length+(g==='count'?' (chance 1 in 6 per image)':' (chance 1 in 2 per image)')+'. Margin: cosine of the pick minus the runner-up.</p>'});
    $('vs-pr').innerHTML=h}
  V.onRender(()=>{drawZQ();drawZA();drawZC();drawZP();drawPR()});
})();
