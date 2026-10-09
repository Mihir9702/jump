# Jump — 2.5D Platformer

A browser platformer about a customizable little cube crossing a sunset valley. Built with **Three.js, TypeScript, and Vite**.

**[Play Jump in your browser](https://mihir9702.github.io/jump/)**

## Gameplay

- **Three hand-built levels:** jump across platforms and reach the goal flag.
- **Responsive movement:** variable-height jumps, coyote time, input buffering, drop-through platforms, and one mid-air flash jump per takeoff.
- **Coins, hazards, and checkpoints:** collect coins, avoid spikes and falls, and restart at checkpoints.
- **12 optional hero appearances:** different colors and accessories, with the same movement and physics for every choice.
- **Time trials:** track your fastest runs and race an optional recorded ghost.
- **Keyboard, controller, and touch support:** works on desktop and mobile.

Jump is a single-player platformer with no combat, enemies, health bars, potions, or chat.

## Controls

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | A/D or ←/→ | Left stick or D-pad | Left/right buttons |
| Jump | W, Space, or ↑ (hold for height) | A | Jump button |
| Flash jump | Jump again while airborne | A again while airborne | Jump again while airborne |
| Drop through platform | S or ↓ | D-pad down | Down button |
| Pause | Esc or P | Start | Pause button |

## Run locally

Requires Node.js 22.18+.

~~~sh
npm ci
npm run dev
~~~

For verification:

~~~sh
npm run typecheck
npm run test
npm run build
npm run playtest
~~~

## License

See [COPYRIGHT.md](COPYRIGHT.md) for the repository's copyright and reuse terms.
