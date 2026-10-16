// ---- Reading, section 1: cluster anatomy schematic (drawn at the measured width) ----
(function(){
  const el=document.getElementById('rd-anat');if(!el)return;
  function draw(){
    const w=Math.max(300,Math.min(860,RD.width(el)));
    const nn=w<520?2:4;                       // nodes drawn
    const pad=6,gap=w<520?10:16;
    const nodeW=(w-2*pad-gap*(nn-1)-(w<520?0:30))/nn;
    const H=290;let b='';
    const box=(x,y,ww,hh,lab,sub,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+ww+'" height="'+hh+'" rx="6" fill="'+(fill||'var(--soft)')+'" stroke="var(--line)"/>'+
      RD.t(x+ww/2,y+16,lab,{a:'middle',w:600,fs:11.5})+(sub?RD.t(x+ww/2,y+30,sub,{a:'middle',fs:10.5,fill:'var(--mute)'}):'');
    // top row: login, controller, storage
    const tw=Math.min(150,(w-2*pad-2*gap)/3);
    const xs=[pad,pad+tw+gap,w-pad-tw];
    b+=box(xs[0],8,tw,38,'Login node','edit, submit');
    b+=box(xs[1],8,tw,38,'Controller','queue, node state');
    b+=box(xs[2],8,tw,38,'Shared storage','files, objects');
    // front-end network (green)
    const gy=66;
    b+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'" stroke="var(--c3)" stroke-width="3"/>';
    xs.forEach(x=>{b+='<line x1="'+(x+tw/2)+'" y1="46" x2="'+(x+tw/2)+'" y2="'+gy+'" stroke="var(--c3)" stroke-width="2"/>'});
    // compute nodes
    const ny=88,nh=128;
    for(let k=0;k<nn;k++){
      const x=pad+k*(nodeW+gap);
      b+='<line x1="'+(x+nodeW/2)+'" y1="'+gy+'" x2="'+(x+nodeW/2)+'" y2="'+ny+'" stroke="var(--c3)" stroke-width="2"/>';
      b+='<rect x="'+x+'" y="'+ny+'" width="'+nodeW+'" height="'+nh+'" rx="7" fill="var(--bg)" stroke="var(--mute)"/>';
      b+=RD.t(x+8,ny+15,'Node '+(k+1)+(nodeW>210?': 8 GPUs, 2 CPUs, NVMe':''),{fs:10.5,fill:'var(--mute)'});
      // 8 GPUs in 2 rows of 4
      const gw=(nodeW-16-3*6)/4,gh=24;
      for(let g=0;g<8;g++){const r=g>>2,c=g&3;const gx=x+8+c*(gw+6),gy2=ny+24+r*(gh+22);
        b+='<rect x="'+gx+'" y="'+gy2+'" width="'+gw+'" height="'+gh+'" rx="3" fill="var(--c1)" opacity=".85"/>'+RD.t(gx+gw/2,gy2+16,'GPU',{a:'middle',fs:10,fill:'var(--bg)'});
        // NIC line down to the fabric, one per GPU
        const lx=x+8+(g+0.5)*(nodeW-16)/8;
        b+='<line x1="'+lx+'" y1="'+(ny+nh)+'" x2="'+lx+'" y2="'+(ny+nh+22)+'" stroke="var(--c2)" stroke-width="1.5"/>';
      }
      // NVLink/NVSwitch bar between the rows
      b+='<rect x="'+(x+8)+'" y="'+(ny+24+gh+6)+'" width="'+(nodeW-16)+'" height="10" rx="3" fill="var(--c4)"/>'+RD.t(x+nodeW/2,ny+24+gh+14.5,'NVLink switch',{a:'middle',fs:9,fill:'var(--bg)'});
      b+=RD.t(x+nodeW/2,ny+nh-10,nodeW>130?'1 NIC per GPU below':'NICs below',{a:'middle',fs:10,fill:'var(--mute)'});
    }
    if(w>=520)b+=RD.t(w-pad-12,ny+nh/2,'...',{a:'middle',fs:16,fill:'var(--mute)'});
    // scale-out fabric (orange)
    const fy=ny+nh+22;
    b+='<rect x="'+pad+'" y="'+fy+'" width="'+(w-2*pad)+'" height="8" rx="3" fill="var(--c2)"/>';
    b+=RD.t(w/2,fy+24,w<620?'Scale-out fabric (InfiniBand or RoCE)':'Scale-out fabric: InfiniBand or RoCE switches (GPU to GPU across nodes)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+=RD.t(w/2,gy-5,'Front-end and storage network (Ethernet)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,H,b,'Schematic of a GPU training cluster');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
