// ---- TPU and Pallas lab: grid and BlockSpec animator (section 5), traffic table (section 7) ----
(function(){
  const T=window.TP,D=T.D,$=T.$,P=D.pal;
  const M=4096,K=512,N=128;const CF=P.traffic.map(t=>[t.bm,t.bn,t.bk]);
  let ci=2,mode='1';
  // grid order: lexicographic with k innermost (what the TPU runs; recorded by the interpreter for 512 x 128 x 128)
  function order(c){const gi=M/c[0],gj=N/c[1],gk=K/c[2];const o=[];for(let i=0;i<gi;i++)for(let j=0;j<gj;j++)for(let k=0;k<gk;k++)o.push([i,j,k,0]);return o}
  // copies with Pallas's rule: a tile is copied only when its block index differs from the previous step on that core
  function account(c,ord){const prev={};let a=0,bb=0,o=0;const marks=ord.map(p=>{const pc=prev[p[3]]||(prev[p[3]]={});
      const ia=p[0]+','+p[2],ib=p[2]+','+p[1],io=p[0]+','+p[1];const r={a:ia!==pc.a,b:ib!==pc.b,o:io!==pc.o};if(r.a)a++;if(r.b)bb++;if(r.o)o++;pc.a=ia;pc.b=ib;pc.o=io;r.ca=a;r.cb=bb;r.co=o;return r});return marks}
  window.TP.gridAccount=(c)=>{const m=account(c,order(c));const l=m[m.length-1];return {steps:m.length,copies:[l.ca,l.cb,l.co],hbm:l.ca*c[0]*c[2]*2+l.cb*c[2]*c[1]*2+l.co*c[0]*c[1]*4}};
  let ORD=order(CF[ci]),MK=account(CF[ci],ORD);
  function setup(){const c=CF[ci];ORD=(mode==='2'&&ci===2)?P.walk2.map(p=>p.slice()):order(c);MK=account(c,ORD);A.reset(ORD.length+1)}
  function draw(s){
    const el=$('tp-gr-svg');const W=T.width(el);const c=CF[ci];const sc=(W-70)/M;const ox=60;let b='';
    const ah=K*sc,oh=N*sc,bw=K*sc,bh=N*sc;const yA=16,yO=yA+ah+24,yB=yO+oh+24;const H=yB+bh+20;
    const cur=s>0?ORD[s-1]:null,mk=s>0?MK[s-1]:null;const cores=mode==='2'&&ci===2;
    b+=T.tx(4,yA+ah/2,'A',{fs:12,w:600})+T.tx(4,yA+ah/2+13,'512 x 4,096',{fs:9,fill:'var(--mute)'});
    b+=T.tx(4,yO+oh/2+4,'O',{fs:12,w:600});b+=T.tx(4,yB+bh/2+4,'B',{fs:12,w:600});
    b+=T.rect(ox,yA,M*sc,ah,{fill:'var(--c1)',op:.12,st:'var(--line)'})+T.rect(ox,yO,M*sc,oh,{fill:'var(--c4)',op:.12,st:'var(--line)'})+T.rect(ox,yB,bw,bh,{fill:'var(--c3)',op:.12,st:'var(--line)'});
    // tile grid
    for(let i=0;i<=M/c[0];i++){const x=ox+i*c[0]*sc;b+='<line x1="'+x+'" y1="'+yA+'" x2="'+x+'" y2="'+(yA+ah)+'" stroke="var(--mute)" stroke-opacity=".45"/><line x1="'+x+'" y1="'+yO+'" x2="'+x+'" y2="'+(yO+oh)+'" stroke="var(--mute)" stroke-opacity=".45"/>'}
    for(let k=0;k<=K/c[2];k++){const y=yA+k*c[2]*sc,x=ox+k*c[2]*sc;b+='<line x1="'+ox+'" y1="'+y+'" x2="'+(ox+M*sc)+'" y2="'+y+'" stroke="var(--mute)" stroke-opacity=".45"/><line x1="'+x+'" y1="'+yB+'" x2="'+x+'" y2="'+(yB+bh)+'" stroke="var(--mute)" stroke-opacity=".45"/>'}
    // finished output tiles
    const doneO={};for(let t=0;t<s;t++){const p=ORD[t];if(p[2]===K/c[2]-1)doneO[p[0]+','+p[1]]=p[3]}
    Object.entries(doneO).forEach(([key,core])=>{const [i,j]=key.split(',').map(Number);b+=T.rect(ox+i*c[0]*sc,yO+j*c[1]*sc,c[0]*sc,c[1]*sc,{fill:core?'var(--c6)':'var(--c4)',op:.45})});
    if(cur){const col=cur[3]?'var(--c6)':'var(--c2)';const [i,j,k]=cur;
      b+=T.rect(ox+i*c[0]*sc,yA+k*c[2]*sc,c[0]*sc,c[2]*sc,{fill:col,op:mk.a?.9:.45,st:col,sw:mk.a?2:1,dash:mk.a?'':'3 2'});
      b+=T.rect(ox+i*c[0]*sc,yO+j*c[1]*sc,c[0]*sc,c[1]*sc,{fill:col,op:.6,st:col,sw:2});
      b+=T.rect(ox+k*c[2]*sc,yB+j*c[1]*sc,c[2]*sc,c[1]*sc,{fill:col,op:mk.b?.9:.45,st:col,sw:mk.b?2:1,dash:mk.b?'':'3 2'})}
    b+=T.tx(ox,yA-4,'A transposed: 4,096 rows across, K = 512 down',{fs:9.5,fill:'var(--mute)'});
    b+=T.tx(ox+bw+8,yB+bh-1,'B [512 x 128], K left to right',{fs:9.5,fill:'var(--mute)'});
    el.innerHTML=T.svg(W,H,b,'Matrices A, B and O with the current Pallas blocks');
    const vm=2*(c[0]*c[2]+c[2]*c[1])*2+2*c[0]*c[1]*4;const steps=ORD.length;
    if(!cur){$('tp-gr-cap').innerHTML='<b>Before the first grid point.</b> Grid = ('+M/c[0]+', '+N/c[1]+', '+K/c[2]+') = '+steps+' step'+(steps>1?'s':'')+'. '+(steps===1?'One block covers each whole array: this is the "before", one kernel invocation, '+T.fmtMiB(vm)+' of VMEM.':'Each step will load one tile of A and one of B into VMEM and add their product into one tile of O.')+(cores?' Two cores, grid recorded from the TPU interpreter: colours show which core ran each step.':'')}
    else{const [i,j,k,core]=cur;$('tp-gr-cap').innerHTML='<b>Step '+s+' of '+steps+(cores?', core '+core:'')+': program_id = ('+i+', '+j+', '+k+').</b> '+
      'A tile ('+i+', '+k+') '+(mk.a?'is copied from HBM':'is already in VMEM: copy skipped')+'; B tile ('+k+', '+j+') '+(mk.b?'is copied':'is already there, skipped')+'. '+
      (k===0?'k = 0, so <code>pl.when</code> zeroes O tile ('+i+', '+j+') first. ':'')+(k===K/c[2]-1?'Last k: O tile ('+i+', '+j+') is complete and goes back to HBM when the block index changes.':'O tile ('+i+', '+j+') stays in VMEM, accumulating.')}
    const m=s>0?mk:{ca:0,cb:0,co:0};const by=m.ca*c[0]*c[2]*2+m.cb*c[2]*c[1]*2+m.co*c[0]*c[1]*4;
    $('tp-gr-cnt').innerHTML=T.stat('grid steps',s+' / '+steps,'('+M/c[0]+', '+N/c[1]+', '+K/c[2]+')')+T.stat('tiles copied',(m.ca+m.cb)+' in, '+m.co+' out','A '+m.ca+', B '+m.cb)+T.stat('HBM traffic so far',T.fmtB(by),'minimum '+T.fmtB(P.traffic[0].min_bytes))+T.stat('VMEM needed',T.fmtMiB(vm),'2 buffers per operand');
  }
  const A=T.anim({card:'tp-gr-card',ctl:'tp-gr-ctl',n:ORD.length+1,ms:700,label:'Grid step',draw});
  T.seg($('tp-gr-cfg'),CF.map((c,i)=>[String(i),c[0]===M?'whole arrays (before)':c.join(' x ')]),String(ci),m=>{ci=+m;if(mode==='2'&&ci!==2){mode='1';document.querySelectorAll('#tp-gr-mode button').forEach(x=>x.classList.toggle('on',x.dataset.m==='1'))}setup()});
  T.seg($('tp-gr-mode'),[['1','1 core, axes "arbitrary" (default)'],['2','2 cores, parallel i (512 x 128 x 128)']],mode,m=>{mode=m;if(m==='2'&&ci!==2){ci=2;document.querySelectorAll('#tp-gr-cfg button').forEach(x=>x.classList.toggle('on',x.dataset.m==='2'))}setup()});
  T.onResize(()=>A.redraw());

  // ---- section 7 table
  let tg='v4';
  function table(){const vm=T.GEN[tg].src.vmem_mib*1048576;const row=(lab,t)=>'<tr><td>'+lab+'</td><td>'+t.bm+' x '+t.bn+' x '+t.bk+'</td><td class="num">'+T.fmtN(t.steps)+'</td><td class="num">'+T.fmtB(t.hbm_bytes)+'</td><td class="num">'+(t.hbm_bytes/t.min_bytes).toFixed(2)+'x</td><td class="num">'+T.fmtMiB(t.vmem_bytes)+'</td><td>'+(t.vmem_bytes<=vm?'<span class="tp-ok">yes</span>':'<span class="tp-bad">no</span>')+'</td></tr>';
    $('tp-tr-t').querySelector('tbody').innerHTML=P.traffic.map(t=>row('running example MLP down, 4,096 x 512 x 128',t)).join('')+P.traffic7b.map(t=>row('7B-class MLP up, 4,096 x 4,096 x 11,008',t)).join('')}
  T.seg($('tp-tr-gen'),D.gens.map(g=>[g.gen,T.GLAB[g.gen]+' ('+g.src.vmem_mib+' MiB)']),tg,m=>{tg=m;table()});table();
})();
