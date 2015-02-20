/*
NOTES AND SCALES
jamescarthew
Notes and Scales procedurally generates midi compositions.
After initilising Notes and selecting a tempo and key,
three modes of composition are possible via notesEngine:
- 'harmony': polyponic
- 'melody': monophonic
- 'drums': reduced note range and 'fractal hihats'
*/
import UIKit
import AudioToolbox

class Notes {
    
    //Class Variables
    var tones = []
    var semis = []
    var baseScale = ""
    var tempoBPM = 120
    var tonicNote = 0
    var addDrums = true
    
    //Class Constants
    let majorScaleTones = [0, 2, 5, 7, 9, 12, 14, 17, 21, 24]
    let minorScaleTones = [0, 3, 5, 8, 10, 12, 15, 17, 20, 24]
    let majorScaleSemis = [4, 11, 16, 23]
    let minorScaleSemis = [2, 7, 14, 19]
    let major = "major"
    let minor = "minor"
    let musicOctave = 12
    let drumOctave = 2
    let harmony = "harmony"
    let melody = "melody"
    let rhythm = "rhythm"
    
    //This function performs the procedural loop generation method
    func notesEngine(compositionType: String) {
        
        if compositionType == self.harmony || compositionType == self.melody {
            var octave = self.musicOctave
            if compositionType == self.melody {
                //delete any lower notes in the event of a collision
            }
        } else if compositionType == self.rhythm {
            var octave = self.drumOctave
            
        } else {
            println("[NotesAndScales - notesEngine]: compositionType must be 'harmony', 'melody' or 'rhythm'")
            exit(-1)
        }
    }
    
    //This function provides notesEngine with the next note in the sequence.
    func scalesGenerator(){
        
    }
    
    //Initialisation Function
    init(tonicNote: Int, baseScale: String, tempoBPM: Int) {
        
        self.tempoBPM = tempoBPM
        self.tonicNote = tonicNote
        self.baseScale = baseScale
        if baseScale == self.major {
            self.tones = self.majorScaleTones
            self.semis = self.majorScaleSemis
        } else if baseScale == self.minor {
            self.tones = self.minorScaleTones
            self.semis = self.minorScaleSemis
        } else {
            println("[NotesAndScales - init]: baseScale must be 'major' or 'minor'")
            exit(-1)
        }
    }
}
