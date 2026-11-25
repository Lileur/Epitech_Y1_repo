import React, { useState, useRef, useEffect } from 'react';
import { loadStoredProfile, saveStoredProfile, type StoredProfileFile } from '../utils/profileStorage';
import { usersAPI } from '../services/api';

// ─── Types ─────────────────────────────────────────────────
interface Experience {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  school: string;
  period: string;
}

interface ProfileProps {
  onLogout?: () => void;
  onSettingsClick?: () => void;
  onBack?: () => void;
  onProfileSaved?: (user: { firstName: string; lastName: string; email: string; searchType?: string }) => void;
  user?: {
    id?: number | string;
    firstName: string;
    lastName: string;
    email: string;
    searchType?: string;
  };
}

const uid = () => Math.random().toString(36).slice(2, 9);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_CV_BYTES = 5 * 1024 * 1024;

const SEARCH_LABELS: Record<string, string> = {
  internship: 'Stage',
  job: 'Emploi',
  both: 'Stage ou Emploi',
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function buildStoredFile(file: File, url: string): StoredProfileFile {
  return {
    name: file.name,
    url,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

// ─── Inline editable field ──────────────────────────────────
interface InlineEditProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel?: string;
  tag?: 'h1' | 'h2' | 'p' | 'span';
  className?: string;
  multiline?: boolean;
}

const InlineEdit: React.FC<InlineEditProps> = ({
  value, onChange, placeholder, ariaLabel, tag = 'p', className = '', multiline = false
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.focus(), 0); };
  const commit = () => { setEditing(false); if (draft.trim()) onChange(draft.trim()); };
  const cancel = () => { setEditing(false); setDraft(value); };

  if (editing) {
    const sharedProps = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
        if (e.key === 'Escape') cancel();
      },
      className: `inline-edit-input ${multiline ? 'inline-edit-textarea' : ''}`,
      'aria-label': ariaLabel || placeholder,
      placeholder,
    };
    return multiline
      ? <textarea {...sharedProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>} rows={4} />
      : <input {...sharedProps as React.InputHTMLAttributes<HTMLInputElement>} />;
  }

  const Tag = tag;
  const isEmpty = !value;
  return (
    <Tag
      className={`${className} inline-edit-trigger ${isEmpty ? 'inline-edit-empty' : ''}`}
      onClick={start}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          start();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel ? `${ariaLabel}: ${value || placeholder}` : `Modifier ${placeholder}`}
      title="Cliquer pour modifier"
    >
      {value || placeholder}
    </Tag>
  );
};

// ─── Section wrapper ────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <div className="pf-section">
    <div className="pf-section-header">
      <h2 className="pf-section-title">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

