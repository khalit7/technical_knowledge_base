// ---- Shared attention model: per decoded token, per layer and summed (all from config.json files) ----
const KB=128, KSEL=16, SELT=KSEL*KB; // MSA block size and blocks kept per group (M3 config)
const MODELS={
 h01:{n:'MiniMax-01 hybrid',c:'var(--c3)',win:1048576,layers:80},
 s01:{n:'01 if all softmax',c:'var(--mute)',win:1048576,layers:80,hyp:true},
 m2:{n:'M2',c:'var(--c2)',win:196608,layers:62},
 m3:{n:'M3',c:'var(--acc)',win:1048576,layers:60}
};
const STATE01=70*64*128*128*2; // bytes, BF16 assumed
// stored bytes per sequence at context n
function stored(m,n,o){o=o||{};
 if(m==='h01')return 10*2*8*128*2*n+STATE01;
 if(m==='s01')return 80*2*8*128*2*n;
 if(m==='m2')return 62*2*8*128*2*n;
 return 60*2*4*128*2*n+(o.idx===false?0:57*128*2*n)}
// bytes read by one decoded token at context n, summed over layers
function readB(m,n,o){o=o||{};const fl=o.all?0:3;
 if(m==='h01')return 10*2*8*128*2*n+STATE01;
 if(m==='s01')return 80*2*8*128*2*n;
 if(m==='m2')return 62*2*8*128*2*n;
 return fl*2*4*128*2*n+(60-fl)*((o.idx===false?0:128*2*n)+4*Math.min(n,SELT)*2*128*2)}
// attention multiply-adds per decoded token at context n, summed over layers
function compB(m,n,o){o=o||{};const fl=o.all?0:3;
 if(m==='h01')return 10*2*64*128*n+70*64*2*128*128;
 if(m==='s01')return 80*2*64*128*n;
 if(m==='m2')return 62*2*48*128*n;
 return fl*2*64*128*n+(60-fl)*(2*64*128*Math.min(n,SELT)+4*128*n)}
// MSA paper eq. 12 ratio (prefill average, paper test model 64 / 4 / 128)
const eq12=N=>(2*64*128*N*N)/(4*128*N*N+4*64*128*N*SELT);
const vw=(id,wide,narrow)=>{const e=$(id),w=e&&(e.clientWidth||e.parentNode.clientWidth);return w&&w<520?narrow:wide};
const ctxLab=n=>n>=1048576?(n/1048576)+'M':n>=1024?(n%1024?fmt(n):(n/1024)+'K'):String(n);
