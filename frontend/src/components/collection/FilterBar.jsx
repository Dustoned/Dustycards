import { Select } from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import useStore from '../../store/useStore.js';
import { useSets } from '../../hooks/useSets.js';
import clsx from 'clsx';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'single', label: 'Singles' },
  { value: 'sealed', label: 'Sealed' },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'Any Condition' },
  { value: 'Mint', label: 'Mint' },
  { value: 'Near Mint', label: 'Near Mint' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Light Played', label: 'Light Played' },
  { value: 'Played', label: 'Played' },
  { value: 'Poor', label: 'Poor' },
];

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Any Language' },
  { value: 'EN', label: 'English' },
  { value: 'JP', label: 'Japanese' },
  { value: 'DE', label: 'German' },
  { value: 'FR', label: 'French' },
  { value: 'ES', label: 'Spanish' },
  { value: 'IT', label: 'Italian' },
  { value: 'PT', label: 'Portuguese' },
  { value: 'KO', label: 'Korean' },
  { value: 'ZH', label: 'Chinese' },
];

const SORT_OPTIONS = [
  { value: 'added_desc', label: 'Newest First' },
  { value: 'added_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'purchase_price_desc', label: 'Price High–Low' },
  { value: 'purchase_price_asc', label: 'Price Low–High' },
];

export default function FilterBar() {
  const { filters, setFilter, resetFilters } = useStore();
  const { sets } = useSets();

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.set_code !== '' ||
    filters.condition !== '' ||
    filters.language !== '';

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Category"
        value={filters.category}
        onChange={(e) => setFilter('category', e.target.value)}
        className="min-w-[140px]"
      >
        {CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      <Select
        label="Set"
        value={filters.set_code}
        onChange={(e) => setFilter('set_code', e.target.value)}
        className="min-w-[180px]"
      >
        <option value="">All Sets</option>
        {sets.map((s) => (
          <option key={s.code || s.id} value={s.code || s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      <Select
        label="Condition"
        value={filters.condition}
        onChange={(e) => setFilter('condition', e.target.value)}
        className="min-w-[160px]"
      >
        {CONDITION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      <Select
        label="Language"
        value={filters.language}
        onChange={(e) => setFilter('language', e.target.value)}
        className="min-w-[140px]"
      >
        {LANGUAGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      <Select
        label="Sort"
        value={filters.sort}
        onChange={(e) => setFilter('sort', e.target.value)}
        className="min-w-[160px]"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      {hasActiveFilters && (
        <div className="flex items-end">
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
