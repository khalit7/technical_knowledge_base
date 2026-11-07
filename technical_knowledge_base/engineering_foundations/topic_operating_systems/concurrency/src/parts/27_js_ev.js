// ---- Section 8: the measured readiness costs scaled to a server (sliders). The five designs on one input are the 3D stage in 28e_js_sc_ev.js ----
(function(){if(!document.getElementById('ev-out'))return;
  // ---- scale up with measured costs ----
  const E=window.CD.ev,C=window.CD.conns;
  function interp(n,k){const pts=E.filter(e=>e[k]!=null);if(n>pts[pts.length-1].n)return null;
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];if(n>=a.n&&n<=b.n){const t=(Math.log(n)-Math.log(a.n))/(Math.log(b.n)-Math.log(a.n));return Math.exp(Math.log(a[k])+t*(Math.log(b[k])-Math.log(a[k])))}}return pts[0][k]}
  const fmt=x=>x>=1e6?(x/1e6).toFixed(2)+' ms':x>=1e3?(x/1e3).toFixed(1)+' µs':Math.round(x)+' ns';
  function upd(){const n=Math.max(1,Math.round(Math.pow(10,+document.getElementById('ev-n').value))),r=Math.round(Math.pow(10,+document.getElementById('ev-r').value));
    document.getElementById('ev-n-l').textContent=n.toLocaleString('en-US');document.getElementById('ev-r-l').textContent=r.toLocaleString('en-US');
    const p=interp(n,'poll'),e=interp(n,'epoll'),sl=n<=500?interp(n,'select'):null;
    const cpu=x=>{if(x==null)return '';const f=x*r/1e9*100;return f.toFixed(f<10?2:0)+'% of one CPU at '+r.toLocaleString('en-US')+' messages/s'+(f>100?': one thread cannot keep up':'')};
    const thrRss=C.threads.rss_added/2000,thrV=C.threads.vsz/2000;
    document.getElementById('ev-out').innerHTML=RD.stat('select, per question',sl!=null?fmt(sl):n>=1024?'impossible':'not measured',sl!=null?cpu(sl):n>=1024?'a descriptor number would exceed 1023':'measured up to 500 (descriptor numbers reached 1001)')+
      RD.stat('poll, per question',fmt(p),cpu(p))+RD.stat('epoll_wait, per question',fmt(e),cpu(e))+
      RD.stat('thread per connection',n.toLocaleString('en-US')+' threads',(n*thrV/1024).toFixed(n*thrV<1024?2:1)+' GiB address space, about '+Math.round(n*thrRss)+' MiB resident');
    document.getElementById('ev-note').textContent='Readings off the measured curve (N pipe read ends watched, one ready). Real servers also pay for the read and write calls themselves, which every readiness design needs and io_uring batches.';}
  ['ev-n','ev-r'].forEach(id=>document.getElementById(id).addEventListener('input',upd));upd();
})();
