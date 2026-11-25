import React, { useState } from 'react';

const SALAIRES = [
  { role: 'Développeur Frontend', junior: '35–45k€', mid: '48–65k€', senior: '68–90k€', remote: true, demand: 'Forte' },
  { role: 'Développeur Backend', junior: '38–48k€', mid: '50–68k€', senior: '70–95k€', remote: true, demand: 'Très forte' },
  { role: 'Fullstack Developer', junior: '40–52k€', mid: '55–72k€', senior: '75–100k€', remote: true, demand: 'Très forte' },
  { role: 'Data Engineer', junior: '42–55k€', mid: '58–75k€', senior: '80–110k€', remote: true, demand: 'Forte' },
  { role: 'Data Scientist', junior: '40–52k€', mid: '55–72k€', senior: '75–100k€', remote: true, demand: 'Forte' },
  { role: 'DevOps / SRE', junior: '42–55k€', mid: '58–75k€', senior: '80–110k€', remote: true, demand: 'Très forte' },
  { role: 'Product Manager', junior: '42–55k€', mid: '58–75k€', senior: '80–110k€', remote: false, demand: 'Forte' },
  { role: 'Product Designer', junior: '35–45k€', mid: '48–62k€', senior: '65–85k€', remote: false, demand: 'Modérée' },
  { role: 'UX Researcher', junior: '32–42k€', mid: '44–58k€', senior: '60–78k€', remote: false, demand: 'Modérée' },
  { role: 'Cybersécurité', junior: '40–52k€', mid: '55–72k€', senior: '75–105k€', remote: true, demand: 'Forte' },
  { role: 'Machine Learning Eng.', junior: '45–58k€', mid: '62–82k€', senior: '85–120k€', remote: true, demand: 'Très forte' },
  { role: 'iOS / Android Dev.', junior: '38–50k€', mid: '52–68k€', senior: '70–95k€', remote: true, demand: 'Forte' },
  { role: 'CTO / VP Engineering', junior: '—', mid: '90–120k€', senior: '130–200k€+', remote: false, demand: 'Modérée' },
  { role: 'Scrum Master / Coach', junior: '38–48k€', mid: '50–65k€', senior: '68–85k€', remote: false, demand: 'Modérée' },
  { role: 'QA Engineer', junior: '32–42k€', mid: '44–58k€', senior: '60–78k€', remote: true, demand: 'Modérée' },
];

const DEMAND_COLOR: Record<string, string> = {
  'Très forte': 'sal-demand--high',
  'Forte': 'sal-demand--med',
  'Modérée': 'sal-demand--low',
};

const STATS = [
  { label: 'Salaire médian Dev.', value: '58k€', sub: 'en France en 2025' },
  { label: 'Hausse annuelle', value: '+6%', sub: 'vs 2024' },
  { label: 'Premium Remote', value: '+12%', sub: 'vs présentiel' },
  { label: 'Bonus moyen', value: '4–8k€', sub: 'en startup tech' },
];

interface SalairesPageProps { onBack: () => void; }

const SalairesPage: React.FC<SalairesPageProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');

  const filtered = SALAIRES.filter(s => !search || s.role.toLowerCase().includes(search.toLowerCase()));

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="inner-page-hero">
        <button className="inner-back-btn" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Accueil
        </button>
        <h1 className="inner-page-title">Grille des salaires</h1>
        <p className="inner-page-sub">Salaires bruts annuels · France · Secteur Tech 2025</p>
      </div>

      {/* Key stats */}
      <div className="sal-stats-row">
        {STATS.map(s => (
          <div key={s.label} className="sal-stat-card">
            <p className="sal-stat-value">{s.value}</p>
            <p className="sal-stat-label">{s.label}</p>
            <p className="sal-stat-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="offres-search-bar" style={{ maxWidth: 400 }}>
        <div className="offres-search-field" style={{ flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="offres-search-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Chercher un métier…"
            className="offres-search-input"
            aria-label="Rechercher un métier"
          />
        </div>
      </div>

      {/* Table */}
      <div className="sal-table-wrap">
        <table className="sal-table">
          <thead>
            <tr>
              <th>Métier</th>
              <th>Junior<span className="sal-th-sub">0–3 ans</span></th>
              <th>Confirmé<span className="sal-th-sub">3–7 ans</span></th>
              <th>Senior<span className="sal-th-sub">7+ ans</span></th>
              <th>Remote</th>
              <th>Demande</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.role}>
                <td className="sal-role">{s.role}</td>
                <td className="sal-range sal-range--junior">{s.junior}</td>
                <td className="sal-range sal-range--mid">{s.mid}</td>
                <td className="sal-range sal-range--senior">{s.senior}</td>
                <td>{s.remote ? <span className="sal-remote-yes">Oui</span> : <span className="sal-remote-no">Non</span>}</td>
                <td><span className={`sal-demand ${DEMAND_COLOR[s.demand]}`}>{s.demand}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="offres-empty"><p>Aucun métier trouvé.</p></div>
        )}
      </div>

      <p className="sal-disclaimer">
        Données indicatives basées sur des offres agrégées et des études de marché. Les salaires peuvent varier selon l'entreprise, la région et le profil.
      </p>
    </main>
  );
};

export default SalairesPage;
