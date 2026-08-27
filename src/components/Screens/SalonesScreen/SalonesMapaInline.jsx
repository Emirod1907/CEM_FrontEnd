import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { FiMapPin, FiCrosshair } from 'react-icons/fi'

const LIBRARIES = ['places']
const CENTRO_DEFAULT = { lat: -32.8908, lng: -68.8272 } // Mendoza
const MAP_STYLE = { width: '100%', height: '100%' }

const COLOR_POR_TIPO = {
    'Salón': '#1e88e5', 'Quincho': '#2e9e5b', 'Quinta': '#7cb342', 'Finca': '#b5651d',
    'Bodega': '#8e24aa', 'Terraza': '#fb8c00', 'Pelotero': '#26c6da',
}
const COLOR_SIN_TIPO = '#757575'
const colorDeSalon = (s) => COLOR_POR_TIPO[s?.tipo_salon] || COLOR_SIN_TIPO

function distanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Mapa embebido en el hub: muestra los salones ya filtrados y agrega sus propios
// filtros de distancia (geolocalización) y tipo de salón.
const SalonesMapaInline = ({ salones, onVer, onReservar }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
    })
    const mapRef = useRef(null)
    const [sel, setSel] = useState(null)

    const [ubicacion, setUbicacion] = useState(null)
    const [cargandoUbic, setCargandoUbic] = useState(false)
    const [errorUbic, setErrorUbic] = useState(null)
    const [porDistancia, setPorDistancia] = useState(false)
    const [rangoKm, setRangoKm] = useState(50)
    const [tiposFiltro, setTiposFiltro] = useState([])

    const tiposDisponibles = [...new Set(salones.map(s => s.tipo_salon).filter(Boolean))].sort()

    // Aplica los filtros propios del mapa (distancia + tipo) sobre los salones recibidos
    const visibles = salones.filter(s => {
        if (tiposFiltro.length > 0 && !tiposFiltro.includes(s.tipo_salon)) return false
        if (porDistancia && ubicacion) {
            if (s.latitud == null || s.longitud == null) return false
            if (distanciaKm(ubicacion.lat, ubicacion.lng, Number(s.latitud), Number(s.longitud)) > rangoKm) return false
        }
        return true
    })
    const conCoords = visibles.filter(s => s.latitud != null && s.longitud != null)

    const ajustarBounds = useCallback((map) => {
        if (!map || !window.google) return
        if (conCoords.length === 0) { map.panTo(ubicacion || CENTRO_DEFAULT); return }
        const bounds = new window.google.maps.LatLngBounds()
        conCoords.forEach(s => bounds.extend({ lat: Number(s.latitud), lng: Number(s.longitud) }))
        if (porDistancia && ubicacion) bounds.extend(ubicacion)
        map.fitBounds(bounds, 60)
        if (conCoords.length === 1 && !porDistancia) map.setZoom(15)
    }, [conCoords, ubicacion, porDistancia])

    const onLoad = useCallback((map) => { mapRef.current = map; ajustarBounds(map) }, [ajustarBounds])
    useEffect(() => { if (mapRef.current) ajustarBounds(mapRef.current) }, [salones, tiposFiltro, porDistancia, rangoKm, ubicacion]) // eslint-disable-line react-hooks/exhaustive-deps

    const obtenerUbicacion = () => {
        if (!navigator.geolocation) { setErrorUbic('Tu navegador no soporta geolocalización'); return }
        setCargandoUbic(true); setErrorUbic(null)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                setUbicacion(c); setCargandoUbic(false); setPorDistancia(true)
                if (mapRef.current) { mapRef.current.panTo(c); mapRef.current.setZoom(12) }
            },
            (err) => {
                setErrorUbic(err.code === err.PERMISSION_DENIED
                    ? 'Permiso de ubicación denegado. Habilitalo en el navegador.'
                    : 'No se pudo obtener tu ubicación.')
                setCargandoUbic(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const toggleTipo = (t) => setTiposFiltro(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

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
                {ubicacion && (
                    <Marker position={ubicacion} title='Tu ubicación' zIndex={999}
                        icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#4285F4', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }} />
                )}
                {conCoords.map(s => {
                    const activo = sel?.id_bodega === s.id_bodega
                    return (
                        <Marker key={s.id_bodega} position={{ lat: Number(s.latitud), lng: Number(s.longitud) }}
                            title={`${s.nombre}${s.tipo_salon ? ` · ${s.tipo_salon}` : ''}`}
                            onClick={() => setSel(s)} zIndex={activo ? 1000 : 1}
                            icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: activo ? 12 : 8, fillColor: colorDeSalon(s), fillOpacity: 1, strokeColor: activo ? '#1a1a2e' : '#fff', strokeWeight: activo ? 4 : 3 }} />
                    )
                })}
                {sel && sel.latitud != null && (
                    <InfoWindow position={{ lat: Number(sel.latitud), lng: Number(sel.longitud) }}
                        onCloseClick={() => setSel(null)} options={{ pixelOffset: new window.google.maps.Size(0, -14) }}>
                        <div className='sal-mapa-iw'>
                            {sel.imagen && <img src={sel.imagen} alt={sel.nombre} className='sal-mapa-iw-img' />}
                            <h3>{sel.nombre}</h3>
                            <p>📍 {sel.domicilio}</p>
                            <p>👥 Aforo: {sel.aforo}</p>
                            {ubicacion && sel.latitud != null && (
                                <p>📏 {distanciaKm(ubicacion.lat, ubicacion.lng, Number(sel.latitud), Number(sel.longitud)).toFixed(1)} km</p>
                            )}
                            <div className='sal-mapa-iw-btns'>
                                <button onClick={() => onVer(sel)}>Ver</button>
                                <button className='primario' onClick={() => onReservar(sel)}>Reservar</button>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Panel de filtros del mapa */}
            <div className='sal-mapa-panel'>
                <button className={`sal-mapa-ubic ${ubicacion ? 'activo' : ''}`} onClick={obtenerUbicacion} disabled={cargandoUbic}>
                    <FiCrosshair size={14} /> {cargandoUbic ? 'Obteniendo...' : ubicacion ? 'Ubicación activa' : 'Mi ubicación'}
                </button>
                {errorUbic && <p className='sal-mapa-err'>{errorUbic}</p>}

                <label className={`sal-mapa-check ${!ubicacion ? 'deshab' : ''}`}>
                    <input type='checkbox' checked={porDistancia} disabled={!ubicacion} onChange={e => setPorDistancia(e.target.checked)} />
                    Filtrar por distancia
                </label>
                {porDistancia && ubicacion && (
                    <div className='sal-mapa-rango'>
                        <div className='sal-mapa-rango-top'>
                            <span>Radio</span>
                            <input type='number' min={1} max={200} value={rangoKm}
                                onChange={e => setRangoKm(Math.min(200, Math.max(1, Number(e.target.value) || 1)))} />
                            <span>km</span>
                        </div>
                        <input type='range' min={1} max={200} value={rangoKm} onChange={e => setRangoKm(Number(e.target.value))} />
                    </div>
                )}

                {tiposDisponibles.length > 0 && (
                    <div className='sal-mapa-tipos'>
                        <div className='sal-mapa-tipos-head'>
                            <span>Tipo de salón</span>
                            {tiposFiltro.length > 0 && <button onClick={() => setTiposFiltro([])}>Todos</button>}
                        </div>
                        <div className='sal-mapa-chips'>
                            {tiposDisponibles.map(t => {
                                const activo = tiposFiltro.includes(t)
                                const color = COLOR_POR_TIPO[t] || COLOR_SIN_TIPO
                                return (
                                    <button key={t} onClick={() => toggleTipo(t)}
                                        className={`sal-mapa-chip ${activo ? 'activo' : ''}`}
                                        style={activo ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color }}>
                                        <span className='sal-mapa-dot' style={{ background: color }} />{t}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <p className='sal-mapa-conteo'>{conCoords.length} salón{conCoords.length !== 1 ? 'es' : ''} en el mapa</p>
            </div>

            {conCoords.length === 0 && (
                <div className='sal-mapa-sincoords'>
                    <FiMapPin size={18} /> Ningún salón con ubicación para estos filtros.
                </div>
            )}
        </div>
    )
}

export default SalonesMapaInline
