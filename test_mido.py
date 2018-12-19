from mido import MidiFile

last_note = -1

mid = MidiFile('new_song.mid')

for i, track in enumerate(mid.tracks):
    print('Track {}: {}'.format(i, track.name))
    i = 0
    for message in track:
        print(message)
        # if (message.type == 'note_on'):
        #     if (last_note == -1):
        #         last_note = message.note
        #     else:
        #         print ("Last Note: {} This Note: {} Interval:{}".format(last_note, message.note, last_note - message.note))
        #         last_note = message.note
