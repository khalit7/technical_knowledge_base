// ---- The paper tab: decode-step animation, throughput chart, Table 2 deltas, numbers from recompute.py and the toy ----
const EXC=['var(--e0)','var(--e1)','var(--e2)','var(--e3)','var(--e4)','var(--e5)','var(--e6)','var(--e7)'];
const EXB=['var(--e0b)','var(--e1b)','var(--e2b)','var(--e3b)','var(--e4b)','var(--e5b)','var(--e6b)','var(--e7b)'];
const MNAME={mixtral_8x7b:'Mixtral 8x7B',llama2_70b:'Llama 2 70B',llama2_13b:'Llama 2 13B',mistral_7b:'Mistral 7B'};
const decAt=(m,B)=>RC.decode[m].find(r=>r.B===B);
const xf=v=>(v>=10?v.toFixed(1):v.toFixed(2)).replace(/\.0+$/,'')+'x';
const gb=b=>(b/1e9).toFixed(1)+' GB';
const ms=t=>t>=0.1?(t*1e3).toFixed(0)+' ms':(t*1e3).toFixed(1)+' ms';
const bil=v=>v<1e9?(v/1e6).toFixed(0)+'M':(v/1e9).toFixed(v>=1e10?1:2)+'B';

// numbers in the prose that come from recompute.py
(function(){const S=RC.speedup_vs_70b,Q=RC.ratio_vs_13b;
  const F7=RC.fig7_tv,UB=RC.t5_first_usage_baseline,rng=o=>{const v=Object.values(o);return (100*Math.min(...v)).toFixed(1)+' to '+(100*Math.max(...v)).toFixed(1)+'%'};
  const f10=window.PAPER.figs.fig10['First choice'].lines,pk=Object.values(f10).map(l=>l[9][1]);
  const V0={f7max:(100*Math.max(...F7.map(t=>t.maxshare))).toFixed(1)+'%',f7tv:Math.max(...F7.map(t=>Math.max(...Object.entries(t.tv).filter(([k])=>k!=='DM Mathematics').map(([,v])=>v)))).toFixed(2),
    f7dm:F7.map(t=>t.tv['DM Mathematics'].toFixed(2)).join(', '),ub15:rng(UB[15]),ub31:rng(UB[31]),f10peak:(100*Math.min(...pk)).toFixed(0)+' to '+(100*Math.max(...pk)).toFixed(0)+'%'};
  const V=Object.assign(V0,{s70_1:xf(S[1]),s70_64:xf(S[64]),s70_2048:xf(S[2048]),r_l13_1:Q[1]>0.98&&Q[1]<1.02?'the same as':xf(Q[1]),r_l13_64:xf(Q[64]),x_l70:fmt(RC.crossover.llama2_70b),x_mx:fmt(RC.crossover.mixtral_8x7b)});
  document.querySelectorAll('[data-rc]').forEach(e=>{const k=e.dataset.rc;if(V[k]!=null)e.textContent=V[k];else __jsErr('no value for '+k)})})();

