// ---- Run a Transformer: compose, translate with the real weights, watch decoding, inspect every attention map ----
(function(){
  if(!$('runSrc')||!window.TM)return;
  const esc=t=>String(t).replace('<','&lt;').replace('>','&gt;');
  const VN={full:'Full model',nope:'No positional encoding',h1:'One head'},pct=v=>(v*100).toFixed(1)+'%';
  const S={w:'the big red dog chased a small cat near the tree'.split(' '),v:'full',shuf:null,att:{k:'crs',l:1,h:-1},dk:0,dt:0,dplay:false,draf:0,dvis:false,dlast:0};
  const KC={det:'k-det',adj:'k-adj',noun:'k-noun',place:'k-place',verb:'k-verb',prep:'k-prep'};
  const cache={};function run(v,w){const key=v+'|'+w.join(' ');if(!cache[key])cache[key]=TM.translate(TM.load(v),w);return cache[key]}
  const clean=o=>o.filter(x=>x!=='</s>');
  // facts strip and the rule card
  $('runFacts').innerHTML=stat('Size','35,184 parameters','d_model 24, 4 heads, d_ff 96, 2 + 2 layers')+stat('Test accuracy, full model',pct(TM.variants.full.acc),'exact sentences, 2,000 held out')+stat('Weights in this page','117 KB','6-bit, three models')+stat('Browser against PyTorch','identical','200 of 200 translations');
  (function(){const ex='the big red dog chased a small cat near the tree'.split(' '),tr=LANG.translate(ex),al=LANG.align(ex);fit($('runRule'),w=>{$('runRule').innerHTML=alignSvg(w,ex,tr,al,null)})})();
  // source and target rows with alignment lines; att (optional) is a target x source matrix drawn as line strength
  function alignSvg(w,src,tgt,al,att,cap){const n=src.length,m=tgt.length,gl=x=>(LANG.GLOSS[x]||'').replace('(object marker)','OBJ').replace('(end)','end');let s='';
    if(w<560){const p=22,top=30,H=top+Math.max(n,m)*p+22,xl=Math.round(w*.3),xr=Math.round(w*.56),ys=i=>top+i*p,yt=j=>top+j*p;
      if(att)for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=att[j][i];if(a>.04)s+=ln2(xl+6,ys(i)-4,xr-6,yt(j)-4,'var(--c1)',{sw:.5+3*a,op:Math.min(1,.15+a)})}
      al.forEach((i,j)=>{if(i!=null&&!att)s+=ln2(xl+6,ys(i)-4,xr-6,yt(j)-4,'var(--c2)',{sw:1.4,op:.8})});
      src.forEach((x,i)=>s+=tx(xl,ys(i),x,{fs:12.5,a:'end'}));tgt.forEach((x,j)=>s+=tx(xr,yt(j),x,{fs:12.5,w:600})+tx(xr+x.length*7.6+8,yt(j),gl(x),{fs:11,c:'var(--mute)'}));
      s+=tx(xl,12,'English',{fs:11,c:'var(--mute)',a:'end'})+tx(xr,12,'Lindu',{fs:11,c:'var(--mute)'});
      return svgW(w,H,s,'Alignment between English and Lindu')}
    const pad=6,y1=24,y2=96,H=126,xs=i=>pad+(w-2*pad)*(i+.5)/n,xt=j=>pad+(w-2*pad)*(j+.5)/m;
    const fs=Math.max(11,Math.min(13,(w-2*pad)/Math.max(n,m)/4.6));
    if(att)for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=att[j][i];if(a>.04)s+=ln2(xs(i),y1+6,xt(j),y2-14,'var(--c1)',{sw:.5+3*a,op:Math.min(1,.15+a)})}
    al.forEach((i,j)=>{if(i!=null&&!att)s+=ln2(xs(i),y1+6,xt(j),y2-14,'var(--c2)',{sw:1.4,op:.8})});
    src.forEach((x,i)=>s+=tx(xs(i),y1,x,{fs,a:'middle'}));tgt.forEach((x,j)=>s+=tx(xt(j),y2,x,{fs,a:'middle',w:600})+tx(xt(j),y2+16,gl(x),{fs:11,a:'middle',c:'var(--mute)'}));
    s+=tx(pad,10,'English',{fs:11,c:'var(--mute)'})+tx(pad,H-2,att?'Lindu, model output (lines: cross-attention)':'Lindu (lines: which English word each Lindu word translates)',{fs:11,c:'var(--mute)'});
    return svgW(w,H,s,'Alignment between English and Lindu')}
  // the cross-attention head whose weights best match the rule alignment
  function bestHead(r,src,m){const al=LANG.align(src);let best={s:-1};r.crs.forEach((Lr,l)=>Lr.forEach((A,h)=>{let t=0,c=0;for(let j=0;j<m;j++)if(al[j]!=null){t+=A[j][al[j]];c++}const sc=c?t/c:0;if(sc>best.s)best={s:sc,l,h}}));return best}
  // ---- composer ----
  function drawSrc(){const st=LANG.state(S.w);
    $('runSrc').innerHTML=S.w.length?S.w.map(x=>'<span class="w">'+x+'</span>').join(''):'<span class="ph">Click words below to build a sentence.</span>';
    $('runChips').innerHTML=st.allowed.map(x=>'<button class="'+KC[LANG.kind(x)]+'" data-w="'+x+'">'+x+'</button>').join('')+(st.done&&st.allowed.length?'<span class="small mute" style="align-self:center">complete; add a place phrase or stop here</span>':'');
    $('runChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{S.w.push(b.dataset.w);S.shuf=null;update()}))}
  const done=()=>LANG.state(S.w).done;
  function update(){drawSrc();S.dk=0;S.dt=1;out();refit($('decSvg'));drawDec();refit($('attSvg'));cmp()}
  function out(){const host=$('runOut');if(!done()){host.innerHTML='<p class="small mute">Finish the sentence (subject, verb, object; a place phrase is optional) and the model translates it.</p>';return}
    const r=run(S.v,S.w),ref=LANG.translate(S.w),o=clean(r.out),ok=o.join(' ')===ref.join(' ');
    host.innerHTML='<div class="sent">'+o.map((x,j)=>'<span class="w'+(x===ref[j]?'':' bad')+'">'+x+'<small>'+(LANG.GLOSS[x]||'?')+'</small></span>').join('')+'</div>'+
      '<p class="small">'+(ok?'<span class="ok">Correct</span>: identical to the rule-based reference.':'<span class="no">Wrong</span> at the shaded words. The rules say: <span class="mono">'+ref.join(' ')+'</span>.')+' <span class="mute">'+VN[S.v]+', greedy decoding, '+o.length+' words plus the end symbol.</span></p><div id="runAl"></div>';
    const bh=bestHead(r,S.w,o.length),A=r.crs[bh.l][bh.h];
    host.innerHTML+='<p class="small mute">Lines: the cross-attention of layer '+(bh.l+1)+', head '+(bh.h+1)+', the head whose weights best match the rules on this sentence ('+(bh.s*100).toFixed(0)+'% of its weight, on average, on the English word each Lindu word translates). Every head is in the maps below.</p>';
    fit($('runAl'),w=>{$('runAl').innerHTML=alignSvg(w,S.w,r.out.slice(0,o.length),LANG.align(S.w).slice(0,o.length),A.slice(0,o.length))})}
  $('runUndo').addEventListener('click',()=>{S.w.pop();S.shuf=null;update()});$('runClear').addEventListener('click',()=>{S.w=[];S.shuf=null;update()});
  let rs=1;$('runRand').addEventListener('click',()=>{S.w=LANG.sample(mulberry32(rs++*977));S.shuf=null;update()});
  $('runEx').addEventListener('change',e=>{if(e.target.value){S.w=e.target.value.split(' ');S.shuf=null;update()}});
  const vseg=$('runV');function setV(v){S.v=v;vseg.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.m===v);b.setAttribute('aria-pressed',b.dataset.m===v?'true':'false')});
    $('runVacc').textContent=VN[v]+': '+pct(TM.variants[v].acc)+' of held-out sentences exactly right ('+pct(TM.variants[v].tacc)+' of words)';buildHeads();update()}
  vseg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setV(b.dataset.m)));
  // ---- step-by-step decoding ----
  function decSel(){const r=run(S.v,S.w),L=+$('decL').value,h=+$('decH').value,M=r.crs[L];return {r,row:j=>S.w.map((_,i)=>h<0?M.reduce((s,hh)=>s+hh[j][i],0)/M.length:M[h][j][i])}}
  function drawDec(){const host=$('decSvg');if(!done()){host.innerHTML='';$('decStep').textContent='';$('decCap').textContent='Finish the sentence first.';return}
    const {r,row}=decSel(),m=r.out.length,k=Math.min(S.dk,m-1),e=RM?1:ease(cl01(S.dt/.6)),w=host.clientWidth;if(!w)return;
    const a=row(k),p=r.probs[k],top=[...p.keys()].sort((x,y)=>p[y]-p[x]).slice(0,5);
    const n=S.w.length,pad=6,nar=w<560;let s='',y=12;
    s+=tx(pad,y,'Source, with this step\'s cross-attention',{fs:11,c:'var(--mute)'});
    if(!nar){const xs=i=>pad+(w-2*pad)*(i+.5)/n,fs=Math.max(11,Math.min(13,(w-2*pad)/n/4.6));S.w.forEach((x,i)=>{const bw=(w-2*pad)/n-4,hh=40*a[i]*e;s+=rc(xs(i)-bw/2,62-hh,bw,hh,'var(--c1)',{r:2,op:.85})+tx(xs(i),78,x,{fs,a:'middle'})});y=104}
    else{const lw=64;S.w.forEach((x,i)=>{const yy=y+8+i*18;s+=tx(pad+lw-6,yy+11,x,{fs:12,a:'end'})+rc(pad+lw,yy+2,(w-2*pad-lw-44)*a[i]*e,12,'var(--c1)',{r:2,op:.85})+tx(pad+lw+(w-2*pad-lw-44)*a[i]*e+4,yy+12,a[i]>.05?(a[i]*100).toFixed(0)+'%':'',{fs:11,c:'var(--mute)'})});y=y+8+n*18+20}
    s+=tx(pad,y,'Written so far (the decoder sees only these, through its mask)',{fs:11,c:'var(--mute)'});
    let x=pad,ty=y+8;const toks=['<s>'].concat(r.out.slice(0,k)).map(t=>[t,0]).concat([[r.out[k],1]]);
    toks.forEach(([t,isNew])=>{const tw=Math.max(26,t.length*7+12);if(x+tw>w-pad){x=pad;ty+=26}const body=rc(x,ty,tw,22,isNew?'var(--acc2)':'var(--soft)',{s:isNew?'var(--acc)':'var(--line)'})+tx(x+tw/2,ty+15,esc(t),{fs:11.5,a:'middle',w:isNew?600:null});s+=isNew?G(e,body):body;x+=tw+4});
    const nx=r.out[k];
    const y1=ty+46;s+=tx(pad,y1,'Next-word probabilities (top 5 of 58)',{fs:11,c:'var(--mute)'});
    const lw=Math.min(150,w*.34);top.forEach((v,i)=>{const yy=y1+10+i*20,bw=(w-pad*2-lw-56)*p[v];s+=tx(pad,yy+12,esc(TM.vocab[v])+(LANG.GLOSS[TM.vocab[v]]?' ('+LANG.GLOSS[TM.vocab[v]].replace(/[()]/g,'')+')':''),{fs:11.5,w:i===0?600:400})+rc(pad+lw,yy+2,Math.max(1,bw*e),13,i===0?'var(--c1)':'var(--dim)',{r:2})+tx(pad+lw+Math.max(1,bw*e)+5,yy+13,(p[v]*100).toFixed(p[v]>.995?2:1)+'%',{fs:11})});
    host.innerHTML=svgW(w,y1+112,s,'Decoding step '+(k+1));
    const ref=LANG.translate(S.w).concat(['</s>']),gl=LANG.GLOSS[nx]||'',src=S.w[LANG.align(S.w)[k]];
    $('decStep').textContent='Word '+(k+1)+' of '+m+': '+nx+(gl?' ('+gl+')':'');
    let mx=0;a.forEach((v,i)=>{if(v>a[mx])mx=i});
    $('decCap').innerHTML=(nx==='</s>'?'The end symbol: the translation is complete, so decoding stops.':'The model picks <b>'+nx+'</b> with '+(p[TM.vocab.indexOf(nx)]*100).toFixed(1)+'% probability (label smoothing 0.1 trains it never to be much surer than about 90%). '+(src?'By the rules it translates "'+src+'"; ':nx==='su'?'It is the object marker, which translates no single English word; ':'')+'the strongest cross-attention in this view is on "'+S.w[mx]+'" ('+(a[mx]*100).toFixed(0)+'%).')+(ref[k]!==nx?' <span class="no">The rules wanted '+ref[k]+' here.</span>':'');
    const sc=$('decScrub');sc.max=m-1;sc.value=k;const pb=$('decPlay'),end=k>=m-1;pb.innerHTML=S.dplay?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',S.dplay?'Pause':end?'Replay':'Play')}
  const dlive=()=>S.dvis&&!document.hidden&&$('dec').offsetParent!==null;
  function dtick(now){S.draf=0;if(!S.dplay||!dlive())return;const dt=S.dlast?Math.min(100,now-S.dlast):16;S.dlast=now;const spd=+$('decSpd').value;S.dt+=dt*spd/1500;
    const m=run(S.v,S.w).out.length;if(S.dt>=1){if(S.dk<m-1){S.dk++;S.dt=0}else{S.dt=1;S.dplay=false}}drawDec();if(S.dplay)S.draf=requestAnimationFrame(dtick)}
  function dkick(){if(S.dplay&&dlive()&&!S.draf){S.dlast=0;S.draf=requestAnimationFrame(dtick)}}
  const dpause=()=>{S.dplay=false;if(S.draf){cancelAnimationFrame(S.draf);S.draf=0}};
  $('decPlay').addEventListener('click',()=>{if(!done())return;if(S.dplay)dpause();else{const m=run(S.v,S.w).out.length;if(S.dk>=m-1){S.dk=0;S.dt=RM?1:0}S.dplay=!RM||true;dkick()}drawDec()});
  $('decFwd').addEventListener('click',()=>{dpause();if(!done())return;S.dk=Math.min(run(S.v,S.w).out.length-1,S.dk+1);S.dt=1;drawDec()});
  $('decBack').addEventListener('click',()=>{dpause();S.dk=Math.max(0,S.dk-1);S.dt=1;drawDec()});
  $('decScrub').addEventListener('input',e=>{dpause();S.dk=+e.target.value;S.dt=1;drawDec()});
  $('decL').addEventListener('change',drawDec);$('decH').addEventListener('change',drawDec);
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{S.dvis=es[es.length-1].isIntersecting;dkick()},{threshold:.15}).observe($('dec'));else S.dvis=true;
  document.addEventListener('visibilitychange',dkick);fit($('decSvg'),()=>drawDec());
  // ---- attention maps ----
  function buildHeads(){const h=TM.variants[S.v].h,el=$('attH');if(S.att.h>=h)S.att.h=-1;
    el.innerHTML='<button data-m="-1">'+(h>1?'All heads':'The one head')+'</button>'+(h>1?[...Array(h)].map((_,i)=>'<button data-m="'+i+'">Head '+(i+1)+'</button>').join(''):'');
    el.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',+b.dataset.m===S.att.h);b.addEventListener('click',()=>{S.att.h=+b.dataset.m;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));refit($('attSvg'))})});
    $('decH').innerHTML='<option value="-1">'+(h>1?'heads averaged':'its one head')+'</option>'+(h>1?[...Array(h)].map((_,i)=>'<option value="'+i+'">head '+(i+1)+'</option>').join(''):'')}
  [['attK','k'],['attL','l']].forEach(([id,key])=>$(id).querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{S.att[key]=key==='l'?+b.dataset.m:b.dataset.m;$(id).querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});refit($('attSvg'))})));
  $('attDots').addEventListener('change',()=>refit($('attSvg')));
    // heatmap at the measured width; one map, or one small map per head
  function heat(w,rows,cols,mats,titles,dots){const lw=Math.min(84,Math.max(...rows.map(t=>t.length))*6.6+10),many=mats.length>1;
    const per=many&&w>=620?2:1,gw=(w-(per-1)*14)/per,cellW=Math.max(8,Math.min(30,(gw-lw-4)/cols.length)),cellH=Math.min(24,Math.max(13,cellW*.8)),top=58;
    let s='',X=0,Y=0;const hgt=top+rows.length*cellH+24;
    mats.forEach((M,mi)=>{const ox=(mi%per)*(gw+14),oy=Math.floor(mi/per)*hgt;let g='';
      if(titles[mi])g+=tx(ox,oy+12,titles[mi],{fs:11.5,w:600});
      cols.forEach((c,i)=>{const x=ox+lw+i*cellW+cellW/2,y=oy+top-4;g+='<text x="'+x.toFixed(1)+'" y="'+y+'" font-size="11" transform="rotate(-55 '+x.toFixed(1)+' '+y+')" fill="var(--mute)">'+esc(c)+'</text>'});
      rows.forEach((r,j)=>{const y=oy+top+j*cellH;g+=tx(ox+lw-4,y+cellH/2+4,esc(r),{fs:11,a:'end'});
        cols.forEach((c,i)=>{const v=M[j]&&M[j][i]!=null?M[j][i]:0;g+='<rect x="'+(ox+lw+i*cellW).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(cellW-1).toFixed(1)+'" height="'+(cellH-1).toFixed(1)+'" fill="var(--c1)" fill-opacity="'+Math.max(.03,v).toFixed(3)+'"><title>'+esc(r)+' → '+esc(c)+': '+(v*100).toFixed(1)+'%</title></rect>';
          if(dots&&dots[j]===i)g+='<circle cx="'+(ox+lw+i*cellW+cellW/2-.5).toFixed(1)+'" cy="'+(y+cellH/2-.5).toFixed(1)+'" r="'+Math.max(2,Math.min(4,cellW/6)).toFixed(1)+'" fill="var(--c2)"/>'})});
      s+=g;X=Math.max(X,ox+gw);Y=Math.max(Y,oy+hgt)});
    return svgW(w,Y,s,'Attention map')}
  fit($('attSvg'),w=>{const host=$('attSvg');if(!done()){host.innerHTML='<p class="small mute">Finish the sentence to see its attention maps.</p>';$('attNote').textContent='';return}
    const r=run(S.v,S.w),o=r.out,K=S.att.k,L=S.att.l,h=S.att.h,src=S.w,din=r.dec_in;
    const A=K==='enc'?r.enc[L]:K==='self'?r.self[L]:r.crs[L],rows=K==='enc'?src:o.map(t=>'→ '+t),cols=K==='crs'||K==='enc'?src:din;
    const avg=A[0].map((row,j)=>row.map((_,i)=>A.reduce((s,hh)=>s+hh[j][i],0)/A.length));
    const mats=h>=0?[A[h]]:(A.length>1?A:[A[0]]),titles=h>=0?['Head '+(h+1)]:(A.length>1?A.map((_,i)=>'Head '+(i+1)):['']);
    const dots=K==='crs'&&$('attDots').checked?LANG.align(src).concat([null]):null;
    host.innerHTML=heat(w,rows,cols,mats,titles,dots);
    const nm={crs:'Cross-attention: each Lindu word being chosen (row) looks at the English source (columns). The pattern crosses itself: the verb is chosen last while looking near the middle of the English sentence, and adjectives are read back to front.',enc:'Encoder self-attention: every English word looks at every English word, in both directions.',self:'Decoder masked self-attention: each step sees only the start symbol and the words already written, so everything above the diagonal is exactly zero.'};
    $('attNote').innerHTML=nm[K]+' '+VN[S.v]+', layer '+(L+1)+(h>=0?', head '+(h+1):', every head')+'. Hover a cell for its weight.'});
  // ---- the three variants on this sentence ----
  function cmp(){const host=$('cmpTab');if(!done()){host.innerHTML='';return}const w=S.shuf||S.w,ref=LANG.translate(S.w).join(' ');
    let h='<div class="tw"><table><thead><tr><th>Model</th><th>Held-out accuracy</th><th>Its translation of "'+w.join(' ')+'"</th></tr></thead><tbody>';
    ['full','nope','h1'].forEach(v=>{const o=clean(run(v,w).out).join(' ');h+='<tr><td>'+VN[v]+'</td><td class="num">'+pct(TM.variants[v].acc)+'</td><td><span class="mono">'+o+'</span> '+(S.shuf?'':(o===ref?'<span class="ok">right</span>':'<span class="no">wrong</span>'))+'</td></tr>'});
    host.innerHTML=h+'</tbody></table></div>';$('cmpTok').textContent=pct(TM.variants.nope.tacc);$('cmpSent').textContent=pct(TM.variants.nope.acc);
    $('cmpNote').textContent=S.shuf?'Scrambled input, not a sentence: the no-position model gives the same output as for the original order.':''}
  let sh=1;$('cmpShuf').addEventListener('click',()=>{if(!done())return;const r=mulberry32(sh++*131),a=S.w.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}S.shuf=a;cmp();
    const o1=clean(run('nope',S.w).out).join(' '),o2=clean(run('nope',a).out).join(' ');$('cmpShufOut').innerHTML='<p class="small">No positional encoding: original order gives <span class="mono">'+o1+'</span>; scrambled order gives <span class="mono">'+o2+'</span>: '+(o1===o2?'<span class="ok">identical</span>.':'<span class="no">different</span> (floating-point rounding can break an exact tie).')+' The full model\'s output changes with the order, as it should.</p>'});
  $('cmpBack').addEventListener('click',()=>{S.shuf=null;$('cmpShufOut').innerHTML='';cmp()});
  // ---- test in the browser ----
  $('tstGo').addEventListener('click',()=>{const N=300,r=mulberry32(20260930),sents=[...Array(N)].map(()=>LANG.sampleU(r)),res={full:[0,0,0],nope:[0,0,0],h1:[0,0,0]};let i=0;$('tstGo').disabled=true;
    (function chunk(){const end=Math.min(N,i+10);for(;i<end;i++){const ref=LANG.translate(sents[i]).concat(['</s>']);['full','nope','h1'].forEach(v=>{const o=TM.translate(TM.load(v),sents[i]).out;res[v][0]+=o.join(' ')===ref.join(' ')?1:0;ref.forEach((x,j)=>{res[v][1]+=o[j]===x?1:0});res[v][2]+=ref.length})}
      $('tstMsg').textContent='translated '+i+' of '+N+' with each model';
      if(i<N)setTimeout(chunk,0);else{$('tstGo').disabled=false;$('tstOut').innerHTML='<div class="out">'+['full','nope','h1'].map(v=>stat(VN[v],pct(res[v][0]/N)+' of sentences',pct(res[v][1]/res[v][2])+' of words, '+N+' uniform sentences')).join('')+'</div>'}})()});
  // ---- training curves ----
  (function(){const V=TM.vocab.length,e=.1,pt=1-e+e/V,floor=-(pt*Math.log(pt))-(V-1)*(e/V)*Math.log(e/V);$('trFloor').textContent=floor.toFixed(3);
    fit($('trSvg'),w=>{const H=210,pl=40,pr=10,pt2=10,pb=32,x=s=>pl+(w-pl-pr)*s/16000,y=v=>pt2+20+(H-pt2-20-pb)*(1-(v-.6)/(1.4-.6));let s='';
      [.6,.8,1,1.2,1.4].forEach(v=>s+=ln2(pl,y(v),w-pr,y(v),'var(--line)')+tx(pl-4,y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'}));
      [0,4000,8000,12000,16000].forEach(v=>s+=tx(x(v),H-pb+15,v?fmt(v/1000)+'K':'0',{fs:11,a:'middle',c:'var(--mute)'}));s+=tx((pl+w)/2,H-3,'training step',{fs:11,a:'middle',c:'var(--mute)'});
      s+=ln2(pl,y(floor),w-pr,y(floor),'var(--mute)',{da:'4 3'});
      const col={full:'var(--c1)',nope:'var(--c2)',h1:'var(--c3)'};const ends=[];
      Object.keys(col).forEach(v=>{const L=TM.variants[v].log;s+='<polyline points="'+L.map(([st,l])=>x(st).toFixed(1)+','+y(Math.min(1.4,l)).toFixed(1)).join(' ')+'" fill="none" stroke="'+col[v]+'" stroke-width="2"'+(v==='h1'?' stroke-dasharray="5 3"':'')+'/>';ends.push({y:y(L[L.length-1][1]),n:{full:'Full',nope:'No positions',h1:'One head'}[v],c:col[v]})});
      let lx=pl+4;ends.forEach(en=>{s+=ln2(lx,pt2+8,lx+16,pt2+8,en.c,{sw:2})+tx(lx+20,pt2+12,en.n,{fs:11});lx+=en.n.length*6.2+34});
      $('trSvg').innerHTML=svgW(w,H,s,'Training loss of the three models')})})();
  // links from other tabs can preload an example
  document.querySelectorAll('a[data-ex]').forEach(a=>a.addEventListener('click',()=>{if(a.dataset.ex==='swap'){S.w='the dog chased the cat'.split(' ');setV('nope');setTimeout(()=>$('runCmp').scrollIntoView({block:'start'}),30)}}));
  onTab('t-run',()=>{refit($('runRule'));refit($('decSvg'));refit($('attSvg'));refit($('trSvg'));const al=$('runAl');if(al)refit(al)});
  setV('full');
})();
