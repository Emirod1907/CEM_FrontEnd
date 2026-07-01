/**
 * eventoUtils.js — detección de tipo de evento y generación de texto de invitación
 */

export const TIPOS_EVENTO = [
    'cumpleaños',
    'boda',
    'quince años',
    'aniversario',
    'graduación',
    'baby shower',
    'bautismo',
    'primera comunión',
    'despedida de soltero/a',
    'corporativo',
    'juntada de amigos',
    'juntada familiar',
    'degustación y sunset',
    'degustación',
    'sunset',
    'fogata',
    'fiesta temática',
    'otro',
]

// ── Sistema de detección por puntuación ───────────────────────────────────────
//
// Cada entrada: [tipo, keyword, peso].
// Se suman puntos por cada keyword que aparece en el nombre del evento.
// Gana el tipo con más puntos acumulados (mínimo 5 para evitar falsos positivos).
//
// Por qué es mejor que el match lineal:
//   "Aniversario empresa"  → aniversario(6) vs corporativo(15) → corporativo ✓
//   "Aniversario de bodas" → solo aniversario(6)               → aniversario ✓
//   "Reunión de trabajo"   → reunión(6)    vs corporativo(12)  → corporativo ✓
//   "Reunión familiar"     → reunión(6) + familiar(4) = 10     → reunión ✓
//
const REGLAS_PESOS = [
    // ── Corporativo — keywords de contexto con peso dominante ─────────────────
    // Peso 15: si "empresa", "laboral", etc. están presentes, casi con certeza es corporativo
    ['corporativo', 'empresa',              15],
    ['corporativo', 'corporativo',          15],
    ['corporativo', 'laboral',              15],
    ['corporativo', 'trabajo',              12],
    ['corporativo', 'oficina',              12],
    ['corporativo', 'staff',                12],
    ['corporativo', 'rrhh',                 12],
    ['corporativo', 'recursos humanos',     15],
    ['corporativo', 'compania',             12], // compañía normalizada a ASCII
    ['corporativo', 'organizacion',         10],
    ['corporativo', 'asociacion',           10],
    ['corporativo', 'institucion',          10],
    ['corporativo', 'fundacion',            10],
    ['corporativo', 'club',                  8],
    ['corporativo', 'cena de fin de ano',   12],
    ['corporativo', 'fin de ano empresa',   15],

    // ── Cumpleaños ────────────────────────────────────────────────────────────
    ['cumpleaños', 'cumpleanos',            10], // normalizado (sin ñ)
    ['cumpleaños', 'cumple',                 8],
    ['cumpleaños', 'birthday',              10],
    ['cumpleaños', 'bday',                  10],
    ['cumpleaños', 'vuelta al sol',          8],

    // ── Boda ─────────────────────────────────────────────────────────────────
    // "boda" como keyword de word-boundary no matchea "bodas" gracias al regex
    ['boda', 'boda',                        12],
    ['boda', 'casamiento',                  12],
    ['boda', 'nupcial',                     12],
    ['boda', 'matrimonio',                  10], // peso menor: aparece en "aniversario de matrimonio"
    ['boda', 'novios',                       8],

    // ── Quince años ──────────────────────────────────────────────────────────
    ['quince años', 'quinceanera',          12], // quinceañera normalizada
    ['quince años', 'quince anos',          12],
    ['quince años', 'xv anos',              12],
    ['quince años', '15 anos',              12],

    // ── Aniversario — peso 6 (ambiguo solo); pierde vs corporativo (15) ───────
    ['aniversario', 'aniversario',           6],
    ['aniversario', 'bodas de plata',       12],
    ['aniversario', 'bodas de oro',         12],
    ['aniversario', 'bodas de diamante',    12],
    ['aniversario', 'anos juntos',           8],
    ['aniversario', 'matrimonio',            6], // suma en "aniversario de matrimonio"

    // ── Graduación ────────────────────────────────────────────────────────────
    ['graduación', 'graduacion',            12],
    ['graduación', 'egreso',                10],
    ['graduación', 'egresados',             10],
    ['graduación', 'egresado',              10],
    ['graduación', 'recibida',               8],
    ['graduación', 'recibido',               8],
    ['graduación', 'diploma',                8],
    ['graduación', 'tesis',                  6],
    ['graduación', 'titulo',                 6],

    // ── Baby shower ──────────────────────────────────────────────────────────
    ['baby shower', 'baby shower',          12],
    ['baby shower', 'babyshower',           12],
    ['baby shower', 'bebe',                  8],
    ['baby shower', 'beba',                  8],
    ['baby shower', 'embarazada',           10],
    ['baby shower', 'embarazo',             10],
    ['baby shower', 'maternidad',            8],
    ['baby shower', 'nacimiento',            6],
    ['baby shower', 'recien nacido',        10],

    // ── Bautismo ─────────────────────────────────────────────────────────────
    ['bautismo', 'bautismo',                12],
    ['bautismo', 'bautizo',                 12],

    // ── Primera comunión ─────────────────────────────────────────────────────
    ['primera comunión', 'primera comunion', 12],
    ['primera comunión', 'comunion',          12],
    ['primera comunión', 'eucaristia',        10],

    // ── Despedida de soltero/a ────────────────────────────────────────────────
    ['despedida de soltero/a', 'despedida',      10],
    ['despedida de soltero/a', 'soltera',         10],
    ['despedida de soltero/a', 'soltero',         10],
    ['despedida de soltero/a', 'hen party',       10],
    ['despedida de soltero/a', 'bachelorette',    10],

    // ── Juntada de amigos — peso bajo; pierde contra corporativo ─────────────
    ['juntada de amigos', 'juntada de amigos', 15],
    ['juntada de amigos', 'juntada',            6],
    ['juntada de amigos', 'amigos',             6],
    ['juntada de amigos', 'amigas',             6],
    ['juntada de amigos', 'previa',             6],
    ['juntada de amigos', 'encuentro',          4],
    ['juntada de amigos', 'social',             3],

    // ── Juntada familiar — "familiar" suma fuerte ─────────────────────────────
    ['juntada familiar', 'juntada familiar',   15],
    ['juntada familiar', 'reunion familiar',   15],
    ['juntada familiar', 'familiar',            8],
    ['juntada familiar', 'familia',             8],
    ['juntada familiar', 'primos',              6],
    ['juntada familiar', 'abuelos',             6],

    // ── Degustación y Sunset — la frase combinada gana a las individuales ─────
    ['degustación y sunset', 'degustacion y sunset', 25],
    ['degustación y sunset', 'sunset y degustacion', 25],
    ['degustación y sunset', 'cata al atardecer',    20],

    // ── Degustación ───────────────────────────────────────────────────────────
    ['degustación', 'degustacion',          10],
    ['degustación', 'cata',                 10],
    ['degustación', 'maridaje',             10],
    ['degustación', 'vinos',                 6],
    ['degustación', 'bodega',                4],

    // ── Sunset ────────────────────────────────────────────────────────────────
    ['sunset', 'sunset',                    10],
    ['sunset', 'atardecer',                 10],
    ['sunset', 'after office',               8],
    ['sunset', 'after',                      5],

    // ── Fogata ────────────────────────────────────────────────────────────────
    ['fogata', 'fogata',                    12],
    ['fogata', 'fogon',                     12],
    ['fogata', 'fuego',                      5],

    // ── Fiesta temática ──────────────────────────────────────────────────────
    ['fiesta temática', 'tematica',         10],
    ['fiesta temática', 'tematico',         10],
    ['fiesta temática', 'disfraz',          10],
    ['fiesta temática', 'disfraces',        10],
    ['fiesta temática', 'halloween',        10],
    ['fiesta temática', 'carnaval',         10],
    ['fiesta temática', 'mascarada',        10],
    ['fiesta temática', 'anos 80',           8],
    ['fiesta temática', 'anos 90',           8],
    ['fiesta temática', 'retro',             6],
    ['fiesta temática', 'harry potter',     10],
    ['fiesta temática', 'princesas',         8],
    ['fiesta temática', 'superheroes',       8],
]

