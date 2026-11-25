import React, { useState, useEffect, useCallback } from 'react';
import type { NormalizedJob } from '../utils/jobModel';
import { normalizeJob, getContractBucket, getWorkMode, getExperienceBucket } from '../utils/jobModel';
import { jobsAPI } from '../services/api';
import { applicationsAPI } from '../services/api';
import { buildProfilePayloadFromStorage } from '../utils/profileStorage';
import { stripHtml, buildJobSummary } from '../utils/jobText';

interface OfferDetailPageProps {
  job: NormalizedJob;
  isSaved?: boolean;
  onBack: () => void;
  onSave?: () => void;
  isLoggedIn?: boolean;
  userRole?: 'candidate' | 'recruiter' | 'admin';
  onLoginRequired?: () => void;
}

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const OfferDetailPage: React.FC<OfferDetailPageProps> = ({
  job: initialJob,
  isSaved = false,
  onBack,
  onSave,
  isLoggedIn = false,
  userRole,
  onLoginRequired,
}) => {
  const [job, setJob] = useState<NormalizedJob>(initialJob);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [saved, setSaved] = useState(isSaved);
  const [applying, setApplying] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [applyUrl, setApplyUrl] = useState(initialJob.applyUrl || '');
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  const contract = getContractBucket(job);
  const workMode = getWorkMode(job);
  const experience = getExperienceBucket(job);

  const loadFullJob = useCallback(async () => {
    try {
      setLoadingDetail(true);
      const response = await jobsAPI.getJobDetail(initialJob.id, { refresh: true });
      if (response?.data) {
        const enriched = normalizeJob(response.data as Record<string, unknown>);
        setJob(enriched);
        if (enriched.applyUrl) setApplyUrl(enriched.applyUrl);
      }
    } catch (error) {
      console.error('Failed to load job details:', error);
    } finally {
      setLoadingDetail(false);
    }
  }, [initialJob.id]);

  useEffect(() => {
    void loadFullJob();
  }, [loadFullJob]);

  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved, job.id]);

  const fullDescription =
    job.description && job.description.length > 50
      ? stripHtml(job.description)
      : loadingDetail
        ? 'Chargement de la description depuis WeLoveDevs…'
        : 'Description non disponible pour cette offre.';

  const shortSummary =
    job.summary?.trim() ||
    buildJobSummary(job.description) ||
    (fullDescription.length > 50 ? buildJobSummary(fullDescription) : '');

  const displayTags =
    job.tags?.length > 0
      ? job.tags.map((t) => (typeof t === 'string' ? t : t.label)).filter(Boolean)
      : [contract, workMode, experience].filter(Boolean);

  const handleSave = () => {
    setSaved(!saved);
    onSave?.();
  };

  const handleApply = async () => {
    if (!isLoggedIn || userRole !== 'candidate') {
      onLoginRequired?.();
      return;
    }

    setApplying(true);
    setApplyError('');
    setApplySuccess('');

    try {
      const profile = buildProfilePayloadFromStorage();
      const result = await applicationsAPI.apply(job.id, profile);
      setResumeText(result.resume);
      setApplyUrl(result.applyUrl || applyUrl);
      setApplySuccess(result.message || 'Candidature enregistrée.');
      setShowResumeModal(true);
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Erreur lors de la candidature.');
    } finally {
      setApplying(false);
    }
  };

  const handlePreviewResume = async () => {
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }

    setApplying(true);
    setApplyError('');

    try {
      const profile = buildProfilePayloadFromStorage();
      const result = await applicationsAPI.previewResume(job.id, profile);
      setResumeText(result.resume);
      setApplyUrl(result.applyUrl || applyUrl);
      setShowResumeModal(true);
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Impossible de générer le CV.');
    } finally {
      setApplying(false);
    }
  };

  const copyResume = async () => {
    try {
      await navigator.clipboard.writeText(resumeText);
      setApplySuccess('CV copié dans le presse-papiers.');
    } catch {
      setApplyError('Copie impossible — sélectionnez le texte manuellement.');
    }
  };

  return (
    <main id="main-content" className="offer-detail-page" tabIndex={-1}>
      {showResumeModal && (
        <div className="pf-modal-overlay" onClick={() => setShowResumeModal(false)}>
          <div
            className="pf-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-modal-title"
            style={{ maxWidth: '720px', width: '95%' }}
          >
            <div className="pf-modal-header">
              <h2 id="resume-modal-title">CV & lettre auto-générés</h2>
            </div>
            <div className="pf-modal-body">
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted, #6b7280)' }}>
                Généré automatiquement à partir de votre profil et de l&apos;offre WeLoveDevs.
              </p>
              <textarea
                readOnly
                value={resumeText}
                aria-label="Contenu du CV et de la lettre générés"
                className="pf-input"
                style={{ width: '100%', minHeight: '280px', fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary" onClick={copyResume}>
                  Copier le CV
                </button>
                {applyUrl && (
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                    style={{ display: 'inline-flex', alignItems: 'center' }}
                  >
                    Finaliser sur WeLoveDevs
                  </a>
                )}
                <button type="button" className="btn-ghost" onClick={() => setShowResumeModal(false)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="od-nav">
        <button className="inner-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Retour aux offres
        </button>
      </div>

      <div className="od-layout">
        <div className="od-main">
          <div className="od-hero">
            <div className="od-hero-logo">{job.logo}</div>
            <h1 className="od-title">{job.title}</h1>
            <div className="od-meta-line">
              <span className="od-company">{job.company}</span>
              <span className="od-separator">·</span>
              <span className="od-location">{job.location}</span>
              <span className="od-separator">·</span>
              <span className="od-date">
                {job.postedDays === 0 ? "Aujourd'hui" : `Il y a ${job.postedDays}j`}
              </span>
            </div>
            <span className="od-badge" style={{ marginTop: '0.5rem' }}>
              WeLoveDevs
            </span>
            <div className="od-badges">
              {job.salary && <span className="od-badge od-badge--salary">{job.salary}</span>}
              <span className="od-badge">{contract}</span>
              <span className="od-badge">{workMode}</span>
              <span className="od-badge">{experience}</span>
            </div>
          </div>

          {displayTags.length > 0 && (
            <div className="od-insight-card">
              <div className="od-insight-header">
                <h2>Mots-clés de l&apos;offre</h2>
              </div>
              <div className="od-insight-tags">
                {displayTags.map((t) => (
                  <span key={t} className="od-insight-tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {shortSummary && (
            <div className="od-summary-card">
              <h2>Résumé</h2>
              <p className="od-summary-text">{shortSummary}</p>
            </div>
          )}

          <div className="od-description-card">
            <h2>Description WeLoveDevs</h2>
            {loadingDetail ? (
              <p className="od-description-content od-description-content--loading">
                Chargement des détails depuis WeLoveDevs…
              </p>
            ) : (
              <div className="od-description-content">{fullDescription}</div>
            )}
          </div>
        </div>

        <aside className="od-sidebar">
          <div className="od-action-card">
            <div className="od-action-company">{job.company}</div>
            <div className="od-action-salary">{job.salary || 'Salaire non communiqué'}</div>

            {applyError && (
              <p className="form-error" role="alert" style={{ marginBottom: '0.75rem' }}>
                {applyError}
              </p>
            )}
            {applySuccess && !showResumeModal && (
              <p role="status" style={{ color: 'var(--green, #16a34a)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                {applySuccess}
              </p>
            )}

            <button
              type="button"
              className="od-apply-btn"
              onClick={handleApply}
              disabled={applying || loadingDetail}
            >
              {applying ? 'Génération du CV…' : 'Postuler avec CV auto'}
            </button>

            <button
              type="button"
              className="od-save-btn"
              onClick={handlePreviewResume}
              disabled={applying || loadingDetail}
              style={{ marginTop: '0.5rem' }}
            >
              Prévisualiser le CV
            </button>

            {applyUrl && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ display: 'block', textAlign: 'center', marginTop: '0.5rem' }}
              >
                Voir sur WeLoveDevs
              </a>
            )}

            <button
              type="button"
              className={`od-save-btn ${saved ? 'od-save-btn--active' : ''}`}
              onClick={handleSave}
              aria-pressed={saved}
              style={{ marginTop: '0.75rem' }}
            >
              <BookmarkIcon filled={saved} />
              {saved ? 'Retiré des favoris' : "Sauvegarder l'offre"}
            </button>

            <p className="od-action-disclaimer">
              Offre exclusive WeLoveDevs. Le CV est généré depuis votre profil JobSense et les détails de
              l&apos;offre.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default OfferDetailPage;
