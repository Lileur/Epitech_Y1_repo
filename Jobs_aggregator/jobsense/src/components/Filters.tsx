import React from 'react';
import type { FilterState } from '../utils/jobModel';

export type { FilterState } from '../utils/jobModel';

const nf = new Intl.NumberFormat('fr-FR');

interface FiltersProps {
  facetCounts: {
    contract: Record<string, number>;
    workMode: Record<string, number>;
    experience: Record<string, number>;
  };
  value: FilterState;
  onChange: (filters: FilterState) => void;
  onApply?: () => void;
}

const Filters: React.FC<FiltersProps> = ({ facetCounts, value: filters, onChange, onApply }) => {
  const handleCheckbox = (group: keyof Omit<FilterState, 'salaryMin' | 'salaryMax'>, option: string) => {
    const cur = filters[group] as string[];
    const updated = {
      ...filters,
      [group]: cur.includes(option) ? cur.filter((i) => i !== option) : [...cur, option],
    };
    onChange(updated);
  };

  const applySalary = (partial: Partial<Pick<FilterState, 'salaryMin' | 'salaryMax'>>) => {
    let salaryMin = partial.salaryMin ?? filters.salaryMin;
    let salaryMax = partial.salaryMax ?? filters.salaryMax;
    if (salaryMin > salaryMax) {
      if (partial.salaryMin !== undefined) salaryMax = salaryMin;
      else salaryMin = salaryMax;
    }
    onChange({ ...filters, salaryMin, salaryMax });
  };

  return (
    <aside className="sidebar-left" aria-label="Filtres des offres">
      <div className="card">
        <div className="card-title">Filtres</div>

        <fieldset className="filter-group">
          <legend className="filter-label">Contrat</legend>
          {[
            { label: 'CDI' as const },
            { label: 'Stage' as const },
            { label: 'Alternance' as const },
            { label: 'Freelance' as const },
          ].map((item) => (
            <label key={item.label} className="filter-option">
              <input
                type="checkbox"
                checked={filters.contractTypes.includes(item.label)}
                onChange={() => handleCheckbox('contractTypes', item.label)}
              />
              {item.label}
              <span className="filter-count">{nf.format(facetCounts.contract[item.label] ?? 0)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-group">
          <legend className="filter-label">Télétravail</legend>
          {[
            { label: 'Remote' as const },
            { label: 'Hybride' as const },
            { label: 'Présentiel' as const },
          ].map((item) => (
            <label key={item.label} className="filter-option">
              <input
                type="checkbox"
                checked={filters.workModes.includes(item.label)}
                onChange={() => handleCheckbox('workModes', item.label)}
              />
              {item.label}
              <span className="filter-count">{nf.format(facetCounts.workMode[item.label] ?? 0)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-group">
          <legend className="filter-label">Salaire (k€/an)</legend>
          <div className="salary-range">
            <label htmlFor="salary-min" style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Min.</label>
            <input
              id="salary-min"
              type="range"
              min="25"
              max="120"
              aria-valuetext={`${filters.salaryMin} milliers d'euros par an minimum`}
              value={filters.salaryMin}
              onChange={(e) => applySalary({ salaryMin: parseInt(e.target.value, 10) })}
            />
            <label htmlFor="salary-max" style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginTop: 8, marginBottom: 4 }}>Max.</label>
            <input
              id="salary-max"
              type="range"
              min="25"
              max="120"
              aria-valuetext={`${filters.salaryMax} milliers d'euros par an maximum`}
              value={filters.salaryMax}
              onChange={(e) => applySalary({ salaryMax: parseInt(e.target.value, 10) })}
            />
            <div className="salary-labels">
              <span>{filters.salaryMin}k€</span>
              <span>{filters.salaryMax}k€</span>
            </div>
          </div>
        </fieldset>

        <fieldset className="filter-group">
          <legend className="filter-label">Expérience</legend>
          {[
            { label: 'Junior (0–2 ans)' as const },
            { label: 'Confirmé (2–5)' as const },
            { label: 'Senior (5+)' as const },
          ].map((item) => (
            <label key={item.label} className="filter-option">
              <input
                type="checkbox"
                checked={filters.experience.includes(item.label)}
                onChange={() => handleCheckbox('experience', item.label)}
              />
              {item.label}
              <span className="filter-count">{nf.format(facetCounts.experience[item.label] ?? 0)}</span>
            </label>
          ))}
        </fieldset>

        <button
          type="button"
          className="filter-apply"
          onClick={() => {
            onApply?.();
          }}
        >
          Appliquer
        </button>
      </div>
    </aside>
  );
};

export default Filters;
