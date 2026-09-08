(()=>{
const style=document.createElement('style');
style.textContent=`
.citycard{margin:8px 0;background:#101014;border:1px solid var(--line);border-radius:17px;overflow:hidden}
.citycard>summary{padding:14px 15px;font-size:16px}
.citytools{display:flex;gap:6px;justify-content:flex-end;padding:0 12px 8px}
.catcard{margin:7px 12px;background:#0d0d10;border:1px solid #24242a;border-radius:14px;overflow:hidden}
.catcard>summary{padding:12px 13px;font-size:14px}
.catcard>summary:after{font-size:20px}
.catinside{padding:0 12px 12px}
.recrow{display:flex;gap:8px;align-items:flex-start;padding:9px 0;border-top:1px solid #202026}
.recrow:first-child{border-top:0}
.recval{flex:1;padding:2px 4px}
.rectitle{font-size:14px;font-weight:650}
.recnote{display:block;color:var(--muted);font-size:12px;line-height:1.35;margin-top:4px}
`;
document.head.appendChild(style);

const preferred=['Imperdibles','Museos / cultura','Con Ampi','Gastronomía','Paseos / parques','Compras'];
function recCategory(rec){
  if(rec.category)return rec.category;
  const t=String(rec.text||'');
  const i=t.indexOf('→');
  return i>0?t.slice(0,i).trim():'Otros';
}
function recTitle(rec){
  const t=String(rec.text||'');
  const i=t.indexOf('→');
  return i>=0?t.slice(i+1).trim():t;
}

renderCities=function(){
  const h=document.getElementById('citiesList');
  if(!h)return;
  h.innerHTML='';
  state.cities.forEach(city=>{
    const c=document.createElement('details');
    c.className='citycard';
    c.innerHTML=`<summary>${esc(city.name)}</summary><div class="citytools"><button class="iconbtn editcity">Editar ciudad</button><button class="iconbtn danger delcity">Eliminar ciudad</button></div><div class="cats"></div>`;
    h.appendChild(c);

    c.querySelector('.editcity').onclick=e=>{
      e.stopPropagation();
      const name=prompt('Nombre de la ciudad',city.name);
      if(name===null)return;
      snap();
      city.name=name.trim()||city.name;
      persist();
      renderCities();
    };
    c.querySelector('.delcity').onclick=e=>{
      e.stopPropagation();
      if(!confirm('¿Seguro que querés eliminar esta ciudad y todas sus recomendaciones?'))return;
      snap();
      state.cities=state.cities.filter(x=>x.id!==city.id);
      persist();
      renderCities();
      toast('Ciudad eliminada · podés deshacer');
    };

    const groups={};
    city.recs.forEach(rec=>{
      const cat=recCategory(rec);
      (groups[cat]??=[]).push(rec);
    });
    const cats=[...preferred.filter(x=>groups[x]),...Object.keys(groups).filter(x=>!preferred.includes(x)).sort()];
    const ch=c.querySelector('.cats');

    cats.forEach(cat=>{
      const d=document.createElement('details');
      d.className='catcard';
      d.innerHTML=`<summary>${esc(cat)}</summary><div class="catinside"><div class="recs"></div><button class="addbtn addrec">+ Agregar en ${esc(cat)}</button></div>`;
      ch.appendChild(d);
      const rh=d.querySelector('.recs');

      groups[cat].forEach(rec=>{
        const rr=document.createElement('div');
        rr.className='recrow';
        rr.innerHTML=`<div class="recval"><div class="rectitle">${esc(recTitle(rec))}</div>${rec.note?`<span class="recnote">${esc(rec.note)}</span>`:''}</div><div class="actions"><button class="iconbtn editrec">Editar</button><button class="iconbtn danger delrec">×</button></div>`;
        rh.appendChild(rr);

        rr.querySelector('.editrec').onclick=()=>{
          rr.innerHTML=`<div class="recval"><input class="editinput ri" value="${esc(recTitle(rec))}"><input class="editinput ni" style="margin-top:6px" placeholder="Nota / horario / día recomendado" value="${esc(rec.note||'')}"></div><div class="actions"><button class="iconbtn save">Guardar</button><button class="iconbtn cancel">Cancelar</button></div>`;
          rr.querySelector('.save').onclick=()=>{
            snap();
            rec.text=rr.querySelector('.ri').value;
            rec.category=cat;
            rec.note=rr.querySelector('.ni').value;
            persist();
            renderCities();
          };
          rr.querySelector('.cancel').onclick=renderCities;
        };
        rr.querySelector('.delrec').onclick=()=>{
          if(!confirm('¿Eliminar esta recomendación?'))return;
          snap();
          city.recs=city.recs.filter(x=>x.id!==rec.id);
          persist();
          renderCities();
          toast('Recomendación eliminada · podés deshacer');
        };
      });

      d.querySelector('.addrec').onclick=()=>{
        snap();
        city.recs.push({id:'rec'+Date.now(),text:'Nueva recomendación',category:cat,note:''});
        persist();
        renderCities();
      };
    });

    if(!cats.length){
      const empty=document.createElement('div');
      empty.className='smalltxt';
      empty.style.padding='0 14px 12px';
      empty.textContent='Sin recomendaciones todavía.';
      ch.appendChild(empty);
    }
  });
};

renderCities();
})();
