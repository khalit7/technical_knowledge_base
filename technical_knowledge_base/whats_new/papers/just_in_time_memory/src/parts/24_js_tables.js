// ---- Tables tab: the transcribed tables with recomputed columns ----
(function(){const TB=PAPER.tables,EX=['Qwen3-8B','Gemini-2.5-Pro','GPT-5.4'];
  const f1=v=>v==null?'':(v>0?'+':'')+v.toFixed(1),vs=v=>v?v[0].toFixed(1)+' <span class="mute">± '+v[1].toFixed(1)+'</span>':'n/a';
  const tbl=(head,rows,cls)=>'<table'+(cls?' class="'+cls+'"':'')+'><thead><tr>'+head.map((h,i)=>'<th'+(i?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>';
  const cur=r=>r.curator?(r.trained?'RL ':'P ')+r.curator:'';
  function t1(){const ex=$('t1E').value,view=$('t1V').value,rows=[];
    (ex==='all'?EX:[ex]).forEach(e=>{const block=TB.t1.rows.filter(r=>r.exec===e);rows.push('<tr><td colspan="5" class="mute"><b>Executor: '+e+'</b></td></tr>');
      const best=[0,1,2].map(c=>Math.max(...block.filter(r=>!r.method.startsWith('JitMem')).map(r=>r.v[c][0]))),nm=block.find(r=>r.method==='No Memory');
      block.forEach(r=>{const jm=r.method.startsWith('JitMem');rows.push('<tr'+(jm?' style="font-weight:600"':'')+'><td>'+r.method+'</td><td class="num small">'+cur(r)+'</td>'+r.v.map((v,c)=>{
        const cp=r.src[c]==='skillos';let t=view==='v'?vs(v):view==='d'?f1(+(v[0]-best[c]).toFixed(1)):f1(+(v[0]-nm.v[c][0]).toFixed(1));
        return '<td class="num"'+(cp?' style="font-style:italic"':'')+'>'+t+(cp?' <span class="mute small">S</span>':'')+'</td>'}).join('')+'</tr>')})});
    $('t1').innerHTML=tbl(['Method','Curator','ALFWorld SR','WebShop score','WebShop SR'],rows)}
  ['t1E','t1V'].forEach(id=>$(id).addEventListener('change',t1));t1();
  $('cpN').textContent=PAPER.rc.copied_cells+' of the '+PAPER.rc.baseline_cells+' baseline cells';
  $('sg').innerHTML=tbl(['Executor, metric','Gap','vs','SE of the gap','Gap / SE'],PAPER.rc.sig.map(s=>'<tr><td>'+s.exec+', '+s.metric+'</td><td class="num">+'+s.gap.toFixed(1)+'</td><td class="num small">'+s.vs+'</td><td class="num">'+s.se.toFixed(2)+'</td><td class="num">'+s.z.toFixed(1)+'</td></tr>'));
  const av=PAPER.rc.tau2_avgs;
  $('t2').innerHTML=tbl(['Method','Curator','Airline','Retail','Telecom','Macro','Micro','Micro recomputed'],TB.t2.rows.map(r=>{const a=av.find(x=>x.row===r.method+'|'+r.curator);const off=Math.abs(a.micro-a.micro_printed)>.06;
    return '<tr'+(r.method.startsWith('JitMem')?' style="font-weight:600"':'')+'><td>'+r.method+'</td><td class="num small">'+cur(r)+'</td>'+r.v.map(vs).map(x=>'<td class="num">'+x+'</td>').join('')+'<td class="num"'+(off?' style="color:var(--bad)"':'')+'>'+a.micro.toFixed(2)+'</td></tr>'}));
  $('t3').innerHTML=tbl(['Curator training','Qwen3-8B executor','GPT-5.4 executor'],TB.t3.rows.map(r=>'<tr><td>'+r.method+'</td>'+r.v.map(v=>'<td class="num">'+(v?(v[1]?vs(v):v[0].toFixed(1)):'n/a')+'</td>').join('')+'</tr>'));
  const t4=TB.t4.rows,jm=t4.find(r=>r.method==='JitMem').v;
  $('t4').innerHTML=tbl(['Method','Input (K)','Output (K)','Steps','JitMem input vs this','JitMem steps vs this'],t4.map(r=>'<tr><td>'+r.method+'</td><td class="num">'+r.v[0].toFixed(1)+'</td><td class="num">'+r.v[1].toFixed(2)+'</td><td class="num">'+r.v[2].toFixed(1)+'</td><td class="num">'+(r.method==='JitMem'?'':f1(100*(jm[0]/r.v[0]-1))+'%')+'</td><td class="num">'+(r.method==='JitMem'?'':f1(100*(jm[2]/r.v[2]-1))+'%')+'</td></tr>'));
  function t9(){const e=$('t9E').value,rows=[];let par=null;TB.t9.rows.filter(r=>r.exec===e).forEach(r=>{if(r.method==='JitMem-base'||r.method==='JitMem')par=r;
    const ab=r.method.startsWith('w/')&&par;rows.push('<tr'+(r.method.startsWith('JitMem')?' style="font-weight:600"':'')+'><td>'+(ab?'&nbsp;&nbsp;'+r.method:r.method)+'</td><td class="num small">'+cur(r)+'</td>'+r.v.map((v,c)=>'<td class="num">'+(v?vs(v)+(ab&&par.v[c]?' <span class="small" style="color:'+(v[0]<par.v[c][0]?'var(--bad)':'var(--good)')+'">'+f1(+(v[0]-par.v[c][0]).toFixed(1))+'</span>':''):'n/a')+'</td>').join('')+'</tr>')});
    $('t9').innerHTML=tbl(['Method','Curator','ALFWorld SR','WebShop score','WebShop SR'],rows)}
  $('t9E').addEventListener('change',t9);t9();
  const sm=(t,h)=>'<tr><td colspan="'+(h+1)+'" class="mute"><b>'+t+'</b></td></tr>';
  let r568=[sm('Table 5: staged bank refresh and test bank warm-starting (WebShop)',2)];TB.t5.rows.forEach(r=>r568.push('<tr><td>'+r.exec+': '+r.method+'</td>'+r.v.map(v=>'<td class="num">'+vs(v)+'</td>').join('')+'</tr>'));
  r568.push(sm('Table 6: no-memory baseline, SkillOS reported against reproduced (ALFWorld SR, WebShop score, WebShop SR)',2));TB.t6.rows.forEach(r=>r568.push('<tr><td>'+r.exec+': '+r.method+'</td><td class="num">'+vs(r.v[0])+'</td><td class="num">'+vs(r.v[1])+', SR '+vs(r.v[2])+'</td></tr>'));
  r568.push(sm('Table 8: number of retrieved trajectories (WebShop)',2));TB.t8.rows.forEach(r=>r568.push('<tr><td>'+r.exec+': '+r.method+'</td>'+r.v.map(v=>'<td class="num">'+vs(v)+'</td>').join('')+'</tr>'));
  $('t568').innerHTML=tbl(['Row','Score / ALFWorld','SR'],r568);
  // validation curves, decoded
  const F=TB.fig.series,A=F['alfworld: Validation Success Rate'],W5=F['webshop: Validation Success Rate'];
  onTab('t-tables',()=>fit($('vcSvg'),Wd=>{const H=200,x0=34,x1=Wd-10,y0=H-36,sx=v=>x0+(x1-x0)*v/100,sy=v=>y0-(y0-10)*v/0.7;let s='';
    [0,.2,.4,.6].forEach(v=>{s+=ln2(x0,sy(v),x1,sy(v),'var(--line)')+tx(x0-4,sy(v)+4,v.toFixed(1),{a:'end',fs:11,c:'var(--mute)'})});
    [0,25,50,75,100].forEach(v=>{s+=tx(sx(v),y0+14,v,{a:'middle',fs:11,c:'var(--mute)'})});
    [[A,'var(--acc)','ALFWorld'],[W5,'var(--bad)','WebShop']].forEach(([d,c,n])=>{const pts=d.steps.map((st,i)=>sx(st).toFixed(1)+','+sy(d.values[i]).toFixed(1));s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+c+'" stroke-width="1.8"/>';d.steps.forEach((st,i)=>{s+='<circle cx="'+sx(st).toFixed(1)+'" cy="'+sy(d.values[i]).toFixed(1)+'" r="2.6" fill="'+c+'"><title>'+n+' step '+st+': '+d.values[i]+'</title></circle>'})});
    s+=legend([['ALFWorld validation SR','var(--acc)'],['WebShop validation SR','var(--bad)']],x0,H-6,x1-x0).s;
    $('vcSvg').innerHTML=svgW(Wd,H,s,'Validation curves')}));
  const V=PAPER.rc.val;
  $('vcO').innerHTML='Decoded from the vector PDFs in the arXiv source (src/decode_figs.py), calibrated on the gridlines; training steps 0 to 100 every 5. Times 140, every ALFWorld value lands within '+V.alfworld_x140_max_offset+' of a whole number of tasks (times 134, the other ALFWorld split, up to '+V.alfworld_x134_max_offset+'); times 100, every WebShop value is a whole number. So ALFWorld validation used 140 tasks, the size of the test set, and WebShop 100. ALFWorld rises from '+V.alf_first_last_peak[0]+' to '+V.alf_first_last_peak[1]+'; WebShop peaks at '+V.ws_first_last_peak[2]+' at step '+V.ws_first_last_peak[3]+' and ends at '+V.ws_first_last_peak[1]+'. One training run each; the executor is Qwen3-8B in non-thinking mode.';
  const C=PAPER.rc.claims;
  $('rcLine').innerHTML='Defaults reproduce: '+PAPER.rc.n_ok+' of the paper\'s '+PAPER.rc.n+' derived numbers recompute from its own tables (independently, from the transcribed values); the one that does not is SkillOS-gpt\'s tau2 micro average, '+C.find(c=>!c.ok).printed+' printed against '+C.find(c=>!c.ok).recomputed+'. <a href="#claims">The list</a>.';
  $('cl').innerHTML=tbl(['Claim','Printed','Recomputed','Where'],C.map(c=>'<tr><td>'+c.claim+'</td><td class="num">'+c.printed+'</td><td class="num"'+(c.ok?'':' style="color:var(--bad);font-weight:600"')+'>'+c.recomputed+'</td><td class="num small"><a href="'+PAPER.meta.ax+'#'+c.at+'" target="_blank" rel="noopener noreferrer">'+c.at+'</a></td></tr>'));
})();
