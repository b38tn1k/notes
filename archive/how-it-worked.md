# How it worked

> *Written by **Claude Opus 4.8** (Anthropic), reconstructed from b38tn1k's 2015 source.*

The whole thing is one algorithm wearing a CLI. Here's the data flow and the mechanism.

## Data flow

```
python notes.py 5 7 -i 6
        │
        ▼
  argparse  ──►  main()  ──►  notes()  ──►  NoteMap.next_step()  ──►  midiutil writes .mid
 (parse args)  (defaults)   (the loop)      (pick the pitch)         (bytes to disk)
```

- **`main()`** (`part1-python/notes.py:54`) reads the args, fills in defaults (minor, 4/4, 4 bars,
  root note 48 = C3), and builds the output filename.
- **`notes()`** (`part1-python/notes.py:112`) is the compositional loop.
- **`NoteMap`** (`part1-python/scales.py:18`) decides what pitch comes next.
- **`midiutil`** turns `(pitch, time, duration, volume)` into a standard MIDI file.

## The Molecular Music Box

A loop is `meter * loop_length` beats — 4 × 4 = 16 by default. `process_loop` is an array with one
counter per beat, tracking how many times each beat has been landed on.

The core loop (`part1-python/notes.py:145-165`), in plain english:

1. Start at `beat = 0` with `process_interval = interval_one`.
2. If this beat has already been visited (`process_loop[beat] > 0`), **toggle** the interval between
   `interval_one` and `interval_two`. This is the whole trick.
3. Mark the beat, place a note there.
4. Advance the pitch one step up the scale (`next_step`).
5. Jump forward: `beat += process_interval`.
6. If you ran off the end of the loop, that's one iteration done — wrap the cursor back and decrement.

Because the interval flips every time paths cross, the sequence never settles into a dumb repeat.
The rhythm is **emergent** from just five numbers: `(interval_one, interval_two, loop_length, meter,
iterations)`. Nobody typed in a beat. That's the good idea.

## Picking the pitch

`next_step` (`part1-python/scales.py:37`) walks **up** the diatonic scale. It measures how far the
current note sits above the root, folds that into one octave, and adds `+2` if it's on a whole-tone
position or `+1` on a semitone position — so the melody is always in key and always climbing. When it
gets too high (past `root + 24`) it drops two octaves and keeps going.

Major and minor are just two different step patterns (`scales.py:26-33`). **Drums mode**
(`scales.py:53-58`) reuses the exact same loop but throws away the scale and toggles two General-MIDI
percussion notes — 36 (kick) and 38 (snare) — instead. Same engine, different two-note "scale."

## Making a lot of files

`makealotofmidifiles.py` is a four-deep nested loop that shells out to `python notes.py ...` once per
file. It ran the interpreter tens of thousands of times and produced the corpus. See
[the-graveyard.md](the-graveyard.md) for exactly how many, and why most of them are identical.

## Reviving it (if you must)

It's Python **2.7** (`print` is a statement, not a function). The good news: `midiutil` is vendored
in `part1-python/midiutil/`, so you don't need the dead SVN dependency in `requirements.txt`.

```bash
pyenv install 2.7.18
pyenv shell 2.7.18
cd archive/part1-python
python2 notes.py 5 7 -i 6        # → Int5and7Ite6_in_1_minor.mid
```

That's it. No `pip install`. The one line in `requirements.txt` has pointed at a corpse since 2015,
and it turns out you never needed it.
