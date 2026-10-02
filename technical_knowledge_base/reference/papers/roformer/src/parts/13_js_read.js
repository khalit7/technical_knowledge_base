// ---- The paper tab: many-pair dials, the shift test on trained weights, Figure 2 rebuilt, GLUE reveal ----
(function(){
  const rcd=window.PAPER.rc;
  // ---------- many-pair dials (#clk): d = 16, 8 pairs, theta_i = 10000^(-2i/16) ----------
  const D=16,NP=D/2,TH=[...Array(NP)].map((_,i)=>Math.pow(10000,-2*i/D));
  let seed=11,QV,KV;
  function draw(){const r=mulberry32(seed),gs=()=>{let u=0,v=0;while(!u)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
    QV=[...Array(D)].map(gs);KV=[...Array(D)].map(gs)}
  draw();
  function rot(v,i,p){const a=p*TH[i],c=Math.cos(a),s=Math.sin(a),x=v[2*i],y=v[2*i+1];return [x*c-y*s,y*c+x*s]}
  function score(m,n){let t=0;const parts=[];for(let i=0;i<NP;i++){const q=rot(QV,i,m),k=rot(KV,i,n),c=q[0]*k[0]+q[1]*k[1];parts.push(c);t+=c}return {t,parts}}
  function clk(w){const m=+$('clkM').value,n=+$('clkN').value;$('clkMv').textContent=m;$('clkNv').textContent=n;
    const cols=w<420?4:8,cw=w/cols,R=Math.min(34,cw/2-8),rows=NP/cols,ch=2*R+72,H=rows*ch+6;
    const sc=score(m,n),mx=Math.max(...[...Array(NP)].map((_,i)=>Math.hypot(QV[2*i],QV[2*i+1])*Math.hypot(KV[2*i],KV[2*i+1])));
    let s='';
    for(let i=0;i<NP;i++){const cx=(i%cols)*cw+cw/2,cy=Math.floor(i/cols)*ch+R+32;
      const q=rot(QV,i,m),k=rot(KV,i,n),nq=Math.hypot(...q),nk=Math.hypot(...k),f=R/Math.max(nq,nk,1e-9)*.92;
      s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="var(--line)"/>';
      s+=ln2(cx,cy,cx+q[0]*f,cy-q[1]*f,'var(--c1)',{sw:2.4})+ln2(cx,cy,cx+k[0]*f,cy-k[1]*f,'var(--c2)',{sw:2.2,da:'4 3'});
      s+=tx(cx,cy-R-19,'pair '+i,{fs:11,a:'middle',c:'var(--mute)'})+tx(cx,cy-R-6,'θ = '+(TH[i]>=0.01?TH[i].toPrecision(2):TH[i].toExponential(0)),{fs:11,a:'middle',c:'var(--mute)'});
      const bw=cw-16,bx0=cx-bw/2,by=cy+R+10,val=sc.parts[i]/mx;
      s+=rc(bx0,by,bw,10,'var(--soft)',{r:2})+ln2(cx,by-2,cx,by+12,'var(--mute)',{sw:1});
      s+=rc(val>=0?cx:cx+val*bw/2,by,Math.abs(val)*bw/2,10,val>=0?'var(--c3)':'var(--bad)',{r:2});
      s+=tx(cx,by+24,(sc.parts[i]>=0?'+':'')+sc.parts[i].toFixed(2),{fs:11,a:'middle'})}
    $('clkSvg').innerHTML=svgW(w,H,s,'Eight rotation pairs of a query and a key');
    const sh=score(m+10,n+10),z=score(n,n);
    $('clkOut').innerHTML='<div class="kv"><dt>q<sub>m</sub><sup>⊤</sup>k<sub>n</sub> at m = '+m+', n = '+n+'</dt><dd><b>'+sc.t.toFixed(4)+'</b> (sum of the 8 bars)</dd><dt>the same pair shifted to m = '+(m+10)+', n = '+(n+10)+'</dt><dd>'+sh.t.toFixed(4)+'</dd><dt>offset m − n</dt><dd>'+(m-n)+'</dd><dt>unrotated q<sup>⊤</sup>k (offset 0)</dt><dd>'+z.t.toFixed(4)+'</dd></div>'}
  const el=$('clkSvg');
  ['clkM','clkN'].forEach(i=>$(i).addEventListener('input',()=>refit(el)));
  $('clkS').addEventListener('click',()=>{const a=$('clkM'),b=$('clkN');if(+a.value+10>60||+b.value+10>60){a.value=+a.value%10;b.value=+b.value%10}else{a.value=+a.value+10;b.value=+b.value+10}refit(el)});
  $('clkR').addEventListener('click',()=>{seed++;draw();refit(el)});
  onTab('t-read',()=>fit(el,clk));fit(el,clk);

  // ---------- the shift test on trained weights (#shf) ----------
  if(window.RF){
    const DIG=[3,8,1,6,0,9,4,4,7,2,5,1],N=DIG.length,OFFS=[0,4,8,12,16,20];
    const M={rope:RF.load('rope'),sin:RF.load('sin')};
    function bestHead(mod){const r=RF.run(mod,DIG);let b=0,bv=-1;for(let h=0;h<RF.h;h++){let v=0;for(let i=RF.START;i<N;i++)v+=r.att[h][i][i-RF.L1]+r.att[h][i][i-RF.L2];if(v>bv){bv=v;b=h}}return b}
    const HEAD={rope:bestHead(M.rope),sin:bestHead(M.sin)};
    const RUNS={};['rope','sin'].forEach(k=>{RUNS[k]=OFFS.map(o=>RF.run(M[k],DIG,{offset:o}))});
    const onLag=k=>{const A=RUNS[k][0].att[HEAD[k]];let v=0,n=0;for(let i=RF.START;i<N;i++){v+=A[i][i-RF.L1]+A[i][i-RF.L2];n++}return (100*v/n).toFixed(0)+'%'};
    const maxd=(k,j)=>{let x=0;const A=RUNS[k][0].att[HEAD[k]],B=RUNS[k][j].att[HEAD[k]];for(let i=0;i<N;i++)for(let c=0;c<=i;c++)x=Math.max(x,Math.abs(A[i][c]-B[i][c]));return x};
    const okc=(k,j)=>{let c=0,t=0;for(let i=RF.START;i<N;i++){t++;if(RUNS[k][j].pred[i]===RF.target(DIG,i))c++}return c+' of '+t};
    const mk=k=>OFFS.map((o,j)=>({t:'positions '+o+' to '+(o+N-1),c:j===0?(k==='rope'?'The 12 digits at the start, through the RoPE model. Its head '+(HEAD.rope+1)+' of 4 puts '+onLag('rope')+' of each row\'s weight on offsets 1 and 4 (orange outlines), the two the task needs; the other heads and the MLP do the rest.':'The same digits through the sinusoidal model. Its head '+(HEAD.sin+1)+' puts '+onLag('sin')+' of each row\'s weight on offsets 1 and 4, found through position vectors added to the input.')
      :(k==='rope'?'Slid '+o+' positions later. Every score is a function of offsets only, so the weights are unchanged: the largest change is '+maxd(k,j).toExponential(1)+', floating-point noise.':'Slid '+o+' positions later. The absolute position vectors are different now, so the weights move (largest change '+maxd(k,j).toFixed(3)+'), even though the model still answers '+okc(k,j)+' positions correctly.')}));
    const modes={rope:mk('rope'),sin:mk('sin')};
    makeAnim({id:'shf',modes,mode:'rope',dur:2600,
      draw:(m,k,e,w)=>{const H0=Math.min(w,460),cell=Math.floor((H0-40)/N),ox=Math.max(30,(w-cell*N)/2),oy=26,A=RUNS[m][Math.max(0,k-1)].att[HEAD[m]],B=RUNS[m][k].att[HEAD[m]];
        let s='';for(let i=0;i<N;i++){s+=tx(ox-6,oy+i*cell+cell*.68,DIG[i],{fs:11,a:'end',c:'var(--mute)'});s+=tx(ox+i*cell+cell/2,oy-6,DIG[i],{fs:11,a:'middle',c:'var(--mute)'});
          for(let c=0;c<N;c++){if(c>i){s+=rc(ox+c*cell+1,oy+i*cell+1,cell-2,cell-2,'var(--soft)',{r:2});continue}const v=k===0?B[i][c]:A[i][c]+(B[i][c]-A[i][c])*e;
            s+=rc(ox+c*cell+1,oy+i*cell+1,cell-2,cell-2,'var(--c1)',{r:2,op:Math.max(.04,Math.min(1,v))});if(i-c===RF.L1||i-c===RF.L2)if(i>=RF.START)s+=rc(ox+c*cell+1,oy+i*cell+1,cell-2,cell-2,'none',{r:2,s:'var(--c2)',sw:1.4})}}
        s+=tx(w/2,oy+N*cell+16,'keys (columns) at positions '+OFFS[k]+' to '+(OFFS[k]+N-1),{fs:11,a:'middle',c:'var(--mute)'})+tx(w/2,oy+N*cell+31,'orange outline: offsets 1 and 4',{fs:11,a:'middle',c:'var(--c2)'});
        return svgW(w,oy+N*cell+38,s,'Attention weights of one head')},
      counters:(m,k)=>'<div class="cnts">'+stat('placed at',OFFS[k]+' to '+(OFFS[k]+N-1),'all inside the 32 trained positions')+stat('largest weight change from step 1',k===0?'0':(m==='rope'?maxd(m,k).toExponential(1):maxd(m,k).toFixed(3)),m==='rope'?'identical up to rounding':'the pattern drifts')+stat('answers correct',okc(m,k),'(x[t−1] + x[t−4]) mod 10')+'</div>'});
    window.PRED_REVEAL['pr-shift']=()=>{};
    const lf=$('linFacts');if(lf){const v=RF.data.variants;lf.innerHTML='trained identically, linear attention with RoPE in the numerator (Equation 19) answers <b>'+(100*v.lin_rope.res[32].acc).toFixed(1)+'%</b> of held-out positions at the trained length, against <b>'+(100*v.lin_nope.res[32].acc).toFixed(1)+'%</b> without it (chance is 10%) and '+(100*v.rope.res[32].acc).toFixed(1)+'% for softmax attention with RoPE. RoPE does carry position into linear attention, the paper\'s point; but at this size linear attention cannot focus on single offsets the way softmax can, a limit of the toy and of unnormalised weights, not a claim the paper makes. Details in the '+'<a href="#" data-tab="t-run" data-to="runLin">Train short, test long</a> tab'}
  }

  // ---------- Figure 2 rebuilt (#dec) ----------
  function bound(d,r,b){let sr=0,si=0,t=0;for(let i=0;i<d/2;i++){const a=r*Math.pow(b,-2*i/d);sr+=Math.cos(a);si+=Math.sin(a);t+=Math.hypot(sr,si)}return t/(d/2)}
  function sc2(q,k,r,d,b){let s=0;for(let i=0;i<d/2;i++){const a=r*Math.pow(b,-2*i/d),c=Math.cos(a),sn=Math.sin(a);s+=q[2*i]*(c*k[2*i]-sn*k[2*i+1])+q[2*i+1]*(sn*k[2*i]+c*k[2*i+1])}return s}
  const GC={};
  function gauss(d){if(GC[d])return GC[d];const r=mulberry32(7),g=()=>{let u=0;while(!u)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r())};GC[d]=[...Array(200)].map(()=>[[...Array(d)].map(g),[...Array(d)].map(g)]);return GC[d]}
  function dec(w){const d=+$('decD').value,b=+$('decB').value,show=$('decO').checked;$('decDv').textContent=d;$('decBv').textContent=fmt(b);
    const R=[...Array(257).keys()],bd=R.map(r=>bound(d,r,b));
    const H=Math.min(300,Math.max(220,w*.55)),pl=52,pr=12,pt=14,pb=34;
    let ones=null,gm=null,ga=null;const rs=R.filter(r=>r%4===0);
    if(show){ones=rs.map(r=>sc2(Array(d).fill(1),Array(d).fill(1),r,d,b)/(d/2));const G=gauss(d);
      gm=rs.map(r=>G.reduce((a,[q,k])=>a+sc2(q,k,r,d,b),0)/G.length/(d/2));ga=rs.map(r=>G.reduce((a,[q,k])=>a+Math.abs(sc2(q,k,r,d,b)),0)/G.length/(d/2))}
    let bdp=bd;if(show){const b0=bd[0],o0=ones[0],g0=ga[0];bdp=bd.map(v=>v/b0);ones=ones.map(v=>v/o0);gm=gm.map(v=>v/g0);ga=ga.map(v=>v/g0)}
    const top=show?1:(d/2+1)/2,ymin=show?Math.min(-0.25,...ones,...gm):0;
    const X=r=>pl+(w-pl-pr)*r/256,Y=v=>pt+(H-pt-pb)*(1-(v-ymin)/(top*1.04-ymin));
    let s='';const step=show?0.25:top>40?20:top>16?5:top>8?2:1;
    for(let v=Math.ceil(ymin/step-1e-9)*step;v<=top*1.04;v+=step)s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,show?v.toFixed(2):fmt(v),{fs:11,a:'end',c:'var(--mute)'});
    s+=tx(12,(pt+H-pb)/2,show?'relative to distance 0':'relative upper bound',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    [0,50,100,150,200,250].forEach(r=>{s+=ln2(X(r),H-pb,X(r),H-pb+4,'var(--mute)')+tx(X(r),H-pb+16,r,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-4,'relative distance m − n',{fs:11,a:'middle',c:'var(--mute)'});
    const path=(xs,ys,c,o)=>'<path d="'+xs.map((r,i)=>(i?'L':'M')+X(r).toFixed(1)+' '+Y(ys[i]).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="'+((o&&o.sw)||2)+'"'+(o&&o.da?' stroke-dasharray="'+o.da+'"':'')+'/>';
    if(show){s+=path(rs,ga,'var(--mute)',{sw:1.6})+path(rs,gm,'var(--mute)',{sw:1.2,da:'4 3'})+path(rs,ones,'var(--c2)',{sw:1.6})}
    s+=path(R,bdp,'var(--c1)',{sw:2.2});
    const lg=legend([['bound, Eq. 37 (Figure 2)','var(--c1)']].concat(show?[['all-ones q = k, actual','var(--c2)'],['Gaussian, mean |score|','var(--mute)'],['Gaussian, mean score','var(--mute)','4 3']]:[]),pl,H+14,w-pl-pr);
    s+=lg.s;
    $('decSvg').innerHTML=svgW(w,H+lg.h+6,s,'Long-term decay bound of RoPE against distance');
    const ref=(d===128&&b===10000)?' Same as recompute.py: '+rcd.fig2.bound[8].toFixed(2)+' and '+rcd.fig2.bound[250].toFixed(2)+'.':'';
    $('decOut').innerHTML='Bound at distance 0: <b>'+bd[0].toFixed(1)+'</b> (= (d/2 + 1)/2), at 8: <b>'+bd[8].toFixed(2)+'</b>, at 250: <b>'+bd[250].toFixed(2)+'</b>.'+ref+(show?' With actual scores on, every line is divided by its value at distance 0: the all-ones score falls to '+ones[ones.length-1].toFixed(2)+' at 256, the Gaussian mean |score| stays at '+ga[ga.length-1].toFixed(2)+' and the Gaussian mean score within '+Math.max(...gm.map(Math.abs)).toFixed(2)+' of 0 (200 draws).':'')}
  const de=$('decSvg');['decD','decB','decO'].forEach(i=>$(i).addEventListener('change',()=>refit(de)));
  onTab('t-read',()=>fit(de,dec));fit(de,dec);

  // ---------- GLUE reveal ----------
  window.PRED_REVEAL['pr-glue']=()=>{const t=window.PAPER.tables.t2,dl=rcd.t2.delta,mx=Math.max(...dl.map(Math.abs));
    $('prGlue').innerHTML='<div class="bars">'+t.cols.map((c,i)=>{const v=dl[i],wd=Math.abs(v)/mx*50;return '<div class="row'+(v<0?' hl':'')+'"><div class="nm">'+c+' ('+t.metric[i]+')</div><div class="track"><div class="fill" style="left:'+(v>=0?50:50-wd)+'%;width:'+wd+'%;background:'+(v>=0?'var(--c3)':'var(--bad)')+'"></div><div style="position:absolute;left:50%;top:0;bottom:0;border-left:1px solid var(--mute)"></div></div><div class="val">'+(v>0?'+':'')+v.toFixed(1)+'</div></div>'}).join('')+'</div>'};
})();
window.PRED_REVEAL['pr-decay']=()=>{const c=$('decO');if(c&&!c.checked){c.checked=true;c.dispatchEvent(new Event('change'))}};
