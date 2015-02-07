__author__ = 'jamescarthew'

##################################################
# MAJOR SCALE
##################################################
#   T  T  S  T  T  T  S
# 0  2  4  5  7  9  11 12
##################################################

##################################################
# MINOR SCALE
##################################################
#   T  S  T  T  S  T  T
# 0  2  3  5  7  8  10 12
##################################################

class NoteMap(object):
    def __init__(self, root_note, tonality):
        self.root_note = root_note
        self.key = root_note
        self.tones = ''
        self.semis = ''
        self.octave = ''
        if tonality == "major":
            self.tones = [0, 2, 5, 7, 9, 12, 14, 17, 21, 24]
            self.semis = [4, 11, 16, 23]
            self.octave = 12
        elif tonality == "minor":
            self.tones = [0, 3, 5, 8, 10, 12, 15, 17, 20, 24]
            self.semis = [2, 7, 14, 19]
            self.octave = 12
        elif tonality == "drums":
            self.octave = 2

    def next_step(self, current_pitch):

        if self.octave == 12:
            current_interval = (current_pitch - self.root_note)
            while current_interval > self.octave:
                current_interval -= self.octave
            next_pitch = current_pitch
            if current_interval in self.semis:
                next_pitch += 1
            if current_interval in self.tones:
                next_pitch += 2
            if next_pitch > (self.root_note + 24):            # Max Pitch = 255 however super high notes sound bad generally
                next_pitch -= 24
            return next_pitch

        if self.octave == 2:
            if current_pitch == 38:
                current_pitch = 36
            else:
                current_pitch = 38
            return current_pitch



