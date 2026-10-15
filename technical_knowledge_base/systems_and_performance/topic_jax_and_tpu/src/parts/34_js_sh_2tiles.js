// ---- Sharding lab, section 1: the same weight matrix before and after sharding on the 2 x 4 mesh ----
(function(){
  const S=window.SH,D=S.D,$=S.$;if(!D||!$('sh-tile-svg'))return;
  const T=D.pg.w_tiles,MESH=D.pg.mesh,SH=D.pg.w_shape;   // [128, 512]
  const specs=["P()","P(None, 'model')","P('model', None)","P('data', None)","P(None, 'data')","P('data', 'model')"];
  let spec="P(None, 'model')",lay=null;
  const hue=i=>'hsl('+[210,25,140,275,45,180,330,95][i%8]+',55%,52%)';
  const host=$('sh-tile-svg');
  function blocks(){const t=T[spec],keys={},list=[];
    for(let d=0;d<8;d++){const b=t[d],k=b.join(',');if(!(k in keys)){keys[k]=list.length;list.push(b)}}
    return {t,keys,list}}
  function build(){
    const W=S.width(host),wide=W>=600,B=blocks();
    const mw=wide?Math.min(360,W*0.42):Math.min(W-10,420),s=mw/SH[1],mh=SH[0]*s;
    const mx=5,my=22;
    const gx=wide?mw+40:5,gy=wide?14:my+mh+34;
    const gw=(wide?W-gx-5:W-10),bw=(gw-3*8)/4,bh=Math.max(54,bw*0.55);
    const H=gy+2*bh+8+20;
    let body=S.tx(mx,14,'blocks.0.mlp.fc1.w [128, 512]',{fs:11.5,w:600});
    body+='<rect x="'+mx+'" y="'+my+'" width="'+mw+'" height="'+mh+'" fill="var(--soft)" stroke="var(--mute)"/>';
    body+='<g id="sh-tile-cuts"></g>';
    body+=S.tx(gx,gy-4,'mesh (2, 4): rows = data, columns = model',{fs:11,fill:'var(--mute)'});
    for(let r=0;r<2;r++)for(let c=0;c<4;c++){const d=MESH[r][c],x=gx+c*(bw+8),y=gy+r*(bh+8);
      body+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="6" fill="none" stroke="var(--line)"/>'+S.tx(x+4,y+12,'cpu:'+d,{fs:10.5,fill:'var(--mute)'})+'<text id="sh-tile-l'+d+'" x="'+(x+4)+'" y="'+(y+bh-5)+'" font-size="10" fill="var(--mute)"></text>'}
    const s2=(bw-8)/SH[1];
    let g='';for(let d=0;d<8;d++){const b=B.t[d],k=B.keys[b.join(',')];
      g+='<rect id="sh-tile-r'+d+'" x="0" y="0" width="'+((b[3]-b[2])*s)+'" height="'+((b[1]-b[0])*s)+'" fill="'+hue(k)+'" fill-opacity=".6" stroke="var(--ink)" stroke-width=".6" vector-effect="non-scaling-stroke" style="transform-box:view-box;transform-origin:0 0'+(S.RM?'':';transition:transform .8s ease')+'"/>'}
    body+='<g>'+g+'</g>';
    host.innerHTML=S.svg(W,H,body,'Weight matrix and the 8 devices of a 2 by 4 mesh');
    lay={s,s2,mx,my,mw,mh,gx,gy,bw,bh,B};
  }
  function draw(i){
    if(!lay)build();const L=lay,B=L.B;
    // cut lines
    let cuts='';if(i>=1)B.list.forEach(b=>{cuts+='<rect x="'+(L.mx+b[2]*L.s)+'" y="'+(L.my+b[0]*L.s)+'" width="'+((b[3]-b[2])*L.s)+'" height="'+((b[1]-b[0])*L.s)+'" fill="none" stroke="var(--ink)" stroke-dasharray="4 3"/>'});
    $('sh-tile-cuts').innerHTML=cuts;
    for(let d=0;d<8;d++){const b=B.t[d],el=$('sh-tile-r'+d);let tr;
      if(i<2)tr='translate('+(L.mx+b[2]*L.s)+'px,'+(L.my+b[0]*L.s)+'px)';
      else{let r=0,c=0;MESH.forEach((row,ri)=>row.forEach((dd,ci)=>{if(dd===d){r=ri;c=ci}}));
        tr='translate('+(L.gx+c*(L.bw+8)+4)+'px,'+(L.gy+r*(L.bh+8)+17)+'px) scale('+(L.s2/L.s)+')'}
      el.style.transform=tr;el.style.opacity=i===0?0.35:1;
      $('sh-tile-l'+d).textContent=i>=2?'['+(b[1]-b[0])+', '+(b[3]-b[2])+']':''}
    const nb=B.list.length,per=(B.t[0][1]-B.t[0][0])*(B.t[0][3]-B.t[0][2])*4,full=SH[0]*SH[1]*4;
    const cap=[
      '<b>Before.</b> One logical array, [128, 512] float32 = '+S.fmtB(full)+', not yet placed. <code>jax.device_put(w, NamedSharding(mesh, '+S.esc(spec)+'))</code> will place it.',
      '<b>Cut.</b> '+S.esc(spec)+' cuts it into '+nb+' distinct block'+(nb>1?'s':'')+(spec==='P()'?' (no dimension is split: every device gets the whole matrix)':'')+'. A dimension named after a mesh axis is split in as many parts as that axis has devices (data: 2, model: 4).',
      '<b>Placed.</b> Each device holds one block, shape shown in its box (drawn to a smaller scale). A mesh axis the spec does not mention copies the blocks along it: here every block lives on '+(8/nb)+' device'+(8/nb>1?'s':'')+'.',
      '<b>Cost.</b> '+S.fmtB(per)+' per device, '+S.fmtB(per*8)+' over the 8 devices ('+(8/nb)+'&times; the array). This is the trade every strategy in section 4 makes: fewer copies save memory and cost communication when a device needs a block it does not hold.'][i];
    $('sh-tile-cap').innerHTML=cap;
    $('sh-tile-cnt').innerHTML=S.stat('distinct blocks',nb,'')+S.stat('copies of each block',8/nb,'')+S.stat('bytes per device',i>=2?S.fmtB(per):'&ndash;','of '+S.fmtB(full))+S.stat('bytes on all 8',i>=2?S.fmtB(per*8):'&ndash;','');
  }
  const A=S.anim({card:'sh-tile-card',ctl:'sh-tile-ctl',n:4,draw,ms:1500,label:'Sharding step'});
  S.seg($('sh-tile-spec'),specs.map(s=>[s,'<code>'+S.esc(s)+'</code>']),spec,v=>{spec=v;lay=null;build();A.reset(4);A.play()});
  S.onRender(()=>{lay=null;build();A.redraw()});S.onResize(()=>{lay=null;build();A.redraw()});
})();
