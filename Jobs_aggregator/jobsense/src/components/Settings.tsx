import React, { useState } from 'react';

interface SettingsProps {
  onBack: () => void;
  user: { id: number; firstName: string; lastName: string; email: string; role: string; two_factor_enabled?: boolean };
}

const Settings: React.FC<SettingsProps> = ({ onBack, user }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  // step 0: init (not enabled), step 1: scanning QR, step 2: success / already enabled
  const [step, setStep] = useState(user.two_factor_enabled ? 2 : 0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/generate', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur de génération");
      
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Code invalide");
      
      setStep(2);
      
      // Update local storage to reflect that 2FA is enabled
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, two_factor_enabled: true }));
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir désactiver l'A2F ? Votre compte sera moins sécurisé.")) return;
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de la désactivation");
      
      setStep(0);
      setQrCodeUrl('');
      setSecret('');
      setToken('');
      
      // Update local storage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, two_factor_enabled: false }));
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="inner-page" tabIndex={-1}>
      <div className="inner-page-hero">
        <button className="inner-back-btn" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Retour au profil
        </button>
        <h1 className="inner-page-title">Paramètres</h1>
        <p className="inner-page-sub">Gérez la sécurité de votre compte.</p>
      </div>

      <div className="offres-grid" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="offres-card">
          <h2 style={{ marginBottom: '1rem' }}>Sécurité (A2F)</h2>
          
          {step === 0 && (
            <div>
              <p style={{ marginBottom: '1rem' }}>Renforcez la sécurité de votre compte en activant l'authentification à deux facteurs.</p>
              <button 
                className="btn-primary" 
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Chargement...' : 'Configurer le 2FA'}
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <p style={{ marginBottom: '1rem' }}>
                1. Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy...).
              </p>
              <div style={{ background: '#fff', padding: '1rem', display: 'inline-block', borderRadius: '8px', marginBottom: '1rem' }}>
                <img src={qrCodeUrl} alt="QR Code 2FA" />
              </div>
              <p style={{ marginBottom: '1rem' }}>
                2. Saisissez le code à 6 chiffres généré par votre application :
              </p>
              <form
                onSubmit={handleVerify}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                aria-describedby={error ? 'settings-error' : undefined}
              >
                <label className="sr-only" htmlFor="settings-2fa-code">Code de vérification 2FA</label>
                <input 
                  id="settings-2fa-code"
                  type="text" 
                  value={token} 
                  onChange={(e) => setToken(e.target.value)} 
                  placeholder="123456" 
                  className="form-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{ width: '150px' }}
                  required
                />
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Vérification...' : 'Activer'}
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div>
              <div role="status" style={{ color: 'var(--accent)', fontWeight: 600, padding: '1rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
                L'authentification à deux facteurs est activée.
              </div>
              <button 
                className="btn-primary" 
                onClick={handleDisable}
                disabled={loading}
                style={{ backgroundColor: '#EF4444' }}
              >
                {loading ? 'Désactivation...' : 'Désactiver le 2FA'}
              </button>
            </div>
          )}

          {error && <div id="settings-error" className="form-error" role="alert" style={{ marginTop: '1rem' }}>{error}</div>}
        </div>
      </div>
    </main>
  );
};

export default Settings;
