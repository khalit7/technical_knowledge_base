// ---- Reading: conditional-entropy ladder (s4), forward against reverse KL fit (s7), InfoNCE ceiling (s9) ----
(function(){
  const T=RD.t;
  // generic line chart: series [{pts:[[x,y]], col, dash, dots, label}], log2 x option
  function chart(el,o){const W=Math.min(RD.width(el),o.maxW||720),H=o.h||230,l=40,r=o.r||12,t=14,b=34,pw=W-l-r,ph=H-t-b;
    const xl=o.logx?(x=>Math.log2(x)):(x=>x),x0=xl(o.x0),x1=xl(o.x1);
    const X=x=>l+(xl(x)-x0)/(x1-x0)*pw,Y=y=>t+(1-(y-o.y0)/(o.y1-o.y0))*ph;let s='';
    o.yt.forEach(y=>{s+='<line x1="'+l+'" y1="'+Y(y)+'" x2="'+(W-r)+'" y2="'+Y(y)+'" stroke="var(--line)"/>'+T(l-5,Y(y)+4,String(y),{a:'end',fs:10.5,fill:'var(--mute)'})});
    o.xt.forEach(x=>{s+=T(X(x),H-18,String(x),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    s+=T(l+pw/2,H-3,o.xlab,{a:'middle',fs:10.5,fill:'var(--mute)'});
    o.series.forEach(se=>{let d='';se.pts.forEach((p,i)=>{d+=(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(Math.max(o.y0,Math.min(o.y1,p[1]))).toFixed(1)});
      if(se.line!==false)s+='<path d="'+d+'" fill="none" stroke="'+se.col+'" stroke-width="'+(se.w||2)+'"'+(se.dash?' stroke-dasharray="5 4"':'')+'/>';
      if(se.dots)se.pts.forEach(p=>{s+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="3.4" fill="'+se.col+'"/>'});
      if(se.label){const p=se.pts[se.lab!=null?se.lab:se.pts.length-1];s+=T(X(p[0])+(se.dx||0),Y(p[1])+(se.dy||-6),se.label,{a:se.a||'end',fs:11,w:600,fill:se.col})}});
    el.innerHTML=RD.svg(W,H,s,o.aria||'chart')}
  RD.chart=chart;

  // s4: F_N on the book and on the passage, against two models' bits per byte
  const fn=document.getElementById('it-fn');
  function drawFn(){if(!fn)return;const B=ITFN.book.F,S=ITFN.sample.F,N=B.map((_,i)=>i+1);
    const g=ITM.texts.en.models['openai-community/gpt2'].bpb,q=ITM.texts.en.models['Qwen/Qwen2.5-0.5B'].bpb;
    chart(fn,{x0:1,x1:12,y0:0,y1:5,yt:[0,1,2,3,4,5],xt:[1,2,3,4,5,6,7,8,9,10,11,12],xlab:'N: bytes of context + 1 (plug-in counts)',aria:'Plug-in conditional entropy against context length',
      series:[{pts:N.map((n,i)=>[n,B[i]]),col:'var(--c1)',dots:true},{pts:N.map((n,i)=>[n,S[i]]),col:'var(--c2)',dots:true},
        {pts:[[1,g],[12,g]],col:'var(--c3)',dash:true},{pts:[[1,q],[12,q]],col:'var(--c4)',dash:true}]})}
  RD.onRender(drawFn);RD.onResize(drawFn);drawFn();

  // s7: forward against reverse KL fit
  const fr=document.getElementById('it-fr');let mode='both',FT=null,RT=null;
  const FR_STEPS=[0,1,2,3,4,5,6,8,10,13,16,20,25,30,40,50,65,80,100,125,150,175,200];
  function drawFr(i){if(!fr)return;if(!FT){FT=IT.fit('fwd',200);RT=IT.fit('rev',200)}
    const k=FR_STEPS[i],W=RD.width(fr),rows=mode==='both'?['fwd','rev']:[mode],rh=150,l=8,r=8,pw=W-l-r;let o='';
    rows.forEach((d,ri)=>{const y0=ri*(rh+12),base=y0+rh-22,top=y0+18;const tr=d==='fwd'?FT:RT,[m,s]=tr[k];
      const X=x=>l+(x+5)/10*pw,Y=v=>base-v/0.7*(base-top);
      let dp='',dq='';for(let j=150;j<=650;j+=2){const x=IT.GX[j];dp+=(j>150?'L':'M')+X(x).toFixed(1)+','+Y(IT.MIX[j]).toFixed(1);dq+=(j>150?'L':'M')+X(x).toFixed(1)+','+Y(Math.min(0.75,IT.npdf(x,m,s))).toFixed(1)}
      o+='<rect x="'+X(-0.5)+'" y="'+top+'" width="'+(X(0.5)-X(-0.5))+'" height="'+(base-top)+'" fill="var(--hl)" opacity="0.5"/>';
      o+='<line x1="'+l+'" y1="'+base+'" x2="'+(W-r)+'" y2="'+base+'" stroke="var(--mute)"/>';
      [-4,-2,0,2,4].forEach(x=>{o+=T(X(x),base+13,String(x),{a:'middle',fs:10,fill:'var(--mute)'})});
      o+='<path d="'+dp+' L'+X(5)+','+base+' L'+X(-5)+','+base+' z" fill="var(--c1)" opacity="0.18"/><path d="'+dp+'" fill="none" stroke="var(--c1)" stroke-width="1.8"/>';
      o+='<path d="'+dq+'" fill="none" stroke="'+(d==='fwd'?'var(--c3)':'var(--c2)')+'" stroke-width="2.4"/>';
      o+=T(l+2,y0+12,(d==='fwd'?'forward KL(p ‖ q): ':'reverse KL(q ‖ p): ')+'μ = '+m.toFixed(2)+', σ = '+s.toFixed(2),{fs:11.5,w:600,fill:d==='fwd'?'var(--c3)':'var(--c2)'})});
    fr.innerHTML=RD.svg(W,rows.length*(rh+12),o,'One Gaussian fitted to a two-humped distribution by forward and reverse KL');
    const capT=k===0?'Step 0: the same start':k<20?'Step '+k+': the two objectives pull differently':k<100?'Step '+k+': settling':'Step '+k+': converged';
    const capP=k===0?'Both fits start at μ = 1, σ = 1, a narrow bell near the right hump. Blue: the truth p. The shaded band is the valley |x| < 0.5, where p has only 0.6% of its mass.':
      k<20?'Forward KL is paying for every point of the left hump that q misses, so it widens fast and slides left. Reverse KL only pays where q itself has mass, so it moves right onto the hump and tightens.':
      k<100?'Forward KL heads for the mean and spread of the whole of p; reverse KL has found its hump.':
      'Forward: μ ≈ 0, σ ≈ 2.09, the moments of p, spreading 18.6% of its mass into the valley. Reverse: μ = 2.00, σ = 0.60, one hump fitted tightly and the other ignored (its forward KL is 10.2 nats).';
    document.getElementById('it-fr-cap').innerHTML='<div class="t">'+capT+'</div><p>'+capP+'</p>';
    const [fm,fs]=FT[k],[rm,rs]=RT[k],fk=IT.kls(fm,fs),rk=IT.kls(rm,rs);
    document.getElementById('it-fr-cnt').innerHTML=RD.stat('forward fit: KL(p‖q)',fk[0].toFixed(3),'reverse of it: '+fk[1].toFixed(3))+RD.stat('reverse fit: KL(q‖p)',rk[1].toFixed(3),'forward of it: '+rk[0].toFixed(3))+RD.stat('mass in the valley',(100*IT.valley(fm,fs)).toFixed(1)+'% / '+(100*IT.valley(rm,rs)).toFixed(1)+'%','forward / reverse; truth 0.6%')}
  if(fr){const a=RD.anim({card:'it-fr-card',ctl:'it-fr-ctl',n:FR_STEPS.length,draw:drawFr,ms:500,label:'Gradient step'});
    RD.seg(document.getElementById('it-fr-seg'),m=>{mode=m;a.redraw()});RD.onResize(()=>a.redraw())}

  // s9: InfoNCE estimate against N
  const nce=document.getElementById('it-nce');let rhoI=4;const RHO=[0.5,0.9,0.99,0.999,0.99999],NN=[2,4,8,16,32,64,128,256,512,1024];const cache={};
  function drawNce(){if(!nce)return;const rho=RHO[rhoI],I=-0.5*Math.log(1-rho*rho);
    const est=cache[rhoI]||(cache[rhoI]=NN.map(N=>IT.infonce(rho,N,2048,7)));
    chart(nce,{logx:true,x0:2,x1:1024,y0:0,y1:7,yt:[0,1,2,3,4,5,6,7],xt:[2,8,32,128,512],xlab:'N, candidates per anchor (log scale)',aria:'InfoNCE estimate against batch size',
      series:[{pts:NN.map(N=>[N,Math.log(N)]),col:'var(--mute)',dash:true},
        {pts:[[2,I],[1024,I]],col:'var(--c3)',label:'true I = '+I.toFixed(3),lab:0,a:'start',dx:4,dy:I>6?14:-6},
        {pts:NN.map((N,i)=>[N,est[i]]),col:'var(--c2)',dots:true}]});
    document.getElementById('it-nce-tab').innerHTML='<table class="mini"><tr><th>N</th>'+NN.map(N=>'<th>'+N+'</th>').join('')+'</tr><tr><td>ln N</td>'+NN.map(N=>'<td class="num">'+Math.log(N).toFixed(2)+'</td>').join('')+'</tr><tr><td>estimate</td>'+est.map(v=>'<td class="num">'+v.toFixed(2)+'</td>').join('')+'</tr></table>'}
  if(nce){RD.seg(document.getElementById('it-nce-seg'),m=>{rhoI=+m;drawNce()});RD.onRender(drawNce);RD.onResize(drawNce)}
})();
