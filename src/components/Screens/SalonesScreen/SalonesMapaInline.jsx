import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { FiMapPin } from 'react-icons/fi'

const LIBRARIES = ['places']
const CENTRO_DEFAULT = { lat: -32.8908, lng: -68.8272 } // Mendoza
const MAP_STYLE = { width: '100%', height: '100%' }

// Mapa embebido en el hub de salones: muestra los salones ya filtrados.
const SalonesMapaInline = ({ salones, onVer, onReservar }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
    })
    const mapRef = useRef(null)
    const [sel, setSel] = useState(null)

    const conCoords = salones.filter(s => s.latitud != null && s.longitud != null)

    const ajustarBounds = useCallback((map) => {
        if (!map || !window.google || conCoords.length === 0) return
        const bounds = new window.google.maps.LatLngBounds()
        conCoords.forEach(s => bounds.extend({ lat: Number(s.latitud), lng: Number(s.longitud) }))
        map.fitBounds(bounds, 60)
        if (conCoords.length === 1) map.setZoom(15)
    }, [conCoords])

    const onLoad = useCallback((map) => { mapRef.current = map; ajustarBounds(map) }, [ajustarBounds])

    useEffect(() => { if (mapRef.current) ajustarBounds(mapRef.current) }, [salones]) // eslint-disable-line react-hooks/exhaustive-deps

    if (loadError) return <div className='sal-mapa-box sal-mapa-estado'>No se pudo cargar el mapa. Revisá la API Key.</div>
    if (!isLoaded) return <div className='sal-mapa-box sal-mapa-estado'><TailSpin /> Cargando mapa...</div>

    return (
        <div className='sal-mapa-box'>
            <GoogleMap
                mapContainerStyle={MAP_STYLE}
                center={CENTRO_DEFAULT}
                zoom={11}
                onLoad={onLoad}
                onClick={() => setSel(null)}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
            >
                {conCoords.map(s => (
                    <Marker
                        key={s.id_bodega}
                        position={{ lat: Number(s.latitud), lng: Number(s.longitud) }}
                        title={s.nombre}
                        onClick={() => setSel(s)}
                    />
                ))}

                {sel && sel.latitud != null && (
                    <InfoWindow
                        position={{ lat: Number(sel.latitud), lng: Number(sel.longitud) }}
                        onCloseClick={() => setSel(null)}
                        options={{ pixelOffset: new window.google.maps.Size(0, -14) }}
                    >
                        <div className='sal-mapa-iw'>
                            {sel.imagen && <img src={sel.imagen} alt={sel.nombre} className='sal-mapa-iw-img' />}
                            <h3>{sel.nombre}</h3>
                            <p>📍 {sel.domicilio}</p>
                            <p>👥 Aforo: {sel.aforo}</p>
                            <div className='sal-mapa-iw-btns'>
                                <button onClick={() => onVer(sel)}>Ver</button>
                                <button className='primario' onClick={() => onReservar(sel)}>Reservar</button>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {conCoords.length === 0 && (
                <div className='sal-mapa-sincoords'>
                    <FiMapPin size={18} /> Ninguno de los salones de la búsqueda tiene ubicación en el mapa.
                </div>
            )}
        </div>
    )
}

export default SalonesMapaInline
