// ---- Reading tab widgets, part 2: DoReMi weights, RegMix refit table, Aioli table, loader blend animation, stage recipes, smoke test ----
(function(){
  const D=window.MX2, $=id=>document.getElementById(id), esc=RD.esc, pct=(x,d)=>(100*x).toFixed(d==null?1:d)+'%';

  // 3a. four weightings of the Pile
  let dm='top';
  function drawDW(){
    const rows=D.pile_cmp.slice();
    if(dm==='top'){rows.sort((a,b)=>Math.abs(b.doremi_280m-b.doremi_baseline)-Math.abs(a.doremi_280m-a.doremi_baseline));rows.length=10}
    else rows.sort((a,b)=>b.doremi_280m-a.doremi_280m);
    const keys=[['pile_table1','var(--dim)'],['doremi_baseline','var(--c2)'],['doremi_280m','var(--c1)'],['doremi_120m_r1','var(--c4)']];
    const W=RD.width($('mx2-dw-plot')),nmW=Math.min(140,Math.max(90,W*0.28)),bw=W-nmW-52,rh=38,H=rows.length*rh+4;
    const mx=Math.max(...rows.flatMap(r=>keys.map(k=>r[k[0]])));let g='';
    rows.forEach((r,j)=>{const y=j*rh+2;g+=RD.t(nmW-6,y+20,esc(r.name.replace(' (en)','').replace('Gutenberg (PG-19)','Gutenberg')),{a:'end',fs:11});
      keys.forEach((k,m)=>{const w=r[k[0]]/mx*bw;g+='<rect x="'+nmW+'" y="'+(y+2+m*8.5)+'" width="'+w.toFixed(1)+'" height="7.5" fill="'+k[1]+'"/>';
        g+=RD.t(nmW+w+3,y+9+m*8.5,pct(r[k[0]],1),{fs:9,fill:'var(--mute)'})})});
    $('mx2-dw-plot').innerHTML=RD.svg(W,H,g,'Four weightings of The Pile per domain')}
  RD.seg($('mx2-dw-seg'),m=>{dm=m;drawDW()}); RD.onRender(drawDW); RD.onResize(drawDW); drawDW();

  // 3c. RegMix refit table
  const F=D.regmix.fit,P=F.paper_table2;
  const cell=(x,p)=>x.toFixed(2)+(p!=null?' <span class="mute">('+p.toFixed(2)+')</span>':'');
  $('mx2-rm-tab').innerHTML='<thead><tr><th>Regression (fitted on 512 × 1M runs)</th><th class="num">ρ on 1M</th><th class="num">ρ on 60M</th><th class="num">ρ on 1B, 25B tokens</th><th class="num">MSE on 1M</th></tr></thead><tbody>'+
    [['Linear',F.linear,P.linear],['LightGBM',F.lightgbm,P.lightgbm],['Data Mixing Laws form (this page)',F.dml,null]].map(r=>'<tr><td>'+r[0]+'</td>'+['1M','60M','1B'].map(k=>'<td class="num">'+cell(r[1][k].rho,r[2]?r[2][k]:null)+'</td>').join('')+'<td class="num">'+r[1]['1M'].mse.toFixed(4)+'</td></tr>').join('')+
    '</tbody><caption class="small mute" style="caption-side:bottom;text-align:left">Spearman ρ × 100 between predicted and true Pile-CC validation loss on unseen mixtures (256, 256 and 64 runs); paper Table 2 in brackets.</caption>';
  $('mx2-lgbv').textContent=F.lightgbm_version||'';

  // 3d. Aioli Table 2
  const A=D.aioli;
  $('mx2-aioli').innerHTML='<thead><tr><th>Method</th>'+A.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">beats stratified</th></tr></thead><tbody><tr><td>Stratified (perplexity)</td>'+A.stratified.map(v=>'<td class="num">'+v.toFixed(3)+'</td>').join('')+'<td class="num">-</td></tr>'+
    Object.keys(A.rows).map(k=>'<tr><td>'+k+'</td>'+A.rows[k].map(v=>'<td class="num" style="color:'+(v<0?'var(--good)':'var(--bad)')+'">'+(v>0?'+':'')+v.toFixed(3)+'</td>').join('')+'<td class="num">'+A.beats[k]+' / 6</td></tr>').join('')+'</tbody>';

  // 4. loader blend animation: random per-sample vs Megatron error-driven
  const BW=[0.6,0.3,0.1],BN=['web','code','maths'],BC=['var(--c1)','var(--c3)','var(--c2)'],NS=60;
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function seqRand(){const r=mulberry32(11),s=[];for(let i=0;i<NS;i++){const x=r();s.push(x<BW[0]?0:x<BW[0]+BW[1]?1:2)}return s}
  function seqMeg(){const c=[0,0,0],s=[];for(let n=0;n<NS;n++){const nd=Math.max(n,1);let mi=0,me=BW[0]*nd-c[0];for(let d=1;d<3;d++){const e=BW[d]*nd-c[d];if(e>me){me=e;mi=d}}s.push(mi);c[mi]++}return s}
  const SEQ={rand:seqRand(),meg:seqMeg()};let bm='rand';
  RD.mx2blend={seqMeg,seqRand,BW};
  const blA=RD.anim({card:'mx2-bl',ctl:'mx2-bl-ctl',n:NS+1,ms:260,label:'Sample',draw:drawBL});
  function drawBL(i){
    const s=SEQ[bm].slice(0,i),c=[0,0,0];s.forEach(d=>c[d]++);
    const W=RD.width($('mx2-bl-plot')),cols=Math.max(10,Math.min(30,Math.floor((W-10)/16))),cw=(W-10)/cols,rows=Math.ceil(NS/cols),H=rows*cw+70;
    let g='';SEQ[bm].forEach((d,k)=>{const x=5+(k%cols)*cw,y=5+Math.floor(k/cols)*cw;g+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(cw-2)+'" rx="2" fill="'+(k<i?BC[d]:'var(--soft)')+'" stroke="var(--line)"/>'});
    // deviation trace: max over domains of |count - w*n|
    const y0=rows*cw+15,hh=45,dev=[];const cc=[0,0,0];SEQ[bm].forEach((d,k)=>{cc[d]++;dev.push(Math.max(...cc.map((v,j)=>Math.abs(v-BW[j]*(k+1)))))});
    const mx=4;let p='';dev.slice(0,i).forEach((v,k)=>{p+=(k?'L':'M')+(5+k/(NS-1)*(W-10)).toFixed(1)+' '+(y0+hh-Math.min(v,mx)/mx*hh).toFixed(1)});
    g+='<line x1="5" x2="'+(W-5)+'" y1="'+(y0+hh)+'" y2="'+(y0+hh)+'" stroke="var(--line)"/>'+RD.t(5,y0+8,'largest gap between a domain\'s count and its target (0 to 4 samples)',{fs:10,fill:'var(--mute)'});
    if(p)g+='<path d="'+p+'" fill="none" stroke="var(--bad)" stroke-width="2"/>';
    $('mx2-bl-plot').innerHTML=RD.svg(W,H,g,'Sequence of domains drawn by the loader');
    $('mx2-bl-out').innerHTML=BN.map((n,j)=>RD.stat(n+' (target '+pct(BW[j],0)+')',c[j]+' of '+i,'target '+(BW[j]*i).toFixed(1))).join('')+RD.stat('Largest gap so far',(i?Math.max(...dev.slice(0,i)):0).toFixed(1),'samples');
    $('mx2-bl-cap').textContent=i===0?'Step 0: no samples drawn yet. Each step draws one sample.':
      (bm==='rand'?'Random: each sample picks a domain with probability 0.6, 0.3, 0.1. ':'Blend: each sample goes to the domain whose count lags w·n most. ')+'Sample '+i+' came from '+BN[SEQ[bm][i-1]]+'.'}
  RD.seg($('mx2-bl-seg'),m=>{bm=m;blA.reset(NS+1);blA.play()}); RD.onResize(()=>blA.redraw());

  // 5. SmolLM3 stage groups
  const GN={web_en:'English web',multilingual:'Multilingual',code:'Code',math:'Maths',other:'Other'},GC={web_en:'var(--c1)',multilingual:'var(--c6)',code:'var(--c3)',math:'var(--c2)',other:'var(--c5)'};
  function drawSM3(){
    const S=D.recipes.smollm3,W=RD.width($('mx2-sm3-plot')),T=S[S.length-1].to_T,L=4,H=150,bh=34;
    let g='',xs=t=>L+t/T*(W-2*L);
    S.forEach(s=>{let x=xs(s.from_T);const w=xs(s.to_T)-xs(s.from_T);let y=20;
      Object.keys(GN).forEach(k=>{const h=(s.groups[k]||0)*100;g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(w-1).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+GC[k]+'"><title>'+GN[k]+' '+pct(s.groups[k]||0)+'</title></rect>';
        if(h>9&&w>60)g+=RD.t(x+4,y+h/2+4,pct(s.groups[k]||0,0),{fs:10,fill:'var(--bg)'});y+=h});
      g+=RD.t(x+2,12,(w>90?s.name:s.name.split(' ')[0]+' '+s.name.split(' ')[1]),{fs:10,fill:'var(--mute)'});
      g+=RD.t(x+2,H-6,s.from_T+'T',{fs:10,fill:'var(--mute)'})});
    g+=RD.t(W-L,H-6,T+'T',{a:'end',fs:10,fill:'var(--mute)'});
    $('mx2-sm3-plot').innerHTML='<div class="mx2-leg">'+Object.keys(GN).map(k=>'<span><i style="background:'+GC[k]+'"></i>'+GN[k]+'</span>').join('')+'</div>'+RD.svg(W,H,g,'SmolLM3 stage mixtures to scale on the token axis')}
  RD.onRender(drawSM3); RD.onResize(drawSM3); drawSM3();
  const t3=D.recipes.smollm2_table3, s2=D.recipes.smollm2;
  $('mx2-sm2').innerHTML='<thead><tr><th>Stage</th><th>Tokens</th><th>Mix (stated in the text)</th>'+Object.keys(t3).map(k=>'<th class="num">'+k+'</th>').join('')+'</tr></thead><tbody>'+
    s2.map((s,i)=>'<tr><td>'+s.name+'</td><td>'+s.T+'</td><td>'+esc(s.mix)+'</td>'+Object.keys(t3).map(k=>'<td class="num">'+t3[k][i].toFixed(2)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  const DM=D.recipes.olmo2_dolmino,fB=x=>x>=1e9?(x/1e9).toFixed(x<10e9?2:1).replace(/\.0+$/,'')+'B':(x/1e6).toFixed(0)+'M';
  $('mx2-dolmino').innerHTML='<thead><tr><th>Source</th><th class="num">Pool</th>'+['50B','100B','300B'].map(b=>'<th class="num">'+b+' mix %</th><th class="num">'+b+' source % (implied)</th>').join('')+'</tr></thead><tbody>'+
    DM.map(x=>'<tr><td>'+esc(x.src)+'</td><td class="num">'+fB(x.pool)+'</td>'+['50B','100B','300B'].map(b=>'<td class="num">'+x['mix_pct_'+b]+'</td><td class="num"'+(x['src_pct_'+b]>100?' style="color:var(--bad);font-weight:600"':'')+'>'+x['src_pct_'+b]+' <span class="mute">('+x['implied_src_pct_'+b]+')</span></td>').join('')+'</tr>').join('')+'</tbody>';

  // 7. smoke test and pending estimates
  const sm=D.smoke;
  if(sm){$('mx2-smoke').innerHTML=esc(sm.summary);$('mx2-sm-nep').textContent=(sm.params_non_embedding/1e6).toFixed(2)+'M';$('mx2-pend-est').innerHTML=sm.estimates_html}
  else $('mx2-smoke').textContent='not yet run.';
})();
