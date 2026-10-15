// ---- Token-budget planner tab (t-plan) ----
(function(){
  const $=id=>document.getElementById(id), esc=RD.esc, eff=RD.mx2eff, COL=['var(--c1)','var(--c6)','var(--c3)','var(--c2)','var(--c4)','var(--c5)','#9a9a9a','#6b8e23','#b5651d','#4682b4','#c71585'];
  const SM=window.MX2.recipes.smollm3, T13=window.MX2.recipes.olmo2_dolmino;
  const PRE={
    ill:{name:'Illustrative 2T run with a decay stage',src:'Pools are published sizes: FineWeb-Edu 1.3T (score ≥ 3, dataset card), DCLM-baseline 3.8T (DCLM paper), StarCoder filtered 83B and Wikipedia 3.7B (OLMo 2 Table 4), FineMath 3+ 34B (dataset card), Cosmopedia 25B (Cosmopedia blog, not rechecked here). The stages and weights are illustrative, not anyone\'s recipe.',
      doms:[['FineWeb-Edu',1300],['DCLM-baseline',3800],['Code (StarCoder)',83],['Maths (FineMath 3+)',34],['Cosmopedia',25],['Wikipedia',3.7]],
      stages:[['Stable',1800,[45,40,10,3,1,1]],['Decay',200,[35,25,15,17,5,3]]]},
    olmo:{name:'OLMo 2 7B (published)',src:'OLMo 2 Tables 4 and 13 (arXiv 2501.00656). Stage 1 is the 3.90T OLMo 2 1124 Mix read once (weights = pool shares); stage 2 is one 50B Dolmino anneal with Table 13\'s mix. The filtered web pool is a subset of DCLM (top 7% by fastText that FineWeb-Edu scores at least 2), treated here as its own pool. The shipped 7B averaged three such anneals.',
      doms:[['DCLM-Baseline',3710],['StarCoder',83],['peS2o',58.6],['arXiv',20.8],['OpenWebMath',12.2],['Algebraic Stack',11.8],['Wikipedia',3.7],['DCLM filtered (subset)',752],['FLAN',17],['StackExchange Q&A',1.26],['Dolmino Math',10.7]],
      stages:[['Pretraining (OLMo 2 Mix)',3900,[3710,83,58.6,20.8,12.2,11.8,3.7,0,0,0,0]],['Mid-training (Dolmino 50B)',50,[0,0,T13[3].mix_pct_50B,0,0,0,T13[4].mix_pct_50B,T13[0].mix_pct_50B,T13[1].mix_pct_50B,T13[2].mix_pct_50B,T13[5].mix_pct_50B]]]},
    dsm:{name:'DeepSeekMath CPT (published)',src:'DeepSeekMath §2.3: 500B tokens on DeepSeek-Coder-Base-v1.5 7B; corpus 120.2B tokens (paper). The other pools are not given in the paper (left empty); AlgebraicStack 11.8B is its Proof-Pile II size as listed in OLMo 2 Table 4.',
      doms:[['DeepSeekMath Corpus',120.2],['GitHub code',null],['arXiv',null],['Common Crawl (en, zh)',null],['AlgebraicStack',11.8]],
      stages:[['Continued pretraining',500,[56,20,10,10,4]]]},
    sm3:{name:'SmolLM3 3B (configs, grouped)',src:'huggingface/smollm at 438be18, smollm3 stage configs, grouped by this page (Reading, section 5). Pool sizes are not published in the configs (left empty).',
      doms:[['English web'],['Multilingual'],['Code'],['Maths'],['Other']].map(d=>[d[0],null]),
      stages:SM.map(s=>[s.name,Math.round((s.to_T-s.from_T)*1000),['web_en','multilingual','code','math','other'].map(k=>+(100*(s.groups[k]||0)).toFixed(2))])}};
  let S=null,mode='staged',hl=0;
  function load(k){const p=PRE[k];S={doms:p.doms.map(d=>({name:d[0],pool:d[1]})),stages:p.stages.map(s=>({name:s[0],tok:s[1],w:s[2].slice()}))};$('mx2-pl-src').textContent=p.name+'. '+p.src;
    const last=S.stages[S.stages.length-1],first=S.stages[0];const sh=st=>{const z=st.w.reduce((a,b)=>a+b,0)||1;return st.w.map(v=>v/z)};const a=sh(first),b=sh(last);
    hl=b.map((v,i)=>v-a[i]).reduce((m,v,i,arr)=>v>arr[m]?i:m,0);table();compute()}
  RD.mx2plan={PRE,load:k=>load(k),state:()=>S};
  $('mx2-pl-pre').innerHTML=Object.keys(PRE).map((k,i)=>'<button data-k="'+k+'"'+(i===0?' class="on"':'')+'>'+PRE[k].name+'</button>').join('');
  $('mx2-pl-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('mx2-pl-pre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));load(b.dataset.k)});
  const inp=(v,cls,i,j)=>'<input type="number" min="0" step="any" class="'+cls+'" data-i="'+i+'" data-j="'+(j==null?'':j)+'" value="'+(v==null?'':v)+'" style="width:5.6em;padding:2px 4px;background:var(--bg)" aria-label="'+cls+'">';
  function table(){
    let h='<thead><tr><th>Domain</th><th>Pool (B tokens)</th>'+S.stages.map((s,j)=>'<th>'+esc(s.name)+'<br>'+inp(s.tok,'mx2-st',j)+' B tokens</th>').join('')+'</tr></thead><tbody>';
    S.doms.forEach((d,i)=>{h+='<tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:'+COL[i%COL.length]+';margin-right:5px"></span>'+esc(d.name)+'</td><td>'+inp(d.pool,'mx2-pool',i)+'</td>'+S.stages.map((s,j)=>'<td>'+inp(s.w[i],'mx2-w',i,j)+' %</td>').join('')+'</tr>'});
    h+='<tr><td class="mute">weights typed</td><td></td>'+S.stages.map((s,j)=>'<td class="mute" id="mx2-pl-sum'+j+'"></td>').join('')+'</tr></tbody>';$('mx2-pl-tab').innerHTML=h}
  $('mx2-pl-tab').addEventListener('input',e=>{const t=e.target,i=+t.dataset.i,j=t.dataset.j===''?null:+t.dataset.j,v=t.value===''?null:Math.max(0,+t.value);
    if(t.classList.contains('mx2-pool'))S.doms[i].pool=v;else if(t.classList.contains('mx2-st'))S.stages[i].tok=v||0;else S.stages[j].w[i]=v||0;compute()});
  function shares(st){const z=st.w.reduce((a,b)=>a+b,0);return z?st.w.map(v=>v/z):st.w.map(()=>0)}
  let R=null;
  function compute(){
    S.stages.forEach((s,j)=>{const e=$('mx2-pl-sum'+j);if(e)e.textContent='sum '+s.w.reduce((a,b)=>a+b,0).toFixed(2)});
    const tot=S.stages.reduce((a,s)=>a+s.tok,0),per=S.doms.map((d,i)=>S.stages.map(s=>shares(s)[i]*s.tok));
    R={tot,per,total:per.map(r=>r.reduce((a,b)=>a+b,0))};
    let worst=null;
    const rows=S.doms.map((d,i)=>{const T=R.total[i],ep=d.pool?T/d.pool:null,De=ep&&ep>=1?eff(ep)*d.pool:(ep?T:null);if(ep!=null&&(worst==null||ep>worst.ep))worst={ep,name:d.name};
      const flag=ep==null?'<span class="mute">pool not given</span>':ep>16?'<b style="color:var(--bad)">over 16 epochs: little value left</b>':ep>4?'<b style="color:var(--c5)">over 4 epochs: diminishing</b>':'ok';
      return '<tr><td>'+esc(d.name)+'</td>'+R.per[i].map(v=>'<td class="num">'+v.toFixed(1)+'</td>').join('')+'<td class="num">'+T.toFixed(1)+'</td><td class="num">'+(tot?(100*T/tot).toFixed(2):'0')+'%</td><td class="num">'+(ep==null?'-':ep.toFixed(2))+'</td><td class="num">'+(De==null?'-':De.toFixed(1))+'</td><td>'+flag+'</td></tr>'});
    $('mx2-pl-res').innerHTML='<thead><tr><th>Domain</th>'+S.stages.map(s=>'<th class="num">'+esc(s.name)+' (B)</th>').join('')+'<th class="num">Total (B)</th><th class="num">Share of run</th><th class="num">Epochs</th><th class="num">Effective D′ (B)</th><th>Note</th></tr></thead><tbody>'+rows.join('')+'</tbody>';
    const last=S.stages[S.stages.length-1];
    $('mx2-pl-out').innerHTML=RD.stat('Total tokens',(tot/1000).toFixed(3)+'T',S.stages.length+' stage'+(S.stages.length>1?'s':''))+RD.stat('Last stage',(tot?(100*last.tok/tot).toFixed(1):'0')+'% of the run',esc(last.name))+
      RD.stat('Most-repeated domain',worst?worst.ep.toFixed(2)+' epochs':'-',worst?esc(worst.name):'pools not given')+RD.stat('Effective / read, whole run',effRatio(),'Muennighoff D′ over tokens read, domains with pools');
    A.reset(N+1);A.go(N)}
  function effRatio(){let a=0,b=0;S.doms.forEach((d,i)=>{if(!d.pool)return;const T=R.total[i],ep=T/d.pool;a+=ep>=1?eff(ep)*d.pool:T;b+=T});return b?(100*a/b).toFixed(1)+'%':'-'}
  // animation: the run as N columns along the token axis
  const N=100;
  function colShares(k,m){const tot=R.tot||1,pos=(k+0.5)/N*tot;if(m==='static')return R.total.map(v=>v/tot);let acc=0;for(const s of S.stages){if(pos<acc+s.tok||s===S.stages[S.stages.length-1])return shares(s);acc+=s.tok}return S.stages[0].w.map(()=>0)}
  function drawAn(i){if(!R)return;
    const W=RD.width($('mx2-pl-plot')),H=200,T=18,bh=130,cw=(W-8)/N;let g='';
    for(let k=0;k<N;k++){const sh=colShares(k,mode);let y=T;sh.forEach((v,d)=>{const h=v*bh;if(h>0.05)g+='<rect x="'+(4+k*cw).toFixed(2)+'" y="'+y.toFixed(2)+'" width="'+(cw+0.3).toFixed(2)+'" height="'+h.toFixed(2)+'" fill="'+COL[d%COL.length]+'" opacity="'+(k<i?1:0.18)+'"/>';y+=h})}
    // stage boundaries and LR schedule
    let acc=0;const tot=R.tot||1;S.stages.forEach((s,j)=>{if(j){const x=4+acc/tot*(W-8);g+='<line x1="'+x+'" x2="'+x+'" y1="'+(T-4)+'" y2="'+(T+bh+4)+'" stroke="var(--ink)" stroke-dasharray="3 2"/>'}g+=RD.t(4+acc/tot*(W-8)+3,12,esc(s.name),{fs:10,fill:'var(--mute)'});acc+=s.tok});
    const ds=(tot-S.stages[S.stages.length-1].tok)/tot;let p='';for(let k=0;k<=60;k++){const f=k/60,lr=f<0.01?f/0.01:f<ds||S.stages.length<2?1:Math.max(0,1-(f-ds)/(1-ds));p+=(k?'L':'M')+(4+f*(W-8)).toFixed(1)+' '+(T+bh+40-lr*30).toFixed(1)}
    g+='<path d="'+p+'" fill="none" stroke="var(--mute)" stroke-width="1.5"/>'+RD.t(W-4,T+bh+48,'learning rate',{a:'end',fs:9,fill:'var(--mute)'});
    if(i>0&&i<=N){const x=4+i*cw;g+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(T+bh)+'" stroke="var(--ink)" stroke-width="2"/>'}
    $('mx2-pl-plot').innerHTML=RD.svg(W,H,g,'Composition of the token stream along the run');
    const seen=k=>{let s=0;for(let c=0;c<k;c++)s+=colShares(c,mode)[hl];return s/N*tot},last10=()=>{let s=0;for(let c=90;c<N;c++)s+=colShares(c,mode)[hl];return s/10},other=mode==='static'?'staged':'static';
    const l10o=(()=>{let s=0;for(let c=90;c<N;c++)s+=colShares(c,other)[hl];return s/10})();
    $('mx2-pl-anout').innerHTML=RD.stat('Tokens read',(i/N*tot/1000).toFixed(2)+'T of '+(tot/1000).toFixed(2)+'T','')+RD.stat(esc(S.doms[hl].name)+' read so far',seen(i).toFixed(1)+'B','of '+R.total[hl].toFixed(1)+'B in the run')+
      RD.stat(esc(S.doms[hl].name)+' share of the last 10%',(100*last10()).toFixed(1)+'%',(other==='static'?'static mix: ':'stages: ')+(100*l10o).toFixed(1)+'%');
    $('mx2-pl-cap').textContent=(mode==='static'?'One static mix: every part of the run has the same composition, so the best data is spread thinly and most of it is read while the learning rate is still high. ':'Your stages: the same tokens per domain, with the last stage concentrated where the learning rate decays. ')+'Highlighted domain: '+S.doms[hl].name+' (the one whose weight rises most in the last stage).'}
  const A=RD.anim({card:'mx2-pl-card',ctl:'mx2-pl-ctl',n:N+1,ms:90,label:'Position in the run',draw:drawAn,tab:'t-plan'});
  RD.seg($('mx2-pl-mode'),m=>{mode=m;A.reset(N+1);A.play()});
  RD.onRender(()=>A.redraw(),'t-plan');RD.onResize(()=>A.redraw(),'t-plan');
  load('ill');
})();
