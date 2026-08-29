import { calcularPrecioEvento } from './preciosUtils'
import { normalizarTexto } from './texto'

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

// Categorías de producto que cuentan como "comida", "bebida" y "vajilla"
const COMIDA_CATS = ['alimentos', 'comida', 'catering']
const BEBIDA_CATS = ['bebidas']
const VAJILLA_CATS = ['vajilla']

const CONSUMO_BEBIDA_L = 0.7   // litros de bebida por persona (ref. 500–750 ml)
const ALCOHOL_KEYWORDS = ['cerveza', 'birra', 'vino', 'fernet', 'champagne', 'champán', 'champan', 'sidra', 'whisky', 'whiskey', 'vodka', 'ron ', 'gin', 'ginebra', 'aperitivo', 'licor', 'espumante', 'aperol', 'campari', 'tequila', 'trago', 'alcohol']
const esAlcoholica = (item) => {
    const t = `${item.nombre || ''} ${item.subcategoria || ''} ${item.descripcion || ''}`.toLowerCase()
    return ALCOHOL_KEYWORDS.some(k => t.includes(k))
}
// Litros por unidad de una bebida (parsea "2.25L", "750ml", "473cc" del nombre/unidad; default 1L)
const volumenLitros = (item) => {
    const t = `${item.nombre || ''} ${item.unidad || ''}`.toLowerCase()
    let m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|lts|litro|litros)\b/)
    if (m) return parseFloat(m[1].replace(',', '.')) || 1
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/)
    if (m) return (parseFloat(m[1].replace(',', '.')) || 1000) / 1000
    return 1
}

// Clave para agrupar productos "iguales" (mismo nombre, distinto tamaño): saca el volumen del nombre.
const claveProducto = (item) => normalizarTexto((item.nombre || '').replace(/\d+(?:[.,]\d+)?\s*(?:l|lt|lts|litro|litros|ml|cc)\b/gi, ' '))
// Deja un solo producto por nombre (evita "3 aguas distintas"); prefiere mayor volumen (menos unidades), luego menor precio.
const dedupPorNombre = (arr) => {
    const grupos = new Map()
    for (const it of arr) {
        const k = claveProducto(it)
        const prev = grupos.get(k)
        if (!prev) { grupos.set(k, it); continue }
        const vN = volumenLitros(it), vP = volumenLitros(prev)
        if (vN > vP || (vN === vP && precioBase(it) < precioBase(prev))) grupos.set(k, it)
    }
    return [...grupos.values()]
}

// ¿El producto es un pernil (plato principal que se escala por nivel)?
const esPernil = (it) => normalizarTexto(it.nombre || '').includes('pernil')

// Texto de presentación/volumen de una bebida (ej. "2,15 L", "975 ml"), inferido de la
// unidad/descripción. Si el volumen ya está en el nombre, devuelve '' (no duplicar).
const presentacionBebida = (item) => {
    const reVol = /(\d+(?:[.,]\d+)?)\s*(l|lt|lts|litros?|ml|cc)\b/i
    if (reVol.test(item.nombre || '')) return ''
    const m = `${item.unidad || ''} ${item.descripcion || ''}`.match(reVol)
    if (!m) return ''
    const uni = /ml|cc/i.test(m[2]) ? 'ml' : 'L'
    return `${m[1].replace('.', ',')} ${uni}`
}

