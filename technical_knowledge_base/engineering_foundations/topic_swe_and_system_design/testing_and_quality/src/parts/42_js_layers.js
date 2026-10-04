// ---- Reading: pyramid and trophy, click a layer ----
(function(){
  const TQ=window.TQ;
  const L={
    static:{n:'Static checks',what:'Type errors (passing a str where an int is expected), misspelled names, unused imports, unreachable code, a missing await.',
      miss:'Anything about values at run time: a wrong formula type-checks fine.',
      speed:'The whole repository in seconds, without running it.',
      here:'Not run on this page; {{Code design|n:3ef5c17b0d0d817b99a0ff9701ff30cd}} measures mypy and pyright on real code.',
      tools:'ruff (lint and format), mypy or pyright (types).'},
    unit:{n:'Unit tests',what:'Logic bugs inside one function or class: boundaries, off-by-one errors, wrong formulas, missing edge cases.',
      miss:'Bugs between components: SQL the real database reads differently, wrong configuration, serialisation mismatches.',
      speed:'Milliseconds each. Measured: the 26 retry-policy tests on this page run in 0.11 s in total.',
      here:'The chunker (section 3 and 7), the retry policy (section 14 and the Mutation lab), the LRU cache.',
      tools:'pytest, Hypothesis, pytest.approx, monkeypatch.'},
    int:{n:'Integration tests',what:'Bugs at the seams: queries, transactions, migrations, driver type conversions, HTTP client and server disagreeing.',
      miss:'Wiring of the full deployed system: DNS, load balancer, secrets, the other services.',
      speed:'Measured here: '+TQ.integ.pg_ms+' ms per PostgreSQL test plus '+TQ.calc.pgWarmMin+' to '+TQ.calc.pgWarmMax+' s of startup per run.',
      here:'Chat search: green on SQLite, wrong on PostgreSQL (section 6).',
      tools:'pgserver, testcontainers, CI service containers, a fake model server.'},
    e2e:{n:'End-to-end tests',what:'The system as a user sees it: the deploy works, services find each other, the happy path completes.',
      miss:'Edge cases (too slow to enumerate), and the cause of a failure: a red end-to-end test says "something is wrong" somewhere.',
      speed:'Seconds to minutes each, and the flakiest layer because it touches the most moving parts (illustrative; not measured here).',
      here:'Not built on this page; run a few critical journeys after each deploy (send a message, get a streamed reply).',
      tools:'HTTP clients against a staging deploy, Playwright for a browser UI, synthetic probes in production.'}
  };
  const det=document.getElementById('lay-detail');
  const link=s=>s.replace(/\{\{([^|{}]+)\|n:([0-9a-f]+)\}\}/g,'<a href="https://app.notion.com/p/$2" target="_blank" rel="noopener noreferrer">$1</a>');
  function pick(k){const d=L[k];
    document.querySelectorAll('#lay-card .shape button').forEach(b=>b.classList.toggle('on',b.dataset.l===k));
    det.innerHTML='<h3>'+d.n+'</h3><dl class="kv2"><dt>Catches</dt><dd>'+d.what+'</dd><dt>Misses</dt><dd>'+d.miss+'</dd><dt>Speed</dt><dd>'+d.speed+'</dd><dt>On this page</dt><dd>'+link(d.here)+'</dd><dt>Tools</dt><dd>'+d.tools+'</dd></dl>'}
  document.querySelectorAll('#lay-card .shape').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(b)pick(b.dataset.l)}));
  pick('unit');
})();
