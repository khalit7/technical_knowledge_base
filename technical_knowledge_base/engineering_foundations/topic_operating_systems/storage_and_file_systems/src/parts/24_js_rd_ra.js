// ---- Section 4: the readahead window, measured (io.stat after every read) against the v5.10 source rules ----
(function(){
const D=window.ST_DATA,$=id=>document.getElementById(id);if(!$('rd-ra-card'))return;
const N=64; // first 64 reads of each run are animated (the "off" and random runs made exactly 64)
const MODES=[['seq','Sequential, default readahead',0,32],['seqx2','Sequential, POSIX_FADV_SEQUENTIAL',1,64],['off','Sequential, readahead off (POSIX_FADV_RANDOM)',2,0],['rand','Random offsets, default',3,32]];
// mm/readahead.c v5.10: get_init_ra_size (line 311) and get_next_ra_size (line 329)
const pow2=n=>{let p=1;while(p<n)p*=2;return p};
const initSize=(req,max)=>{const s=pow2(req);return s<=max/32?s*4:s<=max/4?s*2:max};
const nextSize=(cur,max)=>cur<max/16?4*cur:cur<=max/2?2*cur:max;
// predicted I/O for sequential 1-page reads: returns {i: pages} for the reads that trigger I/O
function predict(max,n){const ev={};if(!max){for(let i=0;i<n;i++)ev[i]=1;return ev}
  let start=0,size=initSize(1,max),async=size-1,marker=start+size-async;ev[0]=size;
  for(let i=1;i<n;i++){if(i===marker){start=start+size;size=nextSize(size,max);async=size;marker=start;ev[i]=size}}return ev}
RD.raPredict=predict;
let mode='seq',run=D.ra[0],meas={},pred={};
function load(){const m=MODES.find(x=>x[0]===mode);run=D.ra[m[2]];meas={};run.ev.forEach(e=>{if(e[0]<N)meas[e[0]]=e});pred=mode==='rand'?null:predict(m[3],N)}
function draw(k){ // k = number of reads done (0..N)
  const m=MODES.find(x=>x[0]===mode);let fetched=new Set(),last=null,reqs=0,pages=0;
  for(let i=0;i<k;i++){const e=meas[i];if(e){reqs+=e[3];pages+=e[2];last=e;
      if(mode!=='rand')for(let p=e[1];p<e[1]+e[2];p++)fetched.add(p);}
    if(mode==='rand')fetched.add(i)}
  const lastSet=new Set();if(last&&mode!=='rand')for(let p=last[1];p<last[1]+last[2];p++)lastSet.add(p);
  let h='<div class="small mute">'+(mode==='rand'?'One cell per read (each at a random 4 KiB offset of the 8 MiB file)':'File pages 0 to 63 (4 KiB each)')+'</div><div class="ra-cells">';
  for(let p=0;p<N;p++){const cls=[];if(mode==='rand'?p<k:fetched.has(p))cls.push(lastSet.has(p)||(mode==='rand'&&p===k-1)?'n':'c');if(p===k-1)cls.push('r');h+='<i class="'+cls.join(' ')+'" title="page '+p+'"></i>'}
  $('rd-ra-svg').innerHTML=h+'</div>';
  const e=k>0?meas[k-1]:null,pv=k>0&&pred?pred[k-1]:null;
  let cap;
  if(k===0)cap='<div class="t">Before the first read</div><p>The file was just evicted from the page cache with posix_fadvise(DONTNEED): nothing is cached. '+(m[3]?'Maximum window: '+m[3]+' pages ('+m[3]*4+' KiB).':'Readahead is off for this open file.')+'</p>';
  else if(e)cap='<div class="t">read() number '+k+' (page '+e[1]+') triggered I/O: '+e[2]+' page'+(e[2]>1?'s':'')+' fetched in '+e[3]+' request'+(e[3]>1?'s':'')+'</div><p>'+(mode==='rand'?'A random read: the kernel sees no sequential pattern and fetches just the page asked for.':mode==='off'?'Readahead off: every page is its own device request, and the program waits for each.':(e[1]===0?'A miss at the start of the file: a synchronous readahead of initSize(1) = '+pv+' pages, with a readahead mark on page 1.':'This page carried the readahead mark, so the next window was fetched asynchronously while the program kept reading cached pages.')+(pv!=null?' The source rules predict '+pv+' pages: '+(pv===e[2]?'matches.':'differs.'):''))+'</p>';
  else cap='<div class="t">read() number '+k+' (page '+(mode==='rand'?'random':k-1)+'): served from the page cache</div><p>A memory copy, no device request.</p>';
  $('rd-ra-cap').innerHTML=cap;
  $('rd-ra-cnt').innerHTML=RD.stat('reads done',k+' of '+N)+RD.stat('device requests',reqs)+RD.stat('pages fetched',pages)+RD.stat('whole run (measured)',run.reads+' reads, '+run.reqs+' requests','in '+run.ms+' ms');
}
const an=RD.anim({card:'rd-ra-card',ctl:'rd-ra-ctl',n:N+1,draw,ms:420,label:'Reads done'});
const seg=$('rd-ra-mode');seg.innerHTML=MODES.map((m,i)=>'<button data-m="'+m[0]+'"'+(i===0?' class="on"':'')+'>'+m[1]+'</button>').join('');
RD.seg(seg,v=>{mode=v;load();an.reset(N+1);an.play()});
load();an.redraw();
// agreement of the model with every measured sequential event (all 512 reads)
const ok=[0,1].map(j=>{const r=D.ra[j],mx=j?64:32,p=predict(mx,r.reads);return r.ev.every(e=>p[e[0]]===e[2])&&Object.keys(p).length===r.ev.length});
$('rd-ra-note').innerHTML='Blue: pages in the page cache; orange: the window fetched by the latest request; outlined: the page this read() asked for. Defaults reproduce the measurement independently: the two source rules predict every request of the 512-read sequential runs (default: '+(ok[0]?'all '+D.ra[0].ev.length+' requests match':'mismatch')+'; doubled window: '+(ok[1]?'all '+D.ra[1].ev.length+' match':'mismatch')+'). Times are this VM\'s: the "device" is macOS\'s cache of the disk file.';
})();
