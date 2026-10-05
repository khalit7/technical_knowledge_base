// ---- Part 2, SIMD lanes tab: one 16-element block of the dot product, scalar vs -O2 vs NEON ----
(function(){
  const X=window.CBX,CB=X.CB,f=X.fmt,$=id=>document.getElementById(id);
  if(!$('cb-sd-svg'))return;
  const N=16,a=[...Array(N)].map((_,i)=>(i%17)*0.25),b=[...Array(N)].map((_,i)=>(i%13)*0.5),p=a.map((x,i)=>x*b[i]);
  let mode='scalar';
  // events: {cyc, txt, hi:[element indices], s0, lanes:[[4]x4] or null, prod:bool}
  function events(){const E=[];
    if(mode==='scalar'){let s=0;for(let k=0;k<N;k++){s+=p[k];E.push({cyc:4*(k+1),hi:[k],s0:s,ins:'fmadd s0, s1, s2, s0',txt:'element '+k+': s0 = s0 + a['+k+'] x b['+k+'] = '+f(s,2)+'. It needs the previous s0, so it waits 4 cycles for the previous fmadd.'})}}
    else if(mode==='auto'){E.push({cyc:4,hi:[...Array(N).keys()],prod:true,s0:0,ins:'4 x fmul.4s',txt:'four <code>fmul.4s</code> instructions multiply all 16 pairs, 4 per instruction, all at the same time (independent): 4 cycles.'});
      let s=0;for(let k=0;k<N;k++){s+=p[k];E.push({cyc:4+3*(k+1),hi:[k],prod:true,s0:s,ins:'fadd s0, s0, s'+(k%4),txt:'add product '+k+' into s0 = '+f(s,2)+', in source order: one lane at a time, each waiting 3 cycles for the previous add.'})}}
    else{const L=[0,1,2,3].map(r=>[0,1,2,3].map(l=>p[4*r+l]));
      E.push({cyc:4,hi:[...Array(N).keys()],lanes:L,ins:'4 x fmla.4s',txt:'four <code>fmla.4s</code>, one per accumulator v0..v3, each doing 4 multiply-adds: 16 at once, 4 cycles. In a long loop this is the whole cost per 16 elements.'});
      const r1=[0,1,2,3].map(l=>L[0][l]+L[1][l]),r2=[0,1,2,3].map(l=>L[2][l]+L[3][l]);
      E.push({cyc:7,hi:[],lanes:[r1,L[1],r2,L[3]],red:[0,2],ins:'fadd.4s v0, v0, v1; fadd.4s v2, v2, v3',txt:'reduction, once at the end of the loop: v0 += v1 and v2 += v3, lane by lane (3 cycles).'});
      const r3=[0,1,2,3].map(l=>r1[l]+r2[l]);
      E.push({cyc:10,hi:[],lanes:[r3,L[1],r2,L[3]],red:[0],ins:'fadd.4s v0, v0, v2',txt:'v0 += v2: four partial sums left, one per lane.'});
      const q=[r3[0]+r3[1],r3[2]+r3[3]];
      E.push({cyc:13,hi:[],lanes:[[q[0],q[1],q[0],q[1]],L[1],r2,L[3]],red:[0],pair:true,ins:'faddp.4s',txt:'pairwise add: lanes (0+1) and (2+3).'});
      E.push({cyc:16,hi:[],lanes:[[q[0]+q[1],0,0,0],L[1],r2,L[3]],red:[0],s0:q[0]+q[1],ins:'faddp.2s s0, v0',txt:'last pairwise add: the dot product, '+f(q[0]+q[1],2)+', the same value as the scalar loop (these small numbers add exactly).'})}
    return E}
  let E=events();
  function draw(i){const e=E[i]||E[0],el=$('cb-sd-svg'),W=Math.max(300,Math.min(860,el.clientWidth||600)),lw=46,cw=(W-lw-6)/N,ch=22;
    let h='',y=4;const cell=(x,y,w,txt,fill,stroke,op)=>'<rect x="'+x+'" y="'+y+'" width="'+(w-2)+'" height="'+ch+'" rx="3" style="fill:'+fill+';opacity:'+(op==null?1:op)+(stroke?';stroke:'+stroke+';stroke-width:2':'')+'"/>'+(txt!==''?RD.t(x+(w-2)/2,y+15,txt,{a:'middle',fs:cw<26?8.5:10.5}):'');
    const lab=(y,t)=>RD.t(lw-6,y+15,t,{a:'end',fs:11,fill:'var(--mute)'});
    const H=new Set(e.hi),tf=v=>cw<26?String(+v.toFixed(1)):String(+v.toFixed(2));
    h+=lab(y,'a');for(let k=0;k<N;k++)h+=cell(lw+k*cw,y,cw,tf(a[k]),'var(--acc2)',H.has(k)?'var(--bad)':'',H.has(k)?1:.6);y+=ch+4;
    h+=lab(y,'b');for(let k=0;k<N;k++)h+=cell(lw+k*cw,y,cw,tf(b[k]),'var(--acc2)',H.has(k)?'var(--bad)':'',H.has(k)?1:.6);y+=ch+10;
    if(mode==='auto'){h+=lab(y,'a x b');for(let k=0;k<N;k++)h+=cell(lw+k*cw,y,cw,e.prod?tf(p[k]):'','var(--open2)',H.has(k)&&i>0?'var(--bad)':'',1);
      for(let r=0;r<4;r++)h+=RD.t(lw+r*4*cw+2*cw,y+ch+12,'v'+(r+1),{a:'middle',fs:10,fill:'var(--mute)'});y+=ch+22}
    if(mode==='neon'){const L=e.lanes;for(let r=0;r<4;r++){for(let l=0;l<4;l++){const red=e.red&&e.red.includes(r);h+=cell(lw+(4*r+l)*cw,y,cw,tf(L[r][l]),'var(--closed2)',red?'var(--bad)':'',e.red&&!red?.35:1)}
        h+=RD.t(lw+r*4*cw+2*cw,y+ch+12,'v'+r+' (4 lanes)',{a:'middle',fs:10,fill:'var(--mute)'})}h+=lab(y,'acc');y+=ch+22}
    if(mode!=='neon'||e.s0!=null){const w=Math.min(160,W-lw-10);h+=lab(y,'s0')+cell(lw,y,w,e.s0!=null?String(+e.s0.toFixed(2)):'0','var(--hl)','var(--ink)',1);y+=ch+6}
    el.innerHTML='<svg viewBox="0 0 '+W+' '+y+'" width="'+W+'" height="'+y+'" role="img" aria-label="SIMD lanes">'+h+'</svg>';
    const ns=e.cyc/3.2;
    $('cb-sd-cap').innerHTML='<b>Step '+(i+1)+' of '+E.length+', cycle '+e.cyc+':</b> <code>'+e.ins+'</code>. '+e.txt;
    const per={scalar:4,auto:3,neon:0.25}[mode],meas={scalar:'l1_scalar',auto:'l1_auto',neon:'l1_neon'}[mode];
    $('cb-sd-stats').innerHTML=RD.stat('Cycles so far (model)',e.cyc,f(ns,1)+' ns at 3.2 GHz')+RD.stat('Steady state (model)',per+' cycles','per element: '+f(per/3.2)+' ns')+RD.stat('Measured',f(CB.dot.v[meas].runs[0])+' ns','per element, in L1')}
  const opt={card:'cb-sd-card',ctl:'cb-sd-ctl',n:E.length,ms:900,label:'Instruction step',draw};
  const A=RD.anim(opt);
  RD.seg($('cb-sd-mode'),m=>{mode=m;E=events();opt.ms=m==='neon'?1600:m==='auto'?650:800;A.reset(E.length);A.play()});
  // table of all four ways
  const D=CB.dot.v,rows=[['scalar','scalar'],['auto','-O2'],['fm','-O2 -ffast-math'],['neon','NEON intrinsics']];
  $('cb-sd-tab').innerHTML='<thead><tr><th>Version</th><th class="num">L1, ns/element</th><th class="num">GFLOP/s</th><th class="num">DRAM, ns/element</th><th class="num">GB/s</th></tr></thead><tbody>'+
    rows.map(([k,l])=>'<tr><td>'+l+'</td><td class="num">'+f(D['l1_'+k].runs[0])+'</td><td class="num">'+f(2/D['l1_'+k].runs[0],1)+'</td><td class="num">'+f(D['dram_'+k].runs[0])+'</td><td class="num">'+f(8/D['dram_'+k].runs[0],0)+'</td></tr>').join('')+'</tbody>';
  X.onRender('t-cb-simd',()=>A.redraw());X.onResize('t-cb-simd',()=>A.redraw());
})();
