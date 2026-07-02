import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, InfoWindow, Marker, useLoadScript } from '@react-google-maps/api'
import { useNavigate } from 'react-router-dom'
import { getSalones } from '../../../services/salonesServices'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import './MapaSalonesScreen.css'

const LIBRARIES = ['places']
const MAPA_ESTILO = { width: '100%', height: '100%' }

const CENTRO_DEFAULT = { lat: -32.8908, lng: -68.8272 } // Mendoza, Argentina

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

const MapaSalonesScreen = () => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
    })

    const navigate = useNavigate()
    const mapRef = useRef(null)
    const [salones, setSalones] = useState([])
    const [salonesFiltrados, setSalonesFiltrados] = useState([])
    const [cargandoSalones, setCargandoSalones] = useState(true)
    const [errorSalones, setErrorSalones] = useState(null)

    const [ubicacionUsuario, setUbicacionUsuario] = useState(null)
    const [cargandoUbicacion, setCargandoUbicacion] = useState(false)
    const [errorUbicacion, setErrorUbicacion] = useState(null)

    const [rangoKm, setRangoKm] = useState(50)
    const [filtrarPorDistancia, setFiltrarPorDistancia] = useState(false)

    const [salonSeleccionado, setSalonSeleccionado] = useState(null)
    const [centroPantalla, setCentroPantalla] = useState(CENTRO_DEFAULT)

    useEffect(() => {
        const fetchSalones = async () => {
            setCargandoSalones(true)
            try {
                const data = await getSalones()
                if (data && Array.isArray(data)) {
                    setSalones(data)
                    setSalonesFiltrados(data)
                } else {
                    setErrorSalones('No se pudieron cargar los salones')
                }
            } catch (err) {
                setErrorSalones('Error al cargar los salones: ' + err.message)
            } finally {
                setCargandoSalones(false)
            }
        }
        fetchSalones()
    }, [])

    useEffect(() => {
        if (!filtrarPorDistancia || !ubicacionUsuario) {
            setSalonesFiltrados(salones)
            return
        }
        const cercanos = salones.filter((b) => {
            if (b.latitud == null || b.longitud == null) return false
            const dist = calcularDistanciaKm(
                ubicacionUsuario.lat,
                ubicacionUsuario.lng,
                b.latitud,
                b.longitud
            )
            return dist <= rangoKm
        })
        setSalonesFiltrados(cercanos)
    }, [filtrarPorDistancia, rangoKm, ubicacionUsuario, salones])

    const obtenerUbicacion = () => {
        if (!navigator.geolocation) {
            setErrorUbicacion('Tu navegador no soporta geolocalización')
            return
        }
        setCargandoUbicacion(true)
        setErrorUbicacion(null)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                setUbicacionUsuario(coords)
                setCentroPantalla(coords)
                setCargandoUbicacion(false)
                if (mapRef.current) {
                    mapRef.current.panTo(coords)
                    mapRef.current.setZoom(13)
                }
            },
            (err) => {
                let mensaje
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        mensaje = 'Permiso de ubicación denegado. Habilitá el permiso en la barra de direcciones del navegador (ícono de candado o ubicación) y recargá la página.'
                        break
                    case err.POSITION_UNAVAILABLE:
                        mensaje = 'No se pudo determinar tu ubicación. Verificá que el GPS o servicios de ubicación estén activos en tu dispositivo.'
                        break
                    case err.TIMEOUT:
                        mensaje = 'La solicitud de ubicación tardó demasiado. Intentá de nuevo.'
                        break
                    default:
                        mensaje = 'Error al obtener ubicación: ' + err.message
                }
                setErrorUbicacion(mensaje)
                setCargandoUbicacion(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const onMapLoad = useCallback((map) => {
        mapRef.current = map
    }, [])

    const onMapUnmount = useCallback(() => {
        mapRef.current = null
    }, [])

    // Ajustar bounds del mapa cuando cambia el filtro de distancia
    useEffect(() => {
        if (!mapRef.current || !isLoaded || !filtrarPorDistancia || !ubicacionUsuario) return

        const bounds = new window.google.maps.LatLngBounds()
        bounds.extend(ubicacionUsuario)

        const cercanos = salonesFiltrados.filter((b) => b.latitud != null && b.longitud != null)

        if (cercanos.length > 0) {
            cercanos.forEach((b) => bounds.extend({ lat: b.latitud, lng: b.longitud }))
            mapRef.current.fitBounds(bounds, 60)
        } else {
            mapRef.current.panTo(ubicacionUsuario)
            const zoom = Math.max(5, Math.round(14 - Math.log2(rangoKm)))
            mapRef.current.setZoom(zoom)
        }
    }, [salonesFiltrados, filtrarPorDistancia, rangoKm, ubicacionUsuario, isLoaded])

    const salonesConCoordenadas = salonesFiltrados.filter(
        (b) => b.latitud != null && b.longitud != null
    )
    const salonesSinCoordenadas = salonesFiltrados.filter(
        (b) => b.latitud == null || b.longitud == null
    )

    if (loadError) {
        return (
            <div className="mapa-error">
                <p>Error al cargar Google Maps. Verificá tu API Key.</p>
            </div>
        )
    }

    if (!isLoaded || cargandoSalones) {
        return (
            <div className="mapa-loading">
                <TailSpin />
                <p>{!isLoaded ? 'Cargando mapa...' : 'Cargando salones...'}</p>
            </div>
        )
    }

    return (
        <div className="mapa-screen">
            {/* Mapa ocupa todo el espacio */}
            <div className="mapa-contenedor">
                <GoogleMap
                    mapContainerStyle={MAPA_ESTILO}
                    center={centroPantalla}
                    zoom={11}
                    onLoad={onMapLoad}
                    onUnmount={onMapUnmount}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                        // Evita que los puntos de interés de Google (POIs) capturen
                        // el click y abran su propio popup, interfiriendo con los pines
                        clickableIcons: false,
                    }}
                >
                    {/* Marcador del usuario */}
                    {ubicacionUsuario && (
                        <Marker
                            position={ubicacionUsuario}
                            title="Tu ubicación"
                            zIndex={999}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 7,
                                fillColor: '#4285F4',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 3,
                            }}
                        />
                    )}

                    {/* Marcadores de salones */}
                    {salonesConCoordenadas.map((salon) => {
                        const activo = salonSeleccionado?.id_bodega === salon.id_bodega
                        return (
                            <Marker
                                key={salon.id_bodega}
                                position={{ lat: salon.latitud, lng: salon.longitud }}
                                title={salon.nombre}
                                onClick={() => setSalonSeleccionado(salon)}
                                zIndex={activo ? 1000 : 1}
                                icon={{
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    scale: activo ? 12 : 9,
                                    fillColor: activo ? '#1882da' : '#770981',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 3,
                                }}
                            />
                        )
                    })}

                    {/* InfoWindow de salón seleccionado */}
                    {salonSeleccionado && salonSeleccionado.latitud != null && (
                        <InfoWindow
                            position={{
                                lat: salonSeleccionado.latitud,
                                lng: salonSeleccionado.longitud,
                            }}
                            onCloseClick={() => setSalonSeleccionado(null)}
                            options={{ pixelOffset: new window.google.maps.Size(0, -14) }}
                        >
                            <div className="mapa-infowindow">
                                {salonSeleccionado.imagen && (
                                    <img
                                        src={salonSeleccionado.imagen}
                                        alt={salonSeleccionado.nombre}
                                        className="mapa-infowindow-img"
                                    />
                                )}
                                <h3>{salonSeleccionado.nombre}</h3>
                                <p>📍 {salonSeleccionado.domicilio}</p>
                                <p>👥 Aforo: {salonSeleccionado.aforo}</p>
                                {salonSeleccionado.descripcion && (
                                    <p>{salonSeleccionado.descripcion}</p>
                                )}
                                {ubicacionUsuario && (
                                    <p className="mapa-infowindow-dist">
                                        📏{' '}
                                        {calcularDistanciaKm(
                                            ubicacionUsuario.lat,
                                            ubicacionUsuario.lng,
                                            salonSeleccionado.latitud,
                                            salonSeleccionado.longitud
                                        ).toFixed(2)}{' '}
                                        km desde tu ubicación
                                    </p>
                                )}
                                <button
                                    className="mapa-btn-reservar"
                                    onClick={() => navigate('/eventos/new', { state: { salon: salonSeleccionado } })}
                                >
                                    Reservar salón
                                </button>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>

                {/* Panel flotante DENTRO del contenedor del mapa */}
                <div className="mapa-panel">
                    <h2 className="mapa-titulo">Mapa de Salones</h2>

                    {/* Botón de ubicación */}
                    <div className="mapa-seccion">
                        <button
                            className={`mapa-btn ${ubicacionUsuario ? 'mapa-btn-activo' : ''}`}
                            onClick={obtenerUbicacion}
                            disabled={cargandoUbicacion}
                        >
                            {cargandoUbicacion ? (
                                <>
                                    <TailSpin style={{ width: 16, height: 16 }} /> Obteniendo...
                                </>
                            ) : ubicacionUsuario ? (
                                '📍 Ubicación activa'
                            ) : (
                                '📍 Mi ubicación'
                            )}
                        </button>
                        {errorUbicacion && <p className="mapa-error-msg">{errorUbicacion}</p>}
                        {ubicacionUsuario && (
                            <p className="mapa-coords">
                                Lat: {ubicacionUsuario.lat.toFixed(5)} &nbsp;|&nbsp; Lng:{' '}
                                {ubicacionUsuario.lng.toFixed(5)}
                            </p>
                        )}
                    </div>

                    {/* Filtro por distancia */}
                    <div className="mapa-seccion">
                        <label className="mapa-label">
                            <input
                                type="checkbox"
                                checked={filtrarPorDistancia}
                                onChange={(e) => setFiltrarPorDistancia(e.target.checked)}
                                disabled={!ubicacionUsuario}
                            />
                            &nbsp; Filtrar por distancia
                        </label>
                        {!ubicacionUsuario && (
                            <p className="mapa-hint">Activá tu ubicación primero</p>
                        )}

                        {filtrarPorDistancia && ubicacionUsuario && (
                            <div className="mapa-slider-container">
                                <div className="mapa-rango-row">
                                    <label className="mapa-label">Rango:</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={200}
                                        value={rangoKm}
                                        onChange={(e) => {
                                            const v = Math.min(200, Math.max(1, Number(e.target.value) || 1))
                                            setRangoKm(v)
                                        }}
                                        className="mapa-rango-input"
                                    />
                                    <span className="mapa-label">km</span>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={200}
                                    step={1}
                                    value={rangoKm}
                                    onChange={(e) => setRangoKm(Number(e.target.value))}
                                    className="mapa-slider"
                                />
                                <div className="mapa-slider-labels">
                                    <span>1 km</span>
                                    <span>200 km</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resultados */}
                    <div className="mapa-seccion">
                        <p className="mapa-resultados">
                            {filtrarPorDistancia && ubicacionUsuario
                                ? `${salonesConCoordenadas.length} salón(es) dentro de ${rangoKm} km`
                                : `${salones.length} salón(es) en total`}
                        </p>
                        {salonesSinCoordenadas.length > 0 && (
                            <p className="mapa-hint">
                                {salonesSinCoordenadas.length} salón(es) sin coordenadas (no se muestran en el mapa)
                            </p>
                        )}
                    </div>

                    {/* Lista lateral */}
                    <div className="mapa-lista">
                        {errorSalones && <p className="mapa-error-msg">{errorSalones}</p>}
                        {salonesFiltrados.length === 0 ? (
                            <p className="mapa-hint">
                                {filtrarPorDistancia
                                    ? 'No hay salones en ese rango'
                                    : 'No hay salones disponibles'}
                            </p>
                        ) : (
                            salonesFiltrados.map((salon) => {
                                const tieneCoordenadas = salon.latitud != null && salon.longitud != null
                                const distancia =
                                    ubicacionUsuario && tieneCoordenadas
                                        ? calcularDistanciaKm(
                                              ubicacionUsuario.lat,
                                              ubicacionUsuario.lng,
                                              salon.latitud,
                                              salon.longitud
                                          ).toFixed(1)
                                        : null

                                return (
                                    <div
                                        key={salon.id_bodega}
                                        className={`mapa-lista-item ${salonSeleccionado?.id_bodega === salon.id_bodega ? 'mapa-lista-item-activo' : ''}`}
                                        onClick={() => {
                                            if (tieneCoordenadas) {
                                                setSalonSeleccionado(salon)
                                                setCentroPantalla({
                                                    lat: salon.latitud,
                                                    lng: salon.longitud,
                                                })
                                                if (mapRef.current) {
                                                    mapRef.current.panTo({
                                                        lat: salon.latitud,
                                                        lng: salon.longitud,
                                                    })
                                                    mapRef.current.setZoom(15)
                                                }
                                            }
                                        }}
                                    >
                                        <p className="mapa-lista-nombre">{salon.nombre}</p>
                                        <p className="mapa-lista-domicilio">{salon.domicilio}</p>
                                        {distancia && (
                                            <p className="mapa-lista-distancia">{distancia} km</p>
                                        )}
                                        {!tieneCoordenadas && (
                                            <p className="mapa-hint">Sin ubicación en mapa</p>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MapaSalonesScreen
