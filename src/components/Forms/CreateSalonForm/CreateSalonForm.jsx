import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, OverlayView, useLoadScript } from '@react-google-maps/api'
import CreatableSelect from 'react-select/creatable'
import Select from 'react-select'
import { FiMaximize2, FiX, FiTrash2, FiMapPin, FiCheck } from 'react-icons/fi'
import UploadImg from '../../../services/uploadimg'
import { createSalon } from '../../../services/salonesServices'
import { useTour } from '../../../hooks/useTour'
import ContratoModal from '../../Modals/ContratoModal/ContratoModal'
import '../Forms.css'
import './CreateSalonForm.css'

const LIBRARIES = ['places']
const CENTRO_DEFAULT = { lat: -32.8908, lng: -68.8272 } // Mendoza, Argentina
const MAPA_FORM_ESTILO = { width: '100%', height: '250px', borderRadius: '8px' }
const MAPA_MODAL_ESTILO = { width: '100%', height: '100%', borderRadius: '8px' }

const PIN_STYLE = {
    width: 22, height: 22,
    background: 'linear-gradient(135deg,#770981,#1882da)',
    border: '3px solid white',
    borderRadius: '50%',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
    transform: 'translate(-50%,-50%)',
    cursor: 'pointer',
}

// Servicios comunes predefinidos (el dueño puede agregar nuevos)
const SERVICIOS_PREDEFINIDOS = [
    'Banquete', 'Luces', 'Música', 'Restaurant', 'Estacionamiento',
    'Decoración', 'Catering', 'DJ', 'Fotografía', 'Seguridad',
    'Aire acondicionado', 'Proyector', 'Bar', 'Sonido profesional',
    'Iluminación LED', 'Sillas y mesas', 'Escenario', 'Wi-Fi',
].map(s => ({ value: s, label: s }))

// Tipos de evento predefinidos
const TIPOS_EVENTO_OPCIONES = [
    'Sunset', 'Bodas', 'Degustación', 'Degustación y Sunset', 'Negocios',
    'Cumpleaños de 15', 'Bautismos', 'Cumpleaños', 'Conferencia', 'Graduación',
    'Juntada de Amigos', 'Juntada Familiar', 'Fogata',
    'Reunión empresarial', 'Baby Shower', 'Aniversario', 'Cóctel',
    'Gala', 'Exposición', 'Capacitación',
].map(t => ({ value: t, label: t }))

// Tipos de salón
const TIPOS_SALON = ['Salón', 'Quincho', 'Quinta', 'Finca', 'Bodega', 'Terraza', 'Pelotero']

// Estilos personalizados de react-select para que encaje con Forms.css
const selectStyles = {
    container: (base) => ({ ...base, flex: 1, maxWidth: '400px' }),
    control: (base, state) => ({
        ...base,
        borderColor: state.isFocused ? '#1882da' : 'rgba(119,9,129,0.16)',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(24,130,218,0.13)' : 'none',
        borderRadius: '12px',
        minHeight: '42px',
        '&:hover': { borderColor: '#1882da' },
    }),
    multiValue: (base) => ({
        ...base,
        background: 'linear-gradient(135deg,#770981,#1882da)',
        borderRadius: '12px',
    }),
    multiValueLabel: (base) => ({ ...base, color: 'white', fontSize: '0.8rem', padding: '2px 6px' }),
    multiValueRemove: (base) => ({
        ...base, color: 'white', borderRadius: '0 12px 12px 0',
        '&:hover': { background: 'rgba(0,0,0,0.2)', color: 'white' },
    }),
    option: (base, state) => ({
        ...base,
        background: state.isSelected ? '#1882da' : state.isFocused ? '#e8f4fd' : 'white',
        color: state.isSelected ? 'white' : '#333',
        fontSize: '0.9rem',
    }),
    placeholder: (base) => ({ ...base, color: '#aaa', fontSize: '0.9rem' }),
    noOptionsMessage: (base) => ({ ...base, fontSize: '0.85rem', color: '#888' }),
}

