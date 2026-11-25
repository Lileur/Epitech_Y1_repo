import React from 'react';

interface HeroProps {
  query: string;
  location: string;
  onQueryChange: (q: string) => void;
  onLocationChange: (l: string) => void;
  onSearch: () => void;
  onTagClick?: (tag: string) => void;
  stats?: {
    indexedJobs: number;
    companies: number;
    lastSyncLabel: string;
    normalizedRate: number;
  };
}

const Hero: React.FC<HeroProps> = ({
  query,
  location,
  onQueryChange,
  onLocationChange,
  onSearch,
  onTagClick,
  stats,
}) => {
  const popularTags = ['React', 'Python', 'Stage', 'Remote', 'DevOps', 'Data', 'Alternance'];

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">
          Des offres tech <em>qui ont du sens</em>,<br />filtrées pour toi
        </h1>
        <p className="hero-sub">
          JobSense agrège les offres d'emploi et de stage tech, normalise les données
          et t'aide à prendre la bonne décision.
        </p>

        <div className="search-bar" role="search" aria-label="Recherche d'offres">
          <div className="search-field">
            <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              aria-label="Rechercher par titre, compétence ou entreprise"
              placeholder="Titre, compétence, entreprise"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
          <div className="search-field" style={{ maxWidth: '190px' }}>
            <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <input
              type="text"
              aria-label="Filtrer par ville ou télétravail"
              placeholder="Ville ou remote"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
          <button type="button" className="search-btn" onClick={onSearch}>
            Rechercher
          </button>
        </div>

        <div className="popular-tags" aria-label="Recherches tendances">
          <span className="popular-label">Tendances :</span>
          {popularTags.map((tag) => (
            <button key={tag} type="button" className="tag" onClick={() => onTagClick?.(tag)}>
              {tag}
            </button>
          ))}
        </div>
      </section>

      <div className="stats-bar" aria-label="Statistiques JobSense">
        <div className="stat">
          <div className="stat-n">{stats?.indexedJobs ?? 0}</div>
          <div className="stat-l">Offres indexées</div>
        </div>
        <div className="stat">
          <div className="stat-n">{stats?.companies ?? 0}</div>
          <div className="stat-l">Entreprises tech</div>
        </div>
        <div className="stat">
          <div className="stat-n">{stats?.lastSyncLabel ?? '-'}</div>
          <div className="stat-l">Dernière synchro</div>
        </div>
        <div className="stat">
          <div className="stat-n">{stats?.normalizedRate ?? 0}%</div>
          <div className="stat-l">Données normalisées</div>
        </div>
      </div>
    </>
  );
};

export default Hero;
