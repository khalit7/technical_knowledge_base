// ---- Scene, section 5 (Fig. 4): four requests on three LoRA adapters through one layer, schematic (renderer v2).
// The base weight matrix W is one large glass plate; each adapter is a pair of thin plates (A, then B, rank r), drawn thin to say "low rank",
// not to scale. Two modes: llama-server's rule (a batch holds only slots whose adapter sets are equal, so adapters take turns and W is read
// once per turn) against a mixed batch (one read of W for every request, then one gathered launch for all the small adapter products). ----
(function(){
  if(!document.getElementById('stg-lora'))return;const {at,off,lerp,mix}=S3;
  const REQ=[['r1','A'],['r2','B'],['r3','A'],['r4','C']],AC={A:'c1',B:'c2',C:'c3'},AX={A:-1.6,B:0,C:1.6};
  const rx=i=>-1.95+i*1.3,ZI=2.4,ZW=.9,ZA=-.75,ZO=-2.3,WH=1.0;
  let mode='turns';
  // which requests are in the batch at step k; the step's pass over W
  const TURNS=[[],[0,2],[1],[3]],inBatch=k=>mode==='turns'?TURNS[k]||[]:(k>=1?[0,1,2,3]:[]);
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));R.grid(-3.6,3.6,-3,3.2,.5);
    const B=inBatch(k),done=mode==='turns'?[].concat(...TURNS.slice(1,k)):(k>=3?[0,1,2,3]:[]);
    // requests waiting in front, coloured by the adapter they name
    REQ.forEach((r,i)=>{const on=B.includes(i),a=on?1:done.includes(i)?.25:.6;R.box([rx(i),0,ZI],[.7,.36,.5],{fill:mix(P.paper,P[AC[r[1]]],.7),a,lw:on?1.4:.7});
      lab([rx(i),0,ZI+.25],r[0]+' · '+r[1],{dy:14,b:1,c:P[AC[r[1]]],a:Math.max(.5,a)})});
    // W: the base matrix, shared; it lights up on every pass that reads it
    const wl=B.length?1:.45;R.glass([-2.6,.06,ZW],[5.2,0,0],[0,WH,0],{c:P.mute,nu:12,nv:4,a:.35+.4*wl});
    lab([-2.6,WH,ZW],'W · base weights',{al:'right',dx:-6,b:1,c:P.ink,a:Math.max(.6,wl)});
    // adapters: two thin plates each, A then B
    Object.keys(AX).forEach(n=>{const used=B.some(i=>REQ[i][1]===n),a=used?1:.35,x=AX[n];
      R.glass([x-.3,.06,ZA],[.14,0,0],[0,.85,0],{c:P[AC[n]],nu:1,nv:5,a});R.glass([x+.12,.06,ZA],[.14,0,0],[0,.85,0],{c:P[AC[n]],nu:1,nv:5,a});
      lab([x,.91,ZA],'A, B of '+n,{dy:-9,b:1,c:P[AC[n]],a:Math.max(.5,a)})});
    // the pass: every request in the batch through W (ink), and through its own adapter (its colour), into one output each
    const sW=mode==='turns'||k!==2,sA=mode==='turns'||k>=2;
    B.forEach(i=>{const r=REQ[i],x=rx(i),f=Math.min(1,e*1.6);
      if(sW)R.flow([[x,.3,ZI],[x,.5,ZW],[x,.3,ZO]],{c:P.ink,r:.055,n:9,speed:1.5,a:f*.8});
      if(sA)R.flowArc([x,.3,ZI-.2],[AX[r[1]],.5,ZA],.6,{c:P[AC[r[1]]],r:.06,n:7,speed:1.4,a:f});
      if(sA)R.flowArc([AX[r[1]],.5,ZA],[x,.3,ZO],.3,{c:P[AC[r[1]]],r:.06,n:5,speed:1.4,a:f})});
    // outputs behind: x W + x Aᵀ Bᵀ for each request
    REQ.forEach((r,i)=>{const fresh=mode==='turns'?B.includes(i):k===3,got=done.includes(i)||fresh,a=got?(fresh?e:1):0;
      if(a>0){R.box([rx(i),0,ZO],[.7,.3,.5],{fill:mix(P.paper,P[AC[r[1]]],.45),a,lw:.8});lab([rx(i),.3,ZO],'y'+(i+1),{dy:-10,b:1,c:P.ink,a,grp:'out'})}});
    const reads=mode==='turns'?Math.min(k,3):(k>=1?1:0);
    lab([2.6,WH,ZW],reads?'W read '+reads+(reads===1?' time':' times'):'W not read yet',{al:'left',dx:6,b:1,mono:true,fs:12,c:reads>1?P.bad:P.good});
  }
  const st=S3.stage({id:'stg-lora',list:'sx-lo-t',fig:'Fig. 4 · four requests, three adapters, one layer, schematic',cam:[.3,.8],bounds:[[-3,0,-2.7],[3,1.1,2.8]],aspect:.62,dur:1500,hold:4600,draw,
    margin:w=>w<520?[18,70,22,80]:[22,110,24,120]});
  const ch=document.getElementById('lo-mode');
  if(ch)ch.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    const L=mode==='turns'?'sx-lo-t':'sx-lo-m';['sx-lo-t','sx-lo-m'].forEach(id=>{document.getElementById(id).hidden=id!==L});st.list(L)});
  (window.PRSTG=window.PRSTG||{})['stg-lora']=st;
})();
