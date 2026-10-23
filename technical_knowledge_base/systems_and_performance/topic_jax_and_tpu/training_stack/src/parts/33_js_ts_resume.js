// ---- Reading section 5: five ways to resume (was the Resume lab tab) ----
(function(){
  const U=TSU,D=U.D,K=D.ckpt,root=document.getElementById('rs-card');if(!root||!K)return;
  const LAB={all:'everything',no_data:'no data iterator',no_opt:'no optimiser state',no_rng:'no RNG streams',params_only:'Params only'};
  const HAS={all:[1,1,1,1],no_data:[1,1,1,0],no_opt:[1,0,1,1],no_rng:[1,1,0,1],params_only:[1,0,0,0]};
  let v='all';const SAVE=K.save_at,TOT=K.total,NF=17;
  const svg=document.getElementById('rs-svg');
  function chips(){const h=HAS[v];document.getElementById('rs-chips').innerHTML=['Params','optimiser state (moments, step)','RNG streams (dropout)','grain iterator'].map((n,i)=>'<span class="rs-chip '+(h[i]?'y':'n')+'">'+n+'</span>').join('')}
  function draw(f){const W=Math.max(280,svg.clientWidth||600),H1=170,H2=90,L=46,R=8,T=8,gap=26;const Ht=T+H1+gap+H2+24;
    const upto=SAVE+Math.round((TOT-SAVE)*f/(NF-1));const ref=K.full_losses,res=K.variants[v].resumed_losses;
    const X=s=>L+s/(TOT-1)*(W-L-R);const lo=Math.min(...ref)-0.05,hi=Math.max(...ref)+0.05;const Y=y=>T+(1-(y-lo)/(hi-lo))*H1;
    let s='';[0,0.5,1].forEach(q=>{const yv=lo+(hi-lo)*q,yy=Y(yv);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/>'+RD.t(L-4,yy+3,yv.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})});
    s+='<line x1="'+X(SAVE)+'" x2="'+X(SAVE)+'" y1="'+T+'" y2="'+(T+H1+gap+H2)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>'+RD.t(X(SAVE)+3,T+10,'save, exit, restore',{fs:10,fill:'var(--bad)'});
    const path=(pts)=>pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('');
    s+='<path d="'+path(ref.slice(0,upto).map((y,i)=>[i,y]))+'" fill="none" stroke="var(--mute)" stroke-width="2.4" opacity=".7"/>';
    s+='<path d="'+path(res.slice(0,upto-SAVE).map((y,i)=>[SAVE+i,y]))+'" fill="none" stroke="var(--c2)" stroke-width="1.4"/>';
    // diff panel
    const y0=T+H1+gap,lmin=-7,lmax=-0.5,YD=d=>y0+(1-(Math.log10(Math.max(d,1e-7))-lmin)/(lmax-lmin))*H2;
    [-7,-5,-3,-1].forEach(e=>{const yy=YD(Math.pow(10,e));s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/>'+RD.t(L-4,yy+3,e===-7?'0':'1e'+e,{a:'end',fs:10,fill:'var(--mute)'})});
    const dd=res.slice(0,upto-SAVE).map((y,i)=>[SAVE+i,Math.abs(y-ref[SAVE+i])]);
    s+='<path d="'+dd.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+YD(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c2)" stroke-width="1.4"/>';
    s+=RD.t(L,y0-6,'|resumed loss - uninterrupted loss| (log; 0 drawn at the floor)',{fs:10.5,fill:'var(--mute)'});
    [0,40,80,120,159].forEach(st=>{s+=RD.t(X(st),Ht-6,st,{a:'middle',fs:10,fill:'var(--mute)'})});
    svg.innerHTML=RD.svg(W,Ht,s,'resumed run against uninterrupted run')+'<div class="ts-legend"><span><i style="background:var(--mute)"></i>uninterrupted run</span><span><i style="background:var(--c2)"></i>resumed: '+LAB[v]+'</span></div>';
    const V=K.variants[v],md=dd.length?Math.max(...dd.map(p=>p[1])):0;
    document.getElementById('rs-cap').innerHTML=f===0?'Steps 0 to '+(SAVE-1)+' ran in one process, then it saved and exited. A new process restores '+LAB[v]+' and continues.':
      'Up to step '+(upto-1)+': largest loss gap so far '+(md?U.ex(md,1):'0 (identical)')+'.'+(f===NF-1?(V.bitwise_equal?' Final parameters and optimiser state: equal bit for bit to the uninterrupted run.':' Final parameters differ by up to '+U.ex(V.param_maxdiff,1)+'.'):'');
    document.getElementById('rs-stats').innerHTML=RD.stat('first resumed loss gap',V.first_loss_diff?U.ex(V.first_loss_diff,1):'0','step '+SAVE)+RD.stat('largest loss gap',V.max_loss_diff?U.ex(V.max_loss_diff,1):'0','steps '+SAVE+' to '+(TOT-1))+RD.stat('bitwise equal',V.bitwise_equal?'yes':'no',K.n_arrays+' arrays');}
  chips();
  const A=RD.anim({card:'rs-card',ctl:'rs-ctl',n:NF,draw,ms:600,label:'Resumed step'});
  RD.seg(document.getElementById('rs-var'),m=>{v=m;chips();A.reset(NF)});
  // files
  const F=K.files,tot=F.reduce((a,f)=>a+f[1],0),big=F.filter(f=>f[1]>100000);
  document.getElementById('rs-fsum').textContent=F.length+' files, '+(tot/1e6).toFixed(2)+' MB, of which '+big.length+' data files hold '+(big.reduce((a,f)=>a+f[1],0)/1e6).toFixed(2)+' MB';
  document.getElementById('rs-files').innerHTML=F.map(f=>'<div class="r"><span>'+U.esc(f[0])+'</span><span>'+U.int(f[1])+'</span></div>').join('');
  document.getElementById('rs-rng').innerHTML=K.rng_leaves.map(l=>'<code>'+U.esc(l[0])+'</code> ('+l[1]+')').join(', ');
  RD.onResize(()=>A.redraw());
})();
