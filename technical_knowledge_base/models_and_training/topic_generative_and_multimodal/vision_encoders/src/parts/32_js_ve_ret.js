// ---- Retrieval tab (t-veret) ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU,NB=VE.nb,TQ=VE.textq,C=U.CLASSES,lab=NB.labels;
  const ENC=['clip','siglip','dino_cls','mae_mean'];
  const idx={},cos={};ENC.forEach(w=>{idx[w]=new Uint16Array(U.u8(NB.idx[w]).buffer);cos[w]=U.u8(NB.cos[w])});
  // text to image
  const opts=TQ.queries.map((q,i)=>'<option value="t'+i+'">'+E(q)+'</option>').join('')+TQ.cased.map((q,i)=>'<option value="c'+i+'">'+E(q)+' (SigLIP 2, capitals kept)</option>').join('');
  $('vr-q').innerHTML=opts;
  function hit(g,ok,label,extra){return '<div class="hit '+(ok==null?'':ok?'ok':'no')+'" data-g="'+g+'" title="'+E(C[lab[g]])+'">'+U.thumb(g,52)+'<span>'+label+'</span>'+(extra||'')+'</div>'}
  function drawT(){const v=$('vr-q').value,cased=v[0]==='c',i=+v.slice(1);let h='';
    const rows=cased?[['siglip',TQ.siglip_cased[i],'SigLIP 2, capitals kept']]:[['clip',TQ.clip[i],'CLIP B/32'],['siglip',TQ.siglip[i],'SigLIP 2 B/16 (lowercased)']];
    const want=cased?[7,8,3][i]:TQ.query_class[i];
    rows.forEach(([w,r,name])=>{h+='<div class="rr"><div class="nm">'+name+(r.p10!=null?'<small>over 10,000: P@10 '+U.pct(r.p10,0)+', P@100 '+U.pct(r.p100,0)+'</small>':'<small>no single class named</small>')+'</div><div class="hits">'+
      r.top.map((g,k)=>hit(g,want==null?null:lab[g]===want,r.cos[k].toFixed(3))).join('')+'</div></div>'});
    $('vr-t').innerHTML=h;
    $('vr-tnote').innerHTML='Cosines are not comparable across the two models (CLIP\'s matching pairs sit near 0.3, SigLIP 2\'s lower). '+(want==null?'This query names no Fashion-MNIST class, so nothing is outlined.':'Outline: the class the query names ('+E(C[want])+').')+' Script <code>src/runs/textq.py</code>.'}
  $('vr-q').addEventListener('change',drawT);
  // image to image
  let cls=0,qi=0;
  $('vr-cls').innerHTML=C.map((c,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+E(c)+'</button>').join('');
  function drawI(){const g=cls*100+qi;$('vr-iv').textContent=qi+1;$('vr-qthumb').innerHTML=U.thumb(g,56)+' <span class="small mute">query: '+E(C[lab[g]])+', test image '+NB.gallery_test_idx[g]+'</span>';
    let h='';ENC.forEach(w=>{const nn=[...idx[w].subarray(g*8,g*8+8)],cc=[...cos[w].subarray(g*8,g*8+8)],ok=nn.filter(n=>lab[n]===lab[g]).length;
      h+='<div class="rr"><div class="nm">'+U.ENC[w]+'<small>'+ok+' of 8 same class</small></div><div class="hits">'+nn.map((n,k)=>hit(n,lab[n]===lab[g],(cc[k]/250).toFixed(2))).join('')+'</div></div>'});
    $('vr-i2i').innerHTML=h;
    $('vr-inote').innerHTML='Over the whole 1,000-image gallery, the share of the 8 nearest neighbours with the query\'s class: '+ENC.map(w=>U.ENC[w]+' '+U.pct(NB.gallery_p8[w])).join(', ')+' <span class="meas">measured</span>. Script <code>src/runs/probes.py</code>.'}
  RD.seg($('vr-cls'),m=>{cls=+m;drawI()});
  $('vr-i').addEventListener('input',e=>{qi=+e.target.value;drawI()});
  $('t-veret').addEventListener('click',ev=>{const h=ev.target.closest('.hit');if(!h)return;const g=+h.dataset.g;cls=Math.floor(g/100);qi=g%100;$('vr-i').value=qi;
    $('vr-cls').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.m===cls));drawI();$('vr-i2i').scrollIntoView({block:'nearest'})});
  // tables
  const PR=VE.probes.encoders;
  $('vr-tab').innerHTML='<table><thead><tr><th>Encoder</th><th class="num">Image to image P@1</th><th class="num">P@10</th><th class="num">P@100</th><th class="num">mAP</th><th class="num">Text to image P@10</th><th class="num">P@100</th><th class="num">mAP</th></tr></thead><tbody>'+
    ['clip','siglip','dino_cls','dino_mean','mae_cls','mae_mean'].map(k=>{const r=PR[k],t=r.txt2img;return '<tr><td>'+U.ENC[k]+'</td><td class="num">'+U.pct(r.img2img['p@1'])+'</td><td class="num">'+U.pct(r.img2img['p@10'])+'</td><td class="num">'+U.pct(r.img2img['p@100'])+'</td><td class="num">'+U.pct(r.img2img.map)+'</td>'+
      (t?'<td class="num">'+U.pct(t['p@10'])+'</td><td class="num">'+U.pct(t['p@100'])+'</td><td class="num">'+U.pct(t.map)+'</td>':'<td class="num mute" colspan="3">no text tower</td>')+'</tr>'}).join('')+'</tbody></table>';
  const PUB=[['CLIP',68.3,33.1,52.4,62.1,81.9],['SigLIP',76.2,47.2,64.5,77.9,89.6],['SigLIP 2',78.2,52.1,68.9,80.7,93.0]];
  $('vr-pub').innerHTML='<table><thead><tr><th>Model (B/16, 224)</th><th class="num">ImageNet zero-shot</th><th class="num">COCO T&rarr;I</th><th class="num">COCO I&rarr;T</th><th class="num">Flickr T&rarr;I</th><th class="num">Flickr I&rarr;T</th></tr></thead><tbody>'+
    PUB.map(r=>'<tr><td>'+r[0]+'</td>'+r.slice(1).map(v=>'<td class="num">'+v.toFixed(1)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  RD.onRender(()=>{drawT();drawI()},'t-veret');drawT();drawI();
})();
