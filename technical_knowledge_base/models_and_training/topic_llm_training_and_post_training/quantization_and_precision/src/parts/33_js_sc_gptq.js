// ---- Scene (GPTQ, Fig. 4): the paper's Algorithm 1 on one illustrative row of four weights (renderer v2) ----
// Data: QV.gptq() (inputs labelled illustrative on the page; visuals_ref.py checks every state). The four weights stand as signed bars on plinths
// in front of a purple glass plane whose lines are the grid (step 0.25); the Hessian H = 2XᵀX of the six calibration inputs lies in front as a 4 x 4 bar field.
// Each step quantises one column (its bar snaps to a line and turns green) and streams its rounding error into the columns still to come,
// with as many dots as the move each one gets; the last step adds what round-to-nearest stores (orange ticks).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-gq')||!window.S3)return;const {at,lerp,mix}=S3;
  const G=QV.gptq(),g=G.G,n=4,X=g.X;
  const H=[0,1,2,3].map(i=>[0,1,2,3].map(j=>2*X.reduce((s,r)=>s+r[i]*r[j],0))),HM=Math.max(...H.flat().map(Math.abs));
  const XS=[-2.1,-.7,.7,2.1],Y0=1.6,VS=1.2,ZB=0,ZP=-.32,lo=-1.25,hi=1,HX=4.7,HZ=.3,hs=.5;
  const f=(x,d)=>(x<0?'−':x>0?'+':'')+Math.abs(x).toFixed(d==null?3:d),fv=(x,d)=>(x<0?'−':'')+Math.abs(x).toFixed(d==null?3:d);
  const pct=x=>(100*x).toFixed(1)+'%';
  function texts(){const set=(k,v)=>document.querySelectorAll('[data-gq="'+k+'"]').forEach(e=>e.textContent=v),S=G.states;
    set('h12',H[0][1].toFixed(2));set('h11',H[0][0].toFixed(2));set('rtn',G.rtn.map(x=>fv(x,2)).join(', '));
    set('e1',fv(S[1].err));set('m12',f(S[1].moved[1]));set('w2',fv(S[1].cur[1]));
    set('q2',fv(G.Q[1],2));set('e2',fv(S[2].err));set('e3',fv(S[3].err));set('e4',fv(S[4].err));
    set('gq',G.Q.map(x=>fv(x,2)).join(', '));set('og',pct(G.outGPTQ));set('or',pct(G.outRTN));set('wg',pct(G.wGPTQ));set('wr',pct(G.wRTN))}
  const yv=v=>Y0+v*VS;
  function draw(R,k,e,st){
    // labels wait for the camera: while it glides to another view they stay hidden, then fade in (so none points at a place it has left)
    const vk=k=>k>=1&&k<=3?1:0,LA=st&&st.pk!==k&&vk(st.pk)!==vk(k)?Math.max(0,(e-.55)/.45):1,lab=(p,t,o)=>R.label(p,t,{...o,a:(o&&o.a!=null?o.a:1)*LA});const P=R.P;R.grid(-3.5,6.2,-1.6,2.2,.5);
    const S=G.states,j=k-1,cur=k===0?S[0].cur:S[k-1].cur.map((x,i)=>lerp(x,S[k].cur[i],e));
    // the grid of representable values: a purple glass plane just behind the bars, one line every 0.25, zero drawn darker
    R.glass([XS[0]-.75,yv(lo),ZP],[XS[3]-XS[0]+1.5,0,0],[0,(hi-lo)*VS,0],{c:P.c4,a:.8,nu:1,nv:Math.round((hi-lo)/g.step),th:.03});
    R.line([[XS[0]-.75,Y0,ZP+.01],[XS[3]+.75,Y0,ZP+.01]],{c:P.ink,w:1.6,a:.7});
    [0.75,0.5,0.25,0,-0.25,-0.5,-0.75,-1].forEach(t=>lab([XS[0]-.75,yv(t),ZP],fv(t,2),{al:'right',dx:-6,mono:true,fs:12,c:t===0?P.ink:P.c4}));
    for(let c=0;c<n;c++){const x=XS[c],snap=k===c+1,v=snap?lerp(cur[c],G.Q[c],e):k>c+1?G.Q[c]:cur[c],done=k>c+1||snap&&e>.5;
      const hh=Math.max(.015,Math.abs(v)*VS),fill=done?mix(P.paper,P.c3,.75):mix(P.paper,P.c1,.35);
      R.box([x,v>=0?Y0:Y0-hh,ZB],[.55,hh,.3],{fill,shadow:false});
      // the original value, dashed, once it has moved
      if(Math.abs(v-g.w[c])>.01){const y=yv(g.w[c]);R.line([[x-.38,y,ZB+.16],[x+.38,y,ZB+.16]],{c:P.mute,w:1.6,dash:[4,3]})}
      // what round-to-nearest stores, on the last step
      if(k===4){const y=yv(G.rtn[c]);R.line([[x-.44,y,ZB+.18],[x+.44,y,ZB+.18]],{c:P.bad,w:3.5,a:e})}
      const wl='w'+(c+1)+' '+(k>c+1||(snap&&e>.6)?fv(G.Q[c],2):fv(v));
      lab([x,Y0+Math.max(0,v)*VS+.08,ZB],wl,{mono:true,fs:12.5,b:snap?1:0,c:snap?P.acc:k>c+1?P.c3:P.ink,dy:-11})}
    // the rounding error of column j flows into every later column, as many dots as the move it gets
    if(k>=1){const mv=S[k].moved,mm=Math.max(1e-9,...mv.map(Math.abs));
      for(let c=j+1;c<n;c++){const share=Math.abs(mv[c])/mm;if(share<.02)continue;
        R.flowArc([XS[j],Y0+.15,ZB+.2],[XS[c],Y0+.15,ZB+.2],.5+.18*(c-j),{c:P.acc,a:Math.min(1,e*1.8)*(.35+.65*share),r:.05+.03*share,n:Math.max(2,Math.round(2+10*share)),speed:1})}}
    // the Hessian of the calibration inputs, to the right: a 4 x 4 field of bars (shown on the first and last steps)
    const ha=k===0?1:k===4?e:k===1?1-e:0;
    if(ha>.01){const h0=[HX-1.5*hs,0,HZ-1.5*hs];R.glass([h0[0]-hs/2,.02,h0[2]-hs/2],[4*hs,0,0],[0,0,4*hs],{c:P.c6,a:.8*ha,nu:4,nv:4,th:.02});
      for(let r=0;r<n;r++)for(let c=0;c<n;c++){const v=H[r][c],hh=Math.max(.02,Math.abs(v)/HM*1.3);
        R.box([h0[0]+c*hs,.02,h0[2]+r*hs],[hs*.62,hh,hs*.62],{fill:v>=0?mix(P.paper,P.c6,.55):mix(P.paper,P.c2,.5),a:ha,shadow:false})}
      lab([HX,0,h0[2]+4*hs-.1],'H = 2XᵀX',{mono:true,fs:12.5,b:1,c:P.c6,dy:16,a:ha});}}
  const full={cam:[.3,.36],bounds:[[-3.4,0,-.6],[5.9,3,1.4]]};
  const st=S3.stage({id:'stg-gq',list:'sx-gq',fig:'Fig. 4 · GPTQ on one illustrative row of four weights',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,12,10]:[18,24,12,56],
    view:k=>k>=1&&k<=3?{cam:[.16,.22],bounds:[[-3.2,0,-.5],[2.9,3,.5]]}:full});
  (window.QSTG=window.QSTG||{})['stg-gq']=st;texts();
})();
