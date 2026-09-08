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
.emptyrec{color:var(--muted);font-size:12px;padding:8px 4px 2px}
`;
document.head.appendChild(style);

function fixMainHeadings(){
  const names=['Itinerario','Pendientes','Recordatorios','Recomendaciones','Vuelos / Traslados','Entradas','Notas'];
  document.querySelectorAll('main > details > summary').forEach((s,i)=>{if(names[i])s.textContent=names[i]});
}
fixMainHeadings();

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
function stableStringify(v){
  if(Array.isArray(v))return '['+v.map(stableStringify).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stableStringify(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
function captureOpenState(){
  const h=document.getElementById('citiesList');
  const cities=new Set(),cats=new Map();
  if(!h)return {cities,cats};
  h.querySelectorAll('.citycard[open]').forEach(c=>{
    const id=c.dataset.cityId;if(!id)return;cities.add(id);
    const set=new Set();c.querySelectorAll('.catcard[open]').forEach(d=>set.add(d.dataset.cat));cats.set(id,set);
  });
  return {cities,cats};
}

const baseApplyCloud=applyCloud;
applyCloud=function(d){
  const current=cloudPayload();
  if(stableStringify(current)===stableStringify(d)){
    lastCloud=JSON.stringify(d);
    return;
  }
  const open=captureOpenState();
  state.itinerary=d.itinerary||state.itinerary;
  state.pending=d.pending||state.pending;
  state.restriction=d.restriction||state.restriction;
  state.flight=d.flight||state.flight;
  state.ticket=d.ticket||state.ticket||[];
  state.cities=d.cities||state.cities;
  document.getElementById('notes').value=d.notes||'';
  for(const k of listKeys)localStorage.setItem(KEY+k,JSON.stringify(state[k]));
  localStorage.setItem(KEY+'notes',d.notes||'');
  lastCloud=JSON.stringify(d);
  renderList('itinerary');renderList('pending');renderList('restriction');renderList('flight');renderList('ticket');
  renderCities(null,null,null,open);
};

renderCities=function(openCityId=null,openCat=null,editRecId=null,forcedOpen=null){
  const h=document.getElementById('citiesList');if(!h)return;
  const saved=forcedOpen||captureOpenState();
  if(openCityId)saved.cities.add(openCityId);
  if(openCityId&&openCat){if(!saved.cats.has(openCityId))saved.cats.set(openCityId,new Set());saved.cats.get(openCityId).add(openCat)}
  h.innerHTML='';
  state.cities.forEach(city=>{
    const c=document.createElement('details');c.className='citycard';c.dataset.cityId=city.id;c.open=saved.cities.has(city.id);
    c.innerHTML=`<summary>${esc(city.name)}</summary><div class="citytools"><button class="iconbtn editcity">Editar ciudad</button><button class="iconbtn danger delcity">Eliminar ciudad</button></div><div class="cats"></div>`;
    h.appendChild(c);
    c.querySelector('.editcity').onclick=e=>{e.stopPropagation();const name=prompt('Nombre de la ciudad',city.name);if(name===null)return;snap();city.name=name.trim()||city.name;persist();renderCities(city.id)};
    c.querySelector('.delcity').onclick=e=>{e.stopPropagation();if(!confirm('¿Seguro que querés eliminar esta ciudad y todas sus recomendaciones?'))return;snap();state.cities=state.cities.filter(x=>x.id!==city.id);persist();renderCities();toast('Ciudad eliminada · podés deshacer')};

    const groups={};(city.recs||[]).forEach(rec=>{const cat=recCategory(rec);(groups[cat]??=[]).push(rec)});
    const cats=[...preferred,...Object.keys(groups).filter(x=>!preferred.includes(x)).sort()];
    const ch=c.querySelector('.cats');
    cats.forEach(cat=>{
      const d=document.createElement('details');d.className='catcard';d.dataset.cat=cat;
      d.open=(saved.cats.get(city.id)||new Set()).has(cat);
      d.innerHTML=`<summary>${esc(cat)}</summary><div class="catinside"><div class="recs"></div><button class="addbtn addrec">+ Agregar en ${esc(cat)}</button></div>`;
      ch.appendChild(d);
      const rh=d.querySelector('.recs');
      const list=groups[cat]||[];
      if(!list.length){const empty=document.createElement('div');empty.className='emptyrec';empty.textContent='Sin recomendaciones en esta categoría.';rh.appendChild(empty)}
      list.forEach(rec=>{
        const rr=document.createElement('div');rr.className='recrow';rh.appendChild(rr);
        const showView=()=>{
          rr.innerHTML=`<div class="recval"><div class="rectitle">${esc(recTitle(rec))}</div>${rec.note?`<span class="recnote">${esc(rec.note)}</span>`:''}</div><div class="actions"><button class="iconbtn editrec">Editar</button><button class="iconbtn danger delrec">×</button></div>`;
          rr.querySelector('.editrec').onclick=showEdit;
          rr.querySelector('.delrec').onclick=()=>{if(!confirm('¿Eliminar esta recomendación?'))return;snap();city.recs=city.recs.filter(x=>x.id!==rec.id);persist();renderCities(city.id,cat);toast('Recomendación eliminada · podés deshacer')};
        };
        const showEdit=()=>{
          rr.innerHTML=`<div class="recval"><input class="editinput ri" value="${esc(recTitle(rec))}"><input class="editinput ni" style="margin-top:6px" placeholder="Nota / horario / día recomendado" value="${esc(rec.note||'')}"></div><div class="actions"><button class="iconbtn save">Guardar</button><button class="iconbtn cancel">Cancelar</button></div>`;
          const ri=rr.querySelector('.ri');ri.focus();ri.select();
          rr.querySelector('.save').onclick=()=>{const title=ri.value.trim();if(!title){toast('Escribí una recomendación');return}snap();rec.text=title;rec.category=cat;rec.note=rr.querySelector('.ni').value.trim();persist();renderCities(city.id,cat)};
          rr.querySelector('.cancel').onclick=()=>{if(rec.text==='Nueva recomendación'&&!rec.note){city.recs=city.recs.filter(x=>x.id!==rec.id);persist()}renderCities(city.id,cat)};
        };
        if(rec.id===editRecId)showEdit();else showView();
      });
      d.querySelector('.addrec').onclick=e=>{e.preventDefault();e.stopPropagation();snap();const rec={id:'rec'+Date.now(),text:'Nueva recomendación',category:cat,note:''};city.recs.push(rec);persist();renderCities(city.id,cat,rec.id)};
    });
  });
};

async function getDocumentSignedUrl(type,item){
  if(!navigator.onLine)return null;
  try{
    const ds=await docs();
    const meta=ds.find(x=>x.item_type===type&&x.item_id===item.id);
    if(!meta)return null;
    const r=await fetch(SUPA_URL+'/storage/v1/object/sign/'+BUCKET+'/'+meta.storage_path,{method:'POST',headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
    if(!r.ok)return null;
    const d=await r.json();const s=d.signedURL||d.signedUrl;if(!s)return null;
    return s.startsWith('http')?s:SUPA_URL+'/storage/v1'+s;
  }catch(e){return null}
}
openDocument=async function(type,item){
  const k=docKey(type,item.id);
  const win=window.open('about:blank','_blank');
  try{
    const direct=await getDocumentSignedUrl(type,item);
    if(direct){if(win)win.location.replace(direct);else location.href=direct;return}
    const cached=await dbGet(k);
    if(cached?.blob){const url=URL.createObjectURL(cached.blob);if(win)win.location.replace(url);else location.href=url;setTimeout(()=>URL.revokeObjectURL(url),300000);return}
    if(win)win.close();toast(navigator.onLine?'No pude recuperar el adjunto':'Documento no disponible sin conexión');
  }catch(e){if(win)win.close();toast('No se pudo abrir el archivo')}
};

renderAll();fixMainHeadings();
})();
