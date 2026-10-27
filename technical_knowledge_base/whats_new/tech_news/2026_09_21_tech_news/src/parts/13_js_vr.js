// ---- Vera Rubin NVL72 against GB300 by interactivity (SemiAnalysis AgentX table) ----
(function(){
  const box=$('vrPlot');if(!box)return;
  // million tokens/s per all-in utility MW at matched interactivity (tok/s/user), SemiAnalysis table
  const R=[[75,37.94,44.14,64.0],[100,28.47,21.15,59.38],[125,12.01,2.97,51.55],[150,5.14,1.01,36.98],[170,3.92,0.35,21.78],[200,2.73,null,7.43]];
  const S=[['Vera Rubin NVL72, TRTLLM','var(--c3)',3],['GB300 NVL72, Dynamo SGLang','var(--c2)',1],['GB300 NVL72, Dynamo TRTLLM','var(--c4)',2]];
  let sel=3;
  function draw(){
    const narrow=box.clientWidth<560,W=Math.max(300,box.clientWidth||340),H=narrow?270:300,pl=narrow?40:48,pr=narrow?12:20,pt=14,pb=38;
    const xa=65,xb=210,ya=Math.log10(0.25),yb=Math.log10(100);
    const X=v=>pl+(W-pl-pr)*(v-xa)/(xb-xa),Y=v=>pt+(H-pt-pb)*(1-(Math.log10(v)-ya)/(yb-ya));
    let s='';
    [0.3,1,3,10,30,100].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(v)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    s+='<rect x="'+X(60<xa?xa:60)+'" y="'+pt+'" width="'+(X(100)-X(xa))+'" height="'+(H-pt-pb)+'" fill="var(--acc2)" opacity=".45"/>';
    s+='<text x="'+(X(xa)+4)+'" y="'+(H-pb-6)+'" font-size="11" fill="var(--mute)">60 to 100: typical</text>';
    R.forEach((r,i)=>{const x=X(r[0]);s+='<text x="'+x+'" y="'+(H-pb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+r[0]+'</text>';
      s+='<rect class="vrc" data-i="'+i+'" x="'+(x-14)+'" y="'+pt+'" width="28" height="'+(H-pt-pb)+'" fill="'+(i===sel?'var(--ink)':'transparent')+'" opacity="'+(i===sel?.07:1)+'" style="cursor:pointer"/>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">interactivity, tokens per second per user</text>';
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">M tokens/s per MW</text>';
    S.forEach(([n,c,k])=>{let d='';R.forEach(r=>{if(r[k]!=null)d+=(d?'L':'M')+X(r[0]).toFixed(1)+' '+Y(r[k]).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2.2"/>';R.forEach(r=>{if(r[k]!=null)s+='<circle cx="'+X(r[0])+'" cy="'+Y(r[k])+'" r="3.2" fill="'+c+'" style="pointer-events:none"/>'})});
    box.innerHTML=svgEl(W,H,s,'Throughput per megawatt against interactivity')+'<div class="lgd">'+S.map(q=>'<span><i style="background:'+q[1]+'"></i>'+q[0]+'</span>').join('')+'</div>';
    box.querySelectorAll('.vrc').forEach(el=>el.addEventListener('click',()=>{sel=+el.dataset.i;draw()}));
    const r=R[sel],best=Math.max(r[1],r[2]||0);
    $('vrDet').innerHTML='<b>At '+r[0]+' tokens per second per user</b>: Rubin '+r[3]+', GB300 on SGLang '+r[1]+(r[2]!=null?', on TRTLLM '+r[2]:', TRTLLM not reached')+' million tokens per second per MW. '+
      'Rubin over the better GB300 engine: <b>'+(r[3]/best).toFixed(2)+'x</b>'+(r[2]!=null?'; over GB300 on TRTLLM alone: '+(r[3]/r[2]).toFixed(1)+'x':'')+'. '+
      (r[0]===150?'This is the issue\'s "up to 7x".':r[0]===170?'SemiAnalysis quotes 62.9x here against TRTLLM (from unrounded values) but 5.56x against SGLang: "The engine label is therefore essential."':r[0]===75?'The 75 tokens per second point is the one the revenue model below uses.':'');
  }
  $('vrRows').innerHTML=[['Vera Rubin NVL72','$159.5B revenue','$149.9B modelled profit'],['GB300 NVL72 (Dynamo SGLang)','$114.9B revenue','$105.3B modelled profit'],['Ratio (derived)','1.39x revenue','1.42x profit; the issue\'s 39 to 42%'],['Implied cost per GW-year (derived)','$9.6B for both','revenue minus profit: 159.5 − 149.9 and 114.9 − 105.3']].map(r=>'<div><h4>'+r[0]+'</h4><div class="big">'+r[1]+'</div><p>'+r[2]+'</p></div>').join('');
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);
})();
