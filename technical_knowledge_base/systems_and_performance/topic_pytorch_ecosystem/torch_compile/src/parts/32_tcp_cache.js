// ---- Compile time and caches tab: first-step timelines to scale ----
(function(){
  const {$,esc}=TU,C=TCP.ct;if(!$('t-tcp-cache'))return;
  const SETS={cache:[['cold_whole_4_save','Cold, empty cache'],['mega_whole_4','Mega-cache, empty dir'],['warm_whole_4','Warm cache']],
    reg:[['cold_whole_4','Whole, 4 blocks'],['cold_regional_4','Per block, 4'],['cold_nested_4','Nested region, 4'],['cold_whole_8','Whole, 8 blocks'],['cold_regional_8','Per block, 8'],['cold_nested_8','Nested region, 8']]};
  const pickRun=k=>{const R=C[k].runs,m=C[k].med;return R.reduce((a,b)=>Math.abs(b.first-m)<Math.abs(a.first-m)?b:a)};
  const phases=r=>{const t=r.ts,efc=t.entire_frame_compile||0,bc=t.backend_compile||0,ebc=t.entire_backward_compile||0;
    return [[efc-bc,'var(--c1)','Dynamo'],[bc,'var(--c2)','forward compile'],[ebc,'var(--c4)','backward compile'],[Math.max(0,r.first-efc-ebc),'var(--dim)','run and rest']]};
  let set='cache',A;const N=40;
  function draw(i){const S=SETS[set],max=Math.max(...S.map(([k])=>pickRun(k).first)),t=max*i/(N-1);
    $('tcpc-tl').innerHTML=S.map(([k,n])=>{const r=pickRun(k);let x=0,h='';
      phases(r).forEach(([d,c])=>{const a=Math.min(d,Math.max(0,t-x));if(a>0)h+='<span style="left:'+(100*x/max).toFixed(2)+'%;width:'+(100*a/max).toFixed(2)+'%;background:'+c+'"></span>';x+=d});
      return '<div class="row"><div>'+esc(n)+'</div><div class="tr">'+h+'</div><div class="v">'+(t>=r.first?r.first.toFixed(2)+' s':'...')+'</div></div>'}).join('');
    const fin=S.filter(([k])=>pickRun(k).first<=t);
    $('tcpc-cap').innerHTML='<div class="t">'+t.toFixed(2)+' s after the first call</div><p>'+(fin.length?'Finished: '+fin.map(([,n])=>esc(n)).join(', ')+'.':'Nothing has finished its first step yet.')+'</p>';
    $('tcpc-cnt').innerHTML=TU.stat('Elapsed',t.toFixed(2)+' s')+TU.stat('First steps done',fin.length+' / '+S.length)+TU.stat('Slowest',max.toFixed(2)+' s');
  }
  A=RD.anim({card:'tcpc-card',ctl:'tcpc-ctl',n:N,draw,ms:220,label:'Time'});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-tcp-cache']=[()=>A.redraw()];
  RD.seg($('tcpc-set'),m=>{set=m;A.reset(N)});
  const rows=[];Object.entries(C).forEach(([k,v])=>v.runs.forEach((r,j)=>{const p=phases(r);rows.push([esc(k),j+1,r.first.toFixed(2),p[0][0].toFixed(2),p[1][0].toFixed(2),p[2][0].toFixed(2),(r.ts['async_compile.wait']||0).toFixed(2),r.hit[0]+' / '+r.hit[1],r.hit[2]+' / '+r.hit[3],r.load.toFixed(1)])}));
  $('tcpc-tbl').innerHTML=TU.table(['Run','#','First step (s)','Dynamo','Forward','Backward','C++ wait','FX graph hit / miss','AOT hit / miss','Load'],rows);
})();
