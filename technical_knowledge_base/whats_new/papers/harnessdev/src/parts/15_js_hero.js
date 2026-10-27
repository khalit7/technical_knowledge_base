// ---- Hero figure (light pass 2026-10-25): per benchmark, the six creators' Self-Eval scores (Table 3, avg@3) as a range
// with the best marked, against the human reference (Table 9) labelled with the model that reference ran. Data from
// window.PAPER.tables (tables.json), so it cannot drift from the Tables tab.
(function(){const el=$('heroSvg');if(!el)return;
  const T3=PT.T3.rows.filter(r=>r.row!=='Seed harness'&&r.row!=='Human reference'&&r.row!=='Human-engineered reference'&&typeof r.swe==='number'&&!/human|seed/i.test(r.row));
  const T9=PT.T9.rows;
  const B=[['swe','SWE-Pro','code','SWE-Pro'],['term','Terminal-Bench 2.1','code','Terminal-Bench 2.1'],['bc','BrowseComp','search','BrowseComp'],['eq','EQ-Bench3','writing','EQ-Bench3'],['mle','MLE-bench','ML experiments','MLE-bench']];
  const R=B.map(([k,l,dom,b9])=>{const v=T3.map(r=>[r[k],r.row]),mx=v.reduce((a,b)=>b[0]>a[0]?b:a),mn=Math.min(...v.map(x=>x[0]));
    const h=T9.find(r=>r.bench===b9);return {l,dom,mn,mx:mx[0],who:mx[1],ref:parseFloat(h.score),refp:h.score,model:h.model,newer:/Fable|Sol/.test(h.model)}});
  fit(el,w=>{const x0=6,x1=w-14,sx=v=>x0+v/100*(x1-x0);let s='',y=4;
    R.forEach(r=>{const narrow=w<480;
      s+=tx(x0,y+13,r.l+' ('+r.dom+')',{fs:12.5,w:600});
      const sub='reference ran '+r.model+(r.newer?', newer than any creator':', also a creator');
      s+=tx(x0,y+29,narrow?('reference: '+r.model):sub,{fs:11.5,c:r.newer?'var(--bad)':'var(--mute)'});
      const ly=y+52;
      s+=ln2(x0,ly,x1,ly,'var(--line)',{sw:1});
      s+=rc(sx(r.mn),ly-5,sx(r.mx)-sx(r.mn),10,'var(--c1)',{op:.22,r:5});
      const xb=sx(r.mx),xr=sx(r.ref);
      s+='<circle cx="'+xb.toFixed(1)+'" cy="'+ly+'" r="5.5" fill="var(--c1)"/>';
      s+='<path d="M'+xr.toFixed(1)+','+(ly-7)+' l7,7 l-7,7 l-7,-7z" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.6"/>';
      const lb=r.mx.toFixed(1),lr=r.refp;
      if(xr>xb){s+=tx(xb-8,ly-9,lb,{fs:11.5,a:'end',c:'var(--c1)',w:600})+tx(xr+9,ly-9,lr,{fs:11.5,c:'var(--ink)'})}
      else{s+=tx(xb+8,ly-9,lb,{fs:11.5,c:'var(--c1)',w:600})+tx(xr-9,ly-9,lr,{fs:11.5,a:'end',c:'var(--ink)'})}
      y=ly+22});
    s+=ln2(x0,y,x1,y,'var(--mute)');[0,25,50,75,100].forEach(v=>{const x=sx(v);s+=ln2(x,y,x,y+4,'var(--mute)')+tx(x,y+16,String(v),{fs:11,a:v===0?'start':v===100?'end':'middle',c:'var(--mute)'})});
    s+=tx(x0,y+32,'bar: six creators; dot: best; diamond: human reference',{fs:11.5,c:'var(--mute)'});
    el.innerHTML=svgW(w,y+40,s,'Best generated harness against the human reference per benchmark: behind on SWE-Pro, Terminal-Bench and BrowseComp, whose references ran newer models; level or ahead on EQ-Bench3 and MLE-bench, whose references ran Opus 4.8 and Gemini 3.1')});
  onTab('t-read',()=>refit(el));
})();
