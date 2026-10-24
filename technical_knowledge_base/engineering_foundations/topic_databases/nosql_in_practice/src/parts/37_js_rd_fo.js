// ---- Section 3: Redis failover stepper, the measured run (inputs/redis.json replication) ----
(function(){
  const svgEl=document.getElementById('rd-fo-svg');if(!svgEl||!window.NQ||!NQ.redis)return;
  const R=NQ.redis.replication,T=RD.t,f0=n=>Math.round(n).toLocaleString('en-US');
  const tot=R.before_acked+R.during_acked;
  // per step: primary count, replica count, replica paused, primary dead, replica promoted, caption
  const S=[
    {p:R.before_acked,r:R.before_on_replica,cap:['In sync',f0(R.before_acked)+' writes of 10 KB acknowledged; all '+f0(R.before_on_replica)+' reached the replica, and <code>WAIT</code> returned '+R.wait_before+'.']},
    {p:R.before_acked,r:R.before_on_replica,paused:1,cap:['The replica stalls','The replica is paused, as a long garbage-collection pause or a network problem would stop it. The primary does not know or care.']},
    {p:tot,r:R.before_on_replica+R.during_survived,paused:1,ok:1,cap:['The primary keeps saying OK',f0(R.during_acked)+' more writes, each acknowledged to the client before it is copied. <code>WAIT 1 500</code> returned '+R.wait_during+': no replica confirmed, and the writes are not made safer by asking.']},
    {p:tot,r:R.before_on_replica+R.during_survived,paused:1,dead:1,cap:['The primary dies','<code>kill -9</code> on the primary. Its memory, holding every acknowledged write, is gone.']},
    {p:tot,r:R.before_on_replica+R.during_survived,dead:1,promo:1,cap:['The replica is promoted','It resumes and becomes the primary with only '+R.during_survived+' of the '+f0(R.during_acked)+' acknowledged writes: '+f0(R.lost)+' are lost although every client was told OK.']}
  ];
  function draw(i){const st=S[i],w=RD.width(svgEl),h=150,col=Math.min(170,(w-40)/2.3);let s='';
    const node=(x,lab,n,o)=>{let b='<rect x="'+x+'" y="22" width="'+col+'" height="94" rx="6" fill="'+(o.dead?'var(--soft)':'var(--bg)')+'" stroke="'+(o.dead?'var(--bad)':o.paused?'var(--c5)':'var(--line)')+'" stroke-width="'+(o.dead||o.paused?2:1)+'"'+(o.dead?' stroke-dasharray="5 3"':'')+'/>';
      b+=T(x+8,16,lab,{fs:11.5,w:700});const fill=n/tot,bh=60;
      b+='<rect x="'+(x+10)+'" y="'+(46)+'" width="'+(col-20)+'" height="'+bh+'" fill="var(--soft)" stroke="var(--line)"/>';
      b+='<rect x="'+(x+10)+'" y="'+(46+bh*(1-fill)).toFixed(1)+'" width="'+(col-20)+'" height="'+(bh*fill).toFixed(1)+'" fill="'+(o.dead?'var(--dim)':'var(--c4)')+'"/>';
      b+=T(x+col/2,40,f0(n)+' writes',{a:'middle',fs:11.5,w:600});
      if(o.tag)b+=T(x+col/2,132,o.tag,{a:'middle',fs:11,fill:o.tc||'var(--mute)',w:600});return b};
    const px=10,rx=w-col-10;
    s+=node(px,st.promo?'old primary':'primary',st.p,{dead:st.dead,tag:st.dead?'killed':st.ok?'replies OK to each write':'',tc:st.dead?'var(--bad)':'var(--good)'});
    s+=node(rx,st.promo?'replica, now primary':'replica',st.r,{paused:st.paused,tag:st.paused?'paused':st.promo?'has '+f0(st.r)+' of '+f0(tot):'',tc:st.promo?'var(--bad)':'var(--c5)'});
    const ay=70,ax1=px+col+6,ax2=rx-6;
    s+='<line x1="'+ax1+'" y1="'+ay+'" x2="'+ax2+'" y2="'+ay+'" stroke="'+(st.paused||st.dead?'var(--line)':'var(--mute)')+'" stroke-width="2" stroke-dasharray="'+(st.paused||st.dead?'4 4':'0')+'"/>';
    if(ax2-ax1>60)s+=T((ax1+ax2)/2,ay-6,st.dead?'':'copy after OK',{a:'middle',fs:10.5,fill:'var(--mute)'});
    svgEl.innerHTML=RD.svg(w,h,s,'Primary and replica write counts at step '+(i+1));
    document.getElementById('rd-fo-cap').innerHTML='<div class="t">'+(i+1)+'/'+S.length+'. '+st.cap[0]+'</div><p>'+st.cap[1]+'</p>'}
  RD.anim({card:'rd-fo-card',ctl:'rd-fo-ctl',n:S.length,draw,ms:1800,label:'Step'});
  RD.onResize(()=>draw(+document.getElementById('rd-fo-ctl-s').value));
})();
