import React, { useState } from 'react';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'recruiter';
  company?: string;
}

interface EmployerDashboardProps {
  user: User;
  onLogout: () => void;
}

interface JobOffer {
  id: string;
  title: string;
  type: 'CDI' | 'CDD' | 'Stage' | 'Alternance' | 'Freelance';
  location: string;
  salary: string;
  description: string;
  status: 'active' | 'draft' | 'closed';
  applicants: number;
  postedAt: string;
}

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const BriefcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SAMPLE_JOBS: JobOffer[] = [
  { id: '1', title: 'Développeur React Senior', type: 'CDI', location: 'Paris / Remote', salary: '60–80k€', description: 'Rejoignez notre équipe frontend...', status: 'active', applicants: 14, postedAt: '2026-04-25' },
  { id: '2', title: 'Stage UX Designer', type: 'Stage', location: 'Lyon', salary: '800€/mois', description: 'Stage de 6 mois dans notre studio design...', status: 'active', applicants: 7, postedAt: '2026-04-28' },
  { id: '3', title: 'Product Manager', type: 'CDI', location: 'Remote', salary: '55–70k€', description: 'Pilotez notre roadmap produit...', status: 'draft', applicants: 0, postedAt: '' },
];

const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState<JobOffer[]>(SAMPLE_JOBS);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'offers' | 'applicants'>('offers');
  const [newJob, setNewJob] = useState({
    title: '', type: 'CDI' as JobOffer['type'],
    location: '', salary: '', description: '',
  });
  const [formError, setFormError] = useState('');

  const activeOffers = jobs.filter(j => j.status === 'active').length;
  const totalApplicants = jobs.reduce((acc, j) => acc + j.applicants, 0);

  const handlePostJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.location) {
      setFormError('Le titre et la localisation sont obligatoires.');
      return;
    }
    const offer: JobOffer = {
      id: Date.now().toString(),
      ...newJob,
      status: 'active',
      applicants: 0,
      postedAt: new Date().toISOString().split('T')[0],
    };
    setJobs([offer, ...jobs]);
    setShowModal(false);
    setNewJob({ title: '', type: 'CDI', location: '', salary: '', description: '' });
    setFormError('');
  };

  const handleDelete = (id: string) => setJobs(jobs.filter(j => j.id !== id));

  const statusLabel: Record<JobOffer['status'], string> = {
    active: 'Active', draft: 'Brouillon', closed: 'Clôturée',
  };

  return (
    <div className="emp-layout">
      <a className="skip-link" href="#main-content">
        Aller au contenu principal
      </a>
      {/* ─── Sidebar ─── */}
      <aside className="emp-sidebar">
        <div className="emp-sidebar-logo">
          <span className="logo">Job<span>Sense</span></span>
        </div>
        <nav className="emp-nav" aria-label="Navigation recruteur">
          <button
            type="button"
            className={`emp-nav-item ${activeTab === 'offers' ? 'emp-nav-item--active' : ''}`}
            onClick={() => setActiveTab('offers')}
            aria-current={activeTab === 'offers' ? 'page' : undefined}
          >
            <BriefcaseIcon /> Mes offres
          </button>
          <button
            type="button"
            className={`emp-nav-item ${activeTab === 'applicants' ? 'emp-nav-item--active' : ''}`}
            onClick={() => setActiveTab('applicants')}
            aria-current={activeTab === 'applicants' ? 'page' : undefined}
          >
            <UsersIcon /> Candidatures
          </button>
        </nav>
        <div className="emp-sidebar-footer">
          <div className="emp-user-info">
            <div className="emp-user-avatar">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="emp-user-text">
              <div className="emp-user-name">{user.firstName} {user.lastName}</div>
              <div className="emp-user-company">{user.company || 'Mon entreprise'}</div>
            </div>
          </div>
          <button className="emp-logout" type="button" onClick={onLogout}>Déconnexion</button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main id="main-content" className="emp-main" tabIndex={-1}>
        {/* Header */}
        <header className="emp-header">
          <div>
            <h1 className="emp-header-title">
              {activeTab === 'offers' ? 'Vos offres d\'emploi' : 'Candidatures reçues'}
            </h1>
            <p className="emp-header-sub">
              {activeTab === 'offers'
                ? `${activeOffers} offre${activeOffers > 1 ? 's' : ''} active${activeOffers > 1 ? 's' : ''} · ${totalApplicants} candidature${totalApplicants > 1 ? 's' : ''} reçue${totalApplicants > 1 ? 's' : ''}`
                : `${totalApplicants} candidature${totalApplicants > 1 ? 's' : ''} au total`}
            </p>
          </div>
          {activeTab === 'offers' && (
            <button className="emp-btn-post" type="button" onClick={() => setShowModal(true)}>
              <PlusIcon /> Publier une offre
            </button>
          )}
        </header>

        {/* Stats */}
        {activeTab === 'offers' && (
          <div className="emp-stats">
            <div className="emp-stat-card">
              <div className="emp-stat-num">{activeOffers}</div>
              <div className="emp-stat-label">Offres actives</div>
            </div>
            <div className="emp-stat-card">
              <div className="emp-stat-num">{jobs.filter(j => j.status === 'draft').length}</div>
              <div className="emp-stat-label">Brouillons</div>
            </div>
            <div className="emp-stat-card">
              <div className="emp-stat-num">{totalApplicants}</div>
              <div className="emp-stat-label">Candidatures</div>
            </div>
            <div className="emp-stat-card">
              <div className="emp-stat-num">{activeOffers > 0 ? Math.round(totalApplicants / activeOffers) : 0}</div>
              <div className="emp-stat-label">Moy. par offre</div>
            </div>
          </div>
        )}

        {/* Offers list */}
        {activeTab === 'offers' && (
          <div className="emp-offers">
            {jobs.length === 0 ? (
              <div className="emp-empty">
                <BriefcaseIcon />
                <p>Aucune offre publiée pour l'instant.</p>
                <button className="emp-btn-post" type="button" onClick={() => setShowModal(true)}>
                  <PlusIcon /> Publier ma première offre
                </button>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className={`emp-offer-card ${job.status === 'draft' ? 'emp-offer-card--draft' : ''}`}>
                  <div className="emp-offer-top">
                    <div className="emp-offer-info">
                      <div className="emp-offer-title">{job.title}</div>
                      <div className="emp-offer-meta">
                        <span className="emp-offer-tag">{job.type}</span>
                        <span className="emp-offer-dot" />
                        <span>{job.location}</span>
                        {job.salary && <><span className="emp-offer-dot" /><span>{job.salary}</span></>}
                      </div>
                    </div>
                    <div className="emp-offer-right">
                      <span className={`emp-status emp-status--${job.status}`}>
                        {statusLabel[job.status]}
                      </span>
                      <div className="emp-offer-actions">
                        <button className="emp-icon-btn" type="button" aria-label={`Voir l'offre ${job.title}`} title="Aperçu"><EyeIcon /></button>
                        <button className="emp-icon-btn" type="button" aria-label={`Modifier l'offre ${job.title}`} title="Modifier"><EditIcon /></button>
                        <button className="emp-icon-btn emp-icon-btn--danger" type="button" aria-label={`Supprimer l'offre ${job.title}`} title="Supprimer" onClick={() => handleDelete(job.id)}><TrashIcon /></button>
                      </div>
                    </div>
                  </div>
                  {job.status !== 'draft' && (
                    <div className="emp-offer-bottom">
                      <div className="emp-applicants-bar">
                        <UsersIcon />
                        <span>{job.applicants} candidature{job.applicants > 1 ? 's' : ''}</span>
                      </div>
                      {job.postedAt && <span className="emp-offer-date">Publiée le {new Date(job.postedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Applicants tab */}
        {activeTab === 'applicants' && (
          <div className="emp-applicants-empty">
            <UsersIcon />
            <p>Les candidatures apparaîtront ici dès que des candidats postuleront à vos offres.</p>
          </div>
        )}
      </main>

      {/* ─── Modal: Publier une offre ─── */}
      {showModal && (
        <div className="emp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="emp-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-job-title">
            <div className="emp-modal-header">
              <h2 id="new-job-title" className="emp-modal-title">Nouvelle offre d'emploi</h2>
              <button className="emp-modal-close" type="button" onClick={() => setShowModal(false)} aria-label="Fermer la fenêtre"><CloseIcon /></button>
            </div>
            <form onSubmit={handlePostJob} className="emp-modal-form" aria-describedby={formError ? 'job-form-error' : undefined}>
              <div className="form-group">
                <label className="form-label" htmlFor="job-title">Intitulé du poste *</label>
                <input
                  id="job-title"
                  className="form-input"
                  type="text"
                  placeholder="ex : Développeur React Senior"
                  value={newJob.title}
                  onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="job-type">Type de contrat</label>
                  <select
                    id="job-type"
                    className="form-input"
                    value={newJob.type}
                    onChange={e => setNewJob({ ...newJob, type: e.target.value as JobOffer['type'] })}
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Stage">Stage</option>
                    <option value="Alternance">Alternance</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="job-location">Localisation *</label>
                  <input
                    id="job-location"
                    className="form-input"
                    type="text"
                    placeholder="Paris, Remote..."
                    value={newJob.location}
                    onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="job-salary">Rémunération</label>
                <input
                  id="job-salary"
                  className="form-input"
                  type="text"
                  placeholder="ex : 45–60k€ ou 900€/mois"
                  value={newJob.salary}
                  onChange={e => setNewJob({ ...newJob, salary: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="job-desc">Description du poste</label>
                <textarea
                  id="job-desc"
                  className="form-input emp-textarea"
                  placeholder="Décrivez le poste, les missions, le profil recherché..."
                  value={newJob.description}
                  onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                  rows={5}
                />
              </div>
              {formError && <div id="job-form-error" className="form-error" role="alert">{formError}</div>}
              <div className="emp-modal-actions">
                <button type="button" className="emp-btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="emp-btn-post">Publier l'offre</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;
