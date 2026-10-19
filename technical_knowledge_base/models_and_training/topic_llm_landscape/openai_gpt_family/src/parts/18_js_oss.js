// ---- gpt-oss on one GPU: parameter accounting from config.json, memory, KV cache, MXFP4 ----
const OSS=(function(){
  function acc(L,E,k){const d=2880,ff=2880,V=201088,H=64,KV=8,hd=64;
    const expert=d*2*ff+2*ff+ff*d+d,router=d*E+E,mlp=L*(E*expert+router);
    const attn=L*(d*H*hd+H*hd+2*(d*KV*hd+KV*hd)+H*hd*d+d+H),norms=L*2*d+d,emb=V*d;
    const total=mlp+attn+2*emb+norms,active=L*(k*expert+router)+attn+emb+norms;
    return {L,E,expert,router,mlp,attn,emb2:2*emb,norms,total,active,rest:total-mlp}}
  return {'120b':acc(36,128,4),'20b':acc(24,32,4),card:{'120b':{mlp:114.71,attn:.96,emb2:1.16,active:5.13,total:116.83,ckpt:60.8},'20b':{mlp:19.12,attn:.64,emb2:1.16,active:3.61,total:20.91,ckpt:12.8}}};
})();
(function(){
  const B=1e9,G=2**30;
  const ck=m=>(m.mlp*4.25/8+m.rest*2);
  // reproduction table
  const rowsT=[['MLP (experts and routers)','mlp'],['Attention','attn'],['Embed + unembed','emb2'],['Active per token','active'],['Total','total']];
  function repro(){
    let t='<tr><th>Component</th><th class="num">120b, from config</th><th class="num">120b, card</th><th class="num">20b, from config</th><th class="num">20b, card</th></tr>';
    rowsT.forEach(([n,k])=>{t+='<tr><td>'+n+'</td>'+['120b','20b'].map(m=>'<td class="num">'+(OSS[m][k]/B).toFixed(3)+'B</td><td class="num">'+OSS.card[m][k].toFixed(2)+'B</td>').join('')+'</tr>'});
    t+='<tr><td>Checkpoint (MoE at 4.25 bits, rest BF16)</td>'+['120b','20b'].map(m=>'<td class="num">'+(ck(OSS[m])/G).toFixed(2)+' GiB</td><td class="num">'+OSS.card[m].ckpt+' GiB</td>').join('')+'</tr>';
    $('ossRep').innerHTML=t;
  }
  // memory against a budget
  const S={m:'120b',fmt:'mx',T:7,bs:1,kvb:2,gqa:true,win:true,bud:80};
  const ctxs=[1024,2048,4096,8192,16384,32768,65536,131072];
  function kvSeq(m,T,o){const L=OSS[m].L,kvh=o.gqa?8:64,per=2*kvh*64*o.kvb,full=o.win?L/2:L,win=o.win?L/2:0;return full*per*T+win*per*Math.min(T,128)}
  function wBytes(m,f){const a=OSS[m];return f==='mx'?ck(a):f==='fp8'?a.mlp*1+a.rest*2:a.total*2}
  function mem(){
    S.ctx=ctxs[Math.min(ctxs.length-1,S.T)];
    const ctx=S.ctx,w=wBytes(S.m,S.fmt),kv=kvSeq(S.m,ctx,S)*S.bs,tot=w+kv,bud=S.bud*B;
    $('omTv').textContent=fmt(ctx)+' tokens';$('omBv').textContent=S.bs;
    const mx=Math.max(tot,bud)*1.04,pc=v=>100*v/mx;
    $('omBar').innerHTML='<div class="sb" style="position:relative;height:28px;background:var(--soft)"><span style="width:'+pc(w)+'%;background:var(--closed)">weights '+(w/B).toFixed(1)+' GB</span><span style="width:'+pc(kv)+'%;background:var(--c6)">'+(kv/tot>.08?'KV '+(kv/B).toFixed(1)+' GB':'')+'</span><i style="position:absolute;left:'+pc(bud)+'%;top:-4px;bottom:-4px;border-left:2px dashed var(--ink)"></i></div><div class="leg"><span><i style="background:var(--closed)"></i>weights</span><span><i style="background:var(--c6)"></i>KV cache, '+S.bs+' × '+fmt(ctx)+' tokens</span><span>dashed line: '+S.bud+' GB budget</span></div>';
    const per=kvSeq(S.m,ctx,S),fit=Math.max(0,Math.floor((bud-w)/per));
    $('omOut').innerHTML=stat('Weights',(w/B).toFixed(1)+' GB',(w/G).toFixed(1)+' GiB')+stat('KV cache per sequence',fmtBytes(per),fmt(Math.round(per/ctx))+' bytes per token on average')+stat('Total',(tot/B).toFixed(1)+' GB',tot<=bud?'fits in '+S.bud+' GB':'does not fit')+stat('Sequences that fit',w>bud?'none':fmt(fit),'at this context, KV only');
    const def=S.m==='120b'&&S.fmt==='mx'&&S.bud===80&&S.gqa&&S.win;
    $('omPin').innerHTML=def?'<b>Defaults reproduce the card\'s claim</b> that 120b fits a single 80 GB GPU (independently, from config.json): weights '+(w/B).toFixed(1)+' GB leave '+((bud-w)/B).toFixed(1)+' GB, room for '+fmt(Math.floor((bud-w)/kvSeq('120b',131072,S)))+' sequences at the full 131,072 tokens. Switch the weights to BF16: '+(wBytes('120b','bf')/B).toFixed(0)+' GB, about three cards.':
      (S.m==='20b'&&S.fmt==='mx'&&S.bud===16?'gpt-oss-20b as released: '+(w/B).toFixed(1)+' GB of weights in a 16 GB budget, the card\'s "as little as 16GB".':'Weights '+(w/B).toFixed(1)+' GB plus '+(kv/B).toFixed(2)+' GB of cache against '+S.bud+' GB.')+(!S.gqa||!S.win?' Without '+(!S.gqa&&!S.win?'GQA and the window':!S.gqa?'GQA':'the window')+' one 131,072-token sequence would need '+fmtBytes(kvSeq(S.m,131072,S))+' of cache, against '+fmtBytes(kvSeq(S.m,131072,{gqa:true,win:true,kvb:S.kvb}))+' as built.':'');
    curve();
  }
  function curve(){
    const W=600,H=260,pl=58,pr=110,pt=12,pb=36,lg=Math.log10,X=v=>pl+(W-pl-pr)*(lg(v)-lg(1024))/(lg(131072)-lg(1024)),Y=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(1e6))/(lg(2e11)-lg(1e6)));
    let s='';[[1e6,'1 MB'],[1e8,'100 MB'],[1e9,'1 GB'],[1e10,'10 GB'],[1e11,'100 GB']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    [1024,4096,16384,65536,131072].forEach(v=>{s+='<text x="'+X(v)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(v>=1024?(v/1024)+'K':v)+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-3)+'" font-size="11" text-anchor="middle" fill="var(--mute)">context length (tokens), one sequence, '+S.m+', '+(S.kvb===2?'BF16':'FP8')+' cache</text>';
    const V=[['as built',{gqa:true,win:true},'var(--good)'],['no window',{gqa:true,win:false},'var(--c5)'],['no GQA',{gqa:false,win:true},'var(--c2)'],['neither',{gqa:false,win:false},'var(--bad)']];const ends=[];
    V.forEach(([n,o,c])=>{o.kvb=S.kvb;let d='';for(let i=0;i<=40;i++){const t=1024*Math.pow(128,i/40);d+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(kvSeq(S.m,t,o)).toFixed(1)}s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"/>';const v=kvSeq(S.m,131072,o);ends.push({y:Y(v),n:n+' '+fmtBytes(v),c,how:n})});
    s+=endLabels(ends,W-pr+6,13);
    $('omCurve').innerHTML=svgEl(W,H,s,'KV cache against context');
  }
  const bind=(id,k,f)=>$(id).addEventListener('input',e=>{S[k]=f(e.target);mem()});
  bind('omT','T',t=>+t.value);bind('omB','bs',t=>+t.value);
  $('omM').addEventListener('change',e=>{S.m=e.target.value;mem()});$('omBud').addEventListener('change',e=>{S.bud=+e.target.value;mem()});
  segBind('omF',m=>{S.fmt=m;mem()});segBind('omK',m=>{S.kvb=+m;mem()});
  $('omG').addEventListener('change',e=>{S.gqa=e.target.checked;mem()});$('omW').addEventListener('change',e=>{S.win=e.target.checked;mem()});
  // MXFP4 block quantiser
  const FP4=[0,.5,1,1.5,2,3,4,6];let seed=3,blk=[];
  function newBlock(){const r=mulberry32(seed++);blk=Array.from({length:32},()=>{let u=0;for(let i=0;i<6;i++)u+=r();return (u-3)*0.02})}
  function q4(v){const s=Math.sign(v),a=Math.abs(v);let b=FP4[0];FP4.forEach(f=>{if(Math.abs(f-a)<Math.abs(b-a))b=f});return s*b}
  function mx(){
    const amax=Math.max(...blk.map(Math.abs)),e=Math.floor(Math.log2(amax))-2,X=2**e,q=blk.map(v=>q4(v/X)*X);
    const W=600,H=170,pl=10,bw=(W-pl*2)/32,ym=Math.max(amax,Math.max(...q.map(Math.abs))),Y=v=>80-70*v/ym;
    let s='<line x1="'+pl+'" x2="'+(W-pl)+'" y1="80" y2="80" stroke="var(--line)"/>';
    blk.forEach((v,i)=>{const x=pl+i*bw;s+='<rect x="'+(x+1)+'" y="'+Math.min(80,Y(v))+'" width="'+(bw/2-1)+'" height="'+Math.abs(Y(v)-80)+'" fill="var(--dim)"/><rect x="'+(x+bw/2)+'" y="'+Math.min(80,Y(q[i]))+'" width="'+(bw/2-1)+'" height="'+Math.abs(Y(q[i])-80)+'" fill="var(--closed)"/>'});
    s+='<text x="'+pl+'" y="168" font-size="11" fill="var(--mute)">grey: original value · purple: stored as FP4 × shared scale 2^'+e+'</text>';
    const err=Math.sqrt(blk.reduce((a,v,i)=>a+(v-q[i])**2,0)/32)/Math.sqrt(blk.reduce((a,v)=>a+v*v,0)/32);
    s+='<text x="'+pl+'" y="150" font-size="11">32 values × 4 bits + one 8-bit scale = 136 bits, 4.25 bits each · relative RMS error '+(100*err).toFixed(1)+'%</text>';
    $('mxSvg').innerHTML=svgEl(W,H,s,'One MXFP4 block');
  }
  $('mxNew').addEventListener('click',()=>{newBlock();mx()});newBlock();
  onTab('t-oss',()=>{repro();mem();mx()});
})();
