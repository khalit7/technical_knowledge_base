// ---- Reading, What the anneal buys: OLMo 2 Table 11 split into the LR part and the data part (predict, then reveal) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('as-card'))return;
  // [checkpoint at 4T, 50B LR-to-zero on the pretraining mix, 50B LR-to-zero on Web FT7 FW2 + Math + Ins]  (Table 11)
  const D={'GSM*':[28.5,27.0,46.5],'OLMES (MCF)':[69.6,74.0,75.7],'OLMES-Gen':[63.2,64.5,70.2],'MMLU (MCF)':[59.8,61.8,63.1]};
  let cur='GSM*',revealed=false;
  $('as-mode').innerHTML=Object.keys(D).map(k=>'<button data-k="'+k+'"'+(k===cur?' class="on"':'')+'>'+k+'</button>').join('');
  function draw(){
    const d=D[cur],lo=Math.floor(Math.min(...d)/10)*10-10,hi=Math.ceil(Math.max(...d)/10)*10,x=v=>((v-lo)/(hi-lo)*100);
    const rows=[['No anneal',d[0],'var(--dim)'],['LR to zero, same mix',d[1],'var(--c1)'],['LR to zero, new mix',d[2],'var(--c2)']];
    let h=rows.map((r,i)=>'<div class="as-row"><div>'+r[0]+'</div><div class="as-track"><span style="left:0;width:'+x(r[1]).toFixed(1)+'%;background:'+r[2]+'"></span></div><div class="as-val">'+
      ((!revealed&&cur==='GSM*'&&i>0)?'?':r[1].toFixed(1))+'</div></div>').join('');
    const lr=d[1]-d[0],da=d[2]-d[1];
    if(revealed||cur!=='GSM*')h+='<div class="as-row"><div><b>Split</b></div><div class="small">learning-rate decay <b>'+(lr>=0?'+':'')+lr.toFixed(1)+'</b>, data switch <b>'+(da>=0?'+':'')+da.toFixed(1)+'</b>, total '+(lr+da>=0?'+':'')+(lr+da).toFixed(1)+'</div><div class="as-val small mute">'+lo+' to '+hi+' scale</div></div>';
    $('as-bars').innerHTML=h;
  }
  $('as-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.k;[...$('as-mode').children].forEach(x=>x.classList.toggle('on',x===b));draw()});
  $('as-q').addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;revealed=true;
    [...$('as-q').querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));
    const ok=b.dataset.a==='none';
    $('as-rev').hidden=false;
    $('as-rev').innerHTML=(ok?'<b>Right.</b> ':'<b>Not quite.</b> ')+'Decaying the learning rate on the unchanged pretraining mix moved GSM* from 28.5 to 27.0, a change of −1.5 against a standard error of about 4.5 for the difference: nothing. The high-quality mix, with its maths, took it to 46.5 (+19.5). Switch to OLMES or MMLU below to see the opposite pattern.';
    draw()});
  draw();
})();
