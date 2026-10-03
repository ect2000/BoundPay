import Link from 'next/link';
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link className={`brand ${small ? 'brand-small' : ''}`} href="/" aria-label="BoundPay home">
      <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden="true">
        <path
          d="M4 4h11c7 0 11 3 11 8 0 3-2 5-5 6 4 1 6 3 6 6 0 5-4 8-11 8H4V4Z"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path d="M4 17h13M12 4v28" stroke="currentColor" strokeWidth="3" />
      </svg>
      <span>
        Bound<span className="brand-pay">Pay</span>
      </span>
    </Link>
  );
}
