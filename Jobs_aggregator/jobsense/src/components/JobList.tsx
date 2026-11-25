import React, { useState, useEffect, useMemo } from 'react';
import JobCard from './JobCard';
import type { NormalizedJob } from '../utils/jobModel';
import { sortJobs, type SortKey } from '../utils/jobModel';

const nf = new Intl.NumberFormat('fr-FR');

interface JobListProps {
  jobs?: NormalizedJob[];
  loading?: boolean;
  savedIds?: string[];
  onLoadMore?: () => void;
  onOpenJob?: (jobId: string) => void;
  onSaveJob?: (jobId: string, job?: NormalizedJob) => void;
}

const JobList: React.FC<JobListProps> = ({ jobs = [], loading = false, savedIds = [], onLoadMore, onOpenJob, onSaveJob }) => {
  const [displayCount, setDisplayCount] = useState(10);
  const [sortBy, setSortBy] = useState<SortKey>('relevance');

  const sorted = useMemo(() => sortJobs(jobs, sortBy), [jobs, sortBy]);

  const displayJobs = sorted.slice(0, displayCount);

  useEffect(() => {
    setDisplayCount(10);
  }, [jobs, sortBy]);

  return (
    <main id="main-content" tabIndex={-1}>
      <h2 className="sr-only">Résultats de recherche</h2>
      <div className="jobs-header">
        <div className="jobs-count" aria-live="polite">
          <strong>{nf.format(jobs.length)}</strong> offres trouvées
        </div>
        <label className="sr-only" htmlFor="job-sort">Trier les offres</label>
        <select
          id="job-sort"
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
        >
          <option value="relevance">Pertinence</option>
          <option value="recent">Plus récent</option>
          <option value="salary">Salaire décroissant</option>
        </select>
      </div>

      {loading ? (
        <div className="jobs-loading" role="status">Chargement des offres…</div>
      ) : displayJobs.length === 0 ? (
        <div className="jobs-loading" role="status">
          Aucune offre WeLoveDevs. Vérifiez WELOVEDEVS_API_KEY dans backend/.env puis lancez une synchronisation.
        </div>
      ) : (
        <div className="job-list" aria-label="Liste des offres">
          {displayJobs.map((job) => (
            <JobCard
              key={job.id}
              {...job}
              isSaved={savedIds.includes(job.id)}
              onSave={() => onSaveJob?.(job.id, job)}
              onApply={() => onOpenJob?.(job.id)}
              onOpen={() => onOpenJob?.(job.id)}
            />
          ))}
        </div>
      )}

      {displayJobs.length < sorted.length && (
        <button
          type="button"
          className="load-more"
          onClick={() => {
            setDisplayCount((prev) => prev + 10);
            onLoadMore?.();
          }}
        >
          Charger plus d'offres
        </button>
      )}
    </main>
  );
};

export default JobList;
