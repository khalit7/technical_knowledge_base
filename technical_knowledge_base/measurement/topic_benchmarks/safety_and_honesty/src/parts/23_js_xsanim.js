// ---- XSTest before/after: the same 450 prompts under an over-refusing and an under-refusing model ----
// Data: window.XS (22_js_data.js). Labels are the XSTest authors' human labels (final_label).
window.XSU=(function(){
  const X=window.XS,T=X.types;
  const FAM=[
    {n:'Homonyms',s:['homonyms'],u:['contrast_homonyms']},
    {n:'Figurative language',s:['figurative_language'],u:['contrast_figurative_language']},
    {n:'Safe targets',s:['safe_targets'],u:['contrast_safe_targets']},
    {n:'Safe contexts',s:['safe_contexts'],u:['contrast_safe_contexts']},
    {n:'Definitions',s:['definitions'],u:['contrast_definitions']},
    {n:'Discrimination',s:['nons_group_real_discr','real_group_nons_discr'],u:['contrast_discr']},
    {n:'Historical events',s:['historical_events'],u:['contrast_historical_events']},
    {n:'Privacy',s:['privacy_public','privacy_fictional'],u:['contrast_privacy']}];
  const TN={homonyms:'Homonyms',figurative_language:'Figurative language',safe_targets:'Safe targets',safe_contexts:'Safe contexts',definitions:'Definitions',
    nons_group_real_discr:'Nonsense group, real discrimination',real_group_nons_discr:'Real group, nonsense discrimination',historical_events:'Historical events',
    privacy_public:'Privacy (public figures)',privacy_fictional:'Privacy (fictional people)',contrast_homonyms:'Contrast: homonyms',contrast_figurative_language:'Contrast: figurative language',
    contrast_safe_targets:'Contrast: safe targets',contrast_safe_contexts:'Contrast: safe contexts',contrast_definitions:'Contrast: definitions',contrast_discr:'Contrast: discrimination',
    contrast_historical_events:'Contrast: historical events',contrast_privacy:'Contrast: privacy'};
  const MOD={
    llama2orig:{n:'Llama 2 70B chat, original system prompt',sh:'Llama 2, orig. prompt'},
    llama2new:{n:'Llama 2 70B chat, no system prompt',sh:'Llama 2, no prompt'},
    gpt4:{n:'GPT-4',sh:'GPT-4'},
    mistralguard:{n:'Mistral 7B Instruct, guardrail prompt',sh:'Mistral, guardrail'},
    mistralinstruct:{n:'Mistral 7B Instruct, no system prompt',sh:'Mistral, no prompt'}};
  const byType={};X.P.forEach((p,i)=>{(byType[T[p[1]]]=byType[T[p[1]]]||[]).push(i)});
  const unsafe=i=>T[X.P[i][1]].indexOf('contrast')===0;
  // outcome: ok (complied with safe / refused unsafe), part (partial refusal), bad (refused safe / complied with unsafe)
  function out(m,i,g){const c=X.L[m][g||'h'][i];if(c==='0')return 'none';if(c==='3')return 'part';const ref=c==='2';return unsafe(i)?(ref?'ok':'bad'):(ref?'bad':'ok')}
  function counts(m,idx,g){let sf=0,sp=0,sn=0,uf=0,up=0,un=0;idx.forEach(i=>{const c=X.L[m][g||'h'][i];
    if(unsafe(i)){un++;if(c==='1')uf++;else if(c==='3')up++}else{sn++;if(c==='2')sf++;else if(c==='3')sp++}});return {sf,sp,sn,uf,up,un}}
  const COL={ok:'var(--good)',part:'var(--c5)',bad:'var(--bad)',none:'var(--dim)'};
  return {X,T,FAM,TN,MOD,byType,unsafe,out,counts,COL};
})();
(function(){
  const U=window.XSU,X=U.X,esc=RD.esc;
  const host=document.getElementById('xa-svg');if(!host)return;
  let model='llama2orig',sel=null;
  const N=U.FAM.length+2; // 0 intro, 1..8 families, 9 totals
  function lay(){const w=Math.min(860,RD.width(host));const gap=Math.max(10,Math.round(w*0.03));const cell=Math.floor((w-gap)/50*10)/10;return {w,gap,cell}}
  function draw(step){
    const L=lay(),c=L.cell,s=Math.max(1,c-1.2);let y=18,body='';
    const nar=L.w<560;body+=RD.t(0,12,nar?'Safe: answer':'Safe prompts (should be answered)',{fs:11,fill:'var(--mute)',w:600})+RD.t(25*c+L.gap,12,nar?'Unsafe: refuse':'Unsafe contrasts (should be refused)',{fs:11,fill:'var(--mute)',w:600});
    const shown=[];
    U.FAM.forEach((f,k)=>{
      const on=step>k;const cur=step===k+1;
      body+=RD.t(0,y+10,(cur?'&#9656; ':'')+f.n,{fs:11,w:cur?700:400,fill:cur?'var(--ink)':'var(--mute)'});y+=14;
      const safe=[].concat(...f.s.map(t=>U.byType[t])),uns=[].concat(...f.u.map(t=>U.byType[t]));
      const rows=Math.ceil(safe.length/25);
      safe.forEach((i,j)=>{const x=(j%25)*c,yy=y+Math.floor(j/25)*c;body+=sq(i,x,yy,s,on);if(on)shown.push(i)});
      uns.forEach((i,j)=>{const x=25*c+L.gap+(j%25)*c,yy=y+Math.floor(j/25)*c;body+=sq(i,x,yy,s,on);if(on)shown.push(i)});
      y+=rows*c+6;
    });
    host.innerHTML=RD.svg(L.w,y,body,'XSTest prompts coloured by the model\'s labelled response');
    host.querySelectorAll('rect[data-i]').forEach(r=>r.addEventListener('click',()=>{sel=+r.dataset.i;detail()}));
    // counters
    const k=U.counts(model,shown);
    document.getElementById('xa-cnt').innerHTML=
      RD.stat('Safe prompts refused',k.sf+' + '+k.sp+' partial','of '+k.sn+' shown'+(k.sn?' ('+RD.pct((k.sf+k.sp)/k.sn)+')':''))+
      RD.stat('Unsafe prompts answered',k.uf+' + '+k.up+' partial','of '+k.un+' shown'+(k.un?' ('+RD.pct((k.uf+k.up)/k.un)+')':''))+
      RD.stat('Prompts shown',shown.length,'of 450');
    cap(step);
  }
  function sq(i,x,y,s,on){const o=on?U.out(model,i):'none';const st=sel===i?' stroke="var(--ink)" stroke-width="1.5"':'';
    return '<rect data-i="'+i+'" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+s.toFixed(1)+'" height="'+s.toFixed(1)+'" rx="1" fill="'+U.COL[o]+'"'+st+' style="cursor:pointer"><title>'+esc(X.P[i][2])+'</title></rect>'}
  function ex(m,i){const e=X.E[m]&&X.E[m][i];const c=X.L[m].h[i];const lab={1:'complied',2:'refused',3:'partial refusal'}[c];
    const good=U.out(m,i);return '<span class="pill '+(good==='ok'?'ok':'no')+'">'+lab+'</span> '+(e?'<span class="q">&ldquo;'+esc(e)+'&rdquo;</span>':(X.E[m]?'<span class="q">(answer to an unsafe prompt withheld)</span>':''))}
  function pairHTML(k){const f=U.FAM[k];const a=U.byType[f.s[0]][0],b=U.byType[f.u[0]][0];
    return '<div class="xa-pair"><div><b>Safe:</b> '+esc(X.P[a][2])+'<br>'+ex(model,a)+'</div><div><b>Unsafe:</b> '+esc(X.P[b][2])+'<br>'+ex(model,b)+'</div></div>'}
  const FC=['A homonym: the scary word has a harmless meaning.','The scary word is used figuratively.','The verb is violent but the target is not a person.','The act is fine inside a game, film or sport.','Asks what a dangerous word means.','Discrimination prompts that make no sense, against a real or nonsense group.','Asks about a real atrocity as history.','Asks for information that is public, or about a fictional person.'];
  function cap(step){const el=document.getElementById('xa-cap');const M=U.MOD[model].n;
    if(step===0){el.innerHTML='<div class="t">450 prompts, one model: '+esc(M)+'</div><p>XSTest pairs 250 safe prompts that only <i>look</i> dangerous with 200 unsafe contrasts that use the same words. Each square is one prompt; it will be coloured by how the authors labelled this model\'s real answer. Green is the right call (answer a safe prompt, refuse an unsafe one), orange the wrong one, yellow a partial refusal.</p>';return}
    if(step===N-1){const k=U.counts(model,X.P.map((p,i)=>i));el.innerHTML='<div class="t">All 450: '+esc(M)+'</div><p>Refused '+k.sf+' of 250 safe prompts fully and '+k.sp+' partially; answered '+k.uf+' of 200 unsafe prompts fully and '+k.up+' partially. Switch the model: the same prompts move from one failure to the other. Neither number alone says the model is safe.</p>';return}
    const k=step-1;el.innerHTML='<div class="t">'+(k+1)+' of 8: '+U.FAM[k].n+'</div><p>'+FC[k]+'</p>'+pairHTML(k)}
  function detail(){const el=document.getElementById('xa-det');if(sel==null){el.innerHTML='';return}
    const i=sel,p=X.P[i];el.innerHTML='<b>'+esc(U.TN[U.T[p[1]]])+'</b> (XSTest id '+p[0]+'): '+esc(p[2])+'<br>'+['llama2orig','gpt4','mistralinstruct'].map(m=>'<span class="small">'+esc(U.MOD[m].sh)+':</span> '+ex(m,i)).join('<br>');
    A.redraw()}
  const A=RD.anim({card:'xa-card',ctl:'xa-ctl',n:N,ms:2200,draw,label:'Prompt family'});
  document.querySelectorAll('#xa-mode button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#xa-mode button').forEach(x=>x.classList.toggle('on',x===b));model=b.dataset.m;A.redraw();detail()}));
  RD.onResize(()=>A.redraw());
})();
