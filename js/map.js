const GOOGLE_SHEETS_URL = 'projets.csv';
const GEOJSON_PATH = 'js/communes.geojson';

// Colonnes du CSV
const COL = {
  commune: 'Commune',
  quartier: 'Quartier (si applicable)',
  nom_projet: 'Nom du projet',
  description: 'Description pour les habitants',
  axe_pcaet: 'Axe PCAET',
  type_technique: 'Type technique',
  statut: 'Statut du projet',
  cobenefits: 'Co-bénéfices du projet',
  concertation: 'Niveau de participation',
  dispositif: 'Dispositif de participation',
  nb_participants: 'Nombre de participants',
  anecdote: 'Anecdote ou témoignage collecté'
};

const CONCERTATION_MAP = {
  'Co-construction': 'co-construit',
  'co-construit': 'co-construit',
  'Consultation': 'consulté',
  'consulté': 'consulté',
  'Information / Sensibilisation': 'informé',
  'informé': 'informé',
  'Pas de concertation': 'non',
  'non': 'non'
};

const GEOJSON_PATH = 'data/communes.geojson';
const MAP_CENTER = [43.6047, 1.4442];
const MAP_ZOOM = 11;

const COBENEFIT_CONFIG = [
  { motcle: 'Confort thermique', icon: '🌡️', label: 'Confort thermique' },
  { motcle: 'Eau', icon: '💧', label: 'Eau & biodiversité' },
  { motcle: 'air', icon: '🌬️', label: "Qualité de l'air" },
  { motcle: 'Énergie', icon: '⚡', label: 'Énergie' },
  { motcle: 'nuisances', icon: '🔇', label: 'Réduction des nuisances' },
  { motcle: 'Lien social', icon: '🤝', label: 'Lien social' }
];

const CONCERTATION_CONFIG = {
  'co-construit': {
    couleur: '#16a34a',
    emoji: '🟢',
    label: 'Co-construit avec les habitants'
  },
  'consulté': {
    couleur: '#2563eb',
    emoji: '🔵',
    label: 'Consulté — les avis ont été pris en compte'
  },
  'informé': {
    couleur: '#d97706',
    emoji: '🟡',
    label: 'Les habitants ont été informés'
  },
  'non': {
    couleur: '#9ca3af',
    emoji: '⚪',
    label: 'Pas de concertation formelle'
  }
};

// Carte
const map = L.map('map', {
  center: MAP_CENTER,
  zoom: MAP_ZOOM
});

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution:
      '© OpenStreetMap © CARTO',
    maxZoom: 19
  }
).addTo(map);

// Utilitaires

