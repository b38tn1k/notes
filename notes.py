#!/usr/bin/env python
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
# TODO: BEATIDI creates melodies using the
# procedural generation engine. KICK and SNARE
# patterns are created using a 2 channel version
# of procedural generation, hi hat is generated
# separately, using a single channel and more
# iterations
#
# TODO: MELIDI is a command line version of notes
# - the western music scale class must be in the
# same file
#
# TODO: the beat reset needs to be carried across
# loops (currently it is resetting)
#
# TODO: convert scale generator into a python
# generator
#
# TODO: look into how midiutil handles 1/2, 1/4,
# 1/16, etc beats

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
parser.add_argument('-o', '--output',
                    help='set the name of the outputted MIDI file (no extension required)', required=False)
parser.add_argument('-v', '--verbose', help='toggle verbose mode', dest='verbose',  action='store_true', required=False)
parser.add_argument('-f', '--first_note', help='''a number between 0-7 that determines the first note in the sequence,'
                                                 ' within the major or minor scale''', required=False)

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

    if args['output']:
        track_name = str(args['output']) + ".mid"
    else:
        track_name = "Intervals_" + str(track_interval_one) + "_" + str(track_interval_two) + "_Iterations_" + str(melody_iteration) + "_Tonality_" + tonality + "_First_Note" + str(first_note) + ".mid"

    if args['verbose']:
        verbose = True
    else:
        verbose = False
    beats_in_loop = meter*loop_length - 1
    inverse_melody_iteration = melody_iteration

    # Song Settings
    #TODO: argparser setup!
    track_tempo = 120
    root_note = 60
    process_loop = numpy.zeros(beats_in_loop+1)
    process_interval = track_interval_one
    beat = 0

    # Initialise Tonality
    scale = WesternScale(root_note, tonality)
    current_note = int(root_note)
    for i in range(first_note, 0):
        current_note = scale.next_pitch(current_note)

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
        if beat > beats_in_loop:
            if verbose:
                print 'Reached End of Loop at: ' + str(beat)
            melody_iteration -= 1
            beat -= beats_in_loop + 1       # The +1 returns the cursor to beat 1 rather than beat 0 (out of bounds)
            if verbose:
                print 'Beat reset to: ' + str(beat)
        if verbose:
            print "Iteration: " + str(inverse_melody_iteration-melody_iteration) + " Beat: " + str(beat)
            print process_loop

    # MIDI print
    bin_file = open(track_name, 'wb')
    track_handle.writeFile(bin_file)
    bin_file.close()
    exit()

if __name__ == "__main__":
    main()



