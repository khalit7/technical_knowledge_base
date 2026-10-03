// ---- The tables and figures tab ----
(function(){
  const T=PAPER.tables,RC=PAPER.rc,FG=PAPER.figs,PR=RC.params;
  const f=s=>parseFloat(String(s).replace(/[()]/g,'').split(' ')[0]);
  const rl=s=>{const m=String(s).match(/\(([\d.]+)\)/);return m?+m[1]:null};
  const Mf=v=>(v/1e6).toLocaleString('en-GB',{maximumFractionDigits:1,minimumFractionDigits:1})+'M';
  const tbl=(head,rows,cls)=>'<table class="'+(cls||'')+'"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  let drawn=false;
  // parameters
  function par(){const B2=PR.B2,hf=k=>Mf(k);
    const rows=[
      ['Gemma 2 2B','2.0B non-emb.',Mf(PR.gemma2_2b_nonemb)+' + '+Mf(PR.gemma2_2b_emb)+' emb.',hf(PR.gemma2_2b_total_hf)],
      ['Gemma 2 9B','8.3B non-emb.',Mf(PR.gemma2_9b_nonemb)+' + '+Mf(PR.gemma2_9b_emb)+' emb.',hf(PR.gemma2_9b_total_hf)],
      ['T5Gemma 2B-2B','4.0B non-emb.','<b>'+Mf(PR.ed_2b2b)+'</b> (cross '+Mf(PR.cross_2b2b)+') + '+Mf(PR.ed_2b2b_emb)+' = '+Mf(PR.ed_2b2b_total),hf(PR.ed_2b2b_total_hf)],
      ['T5Gemma 9B-2B','10.4B','<b>'+Mf(PR.ed_9b2b)+'</b> (cross '+Mf(PR.cross_9b2b)+') + '+Mf(PR.ed_9b2b_emb)+' = '+Mf(PR.ed_9b2b_total),hf(PR.ed_9b2b_total_hf)],
      ['T5Gemma 9B-9B','16.7B non-emb.','<b>'+Mf(PR.ed_9b9b)+'</b> (cross '+Mf(PR.cross_9b9b)+') + '+Mf(PR.ed_9b9b_emb)+' = '+Mf(PR.ed_9b9b_total),hf(PR.ed_9b9b_total_hf)]];
    ['270M-270M','1B-1B','4B-4B'].forEach(k=>{const b=B2[k];rows.push(['T5Gemma 2 '+k,b.paper.join(' + ')+' = '+Mf(b.paper_total),'417M + '+Mf(b.emb)+' + 2 × '+Mf(b.stack)+' = '+Mf(417e6+b.emb+2*b.stack),hf(b.hf_bf16)])});
    $('parTbl').innerHTML=tbl(['Model','Paper','Recount from the config','Released (Hugging Face)'],rows,'t3')}
  // Table 2 chart
  let t2m='pt';
  function t2(){const host=$('t2Chart');const sizes=['S-S','B-B','L-L','XL-XL','2B-2B','9B-2B','9B-9B'];
    const src=t2m.startsWith('sg')?T.A2b.rows:T.A2a.rows,off=(t2m==='it'||t2m==='sgit')?3:0;
    fit(host,w=>{const lw=56,bw=w-lw-60;const vals=sizes.flatMap(s=>[0,1,2].map(i=>src[s][off+i]).filter(x=>x!=='-').map(f));const lo=Math.floor(Math.min(...vals)/5)*5-5,hi=Math.ceil(Math.max(...vals)/5)*5;
      let s='';const cols=['var(--dim)','var(--c1)','var(--c4)'],names=['decoder-only','PrefixLM','UL2'];
      sizes.forEach((z,i)=>{const y=6+i*52;s+=tx(0,y+22,z,{fs:12,w:600});
        [0,1,2].forEach(j=>{const raw=src[z][off+j];if(raw==='-'){s+=tx(lw,y+j*15+11,'no Gemma 2 counterpart',{fs:11,c:'var(--mute)'});return}
          const v=f(raw),x=bw*(v-lo)/(hi-lo);s+=rc(lw,y+j*15+1,Math.max(1,x),12,cols[j],{r:2,op:.85});
          const base=f(src[z][off]);const d=j&&src[z][off]!=='-'?' ('+(v-base>=0?'+':'')+(v-base).toFixed(1)+')':'';
          s+=tx(lw+x+4,y+j*15+11,raw+d,{fs:11})})});
      const lg=legend(names.map((n,i)=>[n,cols[i]]),0,6+sizes.length*52+8,w);s+=lg.s;s+=tx(w,6+sizes.length*52+8,'axis from '+lo,{fs:11,a:'end',c:'var(--mute)'});
      host.innerHTML=svgW(w,6+sizes.length*52+lg.h+8,s,'Table 2')})}
  // Table 3 diverging bars
  let t3m='a',t3s='9';
  function t3(){const host=$('t3Chart');const R=T[t3m==='a'?'A3a':'A3b'].rows;const [ci,di]=t3s==='9'?[4,1]:t3s==='2'?[2,0]:[3,0];
    const rows=Object.entries(R).filter(([k])=>k!=='Average').map(([k,v])=>({k,m:v.metric,d:+v.v[ci]-+v.v[di],a:v.v[ci],b:v.v[di]})).sort((x,y)=>y.d-x.d);
    const av=R.Average.v;rows.push({k:'Average',m:'',d:+av[ci]-+av[di],a:av[ci],b:av[di],avg:true});
    fit(host,w=>{const narrow=w<560,lw=Math.min(150,w*.36),bw=w-lw-10,lab=narrow?40:120,mx=Math.max(...rows.map(r=>Math.abs(r.d)))*(bw/2)/Math.max(20,bw/2-lab),z=lw+bw/2;let s='';
      rows.forEach((r,i)=>{const y=4+i*20,x=bw/2*r.d/mx;s+=tx(0,y+13,r.k+(r.m?' <tspan fill="var(--mute)">'+r.m+'</tspan>':''),{fs:11,w:r.avg?600:400});
        s+=rc(Math.min(z,z+x),y+3,Math.abs(x),13,r.d>=0?'var(--c3)':'var(--c2)',{r:2,op:.85});
        s+=tx(r.d>=0?z+x+4:z+x-4,y+13,(r.d>=0?'+':'')+r.d.toFixed(1)+(narrow?'':' ('+r.b+' → '+r.a+')'),{fs:11,a:r.d>=0?'start':'end'})});
      s+=ln2(z,0,z,4+rows.length*20,'var(--mute)');
      host.innerHTML=svgW(w,8+rows.length*20,s,'Table 3')})}
  function t4(){const host=$('t4Chart');const D=RC.A4,ks=Object.keys(D),ms=['PT','IT','SG'],cols=['var(--c1)','var(--c4)','var(--c6)'];
    fit(host,w=>{const lw=100,bw=w-lw-40,mx=7,z=lw+bw*(mx-1)/(2*mx-1);let s='';const sc=bw/(2*mx);const zz=lw+bw/2;
      ks.forEach((k,i)=>{const y=4+i*50;s+=tx(0,y+18,k,{fs:12,w:600})+tx(0,y+32,(RC.A4_sizes_nonemb[k]/1e6>=1000?(RC.A4_sizes_nonemb[k]/1e9).toFixed(1)+'B':(RC.A4_sizes_nonemb[k]/1e6).toFixed(0)+'M'),{fs:11,c:'var(--mute)'});
        ms.forEach((m,j)=>{const v=D[k][m],x=v*sc;s+=rc(Math.min(zz,zz+x),y+j*14+2,Math.abs(x),11,cols[j],{r:2,op:.85})+tx(v>=0?zz+x+4:zz+x-4,y+j*14+12,m+' '+(v>=0?'+':'')+v.toFixed(1),{fs:11,a:v>=0?'start':'end'})})});
      s+=ln2(zz,0,zz,4+ks.length*50,'var(--mute)')+tx(zz+4,4+ks.length*50+10,'adaptation better →',{fs:11,c:'var(--mute)'})+tx(zz-4,4+ks.length*50+10,'← scratch better',{fs:11,a:'end',c:'var(--mute)'});
      host.innerHTML=svgW(w,ks.length*50+20,s,'Table 4')})}
  // scatter/line frame
  function frame(w,h,x0,x1,y0,y1,xl,yl,xt,yt,pad){pad=pad||{l:40,r:12,t:8,b:34};const X=v=>pad.l+(w-pad.l-pad.r)*(v-x0)/(x1-x0),Y=v=>pad.t+(h-pad.t-pad.b)*(1-(v-y0)/(y1-y0));let s='';
    yt.forEach(v=>{s+=ln2(pad.l,Y(v),w-pad.r,Y(v),'var(--line)')+tx(pad.l-4,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    xt.forEach(v=>{s+=ln2(X(v),pad.t,X(v),h-pad.b,'var(--line)')+tx(X(v),h-pad.b+14,v,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pad.l+w-pad.r)/2,h-4,xl,{fs:11,a:'middle',c:'var(--mute)'})+tx(pad.l,pad.t-0+10,'',{fs:11});return {s,X,Y}}
  function f2(){const host=$('f2Chart');const L=FG.ptscore_vs_step.lines;
    fit(host,w=>{const h=Math.min(300,w*.62);const fr=frame(w,h,0,2000,15,65,'adaptation tokens (billions)','PT score',[0,500,1000,1500,2000],[20,30,40,50,60]);let s=fr.s;
      const cols={'2B-2B':'var(--c1)','9B-2B':'var(--c2)','9B-9B':'var(--c3)'};
      Object.keys(cols).forEach(k=>{s+='<polyline fill="none" stroke="'+cols[k]+'" stroke-width="1.8" points="'+L[k].map(p=>fr.X(p[0]).toFixed(1)+','+fr.Y(p[1]).toFixed(1)).join(' ')+'"/>'});
      [['Gemma 2 2B (horizontal line)','Gemma 2 2B'],['Gemma 2 9B (horizontal line)','Gemma 2 9B']].forEach(([k,n])=>{s+=ln2(fr.X(0),fr.Y(L[k]),fr.X(2000),fr.Y(L[k]),'var(--mute)',{da:'5 4'})+tx(fr.X(2000)-2,fr.Y(L[k])-4,n+' '+L[k],{fs:11,a:'end',c:'var(--mute)'})});
      const lg=legend(Object.keys(cols).map(k=>[k,cols[k]]),40,h+8,w-40);s+=lg.s;
      host.innerHTML=svgW(w,h+lg.h+8,s,'Figure 2 rebuilt')})}
  let f3m='pt';
  function f3(){const host=$('f3Chart');const lat=f3m==='lat';
    fit(host,w=>{const h=Math.min(320,w*.66);let s='',pts;
      if(lat){const P=FG.latency.points;const fr=frame(w,h,600,2900,50,95,'latency (ms per GSM8K query)','GSM8K',[1000,1500,2000,2500],[50,60,70,80,90]);s=fr.s;
        pts=P.map(p=>({x:fr.X(p.x),y:fr.Y(p.y),t:p.label+' '+p.y.toFixed(1)+', '+Math.round(p.x)+' ms',c:p.c==='blue'?'var(--c1)':'var(--c2)',star:p.c!=='blue'}))}
      else{const P=FG[{pt:'pt_score_vs_flops',it:'it_score_vs_flops',sg:'superglue_score_vs_flops'}[f3m]].points;const ys=P.map(p=>p.y);const y0=Math.floor(Math.min(...ys)/10)*10,y1=Math.ceil(Math.max(...ys)/10)*10;
        const fr=frame(w,h,0,1.8,y0,y1,'inference FLOPs per sequence (× 10^14)','',[0,.5,1,1.5],Array.from({length:(y1-y0)/10+1},(_,i)=>y0+i*10));s=fr.s;
        const dn=['S','B','L','XL','2B','9B'],en=['S-S','B-B','L-L','XL-XL','2B-2B','9B-2B','9B-9B'];
        const dec=P.filter(p=>p.c==='blue').sort((a,b)=>a.x-b.x),ed=P.filter(p=>p.c==='orange').sort((a,b)=>a.x-b.x);
        pts=dec.map((p,i)=>({x:fr.X(p.x),y:fr.Y(p.y),t:dn[i]+' '+p.y.toFixed(1),c:'var(--c1)'})).concat(ed.map((p,i)=>({x:fr.X(p.x),y:fr.Y(p.y),t:en[i]+' '+p.y.toFixed(1),c:'var(--c2)',star:true})))}
      const big=w>=560;pts.forEach(p=>{s+=p.star?'<path d="M'+p.x+','+(p.y-6)+' l1.8,4.2 4.4,.4 -3.4,2.9 1,4.4 -3.8,-2.3 -3.8,2.3 1,-4.4 -3.4,-2.9 4.4,-.4z" fill="'+p.c+'"/>':'<circle cx="'+p.x+'" cy="'+p.y+'" r="4.5" fill="'+p.c+'"/>'});
      if(big||lat){placeLabels(pts,w,h-30);pts.forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la})})}
      const lg=legend([['decoder-only (Gemma 2 and small models)','var(--c1)'],['encoder-decoder (PrefixLM)','var(--c2)']],40,h+8,w-40);s+=lg.s;
      host.innerHTML=svgW(w,h+lg.h+8,s,'Figure 3 or 4 rebuilt')+(big||lat?'':'<p class="small mute">Labels hidden at this width: the bottom-left points are S, B, L, XL; the far right pair is 9B and 9B-9B.</p>')})}
  let f5m='ul2prefix_delta_pt';
  function f5(){const host=$('f5Chart');const G=RC.fig5[f5m];const ks=Object.keys(G);const order=['S-S','B-B','L-L','XL-XL','2B-2B','9B-2B','9B-9B'];
    fit(host,w=>{const lw=60,bw=w-lw-50,zz=lw+bw/2,sc=bw/2/1.6;let s='';
      order.forEach((k,i)=>{const y=4+i*34;s+=tx(0,y+18,k,{fs:12,w:600});[['PrefixLM-then-UL2','var(--c1)'],['UL2-then-PrefixLM','var(--c4)']].forEach(([n,c],j)=>{const v=(G[k]||{})[n]||0,x=v*sc;
        s+=rc(Math.min(zz,zz+x),y+j*14+3,Math.max(1,Math.abs(x)),11,c,{r:2,op:.85})+tx(v>=0?zz+Math.max(1,x)+4:zz+x-4,y+j*14+13,(v>0?'+':'')+v.toFixed(1),{fs:11,a:v>=0?'start':'end'})})});
      s+=ln2(zz,0,zz,4+order.length*34,'var(--mute)');const lg=legend([['PrefixLM, then UL2 for the last 10%','var(--c1)'],['UL2, then PrefixLM','var(--c4)']],0,8+order.length*34+6,w);s+=lg.s;
      host.innerHTML=svgW(w,8+order.length*34+lg.h+6,s,'Figure 5 rebuilt')})}
  function b1(){const R=T.B1.rows,P1=PR.B1;const rc_={'Baseline':P1.baseline_model,'w/ Tied Embedding':P1.baseline_model,'w/ Merged Attention':P1.merged_model,'w/ Cross Attention on Global Layers Only':P1.global_only_model};
    const em={'w/ Tied Embedding':P1.tied_emb};
    $('b1Tbl').innerHTML=tbl(['Setting','Score','Δ','Parameters, printed','Recount'],Object.entries(R).map(([k,v])=>[k,v[0],(RC.B1[k]>0?'+':'')+RC.B1[k].toFixed(1),v[1],Mf(rc_[k])+' ('+Mf(em[k]||P1.baseline_emb)+')']),'t3');
    const R3=T.B3.rows;$('b3Tbl').innerHTML=tbl(['Data','270M-270M','1B-1B'],['PrefixLM + KD','UL2 + KD','UL2'].map(k=>[k,R3['270M-270M'][k][0],R3['1B-1B'][k][0]]),'t3')}
  let b45m='B4';
  function b45(){const G=T[b45m].groups,sel=$('b45C');const gs=Object.keys(G);
    if(sel.dataset.m!==b45m){sel.innerHTML=gs.map(g=>'<option>'+g+'</option>').join('');sel.dataset.m=b45m}
    const g=sel.value||gs[0];const cols=T[b45m].cols;
    const rows=Object.entries(G[g]).map(([k,v])=>{const cells=v.map((x,i)=>{const pair=i<3?i+5:i>=5?i-5:null;let win=false;if(pair!=null&&x!=='-'&&v[pair]!=='-')win=+x>+v[pair];return win?'<span style="background:var(--open2);padding:0 4px;border-radius:3px">'+x+'</span>':x});return ['<b>'+k+'</b>'].concat(cells)});
    $('b45Tbl').innerHTML=tbl(['Benchmark'].concat(cols.map(c=>c.replace('T5Gemma 2 ','T5G2 ').replace('Gemma 3 ','G3 ').replace('T5Gemma ','T5G '))),rows,'t3')}
  function all(){par();t2();t3();t4();f2();f3();f5();b1();b45();
    document.querySelectorAll('#t-tables .js[data-rc]').forEach(e=>{const v=e.dataset.rc.split('.').reduce((a,k)=>a==null?a:a[k],RC);e.textContent=v==null?'?':(typeof v==='number'?(+v).toFixed(v%1?(Math.abs(v)<1?3:1):0):v)})}
  segBind('t2M',m=>{t2m=m;t2()});segBind('t3M',m=>{t3m=m;t3()});segBind('t3S',m=>{t3s=m;t3()});segBind('f3M',m=>{f3m=m;f3()});segBind('f5M',m=>{f5m=m;f5()});segBind('b45M',m=>{b45m=m;b45()});
  $('b45C').addEventListener('change',b45);
  onTab('t-tables',()=>{if(!drawn){drawn=true;all()}});
})();
