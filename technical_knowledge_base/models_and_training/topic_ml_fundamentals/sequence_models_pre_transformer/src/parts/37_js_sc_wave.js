// ---- Scene (Fig. 5): one output traced back through WaveNet's dilated causal stack (behind) and a plain causal stack (in front) ----
// Structure only, filter width 2 as in the paper: 4 layers with dilations 1, 2, 4, 8 (the paper's Figure 3) against dilation 1 throughout
// (its Figure 2). Each layer is a glass plate of 16 time steps; the traced units glow, and streams run up the traced edges into the output.
// Receptive field = 1 + (filter width - 1) x sum of dilations. The step list's numbers are static spans (data-wv); check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-wave')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const NL=4,NT=16,DIL=[1,2,4,8],PLN=[1,1,1,1];
  // reach[r]: time offsets (0 = newest) of the units at depth r below the output that the output depends on
  const reach=d=>{const R=[new Set([0])];for(let l=NL-1;l>=0;l--){const s=new Set();R[R.length-1].forEach(t=>{s.add(t);s.add(t+d[l])});R.push(s)}return R};
  const RD_=reach(DIL),RP=reach(PLN),rf=d=>1+d.reduce((a,b)=>a+b,0);
  const F={d4:DIL[3],n4d:RD_[1].size,n3d:RD_[2].size,n3p:RP[2].size,n2d:RD_[3].size,n2p:RP[3].size,n1d:RD_[4].size,n1p:RP[4].size,rd:rf(DIL),rp:rf(PLN),msd:(rf(DIL)/16).toFixed(2),msp:(rf(PLN)/16).toFixed(2)};
  document.querySelectorAll('[data-wv]').forEach(e=>{if(F[e.dataset.wv]!=null)e.textContent=F[e.dataset.wv]});
  window.SQ_WAVE={F,RD:RD_,RP};
  const XS=.62,x=t=>(NT-1)/2*XS-t*XS,YL=r=>.2+(NL-r)*.5,ZD=-2.2,ZP=2.2;   // t: offset back from the newest (right); r: depth below the output (0 = output)
  function stack(R,k,e,d,RR,z,col,nm){const P=R.P,shown=Math.min(k,NL),grow=k>=1&&k<=NL?e:1;
    for(let r=0;r<=NL;r++){const y=YL(r);
      R.glass([x(NT-1)-XS*.5,y,z-.32],[NT*XS,0,0],[0,0,.64],{c:col,a:.28,nu:NT,nv:1,th:.03});
      const lit=r<shown||(r===shown&&k>=1&&k<=NL)?RR[r]:r===0?RR[0]:null,fade=r===shown&&k>=1&&k<=NL?grow:1;
      for(let t=0;t<NT;t++){const on=lit&&lit.has(t)&&(r<shown||r===0||fade>0);
        R.ball([x(t),y+.06,z],.075,{c:on?col:mix(P.paper,P.mute,.35),a:on?(r===shown&&r>0&&k<=NL?Math.max(.25,fade):1):.6});
        if(on)R.glow([x(t),y+.06,z],.22,{c:col,a:.5*(r===shown&&r>0&&k<=NL?fade:1)})}
      R.label([x(NT-1)-XS*.5,y,z],r===0?'output':r===NL?'input':'layer '+(NL-r),{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:nm});
      if(r<NL)R.label([x(0)+XS*.5,y-.31,z],'dilation '+d[NL-1-r],{al:'left',dx:8,mono:true,fs:12,c:col,a:r<shown?1:.55,wide:1})}
    // traced edges, with streams running up into the output
    for(let r=0;r<Math.min(shown,NL);r++){const dl=d[NL-1-r],a=r===shown-1&&k<=NL?grow:1;
      RR[r].forEach(t=>[t,t+dl].forEach(u=>{if(u>=NT)return;const p0=[x(u),YL(r+1)+.06,z],p1=[x(t),YL(r)+.06,z];R.line([p0,p1],{c:col,w:1.6,a:a*.8});
        if(k>=NL+1||k>=r+2)R.flow([p0,p1],{c:col,a:.85,r:.05,n:2,speed:.6})}))}
    // the receptive field: a bracket on the input plate
    if(k===NL+1){const n=rf(d),x0=x(n-1)-XS*.4,x1=x(0)+XS*.4,y=YL(NL)-.02;R.quad([[x0,y,z-.36],[x1,y,z-.36],[x1,y,z+.36],[x0,y,z+.36]],{fill:col,a:e*.35,ec:col});
}
  }
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.6,2.8,.5);
    stack(R,k,e,DIL,RD_,ZD,P.c1,'d');stack(R,k,e,PLN,RP,ZP,P.c2,'p');
    R.label([x(NT-1)-XS*.5,YL(0)+.05,ZD],'dilated · WaveNet'+(k===NL+1?' · '+rf(DIL)+' samples':''),{al:'left',dy:-22,mono:true,fs:12.5,b:1,c:P.c1});
    R.label([x(NT-1)-XS*.5,YL(0)+.05,ZP],'plain causal'+(k===NL+1?' · '+rf(PLN)+' samples':''),{al:'left',dy:-22,mono:true,fs:12.5,b:1,c:P.c2});
  }
  S3.stage({id:'stg-wave',list:'sx-wave',fig:'Fig. 5 · one output traced back through two stacks',cam:[-.22,.62],bounds:[[-5.6,0,-2.7],[6.3,2.6,2.7]],aspect:.6,dur:1400,hold:4400,draw,
    margin:w=>w<520?[14,8,12,8]:[18,14,14,70]});
})();