// Elimina tildes y diacríticos → ASCII puro para comparaciones robustas
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Para palabras sueltas usa word-boundary (\b) para evitar que "boda" matchee
// en "bodas", o "cumple" en "cumpleaños". Para frases usa includes() simple.
const coincide = (texto, kw) => {
    if (kw.includes(' ')) return texto.includes(kw)
    try { return new RegExp(`\\b${kw}\\b`).test(texto) } catch { return texto.includes(kw) }
}

/**
 * Detecta el tipo de evento a partir del nombre usando puntuación por keywords.
 * Gana el tipo con más puntos acumulados (mínimo 5).
 * @param {string} nombre
 * @returns {string|null}
 */
export const detectarTipoEvento = (nombre) => {
    if (!nombre || nombre.trim().length < 3) return null
    const texto = norm(nombre)

    const scores = {}
    for (const [tipo, kw, peso] of REGLAS_PESOS) {
        if (coincide(texto, norm(kw))) {
            scores[tipo] = (scores[tipo] || 0) + peso
        }
    }

    if (Object.keys(scores).length === 0) return null

    let ganador = null
    let maxPuntaje = 0
    for (const [tipo, puntaje] of Object.entries(scores)) {
        if (puntaje > maxPuntaje) { maxPuntaje = puntaje; ganador = tipo }
    }

    return maxPuntaje >= 5 ? ganador : null
}

