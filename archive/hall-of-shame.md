# 🏆 Hall of Shame

> *Written by **Claude Opus 4.8** (Anthropic) — a roast of b38tn1k's 2015 code, not the author's own
> words. "I" here is the machine that read every line; the mistakes belong to a fearless 22-year-old.*

Everything here is real, quoted with `file:line`, and verified against the actual bytes. It's a roast,
not a takedown — this was a first project and it *shipped*, which is more than most ideas manage. But
it earned every word of this.

---

## Exhibit A — the `--first_note` flag that did nothing, 30,420 times

`part1-python/notes.py:126`

```python
for i in range(first_note, 0):
    current_note = scale.next_step(current_note)
```

b38tn1k added a `--first_note` flag. Documented it lovingly in argparse ("a number between 1-8").
Threaded it through `main()`. Stamped it into the filename of every single generated file. And then
looped `range(first_note, 0)`.

For any value you'd actually pass — 1 through 8 — that's `range(1, 0)`, `range(2, 0)`, `range(8, 0)`.
All of them empty. The loop **never runs**. Not once. In 30,420 files. The only way to make it do
anything is to pass a *negative* first note, which the help text does not mention and no human did.

Here's the part that turns a bug into art. The value never touched the notes — but it *did* go into
the filename. So I checked. `Int5and7Ite6_in_1_major.mid` and `Int5and7Ite6_in_7_major.mid`:

```
$ cmp -l Int5and7Ite6_in_1_major.mid Int5and7Ite6_in_7_major.mid
    43  61  67      # byte 43: ASCII '1' vs '7'. That is the only difference.
```

Both 232 bytes. They differ at **exactly one byte** — byte 43 — the digit written into the track
name. The music is identical. Six of every seven "major" files in that corpus are the same song
wearing a different name tag.

And the drums? Drums mode leaves `first_note` out of the filename. So all seven collisions wrote to
the *same path* and silently overwrote each other. That's the only reason the drums folder has
**2,028** files instead of 14,196 (14,196 ÷ 7 = 2,028, exactly). The same bug quietly *cloned* the
melodies and quietly *deleted* the drums. Perfect symmetry. Chef's kiss.

---

## Exhibit B — `zeroes()`, versus the standard library

`part1-python/notes.py:106`

```python
def zeroes(num):
    list = []
    for i in range(num):
        list.append(0)
    return list
```

This is `[0] * num`. It has always been `[0] * num`. Six lines to reimplement multiplication. It's
called once. And it names its local variable `list` — yes, *that* `list`, the builtin, now shadowed
and face-down in the gutter for the duration of the function. The very next thing this file does is
use `midiutil`, a third-party library, correctly — so b38tn1k clearly knew libraries existed.
`zeroes()` is a small monument to a Tuesday.

---

## Exhibit C — `scales.py`, where half the music theory is a painting of a door

`part1-python/scales.py:22`, `:27`, `:41`

```python
self.tones = ''                                       # line 22: an empty *string*
...
self.tones = [0, 2, 5, 7, 9, 12, 14, 17, 21, 24]      # line 27: reaches up two octaves
...
while current_interval > self.octave:                 # line 41: octave = 12
    current_interval -= self.octave
```

The scale tables climb to 24 — two octaves of carefully chosen intervals, `14, 17, 21, 24` and the
semitone partners `16, 23`. It looks like real theory. But four lines into `next_step` the code folds
every interval back below 12 *before* it ever tests membership. So those upper entries can **never
match**. They are painted-on windows. Half the music-theory brain is a beautiful, load-bearing-looking
diagram of a door that isn't there.

Bonus, two lines up: `self.tones = ''`. Not `[]`. An empty **string**, initialised and standing by,
in case b38tn1k ever wanted to `.append` to it and find out live what a `TypeError` feels like.

---

## Exhibit D — `noise.py`, the engine b38tn1k smoothed to death

`part1-python/noise.py:174`

```python
## ANOTHER TRACK?
y = savitzky_golay(y, 5, 3)
y = savitzky_golay(y, 5, 3)
y = savitzky_golay(y, 5, 3)
y = savitzky_golay(y, 5, 3)
```

A Savitzky–Golay filter smooths a signal. b38tn1k ran it four times in a row, which is how you arrive
at a melody with the dynamic range of a dial tone. A few lines down:

```python
beat_pos = beat_pos % 16
beat_pos = beat_pos % 15   # noise.py:211
print(beat_pos)            # noise.py:212
```

Two modulos back to back — `% 16`, then immediately "fixed" to `% 15` because something was landing
out of bounds and 15 made the crash stop — followed by a `print` added to watch it and then left in
forever. This whole file is **Python 3** (the rest of the project is Python 2), it generates a song
*as a side effect of being imported*, and it never shipped. It's in [the graveyard](the-graveyard.md)
because it's family.

---

## Exhibit E — the commit log, a coming-of-age novel

71 commits. A representative sample:

- `some dumb stuff in scales` — accurate self-assessment, rare and admirable.
- `added WIP comment just incase` — a commit whose entire payload is a comment that says WIP,
  committed in case the WIP comment turned out to be needed. It was not.
- `maybe I should commit before I delete it again` — an entire Swift rewrite talked out of existence
  in the body of its own commit. We've all been there. Most of us didn't `git push` the eulogy.
- `anal retentive whitespace fixes` — self-awareness is the first step.
- `more logic in swift... up to midi stuff` — foreshadowing for a sequel that got deleted.

And then **28** of the 71 commits — nearly *half* — are titled `Update README.md`. Not one of them
was the last word. This very folder is, in some sense, commit #29.

---

*Verdict: 515 lines that implement a legitimately clever algorithm, shipped, made real music, and
then celebrated by generating thirty thousand near-identical files named after a flag that never
ran. Ten out of ten. Young, fearless, and wrong in exactly the right ways.*