const CreateSalonForm = () => {
    const navigate = useNavigate()
    const enviando = useRef(false)
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
    })

    const mapFormRef = useRef(null)
    const mapModalRef = useRef(null)
    const searchInputRef = useRef(null)
    const autocompleteInstanceRef = useRef(null)

    const initial_form_state = {
        nombre: '',
        domicilio: '',
        departamento: '',
        localidad: '',
        provincia: '',
        servicios_incluidos: [],
        tipos_evento: [],
        tipo_salon: '',
        imagen: null,
        aforo: '',
        precio_alquiler: '',
        latitud: null,
        longitud: null,
    }

    const [form_values_state, setFormValuesState] = useState(initial_form_state)
    const [marcadorPos, setMarcadorPos] = useState(null)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [mostrarContrato, setMostrarContrato] = useState(false)
    const pendingSubmitRef = useRef(null)

    // Cerrar modal con Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') setModalAbierto(false) }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    // Bloquear scroll del body cuando el modal está abierto
    useEffect(() => {
        document.body.style.overflow = modalAbierto ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [modalAbierto])

    // Inicializar Google Places Autocomplete nativo cuando el modal se abre
    useEffect(() => {
        if (!modalAbierto || !isLoaded || !searchInputRef.current) return
        if (!window.google?.maps?.places) return

        autocompleteInstanceRef.current = new window.google.maps.places.Autocomplete(
            searchInputRef.current,
            { fields: ['geometry', 'name'] }
        )

        const listener = autocompleteInstanceRef.current.addListener('place_changed', () => {
            const place = autocompleteInstanceRef.current.getPlace()
            if (!place?.geometry?.location) return
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            aplicarPosicion(lat, lng)
            if (mapModalRef.current) {
                mapModalRef.current.panTo({ lat, lng })
                mapModalRef.current.setZoom(16)
            }
        })

        // Pre-cargar el input con la dirección del formulario
        const partesDireccion = [
            form_values_state.domicilio,
            form_values_state.departamento,
            form_values_state.localidad,
            form_values_state.provincia,
        ].filter(Boolean)
        if (partesDireccion.length > 0 && searchInputRef.current) {
            searchInputRef.current.value = partesDireccion.join(', ')
        }

        // Si no hay pin, centrar automáticamente en la dirección del formulario
        if (!marcadorPos) {
            setTimeout(() => geocodearDireccionFormulario(mapModalRef.current), 300)
        }

        return () => {
            window.google.maps.event.removeListener(listener)
            autocompleteInstanceRef.current = null
        }
    }, [modalAbierto, isLoaded])

    const aplicarPosicion = (lat, lng) => {
        setMarcadorPos({ lat, lng })
        setFormValuesState(prev => ({ ...prev, latitud: lat, longitud: lng }))
        if (mapFormRef.current) mapFormRef.current.panTo({ lat, lng })
        if (mapModalRef.current) mapModalRef.current.panTo({ lat, lng })
    }

    const geocodearDireccionFormulario = (mapRef) => {
        if (!window.google?.maps?.Geocoder) return
        const partes = [
            form_values_state.domicilio,
            form_values_state.departamento,
            form_values_state.localidad,
            form_values_state.provincia,
            'Argentina',
        ].filter(Boolean)
        if (partes.length < 3) return // domicilio + al menos un dato más de zona
        const direccion = partes.join(', ')
        new window.google.maps.Geocoder().geocode({ address: direccion }, (results, status) => {
            if (status !== 'OK' || !results?.[0]) return
            const { lat, lng } = results[0].geometry.location
            const latVal = lat()
            const lngVal = lng()
            // Mover el pin a la dirección (aplicarPosicion también centra ambos mapas)
            aplicarPosicion(latVal, lngVal)
            const target = mapRef ?? mapModalRef.current ?? mapFormRef.current
            if (target) target.setZoom(16)
        })
    }

    // El pin sigue a la dirección escrita en el formulario: cuando cambia
    // domicilio/departamento/localidad/provincia, re-geocodificar (debounce
    // para no llamar al geocoder en cada tecla)
    useEffect(() => {
        if (!isLoaded || !form_values_state.domicilio) return
        const timer = setTimeout(() => geocodearDireccionFormulario(), 900)
        return () => clearTimeout(timer)
    }, [isLoaded, form_values_state.domicilio, form_values_state.departamento, form_values_state.localidad, form_values_state.provincia])

    const onMapClick = useCallback((e) => {
        aplicarPosicion(e.latLng.lat(), e.latLng.lng())
    }, [])

    const onMapFormLoad = useCallback((map) => { mapFormRef.current = map }, [])
    const onMapModalLoad = useCallback((map) => { mapModalRef.current = map }, [])

    const limpiarUbicacion = () => {
        setMarcadorPos(null)
        setFormValuesState(prev => ({ ...prev, latitud: null, longitud: null }))
    }

    const handleCoordChange = (e) => {
        const { name, value } = e.target
        const parsed = value === '' ? null : parseFloat(value)
        setFormValuesState(prev => ({ ...prev, [name]: parsed }))
        const latNueva = name === 'latitud' ? parsed : form_values_state.latitud
        const lngNuevo = name === 'longitud' ? parsed : form_values_state.longitud
        if (latNueva !== null && lngNuevo !== null && !isNaN(latNueva) && !isNaN(lngNuevo)) {
            setMarcadorPos({ lat: latNueva, lng: lngNuevo })
            if (mapFormRef.current) mapFormRef.current.panTo({ lat: latNueva, lng: lngNuevo })
        } else {
            setMarcadorPos(null)
        }
    }

    const handleChange = (event) => {
        const field = event.target.name;
        if (field === 'imagen') {
            setFormValuesState(prev => ({ ...prev, imagen: event.target.files[0] }));
        } else {
            setFormValuesState(prev => ({ ...prev, [field]: event.target.value }));
        }
    }

    const handleServiciosChange = (selectedOptions) => {
        setFormValuesState(prev => ({
            ...prev,
            servicios_incluidos: selectedOptions ? selectedOptions.map(o => o.value) : []
        }))
    }

    const handleTiposEventoChange = (selectedOptions) => {
        setFormValuesState(prev => ({
            ...prev,
            tipos_evento: selectedOptions ? selectedOptions.map(o => o.value) : []
        }))
    }

    const buildDataToSend = async () => {
        let imagenUrl = null
        if (form_values_state.imagen) {
            try { imagenUrl = await UploadImg(form_values_state.imagen) }
            catch (e) { console.warn('Error subiendo imagen:', e) }
        }
        return {
            nombre: form_values_state.nombre,
            domicilio: form_values_state.domicilio,
            departamento: form_values_state.departamento || null,
            localidad: form_values_state.localidad || null,
            provincia: form_values_state.provincia || null,
            servicios_incluidos: form_values_state.servicios_incluidos,
            tipos_evento: form_values_state.tipos_evento,
            tipo_salon: form_values_state.tipo_salon || null,
            imagen: imagenUrl,
            aforo: form_values_state.aforo ? parseInt(form_values_state.aforo) : 0,
            precio_alquiler: form_values_state.precio_alquiler ? parseFloat(form_values_state.precio_alquiler) : null,
            latitud: form_values_state.latitud,
            longitud: form_values_state.longitud,
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (enviando.current) return
        enviando.current = true
        try {
            const dataToSend = await buildDataToSend()
            await createSalon(dataToSend)
            navigate('/mi-salon')
        } catch (error) {
            enviando.current = false
            if (error?.response?.status === 403 && error?.response?.data?.requiere_contrato) {
                pendingSubmitRef.current = null
                setMostrarContrato(true)
            } else {
                console.log("errores:", error)
            }
        }
    }

    const handleContratoAceptado = async () => {
        setMostrarContrato(false)
        enviando.current = true
        try {
            const dataToSend = await buildDataToSend()
            await createSalon(dataToSend)
            navigate('/mi-salon')
        } catch (error) {
            enviando.current = false
            console.log("errores tras aceptar contrato:", error)
        }
    }

    const { startTour } = useTour();

    const crearSalonTour = [
        { element: 'form', popover: { title: 'Formulario de Salón', description: 'Completa este formulario para crear un nuevo salón.', side: "bottom", align: 'start' } },
        { element: 'input:first-of-type', popover: { title: 'Nombre de Salón', description: 'Ingresa el nombre del salón.', side: "bottom", align: 'start' } },
        { element: 'input[name=domicilio]', popover: { title: 'Domicilio', description: 'Ingresa el domicilio del salón.', side: "top", align: 'start' } },
        { element: 'input[name=imagen]', popover: { title: 'Imagen', description: 'Sube una imagen del salón.', side: "top", align: 'start' } },
        { element: '.mapa-picker-container', popover: { title: 'Ubicación en el mapa', description: 'Hacé clic en el mapa para fijar la ubicación exacta del salón.', side: "top", align: 'start' } },
        { element: 'button[type="submit"]', popover: { title: 'Guardar', description: 'Guarda el salón cuando termines.', side: "top", align: 'start' } },
    ];

    const mapaContenido = (esModal = false) => (
        <GoogleMap
            mapContainerStyle={esModal ? MAPA_MODAL_ESTILO : MAPA_FORM_ESTILO}
            center={marcadorPos || CENTRO_DEFAULT}
            zoom={marcadorPos ? 14 : 12}
            onClick={onMapClick}
            onLoad={esModal ? onMapModalLoad : onMapFormLoad}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
        >
            {marcadorPos && (
                <OverlayView position={marcadorPos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                    <div style={PIN_STYLE} title="Ubicación del salón" />
                </OverlayView>
            )}
        </GoogleMap>
    )

    return (
        <div className='container salon-form-page'>
            {mostrarContrato && (
                <ContratoModal
                    ambito='salon'
                    onClose={() => { setMostrarContrato(false); enviando.current = false }}
                    onAceptado={handleContratoAceptado}
                />
            )}
            <div className='form-container'>
                <div className='salon-head'>
                    <div className='salon-head-title'>
                        <h1>Registrar salón</h1>
                        <p className='salon-head-sub'>
                            Cargá la información de tu salón para publicarlo en Dream Events y empezar a recibir reservas.
                        </p>
                    </div>
                    <button
                        type='button'
                        className='cef-tutorial-btn cef-tutorial-btn--pulse'
                        onClick={() => startTour(crearSalonTour)}
                    >
                        <span className='cef-tutorial-btn__icon'>🎓</span>
                        Ver tutorial
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-input'>
                        <label htmlFor="nombre">Nombre</label>
                        <input type="text" placeholder='Salón Random' maxLength={30} id='nombre' name='nombre' onChange={handleChange} value={form_values_state.nombre} />
                    </div>
                    <div className='form-input'>
                        <label htmlFor="tipo_salon">Tipo de salón</label>
                        <select
                            id='tipo_salon'
                            name='tipo_salon'
                            value={form_values_state.tipo_salon}
                            onChange={handleChange}
                            className='salon-tipo-select'
                        >
                            <option value=''>Seleccionar tipo...</option>
                            {TIPOS_SALON.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className='form-input'>
                        <label htmlFor="domicilio">Domicilio</label>
                        <input type="text" placeholder='Calle Desconocida N° 344 Maipu' maxLength={30} id='domicilio' name='domicilio' onChange={handleChange} value={form_values_state.domicilio} />
                    </div>
                    <div className='form-input'>
                        <label htmlFor="departamento">Departamento</label>
                        <input type="text" placeholder='Ej: Guaymallén' maxLength={50} id='departamento' name='departamento' onChange={handleChange} value={form_values_state.departamento} />
                    </div>
                    <div className='form-input'>
                        <label htmlFor="localidad">Localidad</label>
                        <input type="text" placeholder='Ej: Dorrego' maxLength={50} id='localidad' name='localidad' onChange={handleChange} value={form_values_state.localidad} />
                    </div>
                    <div className='form-input'>
                        <label htmlFor="provincia">Provincia</label>
                        <input type="text" placeholder='Ej: Mendoza' maxLength={50} id='provincia' name='provincia' onChange={handleChange} value={form_values_state.provincia} />
                    </div>

                    {/* Servicios incluidos — Creatable multi-select */}
                    <div className='form-input salon-select-row'>
                        <label>Servicios incluidos</label>
                        <CreatableSelect
                            isMulti
                            isClearable
                            closeMenuOnSelect={false}
                            placeholder='Ej: Banquete, Luces, Música...'
                            options={SERVICIOS_PREDEFINIDOS}
                            value={form_values_state.servicios_incluidos.map(s => ({ value: s, label: s }))}
                            onChange={handleServiciosChange}
                            styles={selectStyles}
                            formatCreateLabel={(inputValue) => `Agregar "${inputValue}"`}
                            noOptionsMessage={() => 'Escribí para agregar un servicio nuevo'}
                        />
                    </div>

                    {/* Tipo de eventos — Select fijo con opciones predefinidas */}
                    <div className='form-input salon-select-row'>
                        <label>Ideal para</label>
                        <Select
                            isMulti
                            isClearable
                            closeMenuOnSelect={false}
                            placeholder='Ej: Bodas, Sunset, Negocios...'
                            options={TIPOS_EVENTO_OPCIONES}
                            value={form_values_state.tipos_evento.map(t => ({ value: t, label: t }))}
                            onChange={handleTiposEventoChange}
                            styles={selectStyles}
                            noOptionsMessage={() => 'Sin opciones disponibles'}
                        />
                    </div>

                    <div className='form-input'>
                        <label htmlFor="Imagen">Imagen</label>
                        <input type="file" id='imagen' name='imagen' onChange={handleChange} />
                    </div>
                    <div className='form-input'>
                        <label htmlFor="aforo">Aforo:</label>
                        <input type="number" placeholder='ingrese el numero de aforo' id='aforo' name='aforo' onChange={handleChange} value={form_values_state.aforo} />
                    </div>
                    <div className='form-input'>
                        <label htmlFor="precio_alquiler">Precio de alquiler (ARS)</label>
                        <input type="number" placeholder='Ej: 150000' id='precio_alquiler' name='precio_alquiler' min="0" onChange={handleChange} value={form_values_state.precio_alquiler} required />
                    </div>

                    {/* Selector de ubicación en mapa */}
                    <div className='form-input mapa-picker-container'>
                        <label>Ubicación en el mapa</label>
                        <p className='salon-map-note'>
                            Hacé clic en el mapa para marcar la ubicación, o abrilo en grande para buscar por nombre.
                        </p>

                        {/* Vista previa del mapa con overlay clickeable */}
                        <div className='salon-map-preview'>
                            {isLoaded ? mapaContenido(false) : (
                                <div className='salon-map-loading'>Cargando mapa...</div>
                            )}
                            {/* Botón para abrir modal */}
                            <button
                                type="button"
                                className='salon-map-expand'
                                onClick={() => setModalAbierto(true)}
                            >
                                <FiMaximize2 size={14} /> Ampliar mapa
                            </button>
                        </div>

                        {/* Inputs de coordenadas */}
                        <div className='salon-coords-row'>
                            <div className='salon-coord'>
                                <label>Latitud</label>
                                <input
                                    type="number" name="latitud" step="any" placeholder="Ej: -32.8908"
                                    value={form_values_state.latitud ?? ''}
                                    onChange={handleCoordChange}
                                />
                            </div>
                            <div className='salon-coord'>
                                <label>Longitud</label>
                                <input
                                    type="number" name="longitud" step="any" placeholder="Ej: -68.8272"
                                    value={form_values_state.longitud ?? ''}
                                    onChange={handleCoordChange}
                                />
                            </div>
                            <button
                                type="button" className='salon-coord-clear' onClick={limpiarUbicacion}
                            >
                                <FiTrash2 size={13} /> Limpiar
                            </button>
                        </div>
                        {!marcadorPos && (
                            <p className='salon-coords-empty'>
                                Sin ubicación seleccionada (opcional)
                            </p>
                        )}
                    </div>

                    <div className='form-input-button'>
                        <button type="submit">Registrar salón</button>
                    </div>
                </form>
            </div>

            {/* Modal del mapa */}
            {modalAbierto && (
                <div
                    className='salon-map-modal-overlay'
                    onClick={(e) => { if (e.target === e.currentTarget) setModalAbierto(false) }}
                >
                    <div className='salon-map-modal'>
                        {/* Header del modal */}
                        <div className='salon-map-modal-head'>
                            <span className='salon-map-modal-title'>Seleccionar ubicación</span>
                            <button
                                type='button'
                                className='salon-map-modal-close'
                                onClick={() => setModalAbierto(false)}
                                aria-label='Cerrar'
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Buscador de Google Places */}
                        <div className='salon-map-modal-search'>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar lugar por nombre... (ej: Salentein, Mendoza)"
                            />
                        </div>

                        {/* Instrucción */}
                        <p className='salon-map-modal-hint'>
                            Buscá un lugar o hacé clic directamente en el mapa para colocar el pin.
                        </p>

                        {/* Mapa grande */}
                        <div className='salon-map-modal-body'>
                            {isLoaded ? mapaContenido(true) : (
                                <div className='salon-map-modal-loading'>Cargando mapa...</div>
                            )}
                        </div>

                        {/* Footer con coords y botón confirmar */}
                        <div className='salon-map-modal-foot'>
                            <span className='salon-map-modal-coords'>
                                {marcadorPos
                                    ? <><FiMapPin size={13} /> Lat: {marcadorPos.lat.toFixed(6)} · Lng: {marcadorPos.lng.toFixed(6)}</>
                                    : 'Sin ubicación seleccionada'}
                            </span>
                            <button
                                type='button'
                                className='salon-map-modal-confirm'
                                onClick={() => setModalAbierto(false)}
                            >
                                <FiCheck size={15} /> Confirmar ubicación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CreateSalonForm