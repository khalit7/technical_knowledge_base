// ---- Shared by the storage scenes (renderer v2): the layers a write crosses, as glass plates stacked from your program down to the stable media ----
// STL.stack(R,o): o.ys (top of each layer), o.names, o.x0,o.x1,o.z0,o.z1 (plate extent), o.a(i) alpha per layer, o.lab (x of the layer names), o.cut (draw the power-cut line), o.lost (0..1: the power cut has happened)
// The last layer is the media: a solid block on the floor. Plates are tinted: program c3, kernel memory c2, device path c6, device cache c5 (volatile).
(function(){
  if(!window.S3)return;const {mix,lerp}=S3;
  window.STL={
    stack(R,o){const P=R.P,ys=o.ys,n=ys.length,w=o.x1-o.x0,d=o.z1-o.z0,lost=o.lost||0;
      const tint=o.tint||[P.c3,P.c2,P.c6,P.c6,P.c5,P.good];
      ys.forEach((y,i)=>{const a=o.a?o.a(i):1;if(a<=.01)return;
        if(i===n-1){R.box([(o.x0+o.x1)/2,0,(o.z0+o.z1)/2],[w,y,d],{fill:mix(P.paper,P.good,.16),a,lw:1})}
        else{const above=o.cutAt!=null&&i<o.cutAt;R.glass([o.x0,y,o.z0],[w,0,0],[0,0,d],{c:above&&lost?mix(tint[i],P.bad,.5*lost):tint[i],a:a*(1-.55*(above?lost:0)),nu:o.nu||12,nv:3,th:.04})}
        if(o.names&&o.names[i]){const lx=o.lab==null?o.x0:o.lab;R.label([lx-.12,y,o.z1],o.names[i],{al:'right',dx:-6,fs:12.5,b:1,c:P.ink,a:Math.max(.35,a)});
          if(o.subs&&o.subs[i])R.label([lx-.12,y,o.z1],o.subs[i],{al:'right',dx:-6,dy:15,fs:12,c:P.mute,a:Math.max(.35,a),wide:1})}});
      if(o.cutAt!=null){const y=o.cutY;R.line([[o.x0-.1,y,o.z1+.05],[o.x1+.1,y,o.z1+.05],[o.x1+.1,y,o.z0-.05]],{c:P.bad,w:2,dash:[7,5],a:o.cutA==null?1:o.cutA});
        R.label([o.x1+.1,y,o.z1],'power-cut line',{al:'left',dx:8,fs:12,c:P.bad,b:1,a:o.cutA==null?1:o.cutA,wide:1})}},
    // a token (a 4 KiB page, a metadata change) sitting on a layer
    tok(R,p,s,c,a,o){o=o||{};R.box(p,s,{fill:c,a,lw:1.2,ec:o.ec,shadow:false,dz:o.dz==null?-3:o.dz})},
    // a vertical stream of dots from y0 down to y1 at (x,z)
    down(R,x,z,y0,y1,c,a,n){if(Math.abs(y0-y1)<.05)return;R.flow([[x,y0,z],[x,y1,z]],{c,a,r:.065,speed:1.4,n:n||Math.max(3,Math.round(Math.abs(y0-y1)*2.4))})},
    lerp
  };
})();
