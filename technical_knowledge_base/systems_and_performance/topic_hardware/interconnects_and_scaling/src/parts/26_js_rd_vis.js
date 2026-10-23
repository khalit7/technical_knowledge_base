// ---- Reading visuals added 2026-10-23: hero cluster, alpha-beta curves (s1), switch against mesh (s3), RDMA stepper and
// credits against pause (s4), topology shapes (s5), torus collective calculator (s7, absorbed from Sharding and scale) ----
(function(){
  const D=window.IC,$=id=>document.getElementById(id),T=RD.t;
  const fB=b=>b>=1e9?(b/1e9).toFixed(b>=1e10?1:2)+' GB':b>=1e6?(b/1e6).toFixed(b>=1e7?0:1)+' MB':b>=1e3?(b/1e3).toFixed(b>=1e4?0:1)+' KB':Math.round(b)+' B';
  const fT=s=>s>=1?s.toFixed(2)+' s':s>=1e-3?(s*1e3).toFixed(s>=0.1?0:2)+' ms':(s*1e6).toFixed(s>=1e-4?0:2)+' µs';
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.r||4)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"/>'};
  const line=(x1,y1,x2,y2,c,w,dash)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(w||1.5)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
  const num=(x,y,k,c)=>'<circle cx="'+x+'" cy="'+y+'" r="9" fill="'+c+'"/>'+T(x,y+4,String(k),{a:'middle',fs:11,w:700,fill:'var(--bg)'});

  // ---- hero: two servers, rails, spine ----
  (function(){const host=$('ic-hero');if(!host)return;
    function draw(){const W=Math.min(860,RD.width(host)),H=270,m=8;let s='';
      const nar=W<520,gap=nar?10:24,sw=(W-2*m-gap)/2,sx=j=>m+j*(sw+gap);
      const ySp=22,yLf=88,yNic=150,yGpu=192,yNv=238;
      const leafX=k=>m+(k+0.5)*(W-2*m)/4,spX=i=>W/2+(i-0.5)*Math.min(220,W*0.4);
      // spine links
      for(let i=0;i<2;i++)for(let k=0;k<4;k++)s+=line(spX(i),ySp+12,leafX(k),yLf-11,'var(--bad)',1.2);
      // NIC to leaf links
      for(let j=0;j<2;j++)for(let g=0;g<4;g++){const gx=sx(j)+(g+0.5)*sw/4;s+=line(gx,yNic-9,leafX(g),yLf+11,'var(--c2)',1.4)}
      for(let i=0;i<2;i++){s+=box(spX(i)-30,ySp-11,60,23,{stroke:'var(--bad)'})+T(spX(i),ySp+4,'spine',{a:'middle',fs:11})}
      for(let k=0;k<4;k++){const lw=nar?44:58;s+=box(leafX(k)-lw/2,yLf-11,lw,22,{stroke:'var(--c2)'})+T(leafX(k),yLf+4,(nar?'rail ':'rail ')+k,{a:'middle',fs:11})}
      for(let j=0;j<2;j++){const x=sx(j);s+=box(x,yNic-20,sw,yNv-yNic+36,{fill:'none',r:8});
        s+=T(x+6,yNv+28,'server '+j+' (4 of 8 GPUs shown)',{fs:11,fill:'var(--mute)'});
        const cw=sw/4,bw=Math.min(46,cw-8);
        for(let g=0;g<4;g++){const gx=x+(g+0.5)*cw;
          s+=line(gx,yNic+9,gx,yGpu-14,'var(--c5)',2)+line(gx,yGpu+14,gx,yNv-7,'var(--c3)',2.4);
          s+=box(gx-bw/2,yNic-9,bw,18,{stroke:'var(--c2)'})+T(gx,yNic+4,'NIC',{a:'middle',fs:11});
          s+=box(gx-bw/2,yGpu-14,bw,28,{fill:'var(--acc2)',stroke:'var(--c4)',sw:1.5})+T(gx,yGpu+4,'GPU',{a:'middle',fs:11})}
        s+=box(x+6,yNv-7,sw-12,16,{fill:'var(--soft)',stroke:'var(--c3)',sw:1.5})+T(x+sw/2,yNv+5,'NVSwitch',{a:'middle',fs:11});
      }
      // numbered markers
      const g0=sx(0)+0.5*sw/4,g1=sx(0)+1.5*sw/4;
      s+=num(g0+Math.min(23,sw/8-4)+2,yGpu-12,1,'var(--c4)')+num(sx(1)+sw-14,yNv,2,'var(--c3)')+num(sx(0)+2.5*sw/4-12,(yNic+yGpu)/2+1,3,'var(--c5)')+
        num((sx(0)+sw/8*3+leafX(3))/2+6,(yNic+yLf)/2,4,'var(--c2)')+num((spX(0)+leafX(0))/2,(ySp+yLf)/2,5,'var(--bad)');
      host.innerHTML=RD.svg(W,H,s,'Two servers of GPUs: NVSwitch inside each server, a NIC per GPU, NICs wired to rail leaf switches, leaves wired to spine switches');
    }
    RD.onRender(draw);RD.onResize(draw);draw();
  })();

  // ---- alpha-beta: effective bandwidth against message size ----
  (function(){const host=$('ic-ab');if(!host)return;
    const L=D.links.filter(l=>['nvl4','pcie5','ib','eth100'].includes(l.id)).map(l=>({nm:l.id==='nvl4'?'NVLink 4':l.id==='pcie5'?'PCIe 5.0 (α assumed)':l.id==='ib'?'InfiniBand 400G':'100 Gb/s Ethernet (α assumed)',a:l.alpha*1e-6,b:l.beta*1e9,id:l.id}));
    L.push({nm:'this laptop (measured)',a:D.meas.pp_alpha,b:D.meas.pp_beta,id:'lap'});
    const COL={nvl4:'var(--c3)',pcie5:'var(--c5)',ib:'var(--c2)',eth100:'var(--c4)',lap:'var(--mute)'};
    const lo=6,hi=34;
    function draw(){const W=Math.min(860,RD.width(host)),H=Math.max(230,Math.min(300,W*0.5)),l0=54,r0=10,t0=10,b0=34;
      const S=Math.pow(2,+$('ic-abS').value);$('ic-abv').textContent=fB(S);
      const x=m=>l0+(Math.log2(m)-lo)/(hi-lo)*(W-l0-r0),y0=-2,y1=Math.log10(1000),y=bw=>t0+(y1-Math.log10(bw/1e9))/(y1-y0)*(H-t0-b0);
      let s='';
      [0.01,0.1,1,10,100,1000].forEach(v=>{const Y=y(v*1e9);s+=line(l0,Y,W-r0,Y,'var(--line)',1)+T(l0-4,Y+4,(v<1?v:v)+' GB/s',{a:'end',fs:11})});
      const ticks=W<520?[64,65536,67108864,17179869184]:[64,4096,262144,16777216,1073741824,17179869184];
      ticks.forEach((m,k)=>{s+=T(x(m),H-b0+15,fB(m),{a:k===ticks.length-1?'end':k===0?'start':'middle',fs:11})});
      s+=T((l0+W-r0)/2,H-3,'message size (log)',{a:'middle',fs:11,fill:'var(--mute)'});
      L.forEach(l=>{let d='';for(let i=0;i<=90;i++){const m=Math.pow(2,lo+(hi-lo)*i/90),bw=m/(l.a+m/l.b);d+=(i?'L':'M')+x(m).toFixed(1)+','+y(Math.max(bw,1e7)).toFixed(1)}
        s+='<path d="'+d+'" fill="none" stroke="'+COL[l.id]+'" stroke-width="2"/>';const nh=l.a*l.b;s+='<circle cx="'+x(nh)+'" cy="'+y(l.b/2)+'" r="4" fill="'+COL[l.id]+'"/>'});
      const X=x(S);s+=line(X,t0,X,H-b0,'var(--ink)',1,'3 3');
      host.innerHTML=RD.svg(W,H,s,'Effective bandwidth against message size for several links')+'<div class="hmleg">'+L.map(l=>'<span><svg width="14" height="10"><rect width="14" height="4" y="3" fill="'+COL[l.id]+'"/></svg>'+l.nm+'</span>').join('')+'<span>dot: n<sub>&frac12;</sub>, half of &beta;</span></div>';
      const tn=L[0].a+S/L[0].b,ti=L.find(l=>l.id==='ib'),tb=ti.a+S/ti.b;
      $('ic-about').innerHTML=RD.stat('NVLink 4',fT(tn),Math.round(100*S/tn/L[0].b)+'% of its 450 GB/s')+RD.stat('InfiniBand 400G',fT(tb),Math.round(100*S/tb/ti.b)+'% of its 50 GB/s')+RD.stat('NVLink advantage',(tb/tn).toFixed(2)+'×','9× in bandwidth');
    }
    $('ic-abS').addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();

  // ---- switch against mesh ----
  (function(){const host=$('ic-mesh');if(!host)return;let mode='sw';
    function draw(){const W=Math.min(620,RD.width(host)),H=Math.min(300,Math.max(230,W*0.62)),cx=W/2,cy=H/2,R=Math.min(W*0.38,H*0.4);let s='';
      const P=g=>[cx+R*Math.cos(Math.PI*2*g/8-Math.PI/2),cy+R*Math.sin(Math.PI*2*g/8-Math.PI/2)];
      if(mode==='sw'){s+=box(cx-42,cy-14,84,28,{stroke:'var(--c3)',sw:1.5})+T(cx,cy+4,'NVSwitch',{a:'middle',fs:11});
        for(let g=0;g<8;g++){const [x,y]=P(g),hl=g===0||g===3;s+=line(x,y,cx+(x-cx)*0.2,cy+(y-cy)*0.2,hl?'var(--acc)':'var(--c3)',hl?5:3.5)}}
      else{for(let a=0;a<8;a++)for(let b=a+1;b<8;b++){const [x1,y1]=P(a),[x2,y2]=P(b),hl=a===0&&b===3;s+=line(x1,y1,x2,y2,hl?'var(--acc)':'var(--c3)',hl?3:0.9)}}
      for(let g=0;g<8;g++){const [x,y]=P(g);s+=box(x-20,y-12,40,24,{fill:'var(--acc2)',stroke:(g===0||g===3)?'var(--acc)':'var(--c4)',sw:(g===0||g===3)?2:1})+T(x,y+4,'GPU '+g,{a:'middle',fs:11})}
      host.innerHTML=RD.svg(W,H,s,mode==='sw'?'Eight GPUs each with one fat link to an NVSwitch':'Eight GPUs each joined directly to the seven others by thin links');
      $('ic-meshout').innerHTML=mode==='sw'?RD.stat('GPU 0 to GPU 3','450 GB/s','the whole NVLink port')+RD.stat('Per GPU, all peers at once','450 GB/s','shared by destinations')+RD.stat('Links per GPU','18 to the switches','4 NVSwitch chips'):
        RD.stat('GPU 0 to GPU 3','64 GB/s','one link of seven')+RD.stat('Per GPU, all peers at once','448 GB/s','only if traffic uses all 7 links')+RD.stat('Links per GPU','7 direct','no switch hop');
    }
    RD.seg($('ic-meshm'),m=>{mode=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
  })();

  // ---- RDMA stepper: the caption is the static list item ----
  (function(){const host=$('ic-rdsvg');if(!host)return;const items=[...$('ic-rdsteps').querySelectorAll('li')];
    function draw(i){items.forEach((li,k)=>li.classList.toggle('on',k===i));
      const W=Math.min(760,RD.width(host)),H=236,cw=(W-60)/2,xs=[10,W-10-cw];let s='';
      const rows=[['app','program (CPU)',18],['kern','kernel TCP stack',66],['nic','NIC',134],['gpu','GPU memory',190]];
      const yOf=k=>rows.find(r=>r[0]===k)[2];
      const tcp=i===0;
      xs.forEach((x,side)=>{s+=T(x+cw/2,12,side?'receiver':'sender',{a:'middle',fs:11,fill:'var(--mute)'});
        rows.forEach(([k,nm,y])=>{let on=false;
          if(tcp)on=true;else if(k==='gpu')on=i>=1;else if(k==='nic')on=i>=2;else if(k==='app')on=(i===3&&side===0);
          const dim=!tcp&&k==='kern';
          s+='<g opacity="'+(dim?0.35:1)+'">'+box(x,y,cw,30,{fill:on?'var(--acc2)':'var(--soft)',stroke:on?'var(--acc)':'var(--line)'})+T(x+cw/2,y+19,nm+(k==='gpu'&&i>=1?' (registered, key)':'')+(k==='nic'&&i>=2?(W<520?' + QP':' + queue pair'):''),{a:'middle',fs:11})+'</g>'});});
      const mid=W/2,arr=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="2.2" marker-end="url(#ic-rda)"/>';
      if(tcp){const cxs=[xs[0]+cw*0.25,xs[1]+cw*0.75];
        s+=arr(cxs[0],yOf('gpu'),cxs[0],yOf('app')+30,'var(--bad)')+arr(cxs[0]+16,yOf('app')+30,cxs[0]+16,yOf('nic'),'var(--bad)')+
          arr(xs[0]+cw,yOf('nic')+15,xs[1],yOf('nic')+15,'var(--c2)')+arr(cxs[1]-16,yOf('nic'),cxs[1]-16,yOf('app')+30,'var(--bad)')+arr(cxs[1],yOf('app')+30,cxs[1],yOf('gpu'),'var(--bad)');
        s+=T(mid,yOf('nic')-6,'wire',{a:'middle',fs:11,fill:'var(--c2)'});}
      else if(i===3){s+=arr(xs[0]+cw*0.5,yOf('app')+30,xs[0]+cw*0.5,yOf('nic'),'var(--acc)')+T(xs[0]+cw*0.5+6,yOf('kern')+19,'doorbell',{fs:11,fill:'var(--acc)'})}
      else if(i===4){s+=arr(xs[0]+cw*0.7,yOf('gpu'),xs[0]+cw*0.7,yOf('nic')+30,'var(--c5)')+arr(xs[0]+cw,yOf('nic')+15,xs[1],yOf('nic')+15,'var(--c2)')+arr(xs[1]+cw*0.3,yOf('nic')+30,xs[1]+cw*0.3,yOf('gpu'),'var(--c5)')+T(mid,yOf('nic')-6,'RDMA write',{a:'middle',fs:11,fill:'var(--c2)'})}
      host.innerHTML=RD.svg(W,H,'<defs><marker id="ic-rda" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker></defs>'+s,'RDMA step '+i);
    }
    RD.anim({card:'ic-rdcard',ctl:'ic-rdctl',n:items.length,draw,ms:2200,label:'RDMA step'});
  })();

  // ---- credits against pause frames ----
  (function(){const host=$('ic-flsvg');if(!host)return;
    function draw(){const W=Math.min(860,RD.width(host)),nar=W<560,pw=nar?W:(W-20)/2,ph=150,H=nar?2*ph+16:ph;let s='';
      const panel=(ox,oy,ib)=>{let p='';const a=ox+10,b=ox+pw-80;
        p+=T(ox+pw/2,oy+14,ib?'InfiniBand: the receiver grants credits':'RoCE: a full buffer pauses the sender',{a:'middle',fs:11,w:600});
        p+=box(a,oy+50,64,40,{})+T(a+32,oy+74,'sender',{a:'middle',fs:11});
        p+=box(b,oy+42,70,56,{stroke:ib?'var(--good)':'var(--bad)'})+T(b+35,oy+36,ib?'receiver':'switch',{a:'middle',fs:11});
        for(let k=0;k<4;k++){const full=ib?k<2:true;p+='<rect x="'+(b+8+k*14)+'" y="'+(oy+66)+'" width="11" height="24" rx="2" fill="'+(full?'var(--c1)':'none')+'" stroke="var(--c1)"/>'}
        const y1=oy+62,y2=oy+82;
        p+='<line x1="'+(a+66)+'" y1="'+y1+'" x2="'+(b-4)+'" y2="'+y1+'" stroke="var(--c1)" stroke-width="2" marker-end="url(#ic-fla)"/>'+T((a+b)/2+30,y1-5,ib?'2 packets (credits used)':'packets',{a:'middle',fs:11});
        p+='<line x1="'+(b-4)+'" y1="'+y2+'" x2="'+(a+66)+'" y2="'+y2+'" stroke="'+(ib?'var(--good)':'var(--bad)')+'" stroke-width="2" stroke-dasharray="'+(ib?'':'4 3')+'" marker-end="url(#ic-fla)"/>'+T((a+b)/2+30,y2+15,ib?'credits: 2 buffers free':'PFC pause frame',{a:'middle',fs:11,fill:ib?'var(--good)':'var(--bad)'});
        p+=T(ox+pw/2,oy+ph-12,ib?'nothing is sent without space: no drops':'pauses spread upstream: congestion trees',{a:'middle',fs:11,fill:'var(--mute)'});
        return p};
      s+=panel(0,0,true)+panel(nar?0:pw+20,nar?ph+16:0,false);
      host.innerHTML=RD.svg(W,H,'<defs><marker id="ic-fla" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker></defs>'+s,'Credit-based flow control against priority flow control');
    }
    RD.onRender(draw);RD.onResize(draw);draw();
  })();

  // ---- topology shapes ----
  (function(){const host=$('ic-topo');if(!host)return;let mode='ft';
    function draw(){const W=Math.min(760,RD.width(host));let s='',H=250,out='';
      if(mode==='ft'){const nl=W<520?4:6,ns=W<520?2:3,lx=k=>10+(k+0.5)*(W-20)/nl,sx=k=>W/2+(k-(ns-1)/2)*Math.min(150,(W-40)/ns),yS=30,yL=120,yE=200;
        for(let a=0;a<ns;a++)for(let k=0;k<nl;k++)s+=line(sx(a),yS+11,lx(k),yL-11,(k===0||k===nl-1)&&a===0?'var(--acc)':'var(--line)',(k===0||k===nl-1)&&a===0?2.4:1.2);
        for(let a=0;a<ns;a++)s+=box(sx(a)-28,yS-11,56,22,{stroke:'var(--bad)'})+T(sx(a),yS+4,'spine',{a:'middle',fs:11});
        for(let k=0;k<nl;k++){s+=box(lx(k)-22,yL-11,44,22,{stroke:'var(--c2)'})+T(lx(k),yL+4,'leaf',{a:'middle',fs:11});
          for(let e=0;e<2;e++){const ex=lx(k)+(e-0.5)*18,hl=(k===0&&e===0)||(k===nl-1&&e===1);s+=line(lx(k),yL+11,ex,yE-8,hl?'var(--acc)':'var(--line)',hl?2.4:1.2)+'<circle cx="'+ex+'" cy="'+yE+'" r="7" fill="'+(hl?'var(--acc)':'var(--acc2)')+'" stroke="var(--c4)"/>'}}
        s+=T(W/2,yE+32,'NICs (endpoints)',{a:'middle',fs:11,fill:'var(--mute)'});H=240;
        out=RD.stat('Hops, farthest pair','4','NIC, leaf, spine, leaf, NIC')+RD.stat('Bisection','full, or 1:k','set by leaf uplinks')+RD.stat('Used by','GPU clusters','rail-optimised: Meta, NVIDIA, DeepSeek');}
      else if(mode==='torus'){const n=4,c=Math.min(52,(W-80)/n),x0=(W-n*c)/2+c/2,y0=34,X=i=>x0+i*c,Y=j=>y0+j*c;
        const hop=(i,j)=>Math.min(i,n-i)+Math.min(j,n-j);
        for(let j=0;j<n;j++)for(let i=0;i<n;i++){if(i<n-1)s+=line(X(i),Y(j),X(i+1),Y(j),'var(--c3)',1.6);if(j<n-1)s+=line(X(i),Y(j),X(i),Y(j+1),'var(--c3)',1.6)}
        for(let j=0;j<n;j++){s+='<path d="M'+X(0)+','+Y(j)+' C'+(X(0)-26)+','+(Y(j)-10)+' '+(X(0)-26)+','+(Y(j)+14)+' '+(X(0)-10)+','+(Y(j)+10)+'" fill="none" stroke="var(--c3)" stroke-dasharray="3 3"/>';s+='<path d="M'+X(n-1)+','+Y(j)+' C'+(X(n-1)+26)+','+(Y(j)-10)+' '+(X(n-1)+26)+','+(Y(j)+14)+' '+(X(n-1)+10)+','+(Y(j)+10)+'" fill="none" stroke="var(--c3)" stroke-dasharray="3 3"/>'}
        for(let i=0;i<n;i++){s+='<path d="M'+X(i)+','+Y(0)+' C'+(X(i)-10)+','+(Y(0)-26)+' '+(X(i)+14)+','+(Y(0)-26)+' '+(X(i)+10)+','+(Y(0)-10)+'" fill="none" stroke="var(--c3)" stroke-dasharray="3 3"/>'}
        for(let j=0;j<n;j++)for(let i=0;i<n;i++){const hl=(i===0&&j===0)||(i===n-1&&j===n-1);s+='<circle cx="'+X(i)+'" cy="'+Y(j)+'" r="13" fill="'+(hl?'var(--acc)':'var(--acc2)')+'" stroke="var(--c4)"/>'+T(X(i),Y(j)+4,String(hop(i,j)),{a:'middle',fs:11,fill:hl?'var(--bg)':'var(--ink)'})}
        H=y0+n*c+28;s+=T(W/2,H-6,'number: hops from the top-left chip; dashed: wraparound links',{a:'middle',fs:11,fill:'var(--mute)'});
        out=RD.stat('Highlighted pair','2 hops','6 without wraparound; farthest chip 4')+RD.stat('Switches','none','each chip wired to 4 (2-D) or 6 (3-D) neighbours')+RD.stat('Used by','TPU pods','also Trainium2 (4 × 4)');}
      else{const g=5,R=Math.min(W*0.36,95),cx=W/2,cy=125,gr=W<520?20:26,P=k=>[cx+R*Math.cos(Math.PI*2*k/g-Math.PI/2),cy+R*Math.sin(Math.PI*2*k/g-Math.PI/2)];
        for(let a=0;a<g;a++)for(let b=a+1;b<g;b++){const [x1,y1]=P(a),[x2,y2]=P(b),hl=a===0&&b===2;s+=line(x1,y1,x2,y2,hl?'var(--acc)':'var(--c2)',hl?2.6:1.3,hl?'':'5 3')}
        for(let k=0;k<g;k++){const [x,y]=P(k);s+='<circle cx="'+x+'" cy="'+y+'" r="'+gr+'" fill="var(--soft)" stroke="var(--c4)"/>';
          for(let r=0;r<4;r++){const rx=x+(r%2-0.5)*gr*0.8,ry=y+(Math.floor(r/2)-0.5)*gr*0.8;s+='<rect x="'+(rx-5)+'" y="'+(ry-5)+'" width="10" height="10" rx="2" fill="'+((k===0&&r===3)||(k===2&&r===0)?'var(--acc)':'var(--acc2)')+'" stroke="var(--c4)"/>'}}
        H=250;s+=T(W/2,H-6,'5 groups of 4 switches; dashed: long global links, one per pair of groups',{a:'middle',fs:11,fill:'var(--mute)'});
        out=RD.stat('Hops, minimal route','3','local, global, local')+RD.stat('Global links','one per pair of groups','long, often optical')+RD.stat('Used by','HPC (Frontier)','HPE Slingshot');}
      host.innerHTML=RD.svg(W,H,s,'Network topology: '+mode);$('ic-topoout').innerHTML=out;
    }
    RD.seg($('ic-topom'),m=>{mode=m;draw()});RD.onRender(draw);RD.onResize(draw);draw();
  })();

  // ---- collective cost on a TPU axis: ring, 2-D torus, tree (absorbed from Sharding and scale, 2026-10-23) ----
  (function(){const el=$('ic-ccsvg');if(!el)return;
    const al=1e-6,SZ=[['100 KB',1e5],['Llama 3.1 8B bf16 gradients',8030261248*2]];
    function draw(){const k=+$('ic-ccn').value,n=Math.pow(2,k),Wl=+$('ic-cclink').value,Wb=2*Wl;$('ic-ccnv').textContent=n;
      const X=Math.pow(2,Math.ceil(k/2)),Y=n/X;
      const ring=V=>2*Math.max(al*n/2,V/Wb),tor=V=>2*Math.max(al*(X+Y)/2,V/(2*Wb)),tree=V=>2*Math.log2(n)*al+2*V/Wb;
      const W=Math.min(860,RD.width(el)),H=240,ml=56,mr=10,mt=10,mb=34,pw=W-ml-mr,ph=H-mt-mb,x0=3,x1=11,ys=[-6,1];
      const px=v=>ml+(Math.log10(v)-x0)/(x1-x0)*pw,py=t=>mt+(1-(Math.log10(t)-ys[0])/(ys[1]-ys[0]))*ph;
      let s='';const lab=['1 KB','','100 KB','','10 MB','','1 GB','','100 GB'];
      for(let e=x0;e<=x1;e++){const x=px(Math.pow(10,e));s+=line(x,mt,x,mt+ph,'var(--line)',1);if(lab[e-3]&&(W>=520||e%4===3))s+=T(x,H-18,lab[e-3],{a:e===x1?'end':e===x0?'start':'middle',fs:11})}
      const yl={'-6':'1 µs','-5':'10 µs','-4':'100 µs','-3':'1 ms','-2':'10 ms','-1':'100 ms','0':'1 s','1':'10 s'};
      for(let e=ys[0];e<=ys[1];e++){const y=py(Math.pow(10,e));s+=line(ml,y,ml+pw,y,'var(--line)',1)+T(ml-4,y+4,yl[e],{a:'end',fs:11})}
      s+=T(ml+pw/2,H-3,'message size (bytes all-reduced)',{a:'middle',fs:11,fill:'var(--mute)'});
      const cv=[['ring (1 axis)',ring,'var(--c2)'],['2-D torus ('+X+' × '+Y+')',tor,'var(--c1)'],['tree (α-β)',tree,'var(--c4)']];
      cv.forEach(c=>{let d='';for(let i=0;i<=80;i++){const v=Math.pow(10,x0+(x1-x0)*i/80),t=Math.min(Math.max(c[1](v),1e-6),10);d+=(i?'L':'M')+px(v).toFixed(1)+','+py(t).toFixed(1)}s+='<path d="'+d+'" fill="none" stroke="'+c[2]+'" stroke-width="2"/>'});
      SZ.forEach((z,i)=>{const x=px(z[1]);s+=line(x,mt,x,mt+ph,'var(--mute)',1,'3 3')+T(x+3,mt+12,String.fromCharCode(97+i),{fs:11,w:600})});
      el.innerHTML=RD.svg(W,H,s,'All-reduce time against message size for ring, 2-D torus and tree');
      $('ic-ccleg').innerHTML=cv.map(c=>'<span><svg width="14" height="10"><rect width="14" height="4" y="3" fill="'+c[2]+'"/></svg>'+c[0]+'</span>').join('');
      const a=SZ[0][1],b=SZ[1][1];
      $('ic-ccnote').innerHTML='At (a) 100 KB on '+n+' devices: ring '+fT(ring(a))+', 2-D torus '+fT(tor(a))+', tree '+fT(tree(a))+'. At (b) the 8B gradients, 16.06 GB: ring '+fT(ring(b))+', 2-D torus '+fT(tor(b))+', tree '+fT(tree(b))+'. Assumptions: &alpha; = 1 &micro;s per hop, W<sub>bidi</sub> = 2 &times; the one-way link ('+(Wl/1e9)+' GB/s, scaling book table), a full ring with wraparound, no overlap with compute. A calculation, not a measurement.';
    }
    $('ic-ccn').addEventListener('input',draw);$('ic-cclink').addEventListener('change',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();
})();
