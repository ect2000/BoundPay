'use client';
import { useForm } from 'react-hook-form';
import type { ProductCandidate } from '@/lib/domain';
import { decimalAmount } from '@/lib/money';
import { Button } from './ui/button';
export type EvidenceInput = {
  unitLandedPrice: string;
  rating: number;
  displaySize: number;
  usbC: boolean;
  deliveryDate: string;
  stock: number;
  quoteUrl: string;
  reviewed: boolean;
};
export function EvidenceReview({
  product,
  onSave,
  busy,
}: {
  product: ProductCandidate;
  onSave: (v: EvidenceInput) => void;
  busy: boolean;
}) {
  const { register, handleSubmit } = useForm<EvidenceInput>({
    defaultValues: {
      unitLandedPrice: decimalAmount(product.unitPrice),
      rating: product.rating ?? undefined,
      displaySize: product.displaySize ?? undefined,
      usbC: product.usbC ?? false,
      deliveryDate: product.deliveryDate ?? '',
      stock: product.stock ?? undefined,
      quoteUrl: product.url,
      reviewed: false,
    },
  });
  return (
    <form className="evidence-form" onSubmit={handleSubmit(onSave)}>
      <p className="evidence-warning">
        Channel3 does not guarantee these fields. Enter only facts you checked in a current merchant
        quote. Your entries are recorded as user attestations.
      </p>
      <div className="form-grid">
        <label>
          Final per-unit cost (tax + shipping)
          <input {...register('unitLandedPrice', { required: true })} inputMode="decimal" />
        </label>
        <label>
          Verified rating (out of 5)
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            {...register('rating', { required: true, valueAsNumber: true })}
          />
        </label>
        <label>
          Display size (inches)
          <input
            type="number"
            step="0.1"
            min="1"
            {...register('displaySize', { required: true, valueAsNumber: true })}
          />
        </label>
        <label>
          Verified available quantity
          <input
            type="number"
            min="0"
            {...register('stock', { required: true, valueAsNumber: true })}
          />
        </label>
        <label className="span-2">
          Committed delivery date
          <input type="date" {...register('deliveryDate', { required: true })} />
        </label>
        <label className="span-2">
          Merchant quote / evidence URL
          <input type="url" {...register('quoteUrl', { required: true })} />
        </label>
        <label className="checkbox-field">
          <input type="checkbox" {...register('usbC')} />
          USB-C verified
        </label>
        <label className="checkbox-field span-2">
          <input type="checkbox" {...register('reviewed', { required: true })} />
          <span>
            I checked the merchant quote, including taxes, shipping, quantity, delivery, rating and
            features.
          </span>
        </label>
      </div>
      <Button type="submit" disabled={busy} className="full-width">
        Record evidence & rerun policy
      </Button>
    </form>
  );
}