function normaliser(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getCouleur(nb) {
  if (nb === 0) return '#e5e7eb';
  if (nb === 1) return '#bbf7d0';
  if (nb === 2) return '#4ade80';
  if (nb <= 4) return '#16a34a';
  return '#14532d';
}

function styleCommune(nb) {
  return {
    fillColor: getCouleur(nb),
    fillOpacity: nb > 0 ? 0.75 : 0.2,
    color: '#ffffff',
    weight: 2
  };
}

function getNiveauConcertation(projet) {
  const valeur = projet[COL.concertation] || '';

  for (const [k, v] of Object.entries(CONCERTATION_MAP)) {
    if (normaliser(valeur).includes(normaliser(k))) {
      return v;
    }
  }

  return 'non';
}

function renderCobenefits(projet) {
  const valeur = projet[COL.cobenefits] || '';

  const actifs = COBENEFIT_CONFIG.filter(cfg =>
    valeur.includes(cfg.motcle)
  );

  if (!actifs.length) return '';

  return `
    <div class="cobenefit-section">
      <p class="section-titre">Co-bénéfices écologiques</p>

      <div class="cobenefit-tags">
        ${actifs.map(cfg =>
          `<span class="cobenefit-tag">${cfg.icon} ${cfg.label}</span>`
        ).join('')}
      </div>
    </div>
  `;
}

function renderConcertation(projet) {

  const niveau = getNiveauConcertation(projet);
  const cfg = CONCERTATION_CONFIG[niveau];

  return `
    <div class="concertation-badge"
         style="border-left-color:${cfg.couleur}">
      <p class="concertation-niveau">
        ${cfg.emoji} ${cfg.label}
      </p>
    </div>
  `;
}

function renderAnecdote(projet) {

  const texte = projet[COL.anecdote] || '';

  if (!texte.trim()) return '';

  return `
    <div class="anecdote-bloc">
      <p class="anecdote-texte">
        "${texte}"
      </p>
    </div>
  `;
}

function createPopup(nomCommune, projets) {

  if (!projets.length) {
    return `
      <div class="popup-container">
        <h3 class="popup-commune">${nomCommune}</h3>
        <p class="popup-vide">
          Aucun projet recensé.
        </p>
      </div>
    `;
  }

  const projet = projets[0];

  return `
    <div class="popup-container">

      <h3 class="popup-commune">${nomCommune}</h3>

      <h4 class="projet-nom">
        ${projet[COL.nom_projet] || ''}
      </h4>

      ${projet[COL.quartier] ?
        `<p class="popup-count">📍 ${projet[COL.quartier]}</p>`
        : ''
      }

      ${projet[COL.description] ?
        `<p class="projet-description">${projet[COL.description]}</p>`
        : ''
      }

      ${renderCobenefits(projet)}

      ${renderConcertation(projet)}

      ${renderAnecdote(projet)}

      <p class="popup-count">
        ${projets.length} projet(s) dans cette commune
      </p>

    </div>
  `;
}

// FILTRE COMMUNE

function remplirFiltreCommunes() {

  const select =
    document.getElementById('filtre-commune');

  if (!select) return;

  const communes =
    Object.keys(tousLesProjets)
      .sort((a,b)=>a.localeCompare(b));

  communes.forEach(commune => {

    const option =
      document.createElement('option');

    option.value = commune;

    option.textContent =
      commune.charAt(0).toUpperCase() +
      commune.slice(1);

    select.appendChild(option);

  });
}

function ajouterLegende() {

  const legende =
    L.control({ position: 'bottomright' });

  legende.onAdd = () => {

    const div =
      L.DomUtil.create('div','legende-carte');

    div.innerHTML = `
      <h4>Nombre de projets</h4>

      <div class="legende-item">
        <span style="background:#e5e7eb"></span>
        Aucun projet
      </div>

      <div class="legende-item">
        <span style="background:#bbf7d0"></span>
        1 projet
      </div>

      <div class="legende-item">
        <span style="background:#4ade80"></span>
        2 projets
      </div>

      <div class="legende-item">
        <span style="background:#16a34a"></span>
        3–4 projets
      </div>

      <div class="legende-item">
        <span style="background:#14532d"></span>
        5+ projets
      </div>
    `;

    return div;
  };

  legende.addTo(map);
}

let tousLesProjets = {};
let geojsonLayer;

function initFiltres() {

  const filtreCommune =
    document.getElementById('filtre-commune');

  const filtreConcertation =
    document.getElementById('filtre-concertation');

  const filtreCobenefit =
    document.getElementById('filtre-cobenefit');

  function appliquerFiltres() {

    const valCommune =
      filtreCommune?.value || 'all';

    const valConcertation =
      filtreConcertation.value;

    const valCobenefit =
      filtreCobenefit.value;

    geojsonLayer.eachLayer(layer => {

      const nomCommune =
        layer.feature.properties[GEOJSON_NOM_FIELD];

      const cle =
        normaliser(nomCommune);

      const projets =
        tousLesProjets[cle] || [];

      const filtres = projets.filter(p => {

        const okCommune =
          valCommune === 'all' ||
          cle === valCommune;

        const okConcertation =
          valConcertation === 'all' ||
          getNiveauConcertation(p) === valConcertation;

        const okCobenefit =
          valCobenefit === 'all' ||
          (p[COL.cobenefits] || '').includes(valCobenefit);

        return (
          okCommune &&
          okConcertation &&
          okCobenefit
        );

      });

      layer.setStyle(
        styleCommune(filtres.length)
      );

      layer.setPopupContent(
        createPopup(nomCommune, filtres)
      );

    });

  }

  filtreCommune?.addEventListener(
    'change',
    appliquerFiltres
  );

  filtreConcertation.addEventListener(
    'change',
    appliquerFiltres
  );

  filtreCobenefit.addEventListener(
    'change',
    appliquerFiltres
  );
}

async function chargerCarte() {

  const statusEl =
    document.getElementById('map-status');

  try {

    const [geoResp, csvResp] =
      await Promise.all([
        fetch(GEOJSON_PATH),
        fetch(GOOGLE_SHEETS_URL)
      ]);

    const geoData =
      await geoResp.json();

    const csvText =
      await csvResp.text();

    const { data: projets } =
      Papa.parse(csvText,{
        header:true,
        skipEmptyLines:true
      });

    projets.forEach(p => {

      const cle =
        normaliser(p[COL.commune]);

      if (!tousLesProjets[cle]) {
        tousLesProjets[cle] = [];
      }

      tousLesProjets[cle].push(p);

    });

    remplirFiltreCommunes();

    geojsonLayer = L.geoJSON(geoData, {

      style: feature => {

        const cle =
          normaliser(
            feature.properties[GEOJSON_NOM_FIELD]
          );

        return styleCommune(
          (tousLesProjets[cle] || []).length
        );

      },

      onEachFeature: (feature, layer) => {

        const nomCommune =
          feature.properties[GEOJSON_NOM_FIELD];

        const cle =
          normaliser(nomCommune);

        const projets =
          tousLesProjets[cle] || [];

        layer.bindPopup(
          createPopup(nomCommune, projets),
          {
            maxWidth: 380,
            className: 'popup-pcaet'
          }
        );

      }

    }).addTo(map);

    ajouterLegende();
    initFiltres();

    statusEl.textContent =
      `${projets.length} projet(s) chargé(s)`;

  }

  catch(err) {

    console.error(err);

    statusEl.textContent =
      'Erreur de chargement';

  }

}

chargerCarte();