// ---- One decoding step: which weights a batch has to read ----
(function(){
  const P=RC.params,BS=[1,2,4,8,16,64,1024,2048],MK={mx:'mixtral_8x7b',l70:'llama2_70b',l13:'llama2_13b'};
  const cap=(m,B)=>{const d=decAt(MK[m],B),ex=d.experts;
    if(m==='mx'){
      if(B===1)return 'One sequence, one new token. At each of 32 layers its router picks 2 of the 8 experts, so the step reads the shared weights plus 2 experts: '+bil(P.mixtral_8x7b.active)+' parameters, '+gb(d.bytes)+'. This is the case where Mixtral runs at "the speed of a 12.9B model".';
      if(B===2)return 'Two sequences. Their tokens rarely pick the same pair, so on average 3.5 experts per layer must be read: already 75% more expert weight than at batch 1, for twice the tokens.';
      if(B===4)return 'Four sequences: 5.5 experts per layer on average. The weights read per step grow much faster than for a dense model, which reads the same bytes at any batch size.';
      if(B===8)return 'Eight sequences: 7.2 of 8 experts per layer, (1 − 0.75<sup>8</sup>) of them. Almost the whole 46.7B is read every step; per token, each expert weight now serves only about 2 tokens.';
      if(B===16)return 'Sixteen sequences: 7.9 experts. From here to a few hundred sequences Mixtral reads essentially all '+gb(d.bytes)+' per step, like a dense 47B model, while doing the arithmetic of a 13B one.';
      if(B===64)return 'Sixty-four sequences: still bound by reading weights. Mixtral is now '+xf(RC.ratio_vs_13b[64])+' slower per step than Llama 2 13B and only '+xf(RC.speedup_vs_70b[64])+' faster than Llama 2 70B.';
      if(B===1024)return fmt(B)+' sequences: still, just, memory-bound. On this roofline Mixtral turns compute-bound only at '+fmt(RC.crossover.mixtral_8x7b)+' sequences, against '+RC.crossover.llama2_70b+' for a dense model, because each expert weight read serves only a quarter of the batch (2 of 8 experts per token). Llama 2 70B is already compute-bound here, so the gap has reopened to '+xf(RC.speedup_vs_70b[1024])+'.';
      return 'Past that point only active parameters count, and Mixtral is '+xf(RC.speedup_vs_70b[2048])+' cheaper per token than Llama 2 70B: the paper\'s "higher throughput at large batch-sizes".'}
    const nm=m==='l70'?'Llama 2 70B':'Llama 2 13B',L=P[MK[m]].layers;
    if(B===1)return nm+': one token, and every one of its '+bil(P[MK[m]].total)+' parameters ('+L+' layers) is read: '+gb(d.bytes)+' per step. A dense model has nothing to skip.';
    if(B<=16)return B+' sequences: the same '+gb(d.bytes)+' are read once and shared by all '+B+' tokens, so time per step barely moves and tokens per second grow with the batch.';
    if(B===64)return '64 sequences: still memory-bound, '+ms(d.t)+' per step on this roofline.';
    if(B===1024)return 'A dense model turns compute-bound at about '+RC.crossover[MK[m]]+' sequences, where its arithmetic catches up with its memory traffic.';
    return 'Compute-bound: '+ms(d.t)+' per step for '+fmt(B)+' tokens; cost per token is now set by its '+bil(P[MK[m]].active)+' active parameters.'};
  const modes={};Object.keys(MK).forEach(m=>{modes[m]=BS.map(B=>({t:'batch '+fmt(B),c:cap(m,B)}))});
  // seeded routing draws for the drawn layer: B tokens, 2 distinct experts each
  const draws={};BS.forEach(B=>{const r=mulberry32(1000+B),out=[];for(let i=0;i<Math.min(B,64);i++){const a=Math.floor(r()*8);let b=Math.floor(r()*7);if(b>=a)b++;out.push([a,b])}draws[B]=out});
  function draw(m,k,e,W){const B=BS[k],mk=MK[m],p=P[mk],H=W<520?236:226;
    const L=12,R=W-12,full=P.mixtral_8x7b.expert*8+P.mixtral_8x7b.attn_layer;const sc=(R-L-60)/full;// px per parameter
    let s='';
    // token row
    const n=Math.min(B,64),ty=26,cols=Math.min(n,Math.floor((R-L)/9)),rows=Math.ceil(n/cols);
    s+=tx(L,12,'Batch: '+fmt(B)+' sequence'+(B>1?'s':'')+', one new token each'+(B>64?' (64 drawn)':''),{fs:11,c:'var(--mute)'});
    const tokX=i=>L+4+(i%cols)*9,tokY=i=>ty+Math.floor(i/cols)*8;
    for(let i=0;i<n;i++)s+='<circle cx="'+tokX(i)+'" cy="'+tokY(i)+'" r="3" fill="var(--ink)" opacity="'+cl01(e*3-i/n*1.5).toFixed(2)+'"/>';
    const by=ty+rows*8+46,bh=56;
    // attention block (shared, always read)
    const aw=Math.max(14,p.attn_layer*sc);s+=rc(L,by,aw,bh,'var(--acc2)',{s:'var(--acc)'});s+=tx(L+aw/2,by+bh+14,'attn',{fs:11,a:'middle',c:'var(--mute)'});
    let x0=L+aw+10;
    if(p.n>1){const ew=p.expert*sc,used=new Set();draws[B].forEach(d=>{used.add(d[0]);used.add(d[1])});
      // router
      s+=rc(x0,by-30,ew*8+7*3,14,'var(--soft)',{s:'var(--line)'})+tx(x0+(ew*8+21)/2,by-19.5,'router: top-2 of 8 per token',{fs:11,a:'middle',c:'var(--mute)'});
      for(let i=0;i<8;i++){const x=x0+i*(ew+3),on=used.has(i);
        s+=rc(x,by,ew,bh,on?EXB[i]:'var(--soft)',{s:on?EXC[i]:'var(--line)',sw:on?1.6:1,op:on?1:cl01(1-e*.55)});
        s+=tx(x+ew/2,by+bh/2+4,'E'+i,{fs:11,a:'middle',c:on?'var(--ink)':'var(--mute)'})}
      const le=cl01(e*1.6-.3);
      draws[B].forEach((d,i)=>{if(i>=16)return;[0,1].forEach(j=>{const ex=x0+d[j]*(ew+3)+ew/2;s+=ln2(tokX(i),tokY(i)+3,ex,by-30,EXC[d[j]],{sw:1,op:le*.55})})});
      s+=tx(x0,by+bh+14,(W<520?'':'8 experts × '+bil(p.expert)+' (SwiGLU), ')+used.size+' of 8 read in this draw',{fs:11,c:'var(--mute)'});
    }else{const fw=p.expert*sc;s+=rc(x0,by,fw,bh,'var(--acc2)',{s:'var(--acc)',sw:1.6});s+=tx(x0+fw/2,by+bh/2+4,'FFN',{fs:11,a:'middle'});
      s+=tx(x0,by+bh+14,'one dense FFN, '+bil(p.expert)+', read every step',{fs:11,c:'var(--mute)'})}
    s+=tx(L,by+bh+32,W<520?'1 of '+p.layers+' layers; width proportional to parameters':'One of '+p.layers+' layers, drawn to scale: block width proportional to parameters.',{fs:11,c:'var(--mute)'});
    return svgW(W,by+bh+40,s,'One decoding step')}
  function counters(m,k){const B=BS[k],d=decAt(MK[m],B),d70=decAt('llama2_70b',B),p=P[MK[m]];
    return stat('Experts read per layer',p.n>1?d.experts.toFixed(2)+' of 8':'dense','expected, uniform routing')+
      stat('Weights read per step',gb(d.bytes),'bfloat16')+stat('Time per step',ms(d.t),d.bound+'-bound')+
      stat('Tokens per second',fmt(Math.round(d.tok_s)),'idealised, 2 H100')+
      stat('Against Llama 2 70B',m==='l70'?'1x':xf(d70.t/d.t)+(d70.t/d.t>=1?' faster':' slower'),'per step, same batch')}
  makeAnim({id:'dec',modes,mode:'mx',draw,counters,dur:3600});
})();

