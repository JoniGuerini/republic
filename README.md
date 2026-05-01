# República — React + Vite + TypeScript

Port do jogo idle "República" (originalmente um único arquivo HTML) para um projeto React/Vite organizado em módulos e tipado em TypeScript.

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção (tsc + vite)
npm run preview  # preview do build
```

## Estrutura

```
src/
├── App.tsx                # composição principal e estado do jogo
├── App.css                # estilos portados do HTML original
├── main.tsx               # bootstrap React
├── types/
│   └── game.ts            # tipos (TrackKey, GameState, etc.)
├── game/
│   ├── config.tsx         # geradores, custos, produções
│   ├── icons.tsx          # ícones SVG como componentes
│   └── utils.ts           # economia, formatação, tick
├── hooks/
│   └── useGameLoop.ts     # loop requestAnimationFrame + FPS
└── components/
    ├── Header.tsx
    ├── Resources.tsx
    ├── Board.tsx
    ├── Track.tsx
    ├── Generator.tsx
    ├── Log.tsx
    ├── Toast.tsx
    └── FPSCounter.tsx
```

## Notas sobre a port

- O loop de jogo roda em `requestAnimationFrame` via `useGameLoop`. O estado autoritativo vive em `useRef` (mutação rápida) e é publicado para os componentes via `useState` a cada frame.
- O tema (claro/noite) é controlado por `data-theme` no `<html>`, idêntico ao original — todas as variáveis CSS continuam funcionando.
- O log do diário usa `dangerouslySetInnerHTML` apenas para strings construídas pelo próprio código (sem input do usuário).
- O salvamento ainda é stub ("Salvamento virá na próxima versão") — fácil de plugar localStorage depois.
