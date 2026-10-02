// ---- Run the kernel: the animation, the counters at the paper's scale, and the block-size bound ----
(function(){
const COL={Q:'var(--c1)',K:'var(--c2)',V:'var(--c3)',O:'var(--c4)',S:'var(--c5)',P:'var(--c6)',l:'var(--mute)'};
const KX={N:32,d:4,B:8,md:false,seed:7,sims:{}};
const modes={std:[],fa:[],fa2:[]};
function rebuild(){['std','fa','fa2'].forEach(m=>{const s=FA.simulate(m,KX.N,KX.d,KX.B,KX.md,KX.seed);KX.sims[m]=s;modes[m].length=0;s.steps.forEach(x=>modes[m].push(x))})}
rebuild();
const total=m=>{const s=KX.sims[m].steps;const z=s[s.length-1];return z.rd+z.wr};
// layout: returns positions of every HBM matrix and the SRAM band at width w
function layout(w,mode){const N=KX.N,d=KX.d,g=12,narrow=w<640;const stc=mode==='fa2'?1:2;let cs,pos={},y0=36,h;
  if(!narrow){cs=Math.min(11,Math.floor((w-8*g)/(4*d+stc+2*N)));let x=4;['Q','K','V','O'].forEach(m=>{pos[m]={x,y:y0,w:d*cs,h:N*cs};x+=d*cs+g});pos.l={x,y:y0,w:stc*cs,h:N*cs};x+=stc*cs+g+6;
    pos.S={x,y:y0,w:N*cs,h:N*cs};x+=N*cs+g;pos.P={x,y:y0,w:N*cs,h:N*cs};h=y0+N*cs}
  else{cs=Math.max(4,Math.min(Math.floor((w-g-8)/(2*N)),Math.floor((w-5*g)/(4*d+stc))));let x=4;['Q','K','V','O'].forEach(m=>{pos[m]={x,y:y0,w:d*cs,h:N*cs};x+=d*cs+g});pos.l={x,y:y0,w:stc*cs,h:N*cs};
    const y1=y0+N*cs+38;pos.S={x:4,y:y1,w:N*cs,h:N*cs};pos.P={x:4+N*cs+g,y:y1,w:N*cs,h:N*cs};h=y1+N*cs}
  return {cs,pos,hbmH:h+8,narrow}}
function grid(p,cs,rows,cols,c,op){let s=rc(p.x,p.y,p.w,p.h,c,{r:1,op});if(cs>=6){let ln='';for(let i=1;i<rows;i++)ln+='M'+p.x+' '+(p.y+i*cs)+'h'+p.w;for(let j=1;j<cols;j++)ln+='M'+(p.x+j*cs)+' '+p.y+'v'+p.h;s+='<path d="'+ln+'" stroke="var(--bg)" stroke-width="'+(cs>=9?1:.6)+'" opacity=".7"/>'}return s}
function draw(mode,k,e,w){const sim=KX.sims[mode],S=sim.steps[k],N=KX.N,d=KX.d,B=KX.B;const L=layout(w,mode),cs=L.cs,P=L.pos;let s='';
  // HBM band
  const bandH=L.hbmH+(mode==='std'?2:14);s+=rc(0,0,w,bandH,'var(--soft)',{r:8});s+=tx(6,13,'HBM: large and slow',{fs:11,c:'var(--mute)',w:600});
  const names={Q:'Q',K:'K',V:'V',O:'O',l:mode==='fa2'?'L':'ℓ, m',S:'S',P:'P'};
  ['Q','K','V','O','l'].forEach(m=>{const p=P[m];let have=m==='l'?!!S.have.l:(m==='O'?!!S.have.O||mode==='fa':true);
    if(m==='O'&&mode==='std')have=!!S.have.O;
    if(mode==='std'&&m==='l'){return}
    s+=tx(p.x+p.w/2,p.y-4,names[m],{fs:11,a:'middle',c:COL[m],w:600});
    let fillRows=N;if(mode==='fa2'&&(m==='O'||m==='l'))fillRows=S.oRows==null?0:S.oRows;
    s+=rc(p.x,p.y,p.w,p.h,'none',{s:COL[m],da:'3 2',r:1,op:.8});
    if(m==='O'&&mode==='std'&&!have){}else if(fillRows>0)s+=grid({x:p.x,y:p.y,w:p.w,h:fillRows*cs},cs,fillRows,m==='l'?(mode==='fa2'?1:2):d,COL[m],.55)});
  // follow-row marker
  if(mode!=='std'){const y=P.Q.y+(sim.row+.5)*cs;s+=tx(P.Q.x-1,y+4,'',{fs:11});s+=ln2(P.O.x-3,y,P.O.x+P.O.w+3,y,'var(--ink)',{sw:1.6})+tx(P.O.x+P.O.w/2,P.O.y+P.O.h+13,'row '+(sim.row+1),{fs:11,a:'middle',c:'var(--ink)'})}
  // S and P
  ['S','P'].forEach(m=>{const p=P[m];s+=tx(p.x,p.y-5,mode==='std'?m+' (N × N)':(m==='S'?(L.narrow?'S: tiles on chip only':'S: tiles computed on chip only'):'P: never stored'),{fs:11,c:COL[m],w:600});
    s+=rc(p.x,p.y,p.w,p.h,'none',{s:COL[m],da:'4 3',r:1});
    if(mode==='std'&&S.have[m])s+=grid(p,cs,N,N,COL[m],.5);
    if(mode!=='std'&&m==='S'){(S.tiles||[]).forEach(t=>{s+=rc(p.x+t[1]*B*cs,p.y+t[0]*B*cs,B*cs,B*cs,COL.S,{r:0,op:.16})});
      if(S.cur){const t=S.cur;s+=rc(p.x+t[1]*B*cs,p.y+t[0]*B*cs,B*cs,B*cs,COL.S,{r:0,op:.55*(.4+.6*e)})}}
    if(mode!=='std'&&m==='P')s+=tx(p.x+p.w/2,p.y+p.h/2+4,'0 values in HBM',{fs:11,a:'middle',c:'var(--mute)'})});
  // SRAM band
  const y2=bandH+10,slots=S.sram||[];let x=6,yy=y2+36,rowH=0;const sp={};
  const items=slots.map(z=>({n:z[0],r:z[1],c:z[2],k:z[3]}));
  items.forEach(it=>{const ww=it.c*cs,hh=it.r*cs;if(x+ww>w-6&&x>6){x=6;yy+=rowH+18;rowH=0}it.x=x;it.y=yy;x+=Math.max(ww,it.n.length*6.6)+14;rowH=Math.max(rowH,hh)});
  const sramH=(items.length?yy+rowH:y2+40)-y2+10;
  s+=rc(0,y2,w,Math.max(46,sramH),'var(--acc2)',{r:8,op:.6});s+=tx(6,y2+13,'SRAM: on chip, small and fast'+(items.length?'':' (empty)'),{fs:11,c:'var(--mute)',w:600});
  items.forEach(it=>{sp[it.k]=sp[it.k]||it;s+=tx(it.x,it.y-3,it.n,{fs:11,c:COL[it.k]});s+=grid({x:it.x,y:it.y,w:it.c*cs,h:it.r*cs},cs,it.r,it.c,COL[it.k],.85)});
  // events: reads fly down into SRAM, writes fly up into HBM
  (S.ev||[]).forEach(ev=>{const p=P[ev.m];if(!p)return;const r0=ev.r0==null?0:ev.r0,r1=ev.r1==null?(ev.m==='S'||ev.m==='P'?N:N):Math.min(N,ev.r1);
    const cols=ev.m==='S'||ev.m==='P'?N:(ev.m==='l'?(mode==='fa2'?1:2):d);const hx=p.x,hy=p.y+r0*cs,hw=cols*cs,hh=(r1-r0)*cs;
    if(ev.k==='k'){s+=rc(hx-2,hy-2,hw+4,hh+4,'none',{s:'var(--good)',sw:2.2,r:2});return}
    const slot=sp[ev.m==='l'?'l':ev.m];
    if(mode==='std'){if(ev.k==='r')s+=rc(hx-2,hy-2,hw+4,hh+4,'none',{s:'var(--acc)',sw:2.4,r:2});else{s+=rc(hx,hy,hw,hh*e,'var(--hl)',{r:0,op:.75});s+=rc(hx-2,hy-2,hw+4,hh+4,'none',{s:'var(--bad)',sw:2.4,r:2})}return}
    if(!slot){s+=rc(hx-2,hy-2,hw+4,hh+4,'none',{s:ev.k==='r'?'var(--acc)':'var(--bad)',sw:2,r:2});return}
    const a=ev.k==='r'?{x:hx,y:hy}:{x:slot.x,y:slot.y},b=ev.k==='r'?{x:slot.x,y:slot.y}:{x:hx,y:hy};
    const fx=a.x+(b.x-a.x)*e,fy=a.y+(b.y-a.y)*e,fw=slot.c*cs,fh=slot.r*cs;
    s+=rc(hx-2,hy-2,hw+4,hh+4,'none',{s:ev.k==='r'?'var(--acc)':'var(--bad)',sw:2,r:2});
    if(e<1)s+=rc(fx,fy,fw,fh,COL[ev.m],{r:1,op:.9,s:ev.k==='r'?'var(--acc)':'var(--bad)',sw:1.5})});
  const H=y2+Math.max(46,sramH)+4;
  return svgW(w,H,s,'HBM and SRAM contents at this step')}
function counters(mode,k){const S=KX.sims[mode].steps[k],tot=S.rd+S.wr,std=total('std'),me=total(mode),end=k===KX.sims[mode].steps.length-1;
  const onchip=(S.sram||[]).reduce((a,z)=>a+z[1]*z[2],0);
  let h=stat('HBM traffic so far',fmt(tot)+' values','reads '+fmt(S.rd)+' · writes '+fmt(S.wr));
  h+=stat('Of which N × N matrices',fmt(S.big),mode==='std'?'S and P crossing HBM':'none: tiles stay on chip');
  h+=stat('Whole run, against standard',fmt(me)+' / '+fmt(std),mode==='std'?'this is the baseline':(std/me).toFixed(2)+'× fewer values moved');
  h+=stat('Extra state held in HBM',fmt(S.extra)+' values',mode==='std'?'S and P, 2N²':mode==='fa'?'ℓ and m, 2N':'L, one per row');
  h+=stat('On chip now',fmt(onchip)+' values',mode==='std'?'one block of each operand':'K, V, Q, O blocks, the S tile, statistics');
  h+=stat(end?'Max |O − O_standard|':'Matrix-multiply FLOPs so far',end?(mode==='std'?'0 (it is the reference)':sci(S.err,1)):fmt(S.flops),end?'float64 rounding only':'the same total in every mode');
  // the followed row
  const R=$('kxRow');if(mode==='std'){R.innerHTML='';}else{const sim=KX.sims[mode],t=S.tr,r=sim.row;
    let x='<b>Row '+(r+1)+'</b> (the row whose running maximum rises most often; marked in O): ';
    if(S.ri){const q=S.ri;x+='old maximum m = '+(q.mo===-Infinity?'−∞':q.mo.toFixed(3))+', this block\'s maximum m̃ = '+q.bm.toFixed(3)+', new m = '+q.mn.toFixed(3)+(q.mo===-Infinity?'; first block, nothing to rescale.':(q.mn>q.mo?'; the maximum rose, so everything accumulated so far is multiplied by e^(m_old − m_new) = <b>'+q.fac.toFixed(4)+'</b>.':'; the maximum did not move, so the factor is e⁰ = 1.'))+' Running sum ℓ = '+t.l.toFixed(4)+'. '}
    else x+='m = '+(t.m===-Infinity?'−∞':t.m.toFixed(3))+', ℓ = '+t.l.toFixed(4)+'. ';
    x+=(mode==='fa2'&&!S.end&&!(S.fin&&S.rowb)?'Unnormalised output Õ = ':'Output so far O = ')+'['+t.o.map(v=>v.toFixed(3)).join(', ')+']; final answer ['+sim.Oref[r].map(v=>v.toFixed(3)).join(', ')+'].';
    R.innerHTML=x}
  return h}
const an=makeAnim({id:'kx',modes,mode:'std',draw,counters,dur:2600});
function reset(){rebuild();if(an){an.st.k=0;an.st.t=RM?1:0;an.draw()}}
$('kxB').addEventListener('change',e=>{KX.B=+e.target.value;reset()});
$('kxMd').addEventListener('change',e=>{KX.md=e.target.checked;reset()});
$('kxNew').addEventListener('click',()=>{KX.seed=(KX.seed*1103515245+12345)%2147483647||7;reset()});
window.__kx={KX,an,rebuild};

// ---- the same counters at the paper's scale ----
function scale(){const N=2**(+$('scN').value),d=+$('scD').value,Mkb=16*(+$('scM').value),M=Mkb*1024/2,bsel=+$('scB').value,BH=+$('scH').value,s=(+$('scS').value)/20;
  $('scNv').textContent=fmt(N);$('scMv').textContent=Mkb+' KB';$('scSv').textContent=s===1?'1 (dense)':s.toFixed(2);
  const r=FA.rule(M,d),Bc=bsel||r.Bc,by=2,G=v=>v*BH*by/1e9;
  const std=G(FA.stdF(N,d)+FA.stdB(N,d)),stdmd=G(FA.stdF(N,d,1)+FA.stdB(N,d,1)),fa=G(FA.faF(N,d,Bc,s)+FA.faB(N,d,Bc,s));
  const fl=FA.mm(N,d)*BH,stdF=6*fl,faF=7*fl*(s<1?s:1);
  const rows=[['Standard (Alg. 0 + 3)',std,'var(--c2)'],['Standard + mask, dropout',stdmd,'var(--c5)'],['FlashAttention'+(s<1?', sparse':' (Alg. 1 + 4)'),fa,'var(--acc)']];
  const def=N===1024&&d===64&&Mkb===192&&!bsel&&BH===1024&&s===1;
  if(def)rows.push(['Figure 2: standard',40.3,'var(--mute)'],['Figure 2: FlashAttention',4.4,'var(--mute)']);
  const host=$('scSvg');fit(host,W=>{const mx=Math.max(...rows.map(x=>x[1])),lw=Math.min(190,W*.5),bw=W-lw-70;let h='';
    rows.forEach((x,i)=>{const y=6+i*24;h+=tx(lw-6,y+13,x[0],{fs:11,a:'end'})+rc(lw,y+2,Math.max(1,bw*x[1]/mx),15,x[2],{op:x[2]==='var(--mute)'?.5:.85})+tx(lw+Math.max(1,bw*x[1]/mx)+4,y+13,x[1]<10?x[1].toFixed(2):x[1].toFixed(1),{fs:11})});
    h+=tx(lw+bw,6+rows.length*24+10,'GB moved across HBM, forward + backward',{fs:11,a:'end',c:'var(--mute)'});
    host.innerHTML=svgW(W,rows.length*24+24,h,'HBM traffic by method')});
  const T=Math.ceil(N/Bc);
  $('scO').innerHTML=stat('Block size',fmt(Bc)+' × '+fmt(Math.min(bsel?Bc:r.Br,N)),'B_c × B_r; T_c = '+T+' passes over Q and O')+stat('HBM traffic ratio',(std/fa).toFixed(1)+'×','standard ÷ FlashAttention'+(s<1?' (block-sparse)':''))+
    stat('N × N matrix, per copy',fmtGB(N*N*BH*by/1e9),'what standard attention stores (S and P); FlashAttention keeps two values per row instead, '+fmtGB(2*N*BH*by/1e9))+
    stat('Time at bandwidth',(std/1.5).toFixed(std/1.5<10?2:1)+' / '+(fa/1.5).toFixed(fa/1.5<10?2:1)+' ms','standard / FlashAttention, at 1.5 TB/s')+
    stat('Time at peak',(stdF/312e12*1e3).toFixed(2)+' / '+(faF/312e12*1e3).toFixed(2)+' ms','matrix multiplies at 312 TFLOPS; FlashAttention recomputes S in the backward pass');
  $('scRep').innerHTML=def?'<b>Defaults against Figure 2.</b> FlashAttention: '+fa.toFixed(2)+' GB from Algorithms 1 and 4 against the printed 4.4 GB, close but a reconstruction (the paper does not give its block sizes; 4.4 GB is 2.8 passes over Q and O under this count). Standard: '+std.toFixed(1)+' GB from Algorithms 0 and 3 against the printed 40.3 GB; the floor does not reproduce it, and only counting masking and dropout as separate passes forward and backward brings it to '+stdmd.toFixed(1)+' GB. The paper does not say how it measured either. The time at bandwidth explains most of the printed 41.7 ms (26.9 ms for 40.3 GB); at 7.3 ms FlashAttention is no longer limited by HBM alone.':
    'Move back to N = 1,024, d = 64, 192 KB, the rule, 16 × 64 and density 1 to compare with Figure 2.'}
const fmtGB=v=>v>=1?v.toFixed(v>=100?0:2)+' GB':(v*1e3).toFixed(v*1e3>=10?0:1)+' MB';
['scN','scM','scS'].forEach(id=>$(id).addEventListener('input',scale));['scD','scB','scH'].forEach(id=>$(id).addEventListener('change',scale));

// ---- block size against the two lower bounds (forward pass of Figure 2's workload) ----
function blocks(){const eff=(+$('bkE').value)/100;$('bkEv').textContent=Math.round(eff*100)+'%';const N=1024,d=64,BH=1024;
  const io=b=>FA.faF(N,d,b)*BH*2/1.5e12*1e3,cp=2*FA.mm(N,d)*BH/(312e12*eff)*1e3;const bs=[32,64,128,256,512,1024];
  const host=$('bkSvg');fit(host,W=>{const H=220,f=logFrame({W,H,pl:46,pr:96,pt:12,pb:34,x:[32,1024],y:[.2,20],xt:bs.map(b=>[b,String(b)]),yt:[[.2,'0.2'],[.5,'0.5'],[1,'1'],[2,'2'],[5,'5'],[10,'10'],[20,'20']],xl:'block size B_c (rows of K and V per block)',yl:'ms'});let h=f.s;
    let pth='';for(let b=32;b<=1024;b*=1.06){pth+=(pth?'L':'M')+f.lx(b).toFixed(1)+' '+f.ly(io(b)).toFixed(1)}
    h+='<path d="'+pth+'" fill="none" stroke="var(--acc)" stroke-width="2.2"/>';
    h+=ln2(f.lx(32),f.ly(cp),f.lx(1024),f.ly(cp),'var(--c2)',{sw:2.2,da:'6 3'});
    // where the two cross
    let bx=null;for(let b=32;b<=1024;b++){if(io(b)<=cp){bx=b;break}}
    if(bx){h+=ln2(f.lx(bx),12,f.lx(bx),H-34,'var(--mute)',{da:'2 3'})+tx(f.lx(bx)+4,24,'cross at B_c ≈ '+bx,{fs:11,c:'var(--mute)'})}
    h+=tx(W-92,f.ly(io(1024))+4,'HBM bytes ÷ 1.5 TB/s',{fs:11,c:'var(--acc)'})+tx(W-92,f.ly(cp)-6,'FLOPs ÷ achieved',{fs:11,c:'var(--c2)'});
    host.innerHTML=svgW(W,H,h,'Forward-pass lower bounds against block size');
    $('bkRep').innerHTML='Forward pass only, Figure 2\'s workload, B_r = 64. The HBM line is Algorithm 1\'s count (T_c = ⌈N / B_c⌉ passes over Q and O); the FLOPs line is the two matrix multiplies, '+(2*FA.mm(N,d)*BH/1e9).toFixed(0)+' GFLOP, at the share of peak you choose. Runtime cannot sit below either line, so past the crossing (B_c ≈ '+(bx||'beyond 1024')+' here) bigger blocks buy nothing. Illustrative: the default 35% sits inside the 25 to 40% of peak that the '+A('https://arxiv.org/abs/2307.08691','FlashAttention-2')+' paper reports for the original FlashAttention.'})}
$('bkE').addEventListener('input',blocks);
onTab('t-run',()=>{scale();blocks();if(an)an.draw()});
})();
