import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import SearchBar from '../components/search/SearchBar.jsx';
import Button from '../components/ui/Button.jsx';
import { useExpansion, useExpansions } from '../hooks/useExpansions.js';
import { OFFICIAL_ENGLISH_SET_DEFS, OFFICIAL_JAPANESE_SET_DEFS } from '../constants/officialSets.js';

function formatPrice(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeSetName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanProductName(name) {
  return String(name || '').replace(/\s*\[.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildCardmarketOpenUrl(expansionId, productId) {
  return `/api/expansions/${encodeURIComponent(expansionId)}/products/${encodeURIComponent(productId)}/open`;
}

function splitEraAndName(label) {
  const patterns = [
    { prefix: 'SWSH ', era: 'Sword & Shield Series' },
    { prefix: 'SV ', era: 'Scarlet & Violet Series' },
    { prefix: 'SM ', era: 'Sun & Moon Series' },
    { prefix: 'XY ', era: 'XY Series' },
    { prefix: 'BW ', era: 'Black & White Series' },
    { prefix: 'DP ', era: 'Diamond & Pearl Series' },
    { prefix: 'HGSS ', era: 'HeartGold & SoulSilver Series' },
    { prefix: 'Platinum ', era: 'Platinum Series' },
    { prefix: 'EX ', era: 'EX Series' },
  ];

  for (const pattern of patterns) {
    if (label.startsWith(pattern.prefix)) {
      return {
        era: pattern.era,
        name: label.slice(pattern.prefix.length).trim(),
      };
    }
  }

  const exactEras = new Set([
    'Base Set',
    'Jungle',
    'Fossil',
    'Base Set 2',
    'Team Rocket',
    'Gym Heroes',
    'Gym Challenge',
    'Neo Genesis',
    'Neo Discovery',
    'Neo Revelation',
    'Neo Destiny',
    'Legendary Collection',
    'Expedition Base Set',
    'Aquapolis',
    'Skyridge',
    'Sword & Shield',
    'Sun & Moon',
    'Scarlet & Violet',
    'Black & White',
    'Diamond & Pearl',
    'HeartGold & SoulSilver',
    'Platinum',
  ]);

  if (exactEras.has(label)) {
    const exactEraMap = {
      'Base Set': 'Base Era',
      Jungle: 'Base Era',
      Fossil: 'Base Era',
      'Base Set 2': 'Base Era',
      'Team Rocket': 'Base Era',
      'Gym Heroes': 'Base Era',
      'Gym Challenge': 'Base Era',
      'Neo Genesis': 'Neo Era',
      'Neo Discovery': 'Neo Era',
      'Neo Revelation': 'Neo Era',
      'Neo Destiny': 'Neo Era',
      'Legendary Collection': 'Neo Era',
      'Expedition Base Set': 'e-Card Era',
      Aquapolis: 'e-Card Era',
      Skyridge: 'e-Card Era',
      'Sword & Shield': 'Sword & Shield Series',
      'Sun & Moon': 'Sun & Moon Series',
      'Scarlet & Violet': 'Scarlet & Violet Series',
      'Black & White': 'Black & White Series',
      'Diamond & Pearl': 'Diamond & Pearl Series',
      'HeartGold & SoulSilver': 'HeartGold & SoulSilver Series',
      Platinum: 'Platinum Series',
    };
    return { era: exactEraMap[label] || null, name: label };
  }

  return { era: null, name: label };
}

function getEnglishEraByIndex(index) {
  if (index <= 6) return 'Base Era';
  if (index <= 11) return 'Neo Era';
  if (index <= 14) return 'e-Card Era';
  if (index <= 31) return 'EX Series';
  if (index <= 38) return 'Diamond & Pearl Series';
  if (index <= 42) return 'Platinum Series';
  if (index <= 47) return 'HeartGold & SoulSilver Series';
  if (index <= 58) return 'Black & White Series';
  if (index <= 71) return 'XY Series';
  if (index <= 87) return 'Sun & Moon Series';
  if (index <= 105) return 'Sword & Shield Series';
  return 'Scarlet & Violet Series';
}

function dedupeByDisplayName(items) {
  const byName = new Map();
  for (const item of items) {
    const key = item.displayName || item.name;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, item);
      continue;
    }

    const currentScore = (item.totalProducts || 0) + (item.totalSingles || 0);
    const existingScore = (existing.totalProducts || 0) + (existing.totalSingles || 0);
    const currentMetaScore = (item.eraLabel ? 10 : 0) + (item.orderIndex != null ? 10 : 0);
    const existingMetaScore = (existing.eraLabel ? 10 : 0) + (existing.orderIndex != null ? 10 : 0);

    if (currentScore > existingScore || (currentScore === existingScore && currentMetaScore > existingMetaScore)) {
      byName.set(key, item);
    } else if (currentScore === existingScore && existingMetaScore === currentMetaScore) {
      byName.set(key, {
        ...existing,
        eraLabel: existing.eraLabel || item.eraLabel,
        orderIndex: existing.orderIndex ?? item.orderIndex,
        displayName: existing.displayName || item.displayName,
      });
    }
  }
  return [...byName.values()];
}

function getEffectiveLow(pricing) {
  return pricing?.low ?? pricing?._localGuideLow ?? null;
}

function getEffectiveSortValue(item, sort) {
  if (sort === 'price_desc' || sort === 'price_asc') {
    return getEffectiveLow(item.pricing) ?? item.pricing?.trend ?? -Infinity;
  }
  return item.name || '';
}

function categorizeOtherExpansion(item) {
  const name = String(item?.name || item?.displayName || '').toLowerCase();
  const singles = Number(item?.totalSingles || 0);
  const sealed = Number(item?.totalSealed || 0);

  if (/\bpromo|promos\b/.test(name)) return 'Promos';
  if (/\blive code|code card|online code|tcg live\b/.test(name)) return 'Live Codes';
  if (/\bdeck|starter|theme deck|battle deck|half deck|quarter deck|vs pack|gift set\b/.test(name)) return 'Decks & Kits';
  if (/\btin|mini tin|collector chest|chest\b/.test(name)) return 'Tins & Chests';
  if (/\bbox|box set|booster box|elite trainer box|etb|premium trainer box|golden box|build box\b/.test(name)) return 'Boxes';
  if (/\bcollection|premium collection|ultra premium collection|super premium collection|special set|bundle|blister|pack\b/.test(name)) {
    return 'Collections & Bundles';
  }
  if (singles > 0 && sealed === 0) return 'Singles & Side Sets';
  if (sealed > 0 && singles === 0) return 'Sealed Products';
  return 'Miscellaneous';
}

export default function Expansions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expansionQuery, setExpansionQuery] = useState(searchParams.get('q') || '');
  const [itemQuery, setItemQuery] = useState(searchParams.get('cards') || '');

  const selectedId = searchParams.get('id') || '';
  const rawCategory = searchParams.get('category') || 'single';
  const category = rawCategory === 'sealed' ? 'sealed' : 'single';
  const rawTab = searchParams.get('tab') || 'english';
  const tab = ['english', 'japanese', 'other'].includes(rawTab) ? rawTab : 'english';
  const sort = searchParams.get('sort') || 'price_desc';

  const { expansions, total, isLoading, isError, error } = useExpansions(expansionQuery.trim());
  const { expansion, items, total: itemTotal, isLoading: isExpansionLoading, isError: isExpansionError, error: expansionError } =
    useExpansion(selectedId, itemQuery.trim(), category);

  const normalizedEnglishOrder = useMemo(() => {
    return OFFICIAL_ENGLISH_SET_DEFS.map((entry, index) => ({
      label: entry.label,
      index,
      era: entry.era || getEnglishEraByIndex(index),
      aliases: entry.aliases.map(normalizeSetName),
    }));
  }, []);

  const normalizedJapaneseOrder = useMemo(() => {
    return OFFICIAL_JAPANESE_SET_DEFS.map((entry, index) => ({
      label: entry.label,
      index,
      era: entry.era || null,
      aliases: entry.aliases.map(normalizeSetName),
    }));
  }, []);

  const groupedExpansions = useMemo(() => {
    const english = [];
    const japanese = [];
    const other = [];

    for (const expansion of expansions) {
      const normalizedName = normalizeSetName(expansion.name);
      const isLiveCode = /\b(live code|code card|online code|tcg live)\b/i.test(expansion.name);
      const englishMatch = isLiveCode
        ? null
        : normalizedEnglishOrder.find((entry) => entry.aliases.includes(normalizedName));
      const japaneseMatch = isLiveCode || englishMatch
        ? null
        : normalizedJapaneseOrder.find((entry) => entry.aliases.includes(normalizedName));

      if (englishMatch) {
        const split = splitEraAndName(englishMatch.label);
        english.push({
          ...expansion,
          orderIndex: englishMatch.index,
          displayName: split.name,
          eraLabel: englishMatch.era || split.era,
        });
      } else if (japaneseMatch) {
        japanese.push({
          ...expansion,
          orderIndex: japaneseMatch.index,
          displayName: japaneseMatch.label,
          eraLabel: japaneseMatch.era,
        });
      } else {
        other.push(expansion);
      }
    }

    const uniqueEnglish = dedupeByDisplayName(english).map((item) => ({
      ...item,
      eraLabel: item.eraLabel || getEnglishEraByIndex(item.orderIndex),
    }));
    const uniqueJapanese = dedupeByDisplayName(japanese);

    uniqueEnglish.sort((a, b) => b.orderIndex - a.orderIndex);
    uniqueJapanese.sort((a, b) => a.orderIndex - b.orderIndex);
    other.sort((a, b) => {
      if (b.totalProducts !== a.totalProducts) return b.totalProducts - a.totalProducts;
      return a.name.localeCompare(b.name);
    });

    return { english: uniqueEnglish, japanese: uniqueJapanese, other };
  }, [expansions, normalizedEnglishOrder, normalizedJapaneseOrder]);

  const visibleExpansions = groupedExpansions[tab];
  const groupedVisibleExpansions = useMemo(() => {
    if (tab === 'other') {
      const sectionOrder = [
        'Singles & Side Sets',
        'Promos',
        'Decks & Kits',
        'Boxes',
        'Collections & Bundles',
        'Tins & Chests',
        'Sealed Products',
        'Live Codes',
        'Miscellaneous',
      ];
      const buckets = new Map(sectionOrder.map((heading) => [heading, []]));

      for (const item of visibleExpansions) {
        const heading = categorizeOtherExpansion(item);
        if (!buckets.has(heading)) buckets.set(heading, []);
        buckets.get(heading).push(item);
      }

      return [...buckets.entries()]
        .filter(([, items]) => items.length > 0)
        .map(([heading, items]) => ({ heading, items }));
    }

    const sections = [];
    let currentSection = null;

    for (const item of visibleExpansions) {
      const heading = item.eraLabel || 'Unknown Era';
      if (!currentSection || currentSection.heading !== heading) {
        currentSection = { heading, items: [] };
        sections.push(currentSection);
      }
      currentSection.items.push(item);
    }

    return sections;
  }, [tab, visibleExpansions]);

  const selectedExpansion = useMemo(() => (
    visibleExpansions.find((candidate) => String(candidate.idExpansion) === String(selectedId)) || expansion
  ), [expansion, selectedId, visibleExpansions]);

  const sortedItems = useMemo(() => {
    const next = [...items];
    next.sort((a, b) => {
      if (sort === 'price_desc') {
        return (getEffectiveSortValue(b, sort) ?? -Infinity) - (getEffectiveSortValue(a, sort) ?? -Infinity);
      }
      if (sort === 'price_asc') {
        return (getEffectiveSortValue(a, sort) ?? Infinity) - (getEffectiveSortValue(b, sort) ?? Infinity);
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return next;
  }, [items, sort]);

  function updateParams(next) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  }

  function handleExpansionSearch(value) {
    setExpansionQuery(value);
    updateParams({ q: value || null });
  }

  function handleItemSearch(value) {
    setItemQuery(value);
    updateParams({ cards: value || null });
  }

  function handleSelectExpansion(id) {
    updateParams({ id: String(id), cards: itemQuery || null });
  }

  function handleCategoryChange(value) {
    updateParams({ category: value });
  }

  function handleSortChange(value) {
    updateParams({ sort: value === 'price_desc' ? null : value });
  }

  function handleTabChange(value) {
    const nextVisible = groupedExpansions[value];
    const selectedStillVisible = nextVisible.some((candidate) => String(candidate.idExpansion) === String(selectedId));
    updateParams({
      tab: value === 'english' ? null : value,
      id: selectedStillVisible ? selectedId : null,
    });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={expansionQuery}
          onChange={handleExpansionSearch}
          onClear={() => handleExpansionSearch('')}
          placeholder={
            tab === 'english'
              ? 'Search English sets...'
              : tab === 'japanese'
              ? 'Search Japanese sets...'
              : 'Search other expansions...'
          }
          className="flex-1"
        />
        <div className="min-w-44 rounded-xl border border-subtle bg-card px-4 py-3">
          <div className="text-xs uppercase tracking-[0.16em] text-text-muted">
            {tab === 'english' ? 'English Sets' : tab === 'japanese' ? 'Japanese Sets' : 'Other Expansions'}
          </div>
          <div className="mt-1 text-lg font-semibold text-text-primary">
            {isLoading ? '…' : visibleExpansions.length}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-subtle bg-card overflow-hidden">
          <div className="border-b border-subtle px-4 py-3">
            <div className="flex items-center gap-1 rounded-lg bg-elevated p-1">
              <button
                onClick={() => handleTabChange('english')}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                  tab === 'english'
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card',
                )}
              >
                English
              </button>
              <button
                onClick={() => handleTabChange('japanese')}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                  tab === 'japanese'
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card',
                )}
              >
                Japanese
              </button>
              <button
                onClick={() => handleTabChange('other')}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                  tab === 'other'
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-card',
                )}
              >
                Other
              </button>
            </div>
            <h2 className="mt-3 text-sm font-semibold text-text-primary">
              {tab === 'english'
                ? 'Official English Sets'
                : tab === 'japanese'
                ? 'Official Japanese Sets'
                : 'Other CardMarket Expansions'}
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              {tab === 'english'
                ? 'Ordered to match the official English set release list from PokeDATA.'
                : tab === 'japanese'
                ? 'Separated Japanese sets into their own ordered tab.'
                : 'Everything left over that does not map cleanly to the English or Japanese set lists.'}
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-2">
            {isError && (
              <div className="rounded-xl border border-loss/20 bg-loss/10 p-4 text-sm text-loss">
                {error?.message || 'Failed to load expansions.'}
              </div>
            )}

            {!isError && visibleExpansions.length === 0 && !isLoading && (
              <div className="rounded-xl border border-subtle bg-elevated p-4 text-sm text-text-muted">
                {tab === 'english'
                  ? 'No English sets found for this search.'
                  : tab === 'japanese'
                  ? 'No Japanese sets found for this search.'
                  : 'No extra expansions found for this search.'}
              </div>
            )}

            <div className="space-y-4">
              {groupedVisibleExpansions.map((section) => (
                <div key={section.heading} className="space-y-2">
                  <div className="rounded-xl border border-subtle bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-primary">
                      {section.heading}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {section.items.length} set{section.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {section.items.map((item) => {
                    const isSelected = String(item.idExpansion) === String(selectedId);
                    return (
                      <button
                        key={item.idExpansion}
                        onClick={() => handleSelectExpansion(item.idExpansion)}
                        className={clsx(
                          'w-full rounded-xl border p-3 text-left transition-colors',
                          isSelected
                            ? 'border-accent-primary bg-accent-primary/10'
                            : 'border-subtle bg-elevated hover:border-accent-primary/30 hover:bg-surface'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-text-primary">{item.displayName || item.name}</div>
                          </div>
                          <div className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary">
                            {item.totalProducts}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                          <span>{item.totalSingles} singles</span>
                          <span>•</span>
                          <span>{item.totalSealed} sealed</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-subtle bg-card overflow-hidden">
          {!selectedId ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-2xl bg-elevated p-4 text-accent-primary">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m6-6H6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-text-primary">Open an expansion</h2>
              <p className="mt-2 max-w-md text-sm text-text-muted">
                Pick a set on the left to browse all singles and sealed products we found in your local CardMarket data.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-subtle px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-text-muted">
                      {tab === 'english' ? 'English Set' : tab === 'japanese' ? 'Japanese Set' : 'Expansion'}
                    </div>
                    <h1 className="mt-1 text-2xl font-bold text-text-primary">
                      {selectedExpansion?.displayName || selectedExpansion?.name || 'Loading…'}
                    </h1>
                    {selectedExpansion?.eraLabel && (
                      <p className="mt-1 text-sm text-text-muted">{selectedExpansion.eraLabel}</p>
                    )}
                    {selectedExpansion && (
                      <p className="mt-2 text-sm text-text-muted">
                        {selectedExpansion.totalSingles} singles • {selectedExpansion.totalSealed} sealed • {selectedExpansion.totalProducts} total
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <div className="flex items-center gap-1 rounded-lg bg-elevated p-1">
                      <button
                        onClick={() => handleCategoryChange('single')}
                        className={clsx(
                          'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                          category === 'single'
                            ? 'bg-accent-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary hover:bg-card',
                        )}
                      >
                        Singles
                      </button>
                      <button
                        onClick={() => handleCategoryChange('sealed')}
                        className={clsx(
                          'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                          category === 'sealed'
                            ? 'bg-accent-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary hover:bg-card',
                        )}
                      >
                        Sealed
                      </button>
                    </div>
                    <select
                      value={sort}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                    >
                      <option value="name_asc">Name A-Z</option>
                      <option value="price_desc">Price High-Low</option>
                      <option value="price_asc">Price Low-High</option>
                    </select>
                    <div className="w-full lg:w-80">
                      <SearchBar
                        value={itemQuery}
                        onChange={handleItemSearch}
                        onClear={() => handleItemSearch('')}
                        placeholder="Filter cards in this expansion..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-text-muted">
                    {isExpansionLoading ? 'Loading products…' : `${itemTotal} product${itemTotal !== 1 ? 's' : ''}`}
                  </p>
                  {selectedExpansion && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateParams({ id: null, cards: null, category: 'single' })}
                    >
                      Clear selection
                    </Button>
                  )}
                </div>

                {isExpansionError && (
                  <div className="rounded-xl border border-loss/20 bg-loss/10 p-4 text-sm text-loss">
                    {expansionError?.message || 'Failed to load expansion items.'}
                  </div>
                )}

                {!isExpansionError && (
                  <div className="space-y-3">
                    {sortedItems.map((item) => (
                      <div
                        key={item.idProduct}
                        className="rounded-xl border border-subtle bg-elevated px-4 py-3 transition-colors hover:bg-surface"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={clsx(
                                  'rounded-full px-2.5 py-1 text-xs font-medium',
                                  item.category === 'single'
                                    ? 'bg-accent-primary/15 text-accent-primary'
                                    : 'bg-accent/15 text-accent'
                                )}
                              >
                                {item.category === 'single' ? 'Single' : 'Sealed'}
                              </span>
                              <span className="text-xs text-text-muted">{item.categoryName}</span>
                            </div>
                            <h3 className="mt-2 truncate text-sm font-semibold text-text-primary">
                              {cleanProductName(item.name)}
                            </h3>
                            <a
                              href={buildCardmarketOpenUrl(selectedExpansion?.idExpansion, item.idProduct)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-xs text-accent-primary hover:underline"
                            >
                              Open on CardMarket
                            </a>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[280px] lg:grid-cols-3">
                            <div className="rounded-lg bg-card px-3 py-2">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Trend</div>
                              <div className="mt-1 font-semibold text-text-primary">{formatPrice(item.pricing?.trend)}</div>
                            </div>
                            <div className="rounded-lg bg-card px-3 py-2">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-text-muted">7d Avg</div>
                              <div className="mt-1 font-semibold text-text-primary">{formatPrice(item.pricing?.avg7)}</div>
                            </div>
                            <div className="rounded-lg bg-card px-3 py-2 col-span-2 lg:col-span-1">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Low</div>
                              <div className="mt-1 font-semibold text-text-primary">{formatPrice(getEffectiveLow(item.pricing))}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!isExpansionLoading && sortedItems.length === 0 && (
                      <div className="rounded-xl border border-subtle bg-elevated p-5 text-sm text-text-muted">
                        No products matched this filter in the selected expansion.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
