import type { Page } from '../types/nav';
import { PAGES } from '../types/nav';

interface FooterProps {
  active: Page;
  onNavigate: (page: Page) => void;
}

/**
 * Footer navbar — switches the main viewport between top-level pages.
 * Active item is marked with a thin terracotta underline; inactive items
 * stay in the muted ink color and lift to terracotta on hover/focus.
 *
 * Implemented as buttons (not anchors) because navigation is purely
 * client-side state — there's no URL to preserve yet.
 */
export function Footer({ active, onNavigate }: FooterProps) {
  return (
    <nav className="footer" aria-label="Navegação principal">
      <ul className="footer-nav">
        {PAGES.map((page) => {
          const isActive = page.id === active;
          return (
            <li key={page.id} className="footer-nav-item">
              <button
                type="button"
                className={`footer-nav-btn${isActive ? ' is-active' : ''}`}
                onClick={() => onNavigate(page.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="footer-nav-label">{page.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
