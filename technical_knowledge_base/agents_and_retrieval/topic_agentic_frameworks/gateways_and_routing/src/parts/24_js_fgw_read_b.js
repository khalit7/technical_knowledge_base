// ---- Reading tab, part 2: budget animation (E5), cache table (E6), translation (E7) ----
(function(){
  const F=window.FGW,E=RD.esc;
  const usd=v=>'$'+(v>=0.001?v.toFixed(4):v.toFixed(5));

  // E5: budget waves, three modes
  const B=F.e5.budget,pc=F.e5.per_call,wv=F.e5.waves;
  const MODES={old:'noreserve_no_max_tokens',nomax:'no_max_tokens',max16:'max_tokens_16'};
  let e5mode='nomax';
  function e5state(i){const w=wv[MODES[e5mode]];const a1=w.r.filter(x=>x[0]===1&&x[3]===200).length,a2=w.r.filter(x=>x[0]===2&&x[3]===200).length;
    const st=[{t:'20 calls arrive together',p:'Budget $'+B+'; each call really costs '+usd(pc)+', so 5 fit.',adm:0,spend:0,rsv:0,w:1},
      {t:'Admission, wave 1',p:e5mode==='old'?'Each call is checked against the spend recorded so far: $0 for all 20, so all 20 pass.':e5mode==='nomax'?'The first call reserves its worst case, about $0.082, far above the budget, so the reservation is shrunk to the whole $0.0004; the other 19 find nothing left and get HTTP 422.':'Each call reserves about $0.000095 (its input tokens plus 16 output tokens); four fit and a fifth takes the remainder; 15 get HTTP 422.',adm:a1,spend:0,rsv:e5mode==='old'?0:B,w:1},
      {t:'Wave 1 settles (2 s later)',p:'Each reservation is replaced by the real cost.',adm:a1,spend:a1*pc,rsv:0,w:1},
      {t:'Wave 2, 4 s after wave 1',p:a2?'Budget left: '+usd(B-a1*pc)+'. Again one call takes all of it.':'Nothing (or less than nothing) is left: all 20 are refused.',adm:a2,spend:a1*pc,rsv:a2?B-a1*pc:0,w:2},
      {t:'Final spend',p:'Recorded final spend '+usd(F.e5.spend_later['fgw-'+MODES[e5mode]])+' against a $'+B+' budget: '+(e5mode==='old'?'four times over.':'never over.'),adm:a2,spend:(a1+a2)*pc,rsv:0,w:2}];
    return st[i]}
  const e5cap=document.getElementById('fgw-e5cap');
  function e5(i){const el=document.getElementById('fgw-e5');if(!el)return;const s5=e5state(i),W=RD.width(el),w=wv[MODES[e5mode]];
    const L=8,R=W-18,maxv=Math.max(B*4.2,(s5.spend+s5.rsv)*1.05),X=v=>L+(R-L)*v/maxv;let s='';
    // request boxes
    const bw=Math.min(26,(R-L)/20-3);for(let k=0;k<20;k++){const x=L+k*(bw+3);const r=w.r.filter(q=>q[0]===s5.w)[k];
      const col=i===0?'var(--dim)':(r&&r[3]===200?'var(--good)':'var(--bad)');s+='<rect x="'+x+'" y="6" width="'+bw+'" height="16" rx="2" fill="'+col+'"/>'}
    s+=RD.t(L,36,'wave '+s5.w+': '+(i===0?'20 calls':(s5.adm+' accepted, '+(20-s5.adm)+' refused')),{fs:11});
    s+='<rect x="'+L+'" y="46" width="'+(R-L)+'" height="18" fill="var(--soft)" stroke="var(--line)"/>';
    s+='<rect x="'+L+'" y="46" width="'+(X(s5.spend)-L)+'" height="18" fill="var(--c1)"/>';
    if(s5.rsv>0)s+='<rect x="'+X(s5.spend)+'" y="46" width="'+(X(s5.spend+s5.rsv)-X(s5.spend))+'" height="18" fill="var(--c5)" opacity=".75"/>';
    s+='<line x1="'+X(B)+'" x2="'+X(B)+'" y1="40" y2="70" stroke="var(--bad)" stroke-width="2"/>'+RD.t(X(B)+3,80,'budget $'+B,{fs:10.5,fill:'var(--bad)'});
    s+=RD.t(L,96,'spent '+usd(s5.spend)+(s5.rsv>0?'   reserved '+usd(s5.rsv):''),{fs:11});
    el.innerHTML=RD.svg(W,104,s,'Budget bar with spend and reservations');
    e5cap.innerHTML='<div class="t">'+E(s5.t)+'</div><p>'+E(s5.p)+'</p>'}
  const an5=RD.anim({card:'fgw-e5card',ctl:'fgw-e5ctl',n:5,draw:e5,ms:2000,label:'Budget step'});
  RD.seg(document.getElementById('fgw-e5mode'),m=>{e5mode=m;an5.reset(5)});

  // E6: cache table
  (function(){const el=document.getElementById('fgw-e6');if(!el)return;
    el.innerHTML='<thead><tr><th>Call</th><th class="num">Seconds</th><th>Result</th><th>Cache key</th><th>Answer (first words)</th></tr></thead><tbody>'+F.e6.steps.map(s=>
      '<tr><td>'+E(s.label)+'</td><td class="num">'+s.s.toFixed(3)+'</td><td>'+(s.key?'<b style="color:var(--good)">hit</b>':'miss')+'</td><td class="mono">'+(s.key||'')+'</td><td class="small">'+E(s.text.split(' ').slice(0,9).join(' '))+' ...</td></tr>').join('')+'</tbody>'})();

  // E7: what reached the model server
  (function(){const el=document.getElementById('fgw-e7');if(!el)return;
    el.innerHTML='<div class="grid">'+F.e7.map(r=>'<div class="sp"><div class="n">model "'+E(r.model)+'"</div><p>Gateway sent <code>POST '+E(r.up_path)+'</code>, server answered '+r.up_status+'; caller got <b style="color:'+(r.status===200?'var(--good)':'var(--bad)')+'">'+r.status+'</b>.</p><p class="small mute">Body fields sent: '+r.up_keys.map(k=>'<code>'+E(k)+'</code>').join(', ')+'</p><pre class="small" style="white-space:pre-wrap;max-height:11em;overflow:auto">'+E(JSON.stringify(r.up_body,null,1)).slice(0,600)+'</pre></div>').join('')+'</div>'})();

  RD.onRender(()=>{an5.redraw()});RD.onResize(()=>{an5.redraw()});
})();