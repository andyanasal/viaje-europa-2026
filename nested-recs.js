(()=>{
const style=document.createElement('style');
style.textContent=`
.citycard{margin:8px 0;background:#101014;border:1px solid var(--line);border-radius:17px;overflow:hidden}
.citycard>summary{padding:14px 15px;font-size:16px}
.citytools{display:flex;gap:6px;justify-content:flex-end;padding:0 12px 8px}
.catcard{margin:7px 12px;background:#0d0d10;border:1px solid #24242a;border-radius:14px;overflow:hidden}
.catcard>summary{padding:12px 13px;font-size:14px}.catcard>summary:after{font-size:20px}
.catinside{padding:0 12px 12px}.recrow{display:flex;gap:8px;align-items:flex-start;padding:9px 0;border-top:1px solid #202026}.recrow:first-child{border-top:0}
.recval{flex:1;padding:2px 4px}.rectitle{font-size:14px;font-weight:650}.recnote{display:block;color:var(--muted);font-size:12px;line-height:1.35;margin-top:4px}
`;
document.head.appendChild(style);

function fixMainHeadings(){const names=['Itinerario','Pendientes','Recordatorios','Recomendaciones','Vuelos / Traslados','Entradas','Notas'];document.querySelectorAll('main > details > summary').forEach((s,i)=>{if(names[i])s.textContent=names[i]})}
fixMainHeadings();

const preferred=['Imperdibles','Museos / cultura','Con Ampi','Gastronomía','Paseos / parques','Compras'];
function recCategory(rec){if(rec.category)return rec.category;const t=String(rec.text||'');const i=t.indexOf('→');return i>0?t.slice(0,i).trim():'Otros'}
function recTitle(rec){const t=String(rec.text||'');const i=t.indexOf('→');return i>=0?t.slice(i+1).trim():t}

renderCities=function(openCityId=null,openCat=null,editRecId=null){
  const h=document.getElementById('citiesList');if(!h)return;
  if(openCityId===null){const oc=h.querySelector('.citycard[open]');if(oc)openCityId=oc.dataset.cityId||null}
  if(openCat===null&&openCityId){const od=h.querySelector('.citycard[open] .catcard[open]');if(od)openCat=od.dataset.cat||null}
  h.innerHTML='';
  state.cities.forEach(city=>{
    const c=document.createElement('details');c.className='citycard';c.dataset.cityId=city.id;if(city.id===openCityId)c.open=true;
    c.innerHTML=`<summary>${esc(city.name)}</summary><div class="citytools"><button class="iconbtn editcity">Editar ciudad</button><button class="iconbtn danger delcity">Eliminar ciudad</button></div><div class="cats"></div>`;h.appendChild(c);
    c.querySelector('.editcity').onclick=e=>{e.stopPropagation();const name=prompt('Nombre de la ciudad',city.name);if(name===null)return;snap();city.name=name.trim()||city.name;persist();renderCities(city.id)};
    c.querySelector('.delcity').onclick=e=>{e.stopPropagation();if(!confirm('¿Seguro que querés eliminar esta ciudad y todas sus recomendaciones?'))return;snap();state.cities=state.cities.filter(x=>x.id!==city.id);persist();renderCities();toast('Ciudad eliminada · podés deshacer')};
    const groups={};city.recs.forEach(rec=>{const cat=recCategory(rec);(groups[cat]??=[]).push(rec)});
    const cats=[...preferred.filter(x=>groups[x]),...Object.keys(groups).filter(x=>!preferred.includes(x)).sort()];const ch=c.querySelector('.cats');
    cats.forEach(cat=>{
      const d=document.createElement('details');d.className='catcard';d.dataset.cat=cat;if(city.id===openCityId&&cat===openCat)d.open=true;
      d.innerHTML=`<summary>${esc(cat)}</summary><div class="catinside"><div class="recs"></div><button class="addbtn addrec">+ Agregar en ${esc(cat)}</button></div>`;ch.appendChild(d);const rh=d.querySelector('.recs');
      groups[cat].forEach(rec=>{
        const rr=document.createElement('div');rr.className='recrow';rh.appendChild(rr);
        const showView=()=>{rr.innerHTML=`<div class="recval"><div class="rectitle">${esc(recTitle(rec))}</div>${rec.note?`<span class="recnote">${esc(rec.note)}</span>`:''}</div><div class="actions"><button class="iconbtn editrec">Editar</button><button class="iconbtn danger delrec">×</button></div>`;rr.querySelector('.editrec').onclick=showEdit;rr.querySelector('.delrec').onclick=()=>{if(!confirm('¿Eliminar esta recomendación?'))return;snap();city.recs=city.recs.filter(x=>x.id!==rec.id);persist();renderCities(city.id,cat);toast('Recomendación eliminada · podés deshacer')}};
        const showEdit=()=>{rr.innerHTML=`<div class="recval"><input class="editinput ri" value="${esc(recTitle(rec))}"><input class="editinput ni" style="margin-top:6px" placeholder="Nota / horario / día recomendado" value="${esc(rec.note||'')}"></div><div class="actions"><button class="iconbtn save">Guardar</button><button class="iconbtn cancel">Cancelar</button></div>`;const ri=rr.querySelector('.ri');ri.focus();ri.select();rr.querySelector('.save').onclick=()=>{const title=ri.value.trim();if(!title){toast('Escribí una recomendación');return}snap();rec.text=title;rec.category=cat;rec.note=rr.querySelector('.ni').value.trim();persist();renderCities(city.id,cat)};rr.querySelector('.cancel').onclick=()=>{if(rec.text==='Nueva recomendación'&&!rec.note){city.recs=city.recs.filter(x=>x.id!==rec.id);persist()}renderCities(city.id,cat)}};
        if(rec.id===editRecId)showEdit();else showView();
      });
      d.querySelector('.addrec').onclick=e=>{e.preventDefault();e.stopPropagation();snap();const rec={id:'rec'+Date.now(),text:'Nueva recomendación',category:cat,note:''};city.recs.push(rec);persist();renderCities(city.id,cat,rec.id)};
    });
    if(!cats.length){const empty=document.createElement('div');empty.className='smalltxt';empty.style.padding='0 14px 12px';empty.textContent='Sin recomendaciones todavía.';ch.appendChild(empty)}
  })
};

async function getDocumentSignedUrlMobile(id){
  if(!navigator.onLine||typeof getDocumentMeta!=='function')return null;
  try{const meta=await getDocumentMeta(id);if(!meta)return null;const r=await fetch(SUPA_URL+'/storage/v1/object/sign/'+BUCKET+'/'+meta.storage_path,{method:'POST',headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});if(!r.ok)return null;const d=await r.json();const s=d.signedURL||d.signedUrl;if(!s)return null;return s.startsWith('http')?s:SUPA_URL+'/storage/v1'+s}catch(e){return null}
}

if(typeof itemRow==='function'){
  const baseItemRow=itemRow;
  itemRow=function(type,item){
    const row=baseItemRow(type,item);
    if(type==='flight'||type==='ticket'){
      const nameEl=row.querySelector('.namev');
      if(nameEl)nameEl.onclick=async()=>{
        const win=window.open('about:blank','_blank');
        try{
          if(navigator.onLine){const direct=await getDocumentSignedUrlMobile(item.id);if(direct){if(win)win.location.replace(direct);else location.href=direct;return}}
          const file=await getDocumentFile(item.id);if(!file){if(win)win.close();toast(navigator.onLine?'No pude recuperar el adjunto':'Este archivo todavía no está guardado offline');return}
          const url=URL.createObjectURL(file);if(win)win.location.replace(url);else location.href=url;setTimeout(()=>URL.revokeObjectURL(url),300000)
        }catch(e){if(win)win.close();toast('No se pudo abrir el archivo')}
      };
    }
    return row;
  };
}

renderAll();fixMainHeadings();
})();
