// ---- DeepSeekMoE: expert layouts and combinations ----
(function(){
  const C={
    mix:{n:'Mixtral style',N:8,k:2,s:0,w:'-',a:'-'},
    v2:{n:'V2',N:160,k:6,s:2,w:'1,536',a:'softmax'},
    v3:{n:'V3',N:256,k:8,s:1,w:'2,048',a:'sigmoid'},
    v4f:{n:'V4-Flash',N:256,k:6,s:1,w:'2,048',a:'√softplus'},
    v4p:{n:'V4-Pro',N:384,k:6,s:1,w:'3,072',a:'√softplus'},
    v41:{n:'V4.1-Flash',N:384,k:6,s:1,w:'2,304',a:'√softplus'}
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

