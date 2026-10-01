// ---- DeepSeekMoE: expert layouts and combinations ----
(function(){
  const C={
    mix:{n:'Mixtral style',N:8,k:2,s:0,w:'-',a:'-'},
    v2:{n:'V2',N:160,k:6,s:2,w:'1,536',a:'softmax'},
    v3:{n:'V3',N:256,k:8,s:1,w:'2,048',a:'sigmoid'},
    v4f:{n:'V4-Flash',N:256,k:6,s:1,w:'2,048',a:'√softplus'},
    v4p:{n:'V4-Pro',N:384,k:6,s:1,w:'3,072',a:'√softplus'},
    v41:{n:'V4.1-Flash',N:384,k:6,s:null,w:'not stated',a:'not stated'}
  };
  let cur='v3',rnd=mulberry32(7);
  function binom(n,k){let r=1n;for(let i=0n;i<BigInt(k);i++){r=r*(BigInt(n)-i)/(i+1n)}return r}
  function sci(b){const s=b.toString();if(s.length<7)return Number(b).toLocaleString('en-GB');return (+(s[0]+'.'+s.slice(1,3))).toFixed(1)+' × 10<sup>'+(s.length-1)+'</sup>'}
  $('moeC').innerHTML=Object.entries(C).map(([k,v])=>'<button data-c="'+k+'"'+(k===cur?' class="on"':'')+'>'+v.n+'</button>').join('');
  $('moeC').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cur=b.dataset.c;$('moeC').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()}));
  function draw(){
    const c=C[cur],cols=c.N<=8?8:(c.N<=160?20:(c.N<=256?32:32));
    const pick=new Set();while(pick.size<c.k)pick.add(Math.floor(rnd()*c.N));
    const g=$('moeGrid');g.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';g.style.maxWidth=(c.N<=8?240:640)+'px';
    let h='';for(let i=0;i<c.N;i++)h+='<span'+(pick.has(i)?' class="on"':'')+' title="routed expert '+(i+1)+'"></span>';
    g.innerHTML=h;
    const b=binom(c.N,c.k);
    $('moeOut').innerHTML=
      '<div class="stat"><div class="k">Routed experts per token</div><div class="v">'+c.k+' of '+c.N+'</div><div class="d">blue: this token\'s picks</div></div>'+
      '<div class="stat"><div class="k">Shared, always on</div><div class="v" style="color:var(--good)">'+(c.s===null?'not stated':c.s)+'</div><div class="d">'+(c.s?'every token passes through '+(c.s>1?'them':'it'):(c.s===0?'none in this layout':'in the sources'))+'</div></div>'+
      '<div class="stat"><div class="k">Possible expert sets, C('+c.N+', '+c.k+')</div><div class="v">'+sci(b)+'</div><div class="d">'+(b>1000000n?b.toLocaleString('en-GB'):'per token per layer')+'</div></div>'+
      '<div class="stat"><div class="k">Expert width · affinity</div><div class="v" style="font-size:15px">'+c.w+' · '+c.a+'</div><div class="d">intermediate dimension · scoring function</div></div>';
  }
  $('moeR').addEventListener('click',draw);draw();
})();

