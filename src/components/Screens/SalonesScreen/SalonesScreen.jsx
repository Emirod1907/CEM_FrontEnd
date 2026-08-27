import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SalonesFiltros from '../../Filters/SalonesFiltros/SalonesFiltros'
import SalonesMapaInline from './SalonesMapaInline'
import DestacadosCarousel from './DestacadosCarousel'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { getSalones, getDisponibilidadSalon } from '../../../services/salonesServices'
import { getValoracionesSalon } from '../../../services/valoracionServices'
import { calcularPrecioEvento, tipoDia } from '../../../utils/preciosUtils'
import { FiMapPin, FiUsers, FiCalendar, FiSliders, FiTag, FiSearch, FiList, FiMap } from 'react-icons/fi'
import CompareBar from '../../CompareBar/CompareBar'
import '../../Lists/Lists.css'
import './SalonesScreen.css'
import '../../Buscadores/BuscarSalonList/BuscarSalonList.css'

const parsearJSON = (valor) => {
    if (!valor) return []
    if (Array.isArray(valor)) return valor
    try { return JSON.parse(valor) } catch { return [] }
}

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fechaCorta = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
const precioDe = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0

// Máscara dd/mm/aaaa (formato Argentina) y conversión a ISO para los cálculos.
const formatFecha = (value) => {
    const d = value.replace(/\D/g, '').slice(0, 8)
    let out = d.slice(0, 2)
    if (d.length > 2) out += '/' + d.slice(2, 4)
    if (d.length > 4) out += '/' + d.slice(4, 8)
    return out
}
const fechaAISO = (s) => {
    const m = (s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m) return ''
    const [, dd, mm, yyyy] = m
    const iso = `${yyyy}-${mm}-${dd}`
    const dt = new Date(iso + 'T00:00:00')
    if (isNaN(dt.getTime()) || dt.getMonth() + 1 !== Number(mm) || dt.getDate() !== Number(dd)) return ''
    return iso
}

const FILTROS_INICIALES = { departamentos: [], localidades: [], aforoMin: '', aforoMax: '', servicios: [], tiposEvento: [], tiposSalon: [] }
const ESENCIALES_INICIALES = { tipo_evento: '', invitados: '', fecha: '' }
const CRITERIOS_INICIALES = { tipo_evento: '', invitados: '', fecha: '', rango: null }

