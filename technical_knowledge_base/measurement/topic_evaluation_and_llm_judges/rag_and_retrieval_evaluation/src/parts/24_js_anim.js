// ---- Reading: the before/after animation (2D, RD.anim with the step lists sx-an-a and sx-an-b on the left). One real question through retrieve
// then generate, scored end to end (before), then split into the retrieval half and the generation half (after), for any of the six generators.
// Labels: MS MARCO is_selected, RAGTruth spans. The step lists explain each step; the line under the card gives the chosen generator's reading.
// (The SciFact claim-54 case moved to the 3D stage, Fig. 1, 27_js_sc_halves.js, on 2026-11-09.)
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  const pipe=$('an-pipe'),cnt=$('an-cnt'),rd=$('an-read'),mSel=$('an-model');if(!pipe)return;
  const it=RDATA.rt.items.find(x=>x.id==='14354');
  // Our reading of each answer against MS MARCO's reference answer (six names "still alive" in the passage).
  const E2E={
    'gpt-4-0613':[1,'names all six people the reference answer names'],
    'gpt-3.5-turbo-0613':[1,'names all six people the reference answer names'],
    'llama-2-70b-chat':[1,'names all six, with their ages'],
    'llama-2-13b-chat':[0,'answers a different question (is Kenneth Williams alive?) and names none of the six'],
    'llama-2-7b-chat':[0,'names three of the six, then says it is unable to answer'],
    'mistral-7B-instruct':[0,'names the six, then says all but Barbara Windsor have died']};
  const GEN={
    'gpt-4-0613':[1,'No span marked: every claim is in passage 2.'],
    'gpt-3.5-turbo-0613':[1,'No span marked: every claim is in passage 2.'],
    'llama-2-70b-chat':[1,'No span marked: names and ages are all in passage 2.'],
    'llama-2-13b-chat':[0,'RAGTruth marks the Kenneth Williams sentence as Subtle Baseless Info, flagged implicit_true: true in the world, absent from the passages. Faithfulness fails, and answer relevance fails too: it answers a question nobody asked.'],
    'llama-2-7b-chat':[0,'No span marked, so a faithfulness metric passes it (1.0). The failure is completeness: three of the six names in passage 2 are missing, and the closing refusal contradicts the list. Only context recall against the reference, or a correctness check, catches it.'],
    'mistral-7B-instruct':[0,'RAGTruth marks "All of these actors have passed away except for Barbara Windsor" as Evident Conflict: passage 2 says all six are alive.']};
  RDATA.rt.models.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=MN[m];mSel.appendChild(o)});
  mSel.value='mistral-7B-instruct';
  let mode='after';
  const STEPS={before:['q','ret','gen','e2e','end'],after:['q','ret','gen','e2e','rh','gh','verdict','world']};
  const st=()=>STEPS[mode];
  function spanHTML(text,sps,on){
    if(!on||!sps.length)return esc(text);
    const s=sps.slice().sort((a,b)=>a[0]-b[0]);let h='',p=0;
    s.forEach(x=>{if(x[0]<p)return;h+=esc(text.slice(p,x[0]))+'<mark class="h on'+(x[3]?' t':'')+'" title="'+esc(x[2])+'">'+esc(text.slice(x[0],x[1]))+'</mark>';p=x[1]});
    return h+esc(text.slice(p));
  }
  function view(s){
    const k=st().indexOf(s),at=n=>{const j=st().indexOf(n);return j>=0&&k>=j};
    const m=mSel.value,r=it.r.find(x=>x.m===m),q=it.q,ps=it.p.map((t,i)=>({t:'passage '+(i+1),x:t.length>330?t.slice(0,330)+'...':t})),ans=r.text,sps=r.sp,gold=it.sel,e2e=E2E[m],gen=GEN[m];
    const showG=mode==='after'&&at('rh');
    let h='<div class="col"><div class="hd">Question</div><div class="small">'+esc(q)+'</div></div>';
    h+='<div class="col'+(at('ret')?'':' off')+'"><div class="hd">Retrieved (top 3)</div>'+ps.map((p,i)=>'<div class="psg'+(showG&&gold[i]?' gold':'')+'"><div class="pt">'+esc(p.t)+(showG&&gold[i]?' &#10003; holds the answer':'')+'</div>'+esc(p.x)+'</div>').join('')+'</div>';
    h+='<div class="col'+(at('gen')?'':' off')+'"><div class="hd">Answer ('+MN[m]+')</div><div class="ans">'+(at('gen')?spanHTML(ans,sps,mode==='after'&&at('gh')):'')+'</div>'+
      (at('e2e')?'<div><span class="verd '+(e2e[0]?'ok':'bad')+'">end to end: '+(e2e[0]?'correct':'wrong')+'</span>'+
        (showG?'<span class="verd '+(gold.some(x=>x)?'ok':'bad')+'">retrieval: '+(gold.some(x=>x)?'passed':'failed')+'</span>':'')+
        (mode==='after'&&at('gh')?'<span class="verd '+(gen[0]?'ok':'bad')+'">generation: '+(gen[0]?'passed':'failed')+'</span>':'')+'</div>':'')+'</div>';
    pipe.innerHTML=h;
    const hit=gold.some(x=>x)?1:0,fi=gold.indexOf(1),p3=gold.filter(x=>x).length/3;
    let c=RD.stat('End to end',at('e2e')?(e2e[0]?'correct':'wrong'):'?','against the reference');
    c+=RD.stat('hit@3',showG?hit:'?','gold passage in prompt');
    c+=RD.stat('precision@3',showG?p3.toFixed(2):'?','labelled passages / 3');
    c+=RD.stat('RR',showG?(fi>=0?(1/(fi+1)).toFixed(2):'0'):'?','1 / rank of first hit');
    c+=RD.stat('Faithful',mode==='after'&&at('gh')?(sps.length?'no ('+sps.length+' span'+(sps.length>1?'s':'')+')':'yes'):'?','RAGTruth spans');
    cnt.innerHTML=c;
    // the chosen generator's reading, only on the steps where it differs between generators (the step list explains every step)
    let t='';
    if(s==='e2e')t='Our reading: '+MN[m]+' '+(e2e[0]?'is correct':'is wrong')+': it '+e2e[1]+'.';
    else if(s==='gh')t=gen[1];
    else if(s==='verdict')t=e2e[0]&&gen[0]?MN[m]+': neither half failed.':MN[m]+': the generator failed; '+(m==='llama-2-7b-chat'?'the answer left half of the passage out.':'the answer contradicted or ignored the passage.');
    rd.textContent=t;rd.hidden=!t;
  }
  const A=RD.anim({card:'an-card',ctl:'an-ctl',n:st().length,draw:i=>view(st()[i]),ms:4600,label:'Animation step',list:'sx-an-a'});
  RD.seg($('an-mode'),m=>{mode=m;const a=$('sx-an-a'),b=$('sx-an-b');a.hidden=m!=='after';b.hidden=m!=='before';A.reset(st().length,m==='after'?'sx-an-a':'sx-an-b')});
  mSel.addEventListener('change',()=>A.redraw());
})();
