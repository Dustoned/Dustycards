import { useState } from 'react';
import clsx from 'clsx';

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='350' viewBox='0 0 250 350'%3E%3Crect width='250' height='350' rx='12' fill='%231e1e2e'/%3E%3Ccircle cx='125' cy='140' r='40' fill='%23252535'/%3E%3Ccircle cx='125' cy='140' r='15' fill='%2316161e'/%3E%3Cline x1='40' y1='140' x2='210' y2='140' stroke='%23252535' stroke-width='3'/%3E%3Ctext x='125' y='230' font-family='system-ui' font-size='14' fill='%2364748b' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E`;

export default function CardImage({
  src,
  alt = 'Card',
  className = '',
  imgClassName = '',
  aspectRatio = '5/7',
  rounded = 'rounded-lg',
  fit = 'cover',
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const effectiveSrc = error || !src ? PLACEHOLDER_SVG : src;

  return (
    <div
      className={clsx(
        'relative overflow-hidden bg-elevated',
        rounded,
        className,
      )}
      style={{ aspectRatio }}
    >
      {/* Shimmer skeleton while loading */}
      {!loaded && !error && (
        <div className="absolute inset-0 shimmer rounded-inherit" />
      )}

      <img
        src={effectiveSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
        className={clsx(
          'w-full h-full transition-opacity duration-300',
          fit === 'contain' ? 'object-contain' : 'object-cover',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  );
}