const SalonesScreen = () => {
    const navigate = useNavigate()
    const [salones, setSalones] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState(FILTROS_INICIALES)
    const [esenciales, setEsenciales] = useState(ESENCIALES_INICIALES)
    const [porRango, setPorRango] = useState(false)
    const [fechaHasta, setFechaHasta] = useState('')
    const [criterios, setCriterios] = useState(CRITERIOS_INICIALES)
    const [dispCache, setDispCache] = useState({})
    const [cargandoDisp, setCargandoDisp] = useState(false)
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
    const [vista, setVista] = useState('lista')   // 'lista' | 'mapa'
    const [valoraciones, setValoraciones] = useState({})  // id -> { promedio, total }
    const [orden, setOrden] = useState('valoracion')       // valoracion | precio_asc | precio_desc | aforo

    useEffect(() => {
        const fetchSalones = async () => {
            setLoading(true)
            try {
                const data = await getSalones()
                if (data && Array.isArray(data)) setSalones(data)
                else setError('No se pudieron cargar los salones')
            } catch (err) {
                console.error('Error al obtener salones:', err)
                setError('Error al cargar los salones: ' + err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchSalones()
    }, [])

    // Valoraciones (promedio+total) por salón, para ordenar por valoración
    useEffect(() => {
        if (salones.length === 0) return
        let cancel = false
        Promise.all(salones.map(s =>
            getValoracionesSalon(s.id_bodega).then(v => [s.id_bodega, v]).catch(() => [s.id_bodega, null])
        )).then(entries => { if (!cancel) setValoraciones(Object.fromEntries(entries)) })
        return () => { cancel = true }
    }, [salones])

    const ratingDe = (s) => Number(valoraciones[s.id_bodega]?.promedio) || 0
    const totalVal = (s) => Number(valoraciones[s.id_bodega]?.total) || 0

    // Precio del salón ajustado a la fecha buscada (fin de semana / feriado)
    const precioParaFecha = (salon) => {
        const base = precioDe(salon)
        if (!criterios.fecha) return { precio: base, tipo: 'comun', label: null, color: null }
        const info = calcularPrecioEvento(base, salon.precios_config, criterios.fecha, 1)
        return { precio: info.precio, tipo: info.tipo, label: info.label, color: info.color }
    }

    const ordenarLista = (list) => {
        const arr = [...list]
        if (orden === 'precio_asc') return arr.sort((a, b) => precioParaFecha(a).precio - precioParaFecha(b).precio)
        if (orden === 'precio_desc') return arr.sort((a, b) => precioParaFecha(b).precio - precioParaFecha(a).precio)
        if (orden === 'aforo') return arr.sort((a, b) => (Number(b.aforo) || 0) - (Number(a.aforo) || 0))
        return arr.sort((a, b) => ratingDe(b) - ratingDe(a)) // valoración (default)
    }

    const tiposEventoUnicos = [...new Set(salones.flatMap(s => parsearJSON(s.tipos_evento)))].filter(Boolean).sort()

    const destacados = [...salones]
        .filter(s => s.imagen)
        .sort((a, b) => (Number(b.aforo) || 0) - (Number(a.aforo) || 0))
        .slice(0, 8)

    const filtrosActivos =
        filters.departamentos.length + filters.localidades.length + filters.servicios.length +
        filters.tiposEvento.length + (filters.tiposSalon || []).length +
        (filters.aforoMin !== '' ? 1 : 0) + (filters.aforoMax !== '' ? 1 : 0)

    const setEsencial = (campo, valor) => setEsenciales(prev => ({ ...prev, [campo]: valor }))

    const buscarSalon = () => {
        const tipo = (esenciales.tipo_evento || '').trim()
        const desde = fechaAISO(esenciales.fecha)
        const hasta = fechaAISO(fechaHasta)
        const rango = (porRango && desde && hasta && hasta >= desde) ? { desde, hasta } : null
        setCriterios({ tipo_evento: tipo, invitados: esenciales.invitados, fecha: desde, rango })
        setFilters(prev => ({ ...prev, tiposEvento: tipo ? [tipo] : [] }))
    }

    const limpiarTodo = () => {
        setEsenciales(ESENCIALES_INICIALES)
        setPorRango(false)
        setFechaHasta('')
        setCriterios(CRITERIOS_INICIALES)
        setFilters(prev => ({ ...prev, tiposEvento: [] }))
    }

    const hayInput = esenciales.tipo_evento || esenciales.invitados || esenciales.fecha || porRango
    const hayCriterios = criterios.tipo_evento || criterios.invitados || criterios.fecha || criterios.rango

    const pasaEsenciales = (salon) => {
        if (criterios.invitados !== '' && Number(salon.aforo) < Number(criterios.invitados)) return false
        return true
    }

    const pasaFiltros = (salon) => {
        if (filters.departamentos.length > 0 && !filters.departamentos.includes(salon.departamento)) return false
        if (filters.localidades.length > 0 && !filters.localidades.includes(salon.localidad)) return false
        if (filters.aforoMin !== '' && salon.aforo < Number(filters.aforoMin)) return false
        if (filters.aforoMax !== '' && salon.aforo > Number(filters.aforoMax)) return false
        if (filters.servicios.length > 0) {
            const serviciosSalon = parsearJSON(salon.servicios_incluidos)
            if (!filters.servicios.some(s => serviciosSalon.includes(s))) return false
        }
        if (filters.tiposEvento.length > 0) {
            const tiposSalon = parsearJSON(salon.tipos_evento)
            if (!filters.tiposEvento.some(t => tiposSalon.includes(t))) return false
        }
        if ((filters.tiposSalon || []).length > 0 && !filters.tiposSalon.includes(salon.tipo_salon)) return false
        return true
    }

    const filteredSalones = salones.filter(s => pasaEsenciales(s) && pasaFiltros(s))

    // ── Modo rango de fechas ──
    const rangoValido = !!criterios.rango
    const idsFiltradosKey = filteredSalones.map(s => s.id_bodega).join(',')

    useEffect(() => {
        if (!rangoValido) return
        const faltantes = filteredSalones.filter(s => !(s.id_bodega in dispCache))
        if (faltantes.length === 0) return
        let cancelado = false
        setCargandoDisp(true)
        Promise.all(faltantes.map(s =>
            getDisponibilidadSalon(s.id_bodega).then(fechas => [s.id_bodega, (fechas || []).map(f => String(f).slice(0, 10))])
        )).then(entradas => {
            if (cancelado) return
            setDispCache(prev => {
                const n = { ...prev }
                entradas.forEach(([id, f]) => { n[id] = f })
                return n
            })
        }).finally(() => { if (!cancelado) setCargandoDisp(false) })
        return () => { cancelado = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangoValido, criterios.rango, idsFiltradosKey])

    const fechasDisponibles = (id) => {
        if (!criterios.rango) return []
        const reservadas = new Set(dispCache[id] || [])
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
        const d = new Date(criterios.rango.desde + 'T00:00:00')
        const fin = new Date(criterios.rango.hasta + 'T00:00:00')
        const out = []
        let guard = 0
        while (d <= fin && guard < 400) {
            guard++
            const iso = isoLocal(d)
            if (d >= hoy && !reservadas.has(iso)) out.push(iso)
            d.setDate(d.getDate() + 1)
        }
        return out
    }

    const resultadosRango = rangoValido
        ? filteredSalones
            .map(s => ({ salon: s, fechas: fechasDisponibles(s.id_bodega) }))
            .filter(r => r.fechas.length > 0)
            .sort((a, b) => precioDe(a.salon) - precioDe(b.salon))
        : []

    const verSalon = (salon) => navigate(`/salones/${salon.id_bodega}`, { state: { salon, criterios } })

    const irAReservar = (salon, fecha) => {
        navigate('/eventos/new', {
            state: {
                salon,
                tipo_evento: criterios.tipo_evento || esenciales.tipo_evento || undefined,
                cupo: criterios.invitados || esenciales.invitados || undefined,
                fecha: fecha || criterios.fecha || fechaAISO(esenciales.fecha) || undefined,
            },
        })
    }

    const salonesParaMapa = rangoValido ? resultadosRango.map(r => r.salon) : filteredSalones
    const listaOrdenada = ordenarLista(filteredSalones)

    const estrellas = (s) => {
        const t = totalVal(s)
        if (!t) return <span className='sal-fila-sinrating'>Sin valoraciones</span>
        return <span className='sal-fila-estrellas'>⭐ {ratingDe(s).toFixed(1)} <small>({t})</small></span>
    }

    // ── Contenido principal (vista lista) ──
    let mainContent
    if (loading) {
        mainContent = <div className='salones-loading'><TailSpin /> Cargando salones...</div>
    } else if (error) {
        mainContent = <p className='salones-error'>{error}</p>
    } else if (rangoValido) {
        mainContent = (
            <div className='sal-rango-lista'>
                {cargandoDisp && <div className='salones-loading'><TailSpin /> Buscando fechas disponibles...</div>}
                {!cargandoDisp && resultadosRango.length === 0 && (
                    <p className='salones-sin-resultados'>Ningún salón con fechas libres entre {fechaCorta(criterios.rango.desde)} y {fechaCorta(criterios.rango.hasta)}.</p>
                )}
                {!cargandoDisp && resultadosRango.map(({ salon, fechas }, i) => (
                    <div className={`sal-rango-row ${i === 0 ? 'sal-rango-row--barato' : ''}`} key={salon.id_bodega}>
                        {salon.imagen && <img src={salon.imagen} alt={salon.nombre} className='sal-rango-img' />}
                        <div className='sal-rango-info'>
                            <div className='sal-rango-top'>
                                <span className='sal-rango-nombre'>
                                    {i === 0 && <span className='sal-rango-badge'>Más barato</span>}
                                    {salon.nombre}
                                </span>
                                <span className='sal-rango-precio'>${precioDe(salon).toLocaleString('es-AR')}<small>/evento</small></span>
                            </div>
                            <span className='sal-rango-loc'><FiMapPin size={12} /> {salon.localidad || salon.domicilio} · aforo {salon.aforo}</span>
                            <div className='sal-rango-fechas'>
                                <span className='sal-rango-fechas-label'>{fechas.length} fecha{fechas.length !== 1 ? 's' : ''} libre{fechas.length !== 1 ? 's' : ''}:</span>
                                {fechas.slice(0, 6).map(f => (
                                    <button key={f} className='sal-rango-fecha' onClick={() => irAReservar(salon, f)} title={`Reservar el ${fechaCorta(f)}`}>
                                        {fechaCorta(f)}
                                    </button>
                                ))}
                                {fechas.length > 6 && <span className='sal-rango-mas'>+{fechas.length - 6}</span>}
                            </div>
                        </div>
                        <button className='sal-rango-ver' onClick={() => verSalon(salon)}>Ver</button>
                    </div>
                ))}
            </div>
        )
    } else if (filteredSalones.length === 0) {
        mainContent = <p className='salones-sin-resultados'>No se encontraron salones con estos criterios.</p>
    } else {
        mainContent = (
            <>
                <div className='sal-orden-row'>
                    <span className='sal-orden-label'>Ordenar por</span>
                    <select value={orden} onChange={e => setOrden(e.target.value)}>
                        <option value='valoracion'>Valoración</option>
                        <option value='precio_asc'>Precio: menor a mayor</option>
                        <option value='precio_desc'>Precio: mayor a menor</option>
                        <option value='aforo'>Aforo (mayor)</option>
                    </select>
                </div>
                <div className='sal-lista'>
                    {listaOrdenada.map(salon => (
                        <div className='sal-fila' key={salon.id_bodega}>
                            {salon.imagen && <img src={salon.imagen} alt={salon.nombre} className='sal-fila-img' loading='lazy' />}
                            <div className='sal-fila-info'>
                                <div className='sal-fila-top'>
                                    <span className='sal-fila-nombre'>
                                        {salon.nombre}
                                        {salon.tipo_salon && <span className='sal-fila-tipo'>{salon.tipo_salon}</span>}
                                    </span>
                                    {(() => {
                                        const p = precioParaFecha(salon)
                                        return (
                                            <span className='sal-fila-precio'>
                                                ${p.precio.toLocaleString('es-AR')}<small>/evento</small>
                                                {p.tipo !== 'comun' && <span className='sal-fila-diabadge' style={{ color: p.color, borderColor: p.color }}>{p.label}</span>}
                                            </span>
                                        )
                                    })()}
                                </div>
                                <span className='sal-fila-loc'><FiMapPin size={12} /> {salon.localidad || salon.domicilio} · aforo {salon.aforo}</span>
                                {estrellas(salon)}
                            </div>
                            <div className='sal-fila-btns'>
                                <button className='sal-fila-ver' onClick={() => verSalon(salon)}>Ver</button>
                                <button className='sal-fila-reservar' onClick={() => irAReservar(salon)}>Reservar</button>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )
    }

    const contador = rangoValido ? resultadosRango.length : filteredSalones.length

    return (
        <div className='salones-screen'>
            {/* ── Aside: esenciales del evento + botón Buscar ── */}
            <aside className='sal-esenciales'>
                <div className='sal-esenciales-head'>
                    <h2>Tu evento</h2>
                    <p>Cargá los datos y tocá <strong>Buscar salón</strong> para ver los ideales.</p>
                </div>

                <div className='sal-esencial-campo'>
                    <label htmlFor='es-tipo'><FiTag size={13} /> Tipo de evento</label>
                    <input id='es-tipo' list='sal-tipos-evento' autoComplete='off'
                        placeholder='Ej: Cumpleaños, Boda, Corporativo...'
                        value={esenciales.tipo_evento} onChange={e => setEsencial('tipo_evento', e.target.value)} />
                    <datalist id='sal-tipos-evento'>
                        {tiposEventoUnicos.map(t => <option key={t} value={t} />)}
                    </datalist>
                </div>

                <div className='sal-esencial-campo'>
                    <label htmlFor='es-invitados'><FiUsers size={13} /> Cantidad de invitados</label>
                    <input id='es-invitados' type='number' min='1' placeholder='Ej: 80'
                        value={esenciales.invitados} onChange={e => setEsencial('invitados', e.target.value)} />
                </div>

                <div className='sal-esencial-campo'>
                    <label htmlFor='es-fecha'><FiCalendar size={13} /> {porRango ? 'Fecha desde' : 'Fecha'}</label>
                    <input id='es-fecha' type='text' inputMode='numeric' placeholder='dd/mm/aaaa' maxLength={10}
                        value={esenciales.fecha} onChange={e => setEsencial('fecha', formatFecha(e.target.value))} />
                    {(() => {
                        const iso = fechaAISO(esenciales.fecha)
                        if (!iso) return null
                        const t = tipoDia(iso)
                        if (t === 'comun') return null
                        return <p className='sal-promo-aviso'>🎉 ¡Precio promocional {t === 'fin_semana' ? 'fin de semana' : 'de feriado'}!</p>
                    })()}
                </div>

                <label className='sal-rango-check'>
                    <input type='checkbox' checked={porRango} onChange={e => setPorRango(e.target.checked)} />
                    <span>Buscar por rango de fechas</span>
                </label>

                {porRango && (
                    <>
                        <div className='sal-esencial-campo'>
                            <label htmlFor='es-hasta'><FiCalendar size={13} /> Fecha hasta</label>
                            <input id='es-hasta' type='text' inputMode='numeric' placeholder='dd/mm/aaaa' maxLength={10}
                                value={fechaHasta} onChange={e => setFechaHasta(formatFecha(e.target.value))} />
                        </div>
                        <p className='sal-rango-hint'>Te mostramos los salones <strong>más baratos</strong> con sus <strong>fechas libres</strong> en el rango.</p>
                    </>
                )}

                <button className='sal-buscar-btn' onClick={buscarSalon} disabled={!hayInput}>
                    <FiSearch size={16} /> Buscar salón
                </button>

                {(hayCriterios || hayInput) && (
                    <button className='sal-esenciales-limpiar' onClick={limpiarTodo}>Limpiar</button>
                )}
            </aside>

            {/* ── Main ── */}
            <main className='salones-main'>
                <div className='salones-main-header'>
                    <div>
                        <h1 className='salones-main-titulo'>Salones</h1>
                        {!loading && !error && (
                            <span className='salones-contador'>
                                {contador} salón{contador !== 1 ? 'es' : ''} {rangoValido ? 'con fecha libre' : 'encontrado' + (contador !== 1 ? 's' : '')}
                            </span>
                        )}
                    </div>

                    <div className='sal-header-acciones'>
                        <div className='sal-vista-toggle'>
                            <button className={vista === 'lista' ? 'activo' : ''} onClick={() => setVista('lista')}>
                                <FiList size={15} /> Lista
                            </button>
                            <button className={vista === 'mapa' ? 'activo' : ''} onClick={() => setVista('mapa')}>
                                <FiMap size={15} /> Mapa
                            </button>
                        </div>

                        <div className='sal-filtros-wrap'>
                            <button className={`sal-filtros-btn ${filtrosAbiertos ? 'activo' : ''}`} onClick={() => setFiltrosAbiertos(v => !v)}>
                                <FiSliders size={16} /> Filtros
                                {filtrosActivos > 0 && <span className='sal-filtros-badge'>{filtrosActivos}</span>}
                            </button>
                            {filtrosAbiertos && (
                                <>
                                    <div className='sal-filtros-backdrop' onClick={() => setFiltrosAbiertos(false)} />
                                    <div className='sal-filtros-dropdown'>
                                        <SalonesFiltros
                                            salones={salones}
                                            filters={filters}
                                            onFiltersChange={setFilters}
                                            cupoFiltro={criterios.invitados || null}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {vista === 'mapa' ? (
                    !loading && !error
                        ? <SalonesMapaInline salones={salonesParaMapa} onVer={verSalon} onReservar={(s) => irAReservar(s)} fecha={criterios.fecha} />
                        : (loading ? <div className='salones-loading'><TailSpin /> Cargando salones...</div> : <p className='salones-error'>{error}</p>)
                ) : (
                    <>
                        {!loading && !error && !rangoValido && (
                            <DestacadosCarousel salones={destacados} onVer={verSalon} />
                        )}
                        {mainContent}
                    </>
                )}
            </main>

            <CompareBar tipo='salones' />
        </div>
    )
}

export default SalonesScreen
