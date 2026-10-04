// ---- Reading: three Codex-12B samples for HumanEval/31 through HumanEval's tests, then HumanEval+'s ----
(function(){
  const H=CD.he;if(!document.getElementById('rd-he-card'))return;
  const nb=H.base.length,np=H.plus.length;
  // steps: 0 code; base in chunks of 5; plus in chunks of 20; verdict
  const steps=[{b:0,p:0}];
  for(let b=5;b<nb+5;b+=5)steps.push({b:Math.min(b,nb),p:0});
  for(let p=20;p<np+20;p+=20)steps.push({b:nb,p:Math.min(p,np)});
  steps.push({b:nb,p:np,end:1});
  let mode='c6';
  const code=document.getElementById('rd-he-code'),grid=document.getElementById('rd-he-grid'),cap=document.getElementById('rd-he-cap'),cnt=document.getElementById('rd-he-cnt');
  const lab={c6:'Sample 6',c4:'Sample 4',c1:'Sample 1'},mark={c6:'CORRECT',c4:'CORRECT',c1:'WRONG'};
  const esc=RD.esc;
  function sq(arr,res,ref,upto,from){let s='';for(let j=0;j<arr.length;j++){const r=j<upto?res[j]:'';
    const ttl='is_prime('+arr[j]+'): '+(r==='p'?'correct ('+ref[j]+')':r==='w'?'returned '+(!ref[j])+', expected '+ref[j]:r==='t'?'over '+H.limit+' s here; expected '+ref[j]:'not run yet');
    s+='<i class="'+(r?'r-'+r:'')+(j>=from&&j<upto?' cur':'')+'" title="'+esc(ttl)+'"></i>'}return s}
  function draw(i){
    const st=steps[i],prev=steps[Math.max(0,i-1)],R=H.res[mode];
    code.textContent='def is_prime(n):\n'+H.src[mode].split('\n').map(l=>'    '+l).join('\n');
    grid.innerHTML='<div class="lb">HumanEval tests: '+nb+' inputs</div><div class="sq">'+sq(H.base,R.base,H.refb,st.b,i>0&&st.p===0?prev.b:nb)+'</div>'+
      '<div class="lb">HumanEval+ inputs: '+np+'</div><div class="sq">'+sq(H.plus,R.plus,H.refp,st.p,st.p>0&&!st.end?prev.p:np)+'</div>';
    const cb=k=>{let x=0;for(let j=0;j<st.b;j++)if(R.base[j]===k)x++;return x},cp=k=>{let x=0;for(let j=0;j<st.p;j++)if(R.plus[j]===k)x++;return x};
    const firstBad=(arr,res,ref,a,b)=>{for(let j=a;j<b;j++)if(res[j]!=='p')return 'is_prime('+arr[j]+') '+(res[j]==='w'?'returned '+(!ref[j])+', expected '+ref[j]:'ran over '+H.limit+' s');return ''};
    let t,p;
    if(i===0){t=lab[mode]+', marked '+mark[mode]+' in the Codex paper';p='A Codex-12B completion at temperature 0.8, printed in the paper\'s Appendix B. HumanEval graded it '+mark[mode]+'. Press play to run its tests.'}
    else if(st.p===0){const bad=firstBad(H.base,R.base,H.refb,prev.b,st.b);t='HumanEval\'s tests: '+st.b+' of '+nb+' run';p=(bad?'Caught: '+bad+'. ':'All correct so far. ')+'These are the 13 inputs of HumanEval\'s check function for this problem.'}
    else if(!st.end){const bad=firstBad(H.plus,R.plus,H.refp,prev.p,st.p);t='HumanEval+ inputs: '+st.p+' of '+np+' run';p=(bad?'Caught: '+bad+'. ':'All correct in this batch. ')+'EvalPlus generated these inputs; the reference solution supplies the expected answers.'}
    else{const w=cp('w'),to=cp('t'),bb=nb-cb('p');t=bb?'Verdict: fails HumanEval already':(w+to?'Verdict: passes HumanEval, fails HumanEval+':'Verdict: passes both');
      p=bb?'It fails '+bb+' of HumanEval\'s own '+nb+' inputs (is_prime(1)), so it was graded WRONG; HumanEval+ adds '+w+' wrong answers and '+to+' over the time limit.':(w+to?'Graded CORRECT by HumanEval, it gives '+w+' wrong answers on HumanEval+ (0 and negative numbers called prime) and runs over '+H.limit+' s on '+to+' large inputs. Under HumanEval+ it is wrong.':'All '+(nb+np)+' inputs correct and fast: this one was correct.')}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    cnt.innerHTML=RD.stat('HumanEval tests passed',cb('p')+' / '+st.b,'of '+nb)+RD.stat('HumanEval+ inputs passed',cp('p')+' / '+st.p,'of '+np)+RD.stat('Wrong answers',String(cb('w')+cp('w')),'')+RD.stat('Over '+H.limit+' s',String(cp('t')),'this page\'s limit');
  }
  const A=RD.anim({card:'rd-he-card',ctl:'rd-he-ctl',n:steps.length,draw,ms:1000,label:'Batch of tests'});
  RD.seg(document.getElementById('rd-he-mode'),m=>{mode=m;A.go(0);A.play()});
})();
