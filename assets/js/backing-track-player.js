/**
 * BackingTrackPlayer.js
 * Reproductor de Backing Track en tiempo real usando Web Audio API nativo.
 * Sintetiza batería (HiHat, Bombo, Redoblante), bajo y acordes de guitarra en bucle continuo (loop).
 */
const BackingTrackPlayer = (function () {
  'use strict';

  let audioCtx = null;
  let isPlaying = false;
  let currentStep = 0; // compás actual (0 .. sequence.length - 1)
  let timerId = null;
  let onStepChangeCallback = null;
  let activeOptions = null;

  // Inicializa o reanuda el AudioContext (requerido tras interacción del usuario)
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Convierte número de nota MIDI a frecuencia en Hertz
  function midiToFreq(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Sintetizador de Percusión analógica clásica usando Web Audio
   */
  // 1. Bombo (Kick)
  function playKick(ctx, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Caída rápida de tono (pitch drop característico de kick)
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  // 2. Redoblante (Snare)
  function playSnare(ctx, time) {
    // Ruido blanco
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1000, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // Tono del parche (cuerpo del snare)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.1);

    oscGain.gain.setValueAtTime(0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  // 3. Hi-Hat Cerrado
  function playHiHat(ctx, time) {
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  /**
   * Sintetizador de Bajo (Warm Electric / Acoustic Bass)
   */
  function playBassNote(ctx, midiNote, time, duration) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const freq = midiToFreq(midiNote);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + duration * 0.5);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration);
    osc2.stop(time + duration);
  }

  /**
   * Sintetizador de Piano Acústico
   * Utiliza osciladores duales (sine + triangle) con ataque percusivo y decaimiento exponencial natural
   */
  function playPianoChord(ctx, midiNotes, time, duration) {
    midiNotes.forEach(midiNote => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const freq = midiToFreq(midiNote);

      // Oscilador principal (cuerpo del piano)
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, time);

      // Oscilador secundario (armónico fundamental puro)
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq, time);

      // Filtro que emula el timbre dinámico de martillo del piano
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, time);
      filter.frequency.exponentialRampToValueAtTime(700, time + Math.min(1.2, duration));

      // Envolvente de volumen (ADSR de piano: ataque instantáneo de 5ms, caída percusiva y decay largo)
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.08, time + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration);
      osc2.stop(time + duration);
    });
  }

  /**
   * Inicia la reproducción en bucle con cuenta previa de 4 tiempos de Hi-Hat
   */
  function start(options, onStepChange) {
    stop();

    const ctx = getAudioContext();
    isPlaying = true;
    currentStep = 0;
    activeOptions = options;
    onStepChangeCallback = onStepChange;

    const bpm = options.bpm || 100;
    const secondsPerBeat = 60 / bpm;
    const startTime = ctx.currentTime + 0.05;

    // --- CUENTA PREVIA: 4 Hi-Hats ---
    for (let countBeat = 0; countBeat < 4; countBeat++) {
      const countTime = startTime + (countBeat * secondsPerBeat);
      playHiHat(ctx, countTime);

      // Notificar conteo en la interfaz (1, 2, 3, 4)
      if (typeof onStepChangeCallback === 'function') {
        const notifyDelay = Math.max(0, (countTime - ctx.currentTime) * 1000);
        setTimeout(() => {
          if (isPlaying) {
            onStepChangeCallback(-1, { chordName: `Cuenta ${countBeat + 1}/4`, isCountIn: true });
          }
        }, notifyDelay);
      }
    }

    // El primer compás musical comienza exactamente tras los 4 golpes de hi-hat
    const firstMeasureStartTime = startTime + (4 * secondsPerBeat);
    scheduleNextMeasure(firstMeasureStartTime);
  }

  /**
   * Programa el compás actual y programa el llamado para el siguiente compás
   */
  function scheduleNextMeasure(measureStartTime) {
    if (!isPlaying || !activeOptions || !activeOptions.chords.length) return;

    const ctx = getAudioContext();
    const chords = activeOptions.chords;
    const bpm = activeOptions.bpm || 100;
    const secondsPerBeat = 60 / bpm;

    const chord = chords[currentStep];
    const beats = chord.durationBeats || 4;
    const measureDuration = beats * secondsPerBeat;

    // Notificar UI sobre el compás activo
    if (typeof onStepChangeCallback === 'function') {
      const notifyDelay = Math.max(0, (measureStartTime - ctx.currentTime) * 1000);
      const stepForCallback = currentStep;
      setTimeout(() => {
        if (isPlaying) {
          onStepChangeCallback(stepForCallback, chord);
        }
      }, notifyDelay);
    }

    // 1. Programar Batería para cada beat del compás
    for (let b = 0; b < beats; b++) {
      const beatTime = measureStartTime + (b * secondsPerBeat);
      const beatIdx = b % 4;

      // Hi-Hat en todas las negras
      playHiHat(ctx, beatTime);

      // Bombo en 1 y 3
      if (beatIdx === 0 || beatIdx === 2) {
        playKick(ctx, beatTime);
      }

      // Redoblante en 2 y 4
      if (beatIdx === 1 || beatIdx === 3) {
        playSnare(ctx, beatTime);
      }
    }

    // 2. Programar Bajo
    let bassMidi = chord.rootMidi;
    while (bassMidi > 47) bassMidi -= 12;
    while (bassMidi < 36) bassMidi += 12;
    playBassNote(ctx, bassMidi, measureStartTime, measureDuration * 0.95);

    // 3. Programar Piano Acústico
    const chordNotes = (chord.notesMidi || [chord.rootMidi]).map(n => {
      let g = n;
      while (g < 48) g += 12;
      while (g > 76) g -= 12;
      return g;
    });
    playPianoChord(ctx, chordNotes, measureStartTime, measureDuration * 0.94);

    // Preparar el siguiente paso en loop
    const nextStep = (currentStep + 1) % chords.length;
    currentStep = nextStep;

    const nextMeasureTime = measureStartTime + measureDuration;
    const timeoutDelay = Math.max(10, (nextMeasureTime - ctx.currentTime - 0.15) * 1000);

    timerId = setTimeout(() => {
      if (isPlaying) {
        scheduleNextMeasure(nextMeasureTime);
      }
    }, timeoutDelay);
  }

  /**
   * Detiene la reproducción
   */
  function stop() {
    isPlaying = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function getIsPlaying() {
    return isPlaying;
  }

  return {
    start,
    stop,
    isPlaying: getIsPlaying
  };
})();

// Exponer globalmente
window.BackingTrackPlayer = BackingTrackPlayer;
