// ---- Reading section 3: one job's life on the cluster, a stepper (machines and network lit per step) ----
(function(){const $=id=>document.getElementById(id);const box=$('ca-job-svg');if(!box)return;
  const steps=[...document.querySelectorAll('#ca-job-steps li')].map(li=>({net:li.dataset.net.split(' ').filter(Boolean),on:li.dataset.on.split(' ').filter(Boolean),html:li.innerHTML}));
  const NET=[['nvl','NVLink','var(--c4)'],['cmp','compute fabric','var(--c2)'],['sto','storage fabric','var(--c3)'],['inb','front-end (in-band)','var(--c1)'],['oob','out-of-band','var(--c5)']];
  const COL={};NET.forEach(n=>COL[n[0]]=n[2]);
  $('ca-job-leg').innerHTML=NET.map(n=>'<span data-n="'+n[0]+'" style="--nc:'+n[2]+'">'+n[1]+'</span>').join('');
  function draw(i){const S=steps[i];const W=Math.max(300,Math.min(860,RD.width(box)));const narrow=W<520;const fs=11;
    const X=f=>8+f*(W-16);const on=k=>S.on.indexOf(k)>=0,net=k=>S.net.indexOf(k)>=0;
    const op=k=>on(k)?1:.32;
    const bx=(k,x0,x1,y,h,fill,txt,o)=>'<g opacity="'+(o==null?op(k):o)+'"><rect x="'+X(x0).toFixed(1)+'" y="'+y+'" width="'+(X(x1)-X(x0)).toFixed(1)+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="'+(on(k)?'var(--acc)':'var(--line)')+'" stroke-width="'+(on(k)?1.6:1)+'"/>'+RD.t(((X(x0)+X(x1))/2).toFixed(1),y+h/2+4,txt,{a:'middle',fs:fs})+'</g>';
    const ln=(n,x1,y1,x2,y2)=>'<line x1="'+X(x1).toFixed(1)+'" y1="'+y1+'" x2="'+X(x2).toFixed(1)+'" y2="'+y2+'" stroke="'+(net(n)?COL[n]:'var(--dim)')+'" stroke-width="'+(net(n)?3:1.4)+'" stroke-linecap="round"/>';
    let s='';
    // buses
    const yF=52,yS=226,yO=276;
    s+=ln('inb',.01,yF,.99,yF)+ln('sto',.01,yS,.99,yS)+ln('oob',.01,yO,.99,yO);
    s+=RD.t(X(.01),yF+15,narrow?'front-end':'front-end (in-band)',{fs:fs,fill:net('inb')?'var(--c1)':'var(--mute)'});
    s+=RD.t(X(.01),yS-5,narrow?'storage':'storage fabric',{fs:fs,fill:net('sto')?'var(--c3)':'var(--mute)'});
    s+=RD.t(X(.01),yO+15,narrow?'out-of-band':'out-of-band (every BMC)',{fs:fs,fill:net('oob')?'var(--c5)':'var(--mute)'});
    // row 1: you, login, controller, registry, dropped onto the front-end
    const R1=[['you',0,.16,'You'],['login',.2,.42,narrow?'Login':'Login node'],['ctl',.46,.72,narrow?'Controller':'Controller (head)'],['reg',.76,1,'Registry']];
    R1.forEach(r=>{s+=ln('inb',(r[1]+r[2])/2,34,(r[1]+r[2])/2,yF)});
    R1.forEach(r=>{s+=bx(r[0],r[1],r[2],8,26,r[0]==='ctl'||r[0]==='login'?'var(--acc2)':'var(--soft)',r[3])});
    // two nodes
    const yN=76,hN=104;
    [['A',0,.47],['B',.53,1]].forEach(nd=>{const k=nd[0],x0=nd[1],x1=nd[2],w=x1-x0,cx=(x0+x1)/2;
      s+=ln('inb',cx,yF,cx,yN);
      s+='<g opacity="'+op(k)+'"><rect x="'+X(x0).toFixed(1)+'" y="'+yN+'" width="'+(X(x1)-X(x0)).toFixed(1)+'" height="'+hN+'" rx="6" fill="var(--bg)" stroke="var(--line)"/>'+RD.t(X(x0)+6,yN+15,'Node '+k+(narrow?'':' (8 GPUs)'),{fs:fs,w:600})+'</g>';
      // GPUs
      const g0=x0+.02,g1=x1-.02,gw=(g1-g0)/8;
      for(let g=0;g<8;g++){const a=g0+g*gw+gw*.12,b=g0+(g+1)*gw-gw*.12;const lit=on('gpu')&&on(k);
        s+='<rect x="'+X(a).toFixed(1)+'" y="'+(yN+22)+'" width="'+(X(b)-X(a)).toFixed(1)+'" height="16" rx="2" fill="'+(lit?'var(--acc)':'var(--open2)')+'" stroke="var(--line)" opacity="'+op(k)+'"/>'}
      // NVLink bar
      s+='<g opacity="'+op(k)+'"><rect x="'+X(g0).toFixed(1)+'" y="'+(yN+42)+'" width="'+(X(g1)-X(g0)).toFixed(1)+'" height="16" rx="3" fill="'+(net('nvl')?'var(--c4)':'var(--closed2)')+'" opacity="'+(net('nvl')?.85:1)+'"/>'+RD.t(X(cx).toFixed(1),yN+54,narrow?'NVLink':'NVSwitch: NVLink',{a:'middle',fs:fs,fill:net('nvl')?'var(--bg)':'var(--ink)'})+'</g>';
      // bottom row: NVMe, BMC, NICs (NICs on the side nearest the leaf)
      const items=k==='A'?[['nvme','NVMe'],['bmc','BMC'],['nic',narrow?'NICs':'8 NICs']]:[['nic',narrow?'NICs':'8 NICs'],['bmc','BMC'],['nvme','NVMe']];
      const iw=(w-.04-.02*2)/3;
      items.forEach((it,j)=>{const a=x0+.02+j*(iw+.02),b=a+iw,c=(a+b)/2;const y=yN+66;
        const n=it[0]==='nic'?'cmp':it[0]==='nvme'?'sto':'oob';
        if(it[0]==='nic')s+=ln('cmp',c,y+22,k==='A'?.44:.56,198);
        if(it[0]==='nvme')s+=ln('sto',c,y+22,c,yS);
        if(it[0]==='bmc')s+=ln('oob',c,y+22,c,yO);
        const lit=on(k)&&(on(it[0])||net(n)&&on(it[0]));
        s+='<g opacity="'+op(k)+'"><rect x="'+X(a).toFixed(1)+'" y="'+y+'" width="'+(X(b)-X(a)).toFixed(1)+'" height="22" rx="3" fill="'+(lit?'var(--acc2)':'var(--soft)')+'" stroke="'+(lit?'var(--acc)':'var(--line)')+'"/>'+RD.t(X(c).toFixed(1),y+15,it[1],{a:'middle',fs:fs})+'</g>'})});
    // leaf switch and storage servers
    s+=bx('leaf',.36,.64,198,22,'var(--acc2)',narrow?'Leaf':'Leaf switch (compute)');
    s+=ln('sto',.5,yS,.5,236);
    s+=bx('sto',.3,.7,236,24,'var(--soft)',narrow?'Storage':'Storage servers (parallel FS)');
    box.innerHTML=RD.svg(W,292,s,'A login node, the controller, a registry, two GPU nodes, a leaf switch and storage servers on four networks');
    $('ca-job-leg').querySelectorAll('span').forEach(e=>e.classList.toggle('on',net(e.dataset.n)));
    $('ca-job-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+steps.length+'</div><p>'+S.html+'</p>';
  }
  const A=RD.anim({card:'ca-job-card',ctl:'ca-job-ctl',n:steps.length,draw,ms:2600,label:'Job step'});
  RD.onResize(()=>A.redraw());
})();
