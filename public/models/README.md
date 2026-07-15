# Markov models

`markov.json` is the model the **Markov** generator samples. The one here is a
hand-seeded default (stepwise-biased melody). Replace it with one trained on your
own MIDI:

```bash
pip install mido
python tools/train_markov.py /path/to/your/midis -o public/models/markov.json -k 1
```

Schema: `{ order, durations[], start{token:weight}, trans{stateKey:{token:weight}} }`
where a token is `"pitchInterval:durationBucketIndex"`. `src/generators/markov.js`
reads it; if the file is missing, the generator falls back to a built-in default.
