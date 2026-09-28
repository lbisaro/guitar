// Definición concisa de escalas: SOLO SE ESPECIFICA EL NOMBRE, INTERVALOS Y DESCRIPCIÓN PEDAGÓGICA
const SCALES = [
  // --- Escalas Mayores y Menores ---
  {
    name: 'Mayor',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    group: 'Escalas',
    description: '<strong>Fórmula:</strong> 1 - 2 - 3 - 4 - 5 - 6 - 7 (T - T - S - T - T - T - S). Escala diatónica fundamental y base de la armonía tonal occidental. Su 3ra y 7ma mayores le otorgan un carácter brillante, alegre y plenamente resolutivo.'
  },
  {
    name: 'Menor Natural',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    group: 'Escalas',
    description: '<strong>Fórmula:</strong> 1 - 2 - b3 - 4 - 5 - b6 - b7 (T - S - T - T - S - T - T). Escala relativa menor construida sobre el VI grado de la escala mayor. Posee 3ra, 6ta y 7ma menores, transmitiendo una sonoridad sobria, nostálgica y reflexiva.'
  },
  {
    name: 'Menor Antigua',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    group: 'Escalas',
    description: '<strong>Fórmula:</strong> 1 - 2 - b3 - 4 - 5 - b6 - b7. Denominación tradicional de la escala menor pura (anterior a las variantes armónica y melódica). Al tener subtónica a 1 tono de la fundamental (en vez de sensible a 1 semitono), posee una cadencia modal suave y arcaica.'
  },
  {
    name: 'Menor Armónica',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    group: 'Escalas',
    description: '<strong>Fórmula:</strong> 1 - 2 - b3 - 4 - 5 - b6 - 7. Nace al elevar el 7mo grado un semitono para crear una sensible que permita construir un acorde dominante mayor (V7). El salto de 1 tono y medio entre b6 y 7 produce su inconfundible timbre exótico y neoclásico.'
  },
  {
    name: 'Menor Melódica',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    group: 'Escalas',
    description: '<strong>Fórmula:</strong> 1 - 2 - b3 - 4 - 5 - 6 - 7. Eleva el 6to y 7mo grado para suavizar el salto melódico de la menor armónica, facilitando una conducción melódica fluida hacia la tónica. En jazz y armonía moderna se utiliza igual ascendente y descendente (Jazz Minor).'
  },

  // --- Modos Griegos ---
  {
    name: 'Jónico',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    group: 'Modos Griegos',
    description: '<strong>Modo I de la Escala Mayor:</strong> 1 - 2 - 3 - 4 - 5 - 6 - 7. Modo mayor por excelencia. Su nota característica es la 4ta justa (11), que suele evitarse como nota sostenida sobre el acorde Imaj7 para prevenir choques de semitono con la 3ra mayor.'
  },
  {
    name: 'Dórico',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    group: 'Modos Griegos',
    description: '<strong>Modo II de la Escala Mayor:</strong> 1 - 2 - b3 - 4 - 5 - 6 - b7. Modo menor caracterizado por su 6ta mayor (13). Esta nota le resta pesadumbre al modo menor y le añade un matiz brillante, sofisticado y blusero, pilar del Jazz, Funk y Rock Fusión.'
  },
  {
    name: 'Frigio',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    group: 'Modos Griegos',
    description: '<strong>Modo III de la Escala Mayor:</strong> 1 - b2 - b3 - 4 - 5 - b6 - b7. Modo menor definido por su 2da menor (b9). El semitono inmediato a la tónica genera una tensión inmediata, mística y dramática, emblemática del Flamenco, música andaluza y Metal.'
  },
  {
    name: 'Lidio',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    group: 'Modos Griegos',
    description: '<strong>Modo IV de la Escala Mayor:</strong> 1 - 2 - 3 - #4 - 5 - 6 - 7. El modo mayor más luminoso y abierto. Su nota característica es la 4ta aumentada (#11), que produce una atmósfera flotante, etérea, futurista y cinematográfica muy explotada en el rock instrumental.'
  },
  {
    name: 'Mixolidio',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    group: 'Modos Griegos',
    description: '<strong>Modo V de la Escala Mayor:</strong> 1 - 2 - 3 - 4 - 5 - 6 - b7. Modo mayor con 7ma menor, cuna del acorde de dominante (V7). Su sonoridad cálida, alegre y ligeramente desenfadada es la esencia armónica del Blues, Rock clásico, Folk y Country.'
  },
  {
    name: 'Eolico',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    group: 'Modos Griegos',
    description: '<strong>Modo VI de la Escala Mayor:</strong> 1 - 2 - b3 - 4 - 5 - b6 - b7. Corresponde a la escala menor natural. Su nota modal es la 6ta menor (b6), proporcionando un ambiente melancólico, solemne y épico, clásico en baladas de rock y música de cámara.'
  },
  {
    name: 'Lócrio',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    group: 'Modos Griegos',
    description: '<strong>Modo VII de la Escala Mayor:</strong> 1 - b2 - b3 - 4 - b5 - b6 - b7. El único modo con 5ta disminuida (b5) sobre la tónica, generando un acorde base semidisminuido (m7b5). De naturaleza altamente inestable y tensa, común en metal extremo y cadencias de jazz.'
  }
];

// Exponer globalmente para app.js
window.SCALES = SCALES;
