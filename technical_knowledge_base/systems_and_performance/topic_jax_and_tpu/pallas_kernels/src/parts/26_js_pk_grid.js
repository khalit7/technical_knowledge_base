// ---- Grid and BlockSpec lab (Reading section 2). Data: PK.G (src/runs/pk_grid.py). Copies are recomputed here from the
// step order with Pallas's rule (copy a block only when its index differs from the previous step on that core);
// in lexicographic order they equal the counts recorded by pk_grid.py (checked by src/check_page.py).
(function(){
  const U=PKU,P=window.PK,G=P.G,$=id=>document.getElementById(id);
  const names=[['bias_gelu','Bias + GELU'],['softmax','Softmax'],['xent','Cross-entropy'],['ln_fwd','LayerNorm fwd'],['ln_bwd','LayerNorm bwd'],
    ['matmul','Matmul (root)'],['flash_fwd','Flash fwd'],['flash_dkv','Flash bwd dK dV'],['flash_dq','Flash bwd dQ'],['paged','Paged decode']];
  let kname='bias_gelu',variant='clamped',order='lex';
  const find=()=>G.kernels.find(k=>k.name===kname&&(k.variant===null||k.variant===variant));
  $('pg-kern').innerHTML=names.map(n=>'<button data-m="'+n[0]+'"'+(n[0]===kname?' class="on"':'')+'>'+n[1]+'</button>').join('');
  function lexIndex(L,g){let ix=0;for(let a=0;a<L.grid.length;a++)ix=ix*L.grid[a]+g[a];return ix}
  // the visiting order: list of [step index, core]
  function seq(L){
    if(order==='lex')return L.steps.map((s,i)=>[i,0]);
    const rec=kname==='softmax'?(order==='int1'?G.order.softmax_1core.map(p=>[p[0],0]):G.order.softmax_2core):(order==='int1'?G.order.flash_1core.map(p=>[p[0],p[1],p[2],0]):G.order.flash_2core);
    return rec.map(p=>{const g=p.slice(0,p.length-1);return [lexIndex(L,g),p[p.length-1]]});
  }
  // replay: per step, copied flags with per-core previous indices
  function replay(L,sq){const nops=L.ops.length,prev={},cops=Array(nops).fill(0),out=[];
    sq.forEach(([si,core])=>{const s=L.steps[si],cp=[];prev[core]=prev[core]||Array(nops).fill(null);
      for(let t=0;t<nops;t++){const id=s[2][2*t]+','+s[2][2*t+1];const c=id!==prev[core][t];if(c)cops[t]++;prev[core][t]=id;cp.push(c)}
      out.push({si,core,cp,copies:cops.slice()})});return out}
  function opsvg(L,t,cur,hist){
    const o=L.ops[t],nr=o.shape[0]/o.block[0],nc=o.shape[1]/o.block[1];
    const avail=Math.min(260,U.width($('pg-ops'))-10);
    // a tall single column of blocks is drawn wrapped, row by row in block order, so each block stays visible
    const wrap=nc===1&&nr>8,cols=wrap?Math.min(nr,8):nc,rows=wrap?Math.ceil(nr/cols):nr;
    let cw,ch;
    if(wrap){cw=ch=Math.max(12,Math.min(24,Math.floor(avail/cols)))}
    else{ch=Math.max(6,Math.min(22,Math.floor(150/rows)));cw=nc===1?Math.max(14,Math.min(60,Math.round(28*Math.max(1,Math.log2(o.block[1]/16+1))))):Math.max(10,Math.min(40,Math.floor(avail/nc)))}
    const W=cols*cw+2,H=rows*ch+2;let s='';
    for(let r=0;r<nr;r++)for(let c=0;c<nc;c++){const k=r+','+c;const isCur=cur&&cur.r===r&&cur.c===c;
      const gx=wrap?r%cols:c,gy=wrap?Math.floor(r/cols):r;
      let fill='var(--bg)';if(hist.has(k))fill='var(--dim)';if(isCur)fill=o.kind==='out'?'var(--c2)':(cur.cp?'var(--c1)':'var(--c6)');
      s+='<rect x="'+(1+gx*cw)+'" y="'+(1+gy*ch)+'" width="'+cw+'" height="'+ch+'" fill="'+fill+'" stroke="var(--line)" stroke-width="0.8"/>';
      if(wrap&&cw>=16)s+='<text x="'+(1+gx*cw+cw/2)+'" y="'+(1+gy*ch+ch/2+3)+'" text-anchor="middle" font-size="8.5" fill="'+(isCur?'var(--bg)':'var(--mute)')+'">'+r+'</text>'}
    if(cur&&!cur.run)s+='<rect x="1" y="1" width="'+(W-2)+'" height="'+(H-2)+'" fill="none" stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="1.5"/>';
    return '<div class="pg-op"><div class="h">'+U.esc(o.name)+' <i>'+o.shape.join(' &#215; ')+', block '+o.block.join(' &#215; ')+' ('+o.kind+')'+(wrap?', '+nr+' blocks drawn in rows of '+cols:'')+'</i></div><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+s+'</svg></div>'}
  // the grid itself: one cell per grid point (the last two axes as rows and columns), in visiting order
  function gridsvg(L,i){const g=L.grid,nc=g[g.length-1],nr=L.steps.length/nc;
    if(nr*nc>128)return '';const cs=Math.max(8,Math.min(26,Math.floor(Math.min(200,U.width($('pg-ops'))-10)/nc))),W=nc*cs+2,H=nr*cs+2;
    const seen=new Set();for(let k=0;k<=i;k++)seen.add(R[k].si);const cur=R[i].si;let s='';
    for(let r=0;r<nr;r++)for(let c=0;c<nc;c++){const si=r*nc+c,run=L.steps[si][1];
      const fill=si===cur?'var(--ink)':seen.has(si)?(run?'var(--c3)':'var(--soft)'):'var(--bg)';
      s+='<rect x="'+(1+c*cs)+'" y="'+(1+r*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="'+fill+'" stroke="'+(run?'var(--line)':'var(--bad)')+'"'+(run?'':' stroke-dasharray="2 2"')+' opacity="'+(seen.has(si)||si===cur?1:.9)+'"/>'}
    return '<div class="pg-op"><div class="h">the grid <i>'+(g.length>1?(g.length>2&&g[0]>1?L.axes.slice(0,-1).join(', '):L.axes[g.length-2])+' &#215; '+L.axes[g.length-1]:L.axes[0])+'; dashed red: body skipped</i></div><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+s+'</svg></div>'}
  let R=null,L=null;
  function setup(){L=find();R=replay(L,seq(L));
    const hasVar=kname==='flash_fwd'||kname==='paged',hasOrd=kname==='flash_fwd'||kname==='softmax';
    $('pg-var').innerHTML=hasVar?'<button data-m="naive"'+(variant==='naive'?' class="on"':'')+'>Before: naive index map</button><button data-m="clamped"'+(variant==='clamped'?' class="on"':'')+'>After: clamped index map</button>':'';
    $('pg-ord').innerHTML=hasOrd?'<button data-m="lex"'+(order==='lex'?' class="on"':'')+'>Order: a TPU core (lexicographic)</button><button data-m="int1"'+(order==='int1'?' class="on"':'')+'>Recorded: TPU interpreter, 1 core</button><button data-m="int2"'+(order==='int2'?' class="on"':'')+'>Recorded: TPU interpreter, 2 cores</button>':'';
    $('pg-meta').innerHTML='<b>'+U.esc(L.title)+'</b>: grid '+L.grid.join(' &#215; ')+' ('+L.axes.map((a,i)=>a+': '+L.sem[i]).join(', ')+'), '+L.steps.length+' steps. '+U.esc(L.note||'');
    A.reset(R.length)}
  function draw(i){if(!L)return;const st=R[i],s=L.steps[st.si];const hist=L.ops.map(()=>new Set());
    for(let k=0;k<i;k++){const ss=L.steps[R[k].si];L.ops.forEach((o,t)=>hist[t].add(ss[2][2*t]+','+ss[2][2*t+1]))}
    $('pg-ops').innerHTML=gridsvg(L,i)+L.ops.map((o,t)=>opsvg(L,t,{r:s[2][2*t],c:s[2][2*t+1],cp:st.cp[t],run:!!s[1]},hist[t])).join('');
    const copied=L.ops.map((o,t)=>st.cp[t]&&o.kind==='in'?o.name:null).filter(Boolean),newout=L.ops.map((o,t)=>st.cp[t]&&o.kind==='out'?o.name:null).filter(Boolean);
    let moved=0;L.ops.forEach((o,t)=>{moved+=st.copies[t]*o.block[0]*o.block[1]*o.bytes});
    // minimum: every block a running step needs, copied once (a gather such as the paged pool needs only the pages in use, not the whole array)
    const minB=L.ops.reduce((acc,o,t)=>{const u=new Set();L.steps.forEach(x=>{if(x[1])u.add(x[2][2*t]+','+x[2][2*t+1])});return acc+u.size*o.block[0]*o.block[1]*o.bytes},0);
    let runs=0;for(let k=0;k<=i;k++)runs+=L.steps[R[k].si][1];
    $('pg-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+R.length+': grid point ('+s[0].join(', ')+')'+(order==='int2'?', core '+st.core:'')+'</div><p>'+
      L.ops.map((o,t)=>U.esc(o.name)+' block ('+s[2][2*t]+', '+s[2][2*t+1]+')').join(', ')+'. '+(copied.length?'Copied in this step: '+copied.map(U.esc).join(', ')+'.':'No input copied: every input block index is unchanged.')+(newout.length?' A new output block starts ('+newout.map(U.esc).join(', ')+'); the previous one is written back.':'')+' '+
      (s[1]?'The body runs.':'The body is skipped by <code>pl.when</code>'+(copied.length?', but its blocks were still copied.':', and nothing was copied for it.'))+'</p>';
    $('pg-cnt').innerHTML=U.stat('Body ran',runs+' of '+(i+1),'steps so far')+L.ops.map((o,t)=>U.stat(U.esc(o.name)+(o.kind==='out'?' write-backs':' copies'),st.copies[t],'of '+(o.shape[0]/o.block[0])*(o.shape[1]/o.block[1])+' blocks')).join('')+
      U.stat('Bytes moved',U.bytes(moved),'minimum '+U.bytes(minB)+': each needed block once')}
  const A=U.anim({card:'pg-card',ctl:'pg-ctl',tab:'t-read',n:16,ms:900,label:'Grid step',draw,autoplay:false});
  U.seg($('pg-kern'),m=>{kname=m;order='lex';setup()});
  $('pg-var').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;variant=b.dataset.m;setup()});
  $('pg-ord').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;order=b.dataset.m;setup()});
  U.onRender('t-read',()=>A.redraw());addEventListener('resize',()=>{if(!$('t-read').hidden)A.redraw()});
  setup();
})();
