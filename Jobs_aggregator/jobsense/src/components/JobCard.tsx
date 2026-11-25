import React from 'react';
import { buildJobSummary } from '../utils/jobText';

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  logo: string;
  tags: Array<{ label: string; type: 'remote' | 'salary' | 'type' | 'location' | 'skill' }>;
  salary?: string;
  location: string;
  postedDays: number;
  featured?: boolean;
  description?: string;
  summary?: string;
  isSaved?: boolean;
  onSave?: () => void;
  onApply?: () => void;
  onOpen?: () => void;
}

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const JobCard: React.FC<JobCardProps> = ({
  title,
  company,
  logo,
  tags,
  salary,
  location,
  postedDays,
  description,
  summary,
  isSaved = false,
  onSave,
  onApply,
  onOpen,
}) => {
  const daysLabel = postedDays === 0 ? "Aujourd'hui" : postedDays === 1 ? 'Hier' : `Il y a ${postedDays}j`;
  const excerpt =
    summary?.trim() ||
    buildJobSummary(description) ||
    'Ouvrez la fiche pour lire la description WeLoveDevs complète.';

  const displayTags = tags.slice(0, 6);

  const openFromKeyboard = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen?.();
    }
  };

  return (
    <article
      className="job-card"
      onClick={onOpen}
      onKeyDown={openFromKeyboard}
      role="button"
      tabIndex={0}
      aria-label={`Ouvrir l'offre ${title} chez ${company}`}
    >
      <div className="jc-top">
        <div className="company-logo" aria-hidden>
          {logo}
        </div>
        <div className="jc-info">
          <h3 className="jc-title">{title}</h3>
          <div className="jc-company">{company}</div>
          <p className="jc-summary">{excerpt}</p>
        </div>
        <div className="jc-actions">
          <button
            type="button"
            className={`btn-save ${isSaved ? 'btn-save--saved' : ''}`}
            aria-label={isSaved ? `Retirer ${title} des favoris` : `Sauvegarder ${title}`}
            aria-pressed={isSaved}
            onClick={(e) => {
              e.stopPropagation();
              onSave?.();
            }}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
          <button
            type="button"
            className="btn-apply"
            onClick={(e) => {
              e.stopPropagation();
              onApply?.();
            }}
          >
            Postuler
          </button>
        </div>
      </div>

      {displayTags.length > 0 && (
        <div className="jc-tags">
          {displayTags.map((tag, index) => (
            <span key={`${tag.label}-${index}`} className={`jc-tag jc-tag--${tag.type}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="jc-footer">
        <div className="jc-meta">
          <span className="jc-location">{location}</span>
          <span>{daysLabel}</span>
        </div>
        {salary && <span className="jc-salary">{salary}</span>}
      </div>
    </article>
  );
};

export default JobCard;
