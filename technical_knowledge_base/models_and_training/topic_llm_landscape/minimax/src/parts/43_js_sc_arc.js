// ---- Scene (Fig. 6, stg-arc): the three routes on one set of axes. Three groups left to right: stored per sequence (glass), bytes read by one
// decoded token (solid, streaming to the token), attention multiply-adds per decoded token (solid, lighter); in each group one column per route:
// MiniMax-01's 7:1 hybrid (green), M2 (orange), M3 (blue), M3's index-key share gold. Heights are each group's own scale (units differ), from
// stored(), readB() and compB() in 10b_js_model.js; the scale glides between steps and the camera moves to the group a step is about.
// Steps: stored, read and compute at 128K; all three at 1M (M2 beyond its window, a cut ghost); M3 with all 60 layers sparse. ----
(function(){
  if(!document.getElementById('stg-arc'))return;const {lerp,mix}=S3;
  const ROUTES=['h01','m2','m3'],OF={h01:-1.08,m2:0,m3:1.08},ROWS=['st','rd','cp'],GX={st:-3.9,rd:0,cp:3.9},W=.78,HMAX=2.4,TK=[0,.25,1.7];
  const CTX=[131072,131072,131072,1048576,1048576],ALL=[0,0,0,0,1],ACT=[['st'],['rd'],['cp'],['st','rd','cp'],['cp']];
  const f={st:stored,rd:readB,cp:compB};
  // M3's gold share: its index keys (stored, read) or index-branch multiply-adds (compute)
  const idxPart=(r,nn,all)=>{const L=all?60:57;return r==='st'?57*128*2*nn:r==='rd'?L*128*2*nn:L*4*128*nn};
  const val=(m,r,k,all)=>f[r](m,CTX[k],{all:all==null?!!ALL[k]:all});
  const fits=(m,k)=>CTX[k]<=MODELS[m].win;
  // each group's scale at step k: the tallest route that runs at this context (and, for compute, M3 as built) is drawn HMAX tall
  const sc=(r,k)=>HMAX/Math.max(...ROUTES.filter(m=>fits(m,k)).map(m=>Math.max(val(m,r,k),val(m,r,k,false))));
  const unit=r=>r==='cp'?(v=>sci(v,2)):fmtBytes;
  window.MM_ARC={CTX,ALL,val,idxPart};
  function draw(R,k,e,st){const P=R.P;R.grid(-6.2,6.2,-1.8,2.6,.5);const pk=st.pk,C={h01:P.c3,m2:P.c2,m3:P.acc};
    // a label only when its anchor is on the canvas (a zoomed view leaves the other groups outside it)
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
    ROWS.forEach(r=>{const a0=sc(r,pk),a1=sc(r,k),s=e>=1||a0===a1?a1:Math.exp(lerp(Math.log(a0),Math.log(a1),e));
      const act=ACT[k].includes(r),was=ACT[pk].includes(r),ra=act?(was||k===pk?1:.22+.78*e):(was&&pk!==k?1-.78*e:.22),gx=GX[r];
      if(act||k===3)lab([gx,0,W/2+.35],{st:'stored per sequence',rd:'read per decoded token',cp:'multiply-adds per decoded token'}[r]+' · at '+ctxLab(CTX[k]),{fs:13,b:1,dy:30,c:act?P.ink:P.mute,a:Math.max(.5,ra)});
      ROUTES.forEach(m=>{const x=gx+OF[m],c=C[m],ok=fits(m,k),hyp=k===4&&m==='m3'&&r==='cp';
        const v=val(m,r,k);let h=v*s;const cut=h>HMAX*1.2;if(cut)h=HMAX*1.2;
        const ip=m==='m3'?idxPart(r,CTX[k],ALL[k])*s:0,base=Math.max(.004,h-ip);
        if(act)lab([x,0,W/2],k===3?{h01:'01',m2:'M2',m3:'M3'}[m]:{h01:'MiniMax-01',m2:'M2',m3:'M3'}[m],{fs:12.5,b:1,dy:13,c:c,a:Math.max(.45,ra)});
        if(!ok){ // beyond the model's window: a dashed ghost, cut
          R.quad([[x-W/2,0,W/2],[x+W/2,0,W/2],[x+W/2,h,W/2],[x-W/2,h,W/2]],{fill:P.soft,fa:.25,ec:c,ea:.85,dash:[4,3],a:ra});
          if(act&&r==='cp')lab([x,h*.55,W/2],k===4?'if it ran: '+sci(v,2):'beyond its window',{fs:12,b:1,c:mix(P.c2,P.ink,.3),a:ra});return}
        if(r==='st'){R.box([x,0,0],[W,h,W],{fill:mix(P.paper,c,.5),fa:.32,ec:c,ea:.9,a:ra,shadow:ra>.5,lw:1});
          if(ip>0)R.box([x,h-ip,0],[W*.96,ip,W*.96],{fill:P.c5,fa:.6,a:ra,shadow:false,lw:.6})}
        else{R.box([x,0,0],[W,base,W],{fill:r==='rd'?c:mix(P.paper,c,.6),a:ra,lw:.8});if(ip>0)R.box([x,base,0],[W,Math.max(.004,ip),W],{fill:r==='rd'?P.c5:mix(P.paper,P.c5,.7),a:ra,shadow:false,lw:.6})}
        if(hyp){const hb=val('m3','cp',k,false)*s;R.quad([[x-W/2,0,W/2],[x+W/2,0,W/2],[x+W/2,hb,W/2],[x-W/2,hb,W/2]],{fa:0,ec:c,ea:.9,dash:[4,3],a:e});
          lab([x+W/2,hb,W/2],'as built: '+sci(val('m3','cp',k,false),2),{al:'left',dx:6,mono:true,fs:12,c:c,a:e})}
        if(cut)R.box([x,h,0],[W+.06,.05,W+.06],{fill:P.card,a:ra,shadow:false,edge:false});
        if(act)lab([x,h,W/2],(hyp?'all sparse: ':'')+unit(r)(v),{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:ra})});
    });
    // read: what the token reads streams down to it, more dots where more is read
    if(ACT[k].includes('rd')){const s=sc('rd',k),fa=k===1?e:k===3?.8:1;ROUTES.forEach(m=>{if(!fits(m,k))return;const hh=Math.min(val(m,'rd',k)*s,HMAX);
        R.flow([[GX.rd+OF[m],hh*.6,W/2+.02],[OF[m]*.4,.3,TK[2]-.3],TK],{c:C[m],a:fa,n:Math.max(2,Math.round(2+8*hh/HMAX)),r:.065,speed:1.2})});
      R.glow(TK,.3,{c:P.ink,a:.3*fa});R.ball(TK,.11,{c:P.ink,a:.85*fa});if(k!==3)lab(TK,'one decoded token',{fs:12,dy:16,c:P.mute,a:fa,wide:1})}
  }
  const grp=r=>({cam:[.3,.34],bounds:[[GX[r]-1.7,0,-.6],[GX[r]+1.7,HMAX+.3,2.1]]});
  S3.stage({id:'stg-arc',list:'sx-arc',fig:'Fig. 6 · stored, read and computed, three routes',cam:[.26,.36],bounds:[[-5.6,0,-.6],[5.6,HMAX+.7,2.1]],aspect:.56,dur:1700,hold:5400,draw,
    margin:w=>w<520?[14,8,40,8]:[20,16,44,16],
    view:k=>k===3?null:grp(ACT[k][0])});
})();
