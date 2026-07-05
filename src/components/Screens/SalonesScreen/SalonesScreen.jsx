import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SalonCard from '../../Cards/SalonCard/SalonCard'
import SalonesFiltros from '../../Filters/SalonesFiltros/SalonesFiltros'
import MapaSalonModal from '../../Modals/MapaSalonModal/MapaSalonModal'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { getSalones } from '../../../services/salonesServices'
import { FiX, FiMapPin, FiUsers, FiMap, FiCalendar, FiColumns, FiCheck } from 'react-icons/fi'
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

const mapaUrl = (salon) => {
    if (salon.latitud && salon.longitud)
        return `https://www.google.com/maps?q=${salon.latitud},${salon.longitud}`
    const query = [salon.nombre, salon.domicilio, salon.localidad].filter(Boolean).join(', ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

const SalonesScreen = () => {
    const navigate = useNavigate()
    const { agregarSalonComparar, quitarSalonComparar, enSalonesComparar } = useCompare()
    const [salones, setSalones] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState(FILTROS_INICIALES)
    const [salonDetalle, setSalonDetalle] = useState(null)
    const [salonMapa, setSalonMapa] = useState(null)

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

    const filteredSalones = salones.filter(salon => {
        if (filters.departamentos.length > 0 && !filters.departamentos.includes(salon.departamento)) {
            return false
        }
        if (filters.localidades.length > 0 && !filters.localidades.includes(salon.localidad)) {
            return false
        }
        if (filters.aforoMin !== '' && salon.aforo < Number(filters.aforoMin)) {
            return false
        }
        if (filters.aforoMax !== '' && salon.aforo > Number(filters.aforoMax)) {
            return false
        }
        if (filters.servicios.length > 0) {
            const serviciosSalon = parsearJSON(salon.servicios_incluidos)
            const tieneAlguno = filters.servicios.some(s => serviciosSalon.includes(s))
            if (!tieneAlguno) return false
        }
        if (filters.tiposEvento.length > 0) {
            const tiposSalon = parsearJSON(salon.tipos_evento)
            const tieneAlguno = filters.tiposEvento.some(t => tiposSalon.includes(t))
            if (!tieneAlguno) return false
        }
        if ((filters.tiposSalon || []).length > 0 && !filters.tiposSalon.includes(salon.tipo_salon)) {
            return false
        }
        return true
    })

    let mainContent

    if (loading) {
        mainContent = (
            <div className='salones-loading'>
                <TailSpin /> Cargando salones...
            </div>
        )
    } else if (error) {
        mainContent = <p className='salones-error'>{error}</p>
    } else if (filteredSalones.length === 0) {
        mainContent = (
            <p className='salones-sin-resultados'>
                No se encontraron salones con los filtros seleccionados.
            </p>
        )
    } else {
        mainContent = (
            <div className='list-grid'>
                {filteredSalones.map(salon => (
                    <SalonCard
                        key={salon.id_bodega}
                        {...salon}
                        onVerDetalle={setSalonDetalle}
                    />
                ))}
            </div>
        )
    }

    return (
        <div className='salones-screen'>
            <SalonesFiltros
                salones={salones}
                filters={filters}
                onFiltersChange={setFilters}
            />
            <main className='salones-main'>
                <div className='salones-main-header'>
                    <h1 className='salones-main-titulo'>Salones</h1>
                    {!loading && !error && (
                        <span className='salones-contador'>
                            {filteredSalones.length} salón{filteredSalones.length !== 1 ? 'es' : ''} encontrado{filteredSalones.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
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
                            <button
                                className='salon-detalle-mapa'
                                onClick={() => setSalonMapa(salonDetalle)}
                            >
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
                            <button
                                className='salon-detalle-seleccionar'
                                onClick={() => {
                                    setSalonDetalle(null)
                                    navigate('/eventos/new', { state: { salon: salonDetalle } })
                                }}
                            >
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