import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings.js';
import Button from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { CONDITION_CODES, CONDITION_OPTION_LABELS } from '../constants/cardConditions.js';
import clsx from 'clsx';

function Section({ title, description, children }) {
  return (
    <div className="bg-surface border border-subtle rounded-2xl p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {description && <p className="text-sm text-text-muted mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-subtle last:border-0">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function CardSizePreview({ size, selected, onClick }) {
  const heights = { sm: 'h-16', md: 'h-20', lg: 'h-24', xl: 'h-28' };
  const widths = { sm: 'w-11', md: 'w-14', lg: 'w-16', xl: 'w-20' };

  return (
    <button
      onClick={() => onClick(size)}
      className={clsx(
        'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150',
        selected
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-subtle bg-elevated hover:border-accent-primary/40',
      )}
    >
      <div
        className={clsx(
          'rounded-lg bg-card border border-subtle',
          heights[size],
          widths[size],
        )}
      />
      <span className={clsx('text-xs font-medium uppercase', selected ? 'text-accent-primary' : 'text-text-muted')}>
        {size}
      </span>
    </button>
  );
}

export default function Settings() {
  const { settings, isLoading, updateSettings, isUpdating, updateError } = useSettings();

  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) {
      setForm({ ...settings });
    }
  }, [settings]);

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    try {
      await updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      {/* Pricing */}
      <Section
        title="Pricing"
        description="Configure how card prices are displayed throughout the app."
      >
        <SettingRow
          label="Price Source"
          description="Which marketplace to use for market prices."
        >
          <Select
            value={form.priceSource}
            onChange={(e) => setField('priceSource', e.target.value)}
            className="w-48"
          >
            <option value="tcgplayer">TCGPlayer</option>
            <option value="cardmarket">CardMarket</option>
          </Select>
        </SettingRow>

        <SettingRow
          label="Price Type"
          description="Which price point to show as the primary price."
        >
          <Select
            value={form.priceType}
            onChange={(e) => setField('priceType', e.target.value)}
            className="w-48"
          >
            <option value="market">Market Price</option>
            <option value="low">Low Price</option>
            <option value="mid">Mid Price</option>
            <option value="trend">Trend Price</option>
          </Select>
        </SettingRow>

        <SettingRow
          label="Currency"
          description="Display currency for prices."
        >
          <Select
            value={form.currency}
            onChange={(e) => setField('currency', e.target.value)}
            className="w-48"
          >
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
          </Select>
        </SettingRow>
      </Section>

      {/* Display */}
      <Section
        title="Display"
        description="Customize how cards are shown in your collection."
      >
        <SettingRow
          label="Card Size"
          description="Adjusts the grid density in Binder view."
        >
          <div className="flex items-center gap-2">
            {['sm', 'md', 'lg', 'xl'].map((size) => (
              <CardSizePreview
                key={size}
                size={size}
                selected={form.cardSize === size}
                onClick={(s) => setField('cardSize', s)}
              />
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* Defaults */}
      <Section
        title="Collection Defaults"
        description="Default values when adding new cards to your collection."
      >
        <SettingRow
          label="Default Condition"
          description="Pre-selected condition when adding cards."
        >
          <Select
            value={form.defaultCondition}
            onChange={(e) => setField('defaultCondition', e.target.value)}
            className="w-48"
          >
            {CONDITION_CODES.map((c) => (
              <option key={c} value={c}>{CONDITION_OPTION_LABELS[c]}</option>
            ))}
          </Select>
        </SettingRow>

        <SettingRow
          label="Default Language"
          description="Pre-selected language when adding cards."
        >
          <Select
            value={form.defaultLanguage}
            onChange={(e) => setField('defaultLanguage', e.target.value)}
            className="w-48"
          >
            {[
              { value: 'EN', label: 'English' },
              { value: 'JP', label: 'Japanese' },
              { value: 'DE', label: 'German' },
              { value: 'FR', label: 'French' },
              { value: 'ES', label: 'Spanish' },
              { value: 'IT', label: 'Italian' },
              { value: 'PT', label: 'Portuguese' },
              { value: 'KO', label: 'Korean' },
              { value: 'ZH', label: 'Chinese' },
            ].map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </Select>
        </SettingRow>
      </Section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={isUpdating}
        >
          Save Settings
        </Button>

        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-gain animate-fade-in">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved!
          </span>
        )}

        {updateError && (
          <span className="text-sm text-loss">{updateError.message}</span>
        )}
      </div>

      {/* About */}
      <div className="bg-surface border border-subtle rounded-2xl p-6">
        <h2 className="text-base font-semibold text-text-primary mb-3">About DustyCards</h2>
        <div className="space-y-2 text-sm text-text-muted">
          <p>Version 1.0.0</p>
          <p>
            Pricing data provided by{' '}
            <a
              href="https://api.pokewallet.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              PokéWallet API
            </a>
          </p>
          <p className="text-xs">
            Pokémon and all related names are trademarks of Nintendo / Creatures Inc. / GAME FREAK inc.
            This app is not affiliated with or endorsed by The Pokémon Company.
          </p>
        </div>
      </div>
    </div>
  );
}
