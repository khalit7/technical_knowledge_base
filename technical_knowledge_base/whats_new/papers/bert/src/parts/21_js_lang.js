// ---- The toy language's rules (a copy of grammar.py's lists; check_forward.py checks the truth labels match) ----
(function(g){
  const NAMES=['austin','paris','jordan','sydney','florence','chelsea','victoria','georgia'];
  const ANIMALS={dog:'barked',cat:'purred',duck:'quacked',cow:'mooed'};
  const PEOPLE=['man','woman','child','farmer'],ADJ=['big','small','old','young','brown','white','lazy','happy'];
  const PER_R=[['sang','a','song'],['smiled'],['laughed'],['is','a','doctor'],['has','a','brother'],['danced'],['waved'],['is','a','pilot'],['is','a','singer'],['has','a','cold']];
  const LOC_R=[['is','a','city'],['is','a','town'],['has','a','river'],['has','a','castle'],['flooded'],['is','a','port'],['is','a','village'],['has','a','harbour'],['has','a','bridge'],['lies','by','the','sea']];
  const PER_L=[['we','called'],['i','met'],['they','thanked'],['she','hugged'],['we','phoned'],['i','emailed']];
  const LOC_L=[['we','flew','to'],['she','lives','in'],['they','moved','to'],['i','was','born','in'],['we','drove','to'],['we','sailed','to']];
  const SEEN_R=5,SEEN_L=3;
  const PREFIX=[[],['yesterday'],['i','think'],['they','say'],['last','year'],['everyone','knows']];
  const SUFFIX=[[],['yesterday'],['last','year'],['again'],['today']];
  const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
  // the role of the (first) name and where its cue is: {at, role, side, seen, cue}
  function analyse(w){const at=w.findIndex(x=>NAMES.includes(x));if(at<0)return null;
    const left=w.slice(0,at),right=w.slice(at+1);
    for(const [list,role] of [[PER_L,'PER'],[LOC_L,'LOC']]){const k=list.findIndex(c=>eq(c,left));if(k>=0)return {at,role,side:'L',cue:k,seen:k<SEEN_L}}
    for(const [list,role] of [[PER_R,'PER'],[LOC_R,'LOC']]){const k=list.findIndex(c=>eq(c,right.slice(0,c.length)));if(k>=0)return {at,role,side:'R',cue:k,seen:k<SEEN_R}}
    return {at,role:null,side:null,cue:-1,seen:false}}
  function truth(w){const t=w.map(()=>'O'),a=analyse(w);if(a&&a.role)t[a.at]=a.role;return t}
  g.LANG={NAMES,ANIMALS,PEOPLE,ADJ,PER_R,LOC_R,PER_L,LOC_L,SEEN_R,SEEN_L,PREFIX,SUFFIX,analyse,truth};
})(typeof window!=='undefined'?window:globalThis);