// ---- Aux-loss-free balancing: a toy control loop (illustrative) ----
(function(){
  const N=16,K=2,T=1024,S=300;
  const pop=Array.from({length:N},(_,i)=>i<3?0.8:(i<5?0.4:0));
  const sig=x=>1/(1+Math.exp(-x));
  function run(on,gam){
    const r=mulberry32(11),b=new Array(N).fill(0),hist=[];let load=[];
    const gauss=()=>{let u=r()||1e-9,v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
    for(let st=0;st<S;st++){
      load=new Array(N).fill(0);
      for(let t=0;t<T;t++){
        const sc=pop.map(p=>sig(p+gauss()));
        let i1=-1,i2=-1,v1=-9,v2=-9;for(let i=0;i<N;i++){const v=sc[i]+(on?b[i]:0);if(v>v1){i2=i1;v2=v1;i1=i;v1=v}else if(v>v2){i2=i;v2=v}}
        load[i1]++;load[i2]++;   // gate weights would use sc[i], the unbiased affinity
      }
      const mean=T*K/N;
      if(on)for(let i=0;i<N;i++){if(load[i]>mean)b[i]-=gam;else if(load[i]<mean)b[i]+=gam}
      hist.push((load[0]+load[1]+load[2])/3/mean);
    }
    return {hist,load,b};
  }
  function draw(){
    const on=$('balOn').checked,g=+$('balG').value;
    const A=run(on,g),B=run(false,g);
    const W=640,H=200,pl=40,pr=10,pt=12,pb=28,ymax=Math.max(2.5,Math.ceil(2*Math.max(...B.hist))/2),xs=i=>pl+(W-pl-pr)*i/(S-1),ys=v=>pt+(H-pt-pb)*(1-(v-1)/(ymax-1));
    let s='';
    for(let v=1;v<=ymax;v+=0.5){s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ys(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(1)+'×</text>'}
    for(let x=0;x<=S;x+=50)s+='<text x="'+xs(Math.min(x,S-1))+'" y="'+(H-10)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+x+'</text>';
    const path=h=>'M'+h.map((v,i)=>xs(i).toFixed(1)+','+ys(v).toFixed(1)).join('L');
    s+='<path d="'+path(B.hist)+'" fill="none" stroke="var(--dim)" stroke-width="1.6"/>';
    if(on)s+='<path d="'+path(A.hist)+'" fill="none" stroke="var(--acc)" stroke-width="1.8"/>';
    s+='<text x="'+(W-pr)+'" y="'+(pt+10)+'" font-size="11" text-anchor="end" fill="var(--mute)">load of the three most popular experts ÷ mean load, by step</text>';
    $('balSvg').innerHTML=svgEl(W,H,s,'load imbalance over steps');
    const fin=A.hist.slice(-50).reduce((a,c)=>a+c,0)/50, base=B.hist.slice(-50).reduce((a,c)=>a+c,0)/50;
    let within=A.hist.findIndex((v,i)=>A.hist.slice(i,i+20).every(x=>x<1.1));
    const mean=T*K/N;
    $('balOut').innerHTML='<div class="stat"><div class="k">Imbalance, last 50 steps</div><div class="v">'+(on?fin:base).toFixed(2)+'×</div><div class="d">grey line: bias off, '+base.toFixed(2)+'×</div></div>'+
      '<div class="stat"><div class="k">Steps until within 10% of the mean</div><div class="v">'+(on&&within>=0?within:'never')+'</div><div class="d">and held for 20 steps</div></div>'+
      '<div class="stat"><div class="k">Final biases, popular experts</div><div class="v" style="font-size:15px">'+(on?A.b.slice(0,3).map(v=>v.toFixed(3)).join(', '):'0 (off)')+'</div><div class="d">negative: pushed out of the top-k</div></div>'+
      '<div class="stat" style="grid-column:1/-1"><div class="k">Tokens per expert at the last step (mean '+mean+')</div><div style="display:flex;align-items:flex-end;gap:2px;height:46px;margin-top:4px">'+(on?A:B).load.map((l,i)=>'<span title="expert '+(i+1)+': '+l+'" style="flex:1;background:'+(i<5?'var(--bad)':'var(--acc)')+';height:'+Math.min(100,100*l/(mean*3)).toFixed(0)+'%;border-radius:2px 2px 0 0"></span>').join('')+'</div><div class="d">orange: the experts given a higher base affinity</div></div>';
  }
  $('balOn').addEventListener('change',draw);$('balG').addEventListener('change',draw);
  let done=false;const first=()=>{if(!done){done=true;draw()}};
  onTab('t-read',first);
})();
