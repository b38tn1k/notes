import matplotlib.pyplot as plt
import numpy as np
from random import random
from math import factorial

def make_noise(amount):
    x = np.zeros(amount)
    for i in range(amount):
        x[i] = random()
    return x

def savitzky_golay(y, window_size, order, deriv=0, rate=1):
    try:
        window_size = np.abs(np.int(window_size))
        order = np.abs(np.int(order))
    except ValueError:
        raise ValueError("window_size and order have to be of type int")
    if window_size % 2 != 1 or window_size < 1:
        raise TypeError("window_size size must be a positive odd number")
    if window_size < order + 2:
        raise TypeError("window_size is too small for the polynomials order")
    order_range = range(order+1)
    half_window = (window_size -1) // 2
    # precompute coefficients
    b = np.mat([[k**i for i in order_range] for k in range(-half_window, half_window+1)])
    m = np.linalg.pinv(b).A[deriv] * rate**deriv * factorial(deriv)
    # pad the signal at the extremes with
    # values taken from the signal itself
    firstvals = y[0] - np.abs( y[1:half_window+1][::-1] - y[0] )
    lastvals = y[-1] + np.abs(y[-half_window-1:-1][::-1] - y[-1])
    y = np.concatenate((firstvals, y, lastvals))
    return np.convolve( m[::-1], y, mode='valid')

def make_octave(base):
    x = np.zeros(base.size*2)
    j = 0
    for i in range(base.size):
        x[j] = base[i]
        j = j+1
        x[j] = base[i]
        j = j+1
    x = savitzky_golay(x, 21, 3)
    return x

def combine(base, layer, ratio):
    x = np.zeros(base.size)
    for i in range(base.size):
        x[i] = base[i] * ratio + (layer[i] * (1-ratio))
    return x

def scale(base, _range, positive=False):
    x = np.zeros(base.size)
    for i in range(base.size):
        x[i] = (int)(_range * base[i])
    offset = (_range/2) - np.median(x)
    for i in range(x.size):
        x[i] = x[i] + offset
        x[i] = int(x[i] - (_range / 2))
    if positive == True:
        for i in range(x.size):
            x[i] = int(abs(x[i]))
    return x

def rotate(base):
    window = 0
    if base.size % 2 == 0:
        window = base.size - 1
    else:
        window = base.size
    curve = savitzky_golay(base, window, 0)
    offset = np.zeros(base.size)
    for i in range(base.size):
        offset[i] = base[i] - curve[i]
    x = np.zeros(base.size)
    for i in range(x.size):
        x[i] = np.mean(base) + offset[i]
    return x

def normalise(base):
    max = np.max(base)
    min = np.min(base)
    for i in range(base.size):
        base[i] = base[i] - min
        base[i] = base[i] / (max - min)
    max = np.max(base)
    min = np.min(base)
    return base

def perlin(length, iterations, dampening):
    # make base noise
    base = make_noise(length)
    for i in range(iterations):
        # generate octaves
        octave = make_octave(base)
        # add octaves with gains
        base = combine(base, octave, dampening)
        # make it even around mean
        base = rotate(base)
        base = normalise(base)
    return base

x = perlin(16, 5, 0.5)
structure = scale(x, 5, positive=True)
notes = np.zeros(shape=(4, 16))
for i in range(4):
    x = perlin(16, 5, 0.35)
    notes[i] = scale(x, 14)
y = np.zeros(16*4)
count = 0
for j in structure:
    # print (j)
    # print (notes[int(j)][:4])
    for k in (notes[int(j)][:4]):
        y[count] = k
        count+=1
print(y)

plt.plot(y)
plt.plot(y, "bo")

y = savitzky_golay(y, 5, 3)
y = savitzky_golay(y, 5, 3)

plt.plot(y)
plt.plot(y, "go")

x = perlin(16, 5, 0.35)
notes = scale(x, 24)
plt.plot(notes, "*")
plt.plot(notes)
plt.plot(structure, "r*")
plt.plot(structure)

# test some rhythm stuff

beats = np.zeros(16)
int1 = 5
int2 = 7
jump = int1
pos = 0
j = 0
while j < 9:
    pos = pos % 16
    if beats[pos] == 0:
        beats[pos] = 1
        pos += jump
        j += 1
    else:
        if jump == int1:
            jump = int2
        else:
            jump = int1
        pos += jump
print(beats)
# y = notes
from mido import Message, MidiFile, MidiTrack, MetaMessage, bpm2tempo
mid = MidiFile(ticks_per_beat=32)
track = MidiTrack()
track.append(MetaMessage('time_signature', numerator=4, denominator=4, clocks_per_click=24, notated_32nd_notes_per_beat=8, time=0))
track.append(MetaMessage('set_tempo', tempo=500000, time=0))
mid.tracks.append(track)
beat_pos = 0
for i in range(y.size):
    track.append(Message('note_on', note=60 + int(y[i]), velocity=64, time=0))
    j = 8
    beat_pos = beat_pos % 16
    while beats[beat_pos] != 1:
        j +=8
        beat_pos+=1
    beat_pos+=1
    track.append(Message('note_off', note=60 + int(y[i]), velocity=127, time=j))

## ANOTHER TRACK?
y = savitzky_golay(y, 5, 3)
y = savitzky_golay(y, 5, 3)
y = savitzky_golay(y, 5, 3)
y = savitzky_golay(y, 5, 3)

# test some rhythm stuff

beats = np.zeros(16)
int1 = 7
int2 = 11
jump = int1
pos = 0
j = 0
while j < 9:
    pos = pos % 16
    if beats[pos] == 0:
        beats[pos] = 1
        pos += jump
        j += 1
    else:
        if jump == int1:
            jump = int2
        else:
            jump = int1
        pos += jump
print(beats)


track = MidiTrack()
track.append(MetaMessage('time_signature', numerator=4, denominator=4, clocks_per_click=24, notated_32nd_notes_per_beat=8, time=0))
track.append(MetaMessage('set_tempo', tempo=500000, time=0))
mid.tracks.append(track)
beat_pos = 0
for i in range(y.size):
    track.append(Message('note_on', note=60 + int(y[i]), velocity=64, time=0))
    j = 8
    beat_pos = beat_pos % 16
    beat_pos = beat_pos % 15
    print(beat_pos)
    while beats[beat_pos] != 1:
        j +=8
        beat_pos+=1
    beat_pos+=1
    track.append(Message('note_off', note=60 + int(y[i]), velocity=127, time=j))


mid.save('new_song.mid')

# plt.show()
