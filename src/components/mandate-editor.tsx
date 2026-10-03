'use client';
import { useForm } from 'react-hook-form';
import { ShieldCheck, ArrowRight, LockKeyhole } from 'lucide-react';
import { MandateSchema, type SpendingMandate } from '@/lib/domain';
import { decimalAmount, minorUnits } from '@/lib/money';
import { Button } from './ui/button';
type Fields = {
  title: string;
  category: string;
  budget: string;
  currency: 'USD' | 'EUR' | 'GBP';
  quantity: number;
  maxUnit: string;
  deadline: string;
  displaySize: string;
  rating: string;
  usbC: boolean;
  features: string;
  preferences: string;
  allow: string;
  block: string;
};
export function MandateEditor({
  mandate,
  onConfirm,
  onBack,
  busy,
}: {
  mandate: SpendingMandate;
  onConfirm: (m: SpendingMandate) => void;
  onBack: () => void;
  busy: boolean;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Fields>({
    defaultValues: {
      title: mandate.title,
      category: mandate.category,
      budget: decimalAmount(mandate.maxTotal),
      currency: mandate.currency,
      quantity: mandate.quantity,
      maxUnit: mandate.maxUnit ? decimalAmount(mandate.maxUnit) : '',
      deadline: mandate.deliveryDeadline ?? '',
      displaySize: String(
        mandate.hardConstraints.find((c) => c.type === 'display_size')?.value ?? '',
      ),
      rating: String(mandate.hardConstraints.find((c) => c.type === 'rating')?.value ?? ''),
      usbC: mandate.hardConstraints.some((c) => c.type === 'usb_c' && c.value === true),
      features: mandate.hardConstraints
        .filter((c) => c.type === 'feature')
        .map((c) => c.value)
        .join(', '),
      preferences: mandate.softPreferences.join(', '),
      allow: mandate.merchantPolicy.allow.join(', '),
      block: mandate.merchantPolicy.block.join(', '),
    },
  });
  const split = (s: string) =>
    s
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  const submit = (v: Fields) => {
    try {
      const hard: SpendingMandate['hardConstraints'] = [];
      if (v.displaySize)
        hard.push({ type: 'display_size', operator: '>=', value: Number(v.displaySize) });
      if (v.rating) hard.push({ type: 'rating', operator: '>=', value: Number(v.rating) });
      if (v.usbC) hard.push({ type: 'usb_c', operator: '=', value: true });
      for (const f of split(v.features)) hard.push({ type: 'feature', operator: '=', value: f });
      const confirmed = MandateSchema.parse({
        ...mandate,
        title: v.title,
        category: v.category,
        maxTotal: minorUnits(v.budget),
        currency: v.currency,
        quantity: Number(v.quantity),
        maxUnit: v.maxUnit ? minorUnits(v.maxUnit) : null,
        deliveryDeadline: v.deadline || null,
        hardConstraints: hard,
        softPreferences: split(v.preferences),
        merchantPolicy: { allow: split(v.allow), block: split(v.block) },
        approval: { required: true },
      });
      onConfirm(confirmed);
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Check the mandate.' });
    }
  };
  return (
    <form className="mandate-editor" onSubmit={handleSubmit(submit)}>
      <div className="mandate-intro">
        <div className="shield-tile">
          <ShieldCheck size={26} />
        </div>
        <div>
          <span className="eyebrow">REVIEW BEFORE RESEARCH</span>
          <h2>I understood your request as:</h2>
          <p>These rules become the agent’s boundaries. Review and correct every field.</p>
        </div>
      </div>
      <div className="form-section-title">
        Purchasing mandate <span>01 / AUTHORITY</span>
      </div>
      <div className="form-grid">
        <label className="span-2">
          Mission title
          <input {...register('title', { required: true })} />
        </label>
        <label className="span-2">
          Product category
          <input {...register('category', { required: true })} />
        </label>
        <label>
          Total budget
          <input inputMode="decimal" {...register('budget', { required: true })} />
        </label>
        <label>
          Currency
          <select {...register('currency')}>
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
          </select>
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="1"
            max="100"
            {...register('quantity', { required: true, valueAsNumber: true })}
          />
        </label>
        <label>
          Per-item ceiling <span className="optional">optional</span>
          <input placeholder="No separate ceiling" inputMode="decimal" {...register('maxUnit')} />
        </label>
        <label className="span-2">
          Delivery deadline <span className="optional">optional</span>
          <input type="date" {...register('deadline')} />
        </label>
      </div>
      <div className="form-section-title">
        Hard requirements <span>MUST PASS</span>
      </div>
      <div className="form-grid">
        <label>
          Minimum display size (inches)
          <input
            type="number"
            step="0.1"
            min="1"
            placeholder="No minimum"
            {...register('displaySize')}
          />
        </label>
        <label>
          Minimum rating
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            placeholder="No minimum"
            {...register('rating')}
          />
        </label>
        <label className="checkbox-field">
          <input type="checkbox" {...register('usbC')} />
          <span>USB-C is required</span>
        </label>
        <label className="span-2">
          Other required features <span className="optional">comma separated</span>
          <input placeholder="e.g. IPS, height adjustable" {...register('features')} />
        </label>
      </div>
      <div className="form-section-title">
        Preferences & merchants <span>02 / RESEARCH</span>
      </div>
      <div className="form-grid">
        <label className="span-2">
          Soft preferences <span className="optional">comma separated</span>
          <input {...register('preferences')} placeholder="e.g. IPS, height adjustable" />
        </label>
        <label>
          Allowed merchants <span className="optional">optional</span>
          <input {...register('allow')} placeholder="Any non-blocked merchant" />
        </label>
        <label>
          Blocked merchants <span className="optional">optional</span>
          <input {...register('block')} placeholder="None" />
        </label>
      </div>
      <div className="approval-invariant">
        <LockKeyhole size={17} />
        <div>
          <strong>Human approval is always required.</strong>
          <span>This rule cannot be removed by the agent.</span>
        </div>
        <span className="status-chip safe">ENFORCED</span>
      </div>
      {errors.root && (
        <p role="alert" className="form-error">
          {errors.root.message}
        </p>
      )}
      <div className="form-actions">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to mission
        </Button>
        <Button type="submit" disabled={busy}>
          Confirm mandate & research <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
