// ---- Flash tiles (Reading section 5): the online softmax replayed on real scores (PK.TI from src/runs/pk_tiles.py).
// Four explained stretches (2026-11-12, the long-replay rule): key block 0, blocks 1 to 5, block 6, block 7; the step lists
// #sx-ft (online), #sx-ftw (no rescaling) and #sx-ftn (naive) on the left explain them. RD.anim: plays once in view.
(function(){
  const U=PKU,T=window.PK.TI,$=id=>document.getElementById(id);
  const nb=T.steps.length,bk=T.bk,bq=T.bq,row0=T.rows[0],focus=T.focus_row-row0;
  let mode='online';
  const SB=[0,5,6,7],S0=[0,1,6,7],LISTS={online:'sx-ft',wrong:'sx-ftw',naive:'sx-ftn'};
  let lo=Infinity,hi=-Infinity;T.scores.forEach(r=>r.forEach(x=>{if(x!=null){lo=Math.min(lo,x);hi=Math.max(hi,x)}}));
  
  function heat(i){const b0=S0[i],b1=SB[i];const el=$('ft-heat'),W=Math.min(U.width(el),860),x0=W<520?34:44,cw=(W-x0-6)/128,ch=W<520?5:7,y0=16,H=y0+bq*ch+18;
    let s='<text x="0" y="10" font-size="10" fill="var(--mute)">query</text><text x="'+x0+'" y="10" font-size="10" fill="var(--mute)">keys 0 to 127, in '+nb+' blocks of '+bk+'</text>';
    const reached=mode==='naive'?128:(b1+1)*bk;
    for(let r=0;r<bq;r++){for(let c=0;c<128;c++){const v=T.scores[r][c];let fill;
      if(c>=reached)fill='var(--bg)';else if(v==null)fill='var(--soft)';else{const t=(v-lo)/(hi-lo);s+='<rect x="'+(x0+c*cw)+'" y="'+(y0+r*ch)+'" width="'+(cw+0.3)+'" height="'+(ch+0.3)+'" fill="var(--c2)" opacity="'+(0.06+0.94*Math.pow(t,1.6)).toFixed(2)+'"/>';continue}
      s+='<rect x="'+(x0+c*cw)+'" y="'+(y0+r*ch)+'" width="'+(cw+0.3)+'" height="'+(ch+0.3)+'" fill="'+fill+'"/>'}}
    for(let j=0;j<=nb;j++)s+='<line x1="'+(x0+j*bk*cw)+'" x2="'+(x0+j*bk*cw)+'" y1="'+y0+'" y2="'+(y0+bq*ch)+'" stroke="var(--line)" stroke-width="1"/>';
    if(mode!=='naive')s+='<rect x="'+(x0+b0*bk*cw)+'" y="'+y0+'" width="'+((b1-b0+1)*bk*cw)+'" height="'+(bq*ch)+'" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    s+='<text x="'+(x0-4)+'" y="'+(y0+focus*ch+ch)+'" text-anchor="end" font-size="9.5" font-weight="600">100</text><line x1="'+x0+'" x2="'+(W-6)+'" y1="'+(y0+focus*ch+ch/2)+'" y2="'+(y0+focus*ch+ch/2)+'" stroke="var(--ink)" stroke-width="0.6" stroke-dasharray="3 3"/>';
    s+='<text x="'+(x0-4)+'" y="'+(y0+6)+'" text-anchor="end" font-size="9" fill="var(--mute)">'+row0+'</text><text x="'+(x0-4)+'" y="'+(y0+bq*ch)+'" text-anchor="end" font-size="9" fill="var(--mute)">'+T.rows[1]+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Scores of the query block">'+s+'</svg>'}
  function rowpanel(i){const el=$('ft-row'),W=Math.min(U.width(el),860),H=118,x0=W<520?34:44,n=T.dh,bw=(W-x0-6)/n;
    const ref=T.v_focus_dims;let cur;
    if(mode==='naive')cur=i>=3?ref:null;else cur=mode==='online'?T.steps[SB[i]].focus_out:T.steps[SB[i]].focus_out_wrong;
    const mx=Math.max(...ref.map(Math.abs),...(cur||[]).filter(x=>x!=null).map(Math.abs),0.1),mid=62,sc=44/mx;
    let s='<text x="0" y="12" font-size="10" fill="var(--mute)">'+(W<520?'row 100: output (bars), final (ticks)':'row 100: output so far (bars) against the final answer (ticks), '+n+' dimensions')+'</text>';
    s+='<line x1="'+x0+'" x2="'+(W-6)+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--line)"/>';
    for(let d=0;d<n;d++){const x=x0+d*bw;if(cur&&cur[d]!=null){const v=cur[d],h=v*sc;s+='<rect x="'+(x+1)+'" y="'+(h>0?mid-h:mid)+'" width="'+Math.max(1,bw-2)+'" height="'+Math.abs(h)+'" fill="'+(mode==='wrong'?'var(--bad)':'var(--c3)')+'" opacity=".8"/>'}
      const r=ref[d]*sc;s+='<line x1="'+(x+1)+'" x2="'+(x+bw-1)+'" y1="'+(mid-r)+'" y2="'+(mid-r)+'" stroke="var(--ink)" stroke-width="1.6"/>'}
    s+='<text x="'+(x0-4)+'" y="'+(mid-40)+'" text-anchor="end" font-size="9" fill="var(--mute)">+'+mx.toFixed(2)+'</text><text x="'+(x0-4)+'" y="'+(mid+46)+'" text-anchor="end" font-size="9" fill="var(--mute)">&#8722;'+mx.toFixed(2)+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Row 100 output">'+s+'</svg>'}
  function maxdiff(a,b){let m=0;a.forEach((x,i)=>{if(x!=null)m=Math.max(m,Math.abs(x-b[i]))});return m}
  function draw(i){heat(i);rowpanel(i);const st=mode==='naive'?T.steps[nb-1]:T.steps[SB[i]];
    const cur=mode==='naive'?(i>=3?T.v_focus_dims:null):(mode==='online'?st.focus_out:st.focus_out_wrong);
    $('ft-cnt').innerHTML=U.stat('Floats held on chip',mode==='naive'?U.comma(T.floats_naive+bq*T.dh,0):U.comma(T.floats_online,0),mode==='naive'?'scores of the block plus the output':'one tile, m and l per row, the accumulator')+
      U.stat('Row 100: m',mode==='naive'&&i<1?'&#8211;':st.m[focus].toFixed(2),'running max')+U.stat('Row 100: l',mode==='naive'?'&#8211;':U.comma(st.l[focus],3),'running sum (after rescaling)')+
      U.stat('Row 100: error vs the final output',cur?(d=>d>=0.01?d.toFixed(2):U.e2(d))(maxdiff(cur,T.v_focus_dims)):'&#8211;',mode==='naive'?'only known at the end':'so far')}
  const A=RD.anim({card:'ft-card',ctl:'ft-ctl',n:4,ms:4600,label:'Stretch of key blocks',draw,list:'sx-ft'});
  U.seg($('ft-mode'),m=>{mode=m;Object.entries(LISTS).forEach(([k,id])=>{const l=$(id);if(l)l.hidden=k!==m});A.reset(4,LISTS[m])});
  U.onRender('t-read',()=>A.redraw());addEventListener('resize',()=>{if(!$('t-read').hidden)A.redraw()});
})();
