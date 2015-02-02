from midiutil.MidiFile import MIDIFile
import uuid
import numpy

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

def main():

    # Song Seed
    tonality = "minor"
    track_interval_one = 3
    track_interval_two = 7
    loop_length_in_measures = 4
    number_of_beats_in_a_measure = 4
    beats_in_loop = number_of_beats_in_a_measure*loop_length_in_measures - 1
    melody_iteration = 7
    inverse_melody_iteration = melody_iteration

    # Song Settings
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
    track_name = str(uuid.uuid1()) + "_" + tonality + ".mid"
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
                + " Interval: " + str(process_interval) + " Note Value: " + str(process_loop[beat]) + " Trigger Value: " + str(process_loop[beat])
            if process_interval == track_interval_one:
                process_interval = track_interval_two
            else:
                process_interval = track_interval_one
        process_loop[beat] += 1
        track_handle.addNote(track_index, track_channel, current_note, beat, note_duration, track_volume)
        current_note = scale.next_pitch(current_note)
        beat += process_interval
        if beat > beats_in_loop:
            melody_iteration -= 1
            beat -= beats_in_loop
        print "Iteration: " + str(inverse_melody_iteration-melody_iteration) + " Beat: " + str(beat)
        print process_loop


    # MIDI print
    bin_file = open(track_name, 'wb')
    track_handle.writeFile(bin_file)
    bin_file.close()
    exit()

if __name__ == "__main__":
    main()



