const COMBINING = /[̀-ͯ]/g

// Normaliza texto para comparar: sin acentos, minúsculas, sin espacios extra.
export const normalizarTexto = (s) =>
    (s ?? '').toString().normalize('NFD').replace(COMBINING, '').toLowerCase().trim()

const sinAcentos = (s) => s.normalize('NFD').replace(COMBINING, '')
const tieneAcento = (s) => s !== sinAcentos(s)

// ¿`a` es mejor "display" que `b`? Prefiere: con tilde; luego con mayúscula inicial; luego más largo.
const mejorDisplay = (a, b) => {
    const aa = tieneAcento(a), ab = tieneAcento(b)
    if (aa !== ab) return aa
    const ca = /^[A-ZÁÉÍÓÚÑ]/.test(a), cb = /^[A-ZÁÉÍÓÚÑ]/.test(b)
    if (ca !== cb) return ca
    return a.length > b.length
}

// De una lista de strings, devuelve valores únicos por clave normalizada (ej. "Maipú"
// y "Maipu" cuentan como uno), eligiendo como display el mejor (con tilde/mayúscula).
// Ordenado alfabéticamente en español.
export const dedupCanonico = (lista) => {
    const grupos = new Map()
    for (const raw of lista || []) {
        const v = (raw ?? '').toString().trim()
        if (!v) continue
        const k = normalizarTexto(v)
        const actual = grupos.get(k)
        if (!actual || mejorDisplay(v, actual)) grupos.set(k, v)
    }
    return [...grupos.values()].sort((a, b) => a.localeCompare(b, 'es'))
}