// ---- Tokens per second against batch size, three models ----
onTab('t-read',()=>fit($('thr'),W=>{const H=W<520?250:270,ms_=['mixtral_8x7b','llama2_70b','llama2_13b'],cs=['var(--acc)','var(--c2)','var(--c3)'];
  const f=frame({W,H,x:[1,2048],y:[10,1e5],xlog:1,ylog:1,pl:46,pb:40,pt:30,xt:[[1,'1'],[8,'8'],[64,'64'],[512,'512'],[2048,'2048']],yt:[[10,'10'],[100,'100'],[1e3,'1k'],[1e4,'10k'],[1e5,'100k']],xl:'sequences decoding together (batch size)',yl:'tokens per second'});
  let s=f.s+tx(0,14,W<520?'Idealised decode throughput':'Idealised decode throughput, 2 H100s, weights only',{fs:12,w:600});
  const grid=[];for(let b=1;b<=2048;b*=1.08)grid.push(b);grid.push(2048);
  ms_.forEach((m,i)=>{s+=path(grid.map(B=>[f.sx(B),f.sy(B2t(m,B))]),cs[i],{sw:2});const x=RC.crossover[m];s+=dot(f.sx(Math.min(2048,x)),f.sy(B2t(m,x)),3.5,cs[i])});
  const lg=legend(ms_.map((m,i)=>[MNAME[m],cs[i]]),52,H+14,W-60);
  $('thr').innerHTML=svgW(W,H+lg.h+8,s+lg.s,'Throughput against batch size')+
   '<p class="small mute" style="margin:4px 0 0">Dots: the batch where each model turns compute-bound. At batch 1 Mixtral\'s line sits on Llama 2 13B\'s; from 8 to a few hundred it runs parallel to it, '+xf(RC.ratio_vs_13b[64])+' lower; the gap to Llama 2 70B is widest at the two ends.</p>'}));
