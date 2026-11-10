// ---- Scene (memory, Fig. 5): training state of full fine-tuning, LoRA and QLoRA as stacked slabs, with 24, 48 and 80 GB cards as planes (renderer v2) ----
// Slabs from the floor up: Adam state, trained weights and gradients, then the frozen base (so a tower's top face is the base's colour).
// The same formulas as recompute.py mem(), before activations, KV cache and framework overhead: full = 16N (bf16 weight and gradient 4N, fp32 master and two
// Adam moments 12N); LoRA = 2N + 16P; QLoRA = 4.127/8 x (linear weights) + 2 x (embeddings and norms) + 16P; P the adapter's count at rank r on all seven matrices.
// Step 4 stretches the vertical scale (shown on the card) so the adapter's slab is visible; step 5 returns to the full scale.
// Models and rank from the selects (PF_DATA.mem: N, NL and the adapter count per unit of rank u, from each model's config.json).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-mem')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const M=PF_DATA.mem.models,NF4=PF_DATA.mem.nf4,ORDER=['Llama 3 8B','Qwen3-8B','Mistral 7B v0.3','LLaMA 7B','LLaMA 13B','LLaMA 65B','Qwen3-30B-A3B'],GPUS=[24,48,80];
  $('memM').innerHTML=ORDER.map(k=>'<option'+(k==='Llama 3 8B'?' selected':'')+'>'+k+'</option>').join('');
  const gb=b=>b/1e9,fmt=g=>g>=1000?PF.comma(g)+' GB':g>=100?g.toFixed(1)+' GB':g>=10?g.toFixed(1)+' GB':g.toFixed(2)+' GB';
  let C=null;
  function calc(){const k=$('memM').value,r=+$('memR').value,m=M[k],N=m.N,NL=m.NL,P=r*m.u;
    const T=[[gb(12*N),gb(4*N)],[gb(12*P),gb(4*P),gb(2*N)],[gb(12*P),gb(4*P),gb((N-NL)*2),gb(NL*NF4/8)]],tot=T.map(s=>s.reduce((a,b)=>a+b,0));
    const fits=g=>{const c=GPUS.find(v=>v>=g);return c?c+' GB':Math.ceil(g/80)+' × 80 GB'};
    C={k,r,m,N,NL,P,T,tot,fits};
    const set=(a,v)=>document.querySelectorAll('[data-mm="'+a+'"]').forEach(e=>e.textContent=v);
    set('model',k);set('r',r);set('N',PF.fmt(N));set('P',PF.fmt(P));set('full',fmt(tot[0]));set('wg',fmt(T[0][1]));set('adam',fmt(T[0][0]));
    set('lora',fmt(tot[1]));set('base',fmt(T[1][2]));set('ad',fmt(T[1][0]+T[1][1]));set('adwg',fmt(T[1][1]));set('adadam',fmt(T[1][0]));
    set('qlora',fmt(tot[2]));set('nf4',fmt(T[2][3]));set('emb',fmt(T[2][2]));set('ffit',fits(tot[0]));set('lfit',fits(tot[1]));set('qfit',fits(tot[2]));
    $('memNote').innerHTML=k+': '+PF.fmt(N)+' parameters, '+PF.fmt(NL)+' of them in linear layers; the rank-'+r+' adapter on all seven matrices has '+PF.fmt(P)+' ('+(100*P/N).toFixed(2)+'%). Config: <a href="'+m.url.replace('/resolve/','/blob/')+'" target="_blank" rel="noopener noreferrer">config.json</a>.'}
  const XS=[-2.5,0,2.5],FW=1.45,HT=2.6;
  function draw(R,k,e){const P=R.P;if(!C)calc();R.grid(-4.5,4.5,-2,2.4,.5);
    const s0=HT/C.tot[0],s1=HT/Math.max(C.tot[1]*1.12,26.4),s=k===3?s0*Math.pow(s1/s0,e):k===4?s1*Math.pow(s0/s1,e):s0,frz=mix(P.paper,P.mute,.3),nf=mix(P.paper,P.c6,.55),wg=mix(P.paper,P.c1,.7),adm=mix(P.paper,P.c2,.7);
    const zoom=k===3,cols=[[adm,wg],[adm,wg,frz],[adm,wg,frz,nf]];
    const names=['Full fine-tuning','LoRA','QLoRA'],appear=[0,1,2];
    C.T.forEach((segs,i)=>{let a=k<appear[i]?0:k===appear[i]?Math.min(1,e*1.5):1;if(zoom&&i===0)a=Math.max(0,1-8*e);if(k===4&&i===0)a=Math.max(0,(e-.85)/.15);if(a<=.01)return;
      const grow=k===appear[i]?e:1;let y=0;
      segs.forEach((g,j)=>{const h=Math.max(.004,g*s*grow);R.box([XS[i],y,0],[FW,h,FW],{fill:cols[i][j],a,lw:.7,shadow:y===0});y+=h});
      R.label([XS[i],0,FW/2],names[i],{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a});
      R.label([XS[i],y,0],fmt(C.tot[i]),{mono:true,fs:13,b:1,dy:-12,c:i===0?P.c2:P.acc,a})});
    // what each slab is, for the step it belongs to (side labels: wide screens)
    const side=(i,j,t,c,al)=>{let y=0;for(let q=0;q<j;q++)y+=C.T[i][q]*s;const h=C.T[i][j]*s;R.label([XS[i]+(al==='left'?FW/2:-FW/2),y+h/2,FW/2],t,{mono:true,fs:12,al,dx:al==='left'?8:-8,c,wide:1,grp:'m'+i})};
    if(k===0){side(0,1,'weights + gradients, bf16 · '+fmt(C.T[0][1]),P.c1,'left');side(0,0,'Adam: fp32 master + 2 moments · '+fmt(C.T[0][0]),P.c2,'left')}
    if(k===1)side(1,2,'frozen base, bf16 · '+fmt(C.T[1][2]),P.ink,'left');
    if(k===2){const top=C.T[2].reduce((a,b)=>a+b,0)*s;R.label([XS[2]+FW/2,top,-FW/2],'NF4 linear weights · '+fmt(C.T[2][3]),{mono:true,fs:12,al:'left',dx:8,dy:-34,c:P.c6,wide:1});R.label([XS[2]+FW/2,top,-FW/2],'embeddings, norms, bf16 · '+fmt(C.T[2][2]),{mono:true,fs:12,al:'left',dx:8,dy:-16,c:P.ink,wide:1})}
    if(zoom){const y=0,h=(C.T[1][0]+C.T[1][1])*s;R.label([XS[1]-FW/2,y+h/2,FW/2],'adapter · '+fmt(C.T[1][0]+C.T[1][1]),{mono:true,fs:12.5,b:1,al:'right',dx:-10,c:P.acc,a:e});R.label([1.35,HT*1.02,-1],'heights × '+(s1/s0).toFixed(1)+' in this step',{mono:true,fs:12,c:P.mute,a:e})}
    // the cards: 24, 48 and 80 GB as glass planes across the towers, drawn when they fall inside the view
    if(k>=3){GPUS.forEach((g,j)=>{const y=g*s,top=HT*1.05;if(y>top)return;const a=k===3?e:1;
      R.glass([-3.4,y,-.95],[6.8,0,0],[0,0,1.9],{c:P.bad,a:a*.55,nu:12,nv:3,th:.004});R.label([3.4,y,-.95],g+' GB card',{mono:true,fs:12,al:'left',dx:8,c:P.bad,a,grp:'gpu'})})}
  }
  const full={cam:[.3,.36],bounds:[[-3.3,0,-1],[3.3,2.7,1]]};
  const st=S3.stage({id:'stg-mem',list:'sx-mem',fig:'Fig. 5 · training state before activations',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[18,10,26,10]:[26,40,40,40],
    view:k=>k===3?{cam:[.42,.36],bounds:[[-1.2,0,-1],[3.6,2.7,1]]}:full});
  const ch=()=>{calc();st.st.user=true;st.pause();st.draw()};
  $('memM').addEventListener('change',ch);$('memR').addEventListener('change',ch);calc();
})();
