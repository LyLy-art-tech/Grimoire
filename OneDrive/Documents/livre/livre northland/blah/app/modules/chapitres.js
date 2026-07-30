/* ======================================================================
   GRIMOIRE — modules/chapitres.js
   Structure narrative — chapitres.
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

// CHAPITRES
function saveChapitre(){const num=document.getElementById('c-num').value.trim(),titre=document.getElementById('c-titre').value.trim();if(!num&&!titre)return;const editId=document.getElementById('c-edit-id').value;const c={id:editId||uid(),num,titre,resume:document.getElementById('c-resume').value,pdv:document.getElementById('c-pdv').value,lieux:document.getElementById('c-lieux').value,statut:document.getElementById('c-statut').value,notes:document.getElementById('c-notes').value};if(editId){const i=S.chapitres.findIndex(x=>x.id===editId);if(i>=0)S.chapitres[i]=c;}else S.chapitres.push(c);save();closeModal('chapitre');renderChapitres();updateStats();renderAvancement();}
function delChapitre(id){S.chapitres=S.chapitres.filter(x=>x.id!==id);save();renderChapitres();updateStats();renderAvancement();}
function renderChapitres(){
  const el=document.getElementById('chap-list');
  if(!S.chapitres.length){el.innerHTML='<div class="empty"><div class="empty-icon">▤</div>Pas encore de chapitres</div>';return;}
  const stL={idee:'Idée',brouillon:'Brouillon',redige:'Rédigé',final:'Final'};
  el.innerHTML=S.chapitres.map((c,i)=>`<div class="chap-item" id="ccard-${c.id}"><div class="chap-num">${c.num||i+1}</div><div style="flex:1"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="chap-title">${c.titre||'Sans titre'}</span><span class="tag st-${c.statut}" style="font-size:11px">${stL[c.statut]}</span></div>${c.pdv||c.lieux?`<div class="chap-meta">${[c.pdv?'PDV: '+c.pdv:'',c.lieux?'Lieu: '+c.lieux:''].filter(Boolean).join(' · ')}</div>`:''}${c.resume?`<div class="chap-resume">${c.resume.slice(0,140)}${c.resume.length>140?'…':''}</div>`:''}</div><div style="display:flex;gap:3px"><button class="btn btn-ghost btn-sm" onclick="openModal('chapitre','${c.id}')">✎</button><button class="btn btn-danger btn-sm" onclick="delChapitre('${c.id}')">✕</button></div></div>`).join('');
}

