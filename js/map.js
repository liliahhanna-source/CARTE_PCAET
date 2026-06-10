const GOOGLE_SHEETS_URL = 'data/projets.csv';
 
// 2. Le nom du champ commune dans ton GeoJSON
const GEOJSON_NOM_FIELD = 'libelle';
 
// 3. Les noms EXACTS de tes colonnes Excel
const COL = {
  commune:        'Commune',
  quartier:       'Quartier',
  nom_projet:     'Nom du projet',
  description:    'Description',
  axe_pcaet:      'Axe PCAET',
  statut:         'Statut du projet',
  cobenefits:     'Co-bénéfices',
  concertation:   'Niveau de concertation',
  nb_participants:'Nombre de participants',
  anecdote:       'Anecdote',
};
 
// 4. Correspondance entre les valeurs du formulaire et les niveaux internes
const CONCERTATION_MAP = {
  'Co-construction':             'co-construit',
  'co-construit':                'co-construit',
  'Consultation':                'consulté',
  'consulté':                    'consulté',
  'Information / Sensibilisation': 'informé',
  'informé':                     'informé',
  'Pas de concertation':         'non',
  'non':                         'non',
};
 
// ================================================================
// NE PAS MODIFIER EN DESSOUS
// ================================================================
 
const GEOJSON_PATH = 'data/communes.geojson';
const MAP_CENTER   = [43.6047, 1.4442];
const MAP_ZOOM     = 11;
 
const COBENEFIT_CONFIG = [
  { motcle: 'Confort thermique', icon: '🌡️', label: 'Confort thermique' },
  { motcle: 'Eau',               icon: '💧', label: 'Eau & biodiversité' },
  { motcle: 'air',               icon: '🌬️', label: "Qualité de l'air" },
  { motcle: 'Énergie',           icon: '⚡',  label: 'Énergie' },
  { motcle: 'nuisances',         icon: '🔇', label: 'Réduction des nuisances' },
  { motcle: 'Lien social',       icon: '🤝', label: 'Lien social' },
];
 
const CONCERTATION_CONFIG = {
  'co-construit': { couleur: '#16a34a', emoji: '🟢', label: 'Co-construit avec les habitants' },
  'consulté':     { couleur: '#2563eb', emoji: '🔵', label: 'Consulté — les avis ont été pris en compte' },
  'informé':      { couleur: '#d97706', emoji: '🟡', label: 'Les habitants ont été informés' },
  'non':          { couleur: '#9ca3af', emoji: '⚪', label: 'Pas de concertation formelle' },
};
 
// --- Carte Leaflet ---
const map = L.map('map', { center: MAP_CENTER, zoom: MAP_ZOOM });
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
  maxZoom: 19,
}).addTo(map);
 
