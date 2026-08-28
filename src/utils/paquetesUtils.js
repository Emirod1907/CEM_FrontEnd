import { calcularPrecioEvento } from './preciosUtils'

const parsearJSON = (v) => {
    if (!v) return []
    if (Array.isArray(v)) return v
    try { return JSON.parse(v) } catch { return [] }
}
const precioSalon = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0

// Precio efectivo de un ítem del catálogo para el evento (según tipo de precio)
const precioItem = (item, invitados) => {
    const base = Number(item.precio) || 0
    if (item.tipo_precio === 'por_persona') return base * Math.max(1, Number(invitados) || 1)
    return base
}

// Niveles de paquete (de menor a mayor). Cada nivel define de qué "ventana" de
// precios (lo..hi, sobre el catálogo ordenado por precio) toma servicios y productos,
// y cuántos. Los niveles altos toman ítems MÁS CAROS/COMPLETOS (no los más baratos),
// para que decoración, sonido, iluminación, etc. aparezcan en Plus/Premium.
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
// ventana [lo, hi] (fracciones del array). Así los niveles altos traen lo mejor.
const pickVentana = (arr, lo, hi, n) => {
    if (!arr.length || n <= 0) return []
    const a = Math.floor(lo * arr.length)
    const b = Math.max(a + 1, Math.ceil(hi * arr.length))
    const pool = arr.slice(a, b)
    return pool.slice(Math.max(0, pool.length - n))
}

// Arma los 4 paquetes combinando salón + servicios + productos del catálogo,
// filtrados por aforo (invitados) y tipo de evento. fecha (ISO) ajusta el precio
// del salón por fin de semana / feriado.
export const generarPaquetes = (tipo, invitados, fecha, salones, servicios) => {
    const inv = Math.max(1, Number(invitados) || 1)

    // Salones aptos: aforo suficiente + que acepten el tipo (si se indicó)
    let aptos = salones.filter(s => Number(s.aforo) >= inv)
    if (tipo) {
        const conTipo = aptos.filter(s => parsearJSON(s.tipos_evento).includes(tipo))
        if (conTipo.length) aptos = conTipo
    }
    aptos.sort((a, b) => precioSalon(a) - precioSalon(b))
    if (aptos.length === 0) return []

    // Catálogo separado por tipo, ordenado por precio ASC
    const servs = servicios.filter(s => (s.tipo_item || 'producto') === 'servicio')
        .sort((a, b) => precioItem(a, inv) - precioItem(b, inv))
    const prods = servicios.filter(s => (s.tipo_item || 'producto') === 'producto')
        .sort((a, b) => precioItem(a, inv) - precioItem(b, inv))

    const salonEnFrac = (frac) => aptos[Math.min(aptos.length - 1, Math.round(frac * (aptos.length - 1)))]

    return TIERS_PAQUETE.map((tier, i) => {
        const frac = TIERS_PAQUETE.length > 1 ? i / (TIERS_PAQUETE.length - 1) : 0
        const salon = salonEnFrac(frac)
        const salonPrecio = fecha
            ? calcularPrecioEvento(precioSalon(salon), salon.precios_config, fecha, 1).precio
            : precioSalon(salon)

        const serviciosSel = pickVentana(servs, tier.servLo, tier.servHi, tier.servN)
        const productosSel = pickVentana(prods, tier.prodLo, tier.prodHi, tier.prodN)
        const incluidos = [...serviciosSel, ...productosSel]
        const totalItems = incluidos.reduce((acc, it) => acc + precioItem(it, inv), 0)

        return {
            key: tier.key,
            label: tier.label,
            color: tier.color,
            desc: tier.desc,
            salon,
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
    cantidad: 1,
    horas: 1,
    turnos: 1,
    hora_inicio: null,
    hora_manual: false,
    tramo: null,
})
