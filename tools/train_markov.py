#!/usr/bin/env python3
"""Train an order-k Markov chain on a folder of MIDI files and freeze it to JSON
for the SPA (src/generators/markov.js reads this schema).

    pip install mido
    python tools/train_markov.py path/to/midis/ -o public/models/markov.json -k 1

Tokens are "interval:durBucket" (pitch interval between consecutive notes;
duration quantized to a small bucket set) so the model is transposition- and
tempo-invariant. Feed it real music — the more melodic the corpus, the better
the loops.
"""
import argparse
import glob
import json
import os
import sys
from collections import defaultdict

try:
    import mido
except ImportError:
    sys.exit("needs mido:  pip install mido")

DUR_BUCKETS = [0.25, 0.5, 1.0, 2.0, 4.0]  # in beats; index is the token's durBucket


def bucket(beats):
    best, bi = 1e9, 0
    for i, b in enumerate(DUR_BUCKETS):
        if abs(b - beats) < best:
            best, bi = abs(b - beats), i
    return bi


def notes_from_midi(path):
    """Return each track's notes as [(start_beat, pitch, dur_beats)], sorted."""
    try:
        mid = mido.MidiFile(path)
    except Exception as e:
        print(f"  skip {os.path.basename(path)}: {e}", file=sys.stderr)
        return []
    tpb = mid.ticks_per_beat or 480
    out = []
    for track in mid.tracks:
        t = 0
        on = {}  # pitch -> (start_tick, velocity)
        notes = []
        for msg in track:
            t += msg.time
            if msg.type == "note_on" and msg.velocity > 0:
                on[msg.note] = t
            elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                if msg.note in on:
                    start = on.pop(msg.note)
                    notes.append((start / tpb, msg.note, max(0.05, (t - start) / tpb)))
        if len(notes) >= 2:
            notes.sort(key=lambda n: n[0])
            out.append(notes)
    return out


def train(paths, order):
    start = defaultdict(int)
    trans = defaultdict(lambda: defaultdict(int))
    seqs = 0
    for path in paths:
        for notes in notes_from_midi(path):
            toks = []
            for i in range(1, len(notes)):
                interval = notes[i][1] - notes[i - 1][1]
                if abs(interval) > 24:
                    interval = max(-24, min(24, interval))
                toks.append(f"{interval}:{bucket(notes[i][2])}")
            if not toks:
                continue
            seqs += 1
            start[toks[0]] += 1
            for i in range(len(toks) - 1):
                state = ",".join(toks[max(0, i - order + 1):i + 1])
                trans[state][toks[i + 1]] += 1
    if not seqs:
        sys.exit("no usable note sequences found in the corpus")
    return {
        "order": order,
        "durations": DUR_BUCKETS,
        "start": dict(start),
        "trans": {k: dict(v) for k, v in trans.items()},
        "_meta": {"sequences": seqs, "states": len(trans)},
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("corpus", help="folder of .mid files (searched recursively)")
    ap.add_argument("-o", "--out", default="public/models/markov.json")
    ap.add_argument("-k", "--order", type=int, default=1)
    args = ap.parse_args()

    paths = glob.glob(os.path.join(args.corpus, "**", "*.mid"), recursive=True)
    paths += glob.glob(os.path.join(args.corpus, "**", "*.midi"), recursive=True)
    if not paths:
        sys.exit(f"no .mid files under {args.corpus}")
    print(f"training order-{args.order} on {len(paths)} files ...")
    model = train(paths, args.order)
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(model, f)
    print(f"wrote {args.out}  ({model['_meta']['sequences']} sequences, {model['_meta']['states']} states)")


if __name__ == "__main__":
    main()
