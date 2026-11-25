import React, { useState } from 'react';
import { getRecaptchaToken } from '../utils/recaptcha';

interface RegisterProps {
  onBack?: () => void;
  onLoginClick?: () => void;
  onRegisterSuccess?: (payload: {
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      role: 'candidate' | 'recruiter';
      searchType?: string;
      company?: string;
    };
    token?: string;
  }) => void;
}

type ProfileType = 'candidate' | 'recruiter' | null;
type SearchType = 'internship' | 'job' | 'both' | null;
type Step = 'profile' | 'search_type' | 'form';

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CandidateIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const RecruiterIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);

const InternshipIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const JobIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);

const BothIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const Register: React.FC<RegisterProps> = ({ onBack, onLoginClick, onRegisterSuccess }) => {
  const [step, setStep] = useState<Step>('profile');
  const [profileType, setProfileType] = useState<ProfileType>(null);
  const [searchType, setSearchType] = useState<SearchType>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    company: '',
    jobTitle: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleProfileSelect = (type: ProfileType) => {
    setProfileType(type);
    if (type === 'recruiter') {
      setStep('form');
    } else {
      setStep('search_type');
    }
  };

  const handleSearchTypeSelect = (type: SearchType) => {
    setSearchType(type);
    setStep('form');
  };

  const handleBack = () => {
    if (step === 'form' && profileType === 'recruiter') {
      setStep('profile');
    } else if (step === 'form') {
      setStep('search_type');
    } else if (step === 'search_type') {
      setStep('profile');
    } else {
      onBack?.();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      role: profileType,
      searchType: profileType === 'candidate' ? searchType : null,
      company: profileType === 'recruiter' ? form.company : undefined,
      jobTitle: profileType === 'recruiter' ? form.jobTitle : undefined,
    };

    try {
      let recaptchaToken = '';
      try {
        recaptchaToken = await getRecaptchaToken('register');
      } catch {}

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, recaptchaToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Erreur lors de la création du compte');
        return;
      }

      if (onRegisterSuccess && data.user) {
        onRegisterSuccess({ user: data.user, token: data.token });
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === 'profile' ? 0 : step === 'search_type' ? 1 : 2;

  if (submitted) {
    return (
      <div className="register-wrap">
        <div className="register-box">
          <div className="register-success">
            <div className="register-success-icon">
              <CheckIcon />
            </div>
            <h1 className="register-success-title">Compte créé !</h1>
            <p className="register-success-sub">
              Vérifie ta boîte mail pour confirmer ton adresse et accéder à toutes les fonctionnalités.
            </p>
            <button type="button" className="register-submit" onClick={onLoginClick} style={{ marginTop: '1.5rem' }}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-wrap">
      <div className="register-box register-box--wide">

        <div className="register-header">
          <button className="register-back" type="button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Retour
          </button>

          <div className="reg-progress">
            {Array.from({ length: profileType === 'recruiter' ? 2 : 3 }, (_, i) => (
              <div
                key={i}
                className={`reg-dot ${i < stepIndex ? 'reg-dot--done' : i === stepIndex ? 'reg-dot--active' : ''}`}
              />
            ))}
          </div>
        </div>

        {step === 'profile' && (
          <div className="reg-step">
            <h1 className="register-title">Bienvenue sur JobSense</h1>
            <p className="register-subtitle">Quel est votre profil ?</p>

            <div className="reg-profile-cards">
              <button
                type="button"
                className={`reg-profile-card ${profileType === 'candidate' ? 'reg-profile-card--selected' : ''}`}
                onClick={() => handleProfileSelect('candidate')}
                aria-pressed={profileType === 'candidate'}
              >
                <div className="reg-profile-icon reg-profile-icon--candidate">
                  <CandidateIcon />
                </div>
                <div className="reg-profile-info">
                  <div className="reg-profile-label">Je cherche un poste</div>
                  <div className="reg-profile-desc">Stage, emploi, alternance — trouvez votre prochaine opportunité</div>
                </div>
                <div className="reg-profile-arrow">→</div>
              </button>

              <button
                type="button"
                className={`reg-profile-card ${profileType === 'recruiter' ? 'reg-profile-card--selected' : ''}`}
                onClick={() => handleProfileSelect('recruiter')}
                aria-pressed={profileType === 'recruiter'}
              >
                <div className="reg-profile-icon reg-profile-icon--recruiter">
                  <RecruiterIcon />
                </div>
                <div className="reg-profile-info">
                  <div className="reg-profile-label">Je recrute</div>
                  <div className="reg-profile-desc">Publiez vos offres et trouvez les meilleurs talents</div>
                </div>
                <div className="reg-profile-arrow">→</div>
              </button>
            </div>

            <div className="register-login" style={{ marginTop: '2rem' }}>
              Déjà un compte ?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); onLoginClick?.(); }}>
                Se connecter
              </a>
            </div>
          </div>
        )}

        {step === 'search_type' && (
          <div className="reg-step">
            <h1 className="register-title">Que recherchez-vous ?</h1>
            <p className="register-subtitle">Personnalisez votre expérience JobSense</p>

            <div className="reg-search-cards">
              <button
                type="button"
                className={`reg-search-card ${searchType === 'internship' ? 'reg-search-card--selected' : ''}`}
                onClick={() => handleSearchTypeSelect('internship')}
                aria-pressed={searchType === 'internship'}
              >
                <div className="reg-search-card-inner">
                  <div className="reg-search-icon">
                    <InternshipIcon />
                  </div>
                  <div>
                    <div className="reg-search-label">Stage</div>
                    <div className="reg-search-desc">Stages de 2 mois à 6 mois, en France et à l'international</div>
                  </div>
                </div>
                {searchType === 'internship' && <div className="reg-search-check"><CheckIcon /></div>}
              </button>

              <button
                type="button"
                className={`reg-search-card ${searchType === 'job' ? 'reg-search-card--selected' : ''}`}
                onClick={() => handleSearchTypeSelect('job')}
                aria-pressed={searchType === 'job'}
              >
                <div className="reg-search-card-inner">
                  <div className="reg-search-icon">
                    <JobIcon />
                  </div>
                  <div>
                    <div className="reg-search-label">Emploi</div>
                    <div className="reg-search-desc">CDI, CDD, freelance — toutes les offres d'emploi</div>
                  </div>
                </div>
                {searchType === 'job' && <div className="reg-search-check"><CheckIcon /></div>}
              </button>

              <button
                type="button"
                className={`reg-search-card ${searchType === 'both' ? 'reg-search-card--selected' : ''}`}
                onClick={() => handleSearchTypeSelect('both')}
                aria-pressed={searchType === 'both'}
              >
                <div className="reg-search-card-inner">
                  <div className="reg-search-icon">
                    <BothIcon />
                  </div>
                  <div>
                    <div className="reg-search-label">Stage & Emploi</div>
                    <div className="reg-search-desc">Je suis ouvert(e) aux deux types d'opportunités</div>
                  </div>
                </div>
                {searchType === 'both' && <div className="reg-search-check"><CheckIcon /></div>}
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="reg-step">
            <h1 className="register-title">
              {profileType === 'recruiter' ? 'Créer votre compte recruteur' : 'Finalisez votre inscription'}
            </h1>
            <p className="register-subtitle">
              {profileType === 'recruiter'
                ? 'Accédez aux meilleurs profils et publiez vos offres'
                : searchType === 'internship'
                  ? 'Accédez à des milliers de stages en France et à l\'international'
                  : searchType === 'job'
                    ? 'Trouvez votre prochain emploi parmi nos offres triées sur le volet'
                    : 'Découvrez toutes les opportunités qui correspondent à votre profil'}
            </p>

            <div className="reg-context-badge">
              {profileType === 'recruiter' ? (
                <><RecruiterIcon /> Espace recruteur</>
              ) : searchType === 'internship' ? (
                <><InternshipIcon /> Recherche de stage</>
              ) : searchType === 'job' ? (
                <><JobIcon /> Recherche d'emploi</>
              ) : (
                <><BothIcon /> Stage & Emploi</>
              )}
            </div>

            <form onSubmit={handleSubmit} aria-describedby={error ? 'register-error' : undefined}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">Prénom</label>
                  <input
                    id="firstName"
                    name="firstName"
                    className="form-input"
                    type="text"
                    placeholder="Thomas"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    autoComplete="given-name"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">Nom</label>
                  <input
                    id="lastName"
                    name="lastName"
                    className="form-input"
                    type="text"
                    placeholder="Dupont"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {profileType === 'recruiter' && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="company">Entreprise</label>
                    <input
                      id="company"
                      name="company"
                      className="form-input"
                      type="text"
                      placeholder="Acme Corp"
                      value={form.company}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="jobTitle">Poste</label>
                    <input
                      id="jobTitle"
                      name="jobTitle"
                      className="form-input"
                      type="text"
                      placeholder="DRH, Recruteur..."
                      value={form.jobTitle}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">Adresse email</label>
                <input
                  id="email"
                  name="email"
                  className="form-input"
                  type="email"
                  placeholder={profileType === 'recruiter' ? 'thomas@entreprise.fr' : 'thomas@exemple.fr'}
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  name="password"
                  className="form-input"
                  type="password"
                  placeholder="8 caractères minimum"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <div className="form-hint">Au moins 8 caractères.</div>
              </div>

              {error && <div id="register-error" className="form-error" role="alert">{error}</div>}

              <button type="submit" className="register-submit" disabled={loading}>
                {loading ? 'Création en cours...' : 'Créer mon compte'}
              </button>

              <div className="register-login" style={{ marginTop: '1rem' }}>
                Déjà un compte ?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); onLoginClick?.(); }}>
                  Se connecter
                </a>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default Register;
