// ---- Scenes, sections 2 and 6: a paged KV cache as a pool of 16-token blocks, with every running request's block table in front of it.
// Data: BKD.scn.pool and BKD.scn.pre, snapshots of this page's simulator (src/sched/gen_scenes.py: vLLM's block pool, prefix caching,
// optimistic admission and newest-first recompute preemption, as checked against vLLM v0.31.0). Each block is drawn as a 16-slot box
// filled to the tokens it holds; a block shared by several requests is gold; a freed block that keeps its hash is grey (cached, free).
// The request lengths are illustrative; every allocation, hit and preemption is the simulator's. ----
(function(){
  if(!window.BKD||!BKD.scn)return;const {at,off,lerp,mix,rgb}=S3;
  const TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'];
  const PX=.9,BW=.72,BH=.62,TX=.6;
  function make(id,list,D,o){
    if(!document.getElementById(id))return;
    const N=D.n,BS=D.bs,cols=10,rows=Math.ceil(N/cols),X0=-(cols-1)*PX/2,ZB=-.6-rows*PX,bx=b=>X0+(b%cols)*PX,bz=b=>ZB+Math.floor(b/cols)*PX+PX/2;
    const ZT=.25,tz=i=>ZT+i*.62,tx=j=>X0-.3+j*TX;
    function blocks(R,s,a,focus,nolab){const P=R.P,owner={},pos={};
      Object.entries(s.tab).forEach(([q,t])=>t.forEach((b,j)=>{if(s.ref[b]>1){owner[b]='s'}else owner[b]=+q;pos[b]=[+q,j]}));
      for(let b=0;b<N;b++){const x=bx(b),z=bz(b),ow=owner[b];
        if(ow===undefined){
          if(s.key[b]){R.box([x,0,z],[BW,BH*.5,BW],{fill:mix(P.paper,P.mute,.35),a:a*.8,lw:.5,fa:.9});continue}
          R.quad([[x-BW/2,.004,z-BW/2],[x+BW/2,.004,z-BW/2],[x+BW/2,.004,z+BW/2],[x-BW/2,.004,z+BW/2]],{fill:mix(P.card,P.ink,.04),ec:P.line,a:a*.9,dz:300});continue}
        const q=pos[b][0],j=pos[b][1],fill=ow==='s'?BS:Math.max(0,Math.min(BS,s.nc[q]-j*BS)),c=ow==='s'?P.c5:rgb(TAB[q%8]),dim=focus!=null&&ow!=='s'&&q!==focus?.35:1;
        R.box([x,0,z],[BW,BH,BW],{fill:mix(P.paper,c,.12),fa:.25,a:a*dim,lw:.5,shadow:false});
        if(fill>0)R.box([x,0,z],[BW*.86,BH*fill/BS,BW*.86],{fill:mix(P.paper,c,.75),a:a*dim,lw:.6});
        if(ow==='s'&&!nolab)R.label([x,BH,z],'×'+s.ref[b],{dy:-9,fs:12,b:1,c:P.c5,a})}}
    function tables(R,s,a,focus,flows){const P=R.P;const ids=Object.keys(s.tab).map(Number).sort((u,v)=>u-v);
      ids.forEach((q,i)=>{const t=s.tab[q],c=rgb(TAB[q%8]),on=focus==null||focus===q,aa=a*(on?1:.3);
        R.label([tx(0)-.35,0,tz(i)],'R'+(q+1)+' table',{al:'right',dx:-4,fs:12.5,b:1,c,a:aa,wide:1});
        t.forEach((b,j)=>{const p=[tx(j),0,tz(i)],sh=s.ref[b]>1;
          R.box(p,[TX*.82,.1,.42],{fill:mix(P.paper,sh?P.c5:c,.55),a:aa,lw:.6});
          if(on&&R.W>=520)R.label([p[0],.1,p[2]],String(b),{fs:12,mono:true,c:P.ink,a:aa});
          if(on){R.arc([p[0],.1,p[2]-.2],[bx(b),BH*.5,bz(b)+BW/2],.35,{c:sh?P.c5:c,w:1,a:aa*.45});
            if(flows)R.flowArc([p[0],.1,p[2]-.2],[bx(b),BH*.5,bz(b)+BW/2],.35,{c:sh?P.c5:c,r:.045,n:4,speed:1.2,a:aa})}})})}
    function queue(R,s,a,pre){const P=R.P,xq=X0-1.6;
      R.label([xq,0,ZB+.35],'waiting',{dy:-16,fs:12.5,b:1,c:P.mute,a});
      s.wait.forEach((q,i)=>{const z=ZB+.9+i*.7,c=rgb(TAB[q%8]),p=pre.includes(q);
        R.box([xq,0,z],[.6,.32,.5],{fill:mix(P.paper,c,.7),ec:p?P.bad:null,lw:p?2:.6,a});R.label([xq-.3,.16,z],'R'+(q+1)+(p?' preempted':''),{al:'right',dx:-6,fs:12,b:1,c:p?P.bad:P.ink,a})})}
    function draw(R,k,e){const P=R.P,s=D.snaps[k],ps=k?D.snaps[k-1]:null;R.grid(-6.5,6,-5,4.6,.5);
      const XR=X0+(cols-1)*PX+PX/2;R.label([XR,0,ZB+PX*.5],'block pool',{al:'left',dx:10,fs:12.5,b:1,c:P.mute,grp:'side'});R.label([XR,0,ZB+PX*1.1],N+' blocks × '+BS+' tokens',{al:'left',dx:10,fs:12,c:P.mute,grp:'side'});
      // the previous snapshot fades out while this one fades in, so a block that changed hands is visible as a change
      if(ps&&e<1)blocks(R,ps,1-e,o.focus(k-1),true);
      blocks(R,s,e,o.focus(k));tables(R,s,e,o.focus(k),true);
      if(o.queue)queue(R,s,e,s.pre);
      // a preempted request: its blocks stream back out of the pool to the queue
      if(s.pre.length&&ps)s.pre.forEach(q=>{const t=ps.tab[q]||[];t.forEach(b=>R.flowArc([bx(b),BH,bz(b)],[X0-1.6,.3,ZB+.4],.8,{c:P.bad,r:.05,n:4,speed:1.5,a:.9}))});
      const used=s.used;R.label([XR,0,ZB+PX*1.7],used+' of '+N+' held',{al:'left',dx:10,fs:12.5,b:1,c:used>=N?P.bad:P.ink,grp:'side'})}
    const nt=Math.max(...D.snaps.map(s=>Object.keys(s.tab).length));
    const full={cam:[.08,.95],bounds:[[X0-(o.queue?3.4:1.4),0,ZB-.3],[X0+cols*PX+2.2,.8,tz(nt-1)+.4]]};
    const st=S3.stage({id,list,fig:o.fig,cam:full.cam,bounds:full.bounds,aspect:o.aspect,dur:1500,hold:5200,draw,margin:w=>w<520?[18,10,12,10]:[26,18,16,18]});
    (window.BKSTG=window.BKSTG||{})[id]=st}
  // section 2: four requests sharing a 32-token system prompt; R4 is R1's next turn
  make('stg-pool','sx-pool',BKD.scn.pool,{fig:'Fig. 3 · block tables over one block pool',aspect:.58,focus:k=>[0,1,2,null,null,3][k]});
  // section 6: five requests into 30 blocks; nothing is reserved for answers, so the pool fills and the newest is preempted
  make('stg-pre','sx-pre',BKD.scn.pre,{fig:'Fig. 5 · admission and preemption in a full pool',aspect:.56,queue:true,focus:k=>{const r=BKD.scn.pre.snaps[k].rows;return r.length?r[r.length-1][0]:null}});
})();