// ── Extracción de datos del nombre ────────────────────────────────────────────
const extraerDatosCumple = (nombre) => {
    const palabras = nombre.trim().split(/\s+/)
    const ignorar = ['cumple', 'cumpleaños', 'birthday', 'bday', 'de', 'del', 'la', 'el']
    let edad = null
    const restoWords = []
    for (const p of palabras) {
        const n = Number(p)
        if (!isNaN(n) && n > 0 && n < 150) { edad = n; continue }
        if (ignorar.includes(p.toLowerCase())) continue
        restoWords.push(p)
    }
    const festejado = restoWords.length > 0
        ? restoWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        : null
    return { edad, festejado }
}

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// ── Templates de invitación por tipo ─────────────────────────────────────────
export const generarTextoInvitacion = (tipo, nombre) => {
    switch (tipo) {
        case 'cumpleaños': {
            const { edad, festejado } = extraerDatosCumple(nombre)
            const quien = festejado || 'nosotros'
            const edadStr = edad ? ` ${edad}` : ''
            return `Los invitamos a compartir con ${quien} una vuelta al sol${edadStr ? ` más` : ''} llena de alegría, risas y momentos que quedarán atesorados en el corazón para siempre. Tu presencia es, sin dudas, el mejor regalo de todos.`
        }
        case 'boda':
            return `Con inmensa alegría les comunicamos que hemos elegido unir nuestras vidas para siempre, y queremos que estén presentes en este momento tan especial e irrepetible. Los esperamos para celebrar juntos el amor que nos une y comenzar este nuevo camino rodeados de quienes más queremos.`
        case 'quince años': {
            const palabras = nombre.split(/\s+/)
            const ignorar = ['quince', 'xv', '15', 'años', 'de', 'la']
            const candidata = palabras.find(p => !ignorar.includes(p.toLowerCase()) && isNaN(Number(p)))
            const quien = candidata ? cap(candidata) : null
            return quien
                ? `Con todo el amor del mundo los invitamos a celebrar los quince años de ${quien}, el comienzo de una nueva etapa llena de sueños, posibilidades y la magia de una vida que recién empieza a desplegarse. ¡Su presencia hará de esta noche un momento para siempre!`
                : `Con todo el amor del mundo los invitamos a ser parte de este momento único e irrepetible: la celebración de mis quince años, el comienzo de una nueva etapa llena de sueños y posibilidades infinitas.`
        }
        case 'aniversario':
            return `Los invitamos a celebrar con nosotros este camino recorrido juntos, lleno de amor, complicidad y memorias que atesoramos en el alma. Cada año compartido es un tesoro, y queremos festejar esta nueva vuelta de la vida rodeados de las personas que más queremos.`
        case 'graduación':
            return `Con enorme orgullo y gratitud los invitamos a celebrar este logro tan esperado, fruto del esfuerzo, la dedicación y el apoyo incondicional de quienes siempre estuvieron presentes. Este título no es solo mío, también es de todos ustedes. ¡Los esperamos para brindar juntos!`
        case 'baby shower':
            return `Con el corazón rebosante de alegría les anunciamos que pronto habrá un nuevo integrante en nuestra familia, y queremos celebrar su llegada con quienes más amamos. Los invitamos a compartir esta fiesta llena de ternura, amor y la ilusión de una nueva historia que está por comenzar.`
        case 'bautismo':
            return `Con fe y amor en el corazón, los invitamos a ser parte de este momento sagrado en el que recibiremos las aguas del bautismo. Su presencia y su bendición harán aún más especial este día de gracia que quedará grabado en nuestra familia para siempre.`
        case 'primera comunión':
            return `Con profunda alegría los invitamos a acompañarnos en este día tan especial, en el que recibiremos por primera vez el pan de vida. Un momento de fe, amor y gratitud que guardaremos en el corazón para siempre. Su presencia es la más hermosa ofrenda.`
        case 'despedida de soltero/a':
            return `¡Porque toda gran historia merece una gran despedida, los invitamos a sumarse a esta noche que prometemos recordar por mucho tiempo! Habrá risas, sorpresas y la mejor compañía para despedir esta etapa con todo. ¡Los esperamos!`
        case 'corporativo':
            return `Nos complace invitarlos a compartir un momento de celebración y reconocimiento junto a todo el equipo. Es una noche para valorar el trabajo realizado, fortalecer los vínculos y brindar juntos por los desafíos y logros que vendrán. ¡Los esperamos!`
        case 'juntada de amigos':
            return `¡Se viene una juntada de esas que quedan en la memoria! Los esperamos para compartir risas, anécdotas y la mejor compañía. Porque con amigos, cualquier excusa es buena para encontrarse — y esta vez la excusa somos nosotros. ¡No falten!`
        case 'juntada familiar':
            return `Los invitamos a una juntada en familia para compartir una linda jornada todos juntos. Porque los mejores momentos son los que se viven alrededor de la mesa, entre historias, abrazos y esa complicidad que solo la familia tiene. ¡Los esperamos con los brazos abiertos!`
        case 'degustación y sunset':
            return `Los invitamos a una experiencia única: una degustación exclusiva acompañada del mejor atardecer. Sabores, aromas y colores del cielo en un encuentro pensado para disfrutar con todos los sentidos. ¡Reservá tu lugar y viví un momento inolvidable!`
        case 'degustación':
            return `Los invitamos a un viaje de sabores y aromas en una degustación pensada para paladares curiosos. Una experiencia para descubrir, compartir y disfrutar en buena compañía. ¡Los esperamos con las copas listas!`
        case 'sunset':
            return `Los invitamos a despedir el día de la mejor manera: buena música, buenos tragos y el atardecer más lindo como telón de fondo. Un encuentro relajado para disfrutar de la magia de la hora dorada. ¡Nos vemos al caer el sol!`
        case 'fogata':
            return `Los invitamos a una noche de fogata bajo las estrellas: fuego, guitarra, historias y esa calidez que solo se da alrededor de las llamas. Traé tu mejor anécdota y muchas ganas de compartir. ¡Te esperamos junto al fuego!`
        case 'fiesta temática':
            return `¡Los invitamos a sumergirse en una noche llena de diversión, color y mucha energía! Prepárense para vivir una experiencia única que los sorprenderá desde el primer momento. No se lo pueden perder: habrá ambientación, sorpresas y toda la magia de una noche distinta.`
        default:
            return `Con mucho cariño los invitamos a ser parte de este momento tan especial para nosotros. Su presencia es lo que más valoramos y lo que convertirá esta celebración en un recuerdo verdaderamente imborrable. ¡Los esperamos!`
    }
}

export const EMOJI_TIPO = {
    'cumpleaños':            '🎂',
    'boda':                  '💍',
    'quince años':           '👑',
    'aniversario':           '💞',
    'graduación':            '🎓',
    'baby shower':           '🍼',
    'bautismo':              '🕊️',
    'primera comunión':      '✝️',
    'despedida de soltero/a':'🎉',
    'corporativo':           '🏢',
    'juntada de amigos':     '🍻',
    'juntada familiar':      '👨‍👩‍👧‍👦',
    'degustación y sunset':  '🥂',
    'degustación':           '🍷',
    'sunset':                '🌅',
    'fogata':                '🔥',
    'fiesta temática':       '🎭',
    'otro':                  '✨',
}
