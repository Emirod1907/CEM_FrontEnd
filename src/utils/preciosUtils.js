// ── Feriados nacionales Argentina 2025-2027 ───────────────────────────────────
// Fechas fijas + movibles aproximadas (Carnaval y Semana Santa varían cada año)
const FERIADOS_AR = new Set([
    // 2025
    '2025-01-01', // Año Nuevo
    '2025-03-03', '2025-03-04', // Carnaval
    '2025-03-24', // Día de la Memoria
    '2025-04-02', // Día del Veterano y los Caídos en Malvinas
    '2025-04-17', '2025-04-18', // Jueves y Viernes Santos
    '2025-05-01', // Día del Trabajador
    '2025-05-25', // Día de la Revolución de Mayo
    '2025-06-20', // Paso a la Inmortalidad del Gral. Belgrano
    '2025-07-09', // Día de la Independencia
    '2025-08-18', // Paso a la Inmortalidad del Gral. San Martín (3er lunes)
    '2025-10-13', // Día del Respeto a la Diversidad Cultural (2do lunes)
    '2025-11-21', // Día de la Soberanía Nacional (4to lunes)
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad
    // 2026
    '2026-01-01',
    '2026-02-16', '2026-02-17', // Carnaval
    '2026-03-24',
    '2026-04-02',
    '2026-04-02', '2026-04-03', // Semana Santa (varía)
    '2026-05-01',
    '2026-05-25',
    '2026-06-15', // Belgrano (lunes cercano al 20/6)
    '2026-07-09',
    '2026-08-17', // San Martín (lunes)
    '2026-10-12',
    '2026-11-20',
    '2026-12-08',
    '2026-12-25',
    // 2027
    '2027-01-01',
    '2027-02-08', '2027-02-09', // Carnaval
    '2027-03-24',
    '2027-03-25', '2027-03-26', // Semana Santa
    '2027-04-02',
    '2027-05-01',
    '2027-05-25',
    '2027-06-21', // Belgrano (lunes)
    '2027-07-09',
    '2027-08-16', // San Martín (lunes)
    '2027-10-11', // Diversidad (lunes)
    '2027-11-22', // Soberanía (lunes)
    '2027-12-08',
    '2027-12-25',
])

// ── Helpers de fecha ──────────────────────────────────────────────────────────

export const esFeriado = (fechaStr) => {
    if (!fechaStr) return false
    return FERIADOS_AR.has(fechaStr.substring(0, 10))
}

export const esFindeSemana = (fechaStr) => {
    if (!fechaStr) return false
    const d = new Date(fechaStr.substring(0, 10) + 'T12:00:00')
    const day = d.getDay() // 0=Dom, 6=Sáb
    return day === 0 || day === 6
}

// 'feriado' | 'fin_semana' | 'comun'
export const tipoDia = (fechaStr) => {
    if (!fechaStr) return 'comun'
    if (esFeriado(fechaStr)) return 'feriado'
    if (esFindeSemana(fechaStr)) return 'fin_semana'
    return 'comun'
}

export const TIPO_DIA_LABEL = {
    feriado:    '📅 Feriado',
    fin_semana: '📅 Fin de semana',
    comun:      '📅 Día hábil',
}

export const TIPO_DIA_COLOR = {
    feriado:    '#f97316',
    fin_semana: '#8b5cf6',
    comun:      '#6b7280',
}

// ── Config de precios ─────────────────────────────────────────────────────────

export const PRECIOS_CONFIG_DEFAULT = {
    fin_semana: null,
    feriado: null,
    por_hora: false,
    precio_hora: null,
    precio_hora_fin_semana: null,
    precio_hora_feriado: null,
}

// Precio unitario de un producto aplicando su descuento por cantidad, si la
// cantidad alcanza el umbral (descuento_cantidad_min → descuento_porcentaje %).
export const precioUnitarioConDescuento = (item) => {
    const base = Number(item?.precio) || 0
    const min  = Number(item?.descuento_cantidad_min) || 0
    const pct  = Number(item?.descuento_porcentaje) || 0
    const cant = Number(item?.cantidad) || 1
    if (min > 1 && pct > 0 && cant >= min) return +(base * (1 - pct / 100)).toFixed(2)
    return base
}

export const parsePreciosConfig = (val) => {
    if (!val) return null
    try {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val
        // Si es array (formato viejo de precios_tramos), ignorar
        if (Array.isArray(parsed)) return null
        return parsed
    } catch { return null }
}

/**
 * Calcula el precio para un evento dado una fecha y configuración.
 * @param {number} precioBase  - precio base del servicio/salón
 * @param {object|string|null} preciosConfig - config JSON
 * @param {string} fechaStr    - fecha "YYYY-MM-DD"
 * @param {number} horas       - cantidad de horas (solo relevante si por_hora=true)
 * @returns {{ precio, tipo, label, color, porHora, precioUnitario }}
 */
