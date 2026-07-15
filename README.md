# 🎛️ MIDI LOOP LAB

Make little MIDI loops in the browser. A pile of ways to generate them, sound to hear them, Web MIDI
to send them to real gear, and `.mid` export to keep them.

This is **part 2**. [Part 1](archive/) was a Python CLI I wrote in 2015 that did the same thing from a
terminal. It's preserved, documented, and roasted in [`archive/`](archive/) — start with
[the archive readme](archive/README.md), then the [Hall of Shame](archive/hall-of-shame.md).

## The generators

| generator | what it does |
|---|---|
| **Molecular Music Box** | The heritage algorithm, ported faithfully from `notes.py`. Two intervals, collision-driven switching, emergent loops. |
| **Euclidean** | Evenly-spread pulses (Bjorklund). Great for drums. |
| **Drunk Walk** | Random walk up/down the scale with a stability bias. |
| **Noise** | Value-noise curve quantized to scale — the idea `noise.py` never shipped. |
| **Arpeggiator** | Cycle a chord up/down/updown over N octaves. |
| **Markov** | An order-k chain trained offline on real MIDI, frozen to JSON, sampled with a temperature knob. |
| **Mixed Media** | Blend several generators — layer them, or take rhythm from one and pitch from another. |
| **Critter Herd** | A herd of pixel creatures wanders a grid and their movement *is* the music. |

## Aesthetic

Punk-rock 8-bit. Maxed-RGB neon on black, chunky blocks, a fresh high-contrast palette every
regen, choppy low-framerate playhead. **No glow, no blur, no transparency, no gradients, no smooth
easing** — raw, not styled-afterward. Modeled on
[`b38tn1k.github.io/lumpy`](https://b38tn1k.github.io/lumpy).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Build: `npm run build` → static `dist/`. Deploys to Vercel with zero config (auto-detects Vite).

## Train the Markov model (optional, offline)

```bash
pip install mido
python tools/train_markov.py path/to/your/midis/  -o public/models/markov.json
```

The app ships with a model already frozen at `public/models/markov.json`. Retrain it on your own MIDI
piles for your own flavor.

## Stack

Vanilla JS + [Vite](https://vitejs.dev). [Tone.js](https://tonejs.github.io) for playback and the
loop scheduler, [@tonejs/midi](https://github.com/Tonejs/Midi) for `.mid` export, the native Web MIDI
API for output. Sprites and creatures are raw 2D canvas, ported from lumpy. No framework.
