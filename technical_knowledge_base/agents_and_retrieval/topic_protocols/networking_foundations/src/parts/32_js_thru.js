// ---- Throughput lab: per-connection ceilings, parallel streams, time to move a payload ----
window.THRU=(function(){
  const MATHIS=Math.sqrt(1.5);
  // all rates in bit/s; rtt in s; win and mss in bytes
  function limits(p){
    const win=p.win*8/p.rtt, loss=p.loss>0?p.mss*8/p.rtt*MATHIS/Math.sqrt(p.loss):Infinity, cap=p.cap>0?p.cap*1e9:Infinity, link=p.link*1e9;
    const per=Math.min(win,loss,cap,link);const total=Math.min(p.n*Math.min(win,loss,cap),link);
    const names={win:'window / RTT',loss:'loss (Mathis)',cap:'per-flow cap',link:'link'};
    const one={win,loss,cap,link};const bind1=Object.keys(one).reduce((a,k)=>one[k]<one[a]?k:a,'win');
    const bindN=p.n*Math.min(win,loss,cap)>=link?'link':bind1;
    return {win,loss,cap,link,per,total,bind1,bindN,names,bdp:p.link*1e9/8*p.rtt,need:Math.ceil(link/Math.min(win,loss,cap)),secs:p.size*8/total};
  }
  return {limits,MATHIS};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('t-thru'))return;const F=NFC.fmt,esc=RD.esc;
  const PRE={home:{link:0.046,rtt:19,win:'4194304',loss:'0',cap:'0',mss:'1448',n:1},az:{link:25,rtt:1,win:'33554432',loss:'0',cap:'5',mss:'1448',n:1},
    pg:{link:100,rtt:0.05,win:'33554432',loss:'0',cap:'10',mss:'8949',n:1},xr:{link:10,rtt:100,win:'33554432',loss:'1e-5',cap:'5',mss:'1448',n:1}};
  const rate=b=>b>=1e9?F(b/1e9,b>=1e10?0:2)+' Gbit/s':b>=1e6?F(b/1e6,b>=1e8?0:1)+' Mbit/s':F(b/1e3,0)+' kbit/s';
  const dur=s=>s<120?F(s,1)+' s':s<7200?F(s/60,1)+' min':F(s/3600,1)+' h';
  const bytes=b=>b>=1e9?F(b/1e9,2)+' GB':b>=1e6?F(b/1e6,2)+' MB':F(b/1e3,0)+' KB';
  function setPre(k){const p=PRE[k];$('th-link').value=Math.log10(p.link);$('th-rtt').value=Math.log10(p.rtt);$('th-win').value=p.win;$('th-loss').value=p.loss;$('th-cap').value=p.cap;$('th-mss').value=p.mss;$('th-n').value=p.n;upd()}
  function read(){return {link:Math.pow(10,+$('th-link').value),rtt:Math.pow(10,+$('th-rtt').value)/1000,win:+$('th-win').value,loss:+$('th-loss').value,cap:+$('th-cap').value,mss:+$('th-mss').value,n:+$('th-n').value,size:+$('th-size').value}}
  function upd(){
    const p=read(),L=THRU.limits(p);
    $('th-link-v').textContent=rate(p.link*1e9);$('th-rtt-v').textContent=(p.rtt*1000<1?F(p.rtt*1e6,0)+' µs':F(p.rtt*1000,p.rtt*1000<10?1:0)+' ms');$('th-n-v').textContent=p.n;
    const lim=k=>L[k]===Infinity?'none':rate(L[k]);
    $('th-out').innerHTML=RD.stat('Bandwidth-delay product',bytes(L.bdp),'window one connection needs to fill the link')+
      RD.stat('One connection',rate(L.per),'limited by <span class="bind">'+L.names[L.bind1]+'</span>')+
      RD.stat('Ceilings for one connection','window '+lim('win'),'loss '+lim('loss')+'; cap '+lim('cap'))+
      RD.stat(p.n+' connection'+(p.n>1?'s':''),rate(L.total),'limited by <span class="bind">'+L.names[L.bindN]+'</span>')+
      RD.stat('Time to move the payload',dur(L.secs),F(p.size/1e9,0)+' GB at '+rate(L.total))+
      RD.stat('Connections to fill the link',L.need>999?'over 999':F(L.need),L.need<=64?'(within this slider)':'beyond the slider');
    const pts=[];for(let n=1;n<=64;n++)pts.push([n,THRU.limits(Object.assign({},p,{n})).total/1e9]);
    const ymax=Math.max(p.link,...pts.map(q=>q[1]))*1.08;
    NFC.plot({el:$('th-plot'),h:220,x:[1,64],y:[0,ymax],yd:ymax<1?2:ymax<10?1:0,xl:'parallel connections',yl:'Gbit/s',
      hlines:[{y:p.link,col:'var(--c3)',label:'link '+rate(p.link*1e9)}],series:[{pts,col:'var(--c1)',label:'total throughput'}],
      marks:[{x:p.n,y:L.total/1e9,col:'var(--c2)',label:rate(L.total),dx:8,dy:14}]});
    $('th-note').innerHTML='Mathis bound uses C = &radic;(3/2) = 1.22 (the paper\'s constant for periodic loss with delayed ACKs off; with delayed ACKs it is smaller). Real flows on one link also compete with each other and with other traffic; this is the ceiling, not a forecast.';
  }
  function meas(){
    const runs=NF.path.runs.filter(r=>!r.error);const rtt=runs.reduce((a,r)=>a+r.srtt_ms,0)/runs.length/1000;const top=Math.max(...runs.map(r=>r.goodput_mbps));
    const xs=[];for(let w=8;w<=1500;w*=1.15)xs.push(w);const line=xs.map(w=>[w,Math.min(w*1024*8/rtt/1e6,top)]);
    NFC.plot({el:$('th-meas'),h:220,x:[0,1500],y:[0,60],xl:'receive window reported by the kernel (KB)',yl:'Mbit/s',
      series:[{pts:line,col:'var(--c4)',label:'window / '+F(rtt*1000,1)+' ms, capped at '+F(top,1)+' Mbit/s'},{pts:runs.map(r=>[r.rcv_wnd/1024,r.goodput_mbps]),col:'var(--c1)',dots:true,dotsOnly:true,r:3.5,label:'measured runs'}]});
  }
  ['th-link','th-rtt','th-n'].forEach(id=>$(id).addEventListener('input',upd));['th-win','th-loss','th-cap','th-mss','th-size'].forEach(id=>$(id).addEventListener('change',upd));
  $('th-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('th-pre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));setPre(b.dataset.p)});
  setPre('xr');
  const all=()=>{upd();meas()};(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-thru']=window.TAB_RENDER['t-thru']||[]).push(all);
  addEventListener('resize',()=>{if(!$('t-thru').hidden)all()});
})();
