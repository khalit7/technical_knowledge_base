// ---- Reading: PII rail on real Nemotron-PII records, regex against GLiNER, before and after masking ----
(function(){
  const esc=RD.esc,P=GD.pii,DEMO=GD.piiDemo;
  const DIRECT=['first_name','last_name','email','phone_number','ssn','credit_debit_card','street_address','date_of_birth','account_number','medical_record_number','bank_routing_number','customer_id','health_plan_beneficiary_number','employee_id','fax_number','user_name','password','pin','cvv','license_plate','vehicle_identifier','certificate_license_number','swift_bic','ipv4','ipv6','mac_address','api_key','tax_id','unique_id','biometric_identifier','http_cookie','url','coordinate'];
  const QUASI=['occupation','race_ethnicity','religious_belief','political_view','sexuality','gender','age','education_level','employment_status','language','blood_type','company_name'];
  const MODES=[['none','No rail'],['rx','Regex'],['gl','GLiNER'],['both','Both']];
  const st={mode:'rx',rec:0,t:5};
  const seg=document.getElementById('rd-pii-mode');
  seg.innerHTML=MODES.map(([k,n])=>'<button data-m="'+k+'">'+n+'</button>').join('')+'<span class="small mute" style="align-self:center;padding:0 8px">GLiNER threshold</span>'+[3,5,7].map(t=>'<button data-th="'+t+'">0.'+t+'</button>').join('');
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.m)st.mode=b.dataset.m;if(b.dataset.th)st.t=+b.dataset.th;draw()});
  const rec=document.getElementById('rd-pii-rec');
  rec.innerHTML='<span class="small mute" style="align-self:center">Record:</span>'+DEMO.map((d,i)=>'<button data-r="'+i+'">'+esc(d[1].slice(0,28))+'</button>').join('');
  rec.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.rec=+b.dataset.r;draw()});
  const keep=(p)=>st.mode==='none'?false:st.mode==='rx'?p[4]===0:st.mode==='gl'?(p[4]===1&&p[3]>=st.t/10):(p[4]===0||p[3]>=st.t/10);
  function draw(){
    seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.mode||(b.dataset.th&&+b.dataset.th===st.t)));
    rec.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.r===st.rec));
    const [i,doc,text,gold,preds]=DEMO[st.rec];const n=text.length;
    const m=new Array(n).fill(0),g=new Array(n).fill(0);
    preds.filter(keep).forEach(p=>{for(let k=p[0];k<Math.min(p[1],n);k++)m[k]=1});
    gold.forEach(s=>{for(let k=s[0];k<s[1];k++)g[k]=1});
    let caught=0;gold.forEach(s=>{let c=0;for(let k=s[0];k<s[1];k++)c+=m[k];if(2*c>=s[1]-s[0])caught++});
    let over=0;for(let k=0;k<n;k++)if(m[k]&&!g[k])over++;
    // render runs of equal (m,g)
    let h='',k=0;
    while(k<n){let j=k;while(j<n&&m[j]===m[k]&&g[j]===g[k])j++;
      const s=esc(text.slice(k,j));
      if(m[k]&&g[k])h+='<span style="background:var(--good);color:var(--bg)">'+s.replace(/[^\s]/g,'&#9608;')+'</span>';
      else if(m[k])h+='<span style="background:var(--c5);color:var(--bg)">'+s.replace(/[^\s]/g,'&#9608;')+'</span>';
      else if(g[k])h+='<span style="text-decoration:underline 2px var(--bad);text-underline-offset:3px;color:var(--bad)">'+s+'</span>';
      else h+=s;k=j}
    document.getElementById('rd-pii-text').innerHTML=h;
    document.getElementById('rd-pii-leg').innerHTML='<span><i style="background:var(--good)"></i>personal data masked</span><span><i class="ln" style="background:var(--bad)"></i>personal data left in (gold span, underlined)</span><span><i style="background:var(--c5)"></i>masked but not personal data</span>';
    document.getElementById('rd-pii-out').innerHTML=RD.stat('Gold spans masked',caught+' of '+gold.length,'this record, '+esc(doc))+RD.stat('Over-masked characters',over,'outside any gold span');
    // aggregate table
    const key=m=>m==='rx'?'rx':m==='gl'?'gl'+st.t:'both'+st.t;
    const sum=(o,labs)=>{let h=0,t=0;labs.forEach(l=>{h+=o.hit[l]||0;t+=o.tot[l]||0});return [h,t]};
    const row=(name,o,ms)=>{const all=sum(o,Object.keys(o.tot)),d=sum(o,DIRECT),q=sum(o,QUASI);
      const f=a=>(100*a[0]/a[1]).toFixed(1)+'%';
      return '<tr><td>'+name+'</td><td class="num">'+f(all)+'</td><td class="num">'+f(d)+'</td><td class="num">'+f(q)+'</td><td class="num">'+(100*o.prec).toFixed(1)+'%</td><td class="num">'+ms+'</td></tr>'};
    document.getElementById('rd-pii-tab').innerHTML='<table class="rd-t"><thead><tr><th>Over all 200 records</th><th class="num">All spans caught</th><th class="num">Direct identifiers</th><th class="num">Quasi-identifiers</th><th class="num">Masked chars that were PII</th><th class="num">ms per record</th></tr></thead><tbody>'+
      row('Regex',P.rx,GD.piiMs[0].toFixed(2))+row('GLiNER at 0.'+st.t,P['gl'+st.t],Math.round(GD.piiMs[1]))+row('Both',P['both'+st.t],Math.round(GD.piiMs[1]))+'</tbody></table>';
    const tot=Object.values(P.rx.tot).reduce((a,b)=>a+b,0);
    document.getElementById('rd-pii-note').innerHTML='Detectors: seven regular expressions written for this page (email, URL, IPv4, phone, card-like digit runs, US SSN, ISO and slash dates) and urchade/gliner_multi_pii-v1 (Apache 2.0) asked for 18 labels, run at 0.2 with scores kept so the threshold can move; URL was not among the labels, which is why GLiNER finds none. A gold span counts as caught when at least half its characters are masked. '+tot+' gold spans over 200 test records; "direct identifiers" and "quasi-identifiers" are this page\'s grouping of the dataset\'s labels (listed in src/README.md). Timing: 2 CPU threads on this page\'s laptop.';
  }
  draw();
})();