function B2t(m,B){const p=RC.params[m],ex=p.n>1?p.layers*8*(1-Math.pow(.75,B))*p.expert:0,read=p.n>1?p.shared+ex:p.total,t=Math.max(2*read/RC.hw.bw,2*p.active*B/RC.hw.flops);return B/t}

// ---- Table 2: Mixtral minus Llama 2 70B ----
onTab('t-read',()=>fit($('t2d'),W=>{const t=TB.t2,mx=t.rows.find(r=>r[0]==='Mixtral 8x7B'),l=t.rows.find(r=>r[0]==='LLaMA 2 70B');
  const items=t.cols.slice(2).map((c,i)=>{const d=parseFloat(mx[i+2])-parseFloat(l[i+2]);return {n:c,v:+d.toFixed(1),c:d>=0?'var(--good)':'var(--bad)'}});
  $('t2d').innerHTML=hbars(W,items,{title:W<520?'Mixtral minus Llama 2 70B (Table 2)':'Mixtral 8x7B minus Llama 2 70B, points (Table 2)',fmt:v=>(v>0?'+':'')+v.toFixed(1),dom:[-5,16]})}));

// ---- Toy numbers quoted in the Reading tab (all from analyse.py's measurements) ----
(function(){const R=window.ROUTES,m=R.main,DOM=['github','gutenberg','wikipedia','dm_math'],NAT=['github','gutenberg','wikipedia'],L=[0,1,2,3];
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,pc=v=>(100*v).toFixed(0)+'%';
  const tok=avg(m.pred.map(p=>p.token)),dom=avg(m.pred.map(p=>p.domain)),non=avg(m.pred.map(p=>p.none));
  $('prDomTok').textContent=pc(tok);$('prDomDom').textContent=pc(dom);
  $('tyMin').textContent=String(Math.round((m.sec||0)/60));
  const l0=m.tv[0],top0=DOM.reduce((a,d)=>l0[d]>l0[a]?d:a,DOM[0]),nm={github:'code',gutenberg:'novels',wikipedia:'Wikipedia',dm_math:'generated maths'};
  const rep=L.map(l=>avg(NAT.map(d=>m.rep[d][l].first))),shf=L.map(l=>avg(NAT.map(d=>m.rep[d][l].first_shuf)));
  const pos=avg(L.slice(1).map(l=>rep[l]-shf[l])),exc=avg(L.slice(1).map(l=>rep[l]-1/8));
  const prose=avg(L.map(l=>m.tvpair[l][1][2])),code=avg(L.map(l=>(m.tvpair[l][0][1]+m.tvpair[l][0][2])/2));
  $('tySum').innerHTML='knowing the token predicts the first expert '+pc(tok)+' of the time, the domain '+pc(dom)+', nothing '+pc(non)+
   '. Novels and Wikipedia (same kind of text, different topics) use their experts much more alike than code and prose do (distance '+prose.toFixed(2)+' against '+code.toFixed(2)+', averaged over layers), and at the first layer the most distinct domain is '+nm[top0]+
   '. On natural text, consecutive tokens repeat their first expert '+pc(Math.min(...rep))+' to '+pc(Math.max(...rep))+' of the time across layers, but '+(pos<exc/2?'shuffling the order keeps most of that, so most of the excess over 12.5% comes from uneven expert use, not position':'shuffling the order removes much of it, so position matters')+
   '. What reproduces and what does not: <a href="#" data-tab="t-run" data-to="rvTr">section 5 of the tab</a>.'})();
