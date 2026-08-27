import React, { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { getSalones } from '../../../services/salonesServices'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { FiArrowLeft, FiMapPin, FiUsers, FiCalendar, FiExternalLink } from 'react-icons/fi'
import './SalonDetailScreen.css'

const LIBRARIES = ['places']
const MAP_STYLE = { width: '100%', height: '100%' }

const parsearJSON = (valor) => {
    if (!valor) return []
    if (Array.isArray(valor)) return valor
    try { return JSON.parse(valor) } catch { return [] }
}

const SalonDetailScreen = () => {
    const { id } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const criterios = location.state?.criterios || {}

    const [salon, setSalon] = useState(location.state?.salon || null)
    const [cargando, setCargando] = useState(!location.state?.salon)

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    })

    useEffect(() => {
        if (salon) return
        getSalones()
            .then(list => setSalon((list || []).find(s => String(s.id_bodega) === String(id)) || null))
            .finally(() => setCargando(false))
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    if (cargando) {
        return <div className='sd-page sd-estado'><TailSpin /> Cargando salón...</div>
    }
    if (!salon) {
        return (
            <div className='sd-page sd-estado'>
                <p>No se encontró el salón.</p>
                <button className='sd-volver' onClick={() => navigate('/salones')}><FiArrowLeft /> Volver a salones</button>
            </div>
        )
    }

    const coords = (salon.latitud && salon.longitud)
        ? { lat: Number(salon.latitud), lng: Number(salon.longitud) }
        : null
    const direccion = [salon.domicilio, salon.localidad, salon.provincia].filter(Boolean).join(', ')
    const servicios = parsearJSON(salon.servicios_incluidos)
    const tipos = parsearJSON(salon.tipos_evento)

    const reservar = () => navigate('/eventos/new', {
        state: {
            salon,
            tipo_evento: criterios.tipo_evento || undefined,
            cupo: criterios.invitados || undefined,
            fecha: criterios.fecha || undefined,
        },
    })

    return (
        <div className='sd-page'>
            <button className='sd-volver' onClick={() => navigate('/salones')}><FiArrowLeft size={16} /> Volver a salones</button>

            <div className='sd-grid'>
                {/* Info del salón */}
                <div className='sd-card'>
                    {salon.imagen && <img className='sd-img' src={salon.imagen} alt={salon.nombre} />}
                    <div className='sd-body'>
                        <div className='sd-titulo-row'>
                            <h1>{salon.nombre}</h1>
                            {salon.tipo_salon && <span className='sd-tipo'>{salon.tipo_salon}</span>}
                        </div>

                        <div className='sd-datos'>
                            {direccion && <span><FiMapPin size={15} /> {direccion}</span>}
                            <span><FiUsers size={15} /> Aforo: {salon.aforo} personas</span>
                            {(salon.precio_publico ?? salon.precio_alquiler) != null && (
                                <span className='sd-precio'>
                                    ${Number(salon.precio_publico ?? salon.precio_alquiler).toLocaleString('es-AR')}<small>/evento</small>
                                </span>
                            )}
                        </div>

                        {salon.descripcion && <p className='sd-desc'>{salon.descripcion}</p>}

                        {servicios.length > 0 && (
                            <div className='sd-seccion'>
                                <h4>Servicios incluidos</h4>
                                <div className='sd-tags'>
                                    {servicios.map((s, i) => <span key={i} className='sd-tag sd-tag--serv'>{s}</span>)}
                                </div>
                            </div>
                        )}

                        {tipos.length > 0 && (
                            <div className='sd-seccion'>
                                <h4>Ideal para</h4>
                                <div className='sd-tags'>
                                    {tipos.map((t, i) => <span key={i} className='sd-tag sd-tag--tipo'>{t}</span>)}
                                </div>
                            </div>
                        )}

                        <button className='sd-reservar' onClick={reservar}><FiCalendar size={16} /> Reservar salón</button>
                    </div>
                </div>

                {/* Mini-mapa */}
                <div className='sd-mapa-card'>
                    <h2><FiMapPin size={16} /> Ubicación</h2>
                    <div className='sd-mapa'>
                        {loadError && <div className='sd-mapa-msg'>No se pudo cargar el mapa.</div>}
                        {!loadError && coords && !isLoaded && <div className='sd-mapa-msg'><TailSpin /> Cargando mapa...</div>}
                        {!loadError && coords && isLoaded && (
                            <GoogleMap
                                mapContainerStyle={MAP_STYLE}
                                center={coords}
                                zoom={15}
                                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, styles: [{ featureType: 'poi', stylers: [{ visibility: 'simplified' }] }] }}
                            >
                                <Marker position={coords} title={salon.nombre} />
                            </GoogleMap>
                        )}
                        {!coords && (
                            <div className='sd-mapa-msg'><FiMapPin size={30} /><span>Este salón no tiene coordenadas registradas.</span></div>
                        )}
                    </div>
                    {coords && (
                        <a className='sd-gmaps' href={`https://www.google.com/maps?q=${salon.latitud},${salon.longitud}`} target='_blank' rel='noopener noreferrer'>
                            Abrir en Google Maps <FiExternalLink size={13} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SalonDetailScreen