// Cantidad y subtotal de un ítem del catálogo para cubrir a los invitados:
// - Tortas / productos que rinden N personas → ⌈personas / rinde⌉ unidades (discreto).
// - "Por persona" (catering por plato) → precio × personas.
// - Bebida fija → cantidad por volumen: ⌈personas × 0.7 L / litros_por_unidad⌉.
// - Comida/snack/vajilla fija → una unidad por persona (cubre el cupo).
// - Otros fijos (seguridad, sonido, show, cotillón…) → 1, cubre el evento.
// El alcohol en eventos infantiles/bautismo se calcula solo para ~20% del cupo.
export const cantidadYsubtotal = (item, invitados, opciones = {}) => {
    const base = precioBase(item)
    const inv = Math.max(1, Number(invitados) || 1)
    const cat = item.categoria
    const esBebida = BEBIDA_CATS.includes(cat)
    const esComida = COMIDA_CATS.includes(cat)
    const esVajilla = VAJILLA_CATS.includes(cat)
    const rinde = Number(item.ideal_para_personas) || 0

    const alco = esBebida && esAlcoholica(item)
    const personas = (alco && opciones.alcoholReducido) ? Math.max(1, Math.ceil(inv * 0.2)) : inv

    if (cat === 'tortas' || rinde > 0) {
        const cant = rinde > 0 ? Math.max(1, Math.ceil(personas / rinde)) : 1
        return { cantidad: cant, subtotal: base * cant, personas: null }
    }
    if (item.tipo_precio === 'por_persona') {
        return { cantidad: 1, subtotal: base * personas, personas }
    }
    if (esBebida) {
        const volU = volumenLitros(item)
        const cant = Math.max(1, Math.ceil(personas * CONSUMO_BEBIDA_L / (volU || 1)))
        return { cantidad: cant, subtotal: base * cant, personas: null }
    }
    if (esComida || esVajilla) {
        return { cantidad: personas, subtotal: base * personas, personas: null }
    }
    return { cantidad: 1, subtotal: base, personas: null }
}

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
    comida:   [1, 2, 3, 4],   // se usa cuando NO hay pernil (la comida común garantiza el rubro)
    snack:    [0, 1, 1, 2],   // comida extra (papas, etc.) cuando el pernil es el plato principal
    bebida:   [1, 1, 2, 3],
    vajilla:  [1, 1, 1, 2],
    servicio: [1, 2, 3, 5],
    otro:     [0, 1, 2, 3],
}
// Pernil (plato principal): cobertura del cupo y # de sabores por nivel.
// Económica 40%, Estándar 50%, Plus 75%, Premium 120% repartido en 2 sabores (60% c/u).
const PERNIL_COBERTURA = [0.4, 0.5, 0.75, 1.2]
const PERNIL_SABORES = [1, 1, 1, 2]

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
export const generarPaquetes = (tipo, invitados, fecha, salones, servicios, ubicacion = null, opciones = {}) => {
    const inv = Math.max(1, Number(invitados) || 1)

    let aptos = salones.filter(s => Number(s.aforo) >= inv)
    if (tipo) {
        const conTipo = aptos.filter(s => parsearJSON(s.tipos_evento).includes(tipo))
        if (conTipo.length) aptos = conTipo
    }

    // Cercanía: por coordenadas (radio) o por departamento/localidad elegido.
    // (La ubicación es una restricción fuerte: se aplica ANTES de preferir peloteros.)
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
            const valN = normalizarTexto(ubicacion.valor)
            const enZona = aptos.filter(s => normalizarTexto(s.departamento) === valN || normalizarTexto(s.localidad) === valN)
            if (enZona.length) aptos = enZona
        }
    }

    // Fiesta infantil → mostrar mayormente peloteros (dentro de la zona ya filtrada)
    if (opciones.preferirPeloteros) {
        const pel = aptos.filter(s => (s.tipo_salon || '').toLowerCase().includes('pelotero'))
        if (pel.length) aptos = pel
    }
    if (aptos.length === 0) return []

    // Precio efectivo del salón (ajustado a la fecha) y orden por ese precio → salón monótono
    const precioEfectivo = (s) => fecha
        ? calcularPrecioEvento(precioSalon(s), s.precios_config, fecha, 1).precio
        : precioSalon(s)
    const aptosOrden = aptos.map(s => ({ s, pe: precioEfectivo(s) })).sort((a, b) => a.pe - b.pe)

    // Catálogo separado por grupo, ordenado por precio ASC
    const esProducto = (s) => (s.tipo_item || 'producto') === 'producto'
    const ordenar = (arr) => arr.sort((a, b) => precioBase(a) - precioBase(b))

    // Pernil = plato principal, detectado por NOMBRE en cualquier categoría (a veces está en 'catering').
    const perniles = ordenar(dedupPorNombre(servicios.filter(s => esProducto(s) && esPernil(s))))
    const hayPernil = perniles.length > 0

    // Comida no-pernil (snacks / guarniciones). Si hay pernil se saca el catering genérico
    // (Catering Básico/Premium), porque el pernil cumple ese rol; el pernil NUNCA se saca.
    let comidaResto = servicios.filter(s => esProducto(s) && COMIDA_CATS.includes(s.categoria) && !esPernil(s))
    if (hayPernil) comidaResto = comidaResto.filter(c => c.categoria !== 'catering')
    const snacks = ordenar(dedupPorNombre(comidaResto))
    const PLAN_COMIDA = hayPernil ? PLAN.snack : PLAN.comida          // sin pernil, la comida común garantiza el rubro

    const bebidas = ordenar(dedupPorNombre(servicios.filter(s => esProducto(s) && BEBIDA_CATS.includes(s.categoria))))
    const vajilla = ordenar(dedupPorNombre(servicios.filter(s => esProducto(s) && VAJILLA_CATS.includes(s.categoria))))
    // Otros productos, EXCLUYENDO tortas: son discretas, necesitan requisitos/config → se agregan a mano.
    const otrosProd = ordenar(dedupPorNombre(servicios.filter(s => esProducto(s) && !esPernil(s) && s.categoria !== 'tortas' && !COMIDA_CATS.includes(s.categoria) && !BEBIDA_CATS.includes(s.categoria) && !VAJILLA_CATS.includes(s.categoria))))
    const servs = ordenar(servicios.filter(s => (s.tipo_item || 'producto') === 'servicio'))

    const marcar = (it, cs) => ({ ...it, _cant: cs.cantidad, _sub: cs.subtotal, _personas: cs.personas, _presentacion: BEBIDA_CATS.includes(it.categoria) ? presentacionBebida(it) : '' })
    const conCantidad = (arr) => arr.map(it => marcar(it, cantidadYsubtotal(it, inv, opciones)))

    const nTiers = TIERS_PAQUETE.length
    return TIERS_PAQUETE.map((tier, i) => {
        const esPremium = i === nTiers - 1
        const frac = nTiers > 1 ? i / (nTiers - 1) : 0
        const elegido = aptosOrden[Math.min(aptosOrden.length - 1, Math.round(frac * (aptosOrden.length - 1)))]
        const salon = elegido.s
        const salonPrecio = elegido.pe

        // Pernil (plato principal) escalado por cobertura del nivel; Premium reparte en varios sabores.
        let pernilItems = []
        if (hayPernil) {
            const nSab = Math.min(PERNIL_SABORES[i], perniles.length)
            const factor = PERNIL_COBERTURA[i] / nSab
            pernilItems = perniles.slice(0, nSab).map(p =>
                marcar(p, cantidadYsubtotal(p, Math.max(1, Math.round(inv * factor)), opciones)))
        }

        const snackSel = seleccionar(snacks, PLAN_COMIDA, i, esPremium)
        const bebidaSel = seleccionar(bebidas, PLAN.bebida, i, esPremium)
        const vajillaSel = seleccionar(vajilla, PLAN.vajilla, i, esPremium)
        const otroSel = seleccionar(otrosProd, PLAN.otro, i, esPremium)
        const servSel = seleccionar(servs, PLAN.servicio, i, esPremium)

        const serviciosSel = conCantidad(servSel)
        const productosSel = [...pernilItems, ...conCantidad([...snackSel, ...bebidaSel, ...vajillaSel, ...otroSel])]
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
