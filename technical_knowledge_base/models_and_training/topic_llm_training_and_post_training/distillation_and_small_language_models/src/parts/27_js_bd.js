// ---- Reading, prune then distil: token budgets on a log axis, with each paper's ratio recomputed ----
(function(){
  const $=id=>document.getElementById(id);if(!$('bd'))return;
  const B=DS.bud;let sel=0;
  const lg=v=>Math.log10(v);
  function draw(){
    const el=$('bdSvg'),W=RD.width(el),narrow=W<520,lw=narrow?0:170,r=12,top=20,rh=narrow?40:26;
    const x0=lw+6,pw=W-x0-r,lo=lg(10),hi=lg(30000),X=v=>x0+pw*(lg(Math.max(10,v))-lo)/(hi-lo);
    const H=top+B.length*rh+22;let s='';
    [10,100,1000,10000].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(top-6)+'" y2="'+(H-18)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-5)+'" text-anchor="middle" fill="var(--mute)" font-size="10.5">'+PF.tokB(v)+' tokens</text>'});
    B.forEach((b,i)=>{const y=top+i*rh+(narrow?14:0),hb=narrow?12:14,on=i===sel;
      if(narrow)s+='<text x="'+x0+'" y="'+(y-3)+'" font-size="11" font-weight="'+(on?700:400)+'">'+RD.esc(b.student)+'</text>';
      else s+='<text x="'+(lw)+'" y="'+(y+11)+'" text-anchor="end" font-size="11.5" font-weight="'+(on?700:400)+'">'+RD.esc(b.student)+'</text>';
      if(b.teacher_tok)s+='<rect x="'+x0+'" y="'+(y+2)+'" width="'+(X(b.teacher_tok)-x0)+'" height="'+(hb-4)+'" fill="var(--dim)" rx="2"/>';
      const hiT=b.tok2||b.tok,col=b.id==='sheared'?'--c3':'--c1';
      s+='<rect x="'+x0+'" y="'+y+'" width="'+(X(hiT)-x0)+'" height="'+hb+'" fill="var('+col+')" rx="2" opacity="'+(on?1:.85)+'"/>';
      if(b.tok2)s+='<line x1="'+X(b.tok)+'" x2="'+X(b.tok)+'" y1="'+y+'" y2="'+(y+hb)+'" stroke="var(--bg)" stroke-width="2"/>';
      if(b.extra)s+='<rect x="'+X(b.tok)+'" y="'+y+'" width="'+(X(b.tok+b.extra)-X(b.tok))+'" height="'+hb+'" fill="var(--c5)"/>';
      const lab=b.x_ref?(b.x_ref+'x vs '+b.ref_name.split(' (')[0]):b.x_teacher?(b.x_teacher+'x fewer than its teacher'):'';
      const tx=X(Math.max(hiT+(b.extra||0),b.teacher_tok||0))+4;
      if(lab&&tx+lab.length*5.6<W-4)s+='<text x="'+tx+'" y="'+(y+11)+'" font-size="10.5" fill="var(--mute)">'+RD.esc(lab)+'</text>';
      s+='<rect x="0" y="'+(y-(narrow?14:2))+'" width="'+W+'" height="'+rh+'" fill="transparent" data-i="'+i+'" style="cursor:pointer"/>';
    });
    el.innerHTML=PF.svg(W,H,'Tokens used to make each small model, against its teacher\'s pretraining tokens',s);
    const b=B[sel];
    let d='<b>'+RD.esc(b.student)+'</b> from '+RD.esc(b.teacher)+'. '+RD.esc(b.how)+'. Tokens: '+(b.tok_note?RD.esc(b.tok_note):PF.tokB(b.tok))+(b.extra?', plus '+RD.esc(b.extra_what):'')+'.';
    if(b.teacher_tok)d+=' Teacher trained on '+PF.tokB(b.teacher_tok)+': <i class="nl d">derived</i> '+PF.comma(b.teacher_tok)+'B / '+b.tok+'B = '+b.x_teacher+' times'+(b.tok2?' (for the smallest student)':'')+'.';
    if(b.x_ref)d+=' The paper says "'+RD.esc(b.claim)+'": '+PF.comma(b.ref_tok)+'B / '+b.tok+'B = '+b.x_ref+' against '+RD.esc(b.ref_name)+(b.x_ref_with_extra?'; with the teacher correction counted, '+b.x_ref_with_extra:'')+'.';
    if(b.gpuh)d+=' GPU-hours: '+PF.comma(b.gpuh.train_1b/1e3)+'K (1B) + '+PF.comma(b.gpuh.train_3b/1e3)+'K (3B) training, '+PF.comma(b.gpuh.logits/1e3)+'K generating teacher logits.';
    d+=' Source: <a href="'+b.src+'" target="_blank" rel="noopener noreferrer">'+RD.esc(b.srcl)+'</a>.';
    $('bdD').innerHTML=d;
  }
  $('bdSvg').addEventListener('click',e=>{const t=e.target.closest('[data-i]');if(!t)return;sel=+t.dataset.i;draw()});
  RD.onRender(draw);addEventListener('resize',()=>{if($('bd').offsetParent)draw()});draw();
})();
// ---- Reading, practical notes: the same strings under two tokenizers ----
(function(){
  const $=id=>document.getElementById(id);if(!$('tk'))return;
  const T=DS.toks;const sh=t=>'<span class="mono" style="border:1px solid var(--line);border-radius:3px;padding:0 3px;margin:1px;white-space:pre;display:inline-block">'+RD.esc(t.replace(/ /g,'␣'))+'</span>';
  let h='<table class="tbl-s"><thead><tr><th>Text</th><th>Qwen2.5 ('+PF.comma(T.a_size)+' entries)</th><th>GPT-2 ('+PF.comma(T.b_size)+')</th></tr></thead><tbody>';
  T.rows.forEach(r=>{const same=r[1].join('|')===r[2].join('|');h+='<tr><td class="mono">'+RD.esc(r[0].replace(/ /g,'␣'))+'</td><td>'+r[1].map((t,j)=>sh(t,r[3][j])).join('')+'</td><td>'+r[2].map((t,j)=>sh(t,r[4][j])).join('')+(same?' <span class="small mute">same split</span>':' <span class="small warn">different</span>')+'</td></tr>'});
  $('tk').innerHTML=h+'</tbody></table><p class="small mute">␣ is a space. Small numbers are token ids. Even where the split matches, the ids differ: the two vocabularies are numbered independently, so a distribution from one cannot be read in the other without a mapping.</p>';
})();
