// ---- KV compression experiment (t-kvc): charts and tables from BKD.kvc (src/kvc/summarize.py) ----
(function(){
  const K=BKD.kvc,$=id=>document.getElementById(id);if(!$('kc-pa'))return;
  if(!K)return;
  const PL=[['random_nosink','Random, no sinks','var(--dim)','2 3'],['random','Random + first 4 tokens','var(--c5)',''],['random_head','Random per head + first 4','var(--c6)','5 3'],['recent','First 4 + most recent (StreamingLLM)','var(--c4)',''],['h2o','Heavy hitters per head (H2O)','var(--c2)',''],['snapkv','SnapKV per head','var(--c1)',''],['snapkv_all','SnapKV, one selection for all','var(--c3)','']];
  const R=K.meta.ratios,xs=[1].concat(R);
  const wid=el=>{const w=el.clientWidth;return w>40?w:Math.max(280,Math.min(420,(document.documentElement.clientWidth||900)-40))};
  function chart(el,get,o){
    const W=Math.max(280,Math.min(860,wid(el))),H=220,L=40,Rr=8,T=8,B=30,x=i=>L+(W-L-Rr)*i/(xs.length-1);
    const y=o.log?(v=>T+(H-T-B)*(1-(Math.log(v)-Math.log(o.lo))/(Math.log(o.hi)-Math.log(o.lo)))):(v=>T+(H-T-B)*(1-(v-o.lo)/(o.hi-o.lo)));
    let b='';o.ticks.forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,o.fmt(v),{a:'end',fs:10,fill:'var(--mute)'})});
    xs.forEach((v,i)=>{b+=RD.t(x(i),H-B+14,(v*100)+'%',{a:i===0?'start':(i===xs.length-1?'end':'middle'),fs:10,fill:'var(--mute)'})});
    b+=RD.t((L+W-Rr)/2,H-3,'share of the prompt\'s cache kept',{a:'middle',fs:10,fill:'var(--mute)'});
    PL.forEach(p=>{const v=xs.map(r=>get(p[0],r)).map(v=>Math.max(o.lo,Math.min(o.hi,v)));
      b+='<polyline fill="none" stroke="'+p[2]+'" stroke-width="2"'+(p[3]?' stroke-dasharray="'+p[3]+'"':'')+' points="'+v.map((u,i)=>x(i).toFixed(1)+','+y(u).toFixed(1)).join(' ')+'"/>';
      v.forEach((u,i)=>{b+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(u).toFixed(1)+'" r="2.5" fill="'+p[2]+'"/>'})});
    el.innerHTML=RD.svg(W,H,b,o.label);
  }
  const rowA=(p,r)=>K.A.rows.find(x=>x.policy===p&&x.ratio===r),rowB=(p,r)=>K.B.rows.find(x=>x.policy===p&&x.ratio===r);
  function plots(){
    chart($('kc-pa'),(p,r)=>r===1?K.A.full_acc:rowA(p,r).acc,{lo:0,hi:1,ticks:[0,0.25,0.5,0.75,1],fmt:v=>Math.round(v*100)+'%',label:'retrieval accuracy'});
    const hi=40,tk=[15,20,25,30,40];
    chart($('kc-pb'),(p,r)=>r===1?K.B.full_ppl:rowB(p,r).ppl,{log:true,lo:14,hi:hi,ticks:tk,fmt:v=>String(v),label:'perplexity'});
    $('kc-leg').innerHTML=PL.map(p=>'<span style="--sw:'+p[2]+'">'+p[1]+'</span>').join('');
  }
  function table(){
    const r=+$('kc-r').value;
    let h='<thead><tr><th>Policy</th><th>Selection</th><th class="num">Task A accuracy</th><th class="num">Needle line kept</th><th class="num">Task B perplexity</th><th class="num">Freeable in place</th><th class="num">With compaction</th></tr></thead><tbody>';
    h+='<tr><td>Full cache</td><td>none</td><td class="num">'+(100*K.A.full_acc).toFixed(0)+'%</td><td class="num">100%</td><td class="num">'+K.B.full_ppl.toFixed(1)+'</td><td class="num">0%</td><td class="num">0%</td></tr>';
    PL.forEach(p=>{const a=rowA(p[0],r),b=rowB(p[0],r),uni=!(p[0]==='random_head'||p[0]==='snapkv'||p[0]==='h2o');
      h+='<tr><td>'+p[1]+'</td><td>'+(uni?'same everywhere':'per layer and head')+'</td><td class="num">'+(100*a.acc).toFixed(0)+'%'+(a.seeds>1?' <span class="mute">('+(100*a.acc_min).toFixed(0)+' to '+(100*a.acc_max).toFixed(0)+')</span>':'')+'</td><td class="num">'+(100*a.needle).toFixed(0)+'%</td><td class="num">'+b.ppl.toFixed(1)+(b.seeds>1?' <span class="mute">('+b.ppl_min.toFixed(1)+' to '+b.ppl_max.toFixed(1)+')</span>':'')+'</td><td class="num">'+(100*b.free).toFixed(0)+'%</td><td class="num">'+(uni?(100*(1-r)).toFixed(0)+'%':'0%')+'</td></tr>'});
    $('kc-tbl').innerHTML=h+'</tbody>';
  }
  function cov(){
    const E=K.example,el=$('kc-cov'),W=Math.max(280,Math.min(860,wid(el))),L=W<480?110:170,rh=16,H=10+PL.length*(rh+6)+16;
    let b='';const C=E.C,x=i=>L+(W-L-6)*i/C;
    PL.forEach((p,k)=>{const m=E.masks[p[0]];if(!m)return;const y=10+k*(rh+6);
      b+=RD.t(0,y+rh-4,p[1].length>(W<480?16:28)?p[1].slice(0,W<480?15:27)+'.':p[1],{fs:10.5});
      const bw=(W-L-6)/C;
      for(let i=0;i<C;i++){const v=m[i];if(v<=0)continue;b+='<rect x="'+x(i).toFixed(2)+'" y="'+y+'" width="'+Math.max(0.6,bw).toFixed(2)+'" height="'+rh+'" fill="'+p[2]+'" opacity="'+(0.15+0.85*v).toFixed(2)+'"/>'}
      b+=RD.t(W-4,y+rh-4,E.ok[p[0]]?'right':'wrong',{a:'end',fs:10,fill:E.ok[p[0]]?'var(--good)':'var(--bad)'});
    });
    if(E.needle){const n0=E.needle[0],n1=E.needle[1];b+='<rect x="'+x(n0)+'" y="4" width="'+Math.max(2,x(n1)-x(n0))+'" height="'+(H-14)+'" fill="none" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="3 2"/>';b+=RD.t(x(n0),H-2,'the line asked about',{fs:10,fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,H,b,'kept positions');
    $('kc-covnote').innerHTML='Example 1 of Task A ('+C+' context tokens; the dashed box is the line the question asks about, line '+(E.pos+1)+' of 60). Shade: share of the 224 (layer, KV head) pairs that keep each position. "right" or "wrong": whether the model then answered correctly.';
  }
  const sel=$('kc-r');R.forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=(r*100)+'% kept';if(r===0.25)o.selected=true;sel.appendChild(o)});
  sel.addEventListener('change',table);
  const all=()=>{plots();table();cov()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-kvc']=[all];
  let tm=0;addEventListener('resize',()=>{if($('t-kvc').hidden)return;clearTimeout(tm);tm=setTimeout(()=>{plots();cov()},80)});
  all();
})();
