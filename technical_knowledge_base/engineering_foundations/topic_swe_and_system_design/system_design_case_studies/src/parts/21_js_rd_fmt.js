// ---- Page addition to the skill's RD template: number formatting used by the estimates, diagrams and measured results ----
// thousands separators; dp defaults by magnitude
RD.fmt=function(v,dp){if(v===null||v===undefined||!isFinite(v))return 'n/a';
  if(dp===undefined)dp=Math.abs(v)>=100?0:Math.abs(v)>=10?1:Math.abs(v)>=1?2:3;
  const s=Number(v).toFixed(dp);const p=s.split('.');p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return p.join('.')};
