// ---- Reading: shared fill-ins (sources, interpreter results, predict boxes) and the vector-add animation ----
(function(){
  const D=window.TGD,$=id=>document.getElementById(id),esc=RD.esc;
  // highlight comments in Python source
  window.TG_py=src=>esc(src).split('\n').map(l=>{const i=l.indexOf('#');return i<0?l:l.slice(0,i)+'<span class="c">'+l.slice(i)+'</span>'}).join('\n');
  [['rd-src-vadd','vadd'],['rd-src-soft','softmax'],['rd-src-mm','matmul'],['rd-src-attn','attn_fwd'],['rd-src-gl','memcpy_1d_kernel'],['rd-src-glv','gvadd']].forEach(([id,k])=>{const el=$(id);if(el)el.innerHTML=TG_py(D.src[k])});
  const ic={};D.interp.cases.forEach(c=>ic[c.kernel]=c);
  window.TG_ic=ic;
  const fmt=v=>v===0?'max error 0':'max error '+v.toExponential(2).replace('e-','e-');
  const put=(id,s)=>{const el=$(id);if(el)el.textContent=s};
  put('rd-int-vadd',fmt(ic.vadd.max_abs_err));
  put('rd-mist-pow2',D.interp.mistakes.non_power_of_two_block.replace(/^InterpreterError: /,''));
  // predict-then-reveal boxes
  document.querySelectorAll('#t-read .pr').forEach(pr=>{pr.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
    if(b.dataset.a!=='1')b.classList.add('wrong');pr.querySelector('.ans').hidden=false})});

  // ---- vector add: one program's 1,024 elements through the passes ----
  const main={};D.main.forEach(r=>main[r.key+'.'+r.target]=r);
  const H=main['vadd.sm_90a'],N=main['vadd_nohints.sm_90a'],O=main['vadd_n1000.sm_90a'];
  put('rd-va-ept',String(D.exp.vadd_elems_per_thread));
  put('rd-va-ldg',H.ops['LDG.E.128']+' LDG.E.128 and '+H.ops['STG.E.128']+' STG.E.128 per thread with the hints, '+N.ops['LDG.E']+' LDG.E and '+N.ops['STG.E']+' STG.E without, and '+O.ops['LDG.E']+' LDG.E and '+O.ops['STG.E']+' STG.E with aligned pointers but n = 1,000');
  const snaps=D.passes['vadd.sm_90a'].snaps,lay=D.layout_lines;
  const blk=t=>(t.x||t).filter(l=>l.startsWith('#blocked'));
  let mode='hint';
  const sel=0; // the outlined thread
  function steps(){
    const h=mode!=='nohint',o=mode==='n1000',R=mode==='hint'?H:(o?O:N);
    return [
      {t:'Triton\'s view: one program, one block of 1,024 numbers',p:'The source says nothing about threads. One program owns elements 0 to 1,023 of a, b and c; to Triton these are three blocks of values.',spt:0,ir:['tensor<1024xf32>   (no layout yet: this is TTIR, the Triton IR)'],c:[['threads','not decided'],['loads per input','one block'],['load width','not decided']]},
      {t:'Pass convert-triton-to-tritongpu: a default layout',p:'The first GPU pass attaches a layout to every block: 4 warps of 32 threads, one element per thread per round, so thread 0 owns elements 0, 128, 256 and so on. Correct, but each element would be its own 4-byte load.',spt:1,ir:blk(snaps['after convert-triton-to-tritongpu']),c:[['elements per thread','8'],['loads per input per thread','8 of 4 B'],['one warp instruction covers','128 B']]},
      {t:'Pass tritongpu-coalesce: '+(h?'4 neighbours per thread at the loads and stores':'no proof of alignment, so 1 per thread'),p:h?'Coalesce asks the axis analysis how many neighbouring addresses are contiguous and 16-byte aligned. The pointers carry tt.divisibility = 16, so runs of 4 floats are provably aligned: it gives the loads and stores a layout with 4 elements per thread and inserts convert_layout operations around them.':'Without the divisibility hint the analysis cannot prove that 4 neighbours sit in one aligned 16-byte chunk, so it keeps 1 element per thread: a 16-byte load from a misaligned address would be illegal.',spt:h?4:1,ir:mode==='hint'?blk(snaps['after tritongpu-coalesce']):lay[o?'vadd_n1000.sm_90a':'vadd_nohints.sm_90a'],c:h?[['elements per thread','8'],['loads per input per thread','2 of 16 B'],['one warp instruction covers','512 B']]:[['elements per thread','8'],['loads per input per thread','8 of 4 B'],['one warp instruction covers','128 B']]},
      {t:'Pass tritongpu-remove-layout-conversions: one layout everywhere',p:h?'The conversions it just inserted would move data between threads through shared memory. This pass propagates the 4-per-thread layout through the add and deletes them: the whole kernel now uses one layout and no data moves between threads.':'Nothing to remove: the kernel keeps the 1-per-thread layout throughout.',spt:h?4:1,ir:mode==='hint'?blk(snaps['after tritongpu-remove-layout-conversions']):lay[o?'vadd_n1000.sm_90a':'vadd_nohints.sm_90a'],c:[['convert_layout ops left','0'],['shared memory',R.shared+' B'],['registers per thread',String(R.regs)]]},
      {t:'The SASS: what each thread actually executes',p:mode==='hint'?'Per thread: '+H.ops['LDG.E.128']+' LDG.E.128 (2 for a, 2 for b; the second pair at +0x800 bytes, element 512) and '+H.ops['STG.E.128']+' STG.E.128 for c, each guarded by one predicate per run of 4.':(o?'The layout still says 4 per thread, but the mask may cut a run of 4, so every element gets its own predicate and its own load: '+O.ops['LDG.E']+' LDG.E and '+O.ops['STG.E']+' STG.E per thread.':'Per thread: '+N.ops['LDG.E']+' LDG.E (8 for a, 8 for b) and '+N.ops['STG.E']+' STG.E for c, four times as many memory instructions for the same bytes.'),spt:h?4:1,ir:mode==='hint'?['@!P0 LDG.E.128 R16, desc[UR4][R2.64]        (elements 4t..4t+3 of a)','@!P1 LDG.E.128 R4, desc[UR4][R2.64+0x800]   (elements 512+4t..)']:(o?['@!P6 LDG.E R14, desc[UR4][R4.64]','@!P5 LDG.E R10, desc[UR4][R4.64+0x4]   (next float, own predicate)']:['LDG.E R.., desc[UR4][R...64]   (one float)','... x 16 loads, x 8 stores']),c:[['load instructions per thread',String(R.ops['LDG.E.128']||R.ops['LDG.E'])],['store instructions per thread',String(R.ops['STG.E.128']||R.ops['STG.E'])],['registers per thread',String(R.regs)]]},
      {t:'The mask: lanes past the end',p:mode==='hint'?'n = 992 is a multiple of 16, so the mask switches whole runs of 4 on or off: the last 32 lanes (hatched) are neither loaded nor stored, and the loads stay 16 bytes wide.':(mode==='n1000'?'With n = 1,000 the last 24 lanes (hatched) are switched off. 1,000 happens to be a multiple of 4, but the compiler only knows what the specialisation key says: n is not a multiple of 16, so it knows nothing about where n falls, a run of 4 could be cut, and it must give every element its own predicate.':'With n = 1,000 the last 24 lanes (hatched) are switched off, each by its own predicate, since every load is already one element wide.'),spt:h?4:1,mask:mode==='hint'?992:1000,ir:[mode==='hint'?'mask = offs < n   (n = 992; lanes 992..1023 off)':'mask = offs < n   (n = 1000; lanes 1000..1023 off)'],c:[['active elements',mode==='hint'?'992':'1,000'],['masked lanes',mode==='hint'?'32':'24'],['programs','1']]}
    ];
  }
  let S=steps();
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  function draw(i){
    S=steps();const s=S[i],box=$('rd-va-svg'),W=Math.min(860,RD.width(box)),L=34,cw=(W-L-4)/128,ch=Math.max(10,Math.min(18,cw*4)),H=8*ch+26;
    let g='';
    for(let e=0;e<1024;e++){const r=e>>7,cidx=e&127,x=L+cidx*cw,y=14+r*ch;
      let fill='var(--dim)',thr=-1;
      if(s.spt===1){thr=e%128}else if(s.spt===4){thr=((e%512)>>2)}
      if(thr>=0)fill=COL[thr>>5];
      const masked=s.mask&&e>=s.mask;
      const op=thr>=0?(0.45+0.55*((thr&1)?0.6:1)):1;
      g+='<rect x="'+x.toFixed(2)+'" y="'+y.toFixed(1)+'" width="'+Math.max(cw-0.3,0.6).toFixed(2)+'" height="'+(ch-1.5).toFixed(1)+'" fill="'+(masked?'var(--bg)':fill)+'" fill-opacity="'+op.toFixed(2)+'"'+(masked?' stroke="var(--bad)" stroke-width="0.6"':'')+'/>';
      if(thr===sel)g+='<rect x="'+(x-0.6).toFixed(2)+'" y="'+(y-0.8).toFixed(1)+'" width="'+(cw+0.6).toFixed(2)+'" height="'+(ch).toFixed(1)+'" fill="none" stroke="var(--ink)" stroke-width="1.3"/>';
    }
    for(let r=0;r<8;r++)g+=RD.t(L-4,14+r*ch+ch*0.7,String(r*128),{a:'end',fs:9.5,fill:'var(--mute)'});
    g+=RD.t(L,10,s.spt?'colour = warp (4 warps x 32 threads); outlined = thread 0':'one block of 1,024 values (no threads yet)',{fs:10.5,fill:'var(--mute)'});
    box.innerHTML=RD.svg(W,H,g,'1,024 elements of one program');
    $('rd-va-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+esc(s.t)+'</div><p>'+esc(s.p)+'</p><pre class="tg-pre" style="margin:4px 0">'+s.ir.map(esc).join('\n')+'</pre>';
    $('rd-va-cnt').innerHTML=s.c.map(c=>RD.stat(c[0],c[1])).join('');
  }
  const A=RD.anim({card:'rd-va-card',ctl:'rd-va-ctl',n:6,draw,ms:3200,label:'Vector add step'});
  RD.seg($('rd-va-mode'),m=>{mode=m;A.redraw()});
  RD.onResize(()=>A.redraw());
})();
