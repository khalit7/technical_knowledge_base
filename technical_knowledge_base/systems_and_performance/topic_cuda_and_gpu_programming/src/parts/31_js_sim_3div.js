// ---- GPU simulator: 1 divergence ----
(function(){
  const U=SIMU,C=SIMC,D=window.SIMD,$=U.$;
  if(!$('sim-div-card'))return;
  if(D&&D.meta&&D.meta.simd_width)$('sim-simdw').textContent=D.meta.simd_width;
  const signs=C.lcgSigns(64,12345),sorted=C.lcgSigns(64,12345,true);
  const CONDTXT={lane_parity:'threadIdx.x % 2 == 0',warp_parity:'(threadIdx.x / 32) % 2 == 0',half:'threadIdx.x % 32 &lt; 16',data_random:'x &gt; 0',data_sorted:'x &gt; 0',all:'true'};
  let mode='before',cond='lane_parity',la=4,lb=4;
  function cur(){
    const c=mode==='before'?'lane_parity':mode==='after'?'warp_parity':cond;
    const A=mode==='free'?la:4,B=mode==='free'?lb:4;
    const warps=[0,1].map(w=>{
      const k=c.startsWith('data')?'data':c;
      const m=C.condMask(k,w,c==='data_sorted'?sorted:signs);
      const r=C.diverge(m,3,A,B,1);
      const na=m.filter(x=>x).length;
      const rows=[{lab:'i = blockIdx.x * blockDim.x + threadIdx.x',k:'c',line:0},{lab:'x = in[i]',k:'c',line:1},{lab:'if ('+CONDTXT[c]+')',k:'c',line:2}];
      if(na)for(let j=0;j<A;j++)rows.push({lab:'branch A, instruction '+(j+1),k:'a',line:3});
      if(na<32)for(let j=0;j<B;j++)rows.push({lab:'branch B, instruction '+(j+1),k:'b',line:5});
      rows.push({lab:'out[i] = y',k:'c',line:7});
      return {m,r,rows,na};
    });
    return {c,A,B,warps};
  }
  let S=cur();
  function code(line){
    const L=['int i = blockIdx.x * blockDim.x + threadIdx.x;','float x = in[i], y;','if ('+CONDTXT[S.c]+') {','    y = f(x);   <span class="ca">// branch A: '+S.A+' instruction'+(S.A>1?'s':'')+'</span>','} else {','    y = g(x);   <span class="cb">// branch B: '+S.B+' instruction'+(S.B>1?'s':'')+'</span>','}','out[i] = y;'];
    $('sim-div-code').innerHTML=L.map((s,j)=>j===line?'<span class="hl">'+s+'</span>':s).join('\n')+(S.c.startsWith('data')?'\n<span class="cm">// x: 64 values, +1 or -1, '+(S.c==='data_sorted'?'sorted so all positives come first':'in random order (fixed seed)')+'</span>':'');
  }
  const fig=$('sim-div-fig');
  function draw(i){
    const W=U.width(fig),side=W>=640;
    const gw=side?(W-16)/2:W,cs=Math.max(6,Math.min(15,Math.floor((gw-34)/32)));
    const n=Math.max(S.warps[0].rows.length,S.warps[1].rows.length);
    const rh=cs+2,top=18,h=top+n*rh+4;
    let out='';
    S.warps.forEach((w,wi)=>{
      const ox=side?wi*(gw+16):0,oy=side?0:wi*(h+8);
      let b=U.t(ox,oy+12,(side||W>=420?'Warp '+wi+' (threads '+(wi*32)+' to '+(wi*32+31)+'): ':'Warp '+wi+': ')+w.rows.length+' issue slots',{fs:11.5,w:600});
      w.rows.forEach((r,ri)=>{
        const y=oy+top+ri*rh,done=ri<=i;
        b+=U.t(ox+26,y+cs-1,ri+1,{fs:9.5,a:'end',fill:'var(--mute)'});
        for(let l=0;l<32;l++){
          const act=r.k==='c'||(r.k==='a'?w.m[l]:!w.m[l]);
          const col=r.k==='c'?'var(--c3)':r.k==='a'?'var(--c1)':'var(--c2)';
          const x=ox+30+l*cs;
          b+=act?U.rect(x+.5,y+.5,cs-1,cs-1,col,{op:done?1:.13,tip:'lane '+l+': '+r.lab}):U.rect(x+1,y+1,cs-2,cs-2,'none',{st:'var(--dim)',op:done?1:.35,tip:'lane '+l+' idle: '+r.lab});
        }
        if(ri===i)b+=U.rect(ox+29,y,32*cs+1,cs+1,'none',{st:'var(--ink)',sw:1.5});
      });
      if(i>=w.rows.length)b+=U.t(ox+30,oy+top+w.rows.length*rh+2,'',{});
      out+=b;
    });
    const H=side?h:2*h+8;
    fig.innerHTML=U.svg(W,H,out,'Two warps executing the branch, one row per issued instruction');
    const row=S.warps.map(w=>w.rows[Math.min(i,w.rows.length-1)]);
    code(row[0].line);
    const issued=S.warps.reduce((s,w)=>s+Math.min(i+1,w.rows.length),0);
    let useful=0;S.warps.forEach(w=>w.rows.slice(0,i+1).forEach(r=>{useful+=r.k==='c'?32:r.k==='a'?w.na:32-w.na}));
    const tot=S.warps.reduce((s,w)=>s+w.r.slots,0),eff=S.warps.reduce((s,w)=>s+w.r.useful,0)/(32*tot);
    const cap=i>=n-1?'Done: '+tot+' issue slots for 64 threads; '+U.pct(eff)+' of lane slots did useful work.':
      'Step '+(i+1)+': '+S.warps.map((w,wi)=>{const r=w.rows[i];if(!r)return 'warp '+wi+' has finished';
        const act=r.k==='c'?32:r.k==='a'?w.na:32-w.na;return 'warp '+wi+' issues <i>'+r.lab+'</i> with '+act+' of 32 lanes active'}).join('; ')+'.';
    $('sim-div-cap').innerHTML=cap;
    $('sim-div-out').innerHTML=U.stat('Issue slots so far',issued,'of '+tot+' in total')+U.stat('Useful lane slots',useful,'of '+(32*issued)+' issued')+
      U.stat('Lane utilisation',U.pct(issued?useful/(32*issued):1),'whole run: '+U.pct(eff))+
      U.stat('Warp 0 / warp 1 lanes in A',S.warps[0].na+' / '+S.warps[1].na,'the rest take B');
  }
  const A=U.anim({card:'sim-div-card',ctl:'sim-div-ctl',n:Math.max(S.warps[0].rows.length,S.warps[1].rows.length),draw,ms:800,label:'Issue slot'});
  function update(){S=cur();A.reset(Math.max(S.warps[0].rows.length,S.warps[1].rows.length))}
  U.seg($('sim-div-mode'),m=>{mode=m;$('sim-div-free').hidden=m!=='free';update();A.play()});
  $('sim-div-cond').addEventListener('change',e=>{cond=e.target.value;update()});
  $('sim-div-la').addEventListener('input',e=>{la=+e.target.value;$('sim-div-lav').textContent=la;update()});
  $('sim-div-lb').addEventListener('input',e=>{lb=+e.target.value;$('sim-div-lbv').textContent=lb;update()});
  U.onResize(()=>A.redraw());
  // predict answer number
  {const m=[0,1].map(w=>C.diverge(C.condMask('lane_parity',w),3,4,4,1));$('sim-div-ans-eff').textContent=U.pct((m[0].useful+m[1].useful)/(32*(m[0].slots+m[1].slots)))}
  // measured card
  if(D&&D.m&&D.m.diverge){
    const cs=D.m.diverge,mx=Math.max(...cs.map(c=>c.ms_max));
    const names={0:'Uniform: every lane takes A',1:'Per SIMD-group: 32 lanes agree',2:'Divergent: alternate lanes',3:'Divergent: random lanes'};
    const base=cs.find(c=>c.mode===1);
    const rows=cs.map(c=>'<div class="row"><span class="nm" title="'+names[c.mode]+'">'+names[c.mode]+'</span><span class="track"><span class="fill" style="width:'+(100*c.ms/mx)+'%;background:'+(c.mode>=2?'var(--c2)':'var(--c1)')+'"></span><span class="rng" style="left:'+(100*c.ms_min/mx)+'%;width:'+(100*(c.ms_max-c.ms_min)/mx)+'%"></span></span><span class="val">'+U.fmt(c.ms,2)+' ms</span></div>').join('');
    const div=cs.find(c=>c.mode===2),rnd=cs.find(c=>c.mode===3);
    const sim=C.diverge(C.condMask('lane_parity',0),0,1024,1024,0).slots/C.diverge(C.condMask('warp_parity',0),0,1024,1024,0).slots;
    $('sim-div-meas-body').innerHTML='<p class="small" style="margin:0 0 6px">A kernel of 1,048,576 threads in which each thread runs one of two loops of 1,024 dependent fused multiply-adds (512 iterations of 2), chosen by a branch. Only the condition changes. Time per launch, median of 3 runs of 7 trials each; the thin line is the full range.</p><div class="sim-hb">'+rows+'</div>'+
      '<p class="small" style="margin:6px 0 0">Splitting every SIMD-group in two costs <b>'+U.fmt(div.ms/base.ms,2)+'x</b> (alternate lanes) and <b>'+U.fmt(rnd.ms/base.ms,2)+'x</b> (random lanes) against the version where whole groups of 32 agree; the simulator predicts '+U.fmt(sim,1)+'x for a branch body this long. Choosing the branch per group of 32 costs nothing measurable ('+U.fmt(base.ms,2)+' against '+U.fmt(cs.find(c=>c.mode===0).ms,2)+' ms). The measured cost is a little under the model\'s; the model counts issue slots only, and Apple does not publish how its scheduler overlaps the two halves. Apple M1 Pro GPU, MLX '+D.meta.mlx+', '+D.meta.date+'; the laptop was shared with other work (load average '+D.meta.load_range[0]+' to '+D.meta.load_range[1]+').</p>';
  }
})();
