/* ======================================================================
   GRIMOIRE — modules/personnages.js
   Personnages — fiches, relations et arbre généalogique.
   
   Chargé par index.html en <script src> classique. Tous les modules
   partagent le même objet S et le même localStorage.
   ====================================================================== */

const ARBRE_FAM_TYPES=['Époux / épouse','Amant(e)','Ex','Parent / enfant','Grand-parent / petit-enfant','Frère / sœur','Cousin(e)','Oncle · tante / neveu · nièce'];
function hx2rgb(h){h=(h||'#000').replace('#','');return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
function rgb2hx(r,g,b){const f=v=>('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2);return '#'+f(r)+f(g)+f(b);}
function mixCol(h1,h2,t){const a=hx2rgb(h1),b=hx2rgb(h2);return rgb2hx(a.r*t+b.r*(1-t),a.g*t+b.g*(1-t),a.b*t+b.b*(1-t));}
// Dégradé de fond mélangeant (en sombre) les couleurs des personnages de l'arbre
function arbreBgGradient(colorNames){
  const base='#060c1a';
  const cols=(colorNames&&colorNames.length?colorNames:['blue']).map(c=>AV_HEX[c]||AV_HEX.blue);
  let stops;
  if(cols.length===1){
    stops=`<stop offset="0%" stop-color="${mixCol(cols[0],base,0.34)}"/><stop offset="100%" stop-color="${mixCol(cols[0],base,0.12)}"/>`;
  }else{
    stops=cols.map((c,i)=>`<stop offset="${Math.round(i/(cols.length-1)*100)}%" stop-color="${mixCol(c,base,0.27)}"/>`).join('');
  }
  return `<linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>`;
}
// === Motifs décoratifs de l'arbre généalogique ===
// Chaque motif est dessiné dans la couleur passée (couleur de la carte du personnage).
const ARBRE_MOTIFS=[
  {id:'fleur', label:'❀ Fleur'},
  {id:'dague', label:'⚔ Dague'},
  {id:'sort',  label:'✦ Sort (paillettes)'},
  {id:'lune',  label:'☾ Lune'},
  {id:'etoile',label:'★ Étoile'},
  {id:'potion',label:'⚗ Potion'},
  {id:'goutte',label:'🩸 Goutte de sang'},
  {id:'cercle',label:'◍ Cercle magique'}
];
function motifSvg(type,cx,cy,s,color){
  const c=color||'#7aa3e8';
  const lite=mixCol(c,'#ffffff',0.55), deep=mixCol(c,'#0a1428',0.45), st=mixCol(c,'#ffffff',0.30);
  const f=n=>(+n).toFixed(1);
  const star4=(x,y,r,fill)=>`<path d="M${f(x)},${f(y-r)} L${f(x+0.26*r)},${f(y-0.26*r)} L${f(x+r)},${f(y)} L${f(x+0.26*r)},${f(y+0.26*r)} L${f(x)},${f(y+r)} L${f(x-0.26*r)},${f(y+0.26*r)} L${f(x-r)},${f(y)} L${f(x-0.26*r)},${f(y-0.26*r)} Z" fill="${fill}"/>`;
  const star5=(x,y,R,ri,fill,stroke)=>{let pts='';for(let k=0;k<10;k++){const ang=-Math.PI/2+k*Math.PI/5,rr=(k%2)?ri:R;pts+=`${f(x+Math.cos(ang)*rr)},${f(y+Math.sin(ang)*rr)} `;}return `<polygon points="${pts.trim()}" fill="${fill}" stroke="${stroke||'none'}" stroke-width="0.5"/>`;};
  switch(type){
    case 'dague':
      return `<path d="M${f(cx)},${f(cy-1.45*s)} L${f(cx+0.26*s)},${f(cy+0.34*s)} L${f(cx-0.26*s)},${f(cy+0.34*s)} Z" fill="${lite}" stroke="${st}" stroke-width="0.5"/>`
        +`<rect x="${f(cx-0.62*s)}" y="${f(cy+0.32*s)}" width="${f(1.24*s)}" height="${f(0.20*s)}" rx="${f(0.08*s)}" fill="${c}"/>`
        +`<rect x="${f(cx-0.12*s)}" y="${f(cy+0.52*s)}" width="${f(0.24*s)}" height="${f(0.66*s)}" fill="${deep}"/>`
        +`<circle cx="${f(cx)}" cy="${f(cy+1.28*s)}" r="${f(0.2*s)}" fill="${c}"/>`;
    case 'sort':
      return star4(cx,cy,s*1.05,lite)+star4(cx+0.95*s,cy-0.72*s,s*0.5,c)+star4(cx-0.88*s,cy+0.62*s,s*0.46,c)
        +`<circle cx="${f(cx+0.72*s)}" cy="${f(cy+0.78*s)}" r="${f(0.13*s)}" fill="${lite}"/>`;
    case 'lune':{
      // Croissant = disque externe (R) moins un disque interne (Ri) décalé de dx.
      const R=s*1.12, Ri=s*0.95, dx=s*0.66;
      const xi=(dx*dx+R*R-Ri*Ri)/(2*dx);            // x des pointes (relatif à cx)
      const yi=Math.sqrt(Math.max(0,R*R-xi*xi));    // y des pointes
      const tx=cx+xi;
      return `<path d="M${f(tx)},${f(cy-yi)} A${f(R)},${f(R)} 0 1 0 ${f(tx)},${f(cy+yi)} A${f(Ri)},${f(Ri)} 0 0 1 ${f(tx)},${f(cy-yi)} Z" fill="${c}" stroke="${st}" stroke-width="0.5"/>`
        +star4(cx+0.95*s,cy-0.78*s,s*0.26,lite);
    }
    case 'goutte':{
      const top=cy-1.28*s, bot=cy+0.96*s, w=0.78*s;
      return `<path d="M${f(cx)},${f(top)} C${f(cx+w)},${f(cy-0.05*s)} ${f(cx+w)},${f(cy+0.58*s)} ${f(cx)},${f(bot)} C${f(cx-w)},${f(cy+0.58*s)} ${f(cx-w)},${f(cy-0.05*s)} ${f(cx)},${f(top)} Z" fill="${c}" stroke="${st}" stroke-width="0.5"/>`
        +`<ellipse cx="${f(cx-0.22*s)}" cy="${f(cy+0.42*s)}" rx="${f(0.15*s)}" ry="${f(0.27*s)}" fill="${lite}" opacity="0.8" transform="rotate(-18 ${f(cx-0.22*s)} ${f(cy+0.42*s)})"/>`;
    }
    case 'etoile':
      return star5(cx,cy,s*1.15,s*0.46,c,st)+`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s*0.2)}" fill="${lite}"/>`;
    case 'potion':{
      const by=cy+0.28*s;
      return `<rect x="${f(cx-0.18*s)}" y="${f(cy-1.05*s)}" width="${f(0.36*s)}" height="${f(0.9*s)}" fill="${deep}" stroke="${st}" stroke-width="0.4"/>`
        +`<circle cx="${f(cx)}" cy="${f(by)}" r="${f(0.78*s)}" fill="${c}" stroke="${st}" stroke-width="0.5"/>`
        +`<ellipse cx="${f(cx-0.26*s)}" cy="${f(by-0.26*s)}" rx="${f(0.14*s)}" ry="${f(0.24*s)}" fill="${lite}" opacity="0.85" transform="rotate(-32 ${f(cx-0.26*s)} ${f(by-0.26*s)})"/>`
        +`<rect x="${f(cx-0.24*s)}" y="${f(cy-1.28*s)}" width="${f(0.48*s)}" height="${f(0.26*s)}" rx="${f(0.06*s)}" fill="${st}"/>`;
    }
    case 'cercle':{
      let g=`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s*1.05)}" fill="none" stroke="${c}" stroke-width="${f(s*0.12)}"/>`
        +`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s*0.66)}" fill="none" stroke="${st}" stroke-width="${f(s*0.07)}"/>`;
      for(let k=0;k<8;k++){const a=k*Math.PI/4;g+=`<circle cx="${f(cx+Math.cos(a)*s*1.05)}" cy="${f(cy+Math.sin(a)*s*1.05)}" r="${f(s*0.085)}" fill="${lite}"/>`;}
      return g+star5(cx,cy,s*0.55,s*0.22,c,'none');
    }
    case 'fleur':
    default:{
      let p='';
      for(let k=0;k<5;k++){p+=`<ellipse cx="${f(cx)}" cy="${f(cy-s)}" rx="${f(s*0.55)}" ry="${f(s)}" transform="rotate(${k*72} ${f(cx)} ${f(cy)})" fill="${c}" stroke="${st}" stroke-width="0.5"/>`;}
      return p+`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s*0.5)}" fill="${lite}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s*0.26)}" fill="${deep}"/>`;
    }
  }
}
const TENSION_TAG={'Amour':'tag-coral','Confiance':'tag-teal','Alliance fragile':'tag-amber','Méfiance':'tag-amber','Rivalité':'tag-red','Haine':'tag-red','Deuil':'tag-purple','Secret partagé':'tag-purple','Manipulation':'tag-pink','':'tag-blue'};
const FAMILY_TYPES=['Parent / enfant','Frère / sœur','Cousin(e)','Oncle · tante / neveu · nièce','Grand-parent / petit-enfant','Époux / épouse','Amant(e)'];
const LINE_COLORS={'Parent / enfant':'#c4a35a','Grand-parent / petit-enfant':'#c4a35a','Frère / sœur':'#4db8a4','Cousin(e)':'#4db8a4','Oncle · tante / neveu · nièce':'#4db8a4','Époux / épouse':'#e07b54','Amant(e)':'#e07b54'};
function switchRelTab(id,el){
  document.querySelectorAll('.rel-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.rel-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('rel-panel-'+id).classList.add('active');
  el.classList.add('active');
  if(id==='arbre')renderArbre();
}

function pickColor(el){document.querySelectorAll('.color-dot').forEach(d=>{d.classList.remove('sel');d.textContent='';});el.classList.add('sel');el.textContent='✓';document.getElementById('p-color').value=el.dataset.color;imgSyncPick('perso');}

// PERSONNAGES
/* ---------- Listes déroulantes de la fiche ----------
   L'espèce reste enregistrée sous forme de NOM et non d'identifiant : c'est ce
   qui permet au Bestiaire de continuer à reconnaître « Elfe noir » comme un
   elfe, et de ne rien casser dans les fiches déjà écrites à la main. */
const P_SEXES=['Homme','Femme','Non binaire','Autre','Non défini'];

function fillEspeceSelect(valeur){
  const sel=document.getElementById('p-espece'),hint=document.getElementById('p-espece-hint');
  if(!sel)return;
  const esp=(CRD().especes||[]);
  sel.innerHTML='<option value="">— Choisir —</option>'
    +esp.map(e=>`<option value="${esc(e.nom||'')}">${esc(e.nom||'Sans nom')}</option>`).join('')
    +'<option value="__autre">Autre (préciser)…</option>';
  const v=String(valeur||'');
  const connue=esp.some(e=>String(e.nom||'')===v);
  sel.value=connue?v:(v?'__autre':'');
  const autre=document.getElementById('p-espece-autre');
  if(autre)autre.value=connue?'':v;
  if(hint){
    if(!esp.length){
      hint.style.display='';
      hint.textContent='Ajoute d’abord des espèces dans le Bestiaire (onglet Créatures) — en attendant, utilise « Autre ».';
    }else hint.style.display='none';
  }
  onEspeceChange();
}
function onEspeceChange(){
  const sel=document.getElementById('p-espece'),autre=document.getElementById('p-espece-autre');
  if(!sel||!autre)return;
  autre.style.display=(sel.value==='__autre')?'':'none';
}
function lireEspece(){
  const sel=document.getElementById('p-espece');if(!sel)return'';
  if(sel.value==='__autre'){const a=document.getElementById('p-espece-autre');return a?a.value.trim():'';}
  return sel.value;
}
function fillSexeSelect(valeur){
  const sel=document.getElementById('p-sexe');if(!sel)return;
  const v=String(valeur||'');
  // une valeur ancienne hors liste est conservée plutôt que perdue
  const liste=P_SEXES.concat((v&&P_SEXES.indexOf(v)<0)?[v]:[]);
  sel.innerHTML='<option value="">— Choisir —</option>'
    +liste.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  sel.value=v;
}

const P_STATUTS_SOCIAUX=['Noble','Roturier','Esclave','Clergé','Hors-la-loi','Marchand','Militaire','Autre'];
/* Rôles possibles d'un personnage vis-à-vis d'un lieu */
const P_ROLES_LIEU=[['','— Rôle —'],['residence','Résidence'],['etudes','Études'],['affectation','Affectation'],
  ['naissance','Naissance'],['exil','Exil'],['autre','Autre']];
function pRoleLieu(k){const r=P_ROLES_LIEU.find(x=>x[0]===k);return r?r[1]:'';}

function fillStatutSocial(valeur){
  const sel=document.getElementById('p-statutSocial');if(!sel)return;
  const v=String(valeur||'');
  const liste=P_STATUTS_SOCIAUX.concat((v&&P_STATUTS_SOCIAUX.indexOf(v)<0)?[v]:[]);
  sel.innerHTML='<option value="">— Choisir —</option>'+liste.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  sel.value=v;
}

/* Reprise des anciennes fiches :
   — l'apparence unique devient « Physique général » ;
   — les appartenances deviennent des lignes avec précisions, en récupérant
     ce qui était stocké côté faction (f.membres) et côté profession. */
function migratePersos(){
  let touche=false;
  (S.personnages||[]).forEach(p=>{
    if(p.apparence!==undefined){
      if(String(p.apparence||'').trim()&&!String(p.appPhysique||'').trim())p.appPhysique=p.apparence;
      delete p.apparence;touche=true;
    }
    if(Array.isArray(p.factions)&&p.factions.some(x=>typeof x==='string')){
      p.factions=p.factions.map(x=>{
        if(x&&typeof x==='object')return x;
        const f=(S.factions||[]).find(y=>y.id===x);
        const m=f&&Array.isArray(f.membres)?f.membres.find(y=>y&&y.id===p.id):null;
        return {id:x,fonction:(m&&m.fonction)||'',grade:(m&&m.grade)||'',depuis:(m&&m.depuis)||''};
      }).filter(x=>x.id);
      touche=true;
    }
    if(Array.isArray(p.lieux)&&p.lieux.some(x=>typeof x==='string')){
      p.lieux=p.lieux.map(x=>(x&&typeof x==='object')?x:{id:x,role:''}).filter(x=>x.id);
      touche=true;
    }
    // l'ancienne profession devient une ligne du tableau des organisations
    if(p.profFaction!==undefined||p.profTitre!==undefined){
      const fid=p.profFaction,titre=p.profTitre;
      if(fid){
        if(!Array.isArray(p.factions))p.factions=[];
        let l=lienDe(p.factions,fid);
        if(!l){l={id:fid,fonction:'',grade:'',depuis:''};p.factions.push(l);}
        if(titre&&!l.fonction)l.fonction=titre;
      }
      delete p.profFaction;delete p.profTitre;touche=true;
    }
  });
  // les précisions ne vivent plus sur la faction
  (S.factions||[]).forEach(f=>{if(f.membres!==undefined){delete f.membres;touche=true;}});
  if(touche)save();
}

/* ================= TABLEAUX DE LA FICHE ================= */
let pOrgsDraft=[],pLieuxDraft=[];

function persoEditInit(p){
  pOrgsDraft=(p&&Array.isArray(p.factions)?p.factions:[]).map(x=>(x&&typeof x==='object')
    ?{id:x.id,fonction:x.fonction||'',grade:x.grade||'',depuis:x.depuis||''}:{id:x,fonction:'',grade:'',depuis:''})
    .filter(x=>x.id);
  pLieuxDraft=(p&&Array.isArray(p.lieux)?p.lieux:[]).map(x=>(x&&typeof x==='object')
    ?{id:x.id,role:x.role||''}:{id:x,role:''}).filter(x=>x.id);
  renderPersoOrgs();renderPersoLieux();
  persoSetTitre(p?(p.titreNoblesse||''):'',true);
}

/* ---------- Organisations & factions ---------- */
function renderPersoOrgs(){
  const box=document.getElementById('p-orgs-table');if(!box)return;
  fillDatalist('p-org-src',(S.factions||[]).filter(f=>!pOrgsDraft.some(o=>o.id===f.id)));
  if(!pOrgsDraft.length){
    box.innerHTML='<div class="f-vide">Aucune organisation — cherche une faction par son nom ci-dessus.</div>';return;
  }
  box.innerHTML=`<div class="f-wrap"><table class="f-table">
    <thead><tr><th>Organisation</th><th>Fonction</th><th>Grade</th><th>Depuis</th><th class="f-col-x"></th></tr></thead>
    <tbody>${pOrgsDraft.map((o,i)=>{
      const f=(S.factions||[]).find(x=>x.id===o.id);
      return `<tr data-oid="${esc(o.id)}">
        <td class="f-who"><span class="tag tag-amber link-tag" onclick="persoOuvrirFaction('${o.id}')" title="Enregistre la fiche puis ouvre la faction">⚔ ${esc((f&&f.nom)||'Faction supprimée')}</span></td>
        <td><input type="text" data-col="fonction" value="${esc(o.fonction)}" placeholder="Capitaine de la garde…"></td>
        <td><input type="text" data-col="grade" value="${esc(o.grade)}" placeholder="Rang, titre…"></td>
        <td><input type="text" data-col="depuis" value="${esc(o.depuis)}" placeholder="An 847…"></td>
        <td class="f-col-x"><button type="button" class="btn btn-danger btn-sm" onclick="persoDelOrg(${i})" title="Retirer">✕</button></td>
      </tr>`;}).join('')}</tbody></table></div>`;
}
function lireOrgs(){
  const box=document.getElementById('p-orgs-table');
  if(!box)return pOrgsDraft.slice();
  const out=[];
  box.querySelectorAll('tr[data-oid]').forEach(tr=>{
    const o={id:tr.getAttribute('data-oid')};
    tr.querySelectorAll('input[data-col]').forEach(i=>{o[i.getAttribute('data-col')]=i.value.trim();});
    out.push(o);
  });
  return out;
}
function persoAddOrg(){
  const inp=document.getElementById('p-org-q');if(!inp)return;
  const f=trouveParNom((S.factions||[]).filter(x=>!pOrgsDraft.some(o=>o.id===x.id)),inp.value);
  if(!f){alert('Aucune faction ne correspond à ce nom.\n\nVérifie l’orthographe, ou crée d’abord la faction dans l’onglet Factions.');return;}
  pOrgsDraft=lireOrgs();pOrgsDraft.push({id:f.id,fonction:'',grade:'',depuis:''});
  inp.value='';renderPersoOrgs();
}
function persoDelOrg(i){pOrgsDraft=lireOrgs();pOrgsDraft.splice(i,1);renderPersoOrgs();}
function persoOuvrirFaction(id){
  if(!document.getElementById('p-nom').value.trim()){alert('Donne d’abord un nom au personnage pour pouvoir l’enregistrer.');return;}
  savePerso();openFaction(id);
}

/* ---------- Lieux liés ---------- */
function renderPersoLieux(){
  const box=document.getElementById('p-lieux-table');if(!box)return;
  fillDatalist('p-lieu-src',(S.lieux||[]).filter(l=>!pLieuxDraft.some(x=>x.id===l.id)));
  if(!pLieuxDraft.length){
    box.innerHTML='<div class="f-vide">Aucun lieu — cherche un lieu par son nom ci-dessus.</div>';return;
  }
  box.innerHTML=`<div class="f-wrap"><table class="f-table">
    <thead><tr><th>Lieu</th><th style="width:170px">Rôle</th><th class="f-col-x"></th></tr></thead>
    <tbody>${pLieuxDraft.map((o,i)=>{
      const l=(S.lieux||[]).find(x=>x.id===o.id);
      return `<tr data-lid="${esc(o.id)}">
        <td class="f-who"><span class="tag tag-blue link-tag" onclick="persoOuvrirLieu('${o.id}')" title="Enregistre la fiche puis ouvre le lieu">◎ ${esc((l&&l.nom)||'Lieu supprimé')}</span></td>
        <td><select data-col="role">${P_ROLES_LIEU.map(([v,lab])=>`<option value="${v}"${o.role===v?' selected':''}>${esc(lab)}</option>`).join('')}</select></td>
        <td class="f-col-x"><button type="button" class="btn btn-danger btn-sm" onclick="persoDelLieu(${i})" title="Retirer">✕</button></td>
      </tr>`;}).join('')}</tbody></table></div>`;
}
function lireLieux(){
  const box=document.getElementById('p-lieux-table');
  if(!box)return pLieuxDraft.slice();
  const out=[];
  box.querySelectorAll('tr[data-lid]').forEach(tr=>{
    out.push({id:tr.getAttribute('data-lid'),role:tr.querySelector('[data-col="role"]').value});
  });
  return out;
}
function persoAddLieu(){
  const inp=document.getElementById('p-lieu-q');if(!inp)return;
  const l=trouveParNom((S.lieux||[]).filter(x=>!pLieuxDraft.some(o=>o.id===x.id)),inp.value);
  if(!l){alert('Aucun lieu ne correspond à ce nom.\n\nVérifie l’orthographe, ou crée d’abord le lieu dans l’onglet Lieux.');return;}
  pLieuxDraft=lireLieux();pLieuxDraft.push({id:l.id,role:''});
  inp.value='';renderPersoLieux();
}
function persoDelLieu(i){pLieuxDraft=lireLieux();pLieuxDraft.splice(i,1);renderPersoLieux();}
function persoOuvrirLieu(id){
  if(!document.getElementById('p-nom').value.trim()){alert('Donne d’abord un nom au personnage pour pouvoir l’enregistrer.');return;}
  savePerso();openLieu(id);
}

/* ---------- Titre de noblesse (recherche parmi les titres de Société) ---------- */
function persoSetTitre(valeur,silencieux){
  const hid=document.getElementById('p-titreNoblesse'),inp=document.getElementById('p-titre-q'),
        tag=document.getElementById('p-titre-tag');
  if(!hid||!inp||!tag)return;
  const titres=(typeof SOD==='function'?(SOD().titres||[]):[]);
  fillDatalist('p-titre-src',titres);
  let id=(typeof valeur==='string')?valeur:hid.value;
  if(typeof valeur!=='string'){
    const t=trouveParNom(titres,inp.value);
    if(!t){if(inp.value.trim()&&!silencieux)alert('Aucun titre ne correspond à ce nom.\n\nLes titres se créent dans l’onglet Société → Noblesse & titres.');return;}
    id=t.id;
  }
  hid.value=id||'';
  const t=titres.find(x=>x.id===id);
  inp.value=t?(t.nom||''):'';
  tag.innerHTML=t?`<span class="tag tag-amber link-tag" onclick="soGo('noblesse','so-titre-${t.id}')">${mgEsc(t.icone||'👑')} ${esc(t.nom||'')}</span>`:'';
}
function persoDelTitre(){
  const hid=document.getElementById('p-titreNoblesse'),inp=document.getElementById('p-titre-q'),
        tag=document.getElementById('p-titre-tag');
  if(hid)hid.value='';if(inp)inp.value='';if(tag)tag.innerHTML='';
}

function savePerso(){
  const nom=document.getElementById('p-nom').value.trim();if(!nom)return;
  const editId=document.getElementById('p-edit-id').value;
  const prev=editId?S.personnages.find(x=>x.id===editId):null;
  const p={id:editId||uid(),nom,image:imgResolve('perso',prev&&prev.image),alias:document.getElementById('p-alias').value,role:document.getElementById('p-role').value,espece:lireEspece(),age:document.getElementById('p-age').value,naissance:document.getElementById('p-naissance').value,sexe:document.getElementById('p-sexe').value,statutSocial:document.getElementById('p-statutSocial').value,titreNoblesse:document.getElementById('p-titreNoblesse').value,appPhysique:document.getElementById('p-appPhysique').value,appTenue:document.getElementById('p-appTenue').value,appSignes:document.getElementById('p-appSignes').value,appMagie:document.getElementById('p-appMagie').value,personnalite:document.getElementById('p-perso').value,passe:document.getElementById('p-passe').value,motiv:document.getElementById('p-motiv').value,pouvoirs:document.getElementById('p-pouvoirs').value,arc:document.getElementById('p-arc').value,statut:document.getElementById('p-statut').value,firstChap:document.getElementById('p-firstchap').value.trim(),factions:lireOrgs(),lieux:lireLieux(),artefacts:readPickList('p-artefacts'),objets:document.getElementById('p-objets').value,citations:document.getElementById('p-citations').value,secrets:document.getElementById('p-secrets').value,color:document.getElementById('p-color').value,fichiers:modalFiles.perso};
  if(editId){const i=S.personnages.findIndex(x=>x.id===editId);if(i>=0)S.personnages[i]=p;}else S.personnages.push(p);
  imgDraftClear('perso');
  save();closeModal('perso');renderPersos();renderRelations();updateStats();
}
function delPerso(id){
  S.personnages=S.personnages.filter(x=>x.id!==id);
  S.relations=S.relations.filter(r=>r.a!==id&&r.b!==id);
  S.factions.forEach(f=>{if(f.chef===id)f.chef='';});
  S.evenements.forEach(e=>{if(Array.isArray(e.persos))e.persos=e.persos.filter(x=>x!==id);});
  save();renderPersos();renderRelations();renderFactions();renderTimeline();updateStats();
}
function renderPersos(){
  migratePersos();
  const el=document.getElementById('perso-list');
  if(!S.personnages.length){el.className='';el.innerHTML='<div class="empty"><div class="empty-icon">◈</div>Aucun personnage</div>';return;}
  el.className='cr-cards';
  el.innerHTML=S.personnages.map(p=>rpgCardHTML({
    kind:'perso',id:p.id,domId:'pcard-'+p.id,
    nom:p.nom,sous:[p.role,p.espece,p.age].filter(Boolean).join(' · '),
    couleur:p.color||'purple',image:p.image,fallback:mgEsc(mgInitials(p.nom)),
    onclick:`openModal('perso','${p.id}')`,
    badge:[p.alias?mgEsc(p.alias):'',STATUT_LABEL[p.statut]&&p.statut!=='inconnu'?mgEsc(STATUT_LABEL[p.statut]):'']
      .filter(Boolean).join(' · '),
    compteurs:lkCompteCarte('perso',p.id),
    actions:`<button onclick="event.stopPropagation();openModal('perso','${p.id}')" title="Modifier">✎</button>`
      +`<button onclick="imgPick('perso','${p.id}',event)" title="Changer la photo">📷</button>`
      +`<button onclick="event.stopPropagation();delPerso('${p.id}')" title="Supprimer">✕</button>`
  })).join('');
}


function persoTag(id){const p=S.personnages.find(x=>x.id===id);if(!p)return'';const c=COLORS[p.color||'purple'];return`<span class="tag ${c.tag} link-tag" onclick="openPerso('${p.id}')">${p.nom}</span>`;}
function relEvoHTML(r){
  const ev=(Array.isArray(r.evolution)?r.evolution:[]).filter(e=>e&&((e.chap||'')+(e.txt||'')).trim());
  if(!ev.length)return'';
  return`<div class="evo-list">${ev.map(e=>`<div class="evo-item"><span class="evo-chap">${e.chap?'Ch. '+e.chap:'—'}</span>${e.txt||''}</div>`).join('')}</div>`;
}
// Carte de relation : depuis une fiche (fromId) on n'affiche que l'autre personnage
function relCardHTML(r,fromId,canDelete){
  const pA=S.personnages.find(p=>p.id===r.a),pB=S.personnages.find(p=>p.id===r.b);
  if(!pA||!pB)return'';
  const who=fromId?persoTag(r.a===fromId?r.b:r.a):`${persoTag(r.a)}<span class="rel-arrow">⟷</span>${persoTag(r.b)}`;
  const desc=(r.desc||'').trim(),ctx=(r.contexte||'').trim(),label=relTypeLabel(r);
  return`<div class="fiche-rel">
    <div class="fiche-rel-head">${who}${label?`<span class="rel-type">${label}</span>`:'<span class="rel-type"></span>'}${r.tension?`<span class="tag ${TENSION_TAG[r.tension]||'tag-blue'}" style="font-size:10px">${r.tension}</span>`:''}
      <span style="display:flex;gap:3px;margin-left:auto"><button class="btn btn-ghost btn-sm" onclick="openModal('relation','${r.id}')">✎</button>${canDelete?`<button class="btn btn-danger btn-sm" onclick="delRelation('${r.id}')">✕</button>`:''}</span></div>
    ${ctx?`<div class="fiche-rel-desc"><span class="rencontre-label">Rencontre</span>${trunc(ctx,140)}</div>`:''}
    ${desc?`<div class="fiche-rel-desc">${trunc(desc,150)}</div>`:''}
    ${relEvoHTML(r)}
  </div>`;
}
function renderFicheRelations(persoId){
  const el=document.getElementById('p-rel-list'),btn=document.getElementById('p-rel-add');
  if(!el)return;
  if(!persoId){el.innerHTML='<div class="pick-empty">Enregistre d’abord le personnage, puis rouvre sa fiche pour lui ajouter des relations.</div>';if(btn)btn.style.display='none';return;}
  if(btn)btn.style.display='';
  const rels=S.relations.filter(r=>r.a===persoId||r.b===persoId);
  el.innerHTML=rels.length?rels.map(r=>relCardHTML(r,persoId,true)).join(''):'<div class="pick-empty">Aucune relation pour ce personnage.</div>';
}
function addRelationFromFiche(){const id=document.getElementById('p-edit-id').value;if(!id)return;openModal('relation',null,id);}
function refreshFicheRelations(){
  const m=document.getElementById('modal-perso');
  if(m&&m.classList.contains('open')){const id=document.getElementById('p-edit-id').value;if(id)renderFicheRelations(id);}
}

// RELATIONS
let relEvoDraft=[];
function renderRelEvoEditor(){
  const el=document.getElementById('rel-evo-list');if(!el)return;
  const at=s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  el.innerHTML=relEvoDraft.map((e,i)=>`<div class="evo-row"><input type="text" class="evo-chap-in" value="${at(e.chap)}" placeholder="Ch." oninput="relEvoDraft[${i}].chap=this.value"><input type="text" value="${at(e.txt)}" placeholder="Ce qui change entre eux à ce moment..." oninput="relEvoDraft[${i}].txt=this.value"><button class="btn btn-danger btn-sm" onclick="delRelEvo(${i})">✕</button></div>`).join('');
}
function addRelEvo(){relEvoDraft.push({chap:'',txt:''});renderRelEvoEditor();}
function delRelEvo(i){relEvoDraft.splice(i,1);renderRelEvoEditor();}

function onRelTypeChange(focus){
  const sel=document.getElementById('rel-type'),inp=document.getElementById('rel-type-autre');
  if(!sel||!inp)return;
  const on=sel.value==='Autre';
  inp.style.display=on?'':'none';
  if(on&&focus)inp.focus();
}
function relTypeLabel(r){return (r.type==='Autre'&&(r.typeAutre||'').trim())?r.typeAutre.trim():(r.type||'');}
function saveRelation(){
  const a=document.getElementById('rel-a').value,b=document.getElementById('rel-b').value;
  if(!a||!b||a===b)return;
  const editId=document.getElementById('rel-edit-id').value;
  const evolution=relEvoDraft.map(e=>({chap:(e.chap||'').trim(),txt:(e.txt||'').trim()})).filter(e=>e.chap||e.txt);
  const r={id:editId||uid(),a,b,type:document.getElementById('rel-type').value,typeAutre:document.getElementById('rel-type-autre').value.trim(),contexte:document.getElementById('rel-contexte').value,desc:document.getElementById('rel-desc').value,tension:document.getElementById('rel-tension').value,evolution};
  if(editId){const i=S.relations.findIndex(x=>x.id===editId);if(i>=0)S.relations[i]=r;}else S.relations.push(r);
  save();closeModal('relation');renderRelations();refreshFicheRelations();updateStats();
}
function delRelation(id){S.relations=S.relations.filter(x=>x.id!==id);save();renderRelations();refreshFicheRelations();updateStats();}

// EXPLORATION DES RELATIONS (recherche par personnage + filtre par type)
let relFilterType='__all__',relFilterTypes=[];
function renderRelations(){renderRelTypeFilters();renderRelExplore();}
function relTypeOf(r){return relTypeLabel(r)||'Sans type';}
function renderRelTypeFilters(){
  const el=document.getElementById('rel-type-filters');if(!el)return;
  relFilterTypes=[];
  S.relations.forEach(r=>{const t=relTypeOf(r);if(relFilterTypes.indexOf(t)<0)relFilterTypes.push(t);});
  relFilterTypes.sort((x,y)=>x.localeCompare(y,'fr'));
  if(relFilterType!=='__all__'&&relFilterTypes.indexOf(relFilterType)<0)relFilterType='__all__';
  el.innerHTML=`<button class="rel-tab${relFilterType==='__all__'?' active':''}" onclick="setRelFilter(-1)">Tous les types</button>`
    +relFilterTypes.map((t,i)=>`<button class="rel-tab${relFilterType===t?' active':''}" onclick="setRelFilter(${i})">${t}</button>`).join('');
}
function setRelFilter(i){relFilterType=(i<0)?'__all__':(relFilterTypes[i]||'__all__');renderRelations();}
function renderRelExplore(){
  const el=document.getElementById('rel-explore-result');if(!el)return;
  const input=document.getElementById('rel-search');
  const q=(input?input.value:'').trim().toLowerCase();
  const typed=relFilterType!=='__all__';
  const okType=r=>!typed||relTypeOf(r)===relFilterType;
  if(!q&&!typed){
    const n=S.relations.length;
    el.innerHTML='<div class="card"><div class="empty"><div class="empty-icon">⟷</div>Cherche un personnage ou choisis un type de relation pour explorer les liens.'
      +(n?`<div style="margin-top:9px">${n} relation${n>1?'s':''} enregistrée${n>1?'s':''} — chacune se gère depuis la fiche du personnage concerné.</div>`:'')
      +'</div></div>';
    return;
  }
  if(q){
    const persos=S.personnages.filter(p=>(p.nom||'').toLowerCase().includes(q)||(p.alias||'').toLowerCase().includes(q));
    if(!persos.length){el.innerHTML='<div class="card"><div class="empty"><div class="empty-icon">◈</div>Aucun personnage ne correspond à « '+q+' »</div></div>';return;}
    el.innerHTML=persos.map(p=>{
      const c=COLORS[p.color||'purple'];
      const init=(p.nom||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
      const rels=S.relations.filter(r=>(r.a===p.id||r.b===p.id)&&okType(r));
      const body=rels.length?rels.map(r=>relCardHTML(r,p.id,false)).join('')
        :`<div class="pick-empty">${typed?'Aucune relation de ce type':'Aucune relation enregistrée'} pour ce personnage.</div>`;
      return`<div class="card explore-group">
        <div class="explore-head"><div class="avatar ${c.av}">${imgInner(p.image,init)}</div><span class="perso-name">${p.nom}</span>${statutTag(p.statut)}
          <span class="explore-count">${rels.length} lien${rels.length>1?'s':''}</span>
          <button class="btn btn-sm" onclick="openModal('perso','${p.id}')">Ouvrir la fiche</button></div>
        ${body}</div>`;
    }).join('');
    return;
  }
  const rels=S.relations.filter(okType);
  el.innerHTML=`<div class="card"><div class="card-label">${relFilterType} · ${rels.length} relation${rels.length>1?'s':''}</div>`
    +(rels.length?rels.map(r=>relCardHTML(r,null,false)).join(''):'<div class="pick-empty">Aucune relation de ce type.</div>')+'</div>';
}

// ARBRE GÉNÉALOGIQUE
let arbreZoom=1,arbrePanX=0,arbrePanY=0,arbreDragging=false,arbreLastX=0,arbreLastY=0;
let arbreSelectedId=null,arbreViewW=0,arbreViewH=0,arbreCurrentId='__all__';

function renderArbre(){
  const svg=document.getElementById('arbre-svg');
  const emptyEl=document.getElementById('arbre-empty');
  renderArbreSelect();

  const COUPLE_TYPES=['Époux / épouse','Amant(e)','Ex'];
  const PARENT_TYPE='Parent / enfant';
  const GRAND_TYPE='Grand-parent / petit-enfant';
  const SIBLING_TYPE='Frère / sœur';
  const ALL_FAM=[...COUPLE_TYPES,PARENT_TYPE,GRAND_TYPE,SIBLING_TYPE,'Cousin(e)','Oncle · tante / neveu · nièce'];

  let arbreMotif='fleur', arbreBranches=true;
  let famRels=S.relations.filter(r=>ALL_FAM.includes(r.type));
  if(arbreCurrentId&&arbreCurrentId!=='__all__'){
    const arb=(S.arbres||[]).find(a=>a.id===arbreCurrentId);
    if(arb){const set=new Set(arb.relIds||[]);famRels=famRels.filter(r=>set.has(r.id));arbreMotif=arb.motif||'fleur';arbreBranches=(arb.branches!==false);}
  }
  if(!famRels.length){
    svg.innerHTML='';emptyEl.style.display='block';
    emptyEl.innerHTML=(arbreCurrentId&&arbreCurrentId!=='__all__')
      ?'<div class="empty-icon">🌳</div>Cet arbre est vide — clique sur « ✎ Modifier » pour y ajouter des relations.'
      :'<div class="empty-icon">🌳</div>Ajoute des relations familiales pour voir l\'arbre';
    return;
  }
  emptyEl.style.display='none';

  // Collect all nodes involved
  const nodeIds=new Set();
  famRels.forEach(r=>{nodeIds.add(r.a);nodeIds.add(r.b);});
  const nodes=S.personnages.filter(p=>nodeIds.has(p.id));

  // ============================================================
  // STEP 1: Assign generations using DIRECTED parent->child edges
  // r.a = parent, r.b = child for PARENT_TYPE
  // ============================================================
  const genMap={};
  nodes.forEach(p=>genMap[p.id]=0);

  const parentEdges=famRels.filter(r=>r.type===PARENT_TYPE||r.type===GRAND_TYPE);

  // Topological propagation: parents get lower gen than children
  // First find roots (nodes with no parents)
  const hasParent=new Set();
  parentEdges.forEach(r=>hasParent.add(r.b));
  const roots=nodes.filter(p=>!hasParent.has(p.id));

  // BFS from roots
  const queue=[...roots.map(p=>({id:p.id,gen:0}))];
  const visited=new Set();
  while(queue.length){
    const {id,gen}=queue.shift();
    if(genMap[id]<gen) genMap[id]=gen;
    parentEdges.filter(r=>r.a===id).forEach(r=>{
      const childGen=gen+(r.type===GRAND_TYPE?2:1);
      if(!visited.has(r.b+'_'+childGen)){
        visited.add(r.b+'_'+childGen);
        queue.push({id:r.b,gen:childGen});
      }
    });
  }
  // Extra passes to handle cycles/stragglers
  for(let i=0;i<10;i++){
    parentEdges.forEach(r=>{
      const diff=r.type===GRAND_TYPE?2:1;
      if(genMap[r.b]<genMap[r.a]+diff) genMap[r.b]=genMap[r.a]+diff;
    });
  }

  // Normalize so min = 0
  const minG=Math.min(...nodes.map(p=>genMap[p.id]));
  nodes.forEach(p=>genMap[p.id]-=minG);
  const maxG=Math.max(...nodes.map(p=>genMap[p.id]));

  // ============================================================
  // STEP 2: Build couple units
  // ============================================================
  const coupleRels=famRels.filter(r=>COUPLE_TYPES.includes(r.type));
  const inCouple={};
  const couples=[];
  coupleRels.forEach(r=>{
    if(!inCouple[r.a]&&!inCouple[r.b]){
      const cid='C'+couples.length;
      couples.push({id:cid,a:r.a,b:r.b,gen:Math.min(genMap[r.a],genMap[r.b])});
      inCouple[r.a]=cid; inCouple[r.b]=cid;
    }
  });

  // ============================================================
  // STEP 3: Group siblings together per generation
  // ============================================================
  const sibRels=famRels.filter(r=>r.type===SIBLING_TYPE);
  const sibGroup={};
  const sibClusters=[];
  sibRels.forEach(r=>{
    const ga=sibGroup[r.a],gb=sibGroup[r.b];
    if(ga==null&&gb==null){const i=sibClusters.length;sibClusters.push(new Set([r.a,r.b]));sibGroup[r.a]=i;sibGroup[r.b]=i;}
    else if(ga!=null&&gb==null){sibClusters[ga].add(r.b);sibGroup[r.b]=ga;}
    else if(ga==null&&gb!=null){sibClusters[gb].add(r.a);sibGroup[r.a]=gb;}
    else if(ga!==gb){sibClusters[ga].forEach(id=>{sibClusters[gb].add(id);sibGroup[id]=gb;});sibClusters[ga]=new Set();}
  });

  // Order nodes per generation, keeping siblings adjacent
  const genLists={};
  nodes.forEach(p=>{const g=genMap[p.id];if(!genLists[g])genLists[g]=[];});
  const genKeys=Object.keys(genLists).map(Number).sort((a,b)=>a-b);
  genKeys.forEach(g=>genLists[g]=[]);

  const placed=new Set();
  // Place sibling clusters first
  sibClusters.forEach(cluster=>{
    if(!cluster.size)return;
    const ids=[...cluster];
    const g=genMap[ids[0]];
    ids.forEach(id=>{if(!placed.has(id)){genLists[g].push(id);placed.add(id);}});
  });
  nodes.forEach(p=>{if(!placed.has(p.id)){genLists[genMap[p.id]].push(p.id);placed.add(p.id);}});

  // ============================================================
  // STEP 4: Compute x positions bottom-up then top-down
  // ============================================================
  const NW=130, NH=88, HGAP=42, VGAP=152, TOP=140;
  const CIRCLE_R=30;

  const nodeCX={}, nodeCY={};
  genKeys.forEach(g=>{ genLists[g].forEach((id,i)=>{ nodeCY[id]=g*VGAP+TOP; }); });

  // Initial x: spread evenly per generation
  function layoutGen(g){
    const ids=genLists[g]; if(!ids.length)return;
    const totalW=ids.length*NW+(ids.length-1)*HGAP;
    ids.forEach((id,i)=>{ nodeCX[id]=i*(NW+HGAP)+NW/2; });
  }
  genKeys.forEach(g=>layoutGen(g));

  // Find all parent units and their children
  const parentOf={}; // parentKey (coupleId or nodeId) -> [childId]
  parentEdges.filter(r=>r.type===PARENT_TYPE).forEach(r=>{
    const pKey=inCouple[r.a]||r.a;
    if(!parentOf[pKey])parentOf[pKey]=[];
    if(!parentOf[pKey].includes(r.b))parentOf[pKey].push(r.b);
  });

  // Top-down: center children under parents
  function getParentCX(pKey){
    const c=couples.find(cp=>cp.id===pKey);
    if(c)return (nodeCX[c.a]+nodeCX[c.b])/2;
    return nodeCX[pKey];
  }

  for(let pass=0;pass<6;pass++){
    // Top-down: push children under parents
    genKeys.forEach(g=>{
      genLists[g].forEach(id=>{
        const pKey=inCouple[id]||id;
        const children=(parentOf[pKey]||[]).filter(cid=>nodeCX[cid]!=null);
        if(!children.length)return;
        const parentCX=getParentCX(pKey);
        const minCX=Math.min(...children.map(cid=>nodeCX[cid]));
        const maxCX=Math.max(...children.map(cid=>nodeCX[cid]));
        const childMid=(minCX+maxCX)/2;
        const dx=parentCX-childMid;
        children.forEach(cid=>nodeCX[cid]+=dx);
      });
    });

    // Bottom-up: center parents over children
    [...genKeys].reverse().forEach(g=>{
      Object.entries(parentOf).forEach(([pKey,children])=>{
        const validC=children.filter(cid=>nodeCX[cid]!=null&&genMap[cid]===g);
        if(!validC.length)return;
        const midCX=(Math.min(...validC.map(cid=>nodeCX[cid]))+Math.max(...validC.map(cid=>nodeCX[cid])))/2;
        const c=couples.find(cp=>cp.id===pKey);
        if(c&&genMap[c.a]===g-1){
          const w=(nodeCX[c.b]-nodeCX[c.a]);
          const curMid=(nodeCX[c.a]+nodeCX[c.b])/2;
          const dx=midCX-curMid;
          nodeCX[c.a]+=dx; nodeCX[c.b]+=dx;
        } else if(!c&&nodeCX[pKey]!=null&&genMap[pKey]===g-1){
          nodeCX[pKey]=midCX;
        }
      });
    });

    // Resolve overlaps per generation
    genKeys.forEach(g=>{
      const ids=genLists[g].slice().sort((a,b)=>nodeCX[a]-nodeCX[b]);
      for(let i=1;i<ids.length;i++){
        const minX=nodeCX[ids[i-1]]+NW+HGAP;
        if(nodeCX[ids[i]]<minX) nodeCX[ids[i]]=minX;
      }
    });
  }

  // Normalize: shift everything so min x = 150 (marge pour les fleurs décoratives)
  const allCX=Object.values(nodeCX);
  const shiftX=150-Math.min(...allCX)+NW/2;
  Object.keys(nodeCX).forEach(id=>nodeCX[id]+=shiftX);

  const svgW=Math.max(580, Math.max(...Object.values(nodeCX))+NW/2+150);
  const svgH=maxG*VGAP+TOP+NH/2+90;

  // ============================================================
  // STEP 5: Draw
  // ============================================================
  const C_COUPLE='#5b8dd9';
  const C_PARENT='#6f93d8';

  // -- helpers décoratifs (fleurs / feuilles / branches enluminées) --
  // Couleur d'accent décorative = couleur de personnage dominante de l'arbre (harmonise motifs + branches avec le fond)
  const _colorCount={};
  nodes.forEach(p=>{const cn=p.color||'purple';_colorCount[cn]=(_colorCount[cn]||0)+1;});
  let accentName='purple',_accBest=0;
  Object.entries(_colorCount).forEach(([cn,n])=>{if(n>_accBest){_accBest=n;accentName=cn;}});
  const accentHex=AV_HEX[accentName]||'#7aa3e8';
  const accLeaf=mixCol(accentHex,'#0a1428',0.5), accStroke=mixCol(accentHex,'#0a1428',0.4), accDot=mixCol(accentHex,'#ffffff',0.12);

  const motif=(cx,cy,s,color)=>motifSvg(arbreMotif,cx,cy,s,color||accentHex);
  const leaf=(cx,cy,len,ang)=>`<ellipse cx="${cx}" cy="${cy}" rx="${(len*0.34).toFixed(1)}" ry="${len}" transform="rotate(${ang} ${cx} ${cy})" fill="${accLeaf}" stroke="${accStroke}" stroke-width="0.5" opacity="0.85"/>`;
  const BRANCH=`<path d="M0,0 Q42,28 62,76 T112,124" fill="none" stroke="${accStroke}" stroke-width="2" opacity="0.55" stroke-linecap="round"/><path d="M0,0 Q52,14 98,34" fill="none" stroke="${accStroke}" stroke-width="1.4" opacity="0.45" stroke-linecap="round"/>${leaf(30,30,11,42)}${leaf(74,54,12,-26)}${leaf(50,92,10,14)}${leaf(98,20,9,60)}<circle cx="24" cy="42" r="2.8" fill="${accDot}" opacity="0.8"/><circle cx="82" cy="80" r="2.4" fill="${accDot}" opacity="0.8"/>${motif(12,14,8)}${motif(60,42,10)}${motif(100,32,7)}${motif(48,84,9)}${motif(112,120,8)}`;
  const corners=arbreBranches?`<g opacity="0.92">${BRANCH}</g><g opacity="0.92" transform="translate(${svgW},0) scale(-1,1)">${BRANCH}</g><g opacity="0.92" transform="translate(0,${svgH}) scale(1,-1)">${BRANCH}</g><g opacity="0.92" transform="translate(${svgW},${svgH}) scale(-1,-1)">${BRANCH}</g>`:'';

  // -- titre « Famille X » (nom de famille le plus fréquent) --
  const surCount={};
  nodes.forEach(p=>{const pp=p.nom.trim().split(/\s+/);if(pp.length>1){const s=pp[pp.length-1];surCount[s]=(surCount[s]||0)+1;}});
  let surname='',best=1;
  Object.entries(surCount).forEach(([s,n])=>{if(n>best){best=n;surname=s;}});
  const titleTxt=surname?`Famille ${surname}`:'Arbre généalogique';
  const titre=`<text x="${svgW/2}" y="58" text-anchor="middle" font-family="Cinzel,serif" font-size="26" fill="#d6e4ff" letter-spacing="2" filter="url(#titleGlow)">${titleTxt}</text><g transform="translate(${svgW/2},82)"><line x1="-94" y1="0" x2="-14" y2="0" stroke="${accStroke}" stroke-width="1" opacity="0.7"/><line x1="14" y1="0" x2="94" y2="0" stroke="${accStroke}" stroke-width="1" opacity="0.7"/>${motif(0,0,6)}</g>`;

  let linesHTML='', nodesHTML='';

  // Couleur de carte par personnage — sert à colorer chaque trait selon les personnes reliées
  const pColorOf={};
  nodes.forEach(p=>{pColorOf[p.id]=AV_HEX[p.color||'purple']||C_COUPLE;});

  // Couple — demi-ligne de la couleur de chaque conjoint, cœur teinté du mélange des deux
  couples.forEach(c=>{
    const ax=nodeCX[c.a],ay=nodeCY[c.a];
    const bx=nodeCX[c.b];
    if(ax==null||bx==null)return;
    const mx=(ax+bx)/2, my=ay;
    const lx=Math.min(ax,bx)+NW/2, rx=Math.max(ax,bx)-NW/2;
    const leftId=ax<=bx?c.a:c.b, rightId=ax<=bx?c.b:c.a;
    const lCol=pColorOf[leftId]||C_COUPLE, rCol=pColorOf[rightId]||C_COUPLE;
    linesHTML+=`
      <line x1="${lx}" y1="${my}" x2="${mx-12}" y2="${my}" stroke="${lCol}" stroke-width="1.6" opacity="0.85"/>
      <line x1="${mx+12}" y1="${my}" x2="${rx}" y2="${my}" stroke="${rCol}" stroke-width="1.6" opacity="0.85"/>
      <circle cx="${mx}" cy="${my}" r="11" fill="#101a38" stroke="${mixCol(lCol,rCol,0.5)}" stroke-width="1.3"/>
      <text x="${mx}" y="${my+5}" text-anchor="middle" font-size="14" fill="#e88aa2">♥</text>`;
  });

  // Parent -> children
  Object.entries(parentOf).forEach(([pKey,children])=>{
    const validC=children.filter(id=>nodeCX[id]!=null);
    if(!validC.length)return;

    let pCX;
    const c=couples.find(cp=>cp.id===pKey);
    if(c){ pCX=(nodeCX[c.a]+nodeCX[c.b])/2; }
    else { pCX=nodeCX[pKey]; if(pCX==null)return; }

    const pId=c?c.a:pKey;
    const pBottomY=nodeCY[pId]+NH/2;
    const cTopY=nodeCY[validC[0]]-NH/2;
    const midY=(pBottomY+cTopY)/2;

    // Couleur du parent (mélange des deux parents si couple), puis chaque descente = couleur de l'enfant
    const parentColor=c?mixCol(pColorOf[c.a]||C_PARENT,pColorOf[c.b]||C_PARENT,0.5):(pColorOf[pKey]||C_PARENT);

    linesHTML+=`<path d="M${pCX},${pBottomY} L${pCX},${midY}" stroke="${parentColor}" stroke-width="1.6" opacity="0.8" fill="none"/>`;
    if(validC.length>1){
      const minCX=Math.min(...validC.map(id=>nodeCX[id]));
      const maxCX=Math.max(...validC.map(id=>nodeCX[id]));
      linesHTML+=`<path d="M${minCX},${midY} L${maxCX},${midY}" stroke="${parentColor}" stroke-width="1.6" opacity="0.7" fill="none"/>`;
    }
    validC.forEach(id=>{
      const cxv=nodeCX[id], topv=nodeCY[id]-NH/2;
      const cCol=pColorOf[id]||parentColor;
      linesHTML+=`<path d="M${cxv},${midY} L${cxv},${topv}" stroke="${cCol}" stroke-width="1.6" opacity="0.8" fill="none"/><circle cx="${cxv}" cy="${topv}" r="2.6" fill="${cCol}"/>`;
    });
  });

  // Nœuds (cartes)
  nodes.forEach(p=>{
    const cx=nodeCX[p.id],cy=nodeCY[p.id];
    if(cx==null)return;
    const x=cx-NW/2, y=cy-NH/2;
    const sel=(arbreSelectedId===p.id);
    const parts=p.nom.split(' ');
    const firstName=parts[0]||'';
    const lastName=parts.slice(1).join(' ');
    const shortFirst=firstName.length>13?firstName.slice(0,11)+'…':firstName;
    const shortLast=lastName.length>15?lastName.slice(0,13)+'…':lastName;

    const pHex=AV_HEX[p.color||'purple']||C_COUPLE;
    const pSel=mixCol(pHex,'#ffffff',0.55);
    nodesHTML+=`
    <g id="arbre-node-${p.id}" transform="translate(${x},${y})" style="cursor:pointer" onclick="selectArbreNode('${p.id}')" class="arbre-node${sel?' sel':''}">
      <rect width="${NW}" height="${NH}" rx="14" fill="#0c1430" stroke="${sel?pSel:pHex}" stroke-width="${sel?2.2:1.5}" filter="url(#${sel?'nodeGlow':'nodeShadow'})"/>
      <rect x="1.5" y="1.5" width="${NW-3}" height="${NH-3}" rx="12.5" fill="url(#nodeGrad-${p.color||'purple'})" opacity="0.7"/>
      <circle cx="${NW/2}" cy="26" r="16" fill="#142042" stroke="${pHex}" stroke-width="1.3" opacity="0.95"/>
      ${motif(NW/2,26,7,pHex)}
      <text x="${NW/2}" y="${NH-26}" text-anchor="middle" font-size="13" fill="#d2e2ff" font-family="Cinzel,serif">${shortFirst}</text>
      ${shortLast?`<text x="${NW/2}" y="${NH-10}" text-anchor="middle" font-size="10" fill="#7595d4" font-family="Inter,sans-serif" letter-spacing="0.5">${shortLast}</text>`:''}
    </g>`;
  });

  const nodeColors=[...new Set(nodes.map(p=>p.color||'purple'))];
  // Un dégradé de carte par couleur de personnage présente dans l'arbre
  const nodeGradDefs=nodeColors.map(cn=>{const hex=AV_HEX[cn]||C_COUPLE;return `<linearGradient id="nodeGrad-${cn}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${hex}" stop-opacity="0.4"/><stop offset="100%" stop-color="#0a1530" stop-opacity="0.05"/></linearGradient>`;}).join('');
  const bgGradDef=arbreBgGradient(nodeColors);
  const defs=`<defs>
    <filter id="nodeShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000820" flood-opacity="0.7"/></filter>
    <filter id="nodeGlow" x="-70%" y="-70%" width="240%" height="240%"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#5b8dd9" flood-opacity="0.95"/></filter>
    <filter id="titleGlow" x="-30%" y="-100%" width="160%" height="300%"><feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#3a6ad0" flood-opacity="0.6"/></filter>
    ${nodeGradDefs}
    <radialGradient id="petalGrad" cx="50%" cy="32%" r="68%"><stop offset="0%" stop-color="#a6c8ff"/><stop offset="100%" stop-color="#4a6fc0"/></radialGradient>
    <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4f78c8"/><stop offset="100%" stop-color="#2c4a92"/></linearGradient>
    ${bgGradDef}
    <radialGradient id="vignette" cx="50%" cy="42%" r="78%"><stop offset="52%" stop-color="#02060f" stop-opacity="0"/><stop offset="100%" stop-color="#02060f" stop-opacity="0.6"/></radialGradient>
    <style>
      .arbre-node rect { transition: stroke 0.2s, stroke-width 0.2s; }
      .arbre-node { transition: filter 0.2s; }
      .arbre-node:hover { filter: brightness(1.22); }
    </style>
  </defs>`;

  // Fond + cadre + décor floral : couche FIXE (ne suit pas le zoom/déplacement)
  const bg=`<rect width="${svgW}" height="${svgH}" fill="url(#bgGrad)"/><rect width="${svgW}" height="${svgH}" fill="url(#vignette)"/>`;
  const frame=`
    <rect x="14" y="14" width="${svgW-28}" height="${svgH-28}" rx="13" fill="none" stroke="#274686" stroke-width="1" opacity="0.55"/>
    <rect x="20" y="20" width="${svgW-40}" height="${svgH-40}" rx="10" fill="none" stroke="#1a3068" stroke-width="0.5" opacity="0.4"/>`;
  const staticLayer=`${bg}${frame}${corners}${titre}`;

  // Couche transformable : seules les cartes + lignes bougent au zoom/déplacement
  svg.innerHTML=`${defs}${staticLayer}<g id="arbre-g" transform="translate(${arbrePanX},${arbrePanY}) scale(${arbreZoom})">${linesHTML}${nodesHTML}</g>`;
  svg.setAttribute('viewBox',`0 0 ${svgW} ${svgH}`);
  svg.style.width='100%'; svg.style.height='100%';
  arbreViewW=svgW; arbreViewH=svgH;
  if(arbreSelectedId) requestAnimationFrame(()=>positionArbreDetail(arbreSelectedId));
}

// --- Fiche déroulante au clic sur un nœud (menu du haut vers le bas) ---
function selectArbreNode(id){
  if(arbreSelectedId===id){ closeArbreDetail(); return; }
  arbreSelectedId=id;
  renderArbre();          // re-dessine pour surligner le nœud sélectionné
  openArbreDetail(id);
}
function openArbreDetail(id){
  const p=S.personnages.find(x=>x.id===id); if(!p)return;
  const canvasEl=document.getElementById('arbre-canvas');
  let panel=document.getElementById('arbre-detail');
  if(!panel){ panel=document.createElement('div'); panel.id='arbre-detail'; panel.className='arbre-detail'; canvasEl.appendChild(panel); }
  panel.classList.remove('open');
  panel.innerHTML=arbreFicheHTML(p);
  canvasEl.style.overflow='visible';   // laisse la fiche déborder sous la carte
  positionArbreDetail(id);
  void panel.offsetHeight;             // force un reflow pour (re)jouer l'animation
  panel.classList.add('open');
}
function positionArbreDetail(id){
  const panel=document.getElementById('arbre-detail'); if(!panel)return;
  const node=document.getElementById('arbre-node-'+id);
  const canvasEl=document.getElementById('arbre-canvas');
  if(!node||!canvasEl)return;
  const nr=node.getBoundingClientRect(), cr=canvasEl.getBoundingClientRect();
  const w=300;
  let left=(nr.left-cr.left)+nr.width/2-w/2;
  left=Math.max(6,Math.min(left,canvasEl.clientWidth-w-6));
  panel.style.left=left+'px';
  panel.style.top=((nr.bottom-cr.top)+8)+'px';
}
function closeArbreDetail(){
  const panel=document.getElementById('arbre-detail');
  const wasSel=arbreSelectedId;
  arbreSelectedId=null;
  if(panel) panel.classList.remove('open');
  const canvasEl=document.getElementById('arbre-canvas'); if(canvasEl) canvasEl.style.overflow='hidden';
  if(wasSel) renderArbre();
}
function arbreFicheHTML(p){
  const init=p.nom.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const meta=[p.role,p.espece,p.age,p.sexe].filter(Boolean).join(' · ');
  const secs=[['Physique',p.appPhysique],['Vêtements & tenue',p.appTenue],['Signes distinctifs',p.appSignes],
    ['Particularités magiques',p.appMagie],['Personnalité',p.personnalite],['Histoire & passé',p.passe],
    ['Motivations & objectifs',p.motiv],['Pouvoirs & compétences',p.pouvoirs],['Arc narratif',p.arc]];
  const filled=secs.filter(([l,v])=>v&&v.trim());
  const body=filled.map(([l,v],i)=>`<div class="ad-section${i===0?' first':''}"><div class="ad-label">${l}</div><div class="ad-text">${esc(v)}</div></div>`).join('');
  return `<button class="ad-close" onclick="closeArbreDetail()">✕</button>
    <div class="arbre-detail-inner">
      <div class="ad-head">
        <div class="ad-emblem">${imgInner(p.image,init)}</div>
        <div><div class="ad-name">${esc(p.nom)}${p.alias?`<span class="ad-alias">${esc(p.alias)}</span>`:''}</div>${meta?`<div class="ad-meta">${esc(meta)}</div>`:''}</div>
      </div>
      ${body||'<div class="ad-text first" style="color:#5d7cb6">Aucun détail renseigné pour ce personnage.</div>'}
      <div class="ad-footer"><button class="btn ad-btn" onclick="openModal('perso','${p.id}')">✎ Éditer la fiche complète</button></div>
    </div>`;
}

// --- Zoom / déplacement ---
function applyArbreTransform(){
  const g=document.getElementById('arbre-g');
  if(g)g.setAttribute('transform',`translate(${arbrePanX},${arbrePanY}) scale(${arbreZoom})`);
  if(arbreSelectedId)positionArbreDetail(arbreSelectedId);
}
function arbreZoomIn(){arbreZoom=Math.min(arbreZoom+0.15,3);applyArbreTransform();}
function arbreZoomOut(){arbreZoom=Math.max(arbreZoom-0.15,0.3);applyArbreTransform();}
function arbreReset(){arbreZoom=1;arbrePanX=0;arbrePanY=0;applyArbreTransform();}

// --- Interactions canvas (molette + glisser pour déplacer) ---
(function initArbreCanvas(){
  const cv=document.getElementById('arbre-canvas'); if(!cv)return;
  cv.addEventListener('wheel',e=>{e.preventDefault();const f=e.deltaY<0?1.08:0.926;arbreZoom=Math.min(Math.max(arbreZoom*f,0.3),3);applyArbreTransform();},{passive:false});
  cv.addEventListener('mousedown',e=>{
    if(e.target.closest('.arbre-node')||e.target.closest('#arbre-detail'))return;
    arbreDragging=true;arbreLastX=e.clientX;arbreLastY=e.clientY;cv.style.cursor='grabbing';
  });
  window.addEventListener('mousemove',e=>{
    if(!arbreDragging)return;
    const k=Math.min(cv.clientWidth/(arbreViewW||1),cv.clientHeight/(arbreViewH||1))||1;
    arbrePanX+=(e.clientX-arbreLastX)/k;
    arbrePanY+=(e.clientY-arbreLastY)/k;
    arbreLastX=e.clientX;arbreLastY=e.clientY;
    applyArbreTransform();
  });
  window.addEventListener('mouseup',()=>{ if(arbreDragging){arbreDragging=false;cv.style.cursor='grab';} });
})();

// --- Arbres sauvegardés (sélection / création / édition) ---
function ensureArbres(){ if(!Array.isArray(S.arbres)) S.arbres=[]; }
function renderArbreSelect(){
  ensureArbres();
  const sel=document.getElementById('arbre-select'); if(!sel)return;
  if(arbreCurrentId!=='__all__' && !S.arbres.some(a=>a.id===arbreCurrentId)) arbreCurrentId='__all__';
  sel.innerHTML='<option value="__all__">🌳 Tout afficher</option>'+S.arbres.map(a=>`<option value="${a.id}">${esc(a.nom)}</option>`).join('');
  sel.value=arbreCurrentId;
  const custom=arbreCurrentId!=='__all__';
  const eb=document.getElementById('arbre-edit-btn'), db=document.getElementById('arbre-del-btn');
  if(eb)eb.style.display=custom?'':'none';
  if(db)db.style.display=custom?'':'none';
}
function selectArbre(val){ arbreCurrentId=val; S.arbreCurrentId=val; save(); closeArbreDetail(); renderArbre(); }
function openArbreModal(id){
  ensureArbres();
  document.getElementById('arbre-edit-id').value='';
  document.getElementById('arbre-nom').value='';
  document.getElementById('arbre-modal-title').textContent='Nouvel arbre';
  const motifSel=document.getElementById('arbre-motif');
  if(motifSel) motifSel.innerHTML=ARBRE_MOTIFS.map(m=>`<option value="${m.id}">${m.label}</option>`).join('');
  let motifVal='fleur', branchesVal=true;
  let checked=null;
  if(id){const a=S.arbres.find(x=>x.id===id);if(a){document.getElementById('arbre-edit-id').value=id;document.getElementById('arbre-nom').value=a.nom||'';document.getElementById('arbre-modal-title').textContent='Modifier l’arbre';checked=new Set(a.relIds||[]);motifVal=a.motif||'fleur';branchesVal=(a.branches!==false);}}
  if(motifSel) motifSel.value=motifVal;
  const brCb=document.getElementById('arbre-branches'); if(brCb) brCb.checked=branchesVal;
  buildArbreChooser(checked);
  document.getElementById('modal-arbre').classList.add('open');
}
function buildArbreChooser(checkedSet){
  const box=document.getElementById('arbre-rel-choose');
  const fam=S.relations.filter(r=>ARBRE_FAM_TYPES.includes(r.type));
  if(!fam.length){box.innerHTML='<div class="arbre-rel-empty">Aucune relation familiale. Crée d’abord des liens (Parent / enfant, Époux / épouse…) dans l’onglet Relations.</div>';return;}
  box.innerHTML=fam.map(r=>{
    const pA=S.personnages.find(p=>p.id===r.a), pB=S.personnages.find(p=>p.id===r.b);
    if(!pA||!pB)return'';
    const on=checkedSet?checkedSet.has(r.id):true; // nouvel arbre : tout coché par défaut
    return `<label class="arbre-rel-row"><input type="checkbox" value="${r.id}" ${on?'checked':''}><span><strong>${esc(pA.nom)}</strong> <span style="color:var(--text3)">⟷</span> <strong>${esc(pB.nom)}</strong> <span style="color:var(--text3);font-size:11px">· ${esc(r.type)}</span></span></label>`;
  }).join('');
}
function arbreCheckAll(v){document.querySelectorAll('#arbre-rel-choose input[type=checkbox]').forEach(c=>c.checked=v);}
function saveArbre(){
  ensureArbres();
  const nom=document.getElementById('arbre-nom').value.trim(); if(!nom)return;
  const editId=document.getElementById('arbre-edit-id').value;
  const relIds=[...document.querySelectorAll('#arbre-rel-choose input:checked')].map(c=>c.value);
  const motif=(document.getElementById('arbre-motif')||{}).value||'fleur';
  const branches=!!(document.getElementById('arbre-branches')||{}).checked;
  if(editId){const i=S.arbres.findIndex(a=>a.id===editId);if(i>=0)S.arbres[i]={...S.arbres[i],nom,relIds,motif,branches};arbreCurrentId=editId;}
  else{const id=uid();S.arbres.push({id,nom,relIds,motif,branches});arbreCurrentId=id;}
  S.arbreCurrentId=arbreCurrentId;
  save(); closeModal('arbre'); renderArbre();
}
function delArbre(id){
  ensureArbres();
  if(!id||id==='__all__')return;
  const a=S.arbres.find(x=>x.id===id);
  if(!confirm('Supprimer l’arbre « '+(a?a.nom:'')+' » ?\n(les personnages et relations ne sont pas supprimés)'))return;
  S.arbres=S.arbres.filter(x=>x.id!==id);
  arbreCurrentId='__all__';
  S.arbreCurrentId='__all__';
  save(); renderArbre();
}


/* =========================================================================
   DIEUX — sous-onglet de la page Personnages.
   Rangés dans S.dieux, sauvegardés dans le localStorage comme le reste
   (seul le symbole, qui est une image, reste en session + export .json).
   Les formulaires passent par le moteur générique de la page Magie ; comme
   magie.js est chargé APRÈS personnages.js, l'enregistrement des fiches se
   fait au démarrage (dieuxSpecs) et non au chargement du fichier.
   ========================================================================= */
function switchPersoTab(id,el){
  document.querySelectorAll('#page-personnages .subpanel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#page-personnages .subtab').forEach(t=>t.classList.remove('active'));
  const panel=document.getElementById('perso-panel-'+id);
  if(panel)panel.classList.add('active');
  if(el)el.classList.add('active');
  // le bouton d'ajout de l'en-tête suit le sous-onglet affiché
  const b=document.getElementById('perso-add-btn');
  if(b){
    const dieux=id==='dieux';
    b.textContent=dieux?'+ Nouveau dieu':'+ Nouveau personnage';
    b.setAttribute('onclick',dieux?"mgOpenForm('dieu')":"openModal('perso')");
  }
}

function dieuxArr(){if(!Array.isArray(S.dieux))S.dieux=[];return S.dieux;}

/* Domaines d'influence — badges sélectionnables */
const DIEU_DOMAINES=[
  ['guerre','Guerre','red'],          ['magie','Magie','purple'],
  ['justice','Justice','blue'],       ['nature','Nature','green'],
  ['destin','Destin','amber'],        ['mort','Mort','slate'],
  ['amour','Amour','pink'],           ['savoir','Savoir','teal'],
  ['commerce','Commerce','amber'],    ['temps','Temps','blue'],
  ['creation','Création','green'],    ['destruction','Destruction','coral'],
  ['lumiere','Lumière','amber'],      ['ombre','Ombre','purple']
];
const DIEU_DOM={};DIEU_DOMAINES.forEach(x=>{DIEU_DOM[x[0]]=x;});

/* Types de relation entre dieux. Le 4e élément est la relation inverse :
   si A déclare « B est mon enfant », la fiche de B affiche « A — parent »
   sans que rien soit saisi deux fois. */
const DIEU_REL_TYPES=[
  ['epoux',     'Époux / épouse','pink',  'epoux'],
  ['enfant',    'Enfant',        'green', 'parent'],
  ['parent',    'Parent',        'teal',  'enfant'],
  ['rival',     'Rival',         'coral', 'rival'],
  ['allie',     'Allié',         'green', 'allie'],
  ['ennemi',    'Ennemi',        'red',   'ennemi'],
  ['creePar',   'Créé par',      'purple','createurDe'],
  ['createurDe','Créateur de',   'amber', 'creePar'],
  ['autre',     'Autre',         'slate', 'autre']
];
const DIEU_REL={};DIEU_REL_TYPES.forEach(t=>{DIEU_REL[t[0]]=t;});
function dieuRelT(k){return DIEU_REL[k]||DIEU_REL.autre;}
function dieuRelInverse(k){return dieuRelT(k)[3];}

/* Statuts possibles d'un dieu */
const DIEU_STATUTS=[['','— non précisé —'],['actif','Actif'],['endormi','Endormi'],['mort','Mort'],
  ['oublie','Oublié'],['dechu','Déchu'],['emprisonne','Emprisonné'],['inconnu','Inconnu']];

/* Toutes les relations d'un dieu : celles qu'il déclare, plus celles que les
   autres déclarent vers lui, retournées dans le bon sens. */
function dieuRels(g){
  const lignes=(Array.isArray(g.rels)?g.rels:[]).filter(r=>Array.isArray(r)&&r[0]);
  const out=lignes.map(r=>({id:r[0],type:r[1]||'autre',desc:r[2]||'',propre:true}));
  (S.dieux||[]).forEach(o=>{
    if(!o||o.id===g.id)return;
    (Array.isArray(o.rels)?o.rels:[]).forEach(r=>{
      if(!Array.isArray(r)||r[0]!==g.id)return;
      if(out.some(x=>x.id===o.id))return;          // déjà déclarée de ce côté-ci
      out.push({id:o.id,type:dieuRelInverse(r[1]||'autre'),desc:r[2]||'',propre:false,via:o.nom||''});
    });
  });
  return out;
}
function dieuDomTags(ids){
  return (Array.isArray(ids)?ids:[]).map(k=>{
    const dmn=DIEU_DOM[k];if(!dmn)return'';
    return mgPill(dmn[1],dmn[2]);
  }).filter(Boolean);
}
function loadDieux(){dieuxSpecs();renderDieux();}

/* Badges cliquables vers les artefacts, l'espèce, les lieux et les événements */
function dieuArtefactTags(ids){
  return (Array.isArray(ids)?ids:[]).map(id=>{
    const a=(MGD().artefacts||[]).find(x=>x.id===id);if(!a)return'';
    return `<span class="tag tag-pink link-tag" style="font-size:11px" onclick="mgGo('artefacts');event.stopPropagation()">${mgEsc(a.icone||'💎')} ${esc(a.nom||'Sans nom')}</span>`;
  }).filter(Boolean);
}
function dieuEspeceTags(id){
  const e=(CRD().especes||[]).find(x=>x.id===id);if(!e)return[];
  const p=mgP(e.couleur||crT(e.type)[2]);
  return [`<span class="tag link-tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}" onclick="crGo('bestiaire');crOpenEspece('${e.id}');event.stopPropagation()">${mgEsc(e.icone||'🐾')} ${esc(e.nom)}</span>`];
}

/* Onglet actif de chaque fiche de dieu : 'fiche' ou 'liens' */
let dieuOnglet={};
function dieuSetOnglet(id,k){dieuOnglet[id]=k;renderDieux();}
function renderDieux(){
  const el=document.getElementById('dieu-list');if(!el)return;
  const dx=dieuxArr();
  const fiches=dx.map(g=>{
    const p=mgP(g.couleur||'amber');
    const blocs=[['personnalite','Personnalité'],['pouvoirs','Pouvoirs'],
                 ['hOrigine','Origine & création'],['hBatailles','Grandes batailles & épreuves'],
                 ['hEvolution','Évolution au fil des âges']]
      .filter(b=>String(g[b[0]]||'').trim())
      .map(b=>`<div class="cr-block"><div class="cr-block-t">${mgEsc(b[1])}</div><div class="cr-block-d">${mgEsc(g[b[0]])}</div></div>`).join('');
    // relations : celles du dieu + celles déduites des autres fiches
    const rels=dieuRels(g).map(r=>{
      const o=(S.dieux||[]).find(x=>x.id===r.id);if(!o)return'';
      const t=dieuRelT(r.type),pp=mgP(t[2]);
      return `<span class="tag link-tag" style="font-size:11px;background:rgba(${pp.rgb},0.15);color:${pp.v}"
        onclick="ouvrirDieu('${o.id}');event.stopPropagation()"
        title="${esc(r.desc||t[1])}${r.propre?'':' — déclaré sur la fiche de '+esc(r.via||'')}">${esc(t[1])} — ${esc(o.nom||'')}${r.propre?'':' ↩'}</span>`;
    }).filter(Boolean);
    // interdits : un acte et sa sanction divine
    const interdits=(Array.isArray(g.interdits)?g.interdits:[])
      .filter(x=>Array.isArray(x)&&((x[0]||'').trim()||(x[1]||'').trim()))
      .map(x=>`<div class="lo-sanction"><span class="lo-acte">${mgEsc(x[0]||'—')}</span><span class="lo-fleche">→</span><span class="lo-peine">${mgEsc(x[1]||'—')}</span></div>`).join('');
    const dom=dieuDomTags(g.domaines);
    const st=DIEU_STATUTS.find(x=>x[0]===(g.statut||''));
    const ligne=(lab,tags,vide)=>`<div class="cr-link-row"><span class="cr-link-lab">${mgEsc(lab)}</span><div class="tag-row" style="flex:1">${tags.length?tags.join(''):`<span class="cr-auto">${mgEsc(vide)}</span>`}</div></div>`;
    const symbole=imgWrap(
      `<span class="cr-portrait" style="width:64px;height:64px;font-size:29px;background:rgba(${p.rgb},0.15);color:${p.v};border:1px solid rgba(${p.rgb},0.28)">${imgInner(g.image,mgEsc(g.icone||'☀'))}</span>`,
      'dieu',g.id,'le symbole du dieu');
    return `<div class="cr-fiche" id="dieu-${g.id}" style="border-left-color:${p.v}">
      <div class="cr-fiche-head">
        ${symbole}
        <div style="flex:1;min-width:0">
          <div class="mg-name w" style="font-size:16px">${mgEsc(g.nom)}</div>
          ${g.titre?`<div class="mg-role" style="margin-top:4px">${mgEsc(g.titre)}</div>`:''}
          ${(dom.length||st&&st[0])?`<div class="mg-chips" style="margin-top:8px">${dom.join('')}${st&&st[0]?mgPill('◈ '+st[1],'slate'):''}</div>`:''}
        </div>
        ${mgActs("mgOpenForm('dieu','"+g.id+"')",'Modifier le dieu')}
      </div>
      <div class="mo-tabs">
        <button type="button" class="subtab${dieuOnglet[g.id]==='liens'?'':' active'}" onclick="dieuSetOnglet('${g.id}','fiche')">Fiche</button>
        <button type="button" class="subtab${dieuOnglet[g.id]==='liens'?' active':''}" onclick="dieuSetOnglet('${g.id}','liens')">🔗 Liens</button>
      </div>
      ${dieuOnglet[g.id]==='liens'?liensHTML('dieu',g.id):`
      ${blocs?`<div class="cr-grid">${blocs}</div>`
        :`<div style="font-size:12px;color:var(--text3);font-style:italic">Fiche encore vide — clique sur ✎ pour la remplir.</div>`}
      ${interdits?`<div class="cr-links">
        <div class="cr-block-t" style="margin-bottom:8px">Interdits</div>
        ${interdits}
      </div>`:''}
      <div class="cr-links">
        ${ligne('Relations',rels,'Aucune relation avec un autre dieu')}
        ${String(g.relations||'').trim()?`<div class="cr-auto" style="margin:-3px 0 9px">Ancienne note : ${mgEsc(g.relations)}</div>`:''}
        ${ligne('Artefacts',dieuArtefactTags(g.artefacts),'Aucun artefact lié')}
        ${ligne('Espèce liée',dieuEspeceTags(g.especeId),'Aucune espèce liée')}
        ${ligne('Lieux liés',lieuTags(g.lieux),'Aucun lieu lié')}
        ${ligne('Fêtes &amp; événements',crEventTags(g.events),'Aucun événement lié')}
      </div>`}
    </div>`;
  }).join('');

  el.innerHTML=`
  <div class="mg-section-title">
    <div class="mg-head-t">Les dieux</div>
    <span style="font-size:12px;color:var(--text3)">${dx.length} dieu${dx.length>1?'x':''}</span>
  </div>
  ${dx.length?fiches:mgEmpty('Aucun dieu enregistré.')}`;
}

/* Enregistrement de la fiche dans le moteur générique (une seule fois) */
function dieuxSpecs(){
  if(dieuxSpecs.fait)return;dieuxSpecs.fait=true;
  Object.assign(MG_SPECS,{
    dieu:{title:'Dieu',list:'dieux',req:'nom',store:()=>S,after:renderDieux,
      fields:[
        {k:'nom',l:'Nom *',t:'text',ph:'Fenrhal',oi:"imgSyncPick('dieu')"},
        {k:'titre',l:'Titre / domaine',t:'text',ph:'Dieu du Loup blanc'},
        {k:'image',l:'Symbole du dieu',t:'img',ph:'Clique pour choisir une image depuis ton appareil. Sans image, l’icône ci-dessous est utilisée.'},
        {k:'icone',l:'Icône (utilisée sans image)',t:'text',ph:'☀',oi:"imgSyncPick('dieu')"},
        {k:'couleur',l:'Couleur',t:'pal'},
        {k:'domaines',l:'Domaines d’influence',t:'chips',opts:()=>DIEU_DOMAINES,
          ph:'Clique pour sélectionner ou retirer. Ils s’affichent en badges colorés sur la fiche.'},
        {k:'personnalite',l:'Personnalité',t:'area',h:100},
        {k:'pouvoirs',l:'Pouvoirs',t:'area',h:100},
        {k:'rels',l:'Relations avec d’autres dieux',t:'rows',
          cols:[{t:'ref',w:'180px',src:()=>(S.dieux||[]).filter(x=>x.id!==(mgForm&&mgForm.id))},
                {t:'sel',w:'160px',opts:()=>[['','— Type —']].concat(DIEU_REL_TYPES.map(t=>[t[0],t[1]]))},
                {t:'text',ph:'Précision courte…'}]},
        {k:'interdits',l:'Interdits — un interdit et sa sanction divine par ligne',t:'rows',
          cols:[{t:'text',ph:'Mentir en son nom'},{t:'text',ph:'Malédiction de silence'}]},
        {k:'hOrigine',l:'Histoire — origine & création',t:'area',h:100},
        {k:'hBatailles',l:'Histoire — grandes batailles ou épreuves',t:'area',h:100},
        {k:'hEvolution',l:'Histoire — évolution au fil des âges',t:'area',h:100},
        {k:'statut',l:'Statut actuel',t:'select',opts:()=>DIEU_STATUTS},
        {k:'artefacts',l:'Artefacts',t:'pick',src:()=>MGD().artefacts||[],tags:ids=>dieuArtefactTags(ids),
          empty:'Aucun artefact créé dans l’onglet Magie'},
        {k:'especeId',l:'Espèce liée',t:'select',
          opts:()=>[['','— aucune —']].concat((CRD().especes||[]).map(e=>[e.id,e.nom||'Sans nom']))},
        {k:'lieux',l:'Lieux liés',t:'pick',src:()=>S.lieux,tags:ids=>lieuTags(ids),empty:'Aucun lieu créé'},
        {k:'events',l:'Fêtes & événements',t:'pick',src:()=>S.evenements,tags:ids=>crEventTags(ids),empty:'Aucun événement créé'}
      ]}
  });
}

/* Badges cliquables vers un dieu — utilisés par le module Société */
function dieuTags(ids){
  return (Array.isArray(ids)?ids:[]).map(id=>{
    const g=(S.dieux||[]).find(x=>x.id===id);if(!g)return'';
    const p=mgP(g.couleur||'amber');
    return `<span class="tag link-tag" style="font-size:11px;background:rgba(${p.rgb},0.15);color:${p.v}" onclick="ouvrirDieu('${g.id}');event.stopPropagation()">${mgEsc(g.icone||'☀')} ${esc(g.nom||'Sans nom')}</span>`;
  }).filter(Boolean);
}
function ouvrirDieu(id){
  closeAllModals();navigateTo('personnages');
  switchPersoTab('dieux',document.querySelector('#page-personnages .subtab[data-pe="dieux"]'));
  setTimeout(()=>flashCard('dieu-'+id),60);
}
