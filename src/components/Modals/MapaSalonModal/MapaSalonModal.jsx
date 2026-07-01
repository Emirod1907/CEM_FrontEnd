import React, { useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { FiX, FiMapPin } from 'react-icons/fi'
import './MapaSalonModal.css'

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
const LIBRARIES = ['places']

const MapaSalonModal = ({ salon, onClose }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    })

    const tieneCoords = salon.latitud && salon.longitud
    const center = tieneCoords
        ? { lat: Number(salon.latitud), lng: Number(salon.longitud) }
        : null

    const direccion = [salon.domicilio, salon.localidad, salon.provincia]
        .filter(Boolean).join(', ')

    return (
        <div className='ms-overlay' onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className='ms-modal'>
                <div className='ms-header'>
                    <div className='ms-header-info'>
                        <FiMapPin size={16} />
                        <div>
                            <h2>{salon.nombre}</h2>
                            {direccion && <p className='ms-direccion'>{direccion}</p>}
                        </div>
                    </div>
                    <button className='ms-cerrar' onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>

                <div className='ms-mapa'>
                    {loadError && (
                        <div className='ms-error'>No se pudo cargar el mapa.</div>
                    )}
                    {!isLoaded && !loadError && (
                        <div className='ms-loading'>
                            <div className='ms-spinner' />
                            <span>Cargando mapa...</span>
                        </div>
                    )}
                    {isLoaded && !loadError && center && (
                        <GoogleMap
                            mapContainerStyle={MAP_CONTAINER_STYLE}
                            center={center}
                            zoom={16}
                            options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                                fullscreenControl: false,
                                styles: [
                                    { featureType: 'poi', stylers: [{ visibility: 'simplified' }] }
                                ]
                            }}
                        >
                            <Marker
                                position={center}
                                title={salon.nombre}
                            />
                        </GoogleMap>
                    )}
                    {isLoaded && !loadError && !center && (
                        <div className='ms-sin-coords'>
                            <FiMapPin size={36} />
                            <p>Este salón no tiene coordenadas registradas.</p>
                            <p className='ms-sin-coords-dir'>{direccion}</p>
                        </div>
                    )}
                </div>

                {center && (
                    <div className='ms-footer'>
                        <a
                            className='ms-btn-gmaps'
                            href={`https://www.google.com/maps?q=${salon.latitud},${salon.longitud}`}
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            Abrir en Google Maps ↗
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}

export default MapaSalonModal
