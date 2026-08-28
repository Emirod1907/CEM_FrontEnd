import { calcularPrecioEvento } from './preciosUtils'

const parsearJSON = (v) => {
    if (!v) return []
    if (Array.isArray(v)) return v
    try { return JSON.parse(v) } catch { return [] }
}
const precioSalon = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0
const precioBase = (item) => Number(item.precio) || 0

// Distancia en km entre dos coordenadas (Haversine)
export const distanciaKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Cantidad y subtotal de un ítem del catálogo para cubrir a los invitados:
// - Tortas / productos que rinden N personas → ⌈invitados / rinde⌉ unidades (discreto).
// - Ítems "por persona" (catering por plato) → precio × invitados.
// - Fijo / por hora / por turno (seguridad, sonido, show) → 1 unidad, cubre el evento.
export const cantidadYsubtotal = (item, invitados) => {
    const base = precioBase(item)
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

// Categorías de producto que cuentan como "comida" y como "bebida"
const COMIDA_CATS = ['alimentos', 'comida', 'catering']
const BEBIDA_CATS = ['bebidas']

// Niveles de paquete (de menor a mayor). Cuántos ítems de cada grupo incluye cada
// nivel. Son cantidades CRECIENTES por columna → cada nivel es un superconjunto del
// anterior, así el total nunca baja (Plus nunca sale más caro que Premium).
// [Económica, Estándar, Plus, Premium]
export const TIERS_PAQUETE = [
    { key: 'economica', label: 'Económica', color: '#22a06b', desc: 'Lo esencial: salón, una comida y una bebida.' },
    { key: 'estandar', label: 'Estándar', color: '#1868db', desc: 'Comida, bebida y algunos servicios.' },
    { key: 'plus', label: 'Plus', color: '#8b5cf6', desc: 'Más comidas, bebidas y servicios; mejor salón.' },
    { key: 'premium', label: 'Premium', color: '#d827b7', desc: 'Todo incluido: la experiencia más completa.' },
]
const PLAN = {
    comida:   [1, 2, 3, 4],
    bebida:   [1, 1, 2, 3],
    servicio: [1, 2, 3, 5],
    otro:     [0, 1, 2, 3],
}

// Prefijo creciente de un array ordenado por precio ASC. En el último nivel
// (Premium) además garantiza incluir el ítem más caro (el "tope") de la categoría,
// para que lo mejor de cada rubro (ej. el pernil) siempre esté en Premium.
const seleccionar = (arr, counts, nivel, incluirTope) => {
    if (!arr.length) return []
    const n = Math.min(counts[nivel], arr.length)
    let sel = arr.slice(0, n)
    if (incluirTope) {
        const tope = arr[arr.length - 1]
        if (!sel.some(x => x.id_servicio === tope.id_servicio)) sel = [...sel, tope]
    }
    return sel
}

// Arma los 4 paquetes combinando salón + servicios + productos del catálogo,
// con cantidades escaladas a los invitados y precios monótonos entre niveles.
export const generarPaquetes = (tipo, invitados, fecha, salones, servicios, ubicacion = null) => {
    const inv = Math.max(1, Number(invitados) || 1)

    let aptos = salones.filter(s => Number(s.aforo) >= inv)
    if (tipo) {
        const conTipo = aptos.filter(s => parsearJSON(s.tipos_evento).includes(tipo))
        if (conTipo.length) aptos = conTipo
    }

    // Cercanía: por coordenadas (radio) o por departamento/localidad elegido.
    if (ubicacion) {
        if (ubicacion.modo === 'coords' && ubicacion.lat != null && ubicacion.lng != null) {
            const rango = Number(ubicacion.rangoKm) || 60
            const conCoords = aptos.filter(s => s.latitud != null && s.longitud != null)
            const cerca = conCoords.filter(s => distanciaKm(ubicacion.lat, ubicacion.lng, Number(s.latitud), Number(s.longitud)) <= rango)
            if (cerca.length) aptos = cerca
            else if (conCoords.length) {
                aptos = conCoords.sort((a, b) =>
                    distanciaKm(ubicacion.lat, ubicacion.lng, Number(a.latitud), Number(a.longitud)) -
                    distanciaKm(ubicacion.lat, ubicacion.lng, Number(b.latitud), Number(b.longitud))
                ).slice(0, 8)
            }
        } else if (ubicacion.modo === 'departamento' && ubicacion.valor) {
            const enZona = aptos.filter(s => s.departamento === ubicacion.valor || s.localidad === ubicacion.valor)
            if (enZona.length) aptos = enZona
        }
    }
    if (aptos.length === 0) return []

    // Precio efectivo del salón (ajustado a la fecha) y orden por ese precio → salón monótono
    const precioEfectivo = (s) => fecha
        ? calcularPrecioEvento(precioSalon(s), s.precios_config, fecha, 1).precio
        : precioSalon(s)
    const aptosOrden = aptos.map(s => ({ s, pe: precioEfectivo(s) })).sort((a, b) => a.pe - b.pe)

    // Catálogo separado por grupo, ordenado por precio ASC
    const esProducto = (s) => (s.tipo_item || 'producto') === 'producto'
    const comidas = servicios.filter(s => esProducto(s) && COMIDA_CATS.includes(s.categoria)).sort((a, b) => precioBase(a) - precioBase(b))
    const bebidas = servicios.filter(s => esProducto(s) && BEBIDA_CATS.includes(s.categoria)).sort((a, b) => precioBase(a) - precioBase(b))
    const otrosProd = servicios.filter(s => esProducto(s) && !COMIDA_CATS.includes(s.categoria) && !BEBIDA_CATS.includes(s.categoria)).sort((a, b) => precioBase(a) - precioBase(b))
    const servs = servicios.filter(s => (s.tipo_item || 'producto') === 'servicio').sort((a, b) => precioBase(a) - precioBase(b))

    const conCantidad = (arr) => arr.map(it => {
        const cs = cantidadYsubtotal(it, inv)
        return { ...it, _cant: cs.cantidad, _sub: cs.subtotal, _personas: cs.personas }
    })

    const nTiers = TIERS_PAQUETE.length
    return TIERS_PAQUETE.map((tier, i) => {
        const esPremium = i === nTiers - 1
        const frac = nTiers > 1 ? i / (nTiers - 1) : 0
        const elegido = aptosOrden[Math.min(aptosOrden.length - 1, Math.round(frac * (aptosOrden.length - 1)))]
        const salon = elegido.s
        const salonPrecio = elegido.pe

        const comidaSel = seleccionar(comidas, PLAN.comida, i, esPremium)
        const bebidaSel = seleccionar(bebidas, PLAN.bebida, i, esPremium)
        const otroSel = seleccionar(otrosProd, PLAN.otro, i, esPremium)
        const servSel = seleccionar(servs, PLAN.servicio, i, esPremium)

        const serviciosSel = conCantidad(servSel)
        const productosSel = conCantidad([...comidaSel, ...bebidaSel, ...otroSel])
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
    precio: precioBase(item),
    horas: 1,
    turnos: 1,
    hora_inicio: null,
    hora_manual: false,
    tramo: null,
})
