# ⚰️ The Graveyard

The abandoned engines, the ghost that lives only in commit messages, the thirty thousand files, and
the junk that rode along in git. Everything here is verified against the repo.

## The 30,420 MIDI files

`part1-python/makealotofmidifiles.py:38-45`

```python
for int_1 in range(3, 16):
    for int_2 in range(4, 16):
        for iteration in range(3, 16):
            for first_note in range(1, 8):
                system("python notes.py {!s} {!s} -i {!s} -t 'major' ...".format(...))
                system("python notes.py {!s} {!s} -i {!s} -t 'minor' ...".format(...))
                system("python notes.py {!s} {!s} -i {!s} -t 'drums' ...".format(...))
```

A four-deep nested loop that spawns a **fresh Python interpreter** for every file. The arithmetic:
13 × 12 × 13 × 7 = **14,196** major, the same **14,196** minor, and — because drums ignores
`first_note`, so six of every seven runs overwrote each other (see [Exhibit A](hall-of-shame.md)) —
**2,028** drums. Total: **30,420 files, ~119 MB**, all committed to git with the message `MIDI dump`.

They've been thinned to 18 representative files in `part1-python/sample_output/`, kept deliberately:
all seven `Int5and7Ite6_in_1..7_major.mid` twins (so the one-byte-apart proof is self-demonstrating),
a matched `_minor` and `_drums`, and a couple of extremes. The other ~30,400 were `git rm`'d from the
working tree so a clone doesn't drag 119 MB around — but they're **still in the commit history**,
delta-compressed down to ~34 MB, because that's where the silliness happened and that's where the
fossil belongs.

## `noise.py` — the engine that never shipped

A completely different, more ambitious generator that got abandoned:

- **Home-rolled Perlin/1-f noise** (`noise.py:89`) by octave-doubling and smoothing.
- **Noise-driven arrangement** (`noise.py:102-116`): a noise curve, quantized 0–4, chooses which of
  four melodic cells plays in each section. That's a genuinely good idea.
- **Savitzky–Golay-smoothed melodic contours** — a real technique, applied [four times in a
  row](hall-of-shame.md).

It's Python 3 while the shipped engine is Python 2, it uses `mido` while the shipped engine uses
`midiutil`, it runs `matplotlib` on import, and it was never wired to a CLI. Part 2 resurrects its
*idea* — noise-driven melody — as a proper generator, minus the over-smoothing.

## The Swift ghost

There is no Swift in this repo. There used to be. The commit log is the only evidence:

- `93a817ef initial playground commit (beginning swift implementation)`
- `b530af37 more logic in swift... up to midi stuff`
- `d27275ea maybe I should commit before I delete it again`

An entire native rewrite, started and deleted, surviving only as three commit messages and a feeling.

## The junk parade

Committed to the repo and now removed from the working tree (still in history, cited by the roast):

- `scales.pyc`, `midiutil/MidiFile.pyc`, `midiutil/__init__.pyc` — compiled bytecode, checked in.
- `MidiFile3.py` — the Python 3 port of the MIDI library, vendored and never used.
- `requirements.txt` — one line: `-e svn+http://midiutil.googlecode.com/svn/trunk/`. Google Code shut
  down in **2015**. The dependency it points at has been a corpse for the entire life of this project,
  and the code worked anyway because the library was vendored right next to it.
- `.gitignore` — full of `.gradle`, `/.idea/`, `/build`, `local.properties`. **Android / Gradle /
  IntelliJ** ignores. In a **Python MIDI** project. Leftover from a template, never read, never
  questioned, dutifully carried from 2015 to now.

(For the record: `.DS_Store` is *in* that `.gitignore` and was never actually committed — so at least
one thing in here worked exactly as intended.)
