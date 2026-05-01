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
  // Two significant figures, capped at 6 decimals so we never spit out
  // ten zeros for unrealistically small values. No minimumFractionDigits
  // so we don't get cosmetic trailing zeros (e.g. 0.00070 → 0,0007).
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
 * the BASE values from CONFIG (no upgrades applied) — the page reads as a
 * neutral reference manual, not a live dashboard. If you want your current
 * numbers, the Trilha and Aprimoramentos pages already show those.
 *
 * Sections:
 *   1. Geradores — full table of the 10 tiers (cost, base production,
 *      what they produce, who unlocks them).
 *   2. Aprimoramentos — how the upgrade system works (formulas + meaning).
 *   3. Recursos — what 'Letras' is and how the production chain feeds it.
 *   4. Números — the formatting rules (K/M/...No → aa/ab/ac…).
 *   5. Atalhos — press-and-hold to buy, hold-to-confirm reset, etc.
 *   6. Persistência — auto-save cadence, manual save, theme/page memory.
 */
export function CompendioPage() {
  return (
    <div className="page page-compendio">
      <div className="compendio-content">
        <CompendioIntro />
        <SectionGeradores />
        <SectionAprimoramentos />
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
      <h1 className="compendio-intro-title">A república em letras</h1>
      <p className="compendio-intro-lede">
        Um manual breve com a mecânica, os números e os pequenos rituais que
        regem esta república. Os valores aqui são <em>de base</em> — não
        refletem seus aprimoramentos atuais.
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
        Cada gerador tem um <strong>custo fixo</strong> em letras (a quantia
        que você precisa acumular para comprar uma unidade) e produz, por
        segundo, unidades do <strong>tier imediatamente abaixo</strong>. Só o
        tier <em>I — Escritor</em> produz o recurso bruto, <em>letras</em>.
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
                            <span className="compendio-gen-species">
                              {tier.species}
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
        menos uma vez, a quantia em letras igual ao seu custo. Uma vez
        desbloqueado, fica desbloqueado para sempre — mesmo que você gaste
        tudo depois.
      </p>
    </section>
  );
}

/* ─────────── Section: Aprimoramentos ─────────── */

function SectionAprimoramentos() {
  return (
    <section className="compendio-section">
      <SectionHeader
        title="Aprimoramentos"
        subtitle="multiplicadores e redutores"
      />

      <p className="compendio-prose">
        Existem dois tipos de aprimoramento, ambos com{' '}
        <strong>níveis infinitos</strong> e ambos pagos em letras:
      </p>

      <div className="compendio-cards">
        <div className="compendio-card">
          <div className="compendio-card-eyebrow">produção</div>
          <h3 className="compendio-card-title">×2 por nível</h3>
          <p className="compendio-card-body">
            Cada nível <strong>dobra</strong> a produção por segundo. Nível N
            equivale a um multiplicador de <span className="mono">2ⁿ</span>.
          </p>
        </div>
        <div className="compendio-card">
          <div className="compendio-card-eyebrow">custo</div>
          <h3 className="compendio-card-title">÷2 por nível</h3>
          <p className="compendio-card-body">
            Cada nível <strong>corta o custo pela metade</strong>. Nível N
            equivale a um multiplicador de{' '}
            <span className="mono">0,5ⁿ</span>. O preço nunca desce abaixo de
            <strong> 1 letra</strong>.
          </p>
        </div>
      </div>

      <p className="compendio-prose">
        Cada gerador tem o seu par de aprimoramentos (produção e custo). Há
        também um par <strong>global</strong> que se aplica a{' '}
        <em>todos</em> os geradores ao mesmo tempo — mais caros, mas
        cumulativos com os individuais.
      </p>

      <div className="compendio-formula">
        <div className="compendio-formula-row">
          <span className="compendio-formula-label">produção real</span>
          <code className="compendio-formula-code">
            base × 2<sup>nv. ind.</sup> × 2<sup>nv. global</sup>
          </code>
        </div>
        <div className="compendio-formula-row">
          <span className="compendio-formula-label">custo real</span>
          <code className="compendio-formula-code">
            max(1, ⌈base × 0,5<sup>nv. ind.</sup> × 0,5<sup>nv. global</sup>⌉)
          </code>
        </div>
        <div className="compendio-formula-row">
          <span className="compendio-formula-label">custo do nível N+1</span>
          <code className="compendio-formula-code">
            10 × baseCost × 2,5<sup>N</sup>
          </code>
        </div>
      </div>

      <p className="compendio-prose compendio-note">
        Aprimoramentos individuais cuja unidade você ainda não comprou
        aparecem <em>indisponíveis</em> no compêndio de aprimoramentos —
        compre ao menos uma unidade do gerador para liberá-los.
      </p>
    </section>
  );
}

/* ─────────── Section: Recursos ─────────── */

function SectionRecursos() {
  return (
    <section className="compendio-section">
      <SectionHeader title="Recursos" subtitle="o que se acumula" />

      <p className="compendio-prose">
        Há um único recurso bruto: <strong>letras</strong>. Tudo o que se
        produz, em última instância, é letra — mas a cadeia chega lá em
        cascata: <em>Civilizações</em> produzem <em>Idiomas</em>, que
        produzem <em>Cânones</em>, que produzem <em>Universidades</em>… até o{' '}
        <em>Escritor</em>, que finalmente produz letras.
      </p>

      <div className="compendio-chain" aria-hidden="true">
        {CONFIG.letters.tiers
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
            <em>Letras</em>
          </span>
        </div>
      </div>

      <p className="compendio-prose compendio-note">
        Você começa a partida com <strong>10 letras</strong> — exatamente o
        custo de um Escritor. A partir daí, é só letrar.
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
            no botão <em>contratar</em> ou <em>aprimorar</em> compra uma
            unidade.
          </span>
        </li>
        <li className="compendio-shortcut">
          <span className="compendio-shortcut-key">segurar</span>
          <span className="compendio-shortcut-desc">
            o mesmo botão entra em modo automático após um pequeno atraso e
            acelera o ritmo de compra a cada disparo, parando quando você
            soltar ou ficar sem letras.
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
