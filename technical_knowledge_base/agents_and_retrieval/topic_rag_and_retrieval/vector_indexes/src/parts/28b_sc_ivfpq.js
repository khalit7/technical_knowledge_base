// ---- Scene: Fig. 2, one claim through IVF-Flat, IVF-PQ and IVF-PQ with rescoring (renderer v2). Data: VIX.pq, a real FAISS 1.15.1
// IndexIVFPQ over the 5,183 SciFact abstracts (72 cells, 16-byte codes), recomputed here from its codes and lookup tables exactly as FAISS
// scores inner product with residuals (claim . centroid + the sum of 16 table entries). Steps: coarse step, probe, table, one candidate,
// rank, result. The claim, nprobe and the method are switches on the left; the readout and the result table follow the step. ----
(function(){
  const P=window.VIX&&window.VIX.pq;if(!P||!document.getElementById('stg-pq'))return;const {at,off,mix}=S3;
  const $=id=>document.getElementById(id),esc=RD.esc;
  const b64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
  const codes=b64(P.codes),assign=b64(P.assign),M=P.m,KS=P.ksub,S=P.scale,n=P.sub_n;
  const Qs=P.queries.map(q=>{const t=new Int16Array(b64(q.T).buffer),e=new Int16Array(b64(q.exact).buffer);
    return Object.assign({},q,{Tf:Float32Array.from(t,x=>x/S),ex:Float32Array.from(e,x=>x/S),order:q.cs.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1])})});
  const st={q:0,np:1,m:'flat',k:0};
  Qs.forEach((q,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+(q.text.length>80?q.text.slice(0,78)+'...':q.text);$('vix-p-q').appendChild(o)});
  $('vix-p-err').textContent=P.recompute_max_abs_err.toExponential(1);
  function approx(q,j){let s=q.cs[assign[j]];for(let m=0;m<M;m++)s+=q.Tf[m*KS+codes[j*M+m]];return s}
  // one claim, nprobe cells, one method: candidates, PQ scores, the ranking the method produces, and the 10 it returns
  function run(qi,np,m){const q=Qs[qi];const cells=q.order.slice(0,np),cs=new Set(cells);const cand=[];for(let j=0;j<n;j++)if(cs.has(assign[j]))cand.push(j);
    const ap=new Map(cand.map(j=>[j,approx(q,j)]));let rank;
    if(m==='flat')rank=cand.slice().sort((a,b)=>q.ex[b]-q.ex[a]);
    else{const byA=cand.slice().sort((a,b)=>ap.get(b)-ap.get(a));rank=m==='pq'?byA:byA.slice(0,100).sort((a,b)=>q.ex[b]-q.ex[a]).concat(byA.slice(100))}
    const top=rank.slice(0,10),found=top.filter(j=>q.gt.includes(j)).length;return {q,cells,cand,ap,rank,top,found}}
  let RR=null;const cur=()=>RR||(RR=run(st.q,st.np,st.m));
  // layout: 72 cells on the floor, nearest first from the front left; the table as an upright glass plate at the back
  const XC=r=>-4.95+(r%12)*.9,ZC=r=>2.9-Math.floor(r/12)*.62,QP=[0,2.3,4.6];
  const PX0=-5,PX1=5,PZ=-1.7,PY0=.3,RH=.15,colX=c=>PX0+(c+.5)*(PX1-PX0)/KS,rowY=m=>PY0+(M-m-.5)*RH;
  function pick(R){return R.cand.find(j=>R.q.gt.includes(j))!==undefined?R.cand.find(j=>R.q.gt.includes(j)):R.cand[0]}
  function draw(R3,k,e){const C=R3.P,R=cur(),q=R.q,np=st.np,flat=st.m==='flat';R3.grid(-5.6,6.4,-2.4,5,.5);
    const mx=Math.max(...q.cs),mn=Math.min(...q.cs),hc=c=>.12+1.1*(q.cs[c]-mn)/(mx-mn||1);
    const cellA=k<=1?1:k===2?.3:k===3?.1:.15;
    // the 72 cells: a floor tile and a post whose height is the claim's similarity to the cell's centroid
    q.order.forEach((c,r)=>{const x=XC(r),z=ZC(r),pr=r<np&&k>=1,a=pr?Math.max(cellA,.55):cellA*(k>=1?.55:1);
      R3.quad([[x-.31,.003,z-.22],[x+.31,.003,z-.22],[x+.31,.003,z+.22],[x-.31,.003,z+.22]],{fill:pr?mix(C.paper,C.acc,.3):C.paper,a,ea:.5});
      if(pr){const h=P.list_sizes[c]*.009*(k===1?e:1);R3.box([x,0,z],[.5,Math.max(.02,h),.32],{fill:mix(C.paper,C.acc,.5),a});
        if(k===1)R3.label([x,h,z],String(P.list_sizes[c]),{fs:12,dy:-10,c:C.acc,b:1,a:e})}
      else R3.box([x,0,z],[.14,hc(c),.14],{fill:k===0&&r<12?mix(C.paper,C.q,.25):C.paper,a,shadow:false})});
    if(k===0){q.order.forEach((c,r)=>{if(r%2&&r>11)return;R3.flowArc(QP,[XC(r),hc(c)+.05,ZC(r)],.25,{c:C.q,a:e*(r<12?.9:.45),r:.04,n:3,speed:1.5})});
      R3.label([XC(0)-.4,0,ZC(0)+.2],'nearest centroid',{al:'right',dx:-6,fs:12,c:C.mute,grp:'cells'});R3.label([XC(71)+.4,0,ZC(71)-.2],'farthest',{al:'left',dx:6,fs:12,c:C.mute,grp:'cells'})}
    // the claim
    R3.ball(QP,.16,{c:C.q});R3.label(QP,'claim',{dy:-18,fs:12.5,b:1,c:C.q});
    // the lookup table: 16 rows (pieces of the claim) x 256 columns (centroids of that piece)
    const ta=flat?0:k===2?e:k===3?1:k===4?off(k,e,4)*.4:0;
    if(ta>0){R3.glass([PX0,PY0,PZ],[PX1-PX0,0,0],[0,M*RH,0],{c:C.c1,nu:32,nv:16,a:ta});
      R3.label([PX0,PY0+M*RH,PZ],'table · 16 pieces × 256 centroids',{al:'left',dy:-10,fs:12.5,b:1,c:C.c1,a:ta});
      if(k===2)for(let m=0;m<M;m+=3)R3.flow([QP,[PX0+.2+m*.6,rowY(m),PZ+.05]],{c:C.q,a:e,r:.045,speed:1.6})}
    // IVF-Flat: every candidate scored exactly from its full vector
    if(flat&&(k===2||k===3)){q.order.slice(0,np).forEach((c,r)=>R3.flowArc(QP,[XC(r),P.list_sizes[c]*.009+.05,ZC(r)],.4,{c:C.q,a:k===2?e:.5,r:.05,n:6,speed:1.5}))}
    // one candidate: its 16 bytes pick 16 table entries, which add up to its score
    if(k===3){const j=pick(R),apj=R.ap.get(j),exj=q.ex[j];
      if(!flat){let tm=0;for(let m=0;m<M;m++)tm=Math.max(tm,Math.abs(q.Tf[m*KS+codes[j*M+m]]));
        const SX=5.7,SZ=-.7;
        for(let m=0;m<M;m++){const c=codes[j*M+m],v=q.Tf[m*KS+c],len=Math.abs(v)/tm*1.5*e,x=colX(c),y=rowY(m);
          R3.box([x,y-.065,PZ+(v>=0?len/2+.06:-len/2)],[.11,.13,Math.max(.02,len)],{fill:v>=0?C.c1:C.c2,shadow:false,lw:.6});
          R3.line([[x,0,PZ+.5],[x,y-.06,PZ+.06]],{c:C.mute,w:.8,a:.5*e,dash:[2,3]});R3.box([x,0,PZ+.5],[.08,.05,.08],{fill:C.ink,shadow:false,a:e});
          if(m%2===0)R3.flowArc([x,y,PZ+(v>=0?len+.06:.06)],[SX,.9,SZ],.3,{c:v>=0?C.c1:C.c2,a:e*.8,r:.035,n:3,speed:1.4})}
        R3.label([PX0+1.2,0,PZ+.5],'its 16 bytes',{al:'right',dx:-6,fs:12,c:C.ink,grp:'pq'})}
      const lo=Math.min(apj,exj)-.15,hb=v=>.15+(v-lo)*4;
      const SX=5.7,SZ=-.7;
      if(!flat){R3.box([SX-.22,0,SZ],[.34,hb(apj)*e,.34],{fill:C.acc});R3.label([SX-.22,hb(apj)*e,SZ],'PQ '+apj.toFixed(3),{al:'right',dx:-8,dy:-6,fs:12.5,b:1,c:C.acc,a:e})}
      R3.box([SX+.22,0,SZ],[.34,hb(exj)*e,.34],{fill:C.paper});R3.label([SX+.22,hb(exj)*e,SZ],'exact '+exj.toFixed(3),{al:'left',dx:8,dy:-6,fs:12.5,c:C.ink,a:e});
      if(flat){R3.box([0,1.1,.9],[2.6,.08,.3],{fill:mix(C.paper,C.acc,.4),a:e});R3.label([0,1.2,.9],'one abstract · 1,024 numbers',{dy:-10,fs:12,c:C.ink,a:e});R3.flow([QP,[0,1.25,.9],[SX+.22,hb(exj),SZ]],{c:C.q,a:e,r:.05,speed:1.5})}}
    // rank and result: the best 20 by the method's score, best on the left; green = in the exact top 10
    if(k>=4){const L=R.rank.slice(0,20),sc=j=>flat?q.ex[j]:st.m==='pq'?R.ap.get(j):q.ex[j];const vals=L.map(sc),hi=Math.max(...vals),lo=Math.min(...vals)-.02;
      L.forEach((j,i)=>{const x=-4.75+i*.5,g=q.gt.includes(j),ret=i<10,a=k===5&&!ret?.22:1,h=.15+(sc(j)-lo)/(hi-lo||1)*1.6;
        R3.box([x,0,.7],[.36,h*(k===4?e:1),.36],{fill:g?C.good:C.paper,a,lw:.7});
        if(st.m==='pq'){const he=.15+(q.ex[j]-lo)/(hi-lo||1)*1.6;R3.box([x,Math.max(0,he-.02),.7],[.46,.035,.46],{fill:C.ink,a:a*(k===4?e:1),shadow:false})}});
      if(k===5){R3.quad([[-5.05,.006,.42],[-.05,.006,.42],[-.05,.006,.98],[-5.05,.006,.98]],{fill:mix(C.paper,C.acc,.25),a:e,ea:.8});
        R3.label([-2.55,0,1.05],R.found+' of the exact top 10 returned',{dy:16,fs:13,b:1,c:C.acc,a:e})}
      R3.label([-4.9,.2,.7],flat?'by exact score':st.m==='pq'?'by PQ score':'best 100 by PQ, rescored',{al:'right',dx:-8,fs:12,c:C.mute,grp:'rk'})}
  }
  function fmt(x){return x>=1e6?(x/1e6).toFixed(2)+' M':x>=1e3?(x/1e3).toFixed(1)+' k':String(Math.round(x))}
  function readout(k){const R=cur(),q=R.q,D=P.d,nc=R.cand.length,flat=st.m==='flat';let mac=72*D,bytes=72*D*4;
    if(k>=2){if(flat){mac+=nc*D;bytes+=nc*D*4}else{mac+=M*KS*(D/M);bytes+=nc*M+M*KS*4;if(st.m==='rs'&&k>=4){mac+=Math.min(100,nc)*D;bytes+=Math.min(100,nc)*D*4}}}
    $('vix-p-stats').innerHTML=RD.stat('Candidates',k>=1?nc:'...',k>=1?st.np+' of 72 cells':'')+RD.stat('Multiply-adds',fmt(mac),'exact search: 5.31 M')+RD.stat('Bytes read',fmt(bytes),'exact search: 21.2 M')+RD.stat('Exact top 10 found',k>=5?R.found+' / 10':'...','');
    let o='Claim: &ldquo;'+esc(q.text)+'&rdquo;';
    if(k===1){const out=q.gt.filter(j=>j<0||!R.cand.includes(j)).length;o+=' '+(out?'<b>'+out+' of the exact top 10</b> live in cells not probed.':'All of the exact top 10 are inside the probed cells.')}
    if(k===3){const j=pick(R);o='Candidate: &ldquo;'+esc(P.titles[j]||'abstract')+'&rdquo;'+(flat?': exact similarity '+q.ex[j].toFixed(4)+'.':', stored as <span class="code">'+[...Array(M).keys()].map(m=>'<span>'+codes[j*M+m]+'</span>').join('')+'</span>claim&middot;centroid '+q.cs[assign[j]].toFixed(4)+' + 16 look-ups = '+R.ap.get(j).toFixed(4)+', against exact '+q.ex[j].toFixed(4)+'.')}
    $('vix-p-out').innerHTML=o;
    $('vix-p-res').innerHTML=k>=5?'<table class="res"><tr><th>#</th><th>returned</th><th class="num">exact sim.</th></tr>'+R.top.map((j,i)=>'<tr><td>'+(i+1)+'</td><td><span class="'+(q.gt.includes(j)?'ok':'no')+'">'+(q.gt.includes(j)?'&#10003;':'&#215;')+'</span> '+esc(P.titles[j]||'(abstract)')+(q.rel.includes(j)?' <span class="tag">labelled relevant</span>':'')+'</td><td class="num">'+q.ex[j].toFixed(3)+'</td></tr>').join('')+'</table>':''}
  const full={cam:[.18,.62],bounds:[[-5.4,0,-1.9],[6.2,2.6,4.8]]};
  const stg=S3.stage({id:'stg-pq',list:'sx-pq',fig:'Fig. 2 · one SciFact claim through a real IVF-PQ index',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1400,hold:4800,draw,
    view:k=>k===3&&st.m!=='flat'?{cam:[.12,.3],bounds:[[-5.2,0,-2.3],[6.4,2.8,.2]]}:k===3?{cam:[.25,.8],bounds:[[-.6,0,-1.1],[6.5,1.6,4.9]]}:k>=4?{cam:[.12,.5],bounds:[[-5.6,0,-.2],[5,2,1.4]]}:k===0?{cam:[.18,.7],bounds:[[-5.4,0,1.5],[5.4,2.4,4.8]]}:full,
    margin:w=>w<520?[12,8,12,8]:[16,14,16,14],onStep:k=>{st.k=k;try{readout(k)}catch(e){}}});
  function all(){let h='<table><tr><th>Claim</th><th class="num">nprobe</th><th class="num">candidates</th><th class="num">IVF-Flat</th><th class="num">IVF-PQ</th><th class="num">+ rescore</th></tr>';
    Qs.forEach((q,qi)=>{[1,2,4,8].forEach(np=>{const a=run(qi,np,'flat'),b=run(qi,np,'pq'),c=run(qi,np,'rs');h+='<tr><td>'+(np===1?(qi+1)+'. '+esc(q.text.slice(0,48))+'...':'')+'</td><td class="num">'+np+'</td><td class="num">'+a.cand.length+'</td><td class="num">'+a.found+'</td><td class="num">'+b.found+'</td><td class="num">'+c.found+'</td></tr>'})});
    $('vix-p-all').innerHTML=h+'</table><p class="small mute">Exact top 10 found (of 10). Rescoring re-ranks the 100 best by PQ score with the float32 vectors; it cannot recover a neighbour whose cell was not probed.</p>'}
  const redo=()=>{RR=null;readout(st.k);stg.draw()};
  RD.seg($('vix-p-np'),v=>{st.np=+v;redo()});
  RD.seg($('vix-p-meth'),v=>{st.m=v;redo()});
  $('vix-p-q').addEventListener('change',e=>{st.q=+e.target.value;redo()});
  readout(0);all();
})();
