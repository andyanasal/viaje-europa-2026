(()=>{
async function findDocumentMeta(item){
  try{
    const r=await fetch(SUPA_URL+'/rest/v1/trip_documents?trip_id=eq.'+encodeURIComponent(TRIP_ID)+'&item_id=eq.'+encodeURIComponent(item.id)+'&select=item_id,file_name,storage_path,uploaded_at&order=uploaded_at.desc&limit=1',{headers:APIH});
    if(!r.ok)return null;
    const a=await r.json();
    return a[0]||null;
  }catch(e){return null}
}

setDocStyle=async function(v,type,item){
  const d=await findDocumentMeta(item);
  v.classList.toggle('hasfile',!!d);
  if(d){v.title='Abrir '+d.file_name;v.setAttribute('aria-label','Abrir adjunto '+d.file_name)}
};

openDocument=async function(type,item){
  const k=docKey(type,item.id);
  const win=window.open('about:blank','_blank');
  try{
    if(navigator.onLine){
      const d=await findDocumentMeta(item);
      if(d){
        const signed=await getSigned(d.storage_path);
        if(signed){
          if(win)win.location.replace(signed);else location.href=signed;
          fetch(signed).then(r=>r.ok?r.blob():null).then(blob=>blob&&dbPut(k,{blob,name:d.file_name,type:blob.type||'application/pdf'})).catch(()=>{});
          return;
        }
      }
    }
    const cached=await dbGet(k);
    if(cached?.blob){
      const url=URL.createObjectURL(cached.blob);
      if(win)win.location.replace(url);else location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),300000);
      return;
    }
    if(win)win.close();
    toast(navigator.onLine?'Este pasaje no tiene un adjunto asociado':'Documento no disponible sin conexión');
  }catch(e){
    if(win)win.close();
    toast('No se pudo abrir el PDF');
  }
};

attachDocument=async function(type,item){
  if(!navigator.onLine){toast('Necesitás internet para adjuntar');return}
  const inp=document.createElement('input');
  inp.type='file';inp.accept='application/pdf,image/jpeg,image/png,image/webp';
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0];if(!f)return;
    if(f.size>10*1024*1024){toast('Máximo 10 MB');return}
    const safe=(f.name||'archivo.pdf').replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=TRIP_ID+'/'+item.id+'/'+Date.now()+'-'+safe;
    toast('Subiendo…');
    try{
      const up=await fetch(SUPA_URL+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':f.type||'application/octet-stream','x-upsert':'true'},body:f});
      if(!up.ok)throw new Error('upload');
      await fetch(SUPA_URL+'/rest/v1/trip_documents?trip_id=eq.'+encodeURIComponent(TRIP_ID)+'&item_id=eq.'+encodeURIComponent(item.id),{method:'DELETE',headers:{...APIH,'Prefer':'return=minimal'}}).catch(()=>{});
      const meta=await fetch(SUPA_URL+'/rest/v1/trip_documents',{method:'POST',headers:{...APIH,'Prefer':'return=minimal'},body:JSON.stringify({trip_id:TRIP_ID,item_id:item.id,file_name:f.name,storage_path:path,uploaded_at:new Date().toISOString()})});
      if(!meta.ok)throw new Error('metadata');
      await dbPut(docKey(type,item.id),{blob:f,name:f.name,type:f.type});
      toast('Documento guardado');
      renderList(type);
    }catch(e){toast('No se pudo adjuntar')}
  };
  inp.click();
};

precacheAllDocuments=async function(){
  if(!navigator.onLine)return;
  try{
    const r=await fetch(SUPA_URL+'/rest/v1/trip_documents?trip_id=eq.'+encodeURIComponent(TRIP_ID)+'&select=item_id,file_name,storage_path,uploaded_at',{headers:APIH});
    if(!r.ok)return;
    const ds=await r.json();
    for(const d of ds){
      try{
        const signed=await getSigned(d.storage_path),fr=await fetch(signed);if(!fr.ok)continue;
        const blob=await fr.blob();
        let type='flight';
        if((state.ticket||[]).some(x=>x.id===d.item_id))type='ticket';
        await dbPut(docKey(type,d.item_id),{blob,name:d.file_name,type:blob.type||'application/pdf'});
      }catch(e){}
    }
  }catch(e){}
};

renderList('flight');renderList('ticket');
if(navigator.onLine)precacheAllDocuments();
})();