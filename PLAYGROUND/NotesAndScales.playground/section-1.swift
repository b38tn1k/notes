/*
NOTES AND SCALES - WORK IN PROGRESS
jamescarthew
Notes and Scales procedurally generates midi compositions.
After initilising Notes and selecting a tempo and key,
two modes of composition are possible via notesEngine:
- 'poly': polyponic
- 'mono': monophonic
These modes can be applied over three baseScales
- 'major': the major scale (uplifting, triumphant, positive)
- 'minor': the minor scale (sober, morose, sad)
- 'rhythm': a reduced note range intended for drum patches
*/

import UIKit
import AudioToolbox

class TrackHandle {
    
    func newPart(partLength: Int) {
        
    }
    
    func addNote(trackIndex: Int, trackChannel: Int, pitch: Int, beat: Int, duration: Int, volume: Int ) {
        
    }
    
    
    func writeToFile(fileName: String) {
        
    }
    
    func clearBeat(beat: Int) {
        
    }
    
}

class Notes {
    
    //Class Variables
    var tones = [Int]()
    var semis = [Int]()
    var baseScale = ""
    var tempoBPM = 120
    var tonicNote = 0
    var trackHandle = TrackHandle()
    
    //Class Constants
    let majorScaleTones = [0, 2, 5, 7, 9, 12, 14, 17, 21, 24]
    let minorScaleTones = [0, 3, 5, 8, 10, 12, 15, 17, 20, 24]
    let majorScaleSemis = [4, 11, 16, 23]
    let minorScaleSemis = [2, 7, 14, 19]
    let major = "major"
    let minor = "minor"
    let rhythm = "rhythm"
    let mono = "mono"
    let poly = "poly"
    let drumPitchOne = 1
    let drumPitchTwo = 2
    let musicOctave = 12
    
    //This function performs the procedural loop generation method
    func notesEngine(voiceMode: String, intervalOne: Int, intervalTwo: Int, iterations: Int, sequenceLength: Int) {
        var iterations = iterations
        var processLoop = [Int]()
        var beat = 0
        var processInterval = intervalOne
        var currentPitch = self.tonicNote
        while iterations > 0 {
            if processInterval == intervalOne {
                processInterval = intervalTwo
            } else {
                processInterval = intervalOne
            }
            processLoop[beat] += 1
            if voiceMode == self.mono {
                //delete any lower notes in the event of a collision
                trackHandle.clearBeat(beat)
            }
            trackHandle.addNote(0, trackChannel: 0, pitch: currentPitch, beat: beat, duration: 1, volume: 1)    //Need to add methods to populate (and control) all this shit...
            currentPitch = self.scalesGenerator(currentPitch)
            beat += processInterval
            iterations -= 1
            if beat > sequenceLength {
                beat -= sequenceLength + 1
            }
        }
    }
    
    //This function provides notesEngine with the next note in the sequence.
    func scalesGenerator(currentPitch: Int) -> Int {
        
        var nextPitch = currentPitch
        //in the case of melody and harmony
        if self.baseScale == self.major || self.baseScale == self.minor {
            var currentInterval = currentPitch - self.tonicNote
            while currentInterval > self.musicOctave {
                currentInterval -= self.musicOctave
            }
            for semi in self.semis {
                if currentInterval == semi {
                    nextPitch += 1
                }
            }
            for tone in self.tones {
                if currentInterval == tone {
                    nextPitch += 2
                }
            }
            if nextPitch > self.tonicNote + 24 {
                nextPitch -= 24
            }
            //creation of a drum track
        } else if self.baseScale == self.rhythm {
            nextPitch = self.drumPitchOne
            if currentPitch == self.drumPitchOne {
                nextPitch = self.drumPitchTwo
            }
        } else {
            println("[NotesAndScales - nextPitch]: baseScale must be 'major', 'minor' or 'rhythm'")
            exit(-1)
        }
        return nextPitch
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
        } else if baseScale == self.rhythm{
            //pass
        } else {
            println("[NotesAndScales - init]: baseScale must be 'major', 'minor' or 'rhythm'")
            exit(-1)
        }
    }
}
