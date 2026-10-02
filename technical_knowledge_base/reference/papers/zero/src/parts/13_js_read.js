// ---- The paper tab: memory accounting bar, Figure 1 live, communication bars, super-linear memory ----
(function(){
// 16 bytes per parameter, to scale
function mem(){const psi=+$('memM').value*1e9,k=+$('memK').value;$('memKv').textContent=k;
  fit($('memSvg'),w=>{const segs=[['fp16 parameters',2,COL.p],['fp16 gradients',2,COL.g],['fp32 optimizer states',k,COL.o]],tot=4+k,maxT=18;
    const u=(w-4)/maxT;let s='',x=0;segs.forEach(([n,b,c])=>{if(b>0)s+=rc(x,6,b*u-1,26,c,{r:3});x+=b*u});
    s+=ln2(16*u,0,16*u,40,'var(--ink)',{da:'3 3',op:.6})+(16*u+190<w?tx(16*u+4,48,'16 bytes: mixed-precision Adam',{fs:11,c:'var(--mute)'}):tx(16*u-4,48,'16 bytes: mixed-precision Adam',{fs:11,a:'end',c:'var(--mute)'}));
    const L=legend(segs.filter(q=>q[1]>0).map(([n,b,c])=>[n+' '+b+' B',c]),0,72,w);s+=L.s;
    $('memSvg').innerHTML=svgW(w,72+L.h,s,'Model-state bytes per parameter')});
  const tot=(4+k)*psi;
  $('memO').innerHTML=stat('fp16 weights alone',gb(2*psi)+' GB','2 bytes per parameter')+stat('Model states, K = '+k,gb(tot)+' GB',(4+k)+' bytes per parameter')+stat('Optimizer share',fmt(100*k/(4+k),0)+'%','of the model states')+stat('32 GB V100s just to hold them',fmt(Math.ceil(tot/32e9)),'if they could be split, which plain DP cannot')}
['memM','memK'].forEach(id=>{$(id).addEventListener('input',mem);$(id).addEventListener('change',mem)});
// Figure 1: rows are stages, three GPUs shown, bars to scale against the baseline
function f1(){const psi=+$('f1M').value*1e9,nd=ND_STEPS[+$('f1N').value];$('f1Nv').textContent=nd;
  fit($('f1Svg'),w=>{const lw=Math.min(118,w*.3),gw=w-lw-6,cols=nd>=3?3:nd,cw=(gw-(cols-1)*10)/cols,base=16*psi,rh=34;let s='';
    const names=nd>=3?['GPU 0','GPU i','GPU '+(nd-1)]:nd===2?['GPU 0','GPU 1']:['GPU 0'];
    names.forEach((n,i)=>s+=tx(lw+i*(cw+10)+cw/2,12,n,{fs:11,a:'middle',c:'var(--mute)'}));
    STAGES.forEach((st,r)=>{const y=20+r*(rh+20),[p,g,o]=zParts(psi,nd,st),tot=p+g+o;
      s+=tx(0,y+14,SSHORT[st],{fs:12,w:600})+tx(0,y+29,gb(tot)+' GB',{fs:11,c:'var(--mute)'});
      for(let i=0;i<cols;i++){const x0=lw+i*(cw+10);
        // full-width strip is the baseline 16 psi; each GPU's own share is placed at its partition's position
        const slot=i===0?0:i===cols-1?nd-1:Math.floor(nd/2),f=cw/base;
        let x=x0;[[p,COL.p,st==='os_g_p'],[g,COL.g,st==='os_g'||st==='os_g_p'],[o,COL.o,st!=='dp']].forEach(([v,c,sh],j)=>{const full=(j===2?12:2)*psi*f;
          s+=rc(x,y,full,rh-12,'none',{r:2,s:'var(--line)'});
          const ww=Math.max(sh?1.5:0,v*f),off=sh?(full-ww)*(slot/Math.max(1,nd-1)):0;s+=rc(x+off,y,ww,rh-12,c,{r:1});x+=full})}});
    $('f1Svg').innerHTML=svgW(w,20+4*(rh+20),s,'Figure 1: per-GPU model states by ZeRO stage')});
  const v=STAGES.map(st=>gb(zStates(psi,nd,st)));
  $('f1Rep').innerHTML='Per GPU: '+STAGES.map((st,i)=>SSHORT[st]+' '+v[i]+' GB').join(', ')+'. '+(+$('f1M').value===7.5&&nd===64?'<b>Defaults reproduce Figure 1</b> (120, 31.4, 16.6 and 1.9 GB) independently, from the formulas.':'Figure 1 is 7.5B at N<sub>d</sub> = 64.')+' Each outlined strip is the baseline\'s full copy of that state; the filled part is what this GPU keeps, placed where its partition sits. A sliver this thin is drawn at least 1.5 px wide so it stays visible.'}
['f1M','f1N'].forEach(id=>{$(id).addEventListener('input',f1);$(id).addEventListener('change',f1)});
// communication volume per step, per process
PRED_REVEAL['pr-comm']=()=>fit($('cmSvg'),w=>{const rows=[['Baseline DP',[['RS',COL.g],['AG',COL.p]]],['ZeRO-1, ZeRO-2',[['RS',COL.g],['AG',COL.p]]],['ZeRO-3',[['AG fwd',COL.p],['AG bwd',COL.p],['RS',COL.g]]]];
  const lw=Math.min(110,w*.3),u=(w-lw-34)/3,rh=24;let s='';
  rows.forEach(([n,segs],r)=>{const y=r*(rh+12);s+=tx(0,y+16,n,{fs:12,w:600});let x=lw;segs.forEach(([t,c],i)=>{s+=rc(x,y,u-2,rh,c,{r:3,op:i%2?.8:1});s+=tx(x+(u-2)/2,y+16,t,{fs:11,a:'middle',c:'#fff',w:600});x+=u});s+=tx(x+4,y+16,segs.length+'Ψ',{fs:12,w:600})});
  $('cmSvg').innerHTML=svgW(w,3*(rh+12),s,'Communication volume per step')});
// super-linear: memory freed per GPU as the cluster grows (Table 6 runs)
PRED_REVEAL['pr-sl']=()=>fit($('slSvg'),w=>{const R=RC.fig3,H=170,pl=44,pb=34,pt=10,bw=(w-pl-10)/R.length,mx=24;let s='';
  [0,8,16,24].forEach(v=>{const y=pt+(H-pt-pb)*(1-v/mx);s+=ln2(pl,y,w-4,y,'var(--line)')+tx(pl-6,y+4,v+' GB',{fs:11,a:'end',c:'var(--mute)'})});
  R.forEach((r,i)=>{const x=pl+i*bw+bw*.18,hh=(H-pt-pb)*r.states_GB/mx,y=H-pb-hh;s+=rc(x,y,bw*.64,hh,'var(--c3)',{r:3});
    s+=tx(x+bw*.32,y-4,fmt(r.states_GB,1)+' GB',{fs:11,a:'middle'})+tx(x+bw*.32,H-pb+14,r.gpus+' GPUs',{fs:11,a:'middle'})+tx(x+bw*.32,H-pb+28,'batch '+r.batch,{fs:11,a:'middle',c:'var(--mute)'})});
  $('slSvg').innerHTML=svgW(w,H,s,'Model-state memory per GPU for the 60B runs')});
onTab('t-read',()=>{mem();f1();['cmSvg','slSvg'].forEach(id=>refit($(id)))});
})();
