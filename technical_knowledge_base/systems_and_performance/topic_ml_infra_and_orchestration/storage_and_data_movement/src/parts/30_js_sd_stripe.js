// ---- Striping lab ----
(function(){
  const H=SD_H,D=window.SD,$=H.$,f=H.fmt,esc=H.esc,T=D.tpfs;
  const R=H.mk('t-sdstripe');
  // ---- animation: one 128 MiB file, stripe count 1 / 2 / 4, on one clock ----
  let C=4;
  const NF=14,Tmax=Math.ceil(T.stripe['1'].write_s*2)/2; // frames every Tmax/(NF-1) seconds of measured time
  function draw(i){
    const S=T.stripe[String(C)],lay=S.layouts[0],tot=S.bytes/1048576,t=Tmax*i/(NF-1);
    const done=Math.min(tot,Math.floor(tot*Math.min(1,t/S.write_s)));
    const el=$('sds-svg'),W=Math.min(780,H.width(el));
    const cols=W<480?16:32,cell=Math.floor((W-4)/cols)-1,rows=Math.ceil(tot/cols);
    let b='';
    for(let k=0;k<tot;k++){const x=(k%cols)*(cell+1),y=Math.floor(k/cols)*(cell+1);
      b+=H.rect(x,y,cell,cell,k<done?H.OST[lay[k%lay.length]]:'var(--soft)',{rx:1})}
    const gy=rows*(cell+1)+14,lw=(W-3*8)/4;
    for(let o=0;o<4;o++){const held=Array.from({length:done},(_,k)=>lay[k%lay.length]).filter(x=>x===o).length;
      const x=o*(lw+8);b+=H.rect(x,gy,lw,18,'var(--soft)',{stroke:'var(--line)'})+H.rect(x,gy,lw*held/tot,18,H.OST[o])+
        H.t(x+4,gy+32,'OST '+o+': '+held+' MiB',{fs:10.5})}
    el.innerHTML=H.svg(W,gy+40,b,'Stripe count '+C+' at '+t.toFixed(1)+' s');
    const fin=t>=S.write_s;
    $('sds-cap').innerHTML='<b>'+f(t,1)+' s.</b> '+(i===0?'The client has the layout from the metadata server: '+lay.length+' object'+(lay.length>1?'s':'')+' on OST '+lay.join(', ')+', 1 MiB stripes.':
      fin?'Done: '+f(tot,0)+' MiB in '+f(S.write_s,2)+' s, '+f(S.write_MBps,1)+' MB/s, '+(C===1?'one server doing all the work while three idle.':'each of '+C+' servers taking 1/'+C+' of the file.'):
      (C===1?'Every stripe goes to the same server, at that one server\'s rate.':'Stripe k goes to object k mod '+C+'; the client writes to all '+C+' servers at once.'));
    const cnt=[['Measured time',f(Math.min(t,S.write_s),2)+' s'],['Written',f(done,0)+' of '+f(tot,0)+' MiB'],['Servers in use',String(lay.length)],['Write rate (median)',f(S.write_MBps,1)+' MB/s'],['Read rate (median)',f(S.read_MBps,1)+' MB/s']];
    $('sds-cnt').innerHTML=cnt.map(x=>RD.stat(x[0],x[1])).join('');
  }
  const A=R.anim({card:'sds-anim-card',ctl:'sds-ctl',n:NF,draw,ms:700,label:'Time step'});
  H.seg($('sds-mode'),m=>{C=+m;A.reset(NF)});
  $('sds-note').textContent='Runs: '+['1','2','4'].map(c=>'count '+c+' write '+T.stripe[c].write_all.map(x=>f(x,2)).join(', ')+' s').join('; ')+'. 25 MB/s per server is the token bucket\'s 25,000,000 bytes per second; one server delivered '+f(T.stripe['1'].write_MBps,1)+' MB/s, the gap being request overhead.';

  // ---- four writers ----
  (function(){
    const N=T.nproc,rows=[['fpp_balanced','File per process, 1 stripe each, spread by the MDS'],['shared_c4','One shared file, 4 stripes, each writer its own quarter'],['fpp_ost0','File per process, all pinned to OST 0 (-i 0)'],['shared_c1','One shared file, 1 stripe']];
    const mx=Math.max(...rows.map(r=>N[r[0]].MBps));
    $('sds-np').innerHTML=rows.map(r=>{const e=N[r[0]];return '<div class="row"><span class="nm">'+r[1]+' <span class="mute">(OSTs '+e.osts_used[0].join(',')+')</span></span><span class="track"><span class="fill" style="width:'+(100*e.MBps/mx).toFixed(1)+'%;background:'+(e.MBps>50?'var(--c3)':'var(--bad)')+'"></span></span><span class="val">'+f(e.MBps,1)+' MB/s</span></div>'}).join('');
    const a=T.stripe['4'],b=T.stripe64k;
    $('sds-64').innerHTML='The same 128 MiB file, stripe count 4, with 64 KiB stripes instead of 1 MiB: '+f(b.write_MBps,1)+' MB/s write and '+f(b.read_MBps,1)+' MB/s read against '+f(a.write_MBps,1)+' and '+f(a.read_MBps,1)+' <span class="meas">measured</span>: sixteen times the requests for the same bytes. The Lustre manual\'s floor: "The smallest recommended stripe size is 512 KB", and stripes "between 1 MB and 4 MB" for sequential I/O.';
  })();

  // ---- byte locator ----
  (function(){
    let lay='plain';
    const MiB=1048576;
    const PFL={pfl:{n:8,comps:[[4*MiB,1,null],[64*MiB,4,null],[Infinity,-1,4]],text:'lfs setstripe -E 4M -c 1 -E 64M -c 4 -E -1 -c -1 -i 4 (manual, 19.5.1.1; stripe size 1 MiB)'},
               fsx:{n:null,comps:[[100*MiB,1,null],[10240*MiB,8,null],[102400*MiB,16,null],[Infinity,32,null]],text:'lfs setstripe -E 100M -c 1 -E 10G -c 8 -E 100G -c 16 -E -1 -c 32 (FSx default since 2023-08-25; stripe size 1 MiB)'}};
    function comps(){const n=Math.max(1,+$('sds-n').value||1);
      if(lay==='plain'){const S=(+$('sds-s').value)*1024,c=Math.max(1,Math.min(n,+$('sds-c').value||1)),i0=Math.max(0,Math.min(n-1,+$('sds-i').value||0));return {n,list:[{start:0,end:Infinity,S,c,i0}]}}
      const P=PFL[lay];let start=0,next=0;const list=[];
      P.comps.forEach(([end,c,i])=>{const cc=c<0?n:Math.min(c,n);const i0=i==null?next%n:i%n;next=(i0+cc)%n;list.push({start,end,S:MiB,c:cc,i0});start=end});
      return {n,list}}
    function locate(L,X){const k=L.list.findIndex(c=>X>=c.start&&X<c.end),c=L.list[k];const sw=c.S*c.c;
      const stripe=Math.floor((X%sw)/c.S),obj=Math.floor(X/sw)*c.S+(X%c.S);return {k,c,stripe,ost:(c.i0+stripe)%L.n,obj}}
    function upd(){
      ['sds-l-s','sds-l-c','sds-l-i'].forEach(id=>$(id).style.opacity=lay==='plain'?1:.4);
      const L=comps(),X=Math.max(0,+$('sds-off').value||0)*MiB,r=locate(L,X);
      $('sds-out').innerHTML=[['Layout component',lay==='plain'?'one (plain)':String(r.k+1)+' of '+L.list.length],['Component stripe count',String(r.c.c)],['Stripe index',String(r.stripe)],['OST',String(r.ost)],['Offset inside that object',f(r.obj/MiB,2)+' MiB']].map(x=>RD.stat(x[0],x[1])).join('');
      const el=$('sds-map'),W=Math.min(780,H.width(el)),units=64,u=Math.max(4,Math.floor((W-2)/32)-1);let b='';
      const unit=lay==='plain'?L.list[0].S:MiB,first=lay==='plain'?0:Math.max(0,Math.floor(X/unit)-units/2);
      for(let j=0;j<units;j++){const off=(first+j)*unit,q=locate(L,off),x=(j%32)*(u+1),y=Math.floor(j/32)*(u+15);
        b+=H.rect(x,y,u,u,H.OST[q.ost%8],{op:q.k%2?0.7:1,stroke:Math.floor(X/unit)===first+j?'var(--ink)':null,sw:2});
        if(u>=14)b+=H.t(x+u/2,y+u+11,String(q.ost),{a:'middle',fs:9,fill:'var(--mute)'})}
      el.innerHTML=H.svg(W,2*(u+15),b,'Stripe units and their OSTs');
      $('sds-lnote').textContent=(lay==='plain'?'Stripe units '+first+' to '+(first+units-1)+' of size '+(unit>=MiB?unit/MiB+' MiB':unit/1024+' KiB'):'1 MiB units '+first+' to '+(first+units-1)+'; components alternate in shade. '+PFL[lay].text)+'; the outlined square holds the offset. Colours repeat after 8 OSTs. Which OSTs a component uses is the MDS\'s choice at creation (shown here round robin from the starting OST); the arithmetic from offset to stripe is the source\'s.';
    }
    H.seg($('sds-lay'),m=>{lay=m;if(m==='pfl')$('sds-n').value=8;upd()});
    ['sds-off','sds-s','sds-c','sds-i','sds-n'].forEach(id=>$(id).addEventListener('input',upd));
    R.onRender(upd);upd();
  })();
  // ---- one raw line ----
  (function(){const s=T.stripe['4'];$('sds-out1').textContent=JSON.stringify({exp:'stripe',count:4,rep:0,bytes:s.bytes,stripe_kib:1024,write_s:s.write_all[0],read_s:s.read_all[0],layout:{count:4,size:1048576,objects:s.layouts[0].map(o=>({ost:o,oid:'...'}))}})})();
})();