// --- Utilitaires ---
function normaliser(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
 
function getCouleur(nb) {
  if (nb === 0) return '#e5e7eb';
  if (nb === 1) return '#bbf7d0';
  if (nb === 2) return '#4ade80';
  if (nb <= 4)  return '#16a34a';
  return '#14532d';
}
 
function styleCommune(nb) {
  return {
    fillColor:   getCouleur(nb),
    fillOpacity: nb > 0 ? 0.75 : 0.2,
    color:       '#ffffff',
    weight:      2,
  };
}
 
function getNiveauConcertation(projet) {
  const valeur = projet[COL.concertation] || '';
  for (const [k, v] of Object.entries(CONCERTATION_MAP)) {
    if (normaliser(valeur).includes(normaliser(k))) return v;
  }
  return 'non';
}
 
function renderCobenefits(projet) {
  const valeur = projet[COL.cobenefits] || '';
  const actifs = COBENEFIT_CONFIG.filter(cfg => valeur.includes(cfg.motcle));
  if (actifs.length === 0) return '';
  return `
    <div class="cobenefit-section">
      <p class="section-titre">Co-bénéfices écologiques</p>
      <div class="cobenefit-tags">
        ${actifs.map(cfg => `<span class="cobenefit-tag">${cfg.icon} ${cfg.label}</span>`).join('')}
      </div>
    </div>`;
}
 
function renderConcertation(projet) {
  const niveau = getNiveauConcertation(projet);
  const cfg    = CONCERTATION_CONFIG[niveau];
  const details = [];
  if (projet[COL.nb_participants]?.trim())
    details.push(`<span class="detail-concertation">${projet[COL.nb_participants]} participants</span>`);
  return `
    <div class="concertation-badge" style="border-left-color:${cfg.couleur}">
      <p class="concertation-niveau">${cfg.emoji} ${cfg.label}</p>
      ${details.length ? `<div class="concertation-details">${details.join('')}</div>` : ''}
    </div>`;
}
 
function renderAnecdote(projet) {
  const texte = projet[COL.anecdote] || '';
  if (!texte.trim()) return '';
  return `
    <div class="anecdote-bloc">
      <p class="anecdote-texte">"${texte}"</p>
    </div>`;
}
 
function createPopup(nomCommune, projets) {
  if (projets.length === 0) {
    return `<div class="popup-container">
      <h3 class="popup-commune">${nomCommune}</h3>
      <p class="popup-vide">Aucun projet recensé pour cette commune.</p>
    </div>`;
  }
  const nav = projets.length > 1 ? `
    <div class="nav-projets">
      <button onclick="navProjet(-1)" class="nav-btn">◀</button>
      <span id="nav-label">1 / ${projets.length}</span>
      <button onclick="navProjet(1)" class="nav-btn">▶</button>
    </div>` : '';
  const fiches = projets.map((p, i) => `
    <div class="fiche-slide" style="display:${i === 0 ? 'block' : 'none'}">
      <div class="fiche-header">
        <h4 class="projet-nom">${p[COL.nom_projet] || ''}</h4>
        ${p[COL.statut] ? `<span class="statut statut-${normaliser(p[COL.statut]).replace(/\s/g, '-')}">${p[COL.statut]}</span>` : ''}
      </div>
      ${p[COL.quartier]?.trim() ? `<p class="popup-count">📍 ${p[COL.quartier]}</p>` : ''}
      ${p[COL.axe_pcaet]?.trim() ? `<p class="popup-count">🌿 ${p[COL.axe_pcaet]}</p>` : ''}
      ${p[COL.description]?.trim() ? `<p class="projet-description">${p[COL.description]}</p>` : ''}
      ${renderCobenefits(p)}
      ${renderConcertation(p)}
      ${renderAnecdote(p)}
    </div>`).join('');
  return `<div class="popup-container">
    <h3 class="popup-commune">${nomCommune}</h3>
    <p class="popup-count">${projets.length} projet(s)</p>
    ${nav}
    <div id="fiches-container">${fiches}</div>
  </div>`;
}
 
let indexCourant = 0;
function navProjet(direction) {
  const fiches = document.querySelectorAll('.fiche-slide');
  if (!fiches.length) return;
  fiches[indexCourant].style.display = 'none';
  indexCourant = (indexCourant + direction + fiches.length) % fiches.length;
  fiches[indexCourant].style.display = 'block';
  const label = document.getElementById('nav-label');
  if (label) label.textContent = `${indexCourant + 1} / ${fiches.length}`;
}
 
function ajouterLegende() {
  const legende = L.control({ position: 'bottomright' });
  legende.onAdd = () => {
    const div = L.DomUtil.create('div', 'legende-carte');
    div.innerHTML = `
      <h4>Nombre de projets</h4>
      <div class="legende-item"><span style="background:#e5e7eb"></span> Aucun projet</div>
      <div class="legende-item"><span style="background:#bbf7d0"></span> 1 projet</div>
      <div class="legende-item"><span style="background:#4ade80"></span> 2 projets</div>
      <div class="legende-item"><span style="background:#16a34a"></span> 3–4 projets</div>
      <div class="legende-item"><span style="background:#14532d"></span> 5+ projets</div>
      <hr/>
      <h4>Participation citoyenne</h4>
      <div class="legende-item">🟢 Co-construit</div>
      <div class="legende-item">🔵 Consulté</div>
      <div class="legende-item">🟡 Informé</div>
      <div class="legende-item">⚪ Non formelle</div>`;
    return div;
  };
  legende.addTo(map);
}
 
let tousLesProjets = {};
let geojsonLayer;
 
function initFiltres() {
  const filtreConcertation = document.getElementById('filtre-concertation');
  const filtreCobenefit    = document.getElementById('filtre-cobenefit');
  function appliquerFiltres() {
    const valC = filtreConcertation.value;
    const valB = filtreCobenefit.value;
    geojsonLayer.eachLayer(layer => {
      const nomCommune = layer.feature.properties[GEOJSON_NOM_FIELD];
      const cle        = normaliser(nomCommune);
      const projets    = tousLesProjets[cle] || [];
      const filtres    = projets.filter(p => {
        const okC = valC === 'all' || getNiveauConcertation(p) === valC;
        const okB = valB === 'all' || (p[COL.cobenefits] || '').includes(valB);
        return okC && okB;
      });
      layer.setStyle(styleCommune(filtres.length));
      layer.setPopupContent(createPopup(nomCommune, filtres));
    });
  }
  filtreConcertation.addEventListener('change', appliquerFiltres);
  filtreCobenefit.addEventListener('change', appliquerFiltres);
}
 
async function chargerCarte() {
  const statusEl = document.getElementById('map-status');
  try {
    const [reponseGeo, reponseCSV] = await Promise.all([
      fetch(GEOJSON_PATH),
      fetch(GOOGLE_SHEETS_URL),
    ]);
    if (!reponseGeo.ok) throw new Error(`GeoJSON introuvable (${reponseGeo.status}) — vérifie que communes.geojson est bien dans le dossier data/`);
    if (!reponseCSV.ok) throw new Error(`CSV introuvable (${reponseCSV.status}) — vérifie que projets.csv est bien dans le dossier data/`);
 
    const geoData  = await reponseGeo.json();
    const csvTexte = await reponseCSV.text();
    const { data: projets } = Papa.parse(csvTexte, { header: true, skipEmptyLines: true });
 
    projets.forEach(p => {
      const cle = normaliser(p[COL.commune]);
      if (!tousLesProjets[cle]) tousLesProjets[cle] = [];
      tousLesProjets[cle].push(p);
    });
 
    // Décommente ces lignes pour déboguer si les communes ne s'affichent pas :
    // console.log('Communes CSV :', Object.keys(tousLesProjets));
    // console.log('Communes GeoJSON :', geoData.features.map(f => f.properties[GEOJSON_NOM_FIELD]));
 
    geojsonLayer = L.geoJSON(geoData, {
      style: feature => {
        const cle = normaliser(feature.properties[GEOJSON_NOM_FIELD]);
        return styleCommune((tousLesProjets[cle] || []).length);
      },
      onEachFeature: (feature, layer) => {
        const nomCommune = feature.properties[GEOJSON_NOM_FIELD];
        const cle        = normaliser(nomCommune);
        const projets    = tousLesProjets[cle] || [];
        layer.bindPopup(createPopup(nomCommune, projets), { maxWidth: 380, className: 'popup-pcaet' });
        layer.on('mouseover', function () { this.setStyle({ weight: 3, fillOpacity: 0.9 }); this.bringToFront(); });
        layer.on('mouseout',  function () { geojsonLayer.resetStyle(this); });
        layer.on('popupopen', () => { indexCourant = 0; });
      },
    }).addTo(map);
 
    ajouterLegende();
    initFiltres();
    if (statusEl) statusEl.textContent = `${projets.length} projet(s) chargé(s). Cliquez sur une commune pour voir les détails.`;
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = `⚠️ ${err.message} — ouvre la console (F12) pour plus de détails.`;
  }
}
 
chargerCarte();
