import React from 'react';

interface FooterProps {
  onCreateAccountClick?: () => void;
  isLoggedIn?: boolean;
}

const Footer: React.FC<FooterProps> = ({ onCreateAccountClick, isLoggedIn = false }) => {
  const links = [
    'Offres', 'Stages', 'Alternances',
    'Salaires', 'Tendances', 'Confidentialité', 'Contact'
  ];

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              Job<span>Sense</span>
            </div>
            <p className="footer-tagline">
              Agrégateur d'offres tech français. Données normalisées,
              mises à jour en temps réel depuis WeLoveDevs.
            </p>
          </div>
          {!isLoggedIn && (
            <div className="footer-cta">
              <p>
                Sauvegarde tes offres, suis tes candidatures
                et reçois des alertes personnalisées.
              </p>
              <button className="btn-footer" onClick={onCreateAccountClick}>
                Créer un compte
              </button>
            </div>
          )}
        </div>
        <div className="footer-bottom">
          <div className="footer-links">
            {links.map(l => <a key={l} href="#">{l}</a>)}
          </div>
          <div className="footer-copy">
            © 2026 JobSense — Projet Epitech
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
