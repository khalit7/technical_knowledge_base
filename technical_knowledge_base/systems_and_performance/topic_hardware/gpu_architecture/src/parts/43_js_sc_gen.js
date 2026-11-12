// ---- Scene, Fig. 3 (section 9): six chips drawn to their published counts, one per step, then all six with two bars each.
// SMs per GPC and per die from window.GA_PLAN (29_js_rd_floor.js: which SMs are off, and the B200 / B300 split per die, are illustrative and
// said so on the page), stacks and controllers from window.GA_PLAN mem, names and counts from window.GA.chips, dense BF16 from window.GA.peak.
// The last step's bars are derived: BF16 TFLOPS and TB/s, each divided by the A100's (312 TFLOPS, 2.039 TB/s). Not to silicon area.
// Steps are explained by #sx-gen on the left. ----
(function(){
  if(!document.getElementById('stg-gen')||!window.GA||!window.GA_PLAN)return;const {at,off,mix}=S3;
  const G=window.GA,PL=window.GA_PLAN,C=id=>G.chips.find(c=>c.id===id);
  const PK={a100:'A100',h100:'H100 SXM',rtx5090:'RTX 5090',b200:'B200 (HGX)',b300:'B300 (HGX)',rubin:'Rubin'};
  const ORD=['a100','h100','rtx5090','b200','b300','rubin'],POS={a100:[-6.4,3.1],h100:[0,3.1],rtx5090:[6.4,3.1],b200:[-6.9,-3.4],b300:[0,-3.4],rubin:[6.9,-3.4]};
  const base={bf:G.peak[PK.a100].bf16,bw:C('a100').tbs};
  // lay out every chip once: dies, GPC frames, SM cells
  const LAY={};ORD.forEach(id=>{const P=PL[id],nd=P.dies.length,dw=nd>1?2.3:3.1,dd=nd>1?2.9:2.6,gap=.32,out={dies:[],sms:[],gpcs:[],on:0,full:0};
    P.dies.forEach((d,di)=>{const x0=(di-(nd-1)/2)*(dw+gap)-dw/2,z0=-dd/2,l2=.32,half=(dd-l2-.12)/2;out.dies.push([x0,z0,dw,dd,l2]);
      if(d.flat){const n=d.flat,cols=14,rows=Math.ceil(n/cols),rh=Math.ceil(rows/2),cw=(dw-.16)/cols,ch=(half-.06)/rh;
        for(let s=0;s<n;s++){const r=Math.floor(s/cols),c=s%cols,zz=r<rh?z0+.06+(r+.5)*ch:z0+.06+half+l2+(r-rh+.5)*ch;out.sms.push([x0+.08+(c+.5)*cw,zz,cw*.8,ch*.8,1])}out.on+=n;out.full+=n}
      else{const ng=d.gpcs.length,per=Math.ceil(ng/2),gw=(dw-.08)/per;
        d.gpcs.forEach((gp,k)=>{const row=k<per?0:1,gx=x0+.04+(k%per)*gw,gz=row?z0+.06+half+l2:z0+.06,ih=half-.12,iw=gw-.1,cols=Math.ceil(Math.sqrt(gp[0]*iw/ih)),rows=Math.ceil(gp[0]/cols),cs=Math.min(iw/cols,ih/rows);
          out.gpcs.push([gx+.02,gz,gw-.04,half-.04,gp[1]===0]);
          for(let s=0;s<gp[0];s++){const on=s<gp[1];out.sms.push([gx+.05+(s%cols+.5)*cs,gz+.05+(Math.floor(s/cols)+.5)*cs,cs*.78,cs*.78,on?1:0]);out.full++;if(on)out.on++}})}});
    out.dw=dw;out.dd=dd;out.nd=nd;out.span=nd*dw+(nd-1)*gap;LAY[id]=out});
  window.GA_GEN=Object.fromEntries(ORD.map(id=>[id,{on:LAY[id].on,full:LAY[id].full,bf:+(G.peak[PK[id]].bf16/base.bf).toFixed(2),bw:+(C(id).tbs/base.bw).toFixed(2)}])); // checked by check/check_stages.mjs
  function chip(R,id,a,focus,k,e){const P=R.P,L=LAY[id],M=PL[id].mem,[cx,cz]=POS[id],ph=a>.6&&focus;
    const sx=L.span/2+(M.kind==='hbm'?.75:.25);
    R.box([cx,0,cz],[2*sx,.04,L.dd+.5],{fill:mix(P.paper,P.ink,.04),a,dz:100});
    L.dies.forEach(([x0,z0,dw,dd,l2])=>{R.box([cx+x0+dw/2,.04,cz],[dw,.07,dd],{fill:mix(P.paper,P.ink,.07),a,dz:90,shadow:false});
      R.quad([[cx+x0+.05,.115,cz+z0+(dd-l2)/2],[cx+x0+dw-.05,.115,cz+z0+(dd-l2)/2],[cx+x0+dw-.05,.115,cz+z0+(dd+l2)/2],[cx+x0+.05,.115,cz+z0+(dd+l2)/2]],{fill:mix(P.paper,P.c4,.45),edge:false,a,dz:50})});
    L.gpcs.forEach(([x,z,w,d,off])=>R.quad([[cx+x,.116,cz+z],[cx+x+w,.116,cz+z],[cx+x+w,.116,cz+z+d],[cx+x,.116,cz+z+d]],{ec:off?P.mute:P.c3,a:a*.7,lw:.8,dz:40,dash:off?[3,2]:null}));
    L.sms.forEach(([x,z,w,d,on])=>{const fill=on?mix(P.paper,P.c3,.6):P.line;
      if(ph)R.box([cx+x,.115,cz+z],[w,on?.09:.02,d],{fill,a,shadow:false,lw:.4});
      else R.quad([[cx+x-w/2,.118,cz+z-d/2],[cx+x+w/2,.118,cz+z-d/2],[cx+x+w/2,.118,cz+z+d/2],[cx+x-w/2,.118,cz+z+d/2]],{fill,edge:false,a,dz:30})});
    // memory: HBM sites on the two long sides, or GDDR7 controllers along the die's edge
    if(M.kind==='hbm'){const per=M.sites/2;for(let i=0;i<M.sites;i++){const s=i<per?-1:1,j=i%per,z=cz+(j-(per-1)/2)*(L.dd/per),x=cx+s*(L.span/2+.42),on=i<M.on,hd=L.dd/per*.82;
        if(on)R.box([x,0,z],[.55,.42,hd],{fill:mix(P.paper,P.c2,.55),a});else R.quad([[x-.27,.01,z-hd/2],[x+.27,.01,z-hd/2],[x+.27,.01,z+hd/2],[x-.27,.01,z+hd/2]],{ec:P.mute,dash:[4,3],a:a*.9})}
      if(focus&&a>.6)[-1,1].forEach(s=>R.flow([[cx+s*(L.span/2+.42),.45,cz],[cx+s*(L.span/2-.3),.2,cz]],{c:P.c2,a:a*e,r:.06,n:4,speed:.9}))}
    else if(M.kind==='gddr'){const n=M.n/2;for(let i=0;i<M.n;i++){const top=i<n,x=cx-L.span/2+(i%n+.5)*(L.span/n),z=cz+(top?-1:1)*(L.dd/2+.12);R.box([x,.04,z],[.22,.08,.14],{fill:mix(P.paper,P.c2,.65),a,shadow:false})}}
    // two dies: the die-to-die link
    if(L.nd>1){R.box([cx,.04,cz],[.3,.06,L.dd*.7],{fill:mix(P.paper,P.acc,.5),a,shadow:false,dz:20});if(focus&&a>.6)R.flow([[cx-.6,.2,cz-.5],[cx+.6,.2,cz+.5]],{c:P.acc,a:a*e,r:.06,n:5,speed:1.2})}
  }
  const lab=(R,p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
  function draw(R,k,e){const P=R.P;R.grid(-10.5,10.5,-6.2,5.8,.5);
    ORD.forEach((id,i)=>{const a=k===6?(.55+.45*0):(i===k?1:i<k?.28:.14);chip(R,id,k===6?.55:a,i===k,k,e)});
    if(k<6){const id=ORD[k],c=C(id),L=LAY[id],[cx,cz]=POS[id];
      lab(R,[cx,.1,cz+L.dd/2+.35],c.name+' · '+(c.sm_full?L.on+' of '+L.full+' SMs':L.on+' SMs'),{dy:16,b:1,a:e});
      if(id==='b200')lab(R,[cx,.1,cz-L.dd*.35],'NV-HBI · 10 TB/s',{dy:-14,b:1,c:P.acc,a:e});
      if(id==='rtx5090')lab(R,[cx,.1,cz-L.dd/2-.15],'16 GDDR7 controllers',{dy:-14,c:P.c2,a:e});
      if(id==='rubin')lab(R,[cx,.1,cz-L.dd/2-.1],'HBM4 · stacks not stated',{dy:-14,c:P.c2,a:e});
      if(id==='a100'||id==='h100')lab(R,[cx+L.span/2+.42,0,cz+L.dd/3],'unused site',{dy:18,fs:12,c:P.mute,a:e})}
    else{ORD.forEach(id=>{const g=window.GA_GEN[id],[cx,cz]=POS[id],h1=g.bf*.3*e,h2=g.bw*.3*e,L=LAY[id];
        R.box([cx-.55,.04,cz],[.7,Math.max(.02,h1),.7],{fill:P.acc});R.box([cx+.55,.04,cz],[.7,Math.max(.02,h2),.7],{fill:mix(P.paper,P.c2,.75)});
        lab(R,[cx-.55,h1+.04,cz],g.bf.toFixed(g.bf<1?2:1)+'×',{dy:-11,dx:-14,al:'right',b:1,c:P.acc,fs:12,a:e>.85?1:0});lab(R,[cx+.55,h2+.04,cz],g.bw.toFixed(g.bw<1?2:1)+'×',{dy:-11,dx:14,al:'left',b:1,c:P.c2,fs:12,a:e>.85?1:0});
        lab(R,[cx,.04,cz+L.dd/2+.3],R.W<520?C(id).name.split(' ')[0]:C(id).name,{dy:14,fs:12,c:P.ink})});
      lab(R,[-9.6,.1,0],'BF16 dense',{b:1,c:P.acc,al:'left',wide:1});lab(R,[-9.6,.1,.75],'bandwidth (both × A100)',{b:1,c:P.c2,al:'left',wide:1})}
  }
  const full={cam:[.05,.98],bounds:[[-10,0,-5.4],[10,2.2,5]]};
  const st=S3.stage({id:'stg-gen',list:'sx-gen',fig:'Fig. 3 · six chips, drawn to their counts',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:5000,draw,
    view:k=>{if(k===6)return full;const id=ORD[k],[cx,cz]=POS[id],w=LAY[id].span/2+1.1;return {cam:[.1,.9],bounds:[[cx-w,0,cz-2.1],[cx+w,.5,cz+2.1]]}},
    margin:w=>w<520?[16,10,16,10]:[26,24,26,24]});
  (window.GASTG=window.GASTG||{})['stg-gen']=st;
})();
