// ---- Reading, section 2: pyramid and trophy drawn side by side; click a band for what that layer catches, misses and costs ----
(function(){
  const TQ=window.TQ,S=window.TQS;if(!document.getElementById('tq-lay'))return;
  const L={
    static:{n:'Static checks',what:'Type errors (passing a str where an int is expected), misspelled names, unused imports, unreachable code, a missing await.',
      miss:'Anything about values at run time: a wrong formula type-checks fine.',
      speed:'The whole repository in seconds, without running it.',
      here:'Not run on this page (section 12); {{Code design|n:3ef5c17b0d0d817b99a0ff9701ff30cd}} measures mypy and pyright on real code.',
      tools:'ruff (lint and format), mypy or pyright (types).'},
    unit:{n:'Unit tests',what:'Logic bugs inside one function or class: boundaries, off-by-one errors, wrong formulas, missing edge cases.',
      miss:'Bugs between components: SQL the real database reads differently, wrong configuration, serialisation mismatches.',
      speed:'Milliseconds each. Measured: the 26 retry-policy tests on this page run in 0.11 s in total.',
      here:'The chunker (sections 3 and 6), the retry policy (section 10 and its mutation lab), the LRU cache.',
      tools:'pytest, Hypothesis, pytest.approx, monkeypatch.'},
    int:{n:'Integration tests',what:'Bugs at the seams: queries, transactions, migrations, driver type conversions, HTTP client and server disagreeing.',
      miss:'Wiring of the full deployed system: DNS, load balancer, secrets, the other services.',
      speed:'Measured here: '+TQ.integ.pg_ms+' ms per PostgreSQL test plus '+TQ.calc.pgWarmMin+' to '+TQ.calc.pgWarmMax+' s of startup per run.',
      here:'Chat search: green on SQLite, wrong on PostgreSQL (section 5).',
      tools:'pgserver, testcontainers, CI service containers, a fake model server.'},
    e2e:{n:'End-to-end tests',what:'The system as a user sees it: the deploy works, services find each other, the happy path completes.',
      miss:'Edge cases (too slow to enumerate), and the cause of a failure: a red end-to-end test says "something is wrong" somewhere.',
      speed:'Seconds to minutes each, and the flakiest layer because it touches the most moving parts (illustrative; not measured here).',
      here:'Not built on this page; run a few critical journeys after each deploy (send a message, get a streamed reply).',
      tools:'HTTP clients against a staging deploy, Playwright for a browser UI, synthetic probes in production.'}
  };
  const SH={pyr:{t:'Pyramid (Cohn)',b:[['e2e',.34],['int',.62],['unit',.92]]},tro:{t:'Trophy (Dodds)',b:[['e2e',.36],['int',.9],['unit',.58],['static',.72]]}};
  const NM={e2e:'End-to-end',int:'Integration',unit:'Unit',static:'Static'};
  let cur='unit';
  function draw(w){const g=18,cw=(w-g)/2,bh=36,gap=5;let b='';
    ['pyr','tro'].forEach((k,si)=>{const s=SH[k],x0=si*(cw+g);b+=S.T(x0+cw/2,14,s.t,{a:'middle',fs:12,fill:'var(--mute)'});
      s.b.forEach(([l,f],i)=>{const bw=cw*f,x=x0+(cw-bw)/2,y=24+i*(bh+gap),on=l===cur;
        const name=bw<NM[l].length*6.6+8?(l==='e2e'?'E2E':l==='int'?'Integr.':NM[l]):NM[l];
        b+='<g class="lay-pick" data-l="'+l+'" role="button" tabindex="0" aria-label="'+NM[l]+'">'+S.box(x,y,bw,bh,{hl:on,sw:on?2:1,rx:6})+S.T(x+bw/2,y+bh/2+4,name,{a:'middle',fs:11.5,w:on?600:400})+'</g>'})});
    return S.svg(w,24+4*(bh+gap),b,'Test pyramid and testing trophy; click a band')}
  const det=document.getElementById('lay-detail');
  const link=s=>s.replace(/\{\{([^|{}]+)\|n:([0-9a-f]+)\}\}/g,'<a href="https://app.notion.com/p/$2" target="_blank" rel="noopener noreferrer">$1</a>');
  function detail(){const d=L[cur];det.innerHTML='<h3>'+d.n+'</h3><dl class="kv2"><dt>Catches</dt><dd>'+d.what+'</dd><dt>Misses</dt><dd>'+d.miss+'</dd><dt>Speed</dt><dd>'+d.speed+'</dd><dt>On this page</dt><dd>'+link(d.here)+'</dd><dt>Tools</dt><dd>'+d.tools+'</dd></dl>'}
  S.mount('tq-lay',draw);detail();
  const el=document.getElementById('tq-lay');
  const pick=e=>{const g=e.target.closest('.lay-pick');if(!g)return;cur=g.dataset.l;el.innerHTML=draw(S.W(el));detail()};
  el.addEventListener('click',pick);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e)}});
})();
