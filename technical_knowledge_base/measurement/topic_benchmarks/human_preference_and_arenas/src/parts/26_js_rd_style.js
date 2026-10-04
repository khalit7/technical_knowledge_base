// ---- Reading: style control, step by step, on all 2024 public votes (ids rd-sty-) ----
(function(){
  const FB=window.HPD.fits.boards;let board='overall';
  const wrap=document.getElementById('rd-sty-wrap');const RH=26;const els={};
  const STEPS=[
    {k:'bt',t:'Plain Bradley-Terry',c:'Every vote, no style terms: the ranking LMArena showed in August 2024 (reproduced here from the public votes). Long, formatted answers are part of each model\'s score.'},
    {k:'len',t:'Control for length',c:'Add one column to the regression: the normalised difference in answer length. Its coefficient soaks up the advantage of simply writing more, and models that won by length slide down.'},
    {k:'sc',t:'Control for length and markdown',c:'Add headers, lists and bold. Length stays the dominant term; the markdown terms are second order, but they move a few more places. This is the style-controlled board.'},
    {k:'osc',t:'Check: LMArena\'s own style-controlled board',c:'The same ranking as published by LMArena on 28 August 2024 (full_style_control). Small gaps remain because the public log stops before the published board\'s last votes.'}];
  const short=m=>m.length>30?m.slice(0,29)+'…':m;
  function rows(){const R=FB[board].rows.filter(r=>r.bt!=null&&r.sc!=null);return R.sort((a,b)=>b.bt-a.bt).slice(0,20)}
  function draw(s){
    const R=rows(),k=STEPS[s].k;const val=r=>r[k]!=null?r[k]:-1e9;
    const ord=R.slice().sort((a,b)=>val(b)-val(a));const base=R.map(r=>r.m);
    Object.keys(els).forEach(m=>{if(!R.find(r=>r.m===m)){els[m].remove();delete els[m]}});
    wrap.style.height=(R.length*RH+4)+'px';
    const vals=R.map(val).filter(v=>v>-1e8);const lo=Math.min(...R.map(r=>Math.min(r.bt,r.sc)))-8,hi=Math.max(...R.map(r=>Math.max(r.bt,r.sc)))+4;
    let moved=0;
    ord.forEach((r,i)=>{let el=els[r.m];if(!el){el=document.createElement('div');el.className='sty-row';el.style.top=(i*RH)+'px';wrap.appendChild(el);els[r.m]=el}
      const b0=base.indexOf(r.m),mv=b0-i;if(Math.abs(mv)>=3)moved++;
      const v=r[k];const w=v==null?0:Math.max(2,(v-lo)/(hi-lo)*100);
      el.innerHTML='<span class="rk">'+(i+1)+'</span><span class="nm" title="'+RD.esc(r.m)+'">'+RD.esc(short(r.m))+'</span><span class="bar"><i style="width:'+w.toFixed(1)+'%"></i><em>'+(v==null?'n/a':v.toFixed(0))+'</em></span><span class="mv '+(mv>0?'up':mv<0?'dn':'')+'">'+(s===0?'':mv>0?'&#9650;'+mv:mv<0?'&#9660;'+(-mv):'=')+'</span>';
      requestAnimationFrame(()=>{el.style.top=(i*RH)+'px'});
    });
    const B=FB[board];const co=s===1?B.coef_len_only:s>=2?B.coef:null;
    const rho=HP.spearman(R.map(r=>r.bt),R.map(r=>val(r)));
    const cmp=s===3?B.vs_official_sc:s===0?B.vs_official_plain:null;
    document.getElementById('rd-sty-cnt').innerHTML=RD.stat('Style coefficients',co?(s===1?'length '+co[0].toFixed(3):'length '+co[0].toFixed(3)+', headers '+co[1].toFixed(3)+', lists '+co[2].toFixed(3)+', bold '+co[3].toFixed(3)):'none','logit per standard deviation')+
      RD.stat('Models moving 3+ places',s===0?'-':moved,'of the top 20, against plain')+RD.stat('Rank agreement with plain',s===0?'1.000':rho.toFixed(3),'Spearman, top 20')+
      RD.stat('Match to LMArena\'s published board',cmp?('mean gap '+cmp.mean_abs.toFixed(2)+' pts'):'-',cmp?('largest '+cmp.max_abs.toFixed(1)+' pts over '+cmp.n+' models'):'shown at the first and last steps');
    document.getElementById('rd-sty-cap').innerHTML='<div class="t">'+STEPS[s].t+'</div><p>'+STEPS[s].c+'</p>';
  }
  const A=RD.anim({card:'rd-sty-card',ctl:'rd-sty-ctl',n:STEPS.length,draw,ms:2200,label:'Step'});
  RD.seg(document.getElementById('rd-sty-seg'),m=>{board=m;Object.keys(els).forEach(k=>{els[k].remove();delete els[k]});A.reset(STEPS.length);A.play()});
})();
