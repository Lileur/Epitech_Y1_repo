import React, { useState, useEffect } from 'react';
import { jobsAPI, jobsResponseToArray } from '../services/api';
import { normalizeJobsList } from '../utils/jobModel';

interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  tags: { label: string; type: 'remote' | 'type' | 'salary' }[];
  salary?: string;
  location: string;
  postedDays: number;
  featured?: boolean;
}

interface OffresPageProps {
  onBack: () => void;
  onOpenJob?: (jobId: string) => void;
}

const OffresPage: React.FC<OffresPageProps> = ({ onBack, onOpenJob }) => {
  const [search, setSearch] = useState('');
  const [contract, setContract] = useState('Tous');
  const [location, setLocation] = useState('');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const CONTRACT_FILTERS = ['Tous', 'CDI', 'Stage', 'Alternance', 'Remote'];

  useEffect(() => {
    // Load jobs from API
    const loadJobs = async () => {
      try {
        setLoading(true);
        const response = await jobsAPI.getJobs({ limit: 100 });
        const apiJobs = jobsResponseToArray(response);

        if (apiJobs.length > 0) {
          setAllJobs(normalizeJobsList(apiJobs));
          return;
        }

        await jobsAPI.syncJobs();
        const retry = await jobsAPI.getJobs({ limit: 100 });
        const retryJobs = jobsResponseToArray(retry);

        setAllJobs(normalizeJobsList(retryJobs));
      } catch (error) {
        console.error('Failed to load jobs:', error);
        setAllJobs([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadJobs();
  }, []);

  const filtered = allJobs.filter(j => {
    const q = search.toLowerCase();
    const matchQuery = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q);
    const matchContract = contract === 'Tous' || j.tags.some(t => t.label === contract) || (contract === 'Remote' && j.tags.some(t => t.label === 'Remote'));
    const matchLoc = !location || j.location.toLowerCase().includes(location.toLowerCase());
    return matchQuery && matchContract && matchLoc;
  });

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      {/* Header */}
      <div className="inner-page-hero">
        <button className="inner-back-btn" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Accueil
        </button>
        <h1 className="inner-page-title">Offres d'emploi</h1>
        <p className="inner-page-sub">{allJobs.length} offres disponibles · Mis à jour en temps réel</p>
      </div>

      {/* Search bar */}
      <div className="offres-search-bar">
        <div className="offres-search-field">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="offres-search-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Poste, entreprise, technologie…"
            className="offres-search-input"
            aria-label="Rechercher une offre par poste, entreprise ou technologie"
          />
        </div>
        <div className="offres-search-field">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="offres-search-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Ville ou Remote…"
            className="offres-search-input"
            aria-label="Filtrer les offres par ville ou télétravail"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="offres-filters" role="group" aria-label="Filtrer par type de contrat">
        {CONTRACT_FILTERS.map(f => (
          <button
            key={f}
            type="button"
            className={`offres-filter-chip ${contract === f ? 'offres-filter-chip--active' : ''}`}
            onClick={() => setContract(f)}
            aria-pressed={contract === f}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="offres-results-count" aria-live="polite">
        {loading ? 'Chargement...' : `${filtered.length} offre${filtered.length > 1 ? 's' : ''}`}
      </div>

      <div className="offres-grid">
        {loading ? (
          <div className="offres-skeleton-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="offres-skeleton-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="offres-empty">
            <p>Aucune offre ne correspond à votre recherche.</p>
            <button className="btn-ghost" onClick={() => { setSearch(''); setContract('Tous'); setLocation(''); }}>Réinitialiser</button>
          </div>
        ) : (
          filtered.map(job => (
            <article
              key={job.id}
              className="offres-card"
              onClick={() => onOpenJob?.(job.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenJob?.(job.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Ouvrir l'offre ${job.title} chez ${job.company}`}
            >
              <div className="offres-card-top">
                <span className="offres-card-logo">{job.logo}</span>
                <div className="offres-card-info">
                  <p className="offres-card-title">{job.title}</p>
                  <p className="offres-card-company">{job.company} · {job.location}</p>
                </div>
              </div>
              <div className="offres-card-tags">
                {job.tags.map(t => (
                  <span key={t.label} className={`job-tag job-tag--${t.type}`}>{t.label}</span>
                ))}
              </div>
              <div className="offres-card-footer">
                <span className="offres-card-salary">{job.salary || '—'}</span>
                <span className="offres-card-days">{job.postedDays === 0 ? "Aujourd'hui" : `Il y a ${job.postedDays}j`}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
};

export default OffresPage;
