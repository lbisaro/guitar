/**
 * Guitar Fretboard App
 * Motor de teoría musical, renderizado dinámico del diapasón y persistencia en el navegador.
 */

$(function () {
  // Constantes de teoría musical
  const CHROMATIC_SCALE_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const CHROMATIC_SCALE_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Mapeo semitonal universal para enarmonías exactas (0 a 11)
  const NOTE_SEMITONES = {
    'B#': 0, 'C': 0, 'Dbb': 0,
    'C#': 1, 'Db': 1, 'B##': 1,
    'D': 2, 'C##': 2, 'Ebb': 2,
    'D#': 3, 'Eb': 3, 'Fbb': 3,
    'E': 4, 'Fb': 4, 'D##': 4,
    'E#': 5, 'F': 5, 'Gbb': 5,
    'F#': 6, 'Gb': 6, 'E##': 6,
    'G': 7, 'F##': 7, 'Abb': 7,
    'G#': 8, 'Ab': 8,
    'A': 9, 'G##': 9, 'Bbb': 9,
    'A#': 10, 'Bb': 10, 'Cbb': 10,
    'B': 11, 'Cb': 11, 'A##': 11
  };

  // Agrupamiento solicitado para el selector de Key
  const KEY_GROUPS = [
    { label: 'Natural', keys: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
    { label: 'b', keys: ['Db', 'Eb', 'Gb', 'Ab', 'Bb'] },
    { label: '#', keys: ['C#', 'D#', 'F#', 'G#', 'A#'] }
  ];

  // Letras naturales e intervalos semitonales base para ortografía diatónica
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_SEMITONES = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
  const ALL_KEYS = KEY_GROUPS.flatMap(g => g.keys);

  /**
   * Genera las notas de una escala diatónica para una tónica dada deduciendo las alteraciones (#, b, ##, bb).
   */
  function buildScaleNotes(root, intervals) {
    const rootLetter = root[0];
    const rootIdx = LETTERS.indexOf(rootLetter);
    const rootSemi = NOTE_SEMITONES[root];
    if (rootSemi === undefined || rootIdx === -1) return [];

    return intervals.map((interval, i) => {
      const targetSemi = (rootSemi + interval) % 12;
      const targetLetterIdx = (rootIdx + i) % 7;
      const targetLetter = LETTERS[targetLetterIdx];
      const natSemi = LETTER_SEMITONES[targetLetter];
      let diff = (targetSemi - natSemi + 12) % 12;
      if (diff > 6) diff -= 12;

      let acc = '';
      if (diff === 1) acc = '#';
      else if (diff === 2) acc = '##';
      else if (diff === -1) acc = 'b';
      else if (diff === -2) acc = 'bb';

      return targetLetter + acc;
    });
  }

  /**
   * Deduce los 7 acordes diatónicos de la escala apilando terceras e identificando sus grados romanos y sufijos.
   */
  function buildDiatonicChords(intervals) {
    const baseRomans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

    return intervals.map((_, i) => {
      const semi3 = (intervals[(i + 2) % 7] - intervals[i] + 12) % 12;
      const semi5 = (intervals[(i + 4) % 7] - intervals[i] + 12) % 12;
      const semi7 = (intervals[(i + 6) % 7] - intervals[i] + 12) % 12;
      const semi9 = (intervals[(i + 1) % 7] - intervals[i] + 12) % 12;

      let triad = '';
      let isMajor = false;
      let isMinor = false;
      let isDim = false;
      let isAug = false;

      if (semi3 === 4 && semi5 === 7) {
        triad = ''; // Tríada mayor sin sufijo
        isMajor = true;
      } else if (semi3 === 3 && semi5 === 7) {
        triad = 'm';
        isMinor = true;
      } else if (semi3 === 3 && semi5 === 6) {
        triad = 'dim';
        isDim = true;
      } else if (semi3 === 4 && semi5 === 8) {
        triad = 'aug';
        isAug = true;
      }

      let roman = baseRomans[i];
      if (isMinor || isDim) {
        roman = roman.toLowerCase();
      } else if (isAug) {
        roman = roman + '+';
      }

      // Tétrada (7ma)
      let tetrad = '';
      if (isMajor) {
        if (semi7 === 11) {
          tetrad = 'maj7';
        } else if (semi7 === 10) {
          tetrad = '7'; // Dominante (V)
        }
      } else if (triad === 'm') {
        tetrad = (semi7 === 10) ? 'm7' : (semi7 === 11 ? 'mMaj7' : 'm7');
      } else if (triad === 'dim') {
        tetrad = (semi7 === 10) ? 'm7b5' : (semi7 === 9 ? 'dim7' : 'dim');
      } else if (triad === 'aug') {
        tetrad = (semi7 === 11) ? 'maj7#5' : 'aug7';
      }

      // Novena
      let ninth = '';
      if (tetrad === 'maj7') {
        ninth = (semi9 === 2) ? 'maj9' : (semi9 === 3 ? 'minMaj7' : 'maj7b9');
      } else if (tetrad === '7') {
        ninth = (semi9 === 2) ? '9' : (semi9 === 1 ? '7b9' : '7#9');
      } else if (tetrad === 'm7') {
        ninth = (semi9 === 2) ? 'm9' : 'm7b9';
      } else if (tetrad === 'mMaj7') {
        ninth = (semi9 === 2) ? 'm9#7' : 'mMaj7b9';
      } else if (tetrad === 'm7b5') {
        ninth = (semi9 === 2) ? 'm7b5(9)' : 'm7b5b9';
      } else if (tetrad === 'dim7') {
        ninth = (semi9 === 1) ? 'dim7b9' : 'dim9';
      } else if (tetrad === 'maj7#5') {
        ninth = (semi9 === 2) ? 'maj9#5' : 'maj7#5b9';
      }

      return {
        roman,
        triad,
        tetrad,
        ninth,
        intIdx: [i, (i + 2) % 7, (i + 4) % 7, (i + 6) % 7, (i + 1) % 7]
      };
    });
  }

  /**
   * Convierte un texto en un slug normalizado (ej: 'Menor Armónica' -> 'menor_armonica')
   */
  function generateSlug(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Compila las definiciones de SCALES (tanto si vienen en Array como en Objeto)
   * en la estructura completa SCALES_FULL.
   */
  function compileScales(scalesInput) {
    const result = {};
    const items = Array.isArray(scalesInput)
      ? scalesInput
      : Object.entries(scalesInput || {}).map(([k, def]) => ({ key: k, ...def }));

    items.forEach(def => {
      const scaleKey = def.key || generateSlug(def.name);
      const roots = {};
      ALL_KEYS.forEach(k => {
        roots[k] = buildScaleNotes(k, def.intervals);
      });
      result[scaleKey] = {
        key: scaleKey,
        name: def.name,
        group: def.group || '',
        description: def.description || '',
        intervals: def.intervals,
        roots: roots,
        chords: def.chords || buildDiatonicChords(def.intervals)
      };
    });
    return result;
  }

  // Estructura completa de escalas compiladas a partir de SCALES (definido en scales.js)
  const SCALES_FULL = compileScales(window.SCALES || []);

  // Afinación Standard: Cuerda 6 (Mi grave) a Cuerda 1 (Mi agudo)
  const DEFAULT_STRINGS_TUNING = [
    { stringNumber: 6, rootNote: 'E', semitone: 4 }, // Mi grave
    { stringNumber: 5, rootNote: 'A', semitone: 9 }, // La
    { stringNumber: 4, rootNote: 'D', semitone: 2 }, // Re
    { stringNumber: 3, rootNote: 'G', semitone: 7 }, // Sol
    { stringNumber: 2, rootNote: 'B', semitone: 11 }, // Si
    { stringNumber: 1, rootNote: 'E', semitone: 4 }  // Mi agudo
  ];

  // Orden de cuerdas de arriba a abajo
  const STRING_ORDER_DESC = [6, 5, 4, 3, 2, 1]; // 6ª (grave) arriba (default)
  const STRING_ORDER_ASC = [1, 2, 3, 4, 5, 6];  // 6ª (grave) abajo (1ª aguda arriba)

  // Opciones de notas para el selector interactivo de afinación
  const TUNING_NOTE_OPTIONS = {
    naturals: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    flats: ['Db', 'Eb', 'Gb', 'Ab', 'Bb'],
    sharps: ['C#', 'D#', 'F#', 'G#', 'A#']
  };

  // Definición universal de intervalos en terceras y sus colores asociados
  const INTERVAL_DEFS = [
    { interval: '1', step: 0, isCompound: false, badgeColor: 'badge-triad-root' },
    { interval: '3', step: 2, isCompound: false, badgeColor: 'badge-triad-third' },
    { interval: '5', step: 4, isCompound: false, badgeColor: 'badge-triad-fifth' },
    { interval: '7', step: 6, isCompound: false, badgeColor: 'bg-info text-dark' },
    { interval: '9', step: 1, isCompound: true, badgeColor: 'bg-warning text-dark' },
    { interval: '11', step: 3, isCompound: true, badgeColor: 'bg-primary text-white' },
    { interval: '13', step: 5, isCompound: true, badgeColor: 'bg-success text-white' }
  ];

  const TOTAL_FRETS = 24;

  // Estado por defecto de la aplicación
  const defaultState = {
    rootNote: 'C',
    scaleType: Object.keys(SCALES_FULL)[0] || 'mayor',
    displayMode: 'scale', // 'scale' | 'chord'
    selectedChordIndex: 0, // 0..6
    selectedIntervals: ['1', '3', '5'], // Default: 1, 3, 5 independientes
    badgeContent: 'note',  // 'note' | 'interval'
    stringsTuning: JSON.parse(JSON.stringify(DEFAULT_STRINGS_TUNING)),
    stringOrder: 'desc',   // 'desc': 6ª arriba (default) | 'asc': 6ª abajo
    backingTrack: {
      bpm: 100,
      measures: [0, 3, 4, 0], // I, IV, V, I (grados 0-indexed)
      activeEditIndex: 0
    }
  };

  // Cargar estado guardado o usar el default
  let appState = loadState();

  // Guardar estado en localStorage
  function saveState() {
    try {
      localStorage.setItem('guitar_fretboard_config', JSON.stringify(appState));
    } catch (e) {
      console.warn('No se pudo guardar la configuración en localStorage', e);
    }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('guitar_fretboard_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.selectedIntervals || !Array.isArray(parsed.selectedIntervals)) {
          parsed.selectedIntervals = ['1', '3', '5'];
        }
        if (!SCALES_FULL[parsed.scaleType]) {
          const matched = Object.keys(SCALES_FULL).find(k =>
            k === parsed.scaleType ||
            k === generateSlug(parsed.scaleType) ||
            (parsed.scaleType === 'major' && k === 'mayor') ||
            (parsed.scaleType === 'natural_minor' && k === 'menor_natural') ||
            (parsed.scaleType === 'harmonic_minor' && k === 'menor_armonica')
          );
          parsed.scaleType = matched || Object.keys(SCALES_FULL)[0] || 'mayor';
        }
        // Validar y migrar afinación de cuerdas si es necesario
        if (!parsed.stringsTuning || !Array.isArray(parsed.stringsTuning) || parsed.stringsTuning.length !== 6) {
          parsed.stringsTuning = JSON.parse(JSON.stringify(DEFAULT_STRINGS_TUNING));
        } else {
          parsed.stringsTuning.forEach(st => {
            if (st.semitone === undefined || st.semitone === null) {
              st.semitone = NOTE_SEMITONES[st.rootNote] !== undefined ? NOTE_SEMITONES[st.rootNote] : 0;
            }
          });
        }
        // Validar orden de cuerdas
        if (!parsed.stringOrder || (parsed.stringOrder !== 'desc' && parsed.stringOrder !== 'asc')) {
          parsed.stringOrder = 'desc';
        }
        // Validar backingTrack
        if (!parsed.backingTrack || !Array.isArray(parsed.backingTrack.measures) || parsed.backingTrack.measures.length === 0) {
          parsed.backingTrack = {
            bpm: 100,
            measures: [0, 3, 4, 0],
            activeEditIndex: 0
          };
        }
        return Object.assign({}, defaultState, parsed);
      }
    } catch (e) {
      console.warn('Error al leer de localStorage', e);
    }
    return JSON.parse(JSON.stringify(defaultState));
  }

  // Obtiene notas de la escala para la tónica actual
  function getCurrentScaleNotes() {
    const scaleObj = SCALES_FULL[appState.scaleType];
    if (scaleObj.roots[appState.rootNote]) {
      return scaleObj.roots[appState.rootNote];
    }
    // Fallback calculando notas cromáticas si la tónica no está en el diccionario predefinido
    const rootIndex = CHROMATIC_SCALE_SHARP.indexOf(appState.rootNote);
    if (rootIndex !== -1) {
      return scaleObj.intervals.map(int => CHROMATIC_SCALE_SHARP[(rootIndex + int) % 12]);
    }
    return ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  }

  // Normaliza una nota para comparación de alturas (enarmonías)
  function areNotesEnharmonic(n1, n2) {
    if (!n1 || !n2) return false;
    if (n1 === n2) return true;
    const s1 = NOTE_SEMITONES[n1];
    const s2 = NOTE_SEMITONES[n2];
    if (s1 !== undefined && s2 !== undefined) {
      return s1 === s2;
    }
    return false;
  }

  /**
   * Obtiene la designación exacta del grado / intervalo con símbolos tipográficos (♭, ♯, maj7, etc.)
   * @param {string} refNote - Nota de referencia (ej: fundamental del acorde o tónica de la escala)
   * @param {string} targetNote - Nota objetivo a evaluar
   * @param {boolean} isCompound - Si es true, representa grados en octava extendida (9, 11, 13)
   */
  function getIntervalDegreeName(refNote, targetNote, isCompound = false) {
    if (!refNote || !targetNote) return '';
    const refLetterIdx = LETTERS.indexOf(refNote[0]);
    const targetLetterIdx = LETTERS.indexOf(targetNote[0]);
    if (refLetterIdx === -1 || targetLetterIdx === -1) return '';

    const diatonicStep = (targetLetterIdx - refLetterIdx + 7) % 7;
    const refSemi = NOTE_SEMITONES[refNote];
    const targetSemi = NOTE_SEMITONES[targetNote];
    if (refSemi === undefined || targetSemi === undefined) return '';

    const actualSemis = (targetSemi - refSemi + 12) % 12;
    // Semitonos diatónicos mayores/justos estándar para cada paso (0..6)
    const standardSemis = [0, 2, 4, 5, 7, 9, 11][diatonicStep];

    let diff = actualSemis - standardSemis;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;

    let acc = '';
    if (diff === -1) acc = '\u266D';        // ♭
    else if (diff === -2) acc = '\u266D\u266D'; // ♭♭
    else if (diff === 1) acc = '\u266F';       // ♯
    else if (diff === 2) acc = '\u266F\u266F'; // ♯♯

    let num = (diatonicStep + 1);
    if (isCompound) {
      if (num === 2) num = 9;
      else if (num === 4) num = 11;
      else if (num === 6) num = 13;
    }

    // Séptima mayor: visualización solicitada como "maj7"
    if (num === 7 && diff === 0) {
      return 'maj7';
    }

    // Séptima disminuida: visualización solicitada como "7dim"
    if (num === 7 && diff === -2) {
      return '7dim';
    }

    return `${acc}${num}`;
  }

  // Calcula la nota para una cuerda y traste dados
  function getNoteAtFret(stringObj, fret) {
    const semitone = (stringObj.semitone + fret) % 12;
    const currentScaleNotes = getCurrentScaleNotes();

    // Ver si coincide directamente con una nota de la escala activa
    for (let sNote of currentScaleNotes) {
      const sharpIdx = CHROMATIC_SCALE_SHARP.indexOf(sNote);
      const flatIdx = CHROMATIC_SCALE_FLAT.indexOf(sNote);
      if (sharpIdx === semitone || flatIdx === semitone || areNotesEnharmonic(CHROMATIC_SCALE_SHARP[semitone], sNote) || areNotesEnharmonic(CHROMATIC_SCALE_FLAT[semitone], sNote)) {
        return sNote;
      }
    }

    // Si no está en la escala, devolver representación cromática
    return CHROMATIC_SCALE_SHARP[semitone];
  }

  // Inicializa la interfaz de controles
  function initControls() {
    // 1. Selector de Tónica (Key) agrupado en .Natural, b, #
    const $keySelect = $('#selectKey');
    $keySelect.empty();
    KEY_GROUPS.forEach(group => {
      const $optgroup = $(`<optgroup label="${group.label}"></optgroup>`);
      group.keys.forEach(k => {
        const selected = (k === appState.rootNote) ? 'selected' : '';
        $optgroup.append(`<option value="${k}" ${selected}>${k}</option>`);
      });
      $keySelect.append($optgroup);
    });
    $keySelect.val(appState.rootNote);

    // 2. Selector de Escala (agrupado por optgroups si existen o directo)
    const $scaleSelect = $('#selectScale');
    $scaleSelect.empty();

    const groupsMap = {};
    Object.keys(SCALES_FULL).forEach(scaleKey => {
      const scaleObj = SCALES_FULL[scaleKey];
      const grp = scaleObj.group || '';
      if (!groupsMap[grp]) groupsMap[grp] = [];
      groupsMap[grp].push({ key: scaleKey, obj: scaleObj });
    });

    Object.keys(groupsMap).forEach(grpName => {
      if (grpName) {
        const $optgroup = $(`<optgroup label="${grpName}"></optgroup>`);
        groupsMap[grpName].forEach(({ key, obj }) => {
          const selected = (key === appState.scaleType) ? 'selected' : '';
          $optgroup.append(`<option value="${key}" ${selected}>${obj.name}</option>`);
        });
        $scaleSelect.append($optgroup);
      } else {
        groupsMap[grpName].forEach(({ key, obj }) => {
          const selected = (key === appState.scaleType) ? 'selected' : '';
          $scaleSelect.append(`<option value="${key}" ${selected}>${obj.name}</option>`);
        });
      }
    });
    $scaleSelect.val(appState.scaleType);

    // 3. Modo de visualización (Escala vs Acordes)
    if (appState.displayMode === 'chord') {
      $('#modeChord').prop('checked', true);
      $('#chordOptionsCard').show();
    } else {
      $('#modeScale').prop('checked', true);
      $('#chordOptionsCard').hide();
    }

    // 4. Selector de intervalos independientes (1, 3, 5, 7, 9, 11, 13)
    $('.interval-toggle').each(function () {
      const val = $(this).val();
      $(this).prop('checked', appState.selectedIntervals.includes(val));
    });

    // Renderizar botones de acordes de la escala
    renderChordButtons();
  }

  // Determina el sufijo del acorde según los intervalos seleccionados
  function getChordSuffix(chordData, selectedIntervals) {
    if (selectedIntervals.includes('13')) return '13';
    if (selectedIntervals.includes('11')) return '11';
    if (selectedIntervals.includes('9')) return chordData.ninth || '9';
    if (selectedIntervals.includes('7')) return chordData.tetrad || '7';
    if (selectedIntervals.includes('3') || selectedIntervals.includes('5')) return chordData.triad || '';
    return '';
  }

  // Renderiza los botones de los 7 acordes diatónicos
  function renderChordButtons() {
    const $container = $('#chordButtonsContainer');
    $container.empty();

    const scaleNotes = getCurrentScaleNotes();
    const chordsConfig = SCALES_FULL[appState.scaleType].chords;

    chordsConfig.forEach((chordData, idx) => {
      const rootOfChord = scaleNotes[idx];
      const suffix = getChordSuffix(chordData, appState.selectedIntervals);
      const chordName = `${rootOfChord}${suffix}`;
      const isActive = (idx === appState.selectedChordIndex && appState.displayMode === 'chord');
      const btnClass = isActive ? 'btn-primary' : 'btn-outline-secondary';

      const btnHtml = `
        <button type="button" class="btn ${btnClass} btn-sm chord-btn" data-index="${idx}">
          <span class="badge bg-dark me-1 text-light">${chordData.roman}</span>
          <strong>${chordName}</strong>
        </button>
      `;
      $container.append(btnHtml);
    });
  }

  // Genera el diapasón completo en HTML
  function renderFretboard() {
    const $fretboardContainer = $('#fretboardCanvas');
    $fretboardContainer.empty();

    const scaleNotes = getCurrentScaleNotes();

    // Calcular las notas del acorde activo según los intervalos independientes seleccionados
    let chordNotesInfo = [];
    if (appState.displayMode === 'chord') {
      const chordRootIdx = appState.selectedChordIndex;
      const chordRootNote = scaleNotes[chordRootIdx];

      INTERVAL_DEFS.forEach(def => {
        if (appState.selectedIntervals.includes(def.interval)) {
          const noteIdxInScale = (chordRootIdx + def.step) % 7;
          const noteName = scaleNotes[noteIdxInScale];
          const degreeName = getIntervalDegreeName(chordRootNote, noteName, def.isCompound);
          chordNotesInfo.push({
            note: noteName,
            intervalNumber: def.interval,
            degreeName: degreeName,
            badgeColor: def.badgeColor
          });
        }
      });
    }

    // 1. Fila de números de trastes
    const is6OnTop = (appState.stringOrder !== 'asc');
    const orderIconSvg = is6OnTop
      ? `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 1a.5.5 0 0 0-.5.5v11.793l-3.146-3.147a.5.5 0 0 0-.708.708l4 4a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0-.708-.708L8.5 13.293V1.5A.5.5 0 0 0 8 1z"/></svg>`;
    const orderTooltip = is6OnTop
      ? '6ª cuerda arriba (Clic para invertir: 6ª cuerda abajo)'
      : '6ª cuerda abajo (Clic para invertir: 6ª cuerda arriba)';

    let numbersRowHtml = '<div class="fret-numbers-row">';
    numbersRowHtml += `
      <div class="fret-number-col tuning-header-col">
        <span class="tuning-header-title">Afinación</span>
        <button type="button" id="btnToggleStringOrder" class="btn-toggle-order" title="${orderTooltip}" aria-label="${orderTooltip}">
          ${orderIconSvg}
        </button>
      </div>
    `;
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const colClass = (f === 0) ? 'fret-number-col fret-0-header' : 'fret-number-col';
      const label = (f === 0) ? 'Nut (0)' : f;
      numbersRowHtml += `<div class="${colClass}">${label}</div>`;
    }
    numbersRowHtml += '</div>';

    // 2. Contenedor del diapasón
    let boardHtml = '<div class="fretboard-board">';

    // 2.1 Marcadores de posición / Inlays
    boardHtml += '<div class="fret-inlay-container">';
    boardHtml += '<div class="fret-inlay-cell tuning-inlay-cell"></div>';
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const cellClass = (f === 0) ? 'fret-inlay-cell fret-0-inlay' : 'fret-inlay-cell';
      let dotHtml = '';
      if ([3, 5, 7, 9, 15, 17, 19, 21].includes(f)) {
        dotHtml = '<div class="fret-dot"></div>';
      } else if (f === 12 || f === 24) {
        dotHtml = '<div class="fret-double-dot-1"></div><div class="fret-double-dot-2"></div>';
      }
      boardHtml += `<div class="${cellClass}">${dotHtml}</div>`;
    }
    boardHtml += '</div>';

    // 2.2 Filas de cuerdas:
    // Determinar orden según configuración (6ª arriba o 6ª abajo)
    const activeStringOrder = (appState.stringOrder === 'asc') ? STRING_ORDER_ASC : STRING_ORDER_DESC;
    activeStringOrder.forEach(s => {
      const stringObj = appState.stringsTuning.find(item => item.stringNumber === s);
      const defaultStrObj = DEFAULT_STRINGS_TUNING.find(item => item.stringNumber === s);
      const isCustomTuning = defaultStrObj && stringObj.rootNote !== defaultStrObj.rootNote;
      const customClass = isCustomTuning ? ' tuning-badge-custom' : '';
      const tooltipTitle = isCustomTuning
        ? `Cuerda ${s}: ${stringObj.rootNote} (Modificada - Estándar: ${defaultStrObj.rootNote}) | Doble clic para cambiar`
        : `Doble clic para afinar cuerda ${s} (${stringObj.rootNote})`;

      boardHtml += `
        <div class="string-row">
          <div class="tuning-cell" data-string="${s}" title="${tooltipTitle}">
            <span class="tuning-string-label">${s}ª</span>
            <span class="badge tuning-badge${customClass}" data-string="${s}">${stringObj.rootNote}</span>
          </div>
          <div class="string-wire string-wire-${s}"></div>
      `;

      // Celdas de cada traste (0 a 24)
      for (let f = 0; f <= TOTAL_FRETS; f++) {
        const cellClass = (f === 0) ? 'fret-cell fret-0' : 'fret-cell';
        const note = getNoteAtFret(stringObj, f);

        // Verificar si la nota pertenece a la escala
        const isInScale = scaleNotes.some(sn => areNotesEnharmonic(sn, note));

        let badgeHtml = '';
        if (isInScale) {
          if (appState.displayMode === 'scale') {
            // Modo escala completa
            const isRoot = areNotesEnharmonic(note, appState.rootNote);
            const badgeBg = isRoot ? 'badge-triad-root' : 'bg-secondary';

            const degreeName = getIntervalDegreeName(appState.rootNote, note, false);
            let displayText = (appState.badgeContent === 'interval') ? degreeName : note;
            let extraClass = (appState.badgeContent === 'interval') ? (' badge-degree' + (displayText.length >= 4 ? ' badge-degree-compact' : '')) : '';
            badgeHtml = `<span class="badge ${badgeBg}${extraClass} note-badge" title="${note} (Grado: ${degreeName}) | Clic para alternar Nota/Grado">${displayText}</span>`;
          } else if (appState.displayMode === 'chord') {
            // Modo acordes
            const chordRootNote = scaleNotes[appState.selectedChordIndex];
            const chordMatch = chordNotesInfo.find(cn => areNotesEnharmonic(cn.note, note));
            if (chordMatch) {
              let displayText = (appState.badgeContent === 'interval') ? chordMatch.degreeName : note;
              let extraClass = (appState.badgeContent === 'interval') ? (' badge-degree' + (displayText.length >= 4 ? ' badge-degree-compact' : '')) : '';
              badgeHtml = `<span class="badge ${chordMatch.badgeColor}${extraClass} note-badge" title="${note} (Grado: ${chordMatch.degreeName}) | Clic para alternar Nota/Grado">${displayText}</span>`;
            } else {
              // Nota de la escala pero no del acorde activo -> Atenuada
              const dimDegree = getIntervalDegreeName(chordRootNote, note, false);
              let displayText = (appState.badgeContent === 'interval') ? dimDegree : note;
              let extraClass = (appState.badgeContent === 'interval') ? (' badge-degree' + (displayText.length >= 4 ? ' badge-degree-compact' : '')) : '';
              badgeHtml = `<span class="badge bg-secondary${extraClass} note-badge note-dimmed" title="${note} (Grado: ${dimDegree}) | Clic para alternar Nota/Grado">${displayText}</span>`;
            }
          }
        }

        boardHtml += `<div class="${cellClass}">${badgeHtml}</div>`;
      }

      boardHtml += '</div>'; // Fin string-row
    });

    boardHtml += '</div>'; // Fin fretboard-board

    // Insertar en el canvas
    $fretboardContainer.html(numbersRowHtml + boardHtml);

    // Actualizar leyenda / información del título
    updateHeaderInfo();
  }

  // Actualiza la afinación de una cuerda individual
  function updateStringTuning(stringNumber, newNote) {
    const semitone = NOTE_SEMITONES[newNote];
    if (semitone === undefined) return;

    const strObj = appState.stringsTuning.find(s => s.stringNumber === stringNumber);
    if (strObj) {
      strObj.rootNote = newNote;
      strObj.semitone = semitone;
      saveState();
      renderFretboard();
    }
  }

  // Restaura la afinación estándar (E A D G B E)
  function resetTuning() {
    appState.stringsTuning = JSON.parse(JSON.stringify(DEFAULT_STRINGS_TUNING));
    saveState();
    renderFretboard();
  }

  // Popover interactivo para seleccionar la nota de afinación
  function openTuningPicker(stringNum, $targetElement) {
    closeTuningPicker();

    const currentString = appState.stringsTuning.find(s => s.stringNumber === stringNum);
    if (!currentString) return;

    const defaultString = DEFAULT_STRINGS_TUNING.find(s => s.stringNumber === stringNum);
    const currentNote = currentString.rootNote;
    const isCustom = defaultString && currentNote !== defaultString.rootNote;
    const headerColor = isCustom ? 'text-danger' : 'text-info';
    const cardBorder = isCustom ? 'border-danger' : 'border-info';
    const activeBtnClass = isCustom ? 'btn-danger fw-bold' : 'btn-info fw-bold';
    const statusText = isCustom ? ` (Modificada - Estándar: ${defaultString.rootNote})` : '';

    const $picker = $(`
      <div id="tuningPickerPopover" class="tuning-popover card ${cardBorder} shadow-lg">
        <div class="card-header py-1 px-2 d-flex justify-content-between align-items-center bg-dark border-secondary">
          <span class="small fw-bold ${headerColor}">Afinar Cuerda ${stringNum}ª (${currentNote})${statusText}</span>
          <button type="button" class="btn-close btn-close-white btn-sm" id="btnCloseTuningPicker" aria-label="Cerrar"></button>
        </div>
        <div class="card-body p-2 bg-dark">
          <div class="mb-2">
            <div class="text-secondary small fw-bold mb-1" style="font-size: 0.68rem; letter-spacing: 0.5px;">NATURALES</div>
            <div class="d-flex flex-wrap gap-1">
              ${TUNING_NOTE_OPTIONS.naturals.map(note => `
                <button type="button" class="btn btn-sm ${note === currentNote ? activeBtnClass : 'btn-outline-secondary text-light'} py-0 px-2 btn-pick-note" data-note="${note}">
                  ${note}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="mb-2">
            <div class="text-secondary small fw-bold mb-1" style="font-size: 0.68rem; letter-spacing: 0.5px;">BEMOLES (b)</div>
            <div class="d-flex flex-wrap gap-1">
              ${TUNING_NOTE_OPTIONS.flats.map(note => `
                <button type="button" class="btn btn-sm ${note === currentNote ? activeBtnClass : 'btn-outline-secondary text-light'} py-0 px-2 btn-pick-note" data-note="${note}">
                  ${note}
                </button>
              `).join('')}
            </div>
          </div>
          <div>
            <div class="text-secondary small fw-bold mb-1" style="font-size: 0.68rem; letter-spacing: 0.5px;">SOSTENIDOS (#)</div>
            <div class="d-flex flex-wrap gap-1">
              ${TUNING_NOTE_OPTIONS.sharps.map(note => `
                <button type="button" class="btn btn-sm ${note === currentNote ? activeBtnClass : 'btn-outline-secondary text-light'} py-0 px-2 btn-pick-note" data-note="${note}">
                  ${note}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `);

    $('body').append($picker);

    const rect = $targetElement[0].getBoundingClientRect();
    const pickerWidth = 265;
    const pickerHeight = 220;

    let top = rect.top - 8;
    let left = rect.right + 10;

    if (left + pickerWidth > window.innerWidth) {
      left = Math.max(10, rect.left - pickerWidth - 10);
    }
    if (top + pickerHeight > window.innerHeight) {
      top = Math.max(10, window.innerHeight - pickerHeight - 10);
    }

    $picker.css({
      position: 'fixed',
      top: `${Math.max(10, top)}px`,
      left: `${left}px`,
      width: `${pickerWidth}px`,
      zIndex: 1060
    });

    $picker.on('click', '.btn-pick-note', function (e) {
      e.stopPropagation();
      const newNote = $(this).data('note');
      updateStringTuning(stringNum, newNote);
      closeTuningPicker();
    });

    $picker.on('click', '#btnCloseTuningPicker', function (e) {
      e.stopPropagation();
      closeTuningPicker();
    });

    setTimeout(() => {
      $(document).on('click.tuningPicker', function (e) {
        if (!$(e.target).closest('#tuningPickerPopover').length) {
          closeTuningPicker();
        }
      });
      $(document).on('keydown.tuningPicker', function (e) {
        if (e.key === 'Escape') closeTuningPicker();
      });
    }, 50);
  }

  function closeTuningPicker() {
    $('#tuningPickerPopover').remove();
    $(document).off('click.tuningPicker');
    $(document).off('keydown.tuningPicker');
  }

  // Actualiza la barra descriptiva sobre el mástil
  function updateHeaderInfo() {
    const scaleNotes = getCurrentScaleNotes();
    const scaleObj = SCALES_FULL[appState.scaleType];

    let infoText = `<strong>${appState.rootNote} ${scaleObj.name}</strong> (${scaleNotes.join(' - ')})`;

    if (appState.displayMode === 'chord') {
      const chordConfig = scaleObj.chords[appState.selectedChordIndex];
      const rootOfChord = scaleNotes[appState.selectedChordIndex];
      const suffix = getChordSuffix(chordConfig, appState.selectedIntervals);
      const fullChordName = `${rootOfChord}${suffix}`;

      const activeDegrees = INTERVAL_DEFS
        .filter(def => appState.selectedIntervals.includes(def.interval))
        .map(def => {
          const noteIdx = (appState.selectedChordIndex + def.step) % 7;
          return getIntervalDegreeName(rootOfChord, scaleNotes[noteIdx], def.isCompound);
        });
      const activeIntervalsText = activeDegrees.length ? activeDegrees.join(', ') : 'Ninguno';

      infoText += ` &nbsp;|&nbsp; Acorde: <span class="badge bg-primary fs-6">${fullChordName}</span> (Grado ${chordConfig.roman}) &nbsp; Intervalos: <span class="badge bg-dark border border-secondary">${activeIntervalsText}</span>`;
    }

    // Indicador del modo actual de texto en las notas (Notas vs Grados)
    const modeBadge = (appState.badgeContent === 'interval')
      ? '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle">Mostrando: Grados</span>'
      : '<span class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">Mostrando: Notas</span>';

    infoText += ` &nbsp;|&nbsp; ${modeBadge} <span class="text-secondary small d-none d-md-inline">(Clic en una nota para alternar)</span>`;

    $('#fretboardInfoSummary').html(infoText);
    updateScaleDescription();
  }

  // Actualiza la caja de texto pedagógica de la escala seleccionada
  function updateScaleDescription() {
    const scaleObj = SCALES_FULL[appState.scaleType];
    const $container = $('#scaleDescriptionContainer');
    const $text = $('#scaleDescriptionText');

    if (scaleObj && scaleObj.description) {
      $text.html(scaleObj.description);
      $container.show();
    } else {
      $container.hide();
    }
  }

  // --- EVENT LISTENERS ---

  // Cambio de Tónica (Key)
  $('#selectKey').on('change', function () {
    appState.rootNote = $(this).val();
    saveState();
    renderChordButtons();
    renderFretboard();
  });

  // Cambio de Escala
  $('#selectScale').on('change', function () {
    appState.scaleType = $(this).val();

    // Actualizar lista de tónicas válidas para esa escala
    const availableKeys = Object.keys(SCALES_FULL[appState.scaleType].roots);
    if (!availableKeys.includes(appState.rootNote)) {
      appState.rootNote = availableKeys[0];
    }

    saveState();
    initControls();
    renderFretboard();
  });

  // Cambio entre Escala Completa y Acordes
  $('input[name="displayMode"]').on('change', function () {
    appState.displayMode = $(this).val();
    if (appState.displayMode === 'chord') {
      $('#chordOptionsCard').slideDown(150);
    } else {
      $('#chordOptionsCard').slideUp(150);
    }
    saveState();
    renderChordButtons();
    renderFretboard();
  });

  // Clic en un botón de acorde
  $('#chordButtonsContainer').on('click', '.chord-btn', function () {
    const idx = parseInt($(this).data('index'), 10);
    appState.selectedChordIndex = idx;
    appState.displayMode = 'chord';
    $('#modeChord').prop('checked', true);
    $('#chordOptionsCard').show();

    saveState();
    renderChordButtons();
    renderFretboard();
  });

  // Cambio en los checkboxes de intervalos independientes (1, 3, 5, 7, 9, 11, 13)
  $('.interval-toggle').on('change', function () {
    const val = $(this).val();
    if ($(this).is(':checked')) {
      if (!appState.selectedIntervals.includes(val)) {
        appState.selectedIntervals.push(val);
      }
    } else {
      appState.selectedIntervals = appState.selectedIntervals.filter(i => i !== val);
    }
    // Orden natural de intervalos
    const order = ['1', '3', '5', '7', '9', '11', '13'];
    appState.selectedIntervals.sort((a, b) => order.indexOf(a) - order.indexOf(b));

    saveState();
    renderChordButtons();
    renderFretboard();
  });

  // Alternar entre Nombre de Nota y Grado al hacer clic en cualquier nota del diapasón
  $('#fretboardCanvas').on('click', '.note-badge', function (e) {
    e.stopPropagation();
    appState.badgeContent = (appState.badgeContent === 'note') ? 'interval' : 'note';
    saveState();
    renderFretboard();
  });

  // Doble clic sobre la nota de una cuerda para abrir el selector gráfico de afinación
  $('#fretboardCanvas').on('dblclick', '.tuning-cell, .tuning-badge', function (e) {
    e.stopPropagation();
    const stringNum = parseInt($(this).closest('.tuning-cell').data('string'), 10);
    openTuningPicker(stringNum, $(this).closest('.tuning-cell'));
  });

  // Restaurar solo la afinación estándar (E A D G B E)
  $('#btnResetTuning').on('click', function () {
    resetTuning();
  });

  // Resetear configuración completa a valores por defecto
  $('#btnResetConfig').on('click', function () {
    appState = JSON.parse(JSON.stringify(defaultState));
    saveState();
    initControls();
    renderFretboard();
  });

  // Alternar orden de cuerdas (6ª arriba vs 6ª abajo)
  $('#fretboardCanvas').on('click', '#btnToggleStringOrder', function (e) {
    e.stopPropagation();
    appState.stringOrder = (appState.stringOrder === 'asc') ? 'desc' : 'asc';
    saveState();
    renderFretboard();
  });

  // Evitar que doble clic en el botón de orden interfiera con otros handlers
  $('#fretboardCanvas').on('dblclick', '#btnToggleStringOrder', function (e) {
    e.stopPropagation();
  });

  // ==========================================
  // --- MÓDULO BACKING TRACK ---
  // ==========================================

  /**
   * Obtiene la lista de acordes estructurada para el Backing Track actual
   */
  function getBackingTrackChords() {
    const scaleNotes = getCurrentScaleNotes();
    const chordsConfig = SCALES_FULL[appState.scaleType].chords;

    return appState.backingTrack.measures.map(degreeIdx => {
      const safeIdx = (degreeIdx >= 0 && degreeIdx < 7) ? degreeIdx : 0;
      const rootNote = scaleNotes[safeIdx];
      const chordConfig = chordsConfig[safeIdx];
      const suffix = getChordSuffix(chordConfig, appState.selectedIntervals);
      const chordName = `${rootNote}${suffix}`;

      // Semitono fundamental (0..11)
      const rootSemi = NOTE_SEMITONES[rootNote] !== undefined ? NOTE_SEMITONES[rootNote] : 0;
      // Convertir a número MIDI en octava 3 (C3 = 48)
      const rootMidi = 48 + rootSemi;

      // Calcular notas de la tríada/acorde en MIDI
      const notesMidi = [];
      const intervalDefsToUse = INTERVAL_DEFS.filter(d => appState.selectedIntervals.includes(d.interval));
      const activeDefs = intervalDefsToUse.length > 0 ? intervalDefsToUse : [INTERVAL_DEFS[0], INTERVAL_DEFS[1], INTERVAL_DEFS[2]];

      activeDefs.forEach(def => {
        const noteStepIdx = (safeIdx + def.step) % 7;
        const noteName = scaleNotes[noteStepIdx];
        const semi = NOTE_SEMITONES[noteName] !== undefined ? NOTE_SEMITONES[noteName] : 0;
        let midi = 48 + semi;
        // Si el intervalo extendido o la nota es menor que la fundamental, subir octava
        if (midi < rootMidi) midi += 12;
        if (def.isCompound) midi += 12;
        notesMidi.push(midi);
      });

      return {
        degreeIndex: safeIdx,
        roman: chordConfig.roman,
        chordName: chordName,
        rootMidi: rootMidi,
        notesMidi: notesMidi,
        durationBeats: 4
      };
    });
  }

  /**
   * Renderiza las cajas de compases dentro del modal de configuración
   */
  function renderBackingTrackModal() {
    const scaleObj = SCALES_FULL[appState.scaleType];
    const scaleNotes = getCurrentScaleNotes();
    const chordsConfig = scaleObj.chords;

    // Actualizar texto de escala activa en el modal
    $('#btModalCurrentScaleText').text(`${appState.rootNote} ${scaleObj.name} (${scaleNotes.join(' - ')})`);

    // 1. Renderizar casillas de compases
    const $measuresContainer = $('#btMeasuresContainer');
    $measuresContainer.empty();

    const trackChords = getBackingTrackChords();
    trackChords.forEach((chord, idx) => {
      const isEditing = (idx === appState.backingTrack.activeEditIndex);
      const editClass = isEditing ? ' editing-measure' : '';

      const measureHtml = `
        <div class="chord-measure-box${editClass}" data-index="${idx}" style="cursor: pointer;">
          <div class="chord-measure-num">Compás ${idx + 1}</div>
          <div class="chord-measure-name">${chord.chordName}</div>
          <div class="chord-measure-degree">${chord.roman}</div>
        </div>
      `;
      $measuresContainer.append(measureHtml);
    });

    // 2. Renderizar los 7 botones de grados de la escala actual para asignar
    const $degreeContainer = $('#btDegreeSelectorContainer');
    $degreeContainer.empty();

    chordsConfig.forEach((chordData, degIdx) => {
      const rootOfChord = scaleNotes[degIdx];
      const suffix = getChordSuffix(chordData, appState.selectedIntervals);
      const chordName = `${rootOfChord}${suffix}`;

      const btnHtml = `
        <button type="button" class="btn btn-outline-info btn-sm bt-assign-degree-btn" data-degree="${degIdx}">
          <span class="badge bg-dark me-1">${chordData.roman}</span>
          <strong>${chordName}</strong>
        </button>
      `;
      $degreeContainer.append(btnHtml);
    });
  }

  /**
   * Actualiza los elementos del reproductor en la barra inferior fija
   */
  function updateBackingTrackBarUI() {
    $('#btBpmInput').val(appState.backingTrack.bpm);
    const chords = getBackingTrackChords();

    // Renderizar la secuencia completa de compases en la barra
    const $container = $('#btBarSequenceContainer');
    $container.empty();

    chords.forEach((chord, idx) => {
      const pillHtml = `
        <div class="bt-bar-measure-pill" data-index="${idx}" title="Compás ${idx + 1}: ${chord.chordName} (${chord.roman})">
          <span class="pill-chord-name">${chord.chordName}</span>
          <span class="pill-chord-degree">${chord.roman}</span>
        </div>
      `;
      $container.append(pillHtml);
    });
  }

  // --- Handlers de Backing Track ---

  // Iniciar reproducción
  function startBackingTrackPlayback() {
    const chords = getBackingTrackChords();
    if (!chords || chords.length === 0) return;

    window.BackingTrackPlayer.start({
      bpm: appState.backingTrack.bpm,
      chords: chords
    }, function onStep(stepIdx, activeChord) {
      if (activeChord.isCountIn) {
        // Mostrar badge de cuenta previa (Intro 1/4, etc.)
        $('#btBarCountInBadge').text(activeChord.chordName).show();
        $('.bt-bar-measure-pill').removeClass('active-bar-measure');
        $('.chord-measure-box').removeClass('active-measure');
      } else {
        // Ocultar cuenta previa si seguía visible
        $('#btBarCountInBadge').hide();

        // Resaltar el compás actual en la secuencia de la barra
        $('.bt-bar-measure-pill').removeClass('active-bar-measure');
        const $activePill = $(`.bt-bar-measure-pill[data-index="${stepIdx}"]`);
        $activePill.addClass('active-bar-measure');

        // Scroll automático si la secuencia es muy larga
        if ($activePill.length) {
          const container = document.getElementById('btBarSequenceContainer');
          if (container) {
            const pillEl = $activePill[0];
            const scrollLeft = pillEl.offsetLeft - (container.clientWidth / 2) + (pillEl.clientWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          }
        }

        // Iluminar compás activo si el modal está abierto
        $('.chord-measure-box').removeClass('active-measure');
        $(`.chord-measure-box[data-index="${stepIdx}"]`).addClass('active-measure');
      }
    });

    // Actualizar estado del botón unificado (Stop)
    $('#btnBtPlayToggle')
      .removeClass('btn-success')
      .addClass('btn-danger backing-track-pulse')
      .attr('title', 'Detener');
    $('#btPlayIcon').text('⏹');
  }

  // Detener reproducción
  function stopBackingTrackPlayback() {
    window.BackingTrackPlayer.stop();

    // Actualizar estado del botón unificado (Play)
    $('#btnBtPlayToggle')
      .removeClass('btn-danger backing-track-pulse')
      .addClass('btn-success')
      .attr('title', 'Reproducir en Loop');
    $('#btPlayIcon').text('▶');

    $('#btBarCountInBadge').hide();
    $('.bt-bar-measure-pill').removeClass('active-bar-measure');
    $('.chord-measure-box').removeClass('active-measure');
  }

  // Alternar Play / Stop
  $('#btnBtPlayToggle').on('click', function () {
    if (window.BackingTrackPlayer.isPlaying()) {
      stopBackingTrackPlayback();
    } else {
      startBackingTrackPlayback();
    }
  });

  // Control de BPM
  $('#btBpmInput').on('change', function () {
    let val = parseInt($(this).val(), 10);
    if (isNaN(val) || val < 40) val = 40;
    if (val > 240) val = 240;
    $(this).val(val);
    appState.backingTrack.bpm = val;
    saveState();
    if (window.BackingTrackPlayer.isPlaying()) {
      startBackingTrackPlayback(); // Reiniciar con nuevo tempo
    }
  });

  $('#btnBtBpmMinus').on('click', function () {
    let val = Math.max(40, (parseInt($('#btBpmInput').val(), 10) || 100) - 5);
    $('#btBpmInput').val(val).trigger('change');
  });

  $('#btnBtBpmPlus').on('click', function () {
    let val = Math.min(240, (parseInt($('#btBpmInput').val(), 10) || 100) + 5);
    $('#btBpmInput').val(val).trigger('change');
  });

  // Descargar archivo MIDI nativo
  $('#btnBtDownloadMidi').on('click', function () {
    const chords = getBackingTrackChords();
    const midiBytes = window.MidiWriter.buildBackingTrackMidi({
      bpm: appState.backingTrack.bpm,
      chords: chords,
      timeSignatureNum: 4,
      timeSignatureDen: 4
    });

    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BackingTrack_${appState.rootNote}_${appState.scaleType}_${appState.backingTrack.bpm}BPM.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Abrir Modal de Configuración
  $('#backingTrackModal').on('show.bs.modal', function () {
    renderBackingTrackModal();
  });

  // Seleccionar compás para editar en el modal
  $('#btMeasuresContainer').on('click', '.chord-measure-box', function () {
    const idx = parseInt($(this).data('index'), 10);
    appState.backingTrack.activeEditIndex = idx;
    $('.chord-measure-box').removeClass('editing-measure');
    $(this).addClass('editing-measure');
  });

  // Asignar grado al compás seleccionado
  $('#btDegreeSelectorContainer').on('click', '.bt-assign-degree-btn', function () {
    const degree = parseInt($(this).data('degree'), 10);
    const editIdx = appState.backingTrack.activeEditIndex;
    if (editIdx >= 0 && editIdx < appState.backingTrack.measures.length) {
      appState.backingTrack.measures[editIdx] = degree;
      // Pasar automáticamente al siguiente compás para agilizar la carga
      appState.backingTrack.activeEditIndex = (editIdx + 1) % appState.backingTrack.measures.length;
      saveState();
      renderBackingTrackModal();
      updateBackingTrackBarUI();

      if (window.BackingTrackPlayer.isPlaying()) {
        startBackingTrackPlayback();
      }
    }
  });

  // Añadir compás
  $('#btnBtAddMeasure').on('click', function () {
    if (appState.backingTrack.measures.length < 16) {
      appState.backingTrack.measures.push(0); // I por defecto
      appState.backingTrack.activeEditIndex = appState.backingTrack.measures.length - 1;
      saveState();
      renderBackingTrackModal();
      updateBackingTrackBarUI();
    }
  });

  // Eliminar compás
  $('#btnBtRemoveMeasure').on('click', function () {
    if (appState.backingTrack.measures.length > 1) {
      appState.backingTrack.measures.pop();
      if (appState.backingTrack.activeEditIndex >= appState.backingTrack.measures.length) {
        appState.backingTrack.activeEditIndex = appState.backingTrack.measures.length - 1;
      }
      saveState();
      renderBackingTrackModal();
      updateBackingTrackBarUI();
    }
  });

  // Presets de Progresiones Populares
  const BT_PRESETS = {
    'I-IV-V-I': [0, 3, 4, 0],
    'ii-V-I': [1, 4, 0],
    'I-V-vi-IV': [0, 4, 5, 3],
    'I-IV-I-V': [0, 3, 0, 4],
    'i-VI-III-VII': [0, 5, 2, 6]
  };

  $('#btPresetButtons').on('click', '.bt-preset-btn', function () {
    const presetKey = $(this).data('preset');
    if (BT_PRESETS[presetKey]) {
      appState.backingTrack.measures = [...BT_PRESETS[presetKey]];
      appState.backingTrack.activeEditIndex = 0;
      saveState();
      renderBackingTrackModal();
      updateBackingTrackBarUI();

      if (window.BackingTrackPlayer.isPlaying()) {
        startBackingTrackPlayback();
      }
    }
  });

  // Actualizar Backing Track cuando cambia la Tónica o Escala en la página principal
  const originalRenderChordButtons = renderChordButtons;
  renderChordButtons = function () {
    originalRenderChordButtons();
    updateBackingTrackBarUI();
    if ($('#backingTrackModal').hasClass('show')) {
      renderBackingTrackModal();
    }
  };

  // Inicialización de la aplicación
  initControls();
  renderFretboard();
  updateBackingTrackBarUI();
});
