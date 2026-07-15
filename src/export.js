// Export the current loop as a Standard MIDI File.
import { Midi } from '@tonejs/midi';

export function downloadMidi(notes, { bpm, name = 'loop' }) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const track = midi.addTrack();
  const spb = 60 / bpm; // seconds per quarter-note beat
  for (const n of notes) {
    track.addNote({
      midi: n.pitch,
      time: n.startBeat * spb,
      duration: n.durationBeats * spb,
      velocity: n.velocity / 127,
    });
  }
  const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.mid`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
