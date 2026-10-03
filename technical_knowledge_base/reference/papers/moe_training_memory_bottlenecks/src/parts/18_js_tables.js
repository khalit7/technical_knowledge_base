// ---- The tables tab: Figure 2 from Table 6, the tables with sorting, the checks ----
(function(){
const TB=PAPER.tables,CK=PAPER.rc.checks,AX=a=>PAPER.meta.ax+'#'+a;
const cnt=v=>CK.filter(c=>c.verdict===v).length;
$('tbSum').textContent=CK.length+' numbers checked: '+cnt('reproduces')+' reproduce, '+cnt('derived')+' are derived where the paper prints none, '+cnt('does not reproduce')+' do not reproduce.';
// Figure 2
let f2s=1,f2v=1;
function f2(){const rows=TB.t6.rows.filter(r=>r[0].startsWith(f2s?'65K':'32K')),sys=[['Standard EP',2,'var(--c2)'],['LLEP',3,'var(--c1)'],['PipelinedLLEP',4,'var(--c3)']];
  const val=c=>c==='OOM'?null:+c.split(' / ')[f2v];
  const mx=Math.max(...rows.flatMap(r=>sys.map(s=>val(r[s[1]])||0)))*1.1;
  fit($('f2Svg'),w=>{const lw=62,gw=w-lw-10,gh=3*13+12,top=4,X=v=>lw+gw*v/mx;let s='';
    rows.forEach((r,i)=>{const y=top+i*gh;s+=tx(lw-6,y+24,r[1],{fs:11,a:'end'});
      sys.forEach(([n,ix,c],j)=>{const v=val(r[ix]),yy=y+j*13;
        if(v===null)s+=tx(lw+4,yy+11,'out of memory',{fs:11,c:'var(--bad)'});else s+=rc(lw,yy+2,X(v)-lw,10,c,{r:1})+tx(X(v)+4,yy+11,fmt(v,f2v?1:0),{fs:11})})});
    const y0=top+rows.length*gh,L=legend(sys.map(x=>[x[0],x[2]]),lw,y0+16,gw);
    s+=tx(lw,y0+2,f2v?'peak allocated memory, GiB (max across ranks)':'mean forward latency, ms',{fs:11,c:'var(--mute)'})+L.s;
    $('f2Svg').innerHTML=svgW(w,y0+16+L.h,s,'Figure 2 rebuilt from Table 6')})}
segBind('f2S',m=>{f2s=+m;f2()});segBind('f2V',m=>{f2v=+m;f2()});
// tables
const NOTE={t2:'Saved and Cost recompute from the printed peaks and latencies (82.8%, 86.6%, +5.1%, +4.4%). The standard peak at N = 32,768 is weight + input + three N × V FP32 tensors = 79.46 GiB against 79.521 measured.',
 t10:'Independently reproduced: the weight H × V × 4 bytes = 5.3406 GiB and its shards 1.3351 and 0.6676; the standard increment 36.6212 GiB = three N × V FP32 tensors. Ring-DTP\'s increment is 3.2 strips of N × V/P at P = 4 and 4.0 strips at P = 8, the constant behind Eq. 2.',
 t11:'Slowdowns recompute from the latencies.',
 t6:'Peak saved and speed recompute from the cells. The 65K rows are the fastest of three repeats.',
 t7:'Chunk counts reproduce from Eq. 1: K = min(⌈N / 4096⌉, 10) gives 1, 1, 2, 8, 10, 10.',
 t8:'The last two columns are our replay (sim_dispatch.py, and the same code in this page): the paper\'s routing profiles through LLEP\'s released plan at capacity factor 1.0. All eight send ratios reproduce independently. At the code\'s default factor 1.1 they do not (80% / 16 gives 1.60 / 2.00).',
 t9:'At 32K and K = 10, forward plus backward is slower than LLEP (0.87 to 0.90 times).',
 t3:'Boundaries 21 and 42 and the logical payloads reproduce independently: one boundary is (557,056 / 8) × 2,880 × 2 bytes = 0.3735 GiB. Peak HBM falls 16.06 GiB (11.5%), not the "17.65% of HBM" of §3.3. Node RAM rises 190.9 GiB against 8 × 23.5 pinned.',
 t13:'Marginal gain = largest completion over the baseline\'s 557,056 (Full: 17.65%). §3.3\'s 35.71% is Full\'s largest clean run over the baseline\'s (622,592 / 458,752).',
 t4:'CPU Adam (ZeRO-Offload\'s AVX kernel) takes 3.95 s; the selected row (100M, 2 slots) is 2.05 times faster. Staging reproduces independently in every row as slots × actual maximum × 16 bytes.'};
let sortC=-1,sortD=1;
const num=v=>{const m=String(v).replace(/,/g,'').match(/-?\d+(\.\d+)?/);return m?+m[0]:NaN};
function tb(){const k=$('tbSel').value,T=TB[k];let cols=T.cols.slice(),rows=T.rows.map(r=>r.slice());
  if(k==='t8'){const R={'Balanced':0,'95% / 16':1,'80% / 16':2,'50% / 4':3};cols=cols.concat(['Replay strided','Replay contig.']);rows=rows.map(r=>{const S=rtData(R[r[0]]);return r.concat([S.ratio.str.toFixed(2),S.ratio.cont.toFixed(2)])})}
  if(sortC>=0&&sortC<cols.length)rows.sort((a,b)=>{const x=num(a[sortC]),y=num(b[sortC]);return (isNaN(x)||isNaN(y)?String(a[sortC]).localeCompare(String(b[sortC])):x-y)*sortD});
  $('tbTitle').innerHTML='<a href="'+AX(T.id)+'" target="_blank" rel="noopener noreferrer">'+T.name+'</a>: '+T.title+(T.unit?' ('+T.unit+')':'');
  $('tbT').innerHTML='<tr>'+cols.map((c,i)=>'<th class="'+(i?'num':'')+'" style="cursor:pointer" data-c="'+i+'">'+c+(i===sortC?(sortD>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td class="'+(i?'num':'')+'">'+c+'</td>').join('')+'</tr>').join('');
  $('tbT').querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;if(c===sortC)sortD=-sortD;else{sortC=c;sortD=1}tb()}));
  $('tbNote').textContent=NOTE[k]||''}
$('tbSel').addEventListener('change',()=>{sortC=-1;tb()});
// checks
let ckf='all';
function ck(){const V={'reproduces':'okc','does not reproduce':'noc','derived':''};
  $('ckT').innerHTML='<tr><th>What</th><th>Ours</th><th>Paper</th><th>Where</th><th>Verdict</th></tr>'+CK.filter(c=>ckf==='all'||c.verdict===ckf).map(c=>'<tr><td>'+c.what+(c.note?'<br><span class="small mute">'+c.note+'</span>':'')+'</td><td>'+c.ours+'</td><td>'+c.paper+'</td><td>'+c.where+'</td><td class="'+V[c.verdict]+'">'+c.verdict+'</td></tr>').join('')}
segBind('ckF',m=>{ckf=m;ck()});
onTab('t-tables',()=>{f2();tb();ck()});
})();
