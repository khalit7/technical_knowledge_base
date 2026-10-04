// ---- Reading sections 6 and 7: autovacuum threshold calculator, the measured churn replay, VACUUM FULL bars ----
(function(){
  const D=window.RPG,t=RD.t,esc=RD.esc,fmt=n=>Math.round(n).toLocaleString('en-US');
  // threshold calculator
  const SF=[0.005,0.01,0.05,0.1,0.2];
  const short=n=>n>=1e9?(n/1e9).toFixed(n>=1e10?0:1)+' billion':n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+' million':fmt(n);
  window.RPG_thr=function(rows,sf){const raw=50+sf*rows;return {raw,pg18:Math.min(raw,1e8)}};
  function thr(){
    const n=Math.round(Math.pow(10,+document.getElementById('rd-thr-n').value)),sf=SF[+document.getElementById('rd-thr-s').value];
    document.getElementById('rd-thr-nv').textContent=short(n);document.getElementById('rd-thr-sv').textContent=sf+(sf===0.2?' (default)':'');
    const r=RPG_thr(n,sf);
    document.getElementById('rd-thr-out').innerHTML=RD.stat('Dead tuples before vacuum, up to 17',short(r.raw),(100*r.raw/n).toFixed(r.raw/n<0.01?2:1)+'% of the table')+
      RD.stat('With the PostgreSQL 18 cap',short(r.pg18),r.pg18<r.raw?'capped at 100 million':'cap not reached')+
      RD.stat('Updates per second to reach it in an hour',fmt(r.pg18/3600),'(PostgreSQL 18 threshold / 3,600)');
  }
  ['rd-thr-n','rd-thr-s'].forEach(id=>document.getElementById(id).addEventListener('input',thr));thr();

  // churn replay
  const V=D.vacuum||{},S=V.series||[],base=V.base_size||S.length&&S[0][4];
  const PH={hot:['HOT updates, no index on the changed columns','Every update keeps the new version on the same page and touches no index; full pages are pruned on the fly. Dead tuples stay in the low thousands with no VACUUM at all.'],
    A:['One index on last_message_at: every update is a full update','Dead tuples climb at about 1,500 a second until the trigger (50 + 0.2 x 100,000 = 20,050), autovacuum runs, they drop. The table grows a little, then holds steady as freed space is reused.'],
    B:['A session left a transaction open','One idle-in-transaction session holds a snapshot. Autovacuum still runs every time the trigger is passed, but removes nothing: dead tuples and size climb in a straight line.'],
    after:['The session ends; one manual VACUUM','The old snapshot is gone: VACUUM removes the backlog in a fraction of a second. The file stays at its new size; the space is now free inside it.']};
  const M=Math.max(...S.map(p=>p[2]),1),MB=Math.max(...S.map(p=>p[4]))/2**20,mb0=Math.min(...S.map(p=>p[4]))/2**20;
  function drawVac(i){
    const el=document.getElementById('rd-vac');if(!el||!S.length)return;
    const W=Math.min(820,RD.width(el)),H=230,l=48,r=46,top=12,bot=30,pw=W-l-r,ph=H-top-bot,T0=S[0][0],T=S[S.length-1][0];
    const X=v=>l+pw*(v-T0)/(T-T0),Y=v=>top+ph*(1-v/(M*1.08)),Ys=v=>top+ph*(1-(v/2**20-mb0*.9)/(MB*1.05-mb0*.9));
    let s='';let ph0=null,x0=0;
    S.forEach((p,k)=>{if(p[7]!==ph0){if(ph0)s+=band(x0,X(p[0]),ph0);ph0=p[7];x0=X(p[0])}});s+=band(x0,X(T),ph0);
    function band(a,b,phase){const c={hot:'var(--soft)',A:'var(--bg)',B:'var(--hl)',after:'var(--soft)'}[phase];return '<rect x="'+a+'" y="'+top+'" width="'+Math.max(0,b-a)+'" height="'+ph+'" fill="'+c+'" opacity=".7"/>'}
    for(let k=0;k<=4;k++){const v=M*1.08*k/4,y=Y(v);s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+t(l-4,y+3,fmt(v/1000)+'k',{a:'end',fs:9.5,fill:'var(--mute)'})}
    for(let k=0;k<=3;k++){const v=mb0*.9+(MB*1.05-mb0*.9)*k/3;s+=t(W-r+4,Ys(v*2**20)+3,v.toFixed(1),{fs:9.5,fill:'var(--mute)'})}
    for(let k=0;k<=4;k++){const v=T0+(T-T0)*k/4;s+=t(X(v),H-12,Math.round(v)+' s',{a:'middle',fs:9.5,fill:'var(--mute)'})}
    const shown=S.slice(0,i+1);
    s+='<polyline fill="none" stroke="var(--bad)" stroke-width="1.8" points="'+shown.map(p=>X(p[0]).toFixed(1)+','+Y(p[2]).toFixed(1)).join(' ')+'"/>';
    s+='<polyline fill="none" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="5 3" points="'+shown.map(p=>X(p[0]).toFixed(1)+','+Ys(p[4]).toFixed(1)).join(' ')+'"/>';
    for(let k=1;k<shown.length;k++)if(shown[k][3]>shown[k-1][3])s+='<circle cx="'+X(shown[k][0])+'" cy="'+(top+ph-4)+'" r="3.5" fill="var(--c3)"/>';
    const thrY=Y(20050);s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+thrY+'" y2="'+thrY+'" stroke="var(--c3)" stroke-dasharray="2 3"/>'+t(l+4,thrY-3,'autovacuum trigger 20,050',{fs:9.5,fill:'var(--c3)'});
    el.innerHTML=RD.svg(W,H,s,'Dead tuples and table size over time');
    const p=S[i],hot=p[5]?100*p[6]/p[5]:0;
    document.getElementById('rd-vac-cnt').innerHTML=RD.stat('Time',Math.round(p[0])+' s','')+RD.stat('Dead tuples',fmt(p[2]),'')+RD.stat('Table size',(p[4]/2**20).toFixed(1)+' MB','started at '+(base/2**20).toFixed(1)+' MB')+
      RD.stat('Autovacuum runs',p[3],'')+RD.stat('HOT updates so far',hot.toFixed(0)+'%','of '+fmt(p[5]));
    const c=PH[p[7]]||['',''];document.getElementById('rd-vac-cap').innerHTML='<div class="t">'+esc(c[0])+'</div><p>'+esc(c[1])+'</p>';
  }
  const A=S.length?RD.anim({card:'rd-vac-card',ctl:'rd-vac-ctl',n:S.length,draw:drawVac,ms:110,label:'Second',start:S.length-1}):null;
  // VACUUM FULL bars
  function full(){
    const el=document.getElementById('rd-full');if(!el||!V.sizes)return;const mx=Math.max(...V.sizes.map(s=>s.bytes));
    el.innerHTML=V.sizes.map(s=>'<div class="row"><span class="nm" title="'+esc(s.label)+'">'+esc(s.label)+'</span><span class="track"><span class="fill" style="width:'+(100*s.bytes/mx).toFixed(1)+'%;background:'+(/FULL/.test(s.label)?'var(--c3)':'var(--acc)')+'"></span></span><span class="val">'+(s.bytes/2**20).toFixed(1)+' MB</span></div>').join('');
    const tm=(V.x&&V.x.sizes&&V.x.sizes.times)||{};
    document.getElementById('rd-full-cap').innerHTML='Total size of <code>messages</code> with its indexes. DELETE of 500,000 rows took '+tm.delete+' s, VACUUM '+tm.vacuum+' s, inserting 250,000 new rows '+tm.insert+' s (they went into the freed space: the file grew only '+((V.sizes[3].bytes-V.sizes[2].bytes)/2**20).toFixed(1)+' MB), VACUUM FULL '+tm.vacuum_full+' s. <span class="meas">measured</span>';
  }
  RD.onRender(()=>{full();A&&A.redraw()});RD.onResize(()=>{A&&A.redraw()});
})();
