
(async()=>{
  const root=document.getElementById('bio-public');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mins=t=>{let [h,m]=String(t).split(':').map(Number);return h*60+m};
  const ov=(a,b)=>a.day===b.day&&Math.max(mins(a.start),mins(b.start))<Math.min(mins(a.end),mins(b.end));

  let DATA;
  try{
    const r=await fetch('biomedicina-2026-2.json',{cache:'no-store'});
    if(!r.ok) throw new Error('Falha ao carregar JSON');
    DATA=await r.json();
  }catch(err){
    root.innerHTML='<div class="bio-note"><b>Não foi possível carregar a base de horários.</b></div>';
    return;
  }

  const id=o=>o.code+'|'+o.offer;
  const get=x=>DATA.offers.find(o=>id(o)===x);
  const groups=()=>{const m=new Map();DATA.offers.forEach(o=>{const k=o.code+'|'+o.name;if(!m.has(k))m.set(k,[]);m.get(k).push(o)});return m};

  root.innerHTML=`<div class="bio-hero"><small>UFPR · CURSO DE BIOMEDICINA</small><h1>${esc(DATA.title||'BIOMEDICINA 2026-2')}</h1><p>Monte sua grade, selecione as turmas e consulte docentes, horários e ensalamento.</p></div>
  <div class="bio-panel"><div class="bio-controls">
    <label>Período<select id="bio-period"><option value="2º período">2º período</option><option value="4º período">4º período</option><option value="6º período" selected>6º período</option><option value="7º e 8º período">7º e 8º período</option></select></label>
    <label>Nº de optativas<select id="bio-nopt"><option>0</option><option>1</option><option selected>2</option><option>3</option></select></label>
    <label>Ordenar<select id="bio-sort"><option value="free">Mais horas livres</option><option value="days">Menos dias</option><option value="late">Início mais tarde</option></select></label>
    <label>Buscar<input id="bio-search" type="text" placeholder="código ou disciplina"></label>
  </div></div>
  <div class="bio-panel bio-section"><div class="bio-title"><h2>1. Disciplinas obrigatórias</h2><button class="bio-btn bio-light" id="bio-clear" type="button">Limpar</button></div><div id="bio-mandatory"></div></div>
  <div class="bio-panel bio-section"><div class="bio-title"><h2>2. Optativas disponíveis</h2><button class="bio-btn bio-light" id="bio-allopt" type="button">Marcar todas</button></div><div id="bio-optional"></div></div>
  <div class="bio-panel bio-section"><div class="bio-title"><h2>3. Otimizador</h2><button class="bio-btn bio-primary" id="bio-run" type="button">Encontrar combinações</button></div><div id="bio-summary" class="bio-note">Escolha uma oferta em cada disciplina obrigatória e selecione as optativas desejadas.</div><div id="bio-results" class="bio-results"></div></div>
  <div class="bio-panel bio-section bio-grade-panel"><div class="bio-title"><h2>4. Grade selecionada</h2><button class="bio-btn bio-light" id="bio-print" type="button">Imprimir / PDF</button></div><div id="bio-grid" class="bio-table"></div></div>`;

  const $=x=>document.getElementById(x);


  function offerMeta(o){
    const teachers=(o.teachers||[]).map(t=>{
      const name=esc(t.name||'');
      if(!name) return '';
      return t.lattes
        ? `<span>Docente: ${name} · <a class="bio-lattes" href="${esc(t.lattes)}" target="_blank" rel="noopener">Currículo Lattes</a></span>`
        : `<span>Docente: ${name}</span>`;
    }).filter(Boolean);
    const rooms=[...new Set((o.parts||[]).map(p=>p.room).filter(Boolean))];
    const roomText=rooms.length ? `<span>Local: ${rooms.map(esc).join(' / ')}</span>` : `<span>Local: a definir</span>`;
    return `<span class="bio-meta">${teachers.join('<br>')}${teachers.length?'<br>':''}${roomText}</span>`;
  }

  function lattesFor(o,name){
    const n=(name||'').trim().toLowerCase();
    const t=(o.teachers||[]).find(x=>(x.name||'').trim().toLowerCase()===n);
    return t&&t.lattes?` · <a class="bio-lattes" href="${esc(t.lattes)}" target="_blank" rel="noopener">Currículo Lattes</a>`:'';
  }

  function filteredGroups(){
    const p=$('bio-period').value,q=$('bio-search').value.toLowerCase().trim();
    return [...groups().entries()].filter(([k,v])=>v.some(o=>o.period===p)&&(!q||k.toLowerCase().includes(q)));
  }

  function renderChoices(){
    const gs=filteredGroups();
    const mand=gs.filter(([k,v])=>v.some(o=>o.type==='Obrigatória'));

    $('bio-mandatory').innerHTML=mand.length?mand.map(([k,os])=>`<div class="bio-course"><div class="bio-head"><b>${esc(os[0].code)} · ${esc(os[0].name)}</b><span class="bio-badge">Obrigatória</span></div><div class="bio-offers">${os.filter(o=>o.type==='Obrigatória').map(o=>`<label class="bio-offer"><input type="radio" name="bm-${esc(os[0].code)}-${esc(os[0].name)}" value="${esc(id(o))}"><b>${esc(o.offer)}</b><span><span class="bio-slots">${o.parts.length?o.parts.map(s=>`<span class="bio-slot">${s.day} ${s.start}–${s.end} ${s.kind==='T'?'Teoria':'Prática'}${s.room?' · '+esc(s.room):''}</span>`).join(''):'<span class="bio-slot">sem horário cadastrado</span>'}</span>${offerMeta(o)}</span></label>`).join('')}</div></div>`).join(''):'<div class="bio-note">Não há disciplinas obrigatórias cadastradas para este período.</div>';

    const opt=[...groups().entries()].filter(([k,v])=>v.some(o=>(o.type||'').startsWith('Optativa')));
    $('bio-optional').innerHTML=opt.map(([k,os])=>`<div class="bio-course"><div class="bio-head"><b>${esc(os[0].code)} · ${esc(os[0].name)}</b><span class="bio-badge opt">Optativa</span></div><div class="bio-offers">${os.filter(o=>(o.type||'').startsWith('Optativa')).map(o=>`<label class="bio-offer"><input class="bio-oc" type="checkbox" value="${esc(id(o))}"><b>${esc(o.offer)}</b><span><span class="bio-slots">${o.parts.map(s=>`<span class="bio-slot opt">${s.day} ${s.start}–${s.end} ${s.kind==='T'?'Teoria':'Prática'}${s.room?' · '+esc(s.room):''}</span>`).join('')}</span>${offerMeta(o)}</span></label>`).join('')}</div></div>`).join('');
  }

  function mandSelected(){return [...root.querySelectorAll('#bio-mandatory input:checked')].map(x=>get(x.value))}
  function optSelected(){return [...root.querySelectorAll('.bio-oc:checked')].map(x=>get(x.value))}
  function valid(arr){for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++)for(const a of arr[i].parts)for(const b of arr[j].parts)if(ov(a,b))return false;return true}

  function metric(arr){
    let days={};
    arr.flatMap(o=>o.parts).forEach(p=>(days[p.day]??=[]).push([mins(p.start),mins(p.end)]));
    let free=0,nd=Object.keys(days).length;
    Object.values(days).forEach(r=>{
      r.sort((a,b)=>a[0]-b[0]);let m=[];
      r.forEach(x=>{if(!m.length||x[0]>m.at(-1)[1])m.push([...x]);else m.at(-1)[1]=Math.max(m.at(-1)[1],x[1])});
      free+=Math.max(0,m.at(-1)[1]-m[0][0]-m.reduce((s,x)=>s+x[1]-x[0],0))
    });
    let first=Math.min(...arr.flatMap(o=>o.parts.map(p=>mins(p.start))),9999);
    return{free,days:nd,first};
  }

  function combos(gs,n){
    if(n===0)return[[]];
    let out=[];
    function r(i,c){
      if(c.length===n){out.push([...c]);return}
      for(let j=i;j<gs.length;j++)for(const o of gs[j])if(valid([...c,o])){c.push(o);r(j+1,c);c.pop()}
    }
    r(0,[]);
    return out;
  }

  function optimize(){
    const mand=mandSelected(),n=+$('bio-nopt').value,opts=optSelected();
    const required=filteredGroups().filter(([k,v])=>v.some(o=>o.type==='Obrigatória')).length;
    if(mand.length!==required){$('bio-summary').innerHTML=`<b>Selecione uma oferta em cada uma das ${required} disciplinas obrigatórias.</b>`;return}
    if(!valid(mand)){$('bio-summary').innerHTML='<b>⚠ Há conflito entre as ofertas obrigatórias escolhidas.</b>';renderGrid(mand);return}

    const m=new Map();
    opts.forEach(o=>{const k=o.code+'|'+o.name;if(!m.has(k))m.set(k,[]);m.get(k).push(o)});
    let rs=combos([...m.values()],n).map(c=>{const all=[...mand,...c];return{all,...metric(all)}}).filter(x=>valid(x.all));

    const sort=$('bio-sort').value;
    rs.sort((a,b)=>sort==='days'?a.days-b.days||b.free-a.free:sort==='late'?b.first-a.first||b.free-a.free:b.free-a.free||a.days-b.days);

    $('bio-summary').innerHTML=`<b>${rs.length}</b> combinações sem conflito encontradas.`;
    $('bio-results').innerHTML=rs.slice(0,12).map((x,i)=>`<article class="bio-result ${i===0?'best':''}"><b>#${i+1} ${i===0?'★ Melhor opção':''}</b><div class="bio-slots" style="margin:10px 0">${x.all.map(o=>`<span class="bio-slot ${(o.type||'').startsWith('Optativa')?'opt':''}">${esc(o.code)} · ${esc(o.offer)}</span>`).join('')}</div><small>🕐 ${x.free.toFixed(1)} h livres · 📅 ${x.days} dias</small><br><button class="bio-btn bio-primary bio-use" type="button" data-x='${esc(JSON.stringify(x.all.map(id)))}'>Usar esta grade</button></article>`).join('');
    root.querySelectorAll('.bio-use').forEach(b=>b.addEventListener('click',()=>renderGrid(JSON.parse(b.dataset.x).map(get))));
  }

  function renderGrid(arr){
    if(!arr.length){$('bio-grid').innerHTML='';return}
    const times=[...new Set(arr.flatMap(o=>o.parts.map(p=>p.start+'|'+p.end)))].map(x=>x.split('|')).sort((a,b)=>mins(a[0])-mins(b[0])||mins(a[1])-mins(b[1]));
    let h='<table><thead><tr><th>Horário</th>'+DATA.days.map(d=>`<th>${d}</th>`).join('')+'</tr></thead><tbody>';
    times.forEach(t=>{
      h+=`<tr><td class="bio-time">${t[0]}–${t[1]}</td>`;
      DATA.days.forEach(d=>{
        let c=[];
        arr.forEach(o=>o.parts.filter(p=>p.day===d&&p.start===t[0]&&p.end===t[1]).forEach(p=>c.push([o,p])));
        h+='<td>'+(c.length?c.map(x=>`<div class="bio-card ${(x[0].type||'').startsWith('Optativa')?'opt':''}"><b>${esc(x[0].code)} · ${esc(x[0].offer)}</b><br>${esc(x[0].name)}<br><small>${x[1].kind==='T'?'Teoria':'Prática'} · ${esc(x[1].teacher)}${lattesFor(x[0],x[1].teacher)}${x[1].room?' · Sala: '+esc(x[1].room):''}</small></div>`).join(''):'<span class="bio-empty">—</span>')+'</td>'
      });
      h+='</tr>';
    });
    $('bio-grid').innerHTML=h+'</tbody></table>';
  }

  $('bio-period').addEventListener('change',()=>{renderChoices();$('bio-results').innerHTML='';$('bio-grid').innerHTML=''});
  $('bio-search').addEventListener('input',renderChoices);
  $('bio-run').addEventListener('click',optimize);
  $('bio-print').addEventListener('click',()=>window.print());
  $('bio-clear').addEventListener('click',()=>{root.querySelectorAll('input[type=radio],input.bio-oc').forEach(x=>x.checked=false);$('bio-results').innerHTML='';$('bio-grid').innerHTML=''});
  $('bio-allopt').addEventListener('click',()=>root.querySelectorAll('.bio-oc').forEach(x=>x.checked=true));

  renderChoices();
})();
