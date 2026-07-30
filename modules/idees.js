/* ======================================================================
   GRIMOIRE — modules/idees.js
   Idées en vrac.
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

const CAT_TAG={intrigue:'tag-blue',perso:'tag-coral',univers:'tag-teal',dialogue:'tag-amber',magie:'tag-purple',twist:'tag-pink',ambiance:'tag-green',autre:'tag-blue'};
const CAT_LABEL={intrigue:'Intrigue',perso:'Personnage',univers:'Univers',dialogue:'Dialogue',magie:'Magie',twist:'Twist',ambiance:'Ambiance',autre:'Autre'};

// IDÉES
function saveIdee(){const texte=document.getElementById('i-texte').value.trim();if(!texte)return;S.idees.push({id:uid(),cat:document.getElementById('i-cat').value,texte});save();closeModal('idee');renderIdees();updateStats();}
function delIdee(id){S.idees=S.idees.filter(x=>x.id!==id);save();renderIdees();updateStats();}
function renderIdees(){
  const el=document.getElementById('idee-list');
  if(!S.idees.length){el.innerHTML='<div class="empty"><div class="empty-icon">✦</div>Capture tes idées ici !</div>';return;}
  el.innerHTML=S.idees.map(i=>`<div class="idee-item"><span class="tag ${CAT_TAG[i.cat]||'tag-blue'}" style="flex-shrink:0;font-size:11px">${CAT_LABEL[i.cat]||i.cat}</span><span class="idee-text">${i.texte}</span><button class="btn btn-danger btn-sm" onclick="delIdee('${i.id}')">✕</button></div>`).join('');
}

