import { CONFIG, TRACK_KEYS } from '../../game/config';
import { formatNum } from '../../game/utils';

/**
 * Specialized rate formatter for the compêndio.
 *
 * The global `formatNum` truncates to 2 decimal places, which works well
 * for live in-game numbers (where 0.20/s is a meaningful precision) but
 * here it would render the late-tier base productions (0.0015, 0.0007,
 * 0.00035 …) all as a misleading "0.00/s".
 *
 * For values below 0.01, fall back to enough decimals to preserve the
 * first two significant digits — but cap at 6 decimals to avoid hundred-
 * digit reads. For ≥ 0.01 it defers to formatNum so the table stays in
 * sync with the rest of the game's number formatting.
 */
function formatRate(n: number): string {
  if (n === 0) return '0/s';
  const abs = Math.abs(n);
  if (abs >= 0.01) return `${formatNum(n)}/s`;
  const decimals = Math.min(6, Math.max(2, 1 - Math.floor(Math.log10(abs))));
  const formatted = n.toLocaleString('pt-BR', {
    maximumFractionDigits: decimals,
  });
  return `${formatted}/s`;
}

/**
 * Compêndio.
 *
 * Static, design-time documentation for the player. Numbers shown here are
 * the BASE values from CONFIG — the page reads as a neutral reference
 * manual, not a live dashboard.
 *
 * Sections:
 *   1. Geradores — full table of the 10 tiers (cost, base production,
 *      what they produce, who unlocks them).
 *   2. Recursos — what 'Recurso' is and how the production chain feeds it.
 *   3. Números — the formatting rules (K/M/...No → aa/ab/ac…).
 *   4. Atalhos — press-and-hold to buy, hold-to-confirm reset, etc.
 *   5. Persistência — auto-save cadence, manual save, theme/page memory.
 */
export function CompendioPage() {
  return (
    <div className="page page-compendio">
      <div className="compendio-content">
        <CompendioIntro />
        <SectionGeradores />
        <SectionRecursos />
        <SectionNumeros />
        <SectionAtalhos />
        <SectionPersistencia />
      </div>
    </div>
  );
}

/* ─────────── Intro ─────────── */

function CompendioIntro() {
  return (
    <header className="compendio-intro">
      <div className="compendio-intro-eyebrow" aria-hidden="true">
        <span>·</span>
        <span>compêndio</span>
        <span>·</span>
      </div>
      <h1 className="compendio-intro-title">Manual da república</h1>
      <p className="compendio-intro-lede">
        Um manual breve com a mecânica e os números que regem o jogo. Os
        valores aqui são <em>de base</em>.
      </p>
    </header>
  );
}

/* ─────────── Section: Geradores ─────────── */

