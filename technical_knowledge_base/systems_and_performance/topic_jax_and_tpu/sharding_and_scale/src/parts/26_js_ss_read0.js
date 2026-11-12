// ---- Reading tab, part 0: the PartitionSpec widget (section 1). The hero and the shard_map figure are 3D stages since 2026-11-12 (41_js_sc_hero.js, 43_js_sc_smap.js).
// Everything here is derived from the definitions (a 2 x 4 mesh, fc1 [128, 512] float32); P('data','model') matches the measured
// visualize_array_sharding output (SS.debug.shard_shapes).
(function(){
  const U=SSU, esc=U.esc, $=id=>document.getElementById(id);
  if(!$('ss-spec-svg'))return;
  const AX={data:2,model:4}, ROWS=128, COLS=512, BYTES=ROWS*COLS*4;
  const SPECS=[
    {t:"P()",r:[],c:[],note:'Replicated: all 8 devices hold the whole weight. Data parallelism keeps weights like this.'},
    {t:"P('data', None)",r:['data'],c:[],note:'Rows split over <code>data</code>: the 4 devices of each <code>data</code> row hold the same half. FSDP on a 1-D mesh is this split, over all 8 devices.'},
    {t:"P(None, 'model')",r:[],c:['model'],note:'Columns split over <code>model</code>, copied over <code>data</code>: each block lives on 2 devices. Megatron\'s column-parallel weight.'},
    {t:"P('data', 'model')",r:['data'],c:['model'],note:'Both dimensions split: every element lives on exactly one device, (64, 128) each, as <code>visualize_array_sharding</code> printed for this weight here (<span class="meas">measured</span>). The FSDP x tensor layout of section 6.'},
    {t:"P('model', 'data')",r:['model'],c:['data'],note:'The same two axes the other way round: rows split 4 ways, columns 2 ways, (32, 256) each. Same memory, different blocks, so a different set of collectives wherever this weight meets an activation.'},
    {t:"P(None, ('data', 'model'))",r:[],c:['data','model'],note:'One dimension split over both axes, <code>data</code> major: device (d, m) holds column block 4d + m of 8, (128, 64) each.'}];
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--acc)','var(--bad)'];
  const parts=a=>a.reduce((p,x)=>p*AX[x],1);
  const idx=(a,d,m)=>a.reduce((v,x)=>v*AX[x]+(x==='data'?d:m),0);
  // draw the 2 x 4 mesh; in each device a mini [128, 512] matrix with the block it holds filled
  function mesh(el,sp,small){
    const W=U.width(el),lab=small?44:58,top=small?16:18,gap=4,bw=Math.min(small?120:150,(W-lab-gap*4)/4),mw=bw-12,mh=Math.max(14,mw/4),bh=mh+(small?34:38);
    const kr=parts(sp.r),kc=parts(sp.c);
    let s='';
    for(let m=0;m<4;m++)s+=RD.t(lab+m*(bw+gap)+bw/2,top-5,'model '+m,{a:'middle',fs:11,fill:'var(--c2)'});
    for(let d=0;d<2;d++){const y=top+d*(bh+gap);
      s+=RD.t(lab-6,y+bh/2+4,'data '+d,{a:'end',fs:11,fill:'var(--c1)'});
      for(let m=0;m<4;m++){const x=lab+m*(bw+gap),dev=d*4+m,ri=idx(sp.r,d,m),ci=idx(sp.c,d,m),blk=ri*kc+ci;
        s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="6" fill="var(--soft)" stroke="var(--line)"/>';
        s+=RD.t(x+6,y+13,(bw<90?'dev ':'device ')+dev,{fs:11,w:600});
        const mx=x+6,my=y+18;
        s+='<rect x="'+mx+'" y="'+my+'" width="'+mw+'" height="'+mh+'" fill="var(--bg)" stroke="var(--mute)" stroke-width=".8"/>';
        s+='<rect x="'+(mx+ci*mw/kc)+'" y="'+(my+ri*mh/kr)+'" width="'+(mw/kc)+'" height="'+(mh/kr)+'" fill="'+COL[blk%8]+'" fill-opacity=".8"/>';
        s+=RD.t(x+bw/2,y+bh-6,'('+ROWS/kr+', '+COLS/kc+')',{a:'middle',fs:11})}}
    el.innerHTML=RD.svg(lab+4*(bw+gap),top+2*(bh+gap),s,'A 2 by 4 mesh of devices; each holds the block of the 128 by 512 weight that '+sp.t+' assigns it');
  }
  // widget
  let cur=3;
  function widget(){
    const sp=SPECS[cur],kr=parts(sp.r),kc=parts(sp.c),copies=8/(kr*kc);
    mesh($('ss-spec-svg'),sp,false);
    $('ss-spec-cnt').innerHTML=RD.stat('per device','('+ROWS/kr+', '+COLS/kc+')',U.num(BYTES/(kr*kc))+' bytes')+
      RD.stat('copies of each element',copies,copies>1?'over the axes the spec does not name':'every element on one device')+
      RD.stat('bytes over all 8 devices',U.num(BYTES*copies),'weight alone: '+U.num(BYTES));
    $('ss-spec-note').innerHTML='<b>'+esc(sp.t)+'.</b> '+sp.note+' <span class="der">derived</span> from the spec and the mesh (data 2, model 4).';
  }
  U.seg($('ss-spec-seg'),v=>{cur=+v;widget()});
  function all(){widget()}
  RD.onRender(all);RD.onResize(all);all();
})();
