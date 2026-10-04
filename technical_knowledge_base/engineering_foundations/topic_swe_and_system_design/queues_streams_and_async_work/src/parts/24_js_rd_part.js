// ---- Reading, Kafka: keys to partitions (Kafka's real murmur2 partitioner), partitions to the consumers of a group ----
// murmur2 is a port of org.apache.kafka.common.utils.Utils.murmur2; it reproduces the six test vectors in Kafka's UtilsTest
// (checked in src/recompute.py and src/check_sim.mjs). Partition = toPositive(murmur2(key bytes)) % partitions.
(function(){
  function murmur2(str){const d=new TextEncoder().encode(str);const len=d.length,m=0x5bd1e995;let h=(0x9747b28c^len)|0;const l4=len>>2;
    for(let i=0;i<l4;i++){const j=i*4;let k=(d[j]|(d[j+1]<<8)|(d[j+2]<<16)|(d[j+3]<<24));k=Math.imul(k,m);k^=k>>>24;k=Math.imul(k,m);h=Math.imul(h,m);h^=k}
    const t=len&~3;switch(len%4){case 3:h^=d[t+2]<<16;case 2:h^=d[t+1]<<8;case 1:h^=d[t];h=Math.imul(h,m)}
    h^=h>>>13;h=Math.imul(h,m);h^=h>>>15;return h|0}
  window.KMURMUR=murmur2;
  const box=document.getElementById('rd-pt-svg');if(!box)return;
  const out=document.getElementById('rd-pt-out'),pS=document.getElementById('rd-pt-p'),cS=document.getElementById('rd-pt-c');
  // 12 chat messages from 4 users, in the order they were sent (illustrative traffic; the keys are real strings)
  const seq=['user-1','user-4','user-1','user-6','user-8','user-4','user-1','user-6','user-6','user-8','user-4','user-1'];
  const users=['user-1','user-4','user-6','user-8'],col={'user-1':'var(--c1)','user-4':'var(--c2)','user-6':'var(--c3)','user-8':'var(--c4)'};
  function draw(){
    const P=+pS.value,C=+cS.value;document.getElementById('rd-pt-pv').textContent=P;document.getElementById('rd-pt-cv').textContent=C;
    const lanes=[];for(let p=0;p<P;p++)lanes.push([]);const nth={};
    seq.forEach((k,i)=>{const p=(murmur2(k)&0x7fffffff)%P;nth[k]=(nth[k]||0)+1;lanes[p].push({k:k,n:nth[k],i:i})});
    const W=Math.max(300,Math.min(860,RD.width(box)));const lh=30,x0=70,H=P*lh+6;
    const cw=Math.min(58,(W-x0-4)/Math.max(1,Math.max(...lanes.map(l=>l.length))));const fs=cw<36?9:10;
    let b='';
    lanes.forEach((l,p)=>{const y=4+p*lh;const c=p%C;
      b+='<rect x="0" y="'+y+'" width="'+(W-1)+'" height="'+(lh-4)+'" rx="5" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(6,y+17,'P'+p,{fs:11.5,w:600})+RD.t(28,y+17,'c'+(c+1),{fs:10.5,fill:'var(--mute)'});
      l.forEach((m,o)=>{const x=x0+o*cw;b+='<rect x="'+x+'" y="'+(y+3)+'" width="'+(cw-3)+'" height="'+(lh-10)+'" rx="3" fill="'+col[m.k]+'"/>'+
        RD.t(x+(cw-3)/2,y+17,'u'+m.k.slice(5)+'#'+m.n,{fs:fs,a:'middle',fill:'var(--bg)',w:600})})});
    box.innerHTML=RD.svg(W,H,b,'Messages placed in '+P+' partitions by key');
    const asg=[];for(let c=0;c<C;c++)asg.push([]);for(let p=0;p<P;p++)asg[p%C].push('P'+p);
    const idle=asg.filter(a=>!a.length).length;
    const where=users.map(u=>u+' to P'+((murmur2(u)&0x7fffffff)%P)).join(', ');
    out.innerHTML='<p class="small"><b>Placement:</b> '+where+'. Each user\'s messages stay in order inside their partition (u1#1 before u1#2 ...), whatever the partition count. Messages from different users in different partitions have no order between them.'+(Math.max(...lanes.map(l=>l.length))>=9?' <b>Uneven:</b> with only four keys, the hash can put most of them in one partition (a hot partition); real topics have many keys.':'')+'</p>'+
      '<p class="small"><b>Group "receipts", '+C+' consumer'+(C>1?'s':'')+':</b> '+asg.map((a,c)=>'consumer '+(c+1)+' reads '+(a.length?a.join(', '):'<b style="color:var(--bad)">nothing (idle)</b>')).join('; ')+'.'+
      (idle?' A partition is read by at most one consumer of a group, so consumers beyond the partition count sit idle: the partition count caps a group\'s parallelism.':'')+
      ' A second group (say "analytics") would read all 12 messages again, at its own offsets.</p>'}
  [pS,cS].forEach(e=>e.addEventListener('input',draw));
  RD.onRender(draw);RD.onResize(draw);draw();
})();