function SectionGeradores() {
  return (
    <section className="compendio-section">
      <SectionHeader title="Geradores" subtitle="o quadro dos dez tiers" />

      <p className="compendio-prose">
        Cada gerador tem um <strong>custo fixo</strong> em recurso (a quantia
        que você precisa acumular para comprar uma unidade) e produz, por
        segundo, unidades do <strong>tier imediatamente abaixo</strong>. Só o
        primeiro tier — <em>Gerador 1</em> — produz o recurso bruto.
      </p>

      {TRACK_KEYS.map((trackKey) => {
        const track = CONFIG[trackKey];
        return (
          <div key={trackKey} className="compendio-table-wrap">
            <table className="compendio-table">
              <thead>
                <tr>
                  <th scope="col" className="col-tier">tier</th>
                  <th scope="col" className="col-name">gerador</th>
                  <th scope="col" className="col-cost">custo</th>
                  <th scope="col" className="col-rate">produz por seg.</th>
                  <th scope="col" className="col-makes">produz</th>
                </tr>
              </thead>
              <tbody>
                {track.tiers.map((tier, idx) => {
                  const makes =
                    idx === 0
                      ? `1 ${track.name.toLowerCase()}`
                      : `1 ${track.tiers[idx - 1].name}`;
                  return (
                    <tr key={tier.name}>
                      <td className="col-tier">
                        <span className="compendio-tier-roman">{romanTier(idx + 1)}</span>
                      </td>
                      <td className="col-name">
                        <span className="compendio-gen-cell">
                          <span className="compendio-gen-icon" aria-hidden="true">
                            {tier.icon}
                          </span>
                          <span className="compendio-gen-text">
                            <span className="compendio-gen-name">
                              <em>{tier.name}</em>
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="col-cost mono">{formatNum(tier.baseCost)}</td>
                      <td className="col-rate mono">
                        {formatRate(tier.baseProduction)}
                      </td>
                      <td className="col-makes">{makes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <p className="compendio-prose compendio-note">
        <strong>Desbloqueio:</strong> um tier aparece quando você acumula, ao
        menos uma vez, a quantia em recurso igual ao seu custo. Uma vez
        desbloqueado, fica desbloqueado para sempre — mesmo que você gaste
        tudo depois.
      </p>
    </section>
  );
}

/* ─────────── Section: Recursos ─────────── */

function SectionRecursos() {
  return (
    <section className="compendio-section">
      <SectionHeader title="Recurso" subtitle="o que se acumula" />

      <p className="compendio-prose">
        Há um único recurso bruto: <strong>recurso</strong>. Tudo o que se
        produz, em última instância, vira recurso — mas a cadeia chega lá em
        cascata: o <em>Gerador 10</em> produz <em>Geradores 9</em>, que
        produzem <em>Geradores 8</em>… até o <em>Gerador 1</em>, que
        finalmente produz recurso.
      </p>

      <div className="compendio-chain" aria-hidden="true">
        {CONFIG.recurso.tiers
          .slice()
          .reverse()
          .map((tier, idx, arr) => (
            <div key={tier.name} className="compendio-chain-step">
              <span className="compendio-chain-name">
                <em>{tier.name}</em>
              </span>
              {idx < arr.length - 1 && (
                <span className="compendio-chain-arrow">→</span>
              )}
            </div>
          ))}
        <div className="compendio-chain-step compendio-chain-resource">
          <span className="compendio-chain-arrow">→</span>
          <span className="compendio-chain-name">
            <em>Recurso</em>
          </span>
        </div>
      </div>

      <p className="compendio-prose compendio-note">
        Você começa a partida com <strong>10 de recurso</strong> — exatamente
        o custo do primeiro <em>Gerador 1</em>.
      </p>
    </section>
  );
}

/* ─────────── Section: Números ─────────── */

function SectionNumeros() {
  return (
    <section className="compendio-section">
      <SectionHeader title="Números" subtitle="como os valores são mostrados" />

      <p className="compendio-prose">
        Os números seguem regras de escala curta em português, com sufixos que
        continuam alfabeticamente quando ultrapassam o Nonilhão:
      </p>

      <div className="compendio-table-wrap">
        <table className="compendio-table compendio-table-numbers">
          <thead>
            <tr>
              <th scope="col">faixa</th>
              <th scope="col">formato</th>
              <th scope="col">exemplo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">0 – 999,99</td>
              <td>até 2 casas decimais</td>
              <td className="mono">42,75</td>
            </tr>
            <tr>
              <td className="mono">1 000 – 9 999</td>
              <td>inteiro com separador de milhar</td>
              <td className="mono">1.234</td>
            </tr>
            <tr>
              <td className="mono">10 000 – 999,99 No</td>
              <td>sufixo nomeado de escala curta</td>
              <td className="mono">1,23 K · 4,56 M · 7,89 No</td>
            </tr>
            <tr>
              <td className="mono">≥ 1 aa</td>
              <td>sufixo alfabético (estilo planilha)</td>
              <td className="mono">1,00 aa · 2,34 ab · 9,99 zz · 1,00 aaa</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="compendio-suffixes" aria-label="Sufixos nomeados">
        <span className="compendio-suffixes-label">sufixos nomeados</span>
        <div className="compendio-suffixes-list">
          {[
            ['K', 'mil'],
            ['M', 'milhão'],
            ['B', 'bilhão'],
            ['T', 'trilhão'],
            ['Qa', 'quatrilhão'],
            ['Qi', 'quintilhão'],
            ['Sx', 'sextilhão'],
            ['Sp', 'septilhão'],
            ['Oc', 'octilhão'],
            ['No', 'nonilhão'],
          ].map(([sym, full]) => (
            <span key={sym} className="compendio-suffix">
              <span className="compendio-suffix-sym mono">{sym}</span>
              <span className="compendio-suffix-full">{full}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="compendio-prose compendio-note">
        Acima de Nonilhão começam os <strong>aa, ab, ac…</strong>, depois{' '}
        <strong>aaa, aab, aac…</strong> e assim infinitamente — o motor
        numérico (<span className="mono">break_eternity.js</span>) suporta
        valores muito além do que você verá em sessões realistas.
      </p>
    </section>
  );
}

/* ─────────── Section: Atalhos ─────────── */

function SectionAtalhos() {
  return (
    <section className="compendio-section">
      <SectionHeader title="Atalhos" subtitle="gestos da república" />

      <ul className="compendio-shortcuts">
        <li className="compendio-shortcut">
          <span className="compendio-shortcut-key">clique</span>
          <span className="compendio-shortcut-desc">
            no botão <em>contratar</em> compra uma unidade.
          </span>
        </li>
        <li className="compendio-shortcut">
          <span className="compendio-shortcut-key">segurar</span>
          <span className="compendio-shortcut-desc">
            o mesmo botão entra em modo automático após um pequeno atraso e
            acelera o ritmo de compra a cada disparo, parando quando você
            soltar ou ficar sem recurso.
          </span>
        </li>
        <li className="compendio-shortcut">
          <span className="compendio-shortcut-key">refundar</span>
          <span className="compendio-shortcut-desc">
            no cabeçalho abre uma confirmação que precisa ser{' '}
            <strong>segurada</strong> por ~1,5 s — para que ninguém apague o
            progresso por engano.
          </span>
        </li>
        <li className="compendio-shortcut">
          <span className="compendio-shortcut-key">tema</span>
          <span className="compendio-shortcut-desc">
            o botão de noite/dia no cabeçalho alterna entre as duas paletas e
            memoriza sua escolha.
          </span>
        </li>
      </ul>
    </section>
  );
}

/* ─────────── Section: Persistência ─────────── */

function SectionPersistencia() {
  return (
    <section className="compendio-section">
      <SectionHeader title="Persistência" subtitle="o diário da república" />

      <p className="compendio-prose">
        Sua partida é gravada localmente, no próprio navegador
        (<span className="mono">localStorage</span>):
      </p>

      <ul className="compendio-bullets">
        <li>
          <strong>Auto-save</strong> a cada 10 segundos, e também ao fechar a
          aba ou trocar de janela.
        </li>
        <li>
          <strong>Salvar manual</strong> pelo botão no cabeçalho — útil antes
          de uma manobra ousada.
        </li>
        <li>
          A <strong>página ativa</strong> e o <strong>tema</strong> também são
          memorizados, então recarregar não te tira do lugar.
        </li>
        <li>
          Saves de versões anteriores incompatíveis são descartados em
          silêncio — ainda não temos migrações.
        </li>
      </ul>

      <p className="compendio-prose compendio-note">
        Como tudo fica no seu navegador, limpar dados do site apaga a
        partida. Não há sincronização entre dispositivos.
      </p>
    </section>
  );
}

/* ─────────── Helpers ─────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="compendio-section-header">
      <span className="compendio-section-bullet" aria-hidden="true">·</span>
      <h2 className="compendio-section-title">{title}</h2>
      <span className="compendio-section-bullet" aria-hidden="true">·</span>
      <p className="compendio-section-sub">{subtitle}</p>
    </header>
  );
}

const ROMAN: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
};

function romanTier(n: number): string {
  return ROMAN[n] ?? String(n);
}
