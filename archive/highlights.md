# Highlights — the genuinely smart bits

> *Written by **Claude Opus 4.8** (Anthropic) — an outside read of b38tn1k's 2015 code.*

No roasting in this file. The roast is [next door](hall-of-shame.md). This is the stuff that was
actually right, and some of it is right enough that Part 2 ports it verbatim.

## 1. Collision-driven interval switching

`part1-python/notes.py:145-156`

```python
while melody_iteration > 0:
    if process_loop[beat] > 0.0:
        if process_interval == track_interval_one:
            process_interval = track_interval_two
        else:
            process_interval = track_interval_one
    process_loop[beat] += 1
    track_handle.addNote(track_index, track_channel, current_note, beat, note_duration, track_volume)
    current_note = scale.next_step(current_note)
    beat += process_interval
```

The melody advances by a fixed interval until it lands somewhere it's been before, and then it
changes its stride. That one flip is what turns "add a number over and over" into a phrase that folds
back on itself and closes into a loop. It's the Molecular Music Box, and it's a real, elegant idea:
the structure of the music comes out of the collision bookkeeping, not out of a hand-written pattern.
Two numbers in, an evolving loop out.

## 2. Scale walking by membership test

`part1-python/scales.py:37-51`

Instead of storing a scale as a list of absolute pitches, `next_step` figures out the next note by
asking *where the current note sits inside the octave* and stepping accordingly:

```python
current_interval = (current_pitch - self.root_note)
while current_interval > self.octave:
    current_interval -= self.octave
next_pitch = current_pitch
if current_interval in self.semis:
    next_pitch += 1
if current_interval in self.tones:
    next_pitch += 2
```

Whole tone → step up 2, semitone → step up 1. The result is that **every note is diatonically
correct no matter what the rhythm engine does**. The melody engine and the harmony engine are cleanly
separated: `notes()` decides *when*, `NoteMap` decides *what*, and they never step on each other.

## 3. Drums as a two-note scale

`part1-python/scales.py:53-58`

```python
if self.tonality == "drums":
    if current_pitch == 38:
        current_pitch = 36
    else:
        current_pitch = 38
    return current_pitch
```

This is the genuinely clever one. Drums don't have a scale, so they don't get one — `next_step`
just alternates kick (36) and snare (38). The rhythm engine upstairs doesn't know or care that it's
driving percussion now instead of a melody. **One loop generator, two completely different musical
jobs**, and the seam between them is four lines. That's good factoring, done by accident or on
purpose, and it's exactly the kind of thing Part 2's pluggable-generator design leans on.

## 4. Knowing the corners weren't cut

`part1-python/notes.py:130-133`

```python
# some of these fields could be approached at a
# later date to achieve a more humanised feel (for
# example velocity) but for now I am lazy
```

Everyone dunks on this comment (the Hall of Shame does too, next door). But read it straight: this is a
mechanical engineer whose only prior code was control theory, and he already knew that constant velocity
sounds robotic, knew *which* field to vary, knew it was a real limitation, and chose to ship anyway.
That's not ignorance, that's a correctly-scoped TODO. Part 2 finally does the humanization this comment
promised — velocity jitter and swing — so the instinct was right, it just took a decade and a rewrite.
