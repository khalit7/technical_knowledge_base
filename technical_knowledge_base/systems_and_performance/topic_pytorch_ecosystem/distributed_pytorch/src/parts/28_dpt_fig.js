// ---- Reading figures added 2026-10-23, static: c10d, composed shards, flight-recorder mismatch. Every number is read from window.DPT (recorded data).
// (2026-11-12: the hero, DDP bucket stepper, FSDP2 step, DTensor placements and DCP files became the 3D stages in 4x_js_sc_*.js.) ----
(function(){
  const D=window.DPT,U=window.DU,$=U.$,T=RD.t,comma=U.comma;
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" rx="'+(o.rx==null?3:o.rx)+'"'+
    (o.cls?' class="'+o.cls+'"':'')+(o.fill?' fill="'+o.fill+'"':'')+(o.stroke?' stroke="'+o.stroke+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+(o.sw?' stroke-width="'+o.sw+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#dpt-ar)"':'')+'/>'};
  const defs='<defs><marker id="dpt-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--mute)"/></marker></defs>';
  const MB=b=>(b/1e6).toFixed(2)+' MB';

  // ---- c10d: launch, store, mesh groups ----
  function c10d(){
    const el=$('dpt-c10d');if(!el)return;const w=U.W(el),two=w>=620,pw=two?(w-16)/2:w,ph=200;
    const env=D.c10d.env,mesh=D.c10d.mesh[1].mesh;
    // panel A
    let a='';const bw=Math.min(96,(pw-24)/4),gx=(pw-4*bw)/5;
    a+=rect(pw/2-80,4,160,30,{cls:'bxa'})+T(pw/2,18,'torchrun agent',{a:'middle',w:600})+T(pw/2,30,'--nproc_per_node 4',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let r=0;r<4;r++){const x=gx+r*(bw+gx);a+=line(pw/2,34,x+bw/2,70,{arrow:1})+rect(x,72,bw,50,{cls:'bx'})+T(x+bw/2,88,'rank '+r,{a:'middle',w:600})+T(x+bw/2,102,'RANK='+r,{a:'middle',fs:11,fill:'var(--mute)'})+T(x+bw/2,115,bw>=92?'WORLD_SIZE='+env.WORLD_SIZE:'of '+env.WORLD_SIZE,{a:'middle',fs:11,fill:'var(--mute)'});
      a+=line(x+bw/2,122,pw/2,158,{c:'var(--acc)',dash:'3 2'})}
    a+=rect(pw/2-92,158,184,34,{cls:'bxa'})+T(pw/2,172,'TCPStore',{a:'middle',w:600})+T(pw/2,186,'MASTER_ADDR:'+env.MASTER_PORT,{a:'middle',fs:11,fill:'var(--mute)'});
    a+=T(4,62,'spawn, env',{fs:11,fill:'var(--mute)'})+T(4,146,'rendezvous',{fs:11,fill:'var(--acc)'});
    // panel B
    let b='';const cs=Math.min(64,(pw-120)/2),ox=(pw-2*cs-16)/2,oy=44;
    b+=T(pw/2,16,'init_device_mesh("cpu", (2, 2))',{a:'middle',fs:11,w:600})+T(pw/2,30,'mesh_dim_names=("dp", "tp")',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let i=0;i<2;i++){b+=rect(ox-8,oy+i*(cs+16)-6,2*cs+32,cs+12,{fill:'none',stroke:'var(--c4)',dash:'4 3',rx:8})}
    for(let j=0;j<2;j++){b+=rect(ox+j*(cs+16)-4,oy-10,cs+8,2*cs+36,{fill:'none',stroke:'var(--c3)',dash:'2 3',rx:8})}
    mesh.forEach((row,i)=>row.forEach((rk,j)=>{const x=ox+j*(cs+16),y=oy+i*(cs+16);b+=rect(x,y,cs,cs,{cls:rk===1?'bxa':'bx'})+T(x+cs/2,y+cs/2+4,'rank '+rk,{a:'middle',w:600})}));
    b+=T(ox+2*cs+30,oy+cs/2,'tp {0, 1}',{fs:11,fill:'var(--c4)'})+T(ox+2*cs+30,oy+cs+16+cs/2,'tp {2, 3}',{fs:11,fill:'var(--c4)'});
    b+=T(ox+cs/2,oy+2*cs+44,'dp {0, 2}',{a:'middle',fs:11,fill:'var(--c3)'})+T(ox+cs+16+cs/2,oy+2*cs+44,'dp {1, 3}',{a:'middle',fs:11,fill:'var(--c3)'});
    const ph2=oy+2*cs+52;
    el.innerHTML='<div class="rd-two"><div>'+RD.svg(pw,ph,defs+a,'torchrun spawns four workers that meet at a TCPStore')+'</div><div>'+RD.svg(pw,ph2,b,'A 2 by 2 device mesh: rows are tp groups, columns dp groups')+'</div></div>';
  }

  // ---- composed shards of one weight, to scale ----
  function c3s(){
    const el=$('dpt-c3s');if(!el)return;const w=U.W(el);const pq=D.c3[0].params.find(p=>p[0]==='blocks.0.mlp.fc.weight');
    const full=pq[1],loc=pq[2],tp=[full[0]/2,full[1]];const H=Math.min(170,w*0.4),k=H/full[0];
    const shapes=[[full,'model','var(--c1)'],[tp,'after ColwiseParallel (tp)','var(--c4)'],[loc,'after fully_shard (dp)','var(--c3)']];
    const col=w/3;let s=defs;
    shapes.forEach(([sh,lab,c],i)=>{const ww=sh[1]*k,hh=sh[0]*k,cx=col*i+col/2,x=cx-ww/2;s+=rect(x,6,ww,hh,{fill:c,stroke:'var(--line)',op:0.55,rx:2})+T(cx,H+24,'['+sh.join(', ')+']',{a:'middle',w:600});
      const lb=lab.split(' (');s+=T(cx,H+38,lb[0],{a:'middle',fs:11,fill:'var(--mute)'})+(lb[1]?T(cx,H+51,'('+lb[1],{a:'middle',fs:11,fill:'var(--mute)'}):'');
      if(i<2)s+=line(cx+ww/2+6,6+H/4,col*(i+1)+col/2-(shapes[i+1][0][1]*k)/2-6,6+H/4,{arrow:1})});
    el.innerHTML=RD.svg(w,H+58,s,'One weight cut by tensor parallel, then by FSDP, to scale');
  }

  // ---- flight recorder: the first disagreeing sequence number ----
  function fr(){
    const el=$('dpt-frfig');if(!el)return;const w=U.W(el),L=58,bw=(w-L-6*3)/4,bh=28;let s='';
    s+=T(L,12,'collective sequence number',{fs:11,fill:'var(--mute)'});
    [1,2,3,4].forEach(q=>{s+=T(L+(q-1)*(bw+6)+bw/2,28,String(q),{a:'middle',w:600})});
    [0,1].forEach(r=>{const y=36+r*(bh+8);s+=T(0,y+18,'rank '+r,{fill:'var(--mute)'});
      [1,2,3,4].forEach(q=>{const x=L+(q-1)*(bw+6);const bad=q===4,nm=bad?(r===0?'all_reduce':'barrier'):'all_reduce';
        s+=rect(x,y,bw,bh,{fill:bad?'var(--bad)':'var(--good)',op:bad?.22:.16,stroke:bad?'var(--bad)':'var(--good)'})+T(x+bw/2,y+18,nm,{a:'middle',fs:bw<70?10:11,w:bad?600:400})})});
    const y=36+2*(bh+8);s+=T(L+3*(bw+6)+bw,y+12,'first mismatch',{a:'end',fs:11,fill:'var(--bad)',w:600});
    el.innerHTML=RD.svg(w,y+18,s,'Two ranks agree on collectives 1 to 3 and disagree at 4');
  }

  function all(){c10d();c3s();fr()}
  RD.onRender(all);RD.onResize(all);all();
})();
