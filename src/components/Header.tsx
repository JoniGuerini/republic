interface HeaderProps {
  era: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSave: () => void;
  onReset: () => void;
}

export function Header({ era, theme, onToggleTheme, onSave, onReset }: HeaderProps) {
  return (
    <header>
      <div className="brand">
        <div className="brand-name">República</div>
        <div className="brand-sub">v0.1 · MMXXVI</div>
      </div>
      <div className="header-center">
        <strong>{era}</strong>
        Um jogo de cultivo paciente
      </div>
      <div className="header-actions">
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Alternar tema"
          data-theme-state={theme}
        >
          <svg className="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="5" y1="5" x2="7" y2="7" />
            <line x1="17" y1="17" x2="19" y2="19" />
            <line x1="5" y1="19" x2="7" y2="17" />
            <line x1="17" y1="7" x2="19" y2="5" />
          </svg>
          <svg className="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.3" />
          </svg>
        </button>
        <button className="btn" onClick={onSave}>
          Anotar no diário
        </button>
        <button className="btn reset" onClick={onReset}>
          Reiniciar
        </button>
      </div>
    </header>
  );
}
