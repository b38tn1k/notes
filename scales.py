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

class WesternScale(object):
    def __init__(self, root_note, tonality):
        self.root_note = root_note
        self.key = root_note
        self.tones = ''
        self.semis = ''
        if tonality == "major":
            self.tones = [0, 2, 5, 7, 9, 12]
            self.semis = [4, 11]
        elif tonality == "minor":
            self.tones = [0, 3, 5, 8, 10, 12]
            self.semis = [2, 7]
        else:
            self.error(3)

    def next_pitch(self, current_pitch):
        current_interval = current_pitch
        next_pitch = current_pitch
        tone_next = False
        semi_next = False
        if current_pitch < self.root_note:
            self.error(1)
        current_interval -= self.root_note
        while current_interval > 12:
            current_interval -= 12

        for i in range(0, len(self.tones)):
            if current_interval == self.tones[i]:
                # print"tone interval"
                tone_next = True

        for i in range(0, len(self.semis)):
            if current_interval == self.semis[i]:
                # print"semi interval"
                semi_next = True
        if tone_next:
            next_pitch = current_pitch+2
        if semi_next:
            next_pitch = current_pitch+1
        if next_pitch > 180:            # Max Pitch = 255 however super high notes sound bad generally
            next_pitch -= 120
        return next_pitch

    def error(self, identifier):
        if identifier == 1:
            print ("Error: current note below root")
            exit()
        if identifier == 2:
            print("Error: Interval error")
            exit()
        if identifier == 3:
            print("Error: no tonality!")
            exit()




