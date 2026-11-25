import React, { useState, useEffect } from 'react';
import { oauthLoginUrl } from '../utils/apiBase';

interface AdminLoginProps {
  onBack: () => void;
  onLoginSuccess: (user: any) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [userName, setUserName] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [setupCode, setSetupCode] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setHasValidSession(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success || data.user?.role !== 'admin') {
          setHasValidSession(false);
          return;
        }
        
        const fresh = data.user;
        localStorage.setItem('user', JSON.stringify(fresh));
        setUserName(fresh.firstName || fresh.email?.split('@')[0] || 'Administrateur');
        setIs2FAEnabled(fresh.two_factor_enabled);
        setHasValidSession(true);

        if (!fresh.two_factor_enabled) {
          fetch('/api/auth/2fa/generate', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(qrData => {
              if (qrData.success) {
                setQrCodeUrl(qrData.qrCodeUrl);
              }
            });
        }
      })
      .catch(() => {
        setHasValidSession(false);
      });
  }, []);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupCode) return;

    setError('');
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: setupCode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Code invalide.');
        setIsLoading(false);
        return;
      }
      
      setIs2FAEnabled(true);
      setSuccessMsg("Application configurée ! Vous pouvez maintenant vous connecter.");
    } catch {
      setError('Erreur serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Veuillez saisir le code.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/admin/verify-totp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: pin })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Code A2F invalide');
        return;
      }
      
      sessionStorage.setItem('adminToken', data.token);
      sessionStorage.setItem('adminUser', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasValidSession === null) return (
    <div role="status" aria-label="Chargement de la session admin" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' }}>
      <div aria-hidden="true" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #374151', borderTopColor: '#60A5FA', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <main id="main-content" tabIndex={-1} style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111827',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#1F2937',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#F3F4F6' }}>JobSense Admin</h1>
          </div>
          <p style={{ color: '#9CA3AF', margin: 0, fontSize: '0.875rem' }}>Portail de gestion sécurisé</p>
        </div>

        {!hasValidSession ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ color: '#F87171', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 600 }}>Accès non autorisé</h2>
            <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              Votre session ne dispose pas des droits administrateur.<br />
              Reconnectez-vous avec un compte admin.
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = oauthLoginUrl('google');
              }}
              style={{
                width: '100%', padding: '0.875rem', backgroundColor: '#2563EB', color: '#fff',
                border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem'
              }}
            >
              Se reconnecter
            </button>
            <button
              type="button"
              onClick={onBack}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'transparent', color: '#6B7280', border: 'none', cursor: 'pointer' }}
            >
              ← Retour à l'accueil
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#E5E7EB', marginBottom: '1.5rem', textAlign: 'center' }}>Bienvenue <strong>{userName}</strong>.</p>
            
            {!is2FAEnabled ? (
              <form onSubmit={handleSetupSubmit} style={{ textAlign: 'center' }} aria-describedby={error ? 'admin-setup-error' : undefined}>
                <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                  <strong>Action requise :</strong> Pour des raisons de sécurité, les administrateurs doivent configurer l'authentification à double facteur (Google Authenticator, Authy, etc.).
                </div>
                
                {qrCodeUrl ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <img src={qrCodeUrl} alt="QR Code" style={{ border: '4px solid white', borderRadius: '8px', marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '1rem' }}>Scannez ce QR Code avec votre application.</p>
                  </div>
                ) : (
                  <p>Génération du QR Code...</p>
                )}

                <label className="sr-only" htmlFor="admin-setup-code">Code de configuration A2F</label>
                <input
                  id="admin-setup-code"
                  type="text"
                  placeholder="Code à 6 chiffres"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  style={{
                    width: '100%', padding: '0.75rem', backgroundColor: '#374151', border: '1px solid #4B5563',
                    borderRadius: '6px', color: '#fff', textAlign: 'center', letterSpacing: '0.2rem', marginBottom: '1rem'
                  }}
                />
                
                {error && <div id="admin-setup-error" role="alert" style={{ color: '#F87171', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '0.875rem', backgroundColor: '#10B981', color: '#fff',
                    border: 'none', borderRadius: '6px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Vérification...' : 'Activer l\'A2F'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifySubmit} aria-describedby={error ? 'admin-login-error' : undefined}>
                {successMsg && <div role="status" style={{ backgroundColor: '#059669', color: 'white', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{successMsg}</div>}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="pin" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#D1D5DB', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Code Authenticator (A2F)
                  </label>
                  <input
                    id="pin"
                    type="text"
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError(''); }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    style={{
                      width: '100%', padding: '0.75rem', backgroundColor: '#374151', border: '1px solid #4B5563',
                      borderRadius: '6px', color: '#fff', outline: 'none', textAlign: 'center', fontSize: '1.25rem',
                      letterSpacing: '0.5rem'
                    }}
                  />
                </div>
                {error && <div id="admin-login-error" role="alert" style={{ color: '#F87171', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', padding: '0.5rem', backgroundColor: 'rgba(248, 113, 113, 0.1)', borderRadius: '6px' }}>{error}</div>}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '0.875rem', backgroundColor: '#3B82F6', color: '#fff',
                    border: 'none', borderRadius: '6px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Vérification...' : 'Accéder au panel'}
                </button>
              </form>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button type="button" onClick={onBack} style={{ backgroundColor: 'transparent', color: '#6B7280', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>
                ← Retour à l'accueil
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
