// ---- Trajectory comparer (t-artraj) ----
(function(){
  const A=ARL.A, C=A.comp, esc=ARL.esc, f3=ARL.f3, R=A.out.res, TT=C.titles;
  const LANES=['closed','single_k5','decomp','react','longctx'];
  const NM={closed:'No retrieval',single_k5:'Pipeline, top 5',decomp:'Decompose, then retrieve',react:'Agent loop (ReAct)',longctx:'Long context, own 10 paragraphs'};
  const BIN={right:['right','var(--c3)'],readwrong:['read wrong','var(--c5)'],half:['one gold','var(--c2)'],none:['no gold','var(--mute)']};
  const N=C.q.length;
  function seen(i,s){const e=C.rows[i][s];if(s==='closed')return[];if(s==='longctx')return C.rows[i].g.slice();
    const out=[];e.st.forEach(st=>{if(st[0]==='s')st[2].forEach(p=>out.push(p))});return out}
  function bin(i,s){const f=R[s].f1[i],sn=seen(i,s),g=C.rows[i].g.filter(p=>sn.indexOf(p)>=0).length;return f>=.5?'right':g===2?'readwrong':g===1?'half':'none'}
  const sel=document.getElementById('tj-pick'),flt=document.getElementById('tj-filter');
  function list(){const v=flt.value;const ok=i=>{const a=R.react.f1[i]>=.5,p=R.single_k5.f1[i]>=.5;
      return v==='all'||(v==='aw'&&a&&!p)||(v==='pw'&&p&&!a)||(v==='bw'&&!a&&!p)||(v==='br'&&C.type[i]==='bridge')||(v==='cp'&&C.type[i]==='comparison')};
    const ids=[];for(let i=0;i<N;i++)if(ok(i))ids.push(i);
    sel.innerHTML=ids.map(i=>'<option value="'+i+'">'+(i+1)+'. '+esc(C.q[i].slice(0,60))+(C.q[i].length>60?'...':'')+'</option>').join('');
    if(!ids.length)sel.innerHTML='<option value="-1">(none in this filter)</option>'}
  let qi=0,T=1;
  const cum=(c,k)=>{let t=0;for(let j=0;j<Math.min(k,c.length);j++)t+=c[j][3];return t};
  function laneHTML(i,s,t){const e=C.rows[i][s],c=e.c,tot=cum(c,c.length),g=C.rows[i].g;
    let h='<div class="tj-lane"><h4>'+esc(NM[s])+'</h4>';
    const vis=(when)=>when<=t+1e-9;
    if(s==='closed')h+='<div class="tj-st'+(vis(tot)?'':' fut')+'">question only, no search</div>';
    else if(s==='longctx')h+='<div class="tj-st'+(vis(0)?'':' fut')+'">'+e.np+' paragraphs in the window (both gold among them), no search</div>';
    else e.st.forEach((st,j)=>{const when=s==='single_k5'?(st[0]==='s'?0:tot):cum(c,j+1);
      if(st[0]==='s')h+='<div class="tj-st s'+(vis(when)?'':' fut')+'">'+(st[3]?'<div class="th">'+esc(st[3])+'</div>':'')+'search <span class="qq">'+esc(st[1])+'</span><div>'+st[2].map(p=>'<span class="tj-chip'+(g.indexOf(p)>=0?' g':'')+'" title="'+esc(TT[p])+'">'+esc(TT[p])+'</span>').join('')+'</div>'+(st[4]?'<div>sub-answer: <b>'+esc(st[4])+'</b></div>':'')+'</div>';
      else if(st[0]==='d')h+='<div class="tj-st d'+(vis(when)?'':' fut')+'">plan: '+st[1].map(x=>'<span class="qq">'+esc(x)+'</span>').join(' then ')+'</div>';
      else if(st[0]==='f')h+='<div class="tj-st f'+(vis(when)?'':' fut')+'">'+(st[2]?'<div class="th">'+esc(st[2])+'</div>':'')+'finish</div>';
      else if(st[0]==='n')h+='<div class="tj-st n'+(vis(when)?'':' fut')+'">no parseable action: <span class="th">'+esc(st[1])+'</span></div>'});
    const done=vis(tot),b=bin(i,s),f=R[s].f1[i];
    h+='<div class="tj-st'+(done?'':' fut')+'">answer: <span class="tj-ans">'+esc(e.a||'(empty)')+'</span> <span class="'+(f>=.5?'tj-ok':'tj-bad')+'">F1 '+f.toFixed(2)+'</span><span class="tj-bin" style="background:'+BIN[b][1]+'">'+BIN[b][0]+'</span></div>';
    let calls=0,bill=0,comp=0;c.forEach((x,j)=>{if(vis(cum(c,j+1))){calls++;bill+=x[0]+x[2];comp+=x[1]+x[2]}});
    h+='<div class="tj-ct"><div>calls<b>'+calls+'/'+c.length+'</b></div><div>billed<b>'+ARL.fmtInt(bill)+'</b></div><div>computed<b>'+ARL.fmtInt(comp)+'</b></div><div>seconds<b>'+Math.min(t,tot).toFixed(1)+'</b></div></div>';
    return h+'</div>'}
  const lanesEl=document.getElementById('tj-lanes'),clock=document.getElementById('tj-clock'),tb=document.getElementById('tj-tb'),qEl=document.getElementById('tj-q');
  const STEPS=41;
  function draw(k){if(qi<0){lanesEl.innerHTML='';qEl.innerHTML='';clock.innerHTML='';return}
    const t=T*k/(STEPS-1);
    qEl.innerHTML='<b>'+(qi+1)+'.</b> '+esc(C.q[qi])+' <span class="mute">('+C.type[qi]+'; gold answer: <b>'+esc(C.gold[qi])+'</b>; gold paragraphs: '+C.rows[qi].g.map(p=>esc(TT[p])).join(', ')+')</span>';
    clock.innerHTML='Clock: <b>'+t.toFixed(1)+' s</b> of '+T.toFixed(1)+' s (recorded wall time, slowest lane)';tb.style.width=(100*k/(STEPS-1)).toFixed(1)+'%';
    lanesEl.innerHTML=LANES.map(s=>laneHTML(qi,s,t)).join('')}
  const an=RD.anim({card:'tj-card',ctl:'tj-ctl',n:STEPS,ms:250,label:'Clock',start:STEPS-1,draw});
  function pick(){qi=+sel.value;if(qi>=0)T=Math.max(...LANES.map(s=>cum(C.rows[qi][s].c,99)));an.go(STEPS-1)}
  flt.addEventListener('change',()=>{list();pick()});sel.addEventListener('change',pick);
  list();pick();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-artraj']=[()=>an.redraw()];
})();
