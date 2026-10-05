// ---- Reading section 1: one warp's load, before and after (AoS/SoA, misaligned/aligned, 4-byte/16-byte); predict boxes; measured bars ----
(function(){
  const D=window.MHD,M=window.MHM,f=MC.fmtN;
  const MODES={
    aos:{name:['Array of structs: p[i].x, 32-byte structs','Struct of arrays: x[i]'],p:[{w:4,stride:32},{w:4,stride:4}],
      why:['Every lane wants 4 bytes, but each sits in its own 32-byte struct, so in its own sector.','The x values are now adjacent: 32 lanes, 128 contiguous bytes.']},
    mis:{name:['Contiguous floats starting 4 bytes past a sector boundary','Contiguous floats starting on a sector boundary'],p:[{w:4,stride:4,off:4},{w:4,stride:4,off:0}],
      why:['The 128 bytes straddle five sectors: the last lane spills into a fifth.','The same 128 bytes fill exactly four sectors.']},
    vec:{name:['512 bytes as four loads of 4 bytes per lane','512 bytes as one load of 16 bytes per lane (float4)'],p:[{w:4,stride:4,instr:4},{w:16,stride:16,instr:1}],
      why:['Four warp instructions, each fetching 4 sectors.','One warp instruction: each lane takes 16 bytes, the warp 16 sectors at once.']}};
  let mode='aos',ba=0,res=null,rows=1;
  const svgEl=document.getElementById('rd-wsvg'),cnt=document.getElementById('rd-wcnt'),cap=document.getElementById('rd-wcap');
  function setup(){
    const m=MODES[mode];res=M.sectors(m.p[ba]);
    const spans=m.p.map(p=>{const r=M.sectors(p);return Math.max(...r.acc.map(x=>x.a))+p.w});
    rows=Math.ceil(Math.max(...spans)/128);
  }
  function draw(i){
    if(!res)setup();
    const m=MODES[mode],n=res.acc.length,per=n/8,done=Math.round(i*per);
    const seen=res.acc.slice(0,done),sec=new Set(),usedW=new Set(),cur=new Set();
    seen.forEach((x,j)=>{for(let b=x.a;b<x.a+m.p[ba].w;b+=4){usedW.add(Math.floor(b/4));if(j>=done-per)cur.add(Math.floor(b/4))}for(let b=x.a;b<x.a+m.p[ba].w;b++)sec.add(Math.floor(b/32))});
    const W=RD.width(svgEl),L=W<500?44:56,cw=(W-L-6)/32,ch=Math.max(9,Math.min(14,cw*0.9)),gap=5;
    const H=rows*(ch+gap)+6;let s='';
    for(let r=0;r<rows;r++){
      const y=6+r*(ch+gap);s+=RD.t(L-6,y+ch-1,'+'+r*128+' B',{a:'end',fs:10,fill:'var(--mute)'});
      for(let q=0;q<4;q++){const id=r*4+q,x=L+q*8*cw;s+='<rect x="'+x.toFixed(1)+'" y="'+(y-1.5)+'" width="'+(8*cw-1).toFixed(1)+'" height="'+(ch+3)+'" rx="2" style="fill:'+(sec.has(id)?'var(--acc2)':'none')+';stroke:'+(sec.has(id)?'var(--acc)':'var(--line)')+'"/>'}
      for(let c=0;c<32;c++){const wd=r*32+c,x=L+c*cw+1;
        const col=cur.has(wd)?'var(--c2)':usedW.has(wd)?'var(--acc)':sec.has(Math.floor(wd/8))?'var(--dim)':'var(--soft)';
        s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,cw-3).toFixed(1)+'" height="'+ch+'" rx="1" style="fill:'+col+'"/>'}
    }
    svgEl.innerHTML=RD.svg(W,H,s,'Sectors fetched by one warp');
    const nsec=sec.size,fetched=nsec*32,used=usedW.size*4;
    cnt.innerHTML=RD.stat('Accesses issued',done+' of '+n,res.instr+' warp instruction'+(res.instr>1?'s':''))+RD.stat('Sectors fetched',nsec,f(fetched,0)+' bytes')+RD.stat('Bytes wanted',f(used,0),'')+RD.stat('Useful fraction',fetched?f(100*used/fetched,1)+'%':'-','of fetched bytes');
    let t,p;
    if(i===0){t=m.name[ba];p=m.why[ba]+' Press play or step.'}
    else if(i<8){const a=seen[Math.max(0,done-per)],b=seen[done-1];t='Accesses '+(done-per)+' to '+(done-1);p='Byte addresses '+a.a+' to '+(b.a+m.p[ba].w-1)+'. Sectors so far: '+nsec+'.'}
    else{t=(ba?'After: ':'Before: ')+res.nSec+' sectors, '+f(res.fetched,0)+' bytes for '+f(res.used,0)+' wanted ('+f(100*res.eff,1)+'%)';
      p=m.why[ba]+(mode==='vec'?' Same sectors, '+(ba?'one quarter':'four times')+' the load instructions.':'')+' Toggle '+(ba?'Before':'After')+' to compare on the same scale.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const an=RD.anim({card:'rd-wcard',ctl:'rd-wctl',n:9,draw:draw,ms:900,label:'Step of the warp load'});
  RD.seg(document.getElementById('rd-wseg'),v=>{mode=v;setup();an.reset(9);an.play()});
  RD.seg(document.getElementById('rd-wba'),v=>{ba=+v;setup();an.reset(9);an.play()});
  RD.onResize(()=>an.redraw());

  // predict-then-reveal boxes
  document.querySelectorAll('#t-read .pr').forEach(pr=>pr.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
    pr.querySelectorAll('button[data-a]').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.right)x.classList.add('right')});
    if(!b.dataset.right)b.classList.add('wrong');pr.querySelector('.ans').hidden=false}));

  // measured bars
  const g=n=>D.m1[n];
  const lab=(r,u,d)=>f(r.rate,d)+' '+u+' ('+f(r.rate_lo,d)+' to '+f(r.rate_hi,d)+')';
  function drawBars(){
    const a=g('aos');
    MC.bars(document.getElementById('rd-aosbars'),a.map((r,i)=>({name:r.name,v:r.ms,label:f(r.ms,2)+' ms ('+f(r.ms_lo,2)+' to '+f(r.ms_hi,2)+')',color:i===1?'var(--c3)':'var(--c2)'})));
    MC.bars(document.getElementById('rd-widthbars'),g('widths').map(r=>({name:r.name+' (copy, 512 MB moved)',v:r.rate,label:f(r.rate,0)+' GB/s',color:'var(--c1)'})));
    const tg=g('tgwide').filter(r=>r.bytes_per_access===16||(r.bytes_per_access===4&&[1,32,33].includes(r.stride)));
    MC.bars(document.getElementById('rd-tgbars'),tg.map(r=>({name:r.bytes_per_access+'-byte elements, lane stride '+r.stride,v:r.rate,label:f(r.rate,0)+' GB/s',color:r.bytes_per_access===16?'var(--c1)':'var(--c5)',hl:r.stride===8&&r.bytes_per_access===16})));
    MC.bars(document.getElementById('rd-localbars'),g('local').map((r,i)=>({name:r.name,v:r.ms,label:f(r.ms,2)+' ms',color:i?'var(--c3)':'var(--c2)'})));
  }
  drawBars();
})();
