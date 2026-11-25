import React, { useState } from 'react';

export interface RecruiterRow {
  name: string;
  logo: string;
  jobs: number;
}

interface SidebarProps {
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  searchType?: string;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onProfileClick?: () => void;
  onAlertCreate?: (email: string) => void;
  topRecruiters?: RecruiterRow[];
  savedCount?: number;
  applicationsCount?: number;
}

const ProfileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({
  userEmail,
  userFirstName,
  userLastName,
  searchType,
  onLoginClick,
  onSignupClick,
  onProfileClick,
  onAlertCreate,
  topRecruiters = [],
  savedCount = 0,
  applicationsCount = 0,
}) => {
  const [alertEmail, setAlertEmail] = useState('');

  const handleCreateAlert = () => {
    if (alertEmail.trim()) {
      onAlertCreate?.(alertEmail);
      setAlertEmail('');
    }
  };

  const initials = userFirstName && userLastName
    ? `${userFirstName[0]}${userLastName[0]}`.toUpperCase()
    : userEmail
      ? userEmail.charAt(0).toUpperCase()
      : 'J';

  const searchLabel: Record<string, string> = {
    internship: 'Recherche de stage',
    job: "Recherche d'emploi",
    both: 'Stage & Emploi',
  };

  return (
    <aside className="sidebar-right" aria-label="Profil et informations complémentaires">
      <div className="card profile-card">
        <div className="profile-initials" aria-hidden="true">{initials}</div>

        {userEmail ? (
          <>
            <div className="profile-name">
              {userFirstName ? `${userFirstName} ${userLastName ?? ''}`.trim() : 'Mon profil'}
            </div>
            <div className="profile-role">
              {searchType ? searchLabel[searchType] ?? searchType : userEmail}
            </div>
            <button
              type="button"
              className="sidebar-profile-btn"
              onClick={onProfileClick}
            >
              <ProfileIcon />
              Voir mon profil
            </button>
          </>
        ) : (
          <>
            <div className="profile-name">Connecte-toi</div>
            <div className="profile-role">Accède à ton tableau de bord</div>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', padding: '0.6rem' }}
              onClick={onLoginClick}
            >
              Se connecter
            </button>
            <div style={{ marginTop: '0.65rem', fontSize: '0.76rem', color: 'var(--muted)', textAlign: 'center' }}>
              Pas encore de compte ?{' '}
              <a
                href="#"
                style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                onClick={(e) => { e.preventDefault(); onSignupClick?.(); }}
              >
                S'inscrire
              </a>
            </div>
          </>
        )}

        <div className="profile-stat">
          <div className="ps-item">
            <div className="ps-num">{savedCount}</div>
            <div className="ps-label">Sauvegardées</div>
          </div>
          <div className="ps-item">
            <div className="ps-num">{applicationsCount}</div>
            <div className="ps-label">Candidatures</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Alerte email</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.85rem', lineHeight: 1.65 }}>
          Reçois les nouvelles offres correspondant à ta recherche.
        </p>
        <input
          id="job-alert-email"
          className="alert-input"
          type="email"
          aria-label="Adresse email pour recevoir l'alerte d'offres"
          placeholder="ton@email.com"
          value={alertEmail}
          onChange={(e) => setAlertEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateAlert()}
        />
        <button type="button" className="alert-btn" onClick={handleCreateAlert}>
          Créer mon alerte
        </button>
        <div className="alert-note">Pas de spam. Désabonnement en un clic.</div>
      </div>

      <div className="card">
        <div className="card-title">Qui recrute</div>
        <div className="company-list">
          {topRecruiters.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>Aucune donnée pour le moment.</p>
          ) : (
            topRecruiters.map((c) => (
              <div key={c.name} className="company-row">
                <div className="co-logo" aria-hidden="true">{c.logo}</div>
                <div className="co-info">
                  <div className="co-name">{c.name}</div>
                  <div className="co-jobs">{c.jobs} offre{c.jobs > 1 ? 's' : ''}</div>
                </div>
                <span className="co-arrow">›</span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
