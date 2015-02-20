// Playground - noun: a place where people can play

import UIKit

class Notes {
    //Class Variables
    var tones = []
    var semis = []
    var baseScale = ""
    var tempoBPM = 120
    var tonicNote = 0
    var addDrums = true
    //Class Constants
    let octave = 12
    let majorScaleTones = [0, 2, 5, 7, 9, 12, 14, 17, 21, 24]
    let minorScaleTones = [0, 3, 5, 8, 10, 12, 15, 17, 20, 24]
    let majorScaleSemis = [4, 11, 16, 23]
    let minorScaleSemis = [2, 7, 14, 19]
    let major = "major"
    let minor = "minor"
    
    func notesEngine(){
        
    }
    
    func scalesGenerator(){
        
    }
    
    init(tonicNote: Int, baseScale: String, tempoBPM: Int, addDrums: Bool){
        self.tempoBPM = tempoBPM
        self.tonicNote = tonicNote
        self.baseScale = baseScale
        self.addDrums = addDrums
        if baseScale == self.major{
            self.octave = 12
        } else if baseScale == self.minor {
            self.octave = 12
        } else {
            println("baseScale must be 'major' or 'minor'")
        }
    }
}