export const calcularPrecioEvento = (precioBase, preciosConfig, fechaStr, horas = 1, factorComision = 1) => {
    const cfg = parsePreciosConfig(preciosConfig)
    const tipo = tipoDia(fechaStr)
    const base = Number(precioBase) || 0
    const h = Math.max(1, Number(horas) || 1)
    const f = Number(factorComision) || 1

    const resultado = {
        tipo,
        label: TIPO_DIA_LABEL[tipo],
        color: TIPO_DIA_COLOR[tipo],
        porHora: false,
        precioUnitario: base,
        precio: base,
        horas: h,
    }

    if (!cfg) return resultado

    // % de incremento sobre el precio base, alternativa al monto completo
    // (el precio base ya viene con comisión, por eso el % no aplica el factor)
    const pctDia = tipo === 'feriado' ? (cfg.feriado_pct ?? null)
                 : tipo === 'fin_semana' ? (cfg.fin_semana_pct ?? null)
                 : null

    if (cfg.por_hora) {
        const horaBase = cfg.precio_hora != null ? +(Number(cfg.precio_hora) * f).toFixed(2) : base
        let precioHora = horaBase
        if (tipo === 'feriado') {
            if (cfg.precio_hora_feriado != null) precioHora = +(Number(cfg.precio_hora_feriado) * f).toFixed(2)
            else if (pctDia != null) precioHora = +(horaBase * (1 + Number(pctDia) / 100)).toFixed(2)
        } else if (tipo === 'fin_semana') {
            if (cfg.precio_hora_fin_semana != null) precioHora = +(Number(cfg.precio_hora_fin_semana) * f).toFixed(2)
            else if (pctDia != null) precioHora = +(horaBase * (1 + Number(pctDia) / 100)).toFixed(2)
        }

        return { ...resultado, porHora: true, precioUnitario: precioHora, precio: +(precioHora * h).toFixed(2) }
    } else {
        // Tramos por duración (3hs → $X, 4hs → $Y): se usa el tramo más corto
        // que cubre las horas del evento (o el más largo si ninguno alcanza).
        // El % de incremento por día se aplica sobre el precio del tramo.
        const tramos = Array.isArray(cfg.tramos_horarios)
            ? cfg.tramos_horarios.filter(t => t && Number(t.horas) > 0 && t.precio != null)
            : []
        if (tramos.length > 0) {
            const ordenados = [...tramos].sort((a, b) => Number(a.horas) - Number(b.horas))
            const tramo = ordenados.find(t => Number(t.horas) >= h) || ordenados[ordenados.length - 1]
            let precio = +(Number(tramo.precio) * f).toFixed(2)
            if (pctDia != null) precio = +(precio * (1 + Number(pctDia) / 100)).toFixed(2)
            return { ...resultado, precio, porTramos: true, tramoHoras: Number(tramo.horas) }
        }

        let precio = base
        if (tipo === 'feriado' && cfg.feriado != null)
            precio = +(Number(cfg.feriado) * f).toFixed(2)
        else if (tipo === 'fin_semana' && cfg.fin_semana != null)
            precio = +(Number(cfg.fin_semana) * f).toFixed(2)
        else if (pctDia != null)
            precio = +(base * (1 + Number(pctDia) / 100)).toFixed(2)

        return { ...resultado, precio }
    }
}

/**
 * Versión para servicios (no tiene por_hora toggle, usa tipo_precio del servicio).
 * Si tipo_precio='por_hora', overrideamos el precio/hora según el día.
 */
export const calcularPrecioServicio = (precioBase, preciosConfig, fechaStr, tipoPrecio, horas = 1) => {
    const cfg = parsePreciosConfig(preciosConfig)
    const tipo = tipoDia(fechaStr)
    const base = Number(precioBase) || 0
    const h = Math.max(1, Number(horas) || 1)

    const resultado = {
        tipo,
        label: TIPO_DIA_LABEL[tipo],
        color: TIPO_DIA_COLOR[tipo],
        precioUnitario: base,
        precio: tipoPrecio === 'por_hora' ? base * h : base,
    }

    if (!cfg) return resultado

    let precioOverride = base
    if (tipo === 'feriado' && cfg.feriado != null) precioOverride = Number(cfg.feriado)
    else if (tipo === 'fin_semana' && cfg.fin_semana != null) precioOverride = Number(cfg.fin_semana)

    return {
        ...resultado,
        precioUnitario: precioOverride,
        precio: tipoPrecio === 'por_hora' ? precioOverride * h : precioOverride,
    }
}
