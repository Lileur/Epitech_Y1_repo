import React from 'react';

type NavPage = 'home' | 'offres' | 'entreprises' | 'salaires' | 'tendances';

interface NavigationProps {
  onLogoClick?: () => void;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onProfileClick?: () => void;
  onNavClick?: (page: NavPage) => void;
  activePage?: NavPage;
  userFirstName?: string;
}

const Navigation: React.FC<NavigationProps> = ({
  onLogoClick,
  onLoginClick,
  onSignupClick,
  onProfileClick,
  onNavClick,
  activePage = 'home',
  userFirstName,
}) => {
  const links: { key: NavPage; label: string }[] = [
    { key: 'offres', label: 'Offres' },
    { key: 'entreprises', label: 'Entreprises' },
    { key: 'salaires', label: 'Salaires' },
    { key: 'tendances', label: 'Tendances' },
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">
        Aller au contenu principal
      </a>
      <nav className="top-nav" aria-label="Navigation principale">
        <div className="nav-left">
          <button className="logo-btn" type="button" onClick={onLogoClick} aria-label="Retour à l'accueil JobSense">
            Job<span>Sense</span>
          </button>
          <div className="nav-links">
            {links.map(l => (
              <button
                key={l.key}
                type="button"
                className={`nav-link-btn ${activePage === l.key ? 'nav-link-btn--active' : ''}`}
                onClick={() => onNavClick?.(l.key)}
                aria-current={activePage === l.key ? 'page' : undefined}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="nav-right">
          {userFirstName && onProfileClick ? (
            <button className="nav-profile-btn" type="button" onClick={onProfileClick} aria-label={`Ouvrir le profil de ${userFirstName}`}>
              <span className="nav-profile-avatar" aria-hidden="true">
                {userFirstName[0].toUpperCase()}
              </span>
              <span className="nav-profile-name">{userFirstName}</span>
            </button>
          ) : (
            <>
              <button className="btn-ghost" type="button" onClick={onLoginClick}>Connexion</button>
              <button className="btn-primary" type="button" onClick={onSignupClick}>Créer un compte</button>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
