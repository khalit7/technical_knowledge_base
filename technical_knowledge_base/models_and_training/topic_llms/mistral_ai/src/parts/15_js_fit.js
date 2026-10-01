// ---- Weights and cache tab: parameter accounting from the configs, memory to hold and run, cache against context ----
(function(){
  if(!$('t-fit'))return;
  // billions, summed from each model's config.json / params.json (recompute.py); vision = encoder + projector (projector shape assumed)
  const M=[
   {id:'m7',n:'Mistral 7B',lt:6.9796,la:6.9796,ein:0.1311,eout:0.1311,vis:0,kv:131072,win:4096,ctx:32768,trained:8192,att:'GQA 32/8, window 4,096',st:[],cfg:'@cfg7'},
   {id:'x7',n:'Mixtral 8x7B',lt:46.4406,la:12.6178,ein:0.1311,eout:0.1311,vis:0,kv:131072,ctx:32768,att:'GQA 32/8, full',st:[['47B total',47,'tot','all','@mixp'],['13B active',13,'act','all','@mixp']],cfg:'@cfgx7'},
   {id:'x22',n:'Mixtral 8x22B',lt:140.2274,la:38.7588,ein:0.1966,eout:0.1966,vis:0,kv:229376,ctx:65536,att:'GQA 48/8, full',st:[['141B total',141,'tot','all','@x22'],['39B active',39,'act','all','@x22']],cfg:'@cfgx22'},
   {id:'min3',ve:0.4033,n:'Ministral 3 3B',lt:3.0264,la:3.0264,ein:0.4027,eout:0,vis:0.4201,kv:106496,ctx:262144,att:'GQA 32/8, full',st:[['3.4B language model',3.4,'tot','lm','@min3'],['0.4B vision encoder',0.4,'vis','vis','@min3']],tied:1,cfg:'@cfgmin3'},
   {id:'min8',n:'Ministral 3 8B',lt:7.4158,la:7.4158,ein:0.5369,eout:0.5369,vis:0.4285,kv:139264,ctx:262144,att:'GQA 32/8, full',st:[['8.4B language model',8.4,'tot','lm','@min8']],cfg:'@cfgmin8'},
   {id:'min14',n:'Ministral 3 14B',lt:12.1639,la:12.1639,ein:0.6711,eout:0.6711,vis:0.439,kv:163840,ctx:262144,att:'GQA 32/8, full',st:[['13.5B language model',13.5,'tot','lm','@min14']],cfg:'@cfgmin14'},
   {id:'devs2',n:'Devstral Small 2',lt:22.2302,la:22.2302,ein:0.6711,eout:0.6711,vis:0.439,kv:163840,ctx:262144,att:'GQA 32/8, full',st:[['24B',24,'tot','all','@dev2']],cfg:'@cfgds2'},
   {id:'s4',n:'Mistral Small 4',lt:117.8991,la:5.5588,ein:0.5369,eout:0.5369,vis:0.4285,kv:23040,ctx:262144,att:'MLA, latent 256 + 64',st:[['119B total',119,'tot','all','@s4'],['6B active',6,'act','all','@s4'],['8B active "including embedding and output layers"',8,'act','all','@s4'],['6.5B active',6.5,'act','all','@s4card']],cfg:'@cfgs4'},
   {id:'dev2',n:'Devstral 2',lt:121.8048,la:121.8048,ein:1.6106,eout:1.6106,vis:0,kv:360448,ctx:262144,att:'GQA 96/8, full',st:[['123B',123,'tot','all','@dev2']],cfg:'@cfgd2'},
   {id:'m35',n:'Mistral Medium 3.5',lt:121.8048,la:121.8048,ein:1.6106,eout:1.6106,vis:2.6782,kv:360448,ctx:262144,att:'GQA 96/8, full',st:[['128B',128,'tot','all','@m35card']],cfg:'@cfgm35'},
   {id:'l3',ve:2.4957,n:'Mistral Large 3',lt:671.542,la:38.0679,ein:0.9395,eout:0.9395,vis:2.5701,kv:70272,ctx:262144,att:'MLA, latent 512 + 64',st:[['675B total',675,'tot','all','@l3card'],['41B active',41,'act','all','@l3card'],['673B language model',673,'tot','lm','@l3card'],['39B active, language model',39,'act','lm','@l3card'],['2.5B vision encoder',2.5,'vis','vis','@l3card']],cfg:'@cfgl3'}];
  const byId={};M.forEach(m=>byId[m.id]=m);
  const ACT={m7:7.24,x7:12.9,x22:39,min3:3.4,min8:8.4,min14:13.5,devs2:24,s4:6,dev2:123,m35:128,l3:41},TOT={m7:7.24,x7:46.7,x22:141,min3:3.8,min8:8.8,min14:13.9,devs2:24,s4:119,dev2:123,m35:128,l3:675};
  const COL={m7:'var(--c6)',x7:'var(--c1)',x22:'var(--c4)',min3:'var(--c5)',min8:'var(--c5)',min14:'var(--c5)',devs2:'var(--c3)',s4:'var(--good)',dev2:'var(--bad)',m35:'var(--c2)',l3:'var(--acc)'};
  const opt={ein:true,eout:true,vis:true},sel={m:'s4'};
  const sum=(m,kind,o,scope)=>{const v=scope==='lm'?false:o.vis;if(kind==='vis')return m.ve;return (kind==='tot'?m.lt:m.la)+(o.ein?m.ein:0)+(o.eout&&!m.tied?m.eout:0)+(v?m.vis:0)};
  const dec=x=>{const s=String(x);return s.indexOf('.')<0?0:s.length-s.indexOf('.')-1};
  const verdict=(calc,stated)=>{const h=0.5*10**-dec(stated);const d=calc-stated;return Math.abs(d)<h?'✓ within rounding':Math.abs(d)/stated<0.01?'≈ within 1%':'✗ off by '+(d>0?'+':'')+(100*d/stated).toFixed(1)+'%'};
  function ways(m,s){const out=[];[[1,1],[0,1],[1,0],[0,0]].forEach(([a,b])=>{[1,0].forEach(v=>{if((s[3]==='lm'||!m.vis)&&v)return;if(m.tied&&b)return;if(s[2]==='vis')return;
      const o={ein:!!a,eout:!!b,vis:!!v},c=sum(m,s[2],o,s[3]);if(Math.abs(c-s[1])<0.5*10**-dec(s[1]))out.push('layers'+(a?' + input emb.':'')+(b&&!m.tied?' + output':'')+(v?' + vision':'')+' = '+fmt(c,2))})});return out}
  function drawAcc(){
    const m=byId[sel.m],o=opt,tot=sum(m,'tot',o),act=sum(m,'act',o);
    const segs=[['layers: attention, norms, router, '+(m.lt>m.la?'experts in use':'feed-forward'),m.la,'var(--acc)'],['layers: idle experts',m.lt-m.la,'var(--dim)'],['input embedding',o.ein?m.ein:0,'var(--c5)'],['output layer',o.eout&&!m.tied?m.eout:0,'var(--c4)'],['vision encoder and projector',o.vis?m.vis:0,'var(--c6)']];
    const W=$('accSvg').clientWidth<520?380:640,x0=118,ww=W-x0-10,sc=v=>ww*v/tot;let s='',x=x0;
    s+='<text x="0" y="22" font-size="12">total '+fmt(tot,2)+'B</text>';
    segs.forEach(g=>{if(g[1]<=0)return;const w=sc(g[1]);s+='<rect x="'+x.toFixed(1)+'" y="8" width="'+Math.max(.8,w).toFixed(1)+'" height="22" fill="'+g[2]+'"><title>'+g[0]+': '+fmt(g[1],3)+'B</title></rect>';x+=w});
    x=x0;s+='<text x="0" y="56" font-size="12">active '+fmt(act,2)+'B</text>';
    [segs[0],segs[3],segs[4]].forEach(g=>{if(g[1]<=0)return;const w=sc(g[1]);s+='<rect x="'+x.toFixed(1)+'" y="42" width="'+Math.max(.8,w).toFixed(1)+'" height="22" fill="'+g[2]+'"><title>'+g[0]+': '+fmt(g[1],3)+'B</title></rect>';x+=w});
    $('accSvg').innerHTML=svgEl(W,72,s,'Parameter accounting for '+m.n);
    $('accLeg').innerHTML=segs.map(g=>'<span><i style="background:'+g[2]+';height:10px;width:10px"></i>'+g[0]+' '+fmt(g[1],2)+'B</span>').join('');
    let t='<table><thead><tr><th>Stated</th><th class="num">Sum with your ticks</th><th>Verdict</th><th>Sums that reproduce it</th></tr></thead><tbody>';
    if(!m.st.length)t+='<tr><td colspan="4" class="mute">No explicit parameter count is published beyond the name; the page\'s 7.24B is this sum with every box ticked.</td></tr>';
    m.st.forEach(s=>{const c=sum(m,s[2],o,s[3]),w=s[2]==='vis'?[]:ways(m,s);t+='<tr><td>'+s[0]+' <span class="q"></span></td><td class="num">'+fmt(c,2)+'B</td><td>'+verdict(c,s[1])+'</td><td class="small">'+(s[2]==='vis'?'encoder alone, without the projector':w.length?w.join('; '):'<b style="color:var(--bad)">none of the sums</b>')+'</td></tr>'});
    $('accTab').innerHTML=t+'</tbody></table>';
    // patch the source links in after the template (links must be real anchors)
    const links=$('accTab').querySelectorAll('.q');m.st.forEach((s,i)=>{links[i].innerHTML='('+SRC[s[4]]+')'});
    $('accCfg').innerHTML='Config: '+SRC[m.cfg]+'. Attention: '+m.att+'.';
  }
  // memory to hold and run
  const PREC={2:'BF16',1:'FP8',0.5:'4-bit'};const ctxV=[4096,8192,16384,32768,65536,131072,262144];
  const hold={s:1,ci:4,seq:1};
  function drawHold(){
    const ctx=ctxV[hold.ci],seq=hold.seq;$('hdCtxV').textContent=fmt(ctx);$('hdSeqV').textContent=seq;
    const rows=M.map(m=>{const w=TOT[m.id]*1e9*hold.s,c=Math.min(ctx,m.ctx),kv=m.kv*(m.win?Math.min(c,m.win):c)*seq;return {m,w,kv,c,tot:w+kv}});
    const narrow=$('hdSvg').clientWidth<520,W=narrow?380:660,pl=narrow?92:126,pr=narrow?52:132,rh=22,H=rows.length*rh+52;
    const lg=Math.log10,x0=lg(1e9),x1=lg(4e12),X=v=>pl+(W-pl-pr)*(lg(Math.max(v,1e9))-x0)/(x1-x0);
    let s='';[[1e9,'1 GB'],[1e10,'10 GB'],[1e11,'100 GB'],[1e12,'1 TB']].forEach(([v,l])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="14" y2="'+(H-22)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    [[80e9,'H100 80 GB'],[141e9,'H200 141 GB'],[1128e9,'8 × H200 1,128 GB']].forEach(([v,l],i)=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="10" y2="'+(H-22)+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".6"/><text x="'+(X(v)+(i===1?3:-3))+'" y="'+(i===2?10:i===1?10:22)+'" font-size="10" fill="var(--mute)"'+(i===0?' text-anchor="end"':'')+'>'+(narrow?(i==2?'8 × H200':l.split(' ')[0]):l)+'</text>'});
    rows.forEach((r,i)=>{const y=28+i*rh;s+='<text x="'+(pl-6)+'" y="'+(y+12)+'" font-size="11" text-anchor="end">'+r.m.n.replace('Mistral ','')+'</text>';
      s+='<rect x="'+pl+'" y="'+(y+2)+'" width="'+(X(r.w)-pl).toFixed(1)+'" height="13" fill="var(--mute)" opacity=".55"><title>weights '+fmt(r.w/1e9,1)+' GB</title></rect>';
      s+='<rect x="'+X(r.w).toFixed(1)+'" y="'+(y+2)+'" width="'+Math.max(0,X(r.tot)-X(r.w)).toFixed(1)+'" height="13" fill="'+COL[r.m.id]+'"><title>KV cache '+fmtBytes(r.kv)+'</title></rect>';
      const g=Math.ceil(r.tot/141e9);s+='<text x="'+(X(r.tot)+4).toFixed(1)+'" y="'+(y+12)+'" font-size="10.5">'+fmt(r.tot/1e9,r.tot<1e10?1:0)+' GB'+(narrow?'':' · '+g+' × H200')+'</text>'});
    $('hdSvg').innerHTML=svgEl(W,H,s,'Memory to hold weights and cache');
    let t='<table><thead><tr><th>Model</th><th class="num">Weights ('+PREC[hold.s]+')</th><th class="num">Cache per sequence at '+fmt(ctx)+'</th><th class="num">r</th><th class="num">2 · P<sub>active</sub></th></tr></thead><tbody>';
    rows.forEach(r=>{t+='<tr><td>'+r.m.n+'</td><td class="num">'+fmt(r.w/1e9,r.w<1e10?1:0)+' GB</td><td class="num">'+fmtBytes(r.kv/seq)+(r.c<ctx?' <span class="q">(max '+fmt(r.m.ctx)+')</span>':'')+'</td><td class="num">'+(TOT[r.m.id]/ACT[r.m.id]).toFixed(1)+'</td><td class="num">'+fmt(2*ACT[r.m.id],0)+' GFLOPs</td></tr>'});
    $('hdTab').innerHTML=t+'</tbody></table>';
    const l3=rows.find(r=>r.m.id==='l3');$('hdNote').innerHTML='Large 3 at these settings: '+fmt(l3.w/1e9,0)+' GB of weights plus '+fmtBytes(l3.kv)+' of cache = '+fmt(l3.tot/1e9,0)+' GB, '+(l3.tot<=1128e9?'inside':'more than')+' one 8 × H200 node (1,128 GB).';
  }
  // cache against context
  function drawKV(){
    const narrow=$('kvSvg').clientWidth<520,W=narrow?420:660,H=narrow?300:330;
    const f=logFrame({W,H,pl:56,pr:narrow?112:130,pt:12,pb:38,x:[1024,262144],y:[2**24,2**37],
      xt:[[1024,'1K'],[4096,'4K'],[16384,'16K'],[65536,'64K'],[262144,'256K']],yt:[[2**24,'16 MiB'],[2**26,'64 MiB'],[2**28,'256 MiB'],[2**30,'1 GiB'],[2**32,'4 GiB'],[2**34,'16 GiB'],[2**36,'64 GiB']],xl:'context length (tokens), log scale',yl:'cache per sequence, 16-bit'});
    let s=f.s;const ends=[];
    ['m7','x7','x22','min14','s4','l3','m35'].forEach(id=>{const m=byId[id];let d='';const pts=[];for(let c=1024;c<=m.ctx;c*=2)pts.push(c);if(m.win&&pts.indexOf(m.win)<0)pts.push(m.win);pts.sort((a,b)=>a-b);
      pts.forEach((c,i)=>{const v=m.kv*(m.win?Math.min(c,m.win):c);d+=(i?'L':'M')+f.lx(c).toFixed(1)+' '+f.ly(v).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+COL[id]+'" stroke-width="2.2"/>';
      if(id==='m7')s+='<line x1="'+f.lx(8192)+'" x2="'+f.lx(8192)+'" y1="'+(f.ly(m.kv*4096)-5)+'" y2="'+(f.ly(m.kv*4096)+5)+'" stroke="'+COL[id]+'"/><text x="'+f.lx(8192)+'" y="'+(f.ly(m.kv*4096)+16)+'" font-size="10" text-anchor="middle" fill="var(--mute)">trained 8K</text>';
      const lc=m.ctx,v=m.kv*(m.win?Math.min(lc,m.win):lc);ends.push({x:f.lx(lc),y:f.ly(v),n:narrow?m.n.replace('Mistral ','').replace('Ministral 3 ','Ministral ')+' '+fmtBytes(v):m.n.replace('Mistral ','')+(id==='m35'?' (= Devstral 2)':'')+' '+fmtBytes(v),c:COL[id],how:fmt(m.kv)+' bytes per token × '+fmt(m.win?Math.min(lc,m.win):lc)+' positions'})});
    // labels at the right for the long-context models, at their own ends for the short ones
    const right=ends.filter(e=>e.x>=f.lx(262144)-1),left=ends.filter(e=>e.x<f.lx(262144)-1);
    s+=endLabels(right,W-(narrow?108:126),13);
    left.forEach(e=>{s+='<text x="'+(e.x+4)+'" y="'+(e.y-5)+'" font-size="10.5" fill="'+e.c+'"><title>'+e.how+'</title>'+e.n+'</text>'});
    $('kvSvg').innerHTML=svgEl(W,H,s,'KV cache per sequence against context');
  }
  const SRC={};document.querySelectorAll('#fitSrc span').forEach(a=>{SRC[a.dataset.k]=a.innerHTML});
  function all(){drawAcc();drawHold();drawKV()}
  $('accM').innerHTML=M.map(m=>'<option value="'+m.id+'"'+(m.id===sel.m?' selected':'')+'>'+m.n+'</option>').join('');
  $('accM').addEventListener('change',e=>{sel.m=e.target.value;drawAcc()});
  ['ein','eout','vis'].forEach(k=>$('acc_'+k).addEventListener('change',e=>{opt[k]=e.target.checked;drawAcc()}));
  segBind('hdP',v=>{hold.s=+v;drawHold()});
  $('hdCtx').addEventListener('input',e=>{hold.ci=+e.target.value;drawHold()});
  $('hdSeq').addEventListener('input',e=>{hold.seq=[1,2,4,8,16,32,64][+e.target.value];drawHold()});
  onTab('t-fit',all);
  let rw=0;addEventListener('resize',()=>{if(!$('t-fit').hidden){const w=$('t-fit').clientWidth<520;if(w!==rw){rw=w;drawHold();drawKV()}}});
})();
