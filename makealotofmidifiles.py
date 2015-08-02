# notes.py [-h] [-t TONALITY] [-l LOOP_LENGTH] [-ts METER] -i ITERATIONS
#                 [-o OUTPUT] [-v] [-f FIRST_NOTE] [-k KEY]
#                 N [N ...]
#
# Notes procedurally generates small MIDI files that can be looped. Notes can
# run in "major", "minor" or "drums" mode. http://jamescarthew.com/notes for
# more info. Example usage: python notes.py 5 7 -i 6
#
# positional arguments:
#   N                     Two time intervals are required (expressed in beats)
#
# optional arguments:
#   -h, --help            show this help message and exit
#   -t TONALITY, --tonality TONALITY
#                         set the tonality as either "major", "minor" or
#                         "drums", default minor. drums mode returns an
#                         alternating beat between 2 notes useful for layering.
#                         Trigger examples include snare and kick, open and
#                         close hit hat, etc
#   -l LOOP_LENGTH, --loop_length LOOP_LENGTH
#                         set the loop length in measures, default 4
#   -ts METER, --meter METER
#                         set the number of beats in a measure default 4
#   -i ITERATIONS, --iterations ITERATIONS
#                         Set the number of procedural iterations
#   -o OUTPUT, --output OUTPUT
#                         set the name of the outputted MIDI file (no extension
#                         required)
#   -v, --verbose         toggle verbose mode
#   -f FIRST_NOTE, --first_note FIRST_NOTE
#                         a number between 1-8 that determines the first note in
#                         the sequence, within the major or minor scale
#   -k KEY, --key KEY     the key of the song (also the root start note - the
#                         first_note interval)

from os import system

for int_1 in range(3, 16):  # variable
    for int_2 in range(4, 16):  # variable
        for iteration in range(3, 16):  # variable
            for first_note in range(1, 8): # fixed
                # for loop_length in range(4, 16):
                system("python notes.py {!s} {!s} -i {!s} -t 'major' -l {!s} -f {!s}". format(int_1, int_2, iteration, 4, first_note))
                system("python notes.py {!s} {!s} -i {!s} -t 'minor' -l {!s} -f {!s}". format(int_1, int_2, iteration, 4, first_note))
                system("python notes.py {!s} {!s} -i {!s} -t 'drums' -l {!s}". format(int_1, int_2, iteration, 4))
