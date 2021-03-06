#!/usr/bin/env python
import argparse
from midiutil.MidiFile import MIDIFile
import random
__author__ = 'jamescarthew'
from scales import NoteMap

##################################################
# NOTES
##################################################
# Notes generates MIDI files. The MIDI files are
# generated using rules that determine the
# placement of the notes in time, while the note
# sequence itself is continuously ascending. The
# base composition is created utilising 8 notes -
# these notes are then chosen based on the desired
# mood of the piece. To create a happy, triumphant
# or uplifting piece a Major scale set is chosen.
# For a sombre, morose or sad piece a Minor scale
# is used. Additional modes would allow for an
# extended range of expression
##################################################
#
# TODO: look into how midiutil handles 1/2, 1/4,
# 1/16, etc beats

parser = argparse.ArgumentParser(description='''Notes procedurally generates small MIDI files that can be looped.
                                                Notes can run in "major", "minor" or "drums" mode.
                                                http://jamescarthew.com/notes for more info.
                                                Example usage: python notes.py 5 7 -i 6''')
parser.add_argument('intervals', metavar='N', type=int, nargs='+',
                   help='Two time intervals are required (expressed in beats)')
parser.add_argument('-t', '--tonality', help='''set the tonality as either "major",
                                                "minor" or "drums",  default minor.
                                                drums mode returns an alternating beat between 2 notes
                                                useful for layering. Trigger examples include snare and kick,
                                                open and close hit hat, etc''', required=False)
parser.add_argument('-l', '--loop_length',
                    help='set the loop length in measures,  default 4',  required=False)
parser.add_argument('-ts', '--meter',
                    help="set the number of beats in a measure default 4", required=False)
parser.add_argument('-i', '--iterations',
                    help='Set the number of procedural iterations',  required=True)
parser.add_argument('-o', '--output',
                    help='set the name of the outputted MIDI file (no extension required)', required=False)
parser.add_argument('-v', '--verbose', help='toggle verbose mode', dest='verbose',  action='store_true', required=False)
parser.add_argument('-f', '--first_note', help='''a number between 1-8 that determines the first note in the sequence,
                                                  within the major or minor scale''', required=False)
parser.add_argument('-k', '--key', help='the key of the song (also the root start note - the first_note interval)', required=False)

args = vars(parser.parse_args())


def main():

    if args['tonality']:
        tonality = args['tonality']
    else:
        tonality = 'minor'

    if args['intervals']:
        intervals = args['intervals']
        track_interval_one = int(intervals[0])
        track_interval_two = int(intervals[1])
    else:
        track_interval_one = random.randint(1, 12)
        track_interval_two = random.randint(1, 12)

    if args['loop_length']:
        loop_length = int(args['loop_length'])
    else:
        loop_length = 4

    if args['meter']:
        meter = int(args['meter'])
    else:
        meter = 4

    melody_iteration = int(args['iterations'])

    if args['first_note']:
        first_note = int(args['first_note'])
    else:
        first_note = 1

    if args['key']:
        root_note = int(args['key'])
    else:
        root_note = 48


    if args['output']:
        track_name = str(args['output']) + ".mid"
    else:
        track_name = "Int{!s}and{!s}Ite{!s}_in_{!s}_{!s}.mid".format(str(track_interval_one), str(track_interval_two), str(melody_iteration), str(first_note), tonality)
    if args['verbose']:
        verbose = True
        switch_string = "Switch at Iteration: {!s} Beat: {!s} Interval: {!s} Note Value: {!s} Trigger Value: {!s}"
        iteration_string = "Iteration: {!s} Beat: {!s} Process Loop: {!s}"
        end_of_loop_string = "Reached End of Loop at: {!s}"
        beat_reset_string = "Beat reset to: {!s}"
    else:
        verbose = False
    notes(tonality, track_interval_one, track_interval_two, loop_length, meter, melody_iteration, first_note, root_note, track_name, verbose)

def zeroes(num):
    list = []
    for i in range(num):
        list.append(0)
    return list

def notes(tonality, track_interval_one, track_interval_two, loop_length, meter, melody_iteration, first_note, root_note, track_name, verbose):
    beats_in_loop = meter*loop_length - 1
    inverse_melody_iteration = melody_iteration

    # Song Settings
    track_tempo = 120
    beat = 0
    process_loop = zeroes(beats_in_loop+1)
    process_interval = track_interval_one


    # Initialise Tonality
    scale = NoteMap(root_note, tonality)
    current_note = int(root_note)
    for i in range(first_note, 0):
        current_note = scale.next_step(current_note)

    # MIDI STUFF
    #
    # some of these fields could be approached at a
    # later date to achieve a more humanised feel (for
    # example velocity) but for now I am lazy
    track_index = 0
    time_index = 0
    track_channel = 0
    track_volume = 100
    note_duration = 1
    track_handle = MIDIFile(1)
    track_handle.addTrackName(track_index, time_index, track_name)
    track_handle.addTempo(track_index, time_index, track_tempo)


    # COMPOSITIONAL LOGIC
    while melody_iteration > 0:
        if process_loop[beat] > 0.0:
            if verbose:
                print switch_string.format(str(melody_iteration), str(beat), str(process_interval), str(process_loop[beat]), str(process_loop[beat]))
            if process_interval == track_interval_one:
                process_interval = track_interval_two
            else:
                process_interval = track_interval_one
        process_loop[beat] += 1
        track_handle.addNote(track_index, track_channel, current_note, beat, note_duration, track_volume)
        current_note = scale.next_step(current_note)
        beat += process_interval
        if beat > beats_in_loop:
            if verbose:
                end_of_loop_string.format(str(beat))
            melody_iteration -= 1
            beat -= beats_in_loop + 1       # The +1 returns the cursor to beat 1 rather than beat 0 (out of bounds)
            if verbose:
                beat_reset_string.format(str(beat))
        if verbose:
            print iteration_string.format(str(inverse_melody_iteration-melody_iteration), str(beat), str(process_loop))

    print 'I made you {!s} \nhttp://jamescarthew.com/notes for more info'.format(track_name)
    # MIDI print
    with open(track_name, 'wb') as bin_file:
        track_handle.writeFile(bin_file)

if __name__ == "__main__":
    main()
