import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SalonCard from '../../Cards/SalonCard/SalonCard'
import SalonesFiltros from '../../Filters/SalonesFiltros/SalonesFiltros'
import MapaSalonModal from '../../Modals/MapaSalonModal/MapaSalonModal'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { getSalones } from '../../../services/salonesServices'
import { FiX, FiMapPin, FiUsers, FiMap, FiCalendar, FiColumns, FiCheck, FiSliders, FiTag, FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useCompare } from '../../../Contexts/CompareContextProvider'
import CompareBar from '../../CompareBar/CompareBar'
import '../../Lists/Lists.css'
import './SalonesScreen.css'
import '../../Buscadores/BuscarSalonList/BuscarSalonList.css'

const parsearJSON = (valor) => {
    if (!valor) return []
    if (Array.isArray(valor)) return valor
    try { return JSON.parse(valor) } catch { return [] }
}

const FILTROS_INICIALES = { departamentos: [], localidades: [], aforoMin: '', aforoMax: '', servicios: [], tiposEvento: [], tiposSalon: [] }
const ESENCIALES_INICIALES = { tipo_evento: '', invitados: '', fecha: '' }

const SalonesScreen = () => {
    const navigate = useNavigate()
    const { agregarSalonComparar, quitarSalonComparar, enSalonesComparar } = useCompare()
    const [salones, setSalones] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState(FILTROS_INICIALES)
    const [esenciales, setEsenciales] = useState(ESENCIALES_INICIALES)
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
    const [salonDetalle, setSalonDetalle] = useState(null)
    const [salonMapa, setSalonMapa] = useState(null)
    const destacadosRef = useRef(null)

    useEffect(() => {
        const fetchSalones = async () => {
            setLoading(true)
            try {
                const data = await getSalones()
                if (data && Array.isArray(data)) {
                    setSalones(data)
                } else {
                    setError('No se pudieron cargar los salones')
                }
            } catch (err) {
                console.error('Error al obtener salones:', err)
                setError('Error al cargar los salones: ' + err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchSalones()
    }, [])

    // Tipos de evento disponibles (unión de los que aceptan los salones)
    const tiposEventoUnicos = [...new Set(salones.flatMap(s => parsearJSON(s.tipos_evento)))].filter(Boolean).sort()

    // Salones destacados: con imagen, ordenados por aforo (los más grandes primero)
    const destacados = [...salones]
        .filter(s => s.imagen)
        .sort((a, b) => (Number(b.aforo) || 0) - (Number(a.aforo) || 0))
        .slice(0, 8)

    // Cantidad de filtros detallados activos (para el badge del botón)
    const filtrosActivos =
        filters.departamentos.length + filters.localidades.length + filters.servicios.length +
        filters.tiposEvento.length + (filters.tiposSalon || []).length +
        (filters.aforoMin !== '' ? 1 : 0) + (filters.aforoMax !== '' ? 1 : 0)

    const setEsencial = (campo, valor) => setEsenciales(prev => ({ ...prev, [campo]: valor }))

    const pasaEsenciales = (salon) => {
        if (esenciales.invitados !== '' && Number(salon.aforo) < Number(esenciales.invitados)) return false
        if (esenciales.tipo_evento && !parsearJSON(salon.tipos_evento).includes(esenciales.tipo_evento)) return false
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

    // Datos que se arrastran al elegir un salón (prefill del form de crear evento)
    const irAReservar = (salon) => {
        setSalonDetalle(null)
        navigate('/eventos/new', {
            state: {
                salon,
                tipo_evento: esenciales.tipo_evento || undefined,
                cupo: esenciales.invitados || undefined,
                fecha: esenciales.fecha || undefined,
            },
        })
    }

    const scrollDestacados = (dir) => {
        if (destacadosRef.current) destacadosRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' })
    }

    let mainContent
    if (loading) {
        mainContent = <div className='salones-loading'><TailSpin /> Cargando salones...</div>
    } else if (error) {
        mainContent = <p className='salones-error'>{error}</p>
    } else if (filteredSalones.length === 0) {
        mainContent = <p className='salones-sin-resultados'>No se encontraron salones con estos filtros.</p>
    } else {
        mainContent = (
            <div className='list-grid'>
                {filteredSalones.map(salon => (
                    <SalonCard key={salon.id_bodega} {...salon} onVerDetalle={setSalonDetalle} />
                ))}
            </div>
        )
    }

    return (
        <div className='salones-screen'>
            {/* ── Aside: esenciales del evento (también filtran) ── */}
            <aside className='sal-esenciales'>
                <div className='sal-esenciales-head'>
                    <h2>Tu evento</h2>
                    <p>Con estos datos te mostramos los salones ideales.</p>
                </div>

                <div className='sal-esencial-campo'>
                    <label htmlFor='es-tipo'><FiTag size={13} /> Tipo de evento</label>
                    <select id='es-tipo' value={esenciales.tipo_evento} onChange={e => setEsencial('tipo_evento', e.target.value)}>
                        <option value=''>Todos</option>
                        {tiposEventoUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className='sal-esencial-campo'>
                    <label htmlFor='es-invitados'><FiUsers size={13} /> Cantidad de invitados</label>
                    <input id='es-invitados' type='number' min='1' placeholder='Ej: 80'
                        value={esenciales.invitados} onChange={e => setEsencial('invitados', e.target.value)} />
                </div>

                <div className='sal-esencial-campo'>
                    <label htmlFor='es-fecha'><FiCalendar size={13} /> Fecha</label>
                    <input id='es-fecha' type='date' value={esenciales.fecha} onChange={e => setEsencial('fecha', e.target.value)} />
                </div>

                {(esenciales.tipo_evento || esenciales.invitados || esenciales.fecha) && (
                    <button className='sal-esenciales-limpiar' onClick={() => setEsenciales(ESENCIALES_INICIALES)}>
                        Limpiar
                    </button>
                )}
            </aside>

            {/* ── Main: destacados + grilla ── */}
            <main className='salones-main'>
                <div className='salones-main-header'>
                    <div>
                        <h1 className='salones-main-titulo'>Salones</h1>
                        {!loading && !error && (
                            <span className='salones-contador'>
                                {filteredSalones.length} salón{filteredSalones.length !== 1 ? 'es' : ''} encontrado{filteredSalones.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Filtros detallados: botón + panel desplegable arriba a la derecha */}
                    <div className='sal-filtros-wrap'>
                        <button
                            className={`sal-filtros-btn ${filtrosAbiertos ? 'activo' : ''}`}
                            onClick={() => setFiltrosAbiertos(v => !v)}
                        >
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
                                        cupoFiltro={esenciales.invitados || null}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Carrusel de salones destacados */}
                {!loading && !error && destacados.length > 0 && (
                    <section className='sal-destacados'>
                        <div className='sal-destacados-head'>
                            <h3><FiStar size={15} /> Salones destacados</h3>
                            <div className='sal-destacados-nav'>
                                <button onClick={() => scrollDestacados(-1)} aria-label='Anterior'><FiChevronLeft size={18} /></button>
                                <button onClick={() => scrollDestacados(1)} aria-label='Siguiente'><FiChevronRight size={18} /></button>
                            </div>
                        </div>
                        <div className='sal-destacados-track' ref={destacadosRef}>
                            {destacados.map(salon => (
                                <div className='sal-destacado-item' key={salon.id_bodega}>
                                    <SalonCard {...salon} onVerDetalle={setSalonDetalle} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {mainContent}
            </main>

            {salonDetalle && (
                <div className='salon-detalle-overlay' onClick={() => setSalonDetalle(null)}>
                    <div className='salon-detalle-modal' onClick={e => e.stopPropagation()}>
                        <div className='salon-detalle-header'>
                            <h2>{salonDetalle.nombre}</h2>
                            <button className='salon-detalle-cerrar' onClick={() => setSalonDetalle(null)}>
                                <FiX size={20} />
                            </button>
                        </div>

                        {salonDetalle.imagen && (
                            <img src={salonDetalle.imagen} alt={salonDetalle.nombre} className='salon-detalle-img' />
                        )}

                        <div className='salon-detalle-body'>
                            <div className='salon-detalle-info'>
                                <span><FiMapPin size={14} /> {salonDetalle.domicilio}{salonDetalle.localidad ? `, ${salonDetalle.localidad}` : ''}</span>
                                <span><FiUsers size={14} /> Aforo: {salonDetalle.aforo} personas</span>
                                {(salonDetalle.precio_publico ?? salonDetalle.precio_alquiler) && (
                                    <span className='salon-detalle-precio'>
                                        ${Number(salonDetalle.precio_publico ?? salonDetalle.precio_alquiler).toLocaleString('es-AR')}<small>/evento</small>
                                    </span>
                                )}
                            </div>

                            {parsearJSON(salonDetalle.servicios_incluidos).length > 0 && (
                                <div className='salon-detalle-seccion'>
                                    <h4>Servicios incluidos</h4>
                                    <div className='salon-detalle-tags'>
                                        {parsearJSON(salonDetalle.servicios_incluidos).map((s, i) => (
                                            <span key={i} className='salon-tag salon-tag--servicio'>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {parsearJSON(salonDetalle.tipos_evento).length > 0 && (
                                <div className='salon-detalle-seccion'>
                                    <h4>Ideal para</h4>
                                    <div className='salon-detalle-tags'>
                                        {parsearJSON(salonDetalle.tipos_evento).map((t, i) => (
                                            <span key={i} className='salon-tag salon-tag--tipo'>{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className='salon-detalle-footer'>
                            <button className='salon-detalle-cancelar' onClick={() => setSalonDetalle(null)}>
                                Cerrar
                            </button>
                            <button className='salon-detalle-mapa' onClick={() => setSalonMapa(salonDetalle)}>
                                <FiMap size={15} /> Ver en mapa
                            </button>
                            <button
                                className={`salon-detalle-comparar ${enSalonesComparar(salonDetalle.id_bodega) ? 'salon-detalle-comparar--activo' : ''}`}
                                onClick={() => {
                                    if (enSalonesComparar(salonDetalle.id_bodega)) quitarSalonComparar(salonDetalle.id_bodega)
                                    else agregarSalonComparar(salonDetalle)
                                }}
                            >
                                {enSalonesComparar(salonDetalle.id_bodega)
                                    ? <><FiCheck size={14} /> En comparación</>
                                    : <><FiColumns size={14} /> Comparar</>
                                }
                            </button>
                            <button className='salon-detalle-seleccionar' onClick={() => irAReservar(salonDetalle)}>
                                <FiCalendar size={15} /> Reservar salón
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {salonMapa && (
                <MapaSalonModal salon={salonMapa} onClose={() => setSalonMapa(null)} />
            )}

            <CompareBar tipo='salones' />
        </div>
    )
}

export default SalonesScreen
