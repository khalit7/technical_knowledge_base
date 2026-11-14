// ---- Scene: one agent turn through DeepSeek V4-Flash (decoder-only) and V4.1-Flash (causal encoder-decoder), side by side (renderer v2) ----
// Each tower is the model's layer stack (43 and 40 layers, drawn to scale), one slab per layer; a slab's depth is the prompt (all its tokens
// processed together). A layer that keeps a global cache has a plate on its outer side whose length is the bytes it stores per prompt token,
// so a plate's area is that layer's whole cache. Numbers from the two config.json files and the V4.1-Flash report (src/recompute.py):
// V4-Flash: layers 0-1 sliding window only, 21 CSA layers at (584 + 68) / 4 bytes, 20 HCA layers at 584 / 128; V4.1-Flash: layers 2, 8, 14
// at (288 + 68) / 2 and layer 20 at 288 + 68, projected from the encoder; 128 tokens replayed; 13B, 8B + 8B active parameters.
// The SSD store's split (sliding window nearly half for V4-Flash, about 1/8 overall for V4.1-Flash) is the report's, not recomputed.
(function(){
  if(!document.getElementById('stg-ced'))return;const {at,off,lerp,mix}=S3;
  const NWIN=128,LH=.1,TH=.072,SW=1,SD=2.6,K=.0042,EGAP=.14,DZ=1.78;
  const v4b=r=>r<2?0:(r%2===0?(584+68)/4:584/128);                      // bytes per prompt token each V4-Flash layer keeps
  const v41b=r=>[2,8,14].includes(r)?(288+68)/2:r===20?(288+68):0;     // the same for V4.1-Flash (layer 20 projected, not run)
  const st={N:32768};
  const TW=[{xc:-1.25,L:43,side:-1,b:v4b,y:r=>r*LH},{xc:1.25,L:40,side:1,b:v41b,y:r=>r*LH+(r>=20?EGAP:0)}];
  const kind=(m,r)=>m===0?(r<2?'swa':'cache'):(r<2?'swa':v41b(r)&&r<20?'cache':r<20?'reuse':'dec');
  // what each model has done by the end of step k (also drives the counters on the left)
  function snap(m,k){const N=st.N,rep=Math.min(N,NWIN);
    if(m===0){const rows=k>=2?43:k>=1?2:0;let hbm=0;for(let r=0;r<rows;r++)hbm+=v4b(r)*N;
      return {passes:rows*N,hbm,flops:2*13e9/43*rows*N,persist:k>=6,dec:k>=7}}
    const rows=k>=2?20:k>=1?2:0;let hbm=0;for(let r=0;r<rows;r++)hbm+=v41b(r)*N;if(k>=3)hbm+=v41b(20)*N;
    const passes=rows*N+(k>=4?rep*20:0);return {passes,hbm,flops:2*8e9/20*passes,persist:k>=6,dec:k>=7}}
  function draw(R,k,e){const P=R.P,narrow=R.W<520,ghost=P.dark?mix(P.paper,P.mute,.3):mix(P.paper,P.soft,.5),grey=mix(P.paper,P.mute,.45);
    R.grid(-3.4,3.8,-1.8,3,.5);
    const KC={swa:grey,cache:P.c2,reuse:P.c6,dec:P.c4};
    // the tool result: one prompt of N tokens on the floor in front, streaming into both stacks while they read it
    const pa=k===0?1:k<=2?.7:.35;
    R.quad([[-.55,0,2.15],[.55,0,2.15],[.55,0,2.75],[-.55,0,2.75]],{fill:mix(P.paper,P.c5,.35),a:pa,ec:P.line});
    if(!narrow)R.label([0,0,2.75],'tool result: '+st.N.toLocaleString('en-GB')+' tokens',{mono:true,fs:12,dy:12,a:k===3||k===4?0:Math.max(.5,pa),c:P.ink});
    if(k<=2)TW.forEach(T=>R.flow([[T.xc*.25,.05,2.3],[T.xc*.9,.05,1.9],[T.xc,.05,SD/2]],{c:P.c5,a:k===0?e:1-.5*(k===2?e:0),r:.06,n:5,speed:1.2}));
    TW.forEach((T,m)=>{
      // focus: steps 4 and 5 are about V4.1-Flash only; V4-Flash recedes
      const foc=m===0&&(k===3||k===4)?.07:1;
      // how far up the stack the prompt has run in this step
      const pre=r=>{if(r<2)return k>1?1:k===1?S3.cl(e*2-r,0,1):0;
        if(m===0)return k>2?1:k===2?S3.cl(e*41-(r-2),0,1):0;
        if(r<20)return k>2?1:k===2?S3.cl(e*18-(r-2),0,1):0;return 0};
      for(let r=0;r<T.L;r++){const y=T.y(r),f=pre(r),kd=kind(m,r);
        const fill=f>0?mix(ghost,KC[kd],(kd==='swa'?.75:.55)*f):ghost;
        R.box([T.xc,y,0],[SW,TH,SD],{fill,a:foc*(f>0?1:.6),shadow:r===0,lw:.5,ea:f>0?.5:.3});
        // the cache plate: written while the layer runs (V4.1's layer 20 is written by projection in step 4)
        const b=T.b(r);if(!b||foc<.1)continue; // in the close-up V4-Flash keeps only its faint slabs
        const len=Math.max(.03,b*K),x0=T.xc+T.side*SW/2,proj=m===1&&r===20;
        const ca=proj?at(k,e,3):f;if(ca<=0)continue;
        if(proj)R.glass([x0,y+TH/2,-SD/2],[T.side*len*ca,0,0],[0,0,SD],{c:P.c2,a:foc,nu:8,nv:6,th:.04});
        else R.box([x0+T.side*len*ca/2,y,0],[len*ca,TH*.8,SD],{fill:mix(P.paper,P.c2,.5),a:foc,shadow:false,lw:.5,ea:.4})}
      // V4.1: cache reuse inside the encoder (dots stream from each cache layer up to the five layers that read it)
      if(m===1&&k>=2&&k<=3)[2,8,14].forEach(s=>{const a=k===2?S3.cl(e*18-(s-2)-1,0,1):.6;if(a>0)R.flow([[T.xc+.42,T.y(s)+TH,SD/2-.2],[T.xc+.42,T.y(s+5)+TH,SD/2-.2]],{c:P.c6,a,r:.05,n:4,speed:.8})});
      // V4.1: the decoder's cache is a projection of the encoder's final hidden state
      if(m===1&&k===3)R.flow([[T.xc,T.y(19)+TH,0],[T.xc+.5,T.y(19)+.2,0],[T.xc+SW/2+.25,T.y(20)+TH,0]],{c:P.c2,a:e,r:.07,n:6,speed:.9});
      // V4.1: only the last 128 prompt tokens run through the decoder (the front sliver, to scale with a floor of .05)
      if(m===1&&k>=4){const w=Math.max(.05,SD*Math.min(1,NWIN/st.N));
        for(let r=20;r<40;r++){const f=k>4?1:S3.cl(e*20-(r-20),0,1);if(f>0)R.box([T.xc,T.y(r)+.004,SD/2-w/2+.002],[SW+.01,TH,w],{fill:mix(P.paper,P.c4,.75),a:f,shadow:false,lw:.5,ea:.5})}
        if(k===4)R.flow([[T.xc,T.y(20),SD/2+.25],[T.xc,T.y(39)+TH,SD/2+.25]],{c:P.c4,a:e,r:.06,n:6,speed:1})}
      // decode: one new token runs every layer and reads every cache
      if(k===7){const top=T.y(T.L-1)+TH,hgt=top*e,cx=T.xc-T.side*(SW/2+.24);
        R.box([cx,0,SD/2-.2],[.26,Math.max(.01,hgt),.26],{fill:mix(P.paper,P.c1,.6),lw:.6});
        for(let r=0;r<T.L;r++){const b=T.b(r);if(!b||T.y(r)>hgt)continue;const x0=T.xc+T.side*(SW/2+Math.max(.03,b*K)*.5);
          R.flow([[x0,T.y(r)+TH,SD/2],[T.xc,T.y(r)+TH,SD/2+.02],[cx,T.y(r)+TH,SD/2-.07]],{c:P.c2,r:.04,n:3,speed:.8,a:.85})}
        R.label([cx,top*e,SD/2-.2],narrow?'new token':'new token: '+T.L+' layers',{mono:true,fs:12,dy:-10,al:m===0?'right':'left',dx:m===0?6:-6,c:P.c1,a:e})}
      // the SSD store for the next turn: V4-Flash keeps the global and the sliding-window cache (nearly half); V4.1-Flash only the global, about 1/8 of it
      if(k>=6){const a=at(k,e,6)*(k===7?.6:1),sx=T.xc+T.side*1.3,H1=1.1,hg=m===0?H1:H1/8;
        if(m===0){R.box([sx,0,DZ+.15],[.5,H1/2*a,.5],{fill:mix(P.paper,P.c2,.45),a});R.box([sx,H1/2*a,DZ+.15],[.5,H1/2*a,.5],{fill:grey,a,shadow:false})}
        else R.box([sx,0,DZ+.15],[.5,hg*a,.5],{fill:mix(P.paper,P.c2,.45),a});
        if(k===6)R.flow([[T.xc+T.side*(SW/2+.3),T.y(Math.min(T.L-1,20)),SD/2],[sx,(m===0?H1:hg)+.15,DZ+.15]],{c:P.c2,a:e,r:.06,n:5,speed:1});
        R.label([sx,(m===0?H1:hg)*a,DZ+.15],m===0?(narrow?'SSD: 1':'SSD store: 1 (global + window)'):(narrow?'SSD: 1/8':'SSD store: about 1/8'),{mono:true,fs:12,dy:-10,a,c:P.ink})}
      // names and the cache totals
      R.label([T.xc,0,SD/2],m===0?(narrow?'V4-Flash':'V4-Flash · 43 layers'):(narrow?'V4.1-Flash':'V4.1-Flash · 20 + 20'),{fs:13,b:1,dy:14,c:P.ink,a:Math.max(.45,foc)});
      if(k>=2){const tot=m===0?'3,514 B':'890 B',a=m===0?(k===2?e:foc):(k===2?e*.6:1),ty=m===1&&k<5?T.y(20)+.3:T.y(T.L-1)+.25;
        R.label([T.xc+T.side*(SW/2+.35),ty,0],k>=5?tot+' per token':(m===0?'41 caches':k>=3?'4 caches':'3 caches'),{mono:true,fs:k>=5?13.5:12.5,b:k>=5,c:P.c2,a:k===2&&m===1?e:a})}
      if(!narrow&&k<7){const mk=m===0?[[0,'0'],[42,'42']]:[[0,'0'],[19,'19'],[20,'20'],[39,'39']];
        mk.forEach(([r,t])=>R.label([T.xc-T.side*SW/2,T.y(r)+TH/2,SD/2],t,{mono:true,fs:12,al:m===0?'left':'right',dx:m===0?6:-6,c:P.mute,a:foc*.9}))}
      if(m===1&&k>=1&&k<=4){R.label([T.xc-SW/2,T.y(10),SD/2],'encoder',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,wide:1});
        R.label([T.xc+SW/2,T.y(31),-SD/2],k===4?'decoder: last 128 tokens':'decoder: not run on the prompt',{mono:true,fs:12,al:'left',dx:8,c:k===4?P.c4:P.mute,wide:1})}
    });
  }
  const full={cam:[.36,.36],bounds:[[-2.9,0,-1.4],[3.5,4.5,2.8]]};
  const api=S3.stage({id:'stg-ced',list:'sx-ced',fig:'Fig. · one agent turn, two architectures',cam:full.cam,bounds:full.bounds,aspect:.82,dur:2400,hold:4800,draw,
    // steps 4 and 5 are about V4.1-Flash's decoder: the camera moves in on it
    margin:w=>w<520?[18,18,18,18]:[18,150,18,18], // room on the right for the decoder's note on wide screens
    view:k=>k===3||k===4?{cam:[.55,.34],bounds:[[-.2,0,-1.4],[3.4,4.4,2.2]]}:full,
    onStep:k=>{try{counters(k)}catch(e){}}});
  // the counters on the left, at the end of the current step, for the chosen prompt length
  const dB=b=>b>=1e9?(b/1e9).toFixed(b>=1e10?1:2)+' GB':b>=1e6?(b/1e6).toFixed(b>=1e8?0:1)+' MB':b>=1e3?(b/1e3).toFixed(1)+' kB':fmt(b)+' B';
  const dF=f=>!f?'0':f>=1e15?(f/1e15).toFixed(2)+' PFLOP':(f/1e12).toFixed(f>=1e14?0:1)+' TFLOP';
  function counters(k){const a=snap(0,k),b=snap(1,k),N=st.N,rep=Math.min(N,NWIN);
    const row=(h,x,y,d)=>'<tr><th scope="row">'+h+(d?'<div class="small mute">'+d+'</div>':'')+'</th><td>'+x+'</td><td>'+y+'</td></tr>';
    $('cedCnt').innerHTML='<table class="lt ced-t"><thead><tr><th>After step '+(k+1)+'</th><th>V4-Flash</th><th>V4.1-Flash</th></tr></thead><tbody>'+
      row('Layer passes for the prompt',sci(a.passes,2),sci(b.passes,2),'when done: N x 43 = '+sci(N*43,2)+'; N x 20 + 128 x 20 = '+sci(N*20+rep*20,2))+
      row('Parameter compute for the prompt',dF(a.flops),dF(b.flops),'2 x active parameters per token, derived')+
      row('Global cache in HBM',dB(a.hbm),dB(b.hbm),'3,514 and 890 bytes per prompt token')+
      row('Caches kept per token','41 layers','4 copies','layers 2 to 42; layers 2, 8, 14, 20')+
      row('Persistent store (SSD)',a.persist?'1 (reference)':'not yet',b.persist?'about 1/8':'not yet')+
      row('Per generated token','43 layers, 13B','40 layers, 16B','layers run and active parameters')+'</tbody></table>';
    document.querySelectorAll('#sx-ced [data-ced="N"]').forEach(x=>x.textContent=fmt(N))}
  $('cedN').addEventListener('change',e=>{st.N=+e.target.value;if(api){api.st.user=true;api.pause();api.draw()}counters(api?api.st.k:0)});
  counters(0);
  window.TN_CED={st,snap,v4b,v41b,api}; // read by src/check_stages.mjs
})();