// ─── Main component ─────────────────────────────────────────
const Profile: React.FC<ProfileProps> = ({ onBack, onLogout, onSettingsClick, onProfileSaved, user }) => {
  const initFirst = user?.firstName || '';
  const initLast  = user?.lastName  || '';
  const email     = user?.email     || '';
  const profileStorageKey = user?.id ?? user?.email ?? null;

  const [firstName, setFirstName] = useState(initFirst);
  const [lastName,  setLastName]  = useState(initLast);
  const [title,     setTitle]     = useState('');
  const [location,  setLocation]  = useState('');
  const [about,     setAbout]     = useState('');
  const [website,   setWebsite]   = useState('');
  const [phone,     setPhone]     = useState('');

  // ── Photo & cover ──────────────────────────────────────
  const [avatar,  setAvatar]  = useState<string | null>(null);
  const [cover,   setCover]   = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput  = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setSaveFeedback({ type: 'err', text: 'Image trop lourde : 2 Mo maximum.' });
      return;
    }
    try {
      setAvatar(await fileToDataUrl(file));
      setSaveFeedback(null);
    } catch {
      setSaveFeedback({ type: 'err', text: "Impossible de lire l'image." });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setSaveFeedback({ type: 'err', text: 'Image trop lourde : 2 Mo maximum.' });
      return;
    }
    try {
      setCover(await fileToDataUrl(file));
      setSaveFeedback(null);
    } catch {
      setSaveFeedback({ type: 'err', text: "Impossible de lire l'image." });
    }
  };

  // ── CV ────────────────────────────────────────────────
  const [cvFile,    setCvFile]    = useState<StoredProfileFile | null>(null);
  const cvInput = useRef<HTMLInputElement>(null);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_CV_BYTES) {
      setSaveFeedback({ type: 'err', text: 'CV trop lourd : 5 Mo maximum.' });
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      setCvFile(buildStoredFile(file, url));
      setSaveFeedback(null);
    } catch {
      setSaveFeedback({ type: 'err', text: 'Impossible de lire le CV.' });
    }
  };

  // ── Skills ─────────────────────────────────────────────
  const [skills, setSkills]     = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput('');
  };
  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));

  // ── Experiences ────────────────────────────────────────
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showExpModal, setShowExpModal] = useState(false);
  const [expForm, setExpForm] = useState<Omit<Experience, 'id'>>({ title: '', company: '', period: '', description: '' });

  const addExp = () => {
    if (!expForm.title || !expForm.company) return;
    setExperiences([...experiences, { ...expForm, id: uid() }]);
    setExpForm({ title: '', company: '', period: '', description: '' });
    setShowExpModal(false);
  };
  const removeExp = (id: string) => setExperiences(experiences.filter(e => e.id !== id));

  // ── Education ──────────────────────────────────────────
  const [education, setEducation]     = useState<Education[]>([]);
  const [showEduModal, setShowEduModal] = useState(false);
  const [eduForm, setEduForm] = useState<Omit<Education, 'id'>>({ degree: '', school: '', period: '' });

  const addEdu = () => {
    if (!eduForm.degree || !eduForm.school) return;
    setEducation([...education, { ...eduForm, id: uid() }]);
    setEduForm({ degree: '', school: '', period: '' });
    setShowEduModal(false);
  };
  const removeEdu = (id: string) => setEducation(education.filter(e => e.id !== id));

  // ── Availability ───────────────────────────────────────
  const [available, setAvailable] = useState(true);

  // ── Search preferences ─────────────────────────────────
  const [searchContract, setSearchContract] = useState(user?.searchType || '');
  const [searchMode,     setSearchMode]     = useState(''); // remote | hybrid | onsite
  const [searchCity,     setSearchCity]     = useState('');
  const [searchSalary,   setSearchSalary]   = useState('');
  const [searchDate,     setSearchDate]     = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const applyStoredProfile = (stored: ReturnType<typeof loadStoredProfile>) => {
    if (!stored) return;
    if (stored.firstName) setFirstName(stored.firstName);
    if (stored.lastName) setLastName(stored.lastName);
    if (stored.title) setTitle(stored.title);
    if (stored.location) setLocation(stored.location);
    if (stored.about) setAbout(stored.about);
    if (stored.website) setWebsite(stored.website);
    if (stored.phone) setPhone(stored.phone);
    if (stored.avatar) setAvatar(stored.avatar);
    if (stored.cover) setCover(stored.cover);
    if (stored.cvFile) setCvFile(stored.cvFile);
    if (stored.skills?.length) setSkills(stored.skills);
    if (stored.experiences?.length) setExperiences(stored.experiences);
    if (stored.education?.length) setEducation(stored.education);
    if (typeof stored.available === 'boolean') setAvailable(stored.available);
    if (stored.searchContract) setSearchContract(stored.searchContract);
    if (stored.searchMode) setSearchMode(stored.searchMode);
    if (stored.searchCity) setSearchCity(stored.searchCity);
    if (stored.searchSalary) setSearchSalary(stored.searchSalary);
    if (stored.searchDate) setSearchDate(stored.searchDate);
  };

  const resetProfileState = () => {
    setFirstName(initFirst);
    setLastName(initLast);
    setTitle('');
    setLocation('');
    setAbout('');
    setWebsite('');
    setPhone('');
    setAvatar(null);
    setCover(null);
    setCvFile(null);
    setSkills([]);
    setSkillInput('');
    setExperiences([]);
    setEducation([]);
    setAvailable(true);
    setSearchContract(user?.searchType || '');
    setSearchMode('');
    setSearchCity('');
    setSearchSalary('');
    setSearchDate('');
    setSaveFeedback(null);
  };

  useEffect(() => {
    resetProfileState();
    const stored = loadStoredProfile(profileStorageKey);
    if (stored) {
      applyStoredProfile(stored);
      return;
    }
    if (initFirst) setFirstName(initFirst);
    if (initLast) setLastName(initLast);
  }, [profileStorageKey, initFirst, initLast, user?.searchType]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    void (async () => {
      try {
        const res = await usersAPI.getProfile();
        const p = res.profile as Record<string, unknown>;
        if (p.firstName) setFirstName(String(p.firstName));
        else if (res.user?.firstName) setFirstName(String(res.user.firstName));
        if (p.lastName) setLastName(String(p.lastName));
        else if (res.user?.lastName) setLastName(String(res.user.lastName));
        if (p.title) setTitle(String(p.title));
        if (p.location) setLocation(String(p.location));
        if (p.about) setAbout(String(p.about));
        if (p.website) setWebsite(String(p.website));
        if (p.phone) setPhone(String(p.phone));
        if (typeof p.avatar === 'string') setAvatar(p.avatar);
        if (typeof p.cover === 'string') setCover(p.cover);
        if (p.cvFile && typeof p.cvFile === 'object') setCvFile(p.cvFile as StoredProfileFile);
        if (Array.isArray(p.skills)) setSkills(p.skills as string[]);
        if (Array.isArray(p.experiences)) setExperiences(p.experiences as Experience[]);
        if (Array.isArray(p.education)) setEducation(p.education as Education[]);
        if (typeof p.available === 'boolean') setAvailable(p.available);
        if (p.searchContract) setSearchContract(String(p.searchContract));
        if (p.searchMode) setSearchMode(String(p.searchMode));
        if (p.searchCity) setSearchCity(String(p.searchCity));
        if (p.searchSalary) setSearchSalary(String(p.searchSalary));
        if (p.searchDate) setSearchDate(String(p.searchDate));
      } catch {
        /* profil local uniquement */
      }
    })();
  }, [profileStorageKey]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveFeedback(null);

    const profilePayload = {
      firstName,
      lastName,
      title,
      location,
      about,
      website,
      phone,
      avatar,
      cover,
      cvFile,
      skills,
      experiences,
      education,
      available,
      searchContract,
      searchMode,
      searchCity,
      searchSalary,
      searchDate,
    };

    saveStoredProfile(profilePayload, profileStorageKey);

    const token = localStorage.getItem('token');
    if (!token) {
      setSaveFeedback({ type: 'ok', text: 'Profil enregistré localement.' });
      setSaving(false);
      return;
    }

    try {
      const res = await usersAPI.saveProfile({
        profile: profilePayload,
        firstName,
        lastName,
        jobTitle: title,
      });

      const updatedUser = {
        firstName: String(res.user?.firstName ?? firstName),
        lastName: String(res.user?.lastName ?? lastName),
        email: user?.email || '',
        searchType: user?.searchType,
      };

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as Record<string, unknown>;
          localStorage.setItem(
            'user',
            JSON.stringify({ ...parsed, ...updatedUser }),
          );
        } catch {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }

      onProfileSaved?.(updatedUser);
      setSaveFeedback({ type: 'ok', text: res.message || 'Profil enregistré.' });
    } catch (err) {
      setSaveFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Completion ─────────────────────────────────────────
  const steps = [
    !!firstName, !!lastName, !!title, !!location, !!about,
    !!avatar, !!cvFile, skills.length > 0, experiences.length > 0
  ];
  const completion = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  const initials = `${firstName[0] || '?'}${lastName[0] || ''}`.toUpperCase();

  // ── Icons ──────────────────────────────────────────────
  const IconCamera = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
  const IconPlus = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
  const IconX = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  const IconBack = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M19 12H5M12 5l-7 7 7 7"/>
    </svg>
  );
  const IconSettings = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );

  return (
    <main id="main-content" className="pf-root" tabIndex={-1}>
      <h1 className="sr-only">Profil candidat</h1>

      {/* ── Top bar ── */}
      <div className="pf-topbar">
        <button className="pf-back-btn" onClick={onBack}>
          <IconBack /> Accueil
        </button>
        <div className="pf-topbar-right">
          <button
            type="button"
            className={`pf-avail-toggle ${available ? 'pf-avail-toggle--on' : ''}`}
            onClick={() => setAvailable(!available)}
            aria-pressed={available}
          >
            <span className="pf-avail-dot" />
            {available ? 'Disponible' : 'Non disponible'}
          </button>
          <button
            type="button"
            className="btn-primary pf-save-btn"
            onClick={() => void handleSaveProfile()}
            disabled={saving}
          >
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
          {saveFeedback && (
            <span
              className={saveFeedback.type === 'ok' ? 'pf-save-ok' : 'pf-save-err'}
              role={saveFeedback.type === 'ok' ? 'status' : 'alert'}
              style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}
            >
              {saveFeedback.text}
            </span>
          )}
          <button 
            className="btn-ghost pf-settings-btn" 
            onClick={(e) => { e.preventDefault(); onSettingsClick?.(); }} 
            title="Paramètres"
            aria-label="Ouvrir les paramètres du compte"
            type="button"
            style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ pointerEvents: 'none', display: 'flex' }}>
              <IconSettings />
            </div>
          </button>
          <button type="button" className="btn-ghost pf-logout-btn" onClick={onLogout}>Déconnexion</button>
        </div>
      </div>

      <div className="pf-layout">
        <div className="pf-col-main">

          {/* ── Hero card — cover + avatar ── */}
          <div className="pf-hero-card">

            {/* Cover */}
            <div
              className="pf-cover"
              style={cover ? { backgroundImage: `url(${cover})` } : {}}
              onClick={() => coverInput.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  coverInput.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Changer l'image de couverture"
              title="Changer l'image de couverture"
            >
              {!cover && (
                <div className="pf-cover-placeholder">
                  <IconCamera />
                  <span>Ajouter une image de couverture</span>
                </div>
              )}
              {cover && (
                <div className="pf-cover-overlay">
                  <IconCamera />
                </div>
              )}
            </div>
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={handleCoverUpload} />

            {/* Avatar */}
            <div className="pf-hero-body">
              <div className="pf-avatar-wrap">
                <button
                  className="pf-avatar-btn"
                  type="button"
                  onClick={() => avatarInput.current?.click()}
                  aria-label="Changer la photo de profil"
                  title="Changer la photo de profil"
                >
                  {avatar
                    ? <img src={avatar} alt="Photo de profil" className="pf-avatar-img" />
                    : <span className="pf-avatar-initials">{initials}</span>
                  }
                  <span className="pf-avatar-edit-overlay"><IconCamera /></span>
                </button>
                <input ref={avatarInput} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
              </div>

              <div className="pf-hero-info">
                <div className="pf-name-row">
                  <InlineEdit value={firstName} onChange={setFirstName} placeholder="Prénom" ariaLabel="Modifier le prénom" tag="span" className="pf-firstname" />
                  <InlineEdit value={lastName}  onChange={setLastName}  placeholder="Nom" ariaLabel="Modifier le nom" tag="span" className="pf-lastname"  />
                </div>
                <InlineEdit value={title} onChange={setTitle} placeholder="Votre titre de poste (ex: Développeur React)" ariaLabel="Modifier le titre de poste" tag="p" className="pf-hero-title" />
                <div className="pf-hero-meta">
                  <InlineEdit value={location} onChange={setLocation} placeholder="Paris, France" ariaLabel="Modifier la localisation" tag="span" className="pf-hero-loc" />
                  {email && <span className="pf-hero-sep">·</span>}
                  {email && <span className="pf-hero-email">{email}</span>}
                </div>
                <div className="pf-hero-links">
                  <InlineEdit value={website} onChange={setWebsite} placeholder="Portfolio / LinkedIn" ariaLabel="Modifier le portfolio ou LinkedIn" tag="span" className="pf-hero-website" />
                  <span className="pf-hero-sep">·</span>
                  <InlineEdit value={phone} onChange={setPhone} placeholder="Téléphone" ariaLabel="Modifier le téléphone" tag="span" className="pf-hero-phone" />
                </div>
                {user?.searchType && (
                  <span className="pf-search-type-badge">
                    Recherche : {SEARCH_LABELS[user.searchType] || user.searchType}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── About ── */}
          <Section title="À propos">
            <InlineEdit
              value={about}
              onChange={setAbout}
              placeholder="Cliquez pour écrire votre présentation. Qui êtes-vous ? Qu'est-ce qui vous motive ? Ce que vous recherchez."
              ariaLabel="Modifier la présentation"
              multiline
              className="pf-about-text"
            />
          </Section>

          {/* ── CV ── */}
          <Section
            title="Curriculum Vitae"
            action={
              <button className="pf-add-btn" type="button" onClick={() => cvInput.current?.click()}>
                <IconPlus /> {cvFile ? 'Remplacer' : 'Ajouter mon CV'}
              </button>
            }
          >
            <input ref={cvInput} type="file" accept=".pdf,.doc,.docx" hidden onChange={handleCvUpload} />

            {!cvFile ? (
              <button className="pf-empty-cta" type="button" onClick={() => cvInput.current?.click()}>
                <div className="pf-cv-upload-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </div>
                <p>Déposez votre CV — PDF, Word</p>
                <span className="pf-cv-hint">Les recruteurs pourront le consulter directement</span>
              </button>
            ) : (
              <div className="pf-cv-preview">
                <div className="pf-cv-file-info">
                  <div className="pf-cv-file-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <p className="pf-cv-filename">{cvFile.name}</p>
                    <p className="pf-cv-status">Visible par les recruteurs</p>
                  </div>
                </div>
                <div className="pf-cv-actions">
                  <a href={cvFile.url} target="_blank" rel="noopener noreferrer" className="pf-cv-view-btn">
                    Voir le CV
                  </a>
                  <button className="pf-remove-btn" type="button" onClick={() => setCvFile(null)} aria-label="Supprimer le CV" title="Supprimer"><IconX /></button>
                </div>
              </div>
            )}
          </Section>

          {/* ── Skills ── */}
          <Section title="Compétences">
            <div className="pf-skills-container">
              {skills.map(s => (
                <span key={s} className="pf-skill-badge">
                  {s}
                  <button className="pf-skill-remove" type="button" onClick={() => removeSkill(s)} aria-label={`Supprimer la compétence ${s}`} title="Supprimer">×</button>
                </span>
              ))}
              <div className="pf-skill-add-row">
                <input
                  className="pf-skill-input"
                  value={skillInput}
                  aria-label="Ajouter une compétence"
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  placeholder="React, Python, Figma… puis Entrée"
                />
                <button className="pf-skill-add-btn" type="button" onClick={addSkill} disabled={!skillInput.trim()}>Ajouter</button>
              </div>
            </div>
          </Section>

          {/* ── Experiences ── */}
          <Section
            title="Expériences"
            action={<button className="pf-add-btn" type="button" onClick={() => setShowExpModal(true)}><IconPlus /> Ajouter</button>}
          >
            {experiences.length === 0 ? (
              <button className="pf-empty-cta" type="button" onClick={() => setShowExpModal(true)}>
                Ajoutez votre première expérience professionnelle
              </button>
            ) : (
              <div className="pf-timeline">
                {experiences.map(exp => (
                  <div key={exp.id} className="pf-timeline-item">
                    <div className="pf-timeline-dot" />
                    <div className="pf-timeline-body">
                      <div className="pf-timeline-top">
                        <div>
                          <p className="pf-timeline-title">{exp.title}</p>
                          <p className="pf-timeline-sub">{exp.company}{exp.period && ` · ${exp.period}`}</p>
                        </div>
                        <button className="pf-remove-btn" type="button" onClick={() => removeExp(exp.id)} aria-label={`Supprimer l'expérience ${exp.title}`}><IconX /></button>
                      </div>
                      {exp.description && <p className="pf-timeline-desc">{exp.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── Education ── */}
          <Section
            title="Formation"
            action={<button className="pf-add-btn" type="button" onClick={() => setShowEduModal(true)}><IconPlus /> Ajouter</button>}
          >
            {education.length === 0 ? (
              <button className="pf-empty-cta" type="button" onClick={() => setShowEduModal(true)}>
                Ajoutez votre parcours de formation
              </button>
            ) : (
              <div className="pf-timeline">
                {education.map(edu => (
                  <div key={edu.id} className="pf-timeline-item">
                    <div className="pf-timeline-dot" />
                    <div className="pf-timeline-body">
                      <div className="pf-timeline-top">
                        <div>
                          <p className="pf-timeline-title">{edu.degree}</p>
                          <p className="pf-timeline-sub">{edu.school}{edu.period && ` · ${edu.period}`}</p>
                        </div>
                        <button className="pf-remove-btn" type="button" onClick={() => removeEdu(edu.id)} aria-label={`Supprimer la formation ${edu.degree}`}><IconX /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>

        {/* ── RIGHT sidebar ── */}
        <aside className="pf-col-aside">

          {/* Completion */}
          <div className="pf-card pf-completion-card">
            <div className="pf-completion-header">
              <span className="pf-completion-label">Complétude du profil</span>
              <span className="pf-completion-pct">{completion}%</span>
            </div>
            <div className="pf-progress-bar">
              <div className="pf-progress-fill" style={{ width: `${completion}%` }} />
            </div>
            {completion < 100 && (
              <ul className="pf-completion-tips">
                {!avatar        && <li onClick={() => avatarInput.current?.click()}>Ajouter une photo de profil</li>}
                {!title         && <li>Ajouter votre titre de poste</li>}
                {!about         && <li>Écrire votre présentation</li>}
                {!cvFile        && <li onClick={() => cvInput.current?.click()}>Uploader votre CV</li>}
                {skills.length === 0 && <li>Ajouter des compétences</li>}
                {experiences.length === 0 && <li onClick={() => setShowExpModal(true)}>Ajouter une expérience</li>}
              </ul>
            )}
            {completion === 100 && <p className="pf-completion-done">Profil complet !</p>}
          </div>

          {/* Contact info */}
          <div className="pf-card">
            <h2 className="pf-aside-title">Informations de contact</h2>
            <div className="pf-contact-list">
              <div className="pf-contact-item">
                <span className="pf-contact-label">Email</span>
                <span className="pf-contact-value">{email || '—'}</span>
              </div>
              <div className="pf-contact-item">
                <span className="pf-contact-label">Téléphone</span>
                <InlineEdit value={phone} onChange={setPhone} placeholder="Ajouter" ariaLabel="Modifier le téléphone" tag="span" className="pf-contact-edit" />
              </div>
              <div className="pf-contact-item">
                <span className="pf-contact-label">Localisation</span>
                <InlineEdit value={location} onChange={setLocation} placeholder="Ajouter" ariaLabel="Modifier la localisation" tag="span" className="pf-contact-edit" />
              </div>
              <div className="pf-contact-item">
                <span className="pf-contact-label">Portfolio</span>
                <InlineEdit value={website} onChange={setWebsite} placeholder="Ajouter" ariaLabel="Modifier le portfolio" tag="span" className="pf-contact-edit" />
              </div>
            </div>
          </div>

          {/* ── Ce que je cherche ── */}
          <div className="pf-card">
            <h2 className="pf-aside-title">Ce que je cherche</h2>
            <div className="pf-search-prefs">

              <div className="pf-pref-item">
                <label className="pf-pref-label" htmlFor="profile-contract">Type de contrat</label>
                <select
                  id="profile-contract"
                  className="pf-pref-select"
                  value={searchContract}
                  onChange={e => setSearchContract(e.target.value)}
                >
                  <option value="">Non précisé</option>
                  <option value="internship">Stage</option>
                  <option value="apprenticeship">Alternance</option>
                  <option value="job">CDI</option>
                  <option value="cdd">CDD</option>
                  <option value="freelance">Freelance</option>
                  <option value="both">Stage ou Emploi</option>
                </select>
              </div>

              <div className="pf-pref-item">
                <span className="pf-pref-label">Mode de travail</span>
                <div className="pf-pref-chips">
                  {(['onsite', 'hybrid', 'remote'] as const).map(mode => (
                    <button
                      key={mode}
                      className={`pf-pref-chip ${searchMode === mode ? 'pf-pref-chip--active' : ''}`}
                      onClick={() => setSearchMode(searchMode === mode ? '' : mode)}
                      type="button"
                      aria-pressed={searchMode === mode}
                    >
                      {mode === 'onsite' ? 'Présentiel' : mode === 'hybrid' ? 'Hybride' : 'Télétravail'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pf-pref-item">
                <span className="pf-pref-label">Ville souhaitée</span>
                <InlineEdit value={searchCity} onChange={setSearchCity} placeholder="Paris, Lyon, Remote…" ariaLabel="Modifier la ville souhaitée" tag="span" className="pf-pref-edit" />
              </div>

              <div className="pf-pref-item">
                <span className="pf-pref-label">Salaire attendu</span>
                <InlineEdit value={searchSalary} onChange={setSearchSalary} placeholder="Ex : 35 000 € / an" ariaLabel="Modifier le salaire attendu" tag="span" className="pf-pref-edit" />
              </div>

              <div className="pf-pref-item">
                <span className="pf-pref-label">Disponibilité</span>
                <InlineEdit value={searchDate} onChange={setSearchDate} placeholder="Ex : Dès septembre 2025" ariaLabel="Modifier la disponibilité" tag="span" className="pf-pref-edit" />
              </div>

            </div>
          </div>

        </aside>
      </div>

      {/* ── Experience Modal ── */}
      {showExpModal && (
        <div className="pf-modal-overlay" onClick={() => setShowExpModal(false)}>
          <div className="pf-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="exp-modal-title">
            <div className="pf-modal-header">
              <h2 id="exp-modal-title">Ajouter une expérience</h2>
              <button className="pf-modal-close" type="button" onClick={() => setShowExpModal(false)} aria-label="Fermer la fenêtre">×</button>
            </div>
            <div className="pf-modal-body">
              <div className="pf-field"><label htmlFor="exp-title">Poste *</label><input id="exp-title" className="pf-input" value={expForm.title} onChange={e => setExpForm({...expForm, title: e.target.value})} placeholder="Ex : Développeur Frontend" /></div>
              <div className="pf-field"><label htmlFor="exp-company">Entreprise *</label><input id="exp-company" className="pf-input" value={expForm.company} onChange={e => setExpForm({...expForm, company: e.target.value})} placeholder="Ex : Doctolib" /></div>
              <div className="pf-field"><label htmlFor="exp-period">Période</label><input id="exp-period" className="pf-input" value={expForm.period} onChange={e => setExpForm({...expForm, period: e.target.value})} placeholder="Ex : Sept 2023 — Présent" /></div>
              <div className="pf-field"><label htmlFor="exp-description">Description</label><textarea id="exp-description" className="pf-input pf-textarea" rows={3} value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} placeholder="Vos missions et réalisations..." /></div>
            </div>
            <div className="pf-modal-footer">
              <button className="btn-ghost" onClick={() => setShowExpModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={addExp} disabled={!expForm.title || !expForm.company}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Education Modal ── */}
      {showEduModal && (
        <div className="pf-modal-overlay" onClick={() => setShowEduModal(false)}>
          <div className="pf-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edu-modal-title">
            <div className="pf-modal-header">
              <h2 id="edu-modal-title">Ajouter une formation</h2>
              <button className="pf-modal-close" type="button" onClick={() => setShowEduModal(false)} aria-label="Fermer la fenêtre">×</button>
            </div>
            <div className="pf-modal-body">
              <div className="pf-field"><label htmlFor="edu-degree">Diplôme / Formation *</label><input id="edu-degree" className="pf-input" value={eduForm.degree} onChange={e => setEduForm({...eduForm, degree: e.target.value})} placeholder="Ex : Bachelor Informatique" /></div>
              <div className="pf-field"><label htmlFor="edu-school">École / Université *</label><input id="edu-school" className="pf-input" value={eduForm.school} onChange={e => setEduForm({...eduForm, school: e.target.value})} placeholder="Ex : Epitech" /></div>
              <div className="pf-field"><label htmlFor="edu-period">Période</label><input id="edu-period" className="pf-input" value={eduForm.period} onChange={e => setEduForm({...eduForm, period: e.target.value})} placeholder="Ex : 2022 — 2025" /></div>
            </div>
            <div className="pf-modal-footer">
              <button className="btn-ghost" onClick={() => setShowEduModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={addEdu} disabled={!eduForm.degree || !eduForm.school}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
};

export default Profile;
