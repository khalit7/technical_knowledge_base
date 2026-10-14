// ---- Reading s3b: evidence survival, olmOCR-bench sample, published scores, cost (data: ING.res) ----
(function(){
  const R=window.ING&&ING.res;const ev=document.getElementById('ing-ev-bars');if(!R||!ev)return;
  const N=R.names,Q=R.qasper;
  function evBars(){
    const W=RD.width(ev),lw=Math.min(160,W*0.4),rw=58,bw=W-lw-rw-8,bh=15;let y=18,body='';
    body+=RD.t(lw,11,'intact / damaged / lost',{fs:11,fill:'var(--mute)'})+RD.t(W-2,11,'recall@3',{fs:11,a:'end',fill:'var(--mute)'});
    R.order_q.forEach(p=>{const e=Q.parsers[p].evidence,t=e.intact+e.damaged+e.lost;let x=lw;
      body+=RD.t(lw-6,y+bh-3,N[p]||p,{fs:11.5,a:'end',w:p==='s2orc'?600:null});
      [['intact','var(--good)'],['damaged','var(--c5)'],['lost','var(--bad)']].forEach(([k,c])=>{const w=bw*e[k]/t;
        if(w>0)body+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+bh+'" fill="'+c+'"><title>'+k+': '+e[k]+' of '+t+'</title></rect>';
        if(k==='intact'&&w>30)body+=RD.t(x+4,y+bh-3,String(e[k]),{fs:10.5,fill:'var(--bg)',w:600});x+=w});
      body+=RD.t(W-2,y+bh-3,(100*Q.parsers[p].recall_at['3']).toFixed(0)+'%',{fs:11.5,a:'end',w:600});y+=bh+6});
    ev.innerHTML=RD.svg(W,y+2,body,'Evidence survival and recall by parser');
  }
  document.getElementById('ing-ev-note').innerHTML=R.ev_note;
  // olmOCR sample table
  const O=R.olm,cats=R.olm_cats;
  const cell=v=>{const pct=100*v;const a=Math.max(0.08,Math.min(0.85,pct/100));return '<td class="num" style="background:color-mix(in srgb,var(--good) '+(a*60).toFixed(0)+'%,transparent)">'+pct.toFixed(0)+'</td>'};
  let h='<table><thead><tr><th>Parser</th>'+cats.map(c=>'<th class="num">'+R.cat_names[c]+'<br><small class="mute">'+O.n_tests[c]+' tests</small></th>').join('')+'<th class="num">Mean<br><small class="mute">95% interval</small></th></tr></thead><tbody>';
  R.order_o.forEach(p=>{const r=O.parsers[p];h+='<tr><td>'+(N[p]||p)+'</td>'+cats.map(c=>cell(r[c].score)).join('')+'<td class="num"><b>'+(100*r.mean_of_categories).toFixed(1)+'</b> <small class="mute">'+(100*r.ci95[0]).toFixed(0)+' to '+(100*r.ci95[1]).toFixed(0)+'</small></td></tr>'});
  document.getElementById('ing-olm-tbl').innerHTML=h+'</tbody></table>';
  document.getElementById('ing-olm-note').innerHTML=R.olm_note;
  // published
  let ph='<table><thead><tr><th>System</th><th>Who ran it</th>'+R.pub_cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
  R.pub.forEach(r=>{ph+='<tr><td>'+r.name+'</td><td class="small">'+r.who+'</td>'+r.v.map(v=>'<td class="num">'+(v==null?'':v)+'</td>').join('')+'</tr>'});
  document.getElementById('ing-pub-tbl').innerHTML=ph+'</tbody></table>';
  // cost
  let ch='<table><thead><tr><th>Parser</th><th class="num">Seconds per page, QASPER papers</th><th class="num">Seconds per page, olmOCR sample</th><th>Models</th></tr></thead><tbody>';
  R.order_o.forEach(p=>{const c=R.cost[p];if(!c)return;ch+='<tr><td>'+(N[p]||p)+'</td><td class="num">'+c.q+'</td><td class="num">'+c.o+'</td><td class="small">'+c.models+'</td></tr>'});
  document.getElementById('ing-cost-tbl').innerHTML=ch+'</tbody></table>';
  document.getElementById('ing-cost-note').innerHTML=R.cost_note;
  evBars();RD.onRender(evBars);RD.onResize(evBars);
})();
