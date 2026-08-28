import { calcularPrecioEvento } from './preciosUtils'

const parsearJSON = (v) => {
    if (!v) return []
    if (Array.isArray(v)) return v
    try { return JSON.parse(v) } catch { return [] }
}
const precioSalon = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0

// Niveles de paquete (de menor a mayor). nServicios = cuántos ítems del catálogo
// incluye cada nivel (superset creciente → precio y completitud aumentan).
export const TIERS_PAQUETE = [
    { key: 'economica', label: 'Económica', color: '#22a06b', nServicios: 1, desc: 'Lo esencial para tu evento.' },
    { key: 'estandar',  label: 'Estándar',  color: '#1868db', nServicios: 3, desc: 'Un buen equilibrio precio/servicios.' },
    { key: 'plus',      label: 'Plus',      color: '#8b5cf6', nServicios: 5, desc: 'Más servicios y mejor salón.' },
    { key: 'premium',   label: 'Premium',   color: '#d827b7', nServicios: 8, desc: 'Todo incluido, la mejor experiencia.' },
]

// Precio efectivo de un ítem del catálogo para el evento (según tipo de precio)
const precioItem = (item, invitados) => {
    const base = Number(item.precio) || 0
    if (item.tipo_precio === 'por_persona') return base * Math.max(1, Number(invitados) || 1)
    return base
}

// Arma los 4 paquetes combinando salón + servicios/productos del catálogo,
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

    // Ítems del catálogo ordenados por precio (crecen los paquetes altos)
    const items = [...servicios].sort((a, b) => precioItem(a, inv) - precioItem(b, inv))

    const salonEnFrac = (frac) => aptos[Math.min(aptos.length - 1, Math.round(frac * (aptos.length - 1)))]

    return TIERS_PAQUETE.map((tier, i) => {
        const frac = TIERS_PAQUETE.length > 1 ? i / (TIERS_PAQUETE.length - 1) : 0
        const salon = salonEnFrac(frac)
        const salonPrecio = fecha
            ? calcularPrecioEvento(precioSalon(salon), salon.precios_config, fecha, 1).precio
            : precioSalon(salon)
        const incluidos = items.slice(0, Math.min(tier.nServicios, items.length))
        const totalItems = incluidos.reduce((acc, it) => acc + precioItem(it, inv), 0)
        return {
            ...tier,
            salon,
            servicios: incluidos,
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
