// ---- Scene, Fig. 1 (the hero): where attention's bytes go, standard attention against FlashAttention (renderer v2) ----
// The idea of the paper's Figure 1 (left) with the numbers of its Figure 2 (PAPER.tables.f2: GFLOPs, HBM GB, runtime ms; GPT-2 medium attention,
// N = 1,024, d = 64, 16 heads x batch 64, forward + backward, one A100) and the sizes of §2.1. HBM is the large slab on the floor, SRAM the small
// raised one. Q, K, V, S, P and O are glass plates drawn to scale for N = 1,024 and d = 64 (rows along the depth); the slabs and the stream
// widths are schematic. Steps: #sx-hero.
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.PAPER)return;const {at,off,mix}=S3;
  const F2={};PAPER.tables.f2.rows.forEach(r=>{F2[r[0]]=[+r[1],+r[2]]});
  const GB=F2['HBM R/W (GB)'],MS=F2['Runtime (ms)'],GF=F2['GFLOPs'];
  const L=2.4,Z0=-.9,DW=L*64/1024,YT=.19,SY=2.02,SZ=-2.3;   // plate length (N), its width for d, HBM top, SRAM top, SRAM centre depth
  const X={Q:-3.9,K:-3.45,V:-3.0,S:-2.4,P:.4,O:3.3,M:3.72};
  const W={Q:DW,K:DW,V:DW,S:L,P:L,O:DW,M:.06};
  const ctr=m=>[X[m]+W[m]/2,YT+.02,Z0+L/2];
  function plate(R,m,c,a,nu,nv){R.glass([X[m],YT,Z0],[W[m],0,0],[0,0,L],{c,a,nu,nv,th:.02})}
  function ghost(R,m,c,a){R.glass([X[m],YT,Z0],[W[m],0,0],[0,0,L],{c,a,nu:1,nv:1,th:.01})}
  // a stream between an HBM plate and the chip: up for a read, down for a write; big ones (N x N) are thick
  function stream(R,m,sx,up,big,c,a){const h=ctr(m),s=[sx,SY+.02,SZ];R.flowArc(up?h:s,up?s:h,.55,{c,a,r:big?.1:.05,n:big?14:5,speed:big?1.5:1.2})}
  function draw(R,k,e){const P=R.P,col={Q:P.q,K:P.k,V:P.v,S:P.c5,P:P.c1,O:P.c3,M:P.mute};R.grid(-5,5,-3.4,2.6,.5);
    const bill=k===5,fa=k>=4;
    // the two memories
    R.box([0,0,.3],[8.8,.15,3.3],{fill:mix(P.paper,P.line,.25),a:bill?.6:1,dz:60});
    R.label([-4.3,YT,-1.25],'HBM · 40 to 80 GB · 1.5 to 2.0 TB/s',{al:'left',fs:12.5,b:1,c:P.mute,dy:-8,a:bill?0:1});
    const sa=bill?.12:1;R.box([0,1.9,SZ],[3.6,.12,1.2],{fill:mix(P.paper,P.acc,.22),shadow:false,a:sa,dz:60});
    R.label([1.85,SY,SZ],'SRAM · 192 KB per SM · ~19 TB/s',{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a:bill?0:1,wide:1});
    // inputs, always there
    const ia=bill?.25:1;['Q','K','V'].forEach(m=>{plate(R,m,col[m],ia,1,8);R.label([X[m]+W[m]/2,YT,Z0+L+.12],m,{serif:true,fs:15,b:1,c:col[m],dy:12,a:bill?0:1})});
    // S and P: empty slots at first, filled by standard attention, dashed ghosts under FlashAttention
    const sF=k===1?e:k>=2&&k<=3?1:0,pF=k===2?e:k===3?1:0,ga=fa?(k===4?e:1)*(bill?.1:.18):0;
    ['S','P'].forEach(m=>{const f=m==='S'?sF:pF,fo=k===4?1-e:0;
      if(!fa||fo>0){ghost(R,m,col[m],.12);if(f>0||fo>0)plate(R,m,col[m],.85*(fa?fo:f),8,8)}
      if(fa)ghost(R,m,col[m],ga);
      const lab=fa?m+' · N × N · never stored':m+' = '+(m==='S'?'QKᵀ':'softmax(S)')+' · N × N';
      R.label([X[m]+L/2,YT,Z0+L+.12],lab,{fs:12.5,b:1,c:col[m],dy:12,a:bill?0:fa?Math.max(.5,ga*2):(f>0?1:.45),wide:1})});
    // the output, and FlashAttention's two statistics per row
    const oa=k===3?e:k>=3?1:0;if(oa>0){plate(R,'O',col.O,oa*(bill?.35:1),1,8);R.label([X.O+DW/2,YT,Z0+L+.12],'O',{serif:true,fs:15,b:1,c:col.O,dy:12,a:bill?0:oa})}else ghost(R,'O',col.O,.15);
    const ma=k===4?e:k>4?1:0;if(ma>0){plate(R,'M',col.M,ma*(bill?.35:1),1,8);R.label([X.M,YT,Z0+L+.12],'m, ℓ',{fs:12.5,c:P.mute,dy:12,dx:14,a:bill?0:ma})}
    // the streams of each step; thick for an N x N matrix
    if(k===1){stream(R,'Q',-1.2,1,0,col.Q,1);stream(R,'K',-.6,1,0,col.K,1);stream(R,'S',.4,0,1,col.S,1)}
    if(k===2){stream(R,'S',-.8,1,1,col.S,1);stream(R,'P',.8,0,1,col.P,1)}
    if(k===3){stream(R,'P',-.4,1,1,col.P,1);stream(R,'V',-1.1,1,0,col.V,1);stream(R,'O',.9,0,0,col.O,1)}
    if(k===4){const a=e;['Q','K','V'].forEach((m,i)=>stream(R,m,-1.4+i*.45,1,0,col[m],a));stream(R,'O',1.2,0,0,col.O,a);stream(R,'M',1.4,0,0,col.M,a*.8)}
    // on chip: one block per kernel for standard attention; the fused kernel's blocks and its S, P tile for FlashAttention
    if(k>=1&&k<=3){const nm=['','S block','P block','O block'][k],c=[0,col.S,col.P,col.O][k];R.glass([-.3,SY,SZ-.3],[.6,0,0],[0,0,.6],{c,a:1,nu:4,nv:4,th:.02});
      R.label([0,SY+.05,SZ-.3],'one kernel: '+['','QKᵀ','softmax','PV'][k],{fs:12.5,b:1,c:P.ink,dy:-12})}
    if(k===4){[['Q',-1.45],['K',-1.0],['V',-.55]].forEach(([m,x])=>R.glass([x,SY,SZ-.3],[.12,0,0],[0,0,.6],{c:col[m],a:e,nu:1,nv:4,th:.02}));
      R.glass([-.15,SY,SZ-.3],[.6,0,0],[0,0,.6],{c:col.S,a:e,nu:4,nv:4,th:.02});R.glass([.6,SY,SZ-.3],[.12,0,0],[0,0,.6],{c:col.O,a:e,nu:1,nv:4,th:.02});
      R.label([0,SY+.05,SZ-.3],'one fused kernel: tiles of S and P live here',{fs:12.5,b:1,c:P.acc,dy:-16,a:e})}
    // the bill: Figure 2's printed numbers as bars on white plinths
    if(bill){const hb=(v,mx)=>1.5*v/mx,pair=(x0,vals,unit,title)=>{const mx=Math.max(...vals);
        R.box([x0+.45,YT,.5],[1.6,.06,.7],{a:e,shadow:false});
        vals.forEach((v,i)=>{const x=x0+i*.9,h=hb(v,mx)*e;R.box([x,YT+.06,.5],[.55,Math.max(.01,h),.45],{fill:i?P.acc:P.c2,a:e});
          R.label([x,YT+.06+h,.5],v+' '+unit,{fs:13,b:1,c:i?P.acc:P.c2,dy:-11,a:e});R.label([x,YT,.95],i?'Flash':'standard',{fs:12,c:P.mute,dy:12,a:e})});
        R.label([x0+.45,YT,1.25],title,{fs:12.5,b:1,c:P.ink,dy:14,a:e})};
      pair(-2.1,GB,'GB','HBM traffic');pair(.9,MS,'ms','runtime');
      R.label([0,1.95,.5],GF[0]+' → '+GF[1]+' GFLOPs: '+Math.round(100*(GF[1]/GF[0]-1))+'% more arithmetic',{fs:12.5,c:P.mute,a:e})}
  }
  const full={cam:[.1,.78],bounds:[[-4.5,0,-2.9],[4.5,2.2,2.3]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · where attention\'s bytes go, GPT-2 medium on an A100',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,8,18,8]:[22,14,24,14],
    // the last step moves in close on Figure 2's bars
    view:k=>k===5?{cam:[.12,.42],bounds:[[-2.7,0,-.3],[2.7,2.1,1.6]]}:full});
})();
