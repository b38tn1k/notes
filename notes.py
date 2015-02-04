#!/usr/bin/env python
from os import system
import argparse
from midiutil.MidiFile import MIDIFile
import numpy
import random

__author__ = 'jamescarthew'
from scales import WesternScale

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

parser = argparse.ArgumentParser(description='NOTES procedurally generates small MIDI files that can be looped')
parser.add_argument('intervals', metavar='N', type=int, nargs='+',
                   help='two time intervals are required (expressed in beats)')
parser.add_argument('-t', '--tonality',
                    help='set the tonality as either "major" or "minor",  default minor', required=False)
parser.add_argument('-l', '--loop_length',
                    help='set the loop length in measures,  default 4',  required=False)
parser.add_argument('-ts', '--meter',
                    help="set the number of beats in a measure default 4", required=False)
parser.add_argument('-i', '--iterations',
                    help='Set the number of procedural iterations',  required=True)
parser.add_argument('-o', '--output', help='set the name of the outputted MIDI file (no extension required)', required=False)

args = vars(parser.parse_args())

def main():

    # Song Seed
    if args['tonality']:
        tonality = args['tonality']
    else:
        tonality = "minor"

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

    if args['output']:
        track_name = str(args['output'])
    else:
        track_name = "Intervals_" + str(track_interval_one) + "_" + str(track_interval_two) + "_Iterations_" + str(melody_iteration) + "_Tonality_" + tonality + ".mid"

    beats_in_loop = meter*loop_length - 1
    inverse_melody_iteration = melody_iteration

    # Song Settings
    #TODO: argparser setup!
    track_tempo = 120
    start_note = 60
    current_note = start_note
    process_loop = numpy.zeros(beats_in_loop+1)
    process_interval = track_interval_one
    beat = 0

    # Initialise Tonality
    scale = WesternScale(start_note, tonality)

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
    # Composition Logic
    while melody_iteration > 0:
        if process_loop[beat] > 0.0:
            print "Switch at Iteration: " + str(melody_iteration) + " Beat: " + str(beat) \
                + " Interval: " + str(process_interval) + " Note Value: " + str(process_loop[beat]) \
                  + " Trigger Value: " + str(process_loop[beat])
            if process_interval == track_interval_one:
                process_interval = track_interval_two
            else:
                process_interval = track_interval_one
        process_loop[beat] += 1
        track_handle.addNote(track_index, track_channel, current_note, beat, note_duration, track_volume)
        current_note = scale.next_pitch(current_note)
        beat += process_interval
        # TODO: the beat reset needs to be carried across loops (currently it is resetting)
        # TODO: convert scale generator into a proper generator
        if beat > beats_in_loop:
            print 'Reached End of Loop at: ' + str(beat)
            melody_iteration -= 1
            beat -= beats_in_loop
            print 'Beat reset to: ' + str(beat)
        print "Iteration: " + str(inverse_melody_iteration-melody_iteration) + " Beat: " + str(beat)
        print process_loop


    # MIDI print
    bin_file = open(track_name, 'wb')
    track_handle.writeFile(bin_file)
    bin_file.close()
    exit()

if __name__ == "__main__":
    main()



