(()=>{
  const sub=document.querySelector('.hero .sub');
  if(sub)sub.textContent='Andrés · Mili · Ampi · 4–17 noviembre';
  const kpis=[...document.querySelectorAll('.grid .kpi')];
  if(kpis[1])kpis[1].innerHTML='<b>17 Nov</b><span>Llegada EZE</span>';
})();
