# Jump — 2.5D Action MMORPG Platformer

A fast, fluid 2.5D action platformer and interconnected MMORPG built with Three.js, TypeScript, and Vite.

🎮 **[Play Live in Browser (Zero Install)](https://mihir9702.github.io/jump/)**

---

## What is Jump?

*Jump* blends the precision parkour of modern platformers with the nostalgic combat and progression of classic *MapleStory*, featuring:

* **12 Distinct Playable Classes**: Each with their own combat archetype, weapons, mobility, and stat affinities.
* **MapleStory-Inspired Combat**: Real-time melee slash combos, critical strikes, floating bouncing damage numbers, and dynamic loot drops (Mesos & Potions) with vacuum pickup.
* **Interconnected MMORPG World**: Persistent zones connected by glowing **Runed Portals**—from the peaceful starter town hub of **Sunset Haven** to the grinding fields of **Whispering Meadows** and the depths of **Sunken Hollows**.
* **Town Hubs & Safe Zones**: Visit merchants to stock up on potions, upgrade equipment at the blacksmith, and accept quest bounties.
* **High-Mobility Flash Jump**: Double-tap jump while airborne to surge forward with starlight momentum.
* **Web-First & Zero Downloads**: Runs instantly in any modern desktop or mobile browser at 60 FPS.

---

## The 12 Playable Heroes

| Hero | Archetype | Signature Weapon | Mobility Ability |
|---|---|---|---|
| **Vesper** | Starlight Nomad | Dual Phase Daggers | **Temporal Warp**: Forward dash leaving a time-distorting afterimage |
| **Atlas** | Celestial Gyro | Kinetic Crystal Rings | **Anti-Grav Burst**: Omnidirectional 8-way momentum glide |
| **Ren** | Shadow Strider | Shadow Phase Katana | **Shadow Leap**: Blinks forward through enemy hitboxes as smoke |
| **Gideon** | Void Knight | Astral Claymore | **Comet Slam**: Heavy downward aerial plunge with shockwave impact |
| **Iris** | Living Prism | Refractive Light Beams | **Prism Shift**: Splits into refracted light rays before reforming forward |
| **Jin** | Driftwood Ronin | Weathered Odachi | **Talisman Step**: Spawns a floating spirit talisman stepping stone |
| **Kallum** | Abyssal Sovereign | Dark Matter Scythe | **Umbral Surge**: Rifts forward in purple flames with execute damage |
| **Valeria** | Cyber-Valkyrie | Photon Lance & Hex Shield | **Photon Glide**: Unfurls hard-light wings for high-speed thrust |
| **Tor** | Molten Shaman | Molten Core Staff | **Magma Propulsion**: Rocket hops upward on volcanic geyser steam |
| **Mei** | Ribbon Dancer | Razor Silk Ribbons | **Silk Vault**: Aerial flip swinging ribbons in a 360° defensive sphere |
| **Rai** | Thunder Monk | Electric Spark Tonfas | **Lightning Strike**: Instant zig-zag electric flash jump |
| **Rowan** | Horned Warden | Living Thorn Rapier | **Vine Grapple**: Snaps a bioluminescent vine to swing across chasms |

---

## Controls

| Action | Keyboard | Touch / Mobile | Gamepad |
|---|---|---|---|
| **Move** | <kbd>A</kbd> <kbd>D</kbd> or <kbd>←</kbd> <kbd>→</kbd> | Left / Right D-Pad | Left Stick / D-Pad |
| **Jump / Flash Jump** | <kbd>W</kbd>, <kbd>Space</kbd> or <kbd>↑</kbd> *(double tap in air)* | Jump Button | <kbd>A</kbd> |
| **Attack** | <kbd>Ctrl</kbd>, <kbd>J</kbd>, or <kbd>Z</kbd> | Attack Button | <kbd>X</kbd> |
| **Use HP Potion** | <kbd>1</kbd> | Tap Red Potion Slot | <kbd>LB</kbd> |
| **Use MP Potion** | <kbd>2</kbd> | Tap Blue Potion Slot | <kbd>RB</kbd> |
| **Drop Through Platform** | <kbd>S</kbd> or <kbd>↓</kbd> | Down Button | Down |
| **Enter Portal / Interact** | <kbd>W</kbd> or <kbd>↑</kbd> | Jump Button | <kbd>A</kbd> |
| **Pause** | <kbd>Esc</kbd> or <kbd>P</kbd> | Pause Icon | Start |

---

## Development

You need **Node.js 22.18+**.

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Type-check TypeScript
npm run typecheck

# Build for production
npm run build

# Deploy to GitHub Pages (gh-pages)
npm run deploy
```

---

## License

Private / MIT
