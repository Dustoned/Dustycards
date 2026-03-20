import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import CardImage from '../cards/CardImage.jsx';
import Button from '../ui/Button.jsx';
import Input, { Select, Textarea } from '../ui/Input.jsx';
import Badge from '../ui/Badge.jsx';
import { useCollectionMutations } from '../../hooks/useCollection.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useDisplayPrice, PRICE_TYPE_LABELS } from '../../hooks/useDisplayPrice.js';
import { CONDITION_CODES, CONDITION_OPTION_LABELS } from '../../constants/cardConditions.js';
import { format } from 'date-fns';

function formatPrice(value) {
  if (value == null || isNaN(value)) return '—';
  return `$${Number(value).toFixed(2)}`;
}

const LANGUAGES = ['EN', 'JP', 'DE', 'FR', 'ES', 'IT', 'PT', 'KO', 'ZH'];

export default function AddToCollectionModal({ card, isOpen, onClose }) {
  const { settings } = useSettings();
  const getPrice = useDisplayPrice();
  const { addItem, isAdding } = useCollectionMutations();
  const isSealed = card?.category_hint === 'sealed';

  const [form, setForm] = useState({
    quantity: 1,
    condition: settings.defaultCondition || 'Near Mint',
    language: settings.defaultLanguage || 'EN',
    purchase_price: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    category: card?.category_hint || 'single',
    variant: card?.variant || '',
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  if (!card) return null;

  const priceType = settings.priceType || 'market';
  const marketPrice = getPrice(card.pricing);
  const priceLabel = PRICE_TYPE_LABELS[priceType] || 'Price';

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  }

  function validate() {
    const e = {};
    if (!form.quantity || form.quantity < 1) e.quantity = 'Must be at least 1';
    if (form.purchase_price !== '' && isNaN(parseFloat(form.purchase_price))) {
      e.purchase_price = 'Must be a valid number';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      pokewallet_card_id: card.id,
      name: card.name,
      set_name: card.set_name,
      set_code: card.set_code,
      number: card.number,
      image_url: card.image_url,
      quantity: parseInt(form.quantity, 10),
      condition: form.condition,
      language: form.language,
      purchase_price: form.purchase_price !== '' ? parseFloat(form.purchase_price) : 0,
      purchase_date: form.purchase_date,
      notes: form.notes,
      category: form.category,
      variant: form.variant || card.variant || '',
      product_type: card.product_type || null,
    };

    try {
      await addItem(payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to add to collection' });
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Collection" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-5 p-5">
          {/* Card preview */}
          <div className="flex-shrink-0 sm:w-40">
            <CardImage
              src={card.image_url}
              alt={card.name}
              rounded="rounded-xl"
              className={isSealed ? 'w-full shadow-lg bg-card' : 'w-full shadow-lg'}
              imgClassName={isSealed ? 'p-4' : ''}
              aspectRatio={isSealed ? '1 / 1' : '5 / 7'}
              fit={isSealed ? 'contain' : 'cover'}
            />
            {marketPrice != null && (
              <div className="text-center mt-2">
                <p className="text-xs text-text-muted">{priceLabel}</p>
                <p className="text-sm font-bold text-text-primary">{formatPrice(marketPrice)}</p>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="flex-1 space-y-4">
            {/* Card info */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant={card.category_hint === 'sealed' ? 'sealed' : 'single'}>
                  {card.category_hint}
                </Badge>
              </div>
              <p className="font-semibold text-text-primary">{card.name}</p>
              <p className="text-sm text-text-muted">
                {card.set_name}
                {card.number ? ` · #${card.number}` : ''}
              </p>
            </div>

            {/* Category override */}
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
            >
              <option value="single">Single</option>
              <option value="sealed">Sealed</option>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                id="qty"
                name="quantity"
                type="number"
                min="1"
                max="9999"
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
                error={errors.quantity}
              />
              <Input
                label="Purchase Price"
                id="purchase_price"
                name="purchase_price"
                type="number"
                step="0.01"
                min="0"
                prefix="$"
                placeholder={marketPrice ? marketPrice.toFixed(2) : '0.00'}
                value={form.purchase_price}
                onChange={(e) => setField('purchase_price', e.target.value)}
                error={errors.purchase_price}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Condition"
                value={form.condition}
                onChange={(e) => setField('condition', e.target.value)}
              >
                {CONDITION_CODES.map((c) => (
                  <option key={c} value={c}>{CONDITION_OPTION_LABELS[c]}</option>
                ))}
              </Select>
              <Select
                label="Language"
                value={form.language}
                onChange={(e) => setField('language', e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Purchase Date"
                type="date"
                value={form.purchase_date}
                onChange={(e) => setField('purchase_date', e.target.value)}
              />
              <Input
                label="Variant"
                placeholder="Normal, Holo, 1st Ed..."
                value={form.variant}
                onChange={(e) => setField('variant', e.target.value)}
              />
            </div>

            <Textarea
              label="Notes"
              rows={2}
              placeholder="PSA grade, purchase source, etc."
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />

            {errors.submit && (
              <p className="text-sm text-loss bg-loss/10 rounded-lg px-3 py-2">
                {errors.submit}
              </p>
            )}

            {success && (
              <p className="text-sm text-gain bg-gain/10 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added to collection!
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isAdding}>
            Add to Collection
          </Button>
        </div>
      </form>
    </Modal>
  );
}
