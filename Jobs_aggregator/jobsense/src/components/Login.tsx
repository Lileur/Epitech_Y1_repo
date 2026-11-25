import React, { useEffect, useState } from 'react';
import { getRecaptchaToken } from '../utils/recaptcha';
import { oauthLoginUrl } from '../utils/apiBase';

interface LoginProps {
  onBack?: () => void;
  onSignupClick?: () => void;
  oauth2faTempToken?: string | null;
  onLoginSuccess?: (
    user: { id: number; firstName: string; lastName: string; email: string; role: 'candidate' | 'recruiter' | 'admin'; company?: string },
    token?: string,
  ) => void;
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const Login: React.FC<LoginProps> = ({ onBack, onSignupClick, oauth2faTempToken, onLoginSuccess }) => {
  const [form, setForm] = useState({ email: '', password: '', token2fa: '' });
  const [require2FA, setRequire2FA] = useState(false);
  const [oauth2faCode, setOauth2faCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    const token = params.get('token');
    
    console.log('Login.tsx - URL params:', { authError, token });
    
    if (authError === 'google_failed') {
      setError("La connexion Google a échoué. Réessaie en choisissant un autre compte.");
    } else if (authError === 'github_failed') {
      setError("La connexion GitHub a échoué. Réessaie.");
    } else if (authError === 'account_suspended') {
      setError('Votre compte a été suspendu par un administrateur.');
    } else if (authError === 'account_banned') {
      setError('Votre compte a été banni définitivement.');
    } else if (authError === 'oauth_failed') {
      setError('La connexion OAuth a échoué. Réessayez.');
    }
    
    if (token) {
      console.log('Login.tsx - Token found in URL, should be handled by App.tsx');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSocialLogin = (provider: 'google' | 'github') => {
    console.log('Login.tsx - Social login:', provider);
    setIsLoading(true);
    window.location.href = oauthLoginUrl(provider);
  };

  const handleOAuth2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauth2faTempToken || !oauth2faCode) return;
    setError('');
    setIsLoading(true);
    try {
      console.log('Login.tsx - Verifying OAuth 2FA token...');
      const res = await fetch('/api/auth/2fa/verify-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: oauth2faTempToken, token: oauth2faCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Code invalide.');
      console.log('Login.tsx - OAuth 2FA success, setting token and user');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess?.(data.user, data.token);
    } catch (err) {
      console.log('Login.tsx - OAuth 2FA error:', err);
      setError(err instanceof Error ? err.message : 'Code 2FA invalide.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Remplis tous les champs.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      console.log('Login.tsx - Submitting login form:', form);
      let recaptchaToken = '';
      try {
        recaptchaToken = await getRecaptchaToken('login');
      } catch {}

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken })
      });
      const data = await res.json();
      
      console.log('Login.tsx - Login response:', data);
      
      if (!res.ok) {
        setError(data.message || 'Erreur lors de la connexion');
        return;
      }
      
      if (data.require2FA) {
        console.log('Login.tsx - 2FA required');
        setRequire2FA(true);
        setError('');
        return;
      }
      
      console.log('Login.tsx - Login success, setting token and user');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess ? onLoginSuccess(data.user, data.token) : onBack?.();
    } catch (err) {
      console.log('Login.tsx - Login error:', err);
      setError('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  if (oauth2faTempToken) {
    return (
      <div className="register-wrap">
        <div className="register-box">
          <div className="register-header">
            <h1 className="register-title">Vérification 2FA</h1>
            <p className="register-subtitle">
              Entrez le code à 6 chiffres de votre application d&apos;authentification (connexion OAuth).
            </p>
          </div>
          <form onSubmit={handleOAuth2FASubmit} aria-describedby={error ? 'oauth2fa-error' : undefined}>
            <div className="form-group">
              <label className="form-label" htmlFor="oauth2fa">Code 2FA</label>
              <input
                id="oauth2fa"
                className="form-input"
                type="text"
                placeholder="123456"
                value={oauth2faCode}
                onChange={(e) => setOauth2faCode(e.target.value)}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            {error && <div id="oauth2fa-error" className="form-error" role="alert">{error}</div>}
            <button type="submit" className="register-submit" disabled={isLoading}>
              {isLoading ? 'Vérification…' : 'Valider'}
            </button>
            <button type="button" className="btn-ghost" style={{ marginTop: '0.75rem', width: '100%' }} onClick={onBack}>
              Annuler
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="register-wrap">
      <div className="register-box">
        <div className="register-header">
          <button className="register-back" type="button" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Retour
          </button>
          <h1 className="register-title">Connexion</h1>
          <p className="register-subtitle">
            Content de te revoir.
          </p>
        </div>

        <div className="social-btns">
          <button 
            type="button"
            className="social-btn" 
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
          <button 
            type="button"
            className="social-btn" 
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading}
          >
            <GithubIcon />
            Continuer avec GitHub
          </button>
        </div>

        <div className="register-divider">
          <span>ou par email</span>
        </div>

        <form onSubmit={handleSubmit} aria-describedby={error ? 'login-error' : undefined}>
          {!require2FA ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Adresse email</label>
                <input
                  id="email"
                  name="email"
                  className="form-input"
                  type="email"
                  placeholder="thomas@exemple.fr"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Mot de passe
                  <a href="#" className="form-label-link">Mot de passe oublié ?</a>
                </label>
                <input
                  id="password"
                  name="password"
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="token2fa">Code d'authentification 2FA</label>
              <input
                id="token2fa"
                name="token2fa"
                className="form-input"
                type="text"
                placeholder="123456"
                value={form.token2fa}
                onChange={handleChange}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Ouvrez votre application d'authentification pour obtenir le code.
              </p>
            </div>
          )}

          {error && <div id="login-error" className="form-error" role="alert">{error}</div>}

          <button type="submit" className="register-submit" disabled={isLoading}>
            {isLoading ? 'Connexion…' : require2FA ? 'Vérifier' : 'Se connecter'}
          </button>

          <div className="register-login" style={{ marginTop: '1rem' }}>
            Pas encore de compte ?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onSignupClick?.(); }}>
              Créer un compte
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
