// ---- Reading: augmentations, mixup and CutMix on real 8 x 8 digits ----
(function(){
  const card=document.getElementById('au-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const NT=DIG.labels.length,pix=k=>[...DIG.digits.slice(k*64,k*64+64)].map(c=>parseInt(c,17)/16);
  const CL=DIG.measures.clear,st={t:'shift',a:CL[1],b:CL.find(d=>DIG.labels[d]!==DIG.labels[CL[1]]),lam:0.7,seed:1};
  let r=RG.rng(st.seed);
  window.DGT=function(v,w){return '<div class="dgt" style="width:'+(w||84)+'px;gap:0;background:var(--bg)">'+v.map(x=>'<i style="background:var(--ink);opacity:'+Math.max(0,Math.min(1,x)).toFixed(3)+'"></i>').join('')+'</div>'};
  const at=(v,x,y)=>x<0||y<0||x>7||y>7?0:v[y*8+x];
  function shift(v){let dx=0,dy=0;while(!dx&&!dy){dx=Math.floor(r()*3)-1;dy=Math.floor(r()*3)-1}const o=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)o.push(at(v,x-dx,y-dy));return {v:o,d:'shift '+(dx?(dx>0?'right':'left'):'')+(dx&&dy?', ':'')+(dy?(dy>0?'down':'up'):'')}}
  function rot(v){const a=(r()*30-15)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),o=[];
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const X=c*(x-3.5)+s*(y-3.5)+3.5,Y=-s*(x-3.5)+c*(y-3.5)+3.5,x0=Math.floor(X),y0=Math.floor(Y),fx=X-x0,fy=Y-y0;
      o.push(at(v,x0,y0)*(1-fx)*(1-fy)+at(v,x0+1,y0)*fx*(1-fy)+at(v,x0,y0+1)*(1-fx)*fy+at(v,x0+1,y0+1)*fx*fy)}return {v:o,d:'rotate '+Math.round(a*180/Math.PI)+'°'}}
  function noise(v){return {v:v.map(x=>{const u=Math.max(1e-12,r()),w=r();return Math.max(0,Math.min(1,x+0.2*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*w)))}),d:'noise σ = 0.2'}}
  function cut(v){const x0=Math.floor(r()*6),y0=Math.floor(r()*6);return {v:v.map((x,i)=>{const X=i%8,Y=Math.floor(i/8);return X>=x0&&X<x0+3&&Y>=y0&&Y<y0+3?0:x}),d:'cutout at ('+x0+', '+y0+')'}}
  function flip(v){const o=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)o.push(v[y*8+7-x]);return {v:o,d:'flipped'}}
  function draw(){const A=pix(st.a),la=DIG.labels[st.a];let html='<figure>'+DGT(A)+'<figcaption>original, a '+la+'</figcaption></figure>',lab='';
    $('au-lw').hidden=!(st.t==='mix'||st.t==='cutmix');
    r=RG.rng(st.seed*977+st.a);
    if(st.t==='mix'||st.t==='cutmix'){const B=pix(st.b),lb=DIG.labels[st.b];html+='<figure>'+DGT(B)+'<figcaption>second, a '+lb+'</figcaption></figure>';
      let M,w;
      if(st.t==='mix'){M=A.map((x,i)=>st.lam*x+(1-st.lam)*B[i]);w=st.lam}
      else{const area=Math.round((1-st.lam)*64),side=Math.max(0,Math.min(8,Math.round(Math.sqrt(area))));const x0=Math.floor(r()*(9-side)),y0=Math.floor(r()*(9-side));
        M=A.map((x,i)=>{const X=i%8,Y=Math.floor(i/8);return side&&X>=x0&&X<x0+side&&Y>=y0&&Y<y0+side?B[i]:x});w=1-side*side/64}
      html+='<figure>'+DGT(M)+'<figcaption>'+(st.t==='mix'?'mixup':'CutMix')+'</figcaption></figure>';
      const t=new Array(10).fill(0);t[la]+=w;t[lb]+=1-w;
      lab='Training target for the blend: '+t.map((v,k)=>v>0?'<b>'+k+'</b>: '+v.toFixed(2):'').filter(Boolean).join(', ')+(st.t==='cutmix'?' (the pasted square\'s share of the 64 pixels)':' (λ from the slider; in training it is drawn from Beta(α, α) each time)')+(la===lb?'. Both digits are the same class here; pick another.':'.');
    }else{const f={shift,rot,noise,cut,flip}[st.t];for(let k=0;k<4;k++){const o=f(A);html+='<figure>'+DGT(o.v)+'<figcaption>'+o.d+'</figcaption></figure>';if(st.t==='flip')break}
      lab=st.t==='flip'?'<span class="warn">Not label-preserving here:</span> a mirrored '+la+' is not a '+la+' (or is no digit at all). Flips are standard for photographs, not for digits or text.':'Training target: still a <b>'+la+'</b>. Each training pass draws a fresh transform, so the network never sees exactly the same image twice.'}
    $('au-row').innerHTML=html;$('au-lab').innerHTML=lab}
  $('au-t').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));st.t=b.dataset.v;draw()});
  $('au-new').addEventListener('click',()=>{const g=RG.rng(Date.now()%100000);st.a=Math.floor(g()*NT);do{st.b=Math.floor(g()*NT)}while(DIG.labels[st.b]===DIG.labels[st.a]);draw()});
  $('au-draw').addEventListener('click',()=>{st.seed++;draw()});
  $('au-l').addEventListener('input',e=>{st.lam=+e.target.value;$('au-lv').textContent=st.lam.toFixed(2);draw()});
  draw();
})();
