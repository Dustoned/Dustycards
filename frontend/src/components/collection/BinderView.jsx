import clsx from 'clsx';
import CardTile from '../cards/CardTile.jsx';
import useStore from '../../store/useStore.js';

// Grid column counts based on cardSize setting
const GRID_COLS = {
  sm: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
  md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  lg: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5',
  xl: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4',
};

function SkeletonTile() {
  return (
    <div className="bg-card border border-subtle rounded-xl overflow-hidden">
      <div className="shimmer w-full aspect-[5/7]" />
      <div className="p-2.5 space-y-2">
        <div className="shimmer h-3 rounded w-full" />
        <div className="shimmer h-3 rounded w-2/3" />
        <div className="shimmer h-4 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function BinderView({ items, isLoading, onCardClick }) {
  const { cardSize } = useStore();
  const cols = GRID_COLS[cardSize] || GRID_COLS.md;

  if (isLoading) {
    return (
      <div className={clsx('grid gap-3', cols)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonTile key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('grid gap-3', cols)}>
      {items.map((item) => (
        <CardTile key={item.id} item={item} onClick={onCardClick} />
      ))}
    </div>
  );
}
