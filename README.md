# notes
notes procedurally generates music based on western music scales

BUGS: I wouldn't put any really high numbers in just yet...

to get it running:
have python2.7

in terminal type:

pip install numpy

then download midiutil from 

https://code.google.com/p/midiutil/ 

and install by naivagting to the directory with the setup.py file and typing 

python setup.py install 

or 

sudo python setup install

navigate to the directory notes.py is in in terminal / cmd and type

python notes.py -h

and it will explain the inputs the minimum amount of options required to run is

python notes.py 2 5 -i 3

where the numbers can be any numbers you choose
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
NOTES procedurally generates small MIDI files that can be looped



positional arguments:


  N                     two time intervals are required (expressed in beats)



optional arguments:


  -h, --help            show this help message and exit
  
  
  -t TONALITY, --tonality TONALITY
                        set the tonality as either "major" or "minor", default
                        minor
                        
                        
  -l LOOP_LENGTH, --loop_length LOOP_LENGTH
                        set the loop length in measures, default 4
                        
                        
  -ts METER, --meter METER
                        set the number of beats in a measure default 4
                        
                        
  -i ITERATIONS, --iterations ITERATIONS
                        Set the number of procedural iterations
                        
                        
  -o OUTPUT, --output OUTPUT
                        set the name of the outputted MIDI file (no extension
                        required)
                        
                        
  -v, --verbose         toggle verbose mode
  
  
  -f FIRST_NOTE, --first_note FIRST_NOTE
                        a number between 0-7 that determines the first note in
                        the sequence,' ' within the major or minor scale

