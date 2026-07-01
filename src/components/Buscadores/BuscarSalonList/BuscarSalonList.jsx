import React, { useEffect, useState, useMemo } from 'react'
import SalonesList from '../../Lists/SalonesList/SalonesList'
import SalonesFiltros from '../../Filters/SalonesFiltros/SalonesFiltros'
import { getSalones, getSalonesDisponibles } from '../../../services/salonesServices'
import { FiX, FiCheck, FiMapPin, FiUsers, FiMap } from 'react-icons/fi'
import MapaSalonModal from '../../Modals/MapaSalonModal/MapaSalonModal'
import './BuscarSalonList.css'

const parsearJSON = (valor) => {
    if (!valor) return []
    if (Array.isArray(valor)) return valor
    try { return JSON.parse(valor) } catch { return [] }
}

const FILTROS_INICIALES = {
    departamentos: [],
    localidades: [],
    aforoMin: '',
    aforoMax: '',
    servicios: [],
    tiposEvento: [],
    tiposSalon: []
}

const mapaUrl = (salon) => {
    if (salon.latitud && salon.longitud)
        return `https://www.google.com/maps?q=${salon.latitud},${salon.longitud}`
    const query = [salon.nombre, salon.domicilio, salon.localidad].filter(Boolean).join(', ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

const BuscarSalonList = ({ onSelectSalon, fechaFiltro, cupoFiltro }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [salones, setSalones] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState(() => ({
        ...FILTROS_INICIALES,
        aforoMin: cupoFiltro || '',
    }))
    const [salonDetalle, setSalonDetalle] = useState(null)
    const [salonMapa,   setSalonMapa]   = useState(null)

    useEffect(() => {
        const fetchSalones = async () => {
            setLoading(true)
            try {
                const data = fechaFiltro
                    ? await getSalonesDisponibles(fechaFiltro)
                    : await getSalones()
                if (data && Array.isArray(data)) {
                    setSalones(data)
                } else {
                    setError('No se pudieron cargar los salones')
                }
            } catch (err) {
                setError('Error al cargar los salones: ' + err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchSalones()
    }, [fechaFiltro])

    const filteredSalones = useMemo(() => {
        return salones.filter(salon => {
            // Filtro duro por cupo del evento: el salón debe poder albergar al menos
            // tantos invitados como indica el cupo. Nunca se puede superar el aforo del salón.
            if (cupoFiltro && salon.aforo < Number(cupoFiltro)) return false

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
        })
    }, [salones, filters, cupoFiltro])

    const handleSeleccionarDesdeDetalle = () => {
        if (salonDetalle && onSelectSalon) {
            onSelectSalon(salonDetalle)
        }
    }

    const fmtFechaFiltro = fechaFiltro
        ? new Date(fechaFiltro + 'T00:00:00').toLocaleDateString('es-AR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
          })
        : ''

    return (
        <div className='buscar-salon-layout'>
            {fechaFiltro && !loading && (
                <div className='buscar-salon-aviso-fecha'>
                    📅 Mostrando solo salones disponibles el <strong>{fmtFechaFiltro}</strong>
                    {salones.length === 0 && !error && ' — no hay salones disponibles en esa fecha.'}
                </div>
            )}
            {cupoFiltro && !loading && (
                <div className='buscar-salon-aviso-cupo'>
                    <FiUsers size={14}/>
                    Mostrando solo salones con aforo ≥ <strong>{cupoFiltro} personas</strong>
                    {salones.filter(s => s.aforo < Number(cupoFiltro)).length > 0 && (
                        <span className='buscar-salon-aviso-excluidos'>
                            · {salones.filter(s => s.aforo < Number(cupoFiltro)).length} salón/es excluido/s por capacidad insuficiente
                        </span>
                    )}
                </div>
            )}
            <div className='buscar-salon-inner'>
            {!loading && !error && (
                <SalonesFiltros
                    salones={salones}
                    filters={filters}
                    onFiltersChange={setFilters}
                    cupoFiltro={cupoFiltro}
                />
            )}
            <div className='buscar-salon-contenido'>
                <input
                    type="text"
                    placeholder='Ingrese Nombre de Salón...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='buscar-salon-input'
                />
                <div className='buscar-salon-lista-wrapper'>
                    <SalonesList
                        searchTerm={searchTerm}
                        onSelectSalon={onSelectSalon}
                        onVerDetalle={setSalonDetalle}
                        salonesExternos={filteredSalones}
                        loadingExterno={loading}
                        errorExterno={error}
                    />
                </div>
            </div>
            </div>{/* /buscar-salon-inner */}

            {/* Modal detalle del salón */}
            {salonDetalle && (
                <div className='salon-detalle-overlay' onClick={() => setSalonDetalle(null)}>
                    <div className='salon-detalle-modal' onClick={e => e.stopPropagation()}>
                        <div className='salon-detalle-header'>
                            <h2>{salonDetalle.nombre}</h2>
                            <button className='salon-detalle-cerrar' onClick={() => setSalonDetalle(null)}>
                                <FiX size={20}/>
                            </button>
                        </div>

                        {salonDetalle.imagen && (
                            <img src={salonDetalle.imagen} alt={salonDetalle.nombre} className='salon-detalle-img'/>
                        )}

                        <div className='salon-detalle-body'>
                            <div className='salon-detalle-info'>
                                <span><FiMapPin size={14}/> {salonDetalle.domicilio}{salonDetalle.localidad ? `, ${salonDetalle.localidad}` : ''}</span>
                                <span><FiUsers size={14}/> Aforo: {salonDetalle.aforo} personas</span>
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
                                Volver
                            </button>
                            <button
                                className='salon-detalle-mapa'
                                onClick={() => setSalonMapa(salonDetalle)}
                            >
                                <FiMap size={15}/> Ver en mapa
                            </button>
                            <button className='salon-detalle-seleccionar' onClick={handleSeleccionarDesdeDetalle}>
                                <FiCheck size={15}/> Seleccionar salón
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {salonMapa && (
                <MapaSalonModal salon={salonMapa} onClose={() => setSalonMapa(null)} />
            )}
        </div>
    )
}

export default BuscarSalonList
