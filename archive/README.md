# 📼 notes — the archive (part 1, 2015–2018)

This is where the original **notes** lives now: a Python command-line tool that procedurally
generated small, loopable MIDI files. Drag them into a DAW, point them at a synth, get a pad or a
bassline or a beat. It was the first thing I built that I was proud enough to put on the internet.

It's preserved here byte-for-byte as a museum piece. **Part 2** — a browser app that does the same
thing but better, and lets little pixel animals control the notes — lives in the root of this repo.
This folder is its origin story, its wiki, and its roast.

> Blog writeup (2015): http://b38tn1k.com/code/2015/02/10/Procedural-Generation-with-MIDI/

## Demos — what actually came out of it

Three tracks made with this engine, still up on SoundCloud:

- **[FemVox](https://soundcloud.com/b38tn1k/femvox-the-realm-a-procedurally-generated-music-experiment)** — made with an early version of Notes that generated melody only.
- **[Machine Drum](https://soundcloud.com/b38tn1k/machine-drum)** — demonstrates the drum patterns achievable, in addition to further melodic examples.
- **[Digital Ballet](https://soundcloud.com/b38tn1k/digital-ballet)** — a less "Aphex Twin"-y use of notes; the piano line uses an arpeggiator to add complexity and stuff.

(The raw renders are also in [`part1-python/demos/`](part1-python/demos/).)

## The one clever idea

The engine is an implementation of the **Molecular Music Box**: you place a note, jump forward by
one of two intervals, and every time you land on a beat you've already used, you switch to the other
interval. That single rule makes a loop that evolves instead of repeating — rhythm falls out of the
math, not out of me typing in a pattern. 515 lines of Python, and that idea is the good 200 of them.

## The wiki

| doc | what's in it |
|---|---|
| [how-it-worked.md](how-it-worked.md) | Architecture. How the Molecular Music Box actually runs, and how to revive the code. |
| [highlights.md](highlights.md) | The genuinely smart bits. No roasting in this one — credit where it's due. |
| [hall-of-shame.md](hall-of-shame.md) | The roast. Every sin, quoted with `file:line`, verified, affectionate. |
| [the-graveyard.md](the-graveyard.md) | The abandoned engines, the Swift ghost, and the 30,420 MIDI files I committed to git. |

## What's in `part1-python/`

The complete original source, unchanged:

- `notes.py` — the engine + CLI (Python 2.7).
- `scales.py` — the music-theory brain: diatonic scale walking + drums.
- `noise.py` — the abandoned Perlin-noise engine (Python 3, never shipped).
- `makealotofmidifiles.py` — the script that generated 30,420 files by shelling out to `notes.py`.
- `test_mido.py` — a throwaway.
- `midiutil/` — Mark Wirt's MIDI library, vendored (not mine).
- `requirements.txt` — one dead line pointing at a Google Code SVN URL that died in 2015.
- `README.original.md` — the 2015 readme, verbatim.
- `sample_output/` — 18 of the original 30,420 files. Enough to prove a point (see the roast).
- `demos/` — the two real audio renders. Actual music that came out of this thing.

## Part 1 → Part 2

Part 1 taught me the algorithm. Part 2 keeps the algorithm, adds the humanization I was "too lazy"
to write, wires in a pile of other generators, plays sound in the browser, and puts the whole thing
behind an aesthetic that looks like the animals are running the sequencer. Because they are.
