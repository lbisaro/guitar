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
      let isMinor = false;
      let isDim = false;
      let isAug = false;

      if (semi3 === 4 && semi5 === 7) {
        triad = 'Maj';
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
      if (triad === 'Maj') {
        if (semi7 === 11) {
          tetrad = 'maj7';
        } else if (semi7 === 10) {
          tetrad = '7'; // Dominante (V)
          triad = '';
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

  // Afinación Standard:
  // Cuerdas 1 a 6 con notas al aire
  // cuerda 1 = Mi agudo (E4), cuerda 6 = Mi grave (E2)
  const TUNING_STANDARD = [
    { stringNumber: 1, name: '1 (E)', rootNote: 'E', semitone: 4 },  // E
    { stringNumber: 2, name: '2 (B)', rootNote: 'B', semitone: 11 }, // B
    { stringNumber: 3, name: '3 (G)', rootNote: 'G', semitone: 7 },  // G
    { stringNumber: 4, name: '4 (D)', rootNote: 'D', semitone: 2 },  // D
    { stringNumber: 5, name: '5 (A)', rootNote: 'A', semitone: 9 },  // A
    { stringNumber: 6, name: '6 (E)', rootNote: 'E', semitone: 4 }   // E
  ];

  // Definición universal de intervalos en terceras y sus colores asociados
  const INTERVAL_DEFS = [
    { interval: '1', step: 0, badgeColor: 'badge-triad-root' },
    { interval: '3', step: 2, badgeColor: 'badge-triad-third' },
    { interval: '5', step: 4, badgeColor: 'badge-triad-fifth' },
    { interval: '7', step: 6, badgeColor: 'bg-info text-dark' },
    { interval: '9', step: 1, badgeColor: 'bg-warning text-dark' },
    { interval: '11', step: 3, badgeColor: 'bg-primary text-white' },
    { interval: '13', step: 5, badgeColor: 'bg-success text-white' }
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
    tuning: 'standard'
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
        return Object.assign({}, defaultState, parsed);
      }
    } catch (e) {
      console.warn('Error al leer de localStorage', e);
    }
    return Object.assign({}, defaultState);
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

      INTERVAL_DEFS.forEach(def => {
        if (appState.selectedIntervals.includes(def.interval)) {
          const noteIdxInScale = (chordRootIdx + def.step) % 7;
          const noteName = scaleNotes[noteIdxInScale];
          chordNotesInfo.push({
            note: noteName,
            intervalNumber: def.interval,
            badgeColor: def.badgeColor
          });
        }
      });
    }

    // 1. Fila de números de trastes
    let numbersRowHtml = '<div class="fret-numbers-row">';
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
    // REQUISITO EXPLÍCITO: "la cuerda mas grave se debe graficar debajo, y hacia arriba ir graficando el resto de las cuerdas hasta llegar a la cuerda mas aguda"
    // Cuerda 1 (Mi agudo) arriba, cuerda 6 (Mi grave) abajo.
    for (let s = 1; s <= 6; s++) {
      const stringObj = TUNING_STANDARD.find(item => item.stringNumber === s);
      boardHtml += `
        <div class="string-row">
          <div class="string-label">${stringObj.name}</div>
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

            let displayText = note;
            if (appState.badgeContent === 'interval') {
              const scaleIdx = scaleNotes.findIndex(sn => areNotesEnharmonic(sn, note));
              displayText = (scaleIdx !== -1) ? (scaleIdx + 1).toString() : note;
            }
            badgeHtml = `<span class="badge ${badgeBg} note-badge" title="${note} | Clic para alternar Nota/Grado">${displayText}</span>`;
          } else if (appState.displayMode === 'chord') {
            // Modo acordes
            const chordMatch = chordNotesInfo.find(cn => areNotesEnharmonic(cn.note, note));
            if (chordMatch) {
              const displayText = (appState.badgeContent === 'interval') ? chordMatch.intervalNumber : note;
              badgeHtml = `<span class="badge ${chordMatch.badgeColor} note-badge" title="${note} (Grado: ${chordMatch.intervalNumber}) | Clic para alternar Nota/Grado">${displayText}</span>`;
            } else {
              // Nota de la escala pero no del acorde activo -> Atenuada
              let displayText = note;
              if (appState.badgeContent === 'interval') {
                const chordRootIdx = appState.selectedChordIndex;
                const scaleIdx = scaleNotes.findIndex(sn => areNotesEnharmonic(sn, note));
                if (scaleIdx !== -1) {
                  const diatonicStep = (scaleIdx - chordRootIdx + 7) % 7;
                  displayText = (diatonicStep + 1).toString();
                }
              }
              badgeHtml = `<span class="badge bg-secondary note-badge note-dimmed" title="${note} (En escala) | Clic para alternar Nota/Grado">${displayText}</span>`;
            }
          }
        }

        boardHtml += `<div class="${cellClass}">${badgeHtml}</div>`;
      }

      boardHtml += '</div>'; // Fin string-row
    }

    boardHtml += '</div>'; // Fin fretboard-board

    // Insertar en el canvas
    $fretboardContainer.html(numbersRowHtml + boardHtml);

    // Actualizar leyenda / información del título
    updateHeaderInfo();
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
      const activeIntervalsText = appState.selectedIntervals.length ? appState.selectedIntervals.join(', ') : 'Ninguno';

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

  // Resetear configuración a valores por defecto
  $('#btnResetConfig').on('click', function () {
    appState = Object.assign({}, defaultState);
    saveState();
    initControls();
    renderFretboard();
  });

  // Inicialización de la aplicación
  initControls();
  renderFretboard();
});
