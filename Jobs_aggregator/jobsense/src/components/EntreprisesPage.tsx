import React, { useState } from 'react';

const COMPANIES = [
  { id: '1', name: 'Doctolib', logo: 'DC', sector: 'HealthTech', size: '1 000–5 000 emp.', location: 'Paris', openJobs: 12, description: 'Leader européen de la santé numérique, Doctolib simplifie l\'accès aux soins pour des millions de patients.' },
  { id: '2', name: 'Alan', logo: 'AL', sector: 'InsurTech', size: '500–1 000 emp.', location: 'Paris', openJobs: 8, description: 'Alan réinvente l\'assurance santé en entreprise avec une expérience 100% digitale et transparente.' },
  { id: '3', name: 'BlaBlaCar', logo: 'BC', sector: 'Mobilité', size: '500–1 000 emp.', location: 'Paris', openJobs: 5, description: 'La plus grande communauté de covoiturage longue distance au monde, présente dans 22 pays.' },
  { id: '4', name: 'Qonto', logo: 'QT', sector: 'FinTech', size: '500–1 000 emp.', location: 'Paris', openJobs: 15, description: 'Qonto est la néobanque des PME et indépendants, avec plus de 400 000 clients en Europe.' },
  { id: '5', name: 'Ledger', logo: 'LG', sector: 'Crypto / Web3', size: '500–1 000 emp.', location: 'Paris', openJobs: 9, description: 'Ledger conçoit la référence mondiale en sécurité crypto, avec plus de 6 millions d\'appareils vendus.' },
  { id: '6', name: 'Spendesk', logo: 'SN', sector: 'FinTech', size: '200–500 emp.', location: 'Paris / Remote', openJobs: 4, description: 'Plateforme de gestion des dépenses pour les équipes finance, utilisée par 3 500+ entreprises.' },
  { id: '7', name: 'Pennylane', logo: 'PL', sector: 'FinTech', size: '200–500 emp.', location: 'Paris', openJobs: 6, description: 'Le logiciel de pilotage financier pour les TPE-PME et leurs experts-comptables.' },
  { id: '8', name: 'Contentsquare', logo: 'CS', sector: 'SaaS', size: '1 000–5 000 emp.', location: 'Paris / Remote', openJobs: 11, description: 'Plateforme d\'analytics et d\'expérience digitale, valorisée plus de 3 milliards de dollars.' },
  { id: '9', name: 'Criteo', logo: 'CR', sector: 'AdTech', size: '2 000+ emp.', location: 'Paris', openJobs: 7, description: 'Leader mondial du commerce marketing, Criteo aide les marques à générer des revenus via le digital.' },
  { id: '10', name: 'Deezer', logo: 'DZ', sector: 'MusicTech', size: '500–1 000 emp.', location: 'Paris', openJobs: 3, description: 'Plateforme de streaming musical française avec 16 millions d\'abonnés actifs dans 180 pays.' },
  { id: '11', name: 'OVHcloud', logo: 'OV', sector: 'Cloud', size: '2 000+ emp.', location: 'Roubaix', openJobs: 18, description: 'Acteur européen de référence du cloud et de l\'hébergement, présent dans 19 data centers.' },
  { id: '12', name: 'Lydia', logo: 'LY', sector: 'FinTech', size: '200–500 emp.', location: 'Paris', openJobs: 4, description: 'L\'application de paiement mobile la plus utilisée en France, avec 8 millions d\'utilisateurs.' },
];

const SECTORS = ['Tous', 'FinTech', 'HealthTech', 'SaaS', 'Cloud', 'Mobilité', 'AdTech', 'Crypto / Web3'];

interface EntreprisesPageProps { onBack: () => void; }

const EntreprisesPage: React.FC<EntreprisesPageProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('Tous');

  const filtered = COMPANIES.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q);
    const matchS = sector === 'Tous' || c.sector === sector;
    return matchQ && matchS;
  });

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="inner-page-hero">
        <button className="inner-back-btn" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Accueil
        </button>
        <h1 className="inner-page-title">Entreprises</h1>
        <p className="inner-page-sub">{COMPANIES.length} entreprises · {COMPANIES.reduce((s, c) => s + c.openJobs, 0)} postes ouverts</p>
      </div>

      <div className="offres-search-bar" style={{ maxWidth: 480 }}>
        <div className="offres-search-field" style={{ flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="offres-search-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, secteur…"
            className="offres-search-input"
            aria-label="Rechercher une entreprise par nom ou secteur"
          />
        </div>
      </div>

      <div className="offres-filters" role="group" aria-label="Filtrer par secteur">
        {SECTORS.map(s => (
          <button
            key={s}
            type="button"
            className={`offres-filter-chip ${sector === s ? 'offres-filter-chip--active' : ''}`}
            onClick={() => setSector(s)}
            aria-pressed={sector === s}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="offres-results-count" aria-live="polite">{filtered.length} entreprise{filtered.length > 1 ? 's' : ''}</div>

      <div className="entreprises-grid">
        {filtered.map(c => (
          <div key={c.id} className="entreprise-card">
            <div className="entreprise-card-header">
              <span className="entreprise-logo">{c.logo}</span>
              <div>
                <p className="entreprise-name">{c.name}</p>
                <p className="entreprise-sector">{c.sector} · {c.location}</p>
              </div>
            </div>
            <p className="entreprise-desc">{c.description}</p>
            <div className="entreprise-footer">
              <span className="entreprise-size">{c.size}</span>
              <span className="entreprise-jobs">{c.openJobs} poste{c.openJobs > 1 ? 's' : ''} ouvert{c.openJobs > 1 ? 's' : ''}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="offres-empty">
            <p>Aucune entreprise trouvée.</p>
            <button className="btn-ghost" onClick={() => { setSearch(''); setSector('Tous'); }}>Réinitialiser</button>
          </div>
        )}
      </div>
    </main>
  );
};

export default EntreprisesPage;
