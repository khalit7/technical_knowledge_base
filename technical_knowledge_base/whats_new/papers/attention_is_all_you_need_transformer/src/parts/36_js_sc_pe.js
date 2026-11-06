// ---- Scene: sinusoidal positions as clocks. Each sine-cosine pair of dimensions is a hand turning at its own speed (§3.5) ----
(function(){
  if(!$('stg-pe'))return;const {at,lerp,mix}=S3;
  const d=512,PAIRS=[0,8,16,32,64,96,128,192],om=i=>1/Math.pow(10000,2*i/d),XC=j=>(j%4-1.5)*2.15,YCj=j=>j<4?3.35:.95,RAD=.78,YC=0;
  const wl=i=>2*Math.PI/om(i);
  function clock(R,j,pos,o){const P=R.P,i=PAIRS[j],c=[XC(j),YCj(j),0],ang=pos*om(i),pts=[];for(let s=0;s<48;s++){const t=s/48*Math.PI*2;pts.push([c[0]+RAD*Math.sin(t),c[1]+RAD*Math.cos(t),0])}
    if(!o.ghost){R.quad(pts,{fill:P.paper,a:1,dz:.4});
      for(let s=0;s<12;s++){const t=s/12*Math.PI*2;R.line([[c[0]+RAD*.86*Math.sin(t),c[1]+RAD*.86*Math.cos(t),0],[c[0]+RAD*Math.sin(t),c[1]+RAD*Math.cos(t),0]],{c:P.mute,w:1,a:.6,dz:.3})}}
    const tip=[c[0]+RAD*.9*Math.sin(ang),c[1]+RAD*.9*Math.cos(ang),0];
    R.line([c,tip],{c:o.c||P.c2,w:o.w||3,a:o.a==null?1:o.a,top:1});R.ball(tip,.06,{c:o.c||P.c2,a:o.a==null?1:o.a,top:1});return ang}
  function draw(R,k,e){const P=R.P,nar=R.W<620;
    let pos=0;if(k===1)pos=6*e;else if(k===2)pos=lerp(6,50,e);else if(k===3)pos=10;else if(k===4)pos=40;
    PAIRS.forEach((i,j)=>{clock(R,j,pos,{});
      R.label([XC(j),YCj(j)+RAD,0],'dims '+(2*i)+', '+(2*i+1),{mono:true,fs:12,dy:-12,c:P.mute,wide:1});
      const w=wl(i);R.label([XC(j),YCj(j)-RAD,0],w<100?'λ '+w.toFixed(1):'λ '+fmt(Math.round(w)),{mono:true,fs:12,dy:12,c:P.mute})});
    R.label([XC(0)-RAD,YCj(0)+RAD+.45,0],k===4?'pos 40 → 45':k===3?'pos 10 → 15':'pos '+(k===0?0:Math.round(pos)),{al:'left',mono:true,fs:13,b:1,c:P.c2});
    // an offset is a fixed turn: from pos to pos + 5 each hand turns by 5·ω, whatever pos is
    if(k>=3){const a=k===3?e:1,K=5;PAIRS.forEach((i,j)=>{clock(R,j,pos+K*a,{ghost:1,c:P.c1,w:2.4,a});
        const a0=pos*om(i),a1=(pos+K*a)*om(i),c=[XC(j),YCj(j),0],pts=[c];const m=24;for(let s=0;s<=m;s++){const t=lerp(a0,a1,s/m);pts.push([c[0]+RAD*.55*Math.sin(t),c[1]+RAD*.55*Math.cos(t),0])}
        if(Math.abs(a1-a0)>.02)R.quad(pts,{fill:P.c1,fa:.25,ec:P.c1,a,top:1})});
      R.label([XC(3)+RAD,YCj(3)+RAD+.45,0],'orange: pos '+pos+' · blue: pos '+(pos+K),{al:'right',mono:true,fs:12.5,c:P.c1,a,wide:1})}
  }
  S3.stage({id:'stg-pe',list:'sx-pe',fig:'Fig. 6 · eight of the 256 clocks of d_model = 512',cam:[.18,.18],bounds:[[-4.3,-.1,-.6],[4.3,4.7,.6]],aspect:.62,draw,dur:2200,hold:2400});
})();
