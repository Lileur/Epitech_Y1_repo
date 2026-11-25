import React from 'react';

const TRENDS = [
  {
    rank: 1,
    title: 'L\'IA générative s\'intègre dans tous les postes',
    tag: 'IA & LLM',
    tagClass: 'trend-tag--ai',
    body: 'Les développeurs qui maîtrisent les outils d\'IA (Copilot, Cursor, Claude API) sont 30% plus productifs et 20% mieux rémunérés selon nos données. La connaissance des LLMs devient un critère discriminant dans les recrutements tech.',
    stat: '+42%',
    statLabel: 'd\'offres mentionnant l\'IA vs 2024',
  },
  {
    rank: 2,
    title: 'Le Full Remote se stabilise, l\'Hybride domine',
    tag: 'Télétravail',
    tagClass: 'trend-tag--remote',
    body: 'Après les extrêmes post-Covid, le marché s\'est stabilisé : 58% des offres tech sont hybrides (2–3 jours bureau), 28% full remote, 14% présentiel. Les entreprises qui exigent 5 jours/semaine voient leurs candidatures chuter de 60%.',
    stat: '58%',
    statLabel: 'des offres tech en mode hybride',
  },
  {
    rank: 3,
    title: 'La guerre des talents DevOps/SRE continue',
    tag: 'DevOps',
    tagClass: 'trend-tag--devops',
    body: 'Les profils DevOps et SRE restent parmi les plus demandés avec une pénurie structurelle. Kubernetes, Terraform et les architectures cloud-native sont devenus incontournables. Les salaires progressent de 8% par an.',
    stat: '3,2x',
    statLabel: 'plus d\'offres que de candidats DevOps',
  },
  {
    rank: 4,
    title: 'Les soft skills prennent autant de place que le code',
    tag: 'Recrutement',
    tagClass: 'trend-tag--hr',
    body: 'Communication, autonomie, curiosité : les entretiens techniques se complètent maintenant de mises en situation comportementales. 78% des recruteurs tech disent avoir rejeté un excellent développeur pour un manque de soft skills.',
    stat: '78%',
    statLabel: 'des refus liés aux soft skills',
  },
  {
    rank: 5,
    title: 'Le marché des stages tech est en pleine expansion',
    tag: 'Stages',
    tagClass: 'trend-tag--intern',
    body: 'Les grandes tech françaises intensifient leurs programmes de stage : Doctolib, Qonto, Alan recrutent chacune 50+ stagiaires par semestre. La gratification médiane atteint 1 200€/mois, avec une conversion en CDI de 45%.',
    stat: '+28%',
    statLabel: 'de stages tech offerts en 2025',
  },
  {
    rank: 6,
    title: 'La cybersécurité devient un pilier incontournable',
    tag: 'Cybersécurité',
    tagClass: 'trend-tag--cyber',
    body: 'Suite à plusieurs incidents majeurs, les entreprises françaises multiplient leurs recrutements en sécurité. Les profils pentest, SOC et Cloud Security sont particulièrement recherchés, avec des salaires 15% au-dessus du marché moyen.',
    stat: '+35%',
    statLabel: 'd\'offres cyber en 12 mois',
  },
];

const HOTSKILLS = [
  { skill: 'TypeScript', growth: '+38%', level: 92 },
  { skill: 'Rust', growth: '+65%', level: 45 },
  { skill: 'Kubernetes', growth: '+29%', level: 78 },
  { skill: 'Python', growth: '+22%', level: 97 },
  { skill: 'React', growth: '+18%', level: 95 },
  { skill: 'Terraform', growth: '+42%', level: 60 },
  { skill: 'Go (Golang)', growth: '+31%', level: 52 },
  { skill: 'LangChain / LLM', growth: '+180%', level: 38 },
];

interface TendancesPageProps { onBack: () => void; }

const TendancesPage: React.FC<TendancesPageProps> = ({ onBack }) => {
  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="inner-page-hero">
        <button className="inner-back-btn" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Accueil
        </button>
        <h1 className="inner-page-title">Tendances du marché</h1>
        <p className="inner-page-sub">Analyse du marché tech français · Mai 2025</p>
      </div>

      <div className="tendances-layout">
        <div className="tendances-main">
          <h2 className="tendances-section-title">Ce qui change le marché</h2>
          <div className="tendances-list">
            {TRENDS.map(t => (
              <article key={t.rank} className="tendance-card">
                <div className="tendance-card-head">
                  <span className="tendance-rank">0{t.rank}</span>
                  <span className={`tendance-tag ${t.tagClass}`}>{t.tag}</span>
                </div>
                <h3 className="tendance-title">{t.title}</h3>
                <p className="tendance-body">{t.body}</p>
                <div className="tendance-stat">
                  <span className="tendance-stat-num">{t.stat}</span>
                  <span className="tendance-stat-label">{t.statLabel}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="tendances-aside">
          <div className="tendances-widget">
            <h3 className="tendances-widget-title">Compétences en hausse</h3>
            <div className="hotskills-list">
              {HOTSKILLS.map(s => (
                <div key={s.skill} className="hotskill-item">
                  <div className="hotskill-header">
                    <span className="hotskill-name">{s.skill}</span>
                    <span className="hotskill-growth">{s.growth}</span>
                  </div>
                  <div className="hotskill-bar-bg">
                    <div className="hotskill-bar-fill" style={{ width: `${s.level}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tendances-widget">
            <h3 className="tendances-widget-title">Secteurs qui recrutent</h3>
            <div className="sector-recruit-list">
              {[
                { name: 'FinTech', jobs: 320 },
                { name: 'HealthTech', jobs: 210 },
                { name: 'SaaS B2B', jobs: 540 },
                { name: 'Cybersécurité', jobs: 185 },
                { name: 'GreenTech', jobs: 98 },
                { name: 'Web3 / Crypto', jobs: 73 },
              ].map(s => (
                <div key={s.name} className="sector-recruit-item">
                  <span className="sector-recruit-name">{s.name}</span>
                  <span className="sector-recruit-jobs">{s.jobs} offres</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tendances-widget tendances-widget--accent">
            <p className="tendances-insight-label">Chiffre du mois</p>
            <p className="tendances-insight-num">1 poste</p>
            <p className="tendances-insight-sub">pour 0,3 candidat en DevOps senior</p>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default TendancesPage;
