import { calcularPrecioEvento } from './preciosUtils'

const parsearJSON = (v) => {
    if (!v) return []
    if (Array.isArray(v)) return v
    try { return JSON.parse(v) } catch { return [] }
}
const precioSalon = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0

// Cantidad y subtotal de un ítem del catálogo para cubrir a los invitados:
// - Tortas / productos que rinden N personas → ⌈invitados / rinde⌉ unidades (discreto).
// - Ítems "por persona" (catering por plato) → precio × invitados.
// - Fijo / por hora / por turno (seguridad, sonido, show) → 1 unidad, cubre el evento.
export const cantidadYsubtotal = (item, invitados) => {
    const base = Number(item.precio) || 0
    const inv = Math.max(1, Number(invitados) || 1)
    const rinde = Number(item.ideal_para_personas) || 0
    const esDiscreto = item.categoria === 'tortas' || rinde > 0
    if (esDiscreto) {
        const cant = rinde > 0 ? Math.max(1, Math.ceil(inv / rinde)) : 1
        return { cantidad: cant, subtotal: base * cant, personas: null }
    }
    if (item.tipo_precio === 'por_persona') {
        return { cantidad: 1, subtotal: base * inv, personas: inv }
    }
    return { cantidad: 1, subtotal: base, personas: null }
}

const precioBaseOrden = (item) => Number(item.precio) || 0

// Niveles de paquete (de menor a mayor). Cada nivel define de qué "ventana" de
// precios toma servicios y productos, y cuántos. Los niveles altos toman ítems
// más caros/completos (decoración, sonido, iluminación, etc.).
export const TIERS_PAQUETE = [
    { key: 'economica', label: 'Económica', color: '#22a06b', desc: 'Lo esencial para tu evento.',
      servLo: 0.00, servHi: 0.35, servN: 1, prodLo: 0.00, prodHi: 0.50, prodN: 1 },
    { key: 'estandar', label: 'Estándar', color: '#1868db', desc: 'Buen equilibrio precio y servicios.',
      servLo: 0.00, servHi: 0.55, servN: 2, prodLo: 0.00, prodHi: 0.70, prodN: 2 },
    { key: 'plus', label: 'Plus', color: '#8b5cf6', desc: 'Más servicios y mejor salón.',
      servLo: 0.35, servHi: 0.90, servN: 3, prodLo: 0.20, prodHi: 0.95, prodN: 2 },
    { key: 'premium', label: 'Premium', color: '#d827b7', desc: 'Todo incluido, la mejor experiencia.',
      servLo: 0.45, servHi: 1.00, servN: 5, prodLo: 0.30, prodHi: 1.00, prodN: 3 },
]

// De un array ordenado por precio ASC, toma los `n` ítems más caros dentro de la
// ventana [lo, hi] (fracciones del array).
const pickVentana = (arr, lo, hi, n) => {
    if (!arr.length || n <= 0) return []
    const a = Math.floor(lo * arr.length)
    const b = Math.max(a + 1, Math.ceil(hi * arr.length))
    const pool = arr.slice(a, b)
    return pool.slice(Math.max(0, pool.length - n))
}

// Arma los 4 paquetes combinando salón + servicios + productos del catálogo,
// con las cantidades escaladas para cubrir a los invitados.
export const generarPaquetes = (tipo, invitados, fecha, salones, servicios) => {
    const inv = Math.max(1, Number(invitados) || 1)

    let aptos = salones.filter(s => Number(s.aforo) >= inv)
    if (tipo) {
        const conTipo = aptos.filter(s => parsearJSON(s.tipos_evento).includes(tipo))
        if (conTipo.length) aptos = conTipo
    }
    aptos.sort((a, b) => precioSalon(a) - precioSalon(b))
    if (aptos.length === 0) return []

    const servs = servicios.filter(s => (s.tipo_item || 'producto') === 'servicio').sort((a, b) => precioBaseOrden(a) - precioBaseOrden(b))
    const prods = servicios.filter(s => (s.tipo_item || 'producto') === 'producto').sort((a, b) => precioBaseOrden(a) - precioBaseOrden(b))

    const salonEnFrac = (frac) => aptos[Math.min(aptos.length - 1, Math.round(frac * (aptos.length - 1)))]

    // Adjunta cantidad/subtotal (escalados a invitados) a cada ítem elegido
    const conCantidad = (arr) => arr.map(it => {
        const cs = cantidadYsubtotal(it, inv)
        return { ...it, _cant: cs.cantidad, _sub: cs.subtotal, _personas: cs.personas }
    })

    return TIERS_PAQUETE.map((tier, i) => {
        const frac = TIERS_PAQUETE.length > 1 ? i / (TIERS_PAQUETE.length - 1) : 0
        const salon = salonEnFrac(frac)
        const salonPrecio = fecha
            ? calcularPrecioEvento(precioSalon(salon), salon.precios_config, fecha, 1).precio
            : precioSalon(salon)

        const serviciosSel = conCantidad(pickVentana(servs, tier.servLo, tier.servHi, tier.servN))
        const productosSel = conCantidad(pickVentana(prods, tier.prodLo, tier.prodHi, tier.prodN))
        const incluidos = [...serviciosSel, ...productosSel]
        const totalItems = incluidos.reduce((acc, it) => acc + it._sub, 0)

        return {
            key: tier.key,
            label: tier.label,
            color: tier.color,
            desc: tier.desc,
            salon,
            salonPrecio,
            servicios: serviciosSel,
            productos: productosSel,
            items: incluidos,
            total: Math.round(salonPrecio + totalItems),
        }
    })
}

// Da forma a un ítem del catálogo como ítem del carrito del organizador.
export const itemAServicioCarrito = (item) => ({
    ...item,
    precio: Number(item.precio) || 0,
    horas: 1,
    turnos: 1,
    hora_inicio: null,
    hora_manual: false,
    tramo: null,
})
