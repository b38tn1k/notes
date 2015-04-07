#!/user/bin/env python

import argparse
import os

# A lame/quick way of making ringtones 
# based of Australian mobile phone numbers
# needs fleshing out

parser = argparse.ArgumentParser(description='a script to make ring tones from phone numbers')

parser.add_argument('number', metavar='N', type=str, nargs='+',
                    help='A mobile phone number: +61XXXXXXXXX')
args = vars(parser.parse_args())


class ToneComponent(object):
    def __init__(self, interval_1, interval_2, iteration, tonality):
        self.interval_1 = interval_1
        self.interval_2 = interval_2
        self.iteration = iteration
        self.tonality = tonality

    def make_command_string(self, output):
        if self.tonality == 'major' or self.tonality == 'minor':
            name = 'melody'
        else:
            name = 'drums'
        return "python notes.py {!s} {!s} -i {!s} -t {!s} -o {!s}/{!s}".format(
            self.interval_1, self.interval_2, self.iteration, self.tonality, output, (name+output))


def main():

    number = (args['number'][0])
    print "Constructing ring tone for {!s}" .format(number)
    if len(number) != 12:
        print "I don't know what to do with {!s}".format(number)
        return

    if number[3] > 5:
        tonality = 'major'
    else:
        tonality = 'minor'

    melody = ToneComponent(number[3], number[4], number[5], tonality)
    melody_cmd_string = melody.make_command_string(number)
    drums = ToneComponent(number[4], number[5], number[6], 'drums')
    drums_cmd_string = drums.make_command_string(number)

    os.system(melody_cmd_string)
    os.system(drums_cmd_string)




if __name__ == "__main__":
    main()