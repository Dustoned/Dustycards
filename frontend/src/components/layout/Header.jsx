import { useLocation, Link } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Portfolio overview and stats' },
  '/collection': { title: 'Collection', subtitle: 'Your Pokémon TCG cards and sealed products' },
  '/search': { title: 'Search', subtitle: 'Find and add cards to your collection' },
  '/settings': { title: 'Settings', subtitle: 'Preferences and configuration' },
};

export default function Header() {
  const location = useLocation();
  const currentPath = Object.keys(PAGE_TITLES).find((key) =>
    location.pathname.startsWith(key),
  );
  const pageInfo = PAGE_TITLES[currentPath] || { title: 'DustyCards', subtitle: '' };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface/50 backdrop-blur-sm flex-shrink-0">
      <div>
        <h1 className="text-xl font-bold text-text-primary">{pageInfo.title}</h1>
        {pageInfo.subtitle && (
          <p className="text-sm text-text-muted mt-0.5">{pageInfo.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Quick add button */}
        <Link
          to="/search"
          className="flex items-center gap-2 px-3 py-2 bg-accent-primary hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Cards
        </Link>
      </div>
    </header>
  );
}
