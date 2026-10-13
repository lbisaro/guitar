/**
 * MidiWriter.js
 * Generador binario nativo de archivos MIDI estándar (SMF Tipo 1) sin dependencias externas.
 * Soporta múltiples pistas (tempo, batería en canal 10, bajo en canal 1, guitarra en canal 2).
 */
const MidiWriter = (function () {
  'use strict';

  // Variable-Length Quantity (VLQ) utilizado por MIDI para delta-times
  function writeVarInt(value) {
    const bytes = [];
    let buffer = value & 0x7F;
    while ((value >>= 7)) {
      buffer <<= 8;
      buffer |= ((value & 0x7F) | 0x80);
    }
    while (true) {
      bytes.push(buffer & 0xFF);
      if (buffer & 0x80) buffer >>= 8;
      else break;
    }
    return bytes;
  }

  // Convierte un string ASCII a array de bytes
  function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  // Convierte un número a 2 bytes (big endian)
  function numTo2Bytes(num) {
    return [(num >> 8) & 0xFF, num & 0xFF];
  }

  // Convierte un número a 4 bytes (big endian)
  function numTo4Bytes(num) {
    return [(num >> 24) & 0xFF, (num >> 16) & 0xFF, (num >> 8) & 0xFF, num & 0xFF];
  }

  /**
   * Construye un archivo MIDI binario en memoria.
   * @param {Object} options
   * @param {number} options.bpm - Tempo en beats por minuto (ej: 120)
   * @param {Array<Object>} options.chords - Lista de acordes por compás: { rootMidi, notesMidi: [n1, n2, ...], durationBeats: 4 }
   * @param {number} options.timeSignatureNum - Numerador del compás (ej: 4)
   * @param {number} options.timeSignatureDen - Denominador del compás (ej: 4)
   * @returns {Uint8Array} Archivo binario MIDI (.mid)
   */
  function buildBackingTrackMidi(options) {
    const ticksPerBeat = 480; // Resolución estándar de ticks por negra
    const bpm = options.bpm || 100;
    const chords = options.chords || [];
    const timeNum = options.timeSignatureNum || 4;
    const timeDen = options.timeSignatureDen || 4;

    // --- PISTA 0: Metadatos (Tempo y Time Signature) ---
    const track0Events = [];
    // Delta 0, Time Signature: FF 58 04 nn dd cc bb
    // Para 4/4: nn=4, dd=2 (2^2=4), cc=24 (clocks por tick de metrónomo), bb=8 (fusas en negra MIDI)
    track0Events.push(...writeVarInt(0));
    track0Events.push(0xFF, 0x58, 0x04, timeNum, Math.round(Math.log2(timeDen)), 24, 8);

    // Delta 0, Set Tempo: FF 51 03 tt tt tt (microsegundos por negra = 60,000,000 / BPM)
    const mpqn = Math.round(60000000 / bpm);
    track0Events.push(...writeVarInt(0));
    track0Events.push(0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF);

    // Delta 0, End of Track: FF 2F 00
    track0Events.push(...writeVarInt(0));
    track0Events.push(0xFF, 0x2F, 0x00);

    // --- PISTA 1: Batería (Canal 10 -> index 0x09) ---
    // Hi-Hat cerrado = 42 en cada negra (1, 2, 3, 4)
    // Bombo = 36 en negra 1 y 3
    // Redoblante = 38 en negra 2 y 4
    const drumEvents = [];
    const drumChannel = 0x09; // Canal 10 (cero-indexado)

    // Eventos programados como { tick, type: 'on'|'off', note, velocity }
    const scheduledDrums = [];
    let currentDrumTick = 0;

    chords.forEach(chord => {
      const beats = chord.durationBeats || 4;
      for (let b = 0; b < beats; b++) {
        const beatStartTick = currentDrumTick + (b * ticksPerBeat);
        const beatDuration = Math.round(ticksPerBeat * 0.85); // 85% de la negra
        const beatIndex = b % 4; // 0, 1, 2, 3

        // 1. Hi-Hat en todas las negras
        scheduledDrums.push({ tick: beatStartTick, status: 0x90 | drumChannel, note: 42, vel: 80 });
        scheduledDrums.push({ tick: beatStartTick + beatDuration, status: 0x80 | drumChannel, note: 42, vel: 0 });

        // 2. Bombo en tiempos 1 y 3 (índices 0 y 2)
        if (beatIndex === 0 || beatIndex === 2) {
          scheduledDrums.push({ tick: beatStartTick, status: 0x90 | drumChannel, note: 36, vel: 105 });
          scheduledDrums.push({ tick: beatStartTick + beatDuration, status: 0x80 | drumChannel, note: 36, vel: 0 });
        }

        // 3. Redoblante en tiempos 2 y 4 (índices 1 y 3)
        if (beatIndex === 1 || beatIndex === 3) {
          scheduledDrums.push({ tick: beatStartTick, status: 0x90 | drumChannel, note: 38, vel: 95 });
          scheduledDrums.push({ tick: beatStartTick + beatDuration, status: 0x80 | drumChannel, note: 38, vel: 0 });
        }
      }
      currentDrumTick += beats * ticksPerBeat;
    });

    serializeEvents(drumEvents, scheduledDrums);

    // --- PISTA 2: Piano Acústico (Canal 1 -> index 0x00, Patch 0 = Acoustic Grand Piano) ---
    const pianoEvents = [];
    const pianoChannel = 0x00; // Canal 1
    // Program change: C0 00 (Patch 0 Acoustic Grand Piano, 0-indexed: 0)
    pianoEvents.push(...writeVarInt(0));
    pianoEvents.push(0xC0 | pianoChannel, 0);

    const scheduledPiano = [];
    let currentPianoTick = 0;

    chords.forEach(chord => {
      const beats = chord.durationBeats || 4;
      const durationTicks = Math.round(beats * ticksPerBeat * 0.94); // 94% de duración de compás

      // Notas del piano en registro armónico (octavas 3 y 4, entre 48 y 76)
      const chordNotes = chord.notesMidi || [chord.rootMidi];
      chordNotes.forEach(note => {
        let pianoNote = note;
        while (pianoNote < 48) pianoNote += 12;
        while (pianoNote > 76) pianoNote -= 12;

        scheduledPiano.push({ tick: currentPianoTick, status: 0x90 | pianoChannel, note: pianoNote, vel: 85 });
        scheduledPiano.push({ tick: currentPianoTick + durationTicks, status: 0x80 | pianoChannel, note: pianoNote, vel: 0 });
      });

      currentPianoTick += beats * ticksPerBeat;
    });

    serializeEvents(pianoEvents, scheduledPiano);

    // --- ENSAMBLADO DEL ARCHIVO MIDI ---
    const tracks = [
      buildTrackChunk(track0Events),
      buildTrackChunk(drumEvents),
      buildTrackChunk(pianoEvents)
    ];

    // Cabecera MThd: 'MThd' (4 bytes), length=6 (4 bytes), format=1 (2 bytes), ntracks=4 (2 bytes), division=480 (2 bytes)
    const headerChunk = [
      ...stringToBytes('MThd'),
      ...numTo4Bytes(6),
      ...numTo2Bytes(1), // Formato 1 (múltiples pistas simultáneas)
      ...numTo2Bytes(tracks.length),
      ...numTo2Bytes(ticksPerBeat)
    ];

    // Juntar todos los bytes
    let totalLength = headerChunk.length;
    tracks.forEach(tr => totalLength += tr.length);

    const midiBuffer = new Uint8Array(totalLength);
    let offset = 0;

    midiBuffer.set(headerChunk, offset);
    offset += headerChunk.length;

    tracks.forEach(tr => {
      midiBuffer.set(tr, offset);
      offset += tr.length;
    });

    return midiBuffer;
  }

  // Ordena eventos por tick y los serializa calculando delta-times relativos
  function serializeEvents(targetArray, scheduledEvents) {
    scheduledEvents.sort((a, b) => a.tick - b.tick);

    let lastTick = 0;
    scheduledEvents.forEach(evt => {
      const delta = evt.tick - lastTick;
      targetArray.push(...writeVarInt(delta));
      targetArray.push(evt.status, evt.note, evt.vel);
      lastTick = evt.tick;
    });

    // Evento final de pista: Delta 0, FF 2F 00
    targetArray.push(...writeVarInt(0));
    targetArray.push(0xFF, 0x2F, 0x00);
  }

  // Empaqueta los bytes de una pista en un bloque MTrk
  function buildTrackChunk(eventsBytes) {
    const header = [
      ...stringToBytes('MTrk'),
      ...numTo4Bytes(eventsBytes.length)
    ];
    return new Uint8Array([...header, ...eventsBytes]);
  }

  return {
    buildBackingTrackMidi
  };
})();

// Exponer globalmente
window.MidiWriter = MidiWriter;
