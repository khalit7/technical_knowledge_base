// ---- Price list (t-price): "same stage, different budgets" zoom and "what a headline leaves out" animation ----
(function(){
  const P=window.PRICE;if(!P)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const sig=(v,n)=>+v.toPrecision(n);
  const fUSD=v=>v>=1e9?'$'+sig(v/1e9,3)+'B':v>=1e6?'$'+sig(v/1e6,v<1e7?4:3)+'M':v>=1e4?'$'+sig(v/1e3,3)+'K':'$'+sig(v,3).toLocaleString('en-US');
  const fX=r=>r>=100?Math.round(r).toLocaleString('en-US'):r>=10?r.toFixed(0):r.toFixed(1);
  const ST={};P.stages.forEach(s=>ST[s[0]]={name:s[1],v:s[2]});
  const SRC=P.sources,INC=P.inc_items;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css=(el,v)=>getComputedStyle(el).getPropertyValue(v).trim();
  const KN={pub:'published',rep:'reported',est:'estimate',der:'derived'};

  // ================= same stage, different budgets =================
  const items=[];
  P.runs.forEach(r=>{
    if(r.parts){const base=r.figs.find(f=>f.unit==='usd');r.parts.forEach((p,j)=>items.push({key:r.id+'#'+j,name:p.name,v:p.usd,stage:p.stage,f:Object.assign({},base,{what:'one stage of the official run',inc:Object.assign({},base.inc,{prior:'n'})}),run:r}))}
    r.figs.forEach((f,j)=>{if(f.unit==='usd')items.push({key:r.id+'@'+j,name:r.name,v:f.v,stage:r.stage,f,run:r})})});
  const CST=[['pre','Pretraining','nanochat@0','dsv3#0'],['mid','Mid-training','dsv3#1','thomson@0'],['rl','Post-training (RL)','qorl@0','mimo_pro@0'],['sft','Fine-tuning (SFT)','s1@0','skyt1@0']];
  let cs='rl',za=null,zb=null,z=0,zraf=0;
  const lab=it=>it.name+': '+fUSD(it.v)+(it.f.kind==='est'?' (estimate, '+(it.f.cost==='cloud'?'cloud':'amortised')+')':it.f.kind==='rep'?' (reported)':'')+(it.run.id==='thomson'&&it.v>1e6?' programme':'');
  function stageItems(){return items.filter(i=>i.stage===cs).sort((a,b)=>a.v-b.v)}
  function fillPick(){const L=stageItems(),d=CST.find(c=>c[0]===cs);
    za=L.find(i=>i.key===d[2])||L[0];zb=L.find(i=>i.key===d[3])||L[L.length-1];
    const opt=sel=>L.map(i=>'<option value="'+i.key+'"'+(i===sel?' selected':'')+'>'+esc(lab(i))+'</option>').join('');
    $('pl-ca').innerHTML=opt(za);$('pl-cb').innerHTML=opt(zb)}
  $('pl-cstage').innerHTML=CST.map(c=>'<button data-c="'+c[0]+'"'+(c[0]===cs?' class="on"':'')+'>'+c[1]+'</button>').join('');
  $('pl-cstage').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cs=b.dataset.c;$('pl-cstage').querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===b));stopZ();fillPick();setZ(0);info()}));
  const byKey=k=>items.find(i=>i.key===k);
  $('pl-ca').addEventListener('change',e=>{za=byKey(e.target.value);stopZ();setZ(0);info()});
  $('pl-cb').addEventListener('change',e=>{zb=byKey(e.target.value);stopZ();setZ(0);info()});
  function pair(){let a=za,b=zb;if(a.v>b.v){const t=a;a=b;b=t}return [a,b]}

  function drawZ(){const host=$('pl-zoom');if(!host||!host.offsetParent)return;
    const W=Math.max(200,Math.min(420,host.clientWidth||420)),dpr=window.devicePixelRatio||1;
    let c=host.querySelector('canvas');if(!c){c=document.createElement('canvas');c.setAttribute('role','img');host.appendChild(c)}
    c.width=W*dpr;c.height=W*dpr;c.style.width=W+'px';c.style.height=W+'px';
    const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    const root=$('t-price'),ink=css(root,'--ink'),mute=css(root,'--mute'),line=css(root,'--line'),bg=css(root,'--bg'),col=css(root,ST[cs].v)||ink;
    g.fillStyle=bg;g.fillRect(0,0,W,W);
    const [a,b]=pair(),sa=Math.sqrt(a.v),sb=Math.sqrt(b.v);
    const v0=Math.log(sb*1.04),v1=Math.log(sa*1.9),vs=Math.exp(v0+(v1-v0)*z),k=W/vs;
    const L=stageItems().slice().sort((x,y)=>y.v-x.v);
    let lastY=-99;
    L.forEach(it=>{const sd=Math.sqrt(it.v)*k,hl=it===a||it===b;if(sd<0.3)return;
      const y=W-sd;
      g.globalAlpha=hl?(sd>W?0.1:0.24):0.035;g.fillStyle=hl?col:mute;g.fillRect(0,Math.max(y,-2),Math.min(sd,W+2),Math.min(sd,W+2));g.globalAlpha=1;
      g.strokeStyle=hl?col:line;g.lineWidth=hl?2:1;g.strokeRect(0.5,y+0.5,sd-1,sd-1);
      if(sd>=56&&y>=0&&y-lastY>=30&&sd<=W*1.001){
        const nm=it.name,pr=fUSD(it.v);g.fillStyle=hl?ink:mute;g.font=(hl?'600 ':'')+'12px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';
        let t=nm;const mw=Math.min(sd,W)-10;while(t.length>3&&g.measureText(t).width>mw)t=t.slice(0,-2);if(t!==nm)t=t.slice(0,-1)+'…';
        g.fillText(t,6,y+15);g.font='12px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';g.fillText(pr,6,y+29);lastY=y}});
    const outer=L.filter(it=>Math.sqrt(it.v)*k>W*1.001).pop();
    if(outer){g.fillStyle=mute;g.font='12px ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif';let t='Inside '+outer.name+' ('+fUSD(outer.v)+')';while(t.length>8&&g.measureText(t).width>W-12)t=t.slice(0,-2);g.fillText(t,6,16)}
    const across=vs*vs;
    c.setAttribute('aria-label','Squares with area proportional to dollars: '+a.name+' '+fUSD(a.v)+' inside '+b.name+' '+fUSD(b.v));
    $('pl-zlab').innerHTML='The whole view is worth '+fUSD(across)+'. '+(z<0.02?'The smaller budget is the square at the bottom-left corner'+(Math.sqrt(a.v)*k<2?', too small to see yet':'')+'.':z>0.98?'Now the bigger budget\'s square is '+fX(sb/sa)+' times wider than this view.':'Zooming in: each square\'s side shrinks as the square root of its price.')}
  function setZ(v){z=v;$('pl-zs').value=Math.round(v*1000);drawZ()}
  function stopZ(){if(zraf)cancelAnimationFrame(zraf);zraf=0;$('pl-zplay').textContent='Play the zoom'}
  $('pl-zs').addEventListener('input',e=>{stopZ();setZ(+e.target.value/1000)});
  $('pl-zplay').addEventListener('click',()=>{if(zraf){stopZ();return}
    if(reduce){setZ(z>0.5?0:1);return}
    const z0=z>=0.999?0:z,t0=performance.now(),dur=5200*(1-z0);$('pl-zplay').textContent='Pause';
    const f=t=>{const p=Math.min(1,(t-t0)/dur);setZ(z0+(1-z0)*p);if(p<1)zraf=requestAnimationFrame(f);else stopZ()};zraf=requestAnimationFrame(f)});

  function info(){const [a,b]=pair(),r=b.v/a.v;
    const row=(n,va,vb,warn)=>'<tr'+(warn?' style="background:var(--hl)"':'')+'><td>'+n+'</td><td>'+va+'</td><td>'+vb+'</td></tr>';
    const sym=v=>v==='y'?'<span class="pl-y">&#10003;</span>':v==='n'?'<span class="pl-n">&#10007;</span>':'<span class="pl-u">?</span>';
    let t='<table class="pl-lfl"><thead><tr><th></th><th>'+esc(a.name)+'</th><th>'+esc(b.name)+'</th></tr></thead><tbody>';
    t+=row('Kind',KN[a.f.kind],KN[b.f.kind],a.f.kind!==b.f.kind);
    t+=row('Costed as',P.cost[a.f.cost]||'n/a',P.cost[b.f.cost]||'n/a',a.f.cost!==b.f.cost);
    const aOnly=[],bOnly=[],unk=[];
    INC.forEach(([k,n])=>{const x=a.f.inc[k],y=b.f.inc[k];t+=row(n,sym(x),sym(y),x!==y);
      if(x==='y'&&y!=='y')aOnly.push(n.toLowerCase().replace(/ \(.*\)/,''));if(y==='y'&&x!=='y')bOnly.push(n.toLowerCase().replace(/ \(.*\)/,''));if((x==='u'||y==='u')&&x!==y)unk.push(n.toLowerCase().replace(/ \(.*\)/,''))});
    t+='</tbody></table>';
    let v='';
    if(!aOnly.length&&!bOnly.length&&a.f.cost===b.f.cost&&a.f.kind===b.f.kind)v='<p class="co key"><b>Like for like.</b> Both cover the same things and are priced the same way, so '+fX(r)+'x is a fair ratio of what each run cost.</p>';
    else{v='<p class="co warn"><b>Not like for like.</b> ';
      if(aOnly.length)v+=esc(a.name)+' counts '+aOnly.join(', ')+', which '+esc(b.name)+' leaves out, so the like-for-like gap is <b>wider</b> than '+fX(r)+'x. ';
      if(bOnly.length)v+=esc(b.name)+' counts '+bOnly.join(', ')+', which '+esc(a.name)+' leaves out, so the like-for-like gap is <b>narrower</b>. ';
      if(a.f.cost!==b.f.cost)v+='They are priced differently ('+(P.cost[a.f.cost]||'n/a')+' against '+(P.cost[b.f.cost]||'n/a')+'). ';
      if(a.f.kind!==b.f.kind)v+='One is '+KN[a.f.kind]+', the other '+KN[b.f.kind]+'. ';
      v+='</p>'}
    $('pl-cmp').innerHTML='<div class="pl-big">'+fX(r)+'x</div><p>'+esc(b.name)+' ('+fUSD(b.v)+') would pay for <b>'+fX(r)+'</b> runs of '+esc(a.name)+' ('+fUSD(a.v)+'). On the log axis above that gap is '+Math.log10(r).toFixed(1)+' decades; as areas, the smaller square is '+fX(Math.sqrt(r))+' times narrower.</p>'+
      '<p class="small"><b>'+esc(a.name)+':</b> '+esc(a.run.bought)+'<br><b>'+esc(b.name)+':</b> '+esc(b.run.bought)+'</p>'+v+t}

  // ================= what a headline leaves out =================
  const G={
    dsv3:{name:'DeepSeek-V3',cap:'The cost of producing DeepSeek-V3 and R1',steps:[
      {lab:'Final official run',v:5.576e6,kind:'pub',src:'v3',txt:'2,788K H800 GPU-hours at an assumed $2 an hour: pretraining, context extension and post-training. The paper says it excludes "prior research and ablation experiments".'},
      {lab:'+ R1, built on V3-Base',add:0.294e6,kind:'pub',src:'r1',txt:'147K more H800 GPU-hours for R1-Zero, the SFT data and R1, priced at the same $2 (R1, Table 7).'},
      {lab:'+ research, ablations, failed runs',mult:[2.25,2.7],kind:'ill',src:'epoch_paper',txt:'Not published by DeepSeek. Ratios from other projects: GPT-4\'s whole-development hardware was 2.25 times its final run (Epoch); BLOOM\'s final run used 37% of its project\'s energy (2.7 times).'},
      {lab:'+ staff',staff:[0.29,0.49],kind:'ill',src:'epoch_paper',txt:'Not published. Epoch found R&D staff, with equity, were 29% to 49% of full development cost for the frontier models it studied; dividing by 0.71 and 0.51.'},
      {lab:'Separately: the fleet DeepSeek owns',sep:1.6e9,kind:'est',src:'semi',txt:'SemiAnalysis estimate about 50,000 Hopper GPUs and $1.6B of server capex. Capital used for many models and for serving, so not a cost of V3: it is drawn on its own bar.'}]},
    gpt4:{name:'GPT-4 (Epoch AI)',cap:'The cost of producing GPT-4, as estimated by Epoch AI',steps:[
      {lab:'Final run, amortised hardware and energy',v:37.3e6,kind:'est',src:'epoch_db',txt:'Epoch AI\'s estimate in 2023 dollars (the 2024 paper rounds it to $40M). OpenAI has published no figure.'},
      {lab:'+ experiments: hardware over all of development',to:90e6,kind:'est',src:'epoch_paper',txt:'Epoch: amortised hardware for the whole development, final run plus experiments, about $90M (paper figure; energy and staff left out).'},
      {lab:'+ staff',staff:[0.29,0.49],kind:'ill',src:'epoch_paper',txt:'Applying Epoch\'s 29% to 49% staff share across the models it studied, not a GPT-4 figure.'},
      {lab:'Separately: the same final run at cloud prices',sep:81.4e6,kind:'est',src:'epoch_db',txt:'Re-priced, not added: Epoch\'s cloud-price estimate of the final run is $81.4M, 2.2 times the amortised figure (the AI Index 2024 printed $78M).'},
      {lab:'Separately: buying the hardware',sep:806e6,kind:'est',src:'epoch_db',txt:'Epoch: about $806M to acquire the roughly 25,000 A100s, capital that went on to other work.'}]},
    thomson:{name:'Thomson Reuters',cap:'The cost of producing Thomson-1.0-Large',ref:{v:2.62e6,lab:'MiMo-V2.6-Pro final RL stage, $2.62M'},steps:[
      {lab:'Final training run',v:4.5e5,kind:'rep',src:'tr_ln',txt:'CTO Joel Hron at the launch briefing: the final training run "cost just $450,000".'},
      {lab:'+ two years of talent, compute and experiments',to:4e7,kind:'rep',src:'tr_ln',txt:'The company: "some $40 million ... over the past two years, covering both talent and compute", 89 times the final run.'},
      {lab:'+ the content and the experts',open:true,kind:'ill',src:'tr_dec',txt:'Decades of Westlaw, Practical Law, Checkpoint and Reuters content and the domain experts\' hours are not priced by anyone (The Decoder): the bar ends in an open arrow.'}]}};
  const KC={pub:'--acc',rep:'--c6',est:'--c4',ill:'--bad'};
  Object.values(G).forEach(s=>{let lo=0,hi=0;s.steps.forEach(st=>{
    if(st.v!=null){lo=hi=st.v}else if(st.add!=null){lo+=st.add;hi+=st.add}else if(st.to!=null){lo=hi=st.to}
    else if(st.mult){lo=lo*st.mult[0];hi=hi*st.mult[1]}else if(st.staff){lo=lo/(1-st.staff[0]);hi=hi/(1-st.staff[1])}
    st.lo=lo;st.hi=hi});
    const vals=[];s.steps.forEach(st=>{vals.push(st.lo,st.hi);if(st.sep)vals.push(st.sep)});if(s.ref)vals.push(s.ref.v);
    s.alo=Math.floor(Math.log10(Math.min(...vals.filter(x=>x>0))));s.ahi=Math.ceil(Math.log10(Math.max(...vals))+0.05)});
  let gs='dsv3',gi=0,gt=0;
  $('pl-gsub').innerHTML=Object.entries(G).map(([k,s])=>'<button data-g="'+k+'"'+(k===gs?' class="on"':'')+'>'+s.name+'</button>').join('');
  $('pl-gsub').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{gs=b.dataset.g;$('pl-gsub').querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===b));stopG();gi=0;buildG()}));
  function amt(st){return st.open?'not priced':st.sep?fUSD(st.sep):st.lo===st.hi?fUSD(st.lo):fUSD(st.lo)+' to '+fUSD(st.hi)}
  function buildG(){const s=G[gs],X=v=>Math.max(0,(Math.log10(v)-s.alo)/(s.ahi-s.alo)*100);
    let ax='';for(let e=s.alo;e<=s.ahi;e++)ax+='<span class="'+(e===s.alo?'l0':e===s.ahi?'l1':'')+'" style="left:'+X(10**e)+'%">'+fUSD(10**e)+'</span>';
    let h='<div class="pl-grname">'+s.cap+': <span id="pl-gtot"></span></div><div class="pl-gbar" id="pl-gmain">';
    let prev=null;
    s.steps.forEach((st,i)=>{if(st.sep)return;
      const c='var('+KC[st.kind]+')';
      h+='<i class="pl-seg'+(st.kind==='ill'?' ill':'')+'" data-i="'+i+'" data-l="'+(prev?X(prev.lo):0)+'" data-w="'+(X(st.lo)-(prev?X(prev.lo):0))+'" style="left:'+(prev?X(prev.lo):0)+'%;width:0;background:'+c+'"></i>';
      if(st.hi>st.lo)h+='<i class="pl-seg ill" data-i="'+i+'" data-r="1" data-l="'+X(st.lo)+'" data-w="'+(X(st.hi)-X(st.lo))+'" style="left:'+X(st.lo)+'%;width:0;background:var(--bad)"></i>';
      if(st.open)h+='<i class="pl-seg" data-i="'+i+'" data-l="'+X(prev.hi)+'" data-w="'+(100-X(prev.hi))+'" style="left:'+X(prev.hi)+'%;width:0;top:12px;bottom:12px;background:repeating-linear-gradient(90deg,var(--bad) 0 6px,transparent 6px 11px)"></i>';
      if(!st.open)prev=st});
    if(s.ref)h+='<i title="'+esc(s.ref.lab)+'" style="position:absolute;top:0;bottom:0;width:2px;left:'+X(s.ref.v)+'%;background:var(--ink)"></i>';
    h+='</div><div class="pl-ax">'+ax+'</div>';
    if(s.ref)h+='<div class="small mute">Black line: '+esc(s.ref.lab)+', for scale.</div>';
    s.steps.forEach((st,i)=>{if(!st.sep)return;
      h+='<div class="pl-sepw" data-i="'+i+'" style="opacity:0;transition:opacity .5s"><div class="pl-grname">'+esc(st.lab.replace('Separately: the ','The ').replace('Separately: ',''))+' (a different kind of figure): '+fUSD(st.sep)+'</div><div class="pl-gbar"><i class="pl-seg" data-i="'+i+'" data-l="0" data-w="'+X(st.sep)+'" style="left:0;width:0;background:var(--dim)"></i></div><div class="pl-ax">'+ax+'</div></div>'});
    $('pl-grow').innerHTML=h;
    $('pl-gsteps').innerHTML=s.steps.map((st,i)=>'<li data-i="'+i+'"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:'+(st.sep?'var(--dim)':'var('+KC[st.kind]+')')+'"></i><b>'+esc(st.lab)+'</b>: <b class="amt">'+amt(st)+'</b>'+(st.sep||i===0||st.open?'':' <span class="mute">(total '+(st.lo===st.hi?fUSD(st.lo):fUSD(st.lo)+' to '+fUSD(st.hi))+')</span>')+(st.kind==='ill'?' <span class="ill">illustrative</span>':' <span class="mute small">'+KN[st.kind]+'</span>')+'<br><span class="small">'+esc(st.txt)+' <a href="'+SRC[st.src].u+'" target="_blank" rel="noopener noreferrer">'+esc(SRC[st.src].t.split(',')[0])+'</a></span></li>').join('');
    showG()}
  function showG(){const s=G[gs];
    $('pl-grow').querySelectorAll('.pl-seg').forEach(e=>{const i=+e.dataset.i,on=i<=gi,sup=e.dataset.r&&i<gi&&s.steps.slice(i+1,gi+1).some(st=>!st.sep);
      e.style.width=(on&&!sup?e.dataset.w:0)+'%'});
    $('pl-grow').querySelectorAll('.pl-sepw').forEach(e=>{e.style.opacity=+e.dataset.i<=gi?1:0});
    let cur=null;for(let i=gi;i>=0;i--){if(!s.steps[i].sep&&!s.steps[i].open){cur=s.steps[i];break}}
    const open=s.steps.slice(0,gi+1).some(st=>st.open);
    $('pl-gtot').textContent=(cur.lo===cur.hi?fUSD(cur.lo):fUSD(cur.lo)+' to '+fUSD(cur.hi))+(open?' and more':'')+(gi===0?' (the headline)':'');
    $('pl-gsteps').querySelectorAll('li').forEach(li=>{const i=+li.dataset.i;li.classList.toggle('on',i<=gi);li.classList.toggle('cur',i===gi)});
    $('pl-gpos').textContent='Step '+(gi+1)+' of '+s.steps.length;
    $('pl-gprev').disabled=gi===0;$('pl-gnext').disabled=gi===s.steps.length-1}
  function stopG(){if(gt)clearInterval(gt);gt=0;$('pl-gplay').textContent='Play'}
  $('pl-gprev').addEventListener('click',()=>{stopG();if(gi>0){gi--;showG()}});
  $('pl-gnext').addEventListener('click',()=>{stopG();if(gi<G[gs].steps.length-1){gi++;showG()}});
  $('pl-gplay').addEventListener('click',()=>{if(gt){stopG();return}
    const n=G[gs].steps.length;if(gi>=n-1)gi=0;showG();$('pl-gplay').textContent='Pause';
    gt=setInterval(()=>{if(gi<n-1){gi++;showG()}if(gi>=n-1)stopG()},reduce?600:1900)});

  fillPick();info();buildG();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-price']=(window.TAB_RENDER['t-price']||[]).concat([drawZ]);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(drawZ,150)});
  // redraw the canvas when the colour scheme changes
  try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',drawZ)}catch(e){}
})();
