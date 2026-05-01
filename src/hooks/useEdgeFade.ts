import { useEffect, useRef, useState } from 'react';

interface EdgeFade {
  top: boolean;
  bottom: boolean;
}

/**
 * Observa um container scrollável e devolve flags indicando se há
 * conteúdo escondido acima (`top`) ou abaixo (`bottom`) da viewport.
 * Usado para condicionar uma máscara/fade nas bordas: o fade só aparece
 * onde realmente há conteúdo a revelar.
 *
 * Reage a: scroll, resize do container (ResizeObserver) e resize da janela.
 * Tolera 1px de folga pra evitar flicker em alturas fracionárias.
 */
export function useEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState<EdgeFade>({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const top = scrollTop > 1;
      const bottom = scrollTop + clientHeight < scrollHeight - 1;
      setEdges((prev) =>
        prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
      );
    };

    update();

    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Observe filhos diretos: quando o conteúdo (cards) muda de tamanho,
    // o scrollHeight muda mas scroll/resize do container não disparam.
    Array.from(el.children).forEach((child) => ro.observe(child));

    const mo = new MutationObserver(() => {
      Array.from(el.children).forEach((child) => ro.observe(child));
      update();
    });
    mo.observe(el, { childList: true, subtree: false });

    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return { ref, edges };
}
