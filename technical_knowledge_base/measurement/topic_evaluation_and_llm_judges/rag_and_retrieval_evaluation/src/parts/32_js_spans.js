// ---- Tab: Hallucination spans (RAGTruth items with MS MARCO answer marks; whole-set table recomputed offline) ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc,RT=RDATA.rt;
  const TY={'Evident Conflict':'ec','Subtle Conflict':'sc','Evident Baseless Info':'eb','Subtle Baseless Info':'sb'};
  let view='span';
  $('sp-item').innerHTML=RT.items.map((x,i)=>'<option value="'+i+'">'+esc(x.q)+'</option>').join('');
  function marked(text,sps){
    const s=sps.slice().sort((a,b)=>a[0]-b[0]);let h='',p=0;
    s.forEach(x=>{if(x[0]<p)return;h+=esc(text.slice(p,x[0]))+'<mark class="h on '+TY[x[2]]+'" tabindex="0" title="'+esc(x[2]+(x[3]?' (implicit_true)':'')+': '+x[4])+'"'+(x[3]?' style="outline:1.5px dotted var(--ink);outline-offset:1px"':'')+'>'+esc(text.slice(x[0],x[1]))+'</mark>';p=x[1]});
    return h+esc(text.slice(p));
  }
  function draw(){
    const it=RT.items[+$('sp-item').value];
    $('sp-src').innerHTML='<div class="card"><div class="ttl">'+esc(it.q)+'</div>'+it.p.map((p,i)=>'<div class="psg'+(it.sel[i]?' gold':'')+'"><div class="pt">passage '+(i+1)+(it.sel[i]?' &#10003; MS MARCO: holds the answer':'')+'</div>'+esc(p.length>420?p.slice(0,420)+'...':p)+'</div>').join('')+
      '<p class="small mute">MS MARCO reference answer: '+esc(it.ref.length>260?it.ref.slice(0,260)+'...':it.ref)+'</p></div>';
    let h='<div class="grid">';
    it.r.forEach(r=>{const ab=/unable to answer/i.test(r.text),bad=r.sp.length>0;
      const tag=bad?'<span class="verd bad">'+r.sp.length+' span'+(r.sp.length>1?'s':'')+'</span>':ab&&r.text.length<150?'<span class="verd unk">refused</span>':ab?'<span class="verd unk">answered, then disclaimed</span>':'<span class="verd ok">no span</span>';
      h+='<div class="sp"><div class="n">'+MN[r.m]+' <span class="rt">('+r.split+' split)</span></div>'+
        (view==='resp'?'<p><span class="verd '+(bad?'bad':'ok')+'">'+(bad?'hallucinated':'not hallucinated')+'</span></p><p class="small mute">A response-level detector returns only this bit: it cannot say which sentence to fix, and a long answer with one bad clause scores the same as an invented one.</p>':
        '<p>'+tag+'</p><div class="ans">'+marked(r.text,r.sp)+'</div>'+(r.sp.length?'<ul class="tight small">'+r.sp.map(x=>'<li><b>'+esc(x[2])+(x[3]?', implicit_true':'')+'</b>: '+esc(x[4].replace(/\n/g,' '))+'</li>').join('')+'</ul>':''))+'</div>'});
    $('sp-resp').innerHTML=h+'</div>';
  }
  function tab(){
    const S=RT.stats,B=S.by_model_task;
    let h='<thead><tr><th>Model</th><th class="num">QA responses hallucinated</th><th class="num">QA spans</th><th class="num">Data-to-text hallucinated</th><th class="num">Summaries hallucinated</th></tr></thead><tbody>';
    const pc=(a,b)=>(100*a/b).toFixed(1)+'%';
    RT.models.forEach(m=>{const x=B[m];h+='<tr><td>'+MN[m]+'</td><td class="num">'+x.QA.hallucinated+' of '+x.QA.responses+' ('+pc(x.QA.hallucinated,x.QA.responses)+')</td><td class="num">'+x.QA.spans+'</td><td class="num">'+pc(x.Data2txt.hallucinated,x.Data2txt.responses)+'</td><td class="num">'+pc(x.Summary.hallucinated,x.Summary.responses)+'</td></tr>'});
    const T=S.by_task;
    h+='<tr><td><b>All six</b></td><td class="num"><b>'+T.QA.hallucinated+' of '+T.QA.responses+' ('+pc(T.QA.hallucinated,T.QA.responses)+')</b></td><td class="num"><b>'+T.QA.spans+'</b></td><td class="num"><b>'+pc(T.Data2txt.hallucinated,T.Data2txt.responses)+'</b></td><td class="num"><b>'+pc(T.Summary.hallucinated,T.Summary.responses)+'</b></td></tr></tbody>';
    $('sp-tab').innerHTML=h;
  }
  $('sp-item').addEventListener('change',draw);
  RD.seg($('sp-view'),m=>{view=m;draw()});
  RD.onRender(()=>{if(!$('sp-tab').innerHTML){tab();draw()}},'t-spans');
})();
