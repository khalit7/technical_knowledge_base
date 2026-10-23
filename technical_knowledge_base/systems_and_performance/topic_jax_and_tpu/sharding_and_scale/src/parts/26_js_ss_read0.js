// ---- Reading tab, part 0 (2026-10-23 rebuild): the hero's mesh, the PartitionSpec widget (section 1), the shard_map diagram (section 5).
// Everything here is derived from the definitions (a 2 x 4 mesh, fc1 [128, 512] float32); P('data','model') matches the measured
// visualize_array_sharding output (SS.debug.shard_shapes).
(function(){
  const U=SSU, esc=U.esc, $=id=>document.getElementById(id);
  if(!$('ss-hero-mesh'))return;
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
  // hero
  const hero=()=>mesh($('ss-hero-mesh'),SPECS[3],true);
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
  // shard_map diagram: global x [32, 128] -> 8 local [4, 128] -> psum -> replicated output
  function smap(){
    const el=$('ss-sm-svg'),W=U.width(el),two=W<560,per=two?4:8,gap=6,bw=(W-gap*(per-1))/per,bh=50;
    const rowsY=[74],nrow=two?2:1;if(two)rowsY.push(74+bh+gap);
    const yb=rowsY[nrow-1]+bh+14,H=yb+70;
    let s=RD.t(0,13,'x [32, 128] with in_specs=P(\'data\')',{fs:11.5,w:600});
    const sw=W/8;
    for(let k=0;k<8;k++){s+='<rect x="'+(k*sw+1)+'" y="20" width="'+(sw-2)+'" height="18" rx="2" fill="'+COL[k]+'" fill-opacity=".75"/>';
      s+=RD.t(k*sw+sw/2,33,(W<520?'':'rows ')+(4*k)+'-'+(4*k+3),{a:'middle',fs:W<520?9.5:11,fill:'var(--bg)',w:600})}
    s+=RD.t(W/2,58,'shard_map: one call of f per device, on its own block',{a:'middle',fs:11,fill:'var(--mute)'});
    for(let k=0;k<8;k++){const r=Math.floor(k/per),c=k%per,x=c*(bw+gap),y=rowsY[r];
      s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="5" fill="var(--soft)" stroke="var(--line)"/>';
      s+='<rect x="'+(x+4)+'" y="'+(y+4)+'" width="'+(bw-8)+'" height="8" rx="2" fill="'+COL[k]+'" fill-opacity=".75"/>';
      s+=RD.t(x+bw/2,y+27,'device '+k,{a:'middle',fs:11,w:600});
      s+=RD.t(x+bw/2,y+42,'f on [4, 128]',{a:'middle',fs:11})}
    s+='<rect x="0" y="'+yb+'" width="'+W+'" height="22" rx="4" fill="var(--c2)" fill-opacity=".22" stroke="var(--c2)"/>';
    s+=RD.t(W/2,yb+15,(W<520?'psum(g, \'data\'): all-reduce over 8 devices':'jax.lax.psum(g, \'data\'): an all-reduce over the 8 devices'),{a:'middle',fs:11,w:600});
    s+=RD.t(W/2,yb+44,(W<520?'out_specs=P(): same g on every device':'out_specs=P(): the same summed g on every device'),{a:'middle',fs:11});
    s+=RD.t(W/2,yb+62,(W<520?'only the psum moved bytes':'(the only bytes that moved are the ones the psum named)'),{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'shard_map splits x into 8 blocks of 4 rows, runs f per device, then a psum all-reduces the result');
  }
  function all(){hero();widget();smap()}
  RD.onRender(all);RD.onResize(all);all();
})();
