// ---- Section 3: the readahead rules of mm/readahead.c v5.10 against the measurement (io.stat after every read). Fig. 2 (32_js_sc_ra.js) replays the measured run ----
(function(){
const D=window.ST_DATA;if(!D||!D.ra)return;
// get_init_ra_size (line 311) and get_next_ra_size (line 329)
const pow2=n=>{let p=1;while(p<n)p*=2;return p};
const initSize=(req,max)=>{const s=pow2(req);return s<=max/32?s*4:s<=max/4?s*2:max};
const nextSize=(cur,max)=>cur<max/16?4*cur:cur<=max/2?2*cur:max;
// predicted I/O for sequential 1-page reads: returns {i: pages} for the reads that trigger I/O
function predict(max,n){const ev={};if(!max){for(let i=0;i<n;i++)ev[i]=1;return ev}
  let start=0,size=initSize(1,max),async=size-1,marker=start+size-async;ev[0]=size;
  for(let i=1;i<n;i++){if(i===marker){start=start+size;size=nextSize(size,max);async=size;marker=start;ev[i]=size}}return ev}
RD.raPredict=predict;
// agreement of the model with every measured sequential event (all 512 reads of both sequential runs)
const ok=[0,1].map(j=>{const r=D.ra[j],mx=j?64:32,p=predict(mx,r.reads);return r.ev.every(e=>p[e[0]]===e[2])&&Object.keys(p).length===r.ev.length});
if(!(ok[0]&&ok[1]))throw new Error('readahead: the v5.10 rules no longer predict every measured request; update Fig. 2 and its step list');
})();
