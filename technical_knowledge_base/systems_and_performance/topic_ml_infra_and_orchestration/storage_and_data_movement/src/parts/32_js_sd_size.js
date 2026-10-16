// ---- Sizing calculator (the same formulas as src/recompute.py size()) ----
window.SD_SIZE=function(x){
  const TiB=Math.pow(2,40),S=x.p*1e9*x.bpp,nodes=Math.ceil(x.g/x.gn);
  const W=S/(x.mode==='sync'?x.stall:x.int*60),R=S/x.rest,Wn=W/nodes;
  const data=x.tok*1e12*x.bpt/(x.days*86400),M=x.g*x.mc/x.st;
  const cap=x.k*S+x.ds*1e12,stall=x.mode==='sync'?S/(x.bw*1e9):null,drain=S/(x.bw*1e9);
  const fsx=[125,250,500,1000].map(t=>{const forBw=Math.max(W,R,data)/(t*1e6),forBytes=cap/TiB,bought=Math.max(forBw,forBytes);
    return {tier:t,tib_bw:forBw,tib_bytes:forBytes,tib:bought,binds:forBw>forBytes?'bandwidth':'bytes',usd_month:t===125?bought*1024*0.145:null}});
  return {S,nodes,W,R,Wn,data,M,cap,stall,drain,fsx,s3_month_k:x.k*S/1e9*0.023};
};
(function(){
  const H=SD_H,$=H.$,f=H.fmt,R=H.mk('t-sdsize');
  const PRE={ex:{p:0.000112577,bpp:'12.31',g:4,gn:2,mode:'sync',stall:1,int:1,rest:1,k:3,bw:0.785,tok:0.0000002,days:0.001,bpt:4,ds:0.001,mc:'652',st:60},
    '8b':{p:8,bpp:'14',g:64,gn:8,mode:'async',stall:30,int:30,rest:60,k:10,bw:20,tok:1,days:10,bpt:4,ds:10,mc:'652',st:60},
    '70b':{p:70,bpp:'14',g:1024,gn:8,mode:'async',stall:30,int:30,rest:60,k:10,bw:80,tok:2,days:30,bpt:4,ds:50,mc:'652',st:60},
    '405b':{p:405,bpp:'14',g:16384,gn:8,mode:'sync',stall:30,int:30,rest:120,k:10,bw:2000,tok:15,days:54,bpt:4,ds:240,mc:'652',st:60}};
  const ids={p:'sdz-p',bpp:'sdz-bpp',g:'sdz-g',gn:'sdz-gn',mode:'sdz-mode',stall:'sdz-stall',int:'sdz-int',rest:'sdz-rest',k:'sdz-k',bw:'sdz-bw',tok:'sdz-tok',days:'sdz-days',bpt:'sdz-bpt',ds:'sdz-ds',mc:'sdz-mc',st:'sdz-st'};
  const B=v=>v>=1e12?f(v/1e12,2)+' TB':v>=1e9?f(v/1e9,1)+' GB':v>=1e6?f(v/1e6,1)+' MB':f(v/1e3,1)+' kB';
  const BW=v=>v>=1e9?f(v/1e9,2)+' GB/s':f(v/1e6,1)+' MB/s';
  function read(){const x={};Object.keys(ids).forEach(k=>{const v=$(ids[k]).value;x[k]=(k==='mode')?v:Math.max(1e-9,+v||0)});x.tok=+$('sdz-tok').value||0;x.ds=+$('sdz-ds').value||0;x.mc=+$('sdz-mc').value||0;return x}
  function upd(){
    const x=read(),o=window.SD_SIZE(x);
    const link=50e9,over=o.Wn>link;
    $('sdz-out').innerHTML=[['Checkpoint size',B(o.S),f(o.S/x.g/1e6,0)+' MB per GPU'],['Write bandwidth needed',BW(o.W),(x.mode==='sync'?'size / '+x.stall+' s stall':'size / '+x.int+' min interval')],
      ['Per node',BW(o.Wn),o.nodes+' nodes'+(over?'; above one 400 Gb/s port':'')],['Restore read bandwidth',BW(o.R),'size / '+x.rest+' s'],['Data read bandwidth',BW(o.data),'tokens x bytes / time'],
      ['Metadata at start-up',f(o.M,0)+' /s','ranks x calls / '+x.st+' s'],['Fast-tier capacity',B(o.cap),x.k+' checkpoints + datasets'],
      [x.mode==='sync'?'Stall at the store\'s '+f(x.bw,0)+' GB/s':'Drain time at '+f(x.bw,0)+' GB/s',f(x.mode==='sync'?o.stall:o.drain,1)+' s',x.mode==='sync'?'GPUs wait this long per checkpoint':(o.drain>x.int*60?'longer than the interval: the store cannot keep up':'must stay under the interval')],
      ['Keeping them in S3 Standard','$'+f(o.s3_month_k,0)+' /month',x.k+' checkpoints at $0.023 per GB-month']].map(s=>RD.stat(s[0],s[1],s[2])).join('');
    $('sdz-fsx').innerHTML='<table><thead><tr><th>FSx for Lustre tier, MB/s per TiB</th><th class="num">TiB for bandwidth</th><th class="num">TiB for bytes</th><th class="num">TiB bought</th><th>what binds</th><th class="num">per month</th></tr></thead><tbody>'+
      o.fsx.map(r=>'<tr><td>PERSISTENT-'+r.tier+'</td><td class="num'+(r.binds==='bandwidth'?' bind':'')+'">'+f(r.tib_bw,1)+'</td><td class="num'+(r.binds==='bytes'?' bind':'')+'">'+f(r.tib_bytes,1)+'</td><td class="num">'+f(r.tib,1)+'</td><td>'+r.binds+'</td><td class="num">'+(r.usd_month==null?'not in snapshot':'$'+f(r.usd_month,0))+'</td></tr>').join('')+
      '</tbody></table><p class="small mute">Throughput per TiB from the <a href="https://docs.aws.amazon.com/fsx/latest/LustreGuide/ssd-storage.html" target="_blank" rel="noopener noreferrer">FSx SSD performance page</a> <span class="pub">published</span>; bandwidth is the largest of write, restore and data reads. Outlined: the requirement that sets the size.</p>';
  }
  function preset(k){const P=PRE[k];Object.keys(ids).forEach(i=>{$(ids[i]).value=P[i]});upd()}
  H.seg($('sdz-pre'),preset);
  Object.values(ids).forEach(id=>$(id).addEventListener('input',upd));
  const c405=window.SD_SIZE(Object.assign({},PRE['405b'],{bpp:14,mc:652}));
  $('sdz-check').innerHTML='Defaults check: the 405B preset gives '+f(c405.S/1e12,2)+' TB and '+f(c405.S/16384/1e6,0)+' MB per GPU, and a synchronous stall of '+f(c405.stall,2)+' s at Tectonic\'s 2 TB/s sustained, the same as the parent\'s checkpoint-time calculator (the same formula, so agreement by construction). MLPerf Storage v2.0\'s own 405B checkpoint is 5.29 TB (13.1 bytes per parameter) <span class="pub">published</span>. The 70B preset gives the Reading tab\'s 0.54 GB/s asynchronous figure, and 32.7 GB/s when switched to synchronous.';
  R.onRender(upd);preset('70b');
})();
