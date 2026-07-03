import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import UploadImg from '../../../services/uploadimg'
import { solicitarReserva } from '../../../services/reservaServices'
import { getDisponibilidadSalon } from '../../../services/salonesServices'
import Modal from '../../Modals/Modal/Modal'
import CalendarioDisponibilidad from '../../CalendarioDisponibilidad/CalendarioDisponibilidad'
import ServiciosPicker, { sugerirHoraServicio } from '../../ServiciosPicker/ServiciosPicker'
import SugeridosSection from '../../Sugeridos/SugeridosSection'
import InvitacionDesigner from '../../Modals/InvitacionDesigner/InvitacionDesigner'
import { FaSearch } from "react-icons/fa";
import { useCarrito } from '../../../Contexts/CarritoContextProvider';
import { useCompare } from '../../../Contexts/CompareContextProvider';
import { useTour } from '../../../hooks/useTour';
import { calcularPrecioEvento, parsePreciosConfig, TIPO_DIA_COLOR, TIPO_DIA_LABEL } from '../../../utils/preciosUtils'
import { FiColumns, FiCheck, FiBookmark, FiShoppingBag, FiX, FiZap, FiTag } from 'react-icons/fi'
import {
    TIPOS_EVENTO, EMOJI_TIPO,
    detectarTipoEvento, generarTextoInvitacion,
} from '../../../utils/eventoUtils'

const TimePicker24 = ({ name, value, onChange }) => {
    const [hh, mm] = (value || '').split(':')
    const horas   = hh !== undefined ? parseInt(hh, 10) : ''
    const minutos = mm !== undefined ? parseInt(mm, 10) : ''

    const emit = useCallback((h, m) => {
        const horasStr   = String(h).padStart(2, '0')
        const minutosStr = String(m).padStart(2, '0')
        onChange({ target: { name, value: `${horasStr}:${minutosStr}` } })
    }, [name, onChange])

    const onChangeH = (e) => {
        const h = Math.min(23, Math.max(0, Number(e.target.value)))
        emit(h, minutos !== '' ? minutos : 0)
    }
    const onChangeM = (e) => {
        const m = Math.min(59, Math.max(0, Number(e.target.value)))
        emit(horas !== '' ? horas : 0, m)
    }

    return (
        <div className="cef-timepicker">
            <input
                type="number" min={0} max={23}
                value={horas === '' ? '' : String(horas).padStart(2, '0')}
                onChange={onChangeH}
                onBlur={(e) => { if (e.target.value === '') emit(0, minutos !== '' ? minutos : 0) }}
                placeholder="HH"
                className="cef-timepicker-num"
            />
            <span className="cef-timepicker-sep">:</span>
            <input
                type="number" min={0} max={59}
                value={minutos === '' ? '' : String(minutos).padStart(2, '0')}
                onChange={onChangeM}
                onBlur={(e) => { if (e.target.value === '') emit(horas !== '' ? horas : 0, 0) }}
                placeholder="MM"
                className="cef-timepicker-num"
            />
        </div>
    )
}

const CATEGORIAS_CRONO_LABEL = {
    catering: 'Catering', decoracion: 'Decoración', audio_video: 'Audio y Video',
    seguridad: 'Seguridad', personal: 'Provisión de Personal', mobiliario: 'Mobiliario',
    entretenimiento: 'Entretenimiento', tortas: 'Elaboración de Tortas',
    bebidas: 'Bebidas', comida: 'Alimentos', alimentos: 'Alimentos',
    cotillon: 'Cotillón y Souvenirs', vajilla: 'Vajilla', otro: 'Otros'
}
const CATEGORIAS_CRONO_EMOJI = {
    catering: '🍽️', decoracion: '🌸', audio_video: '🎵',
    seguridad: '🔒', personal: '🤵', mobiliario: '🪑', entretenimiento: '🎤',
    tortas: '🎂', bebidas: '🥤', comida: '🍔', alimentos: '🍔',
    cotillon: '🎉', vajilla: '🍽️', otro: '📦'
}

const CreateEventoForm = () => {

    const { agregarReservaOrganizador, agregarServicioAdicional, actualizarCantidadServicio } = useCarrito()
    const { agregarEventoComparar, enEventosComparar, quitarEventoComparar } = useCompare()
    const { startTour } = useTour()
    const [guardadoMsgVisible, setGuardadoMsgVisible] = useState(false)
    const [comparaMsgVisible, setComparaMsgVisible] = useState(false)
    const [borradorId] = useState(() => `borrador_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    const [serviciosSeleccionados, setServiciosSeleccionados] = useState([])
    const [pickerAbierto, setPickerAbierto] = useState(false)
    const [canvaAbierto, setCanvaAbierto]   = useState(false)
    // imagenUrl: URL directa (alternativa a subir un File)
    const [imagenUrl, setImagenUrl]         = useState('')
    // Auto-detección de tipo de evento
    const [tipoAutoDetectado, setTipoAutoDetectado] = useState(false)   // fue seteado automáticamente
    const [tipoManual, setTipoManual]               = useState(false)   // usuario lo eligió a mano
    const [textoGenerado, setTextoGenerado]         = useState(false)   // feedback de generación
    const location = useLocation()
    const navigate = useNavigate()

    const crearEventoTour = [
        {
            element: 'form',
            popover: {
                title: 'Formulario de Evento',
                description: 'Completá este formulario para reservar el salón y crear tu evento.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: 'input[name="nombre"]',
            popover: {
                title: 'Nombre del Evento',
                description: 'Ingresá el nombre del evento aquí.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: 'textarea',
            popover: {
                title: 'Descripción',
                description: 'Describí los detalles del evento.',
                side: "top",
                align: 'start'
            }
        },
        {
            element: '.toggle-switch',
            popover: {
                title: 'Visibilidad y Entradas',
                description: 'Definí si el evento es público o privado, y si se cobrará entrada.',
                side: "bottom",
                align: 'start'
            }
        },
        {
            element: 'span',
            popover: {
                title: 'Salón',
                description: 'Pulsá para buscar y seleccionar salón.',
                side: "top",
                align: 'start'
            }
        },
        {
            element: 'button[type="submit"]',
            popover: {
                title: 'Reservar Salón',
                description: 'Agregá la reserva al carrito para continuar con el pago.',
                side: "top",
                align: 'start'
            }
        }
    ];

    const fields = { SALON: 'salon' };
    const initial_form_state = {
        nombre: '',
        tipo_evento: '',
        descripcion: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        precio: '',
        cupo: '',
        salon: { id_bodega: '', nombre: '', precio_alquiler: null, precio_publico: null, precios_config: null },
        imagen: null,
        es_publico: true,
        cobrar_entrada: false,
        horas: 2,
    }

    const fechaPreseleccionada  = location.state?.fecha  || ''
    const salonPreseleccionado  = location.state?.salon  || null
    const formStateRestaurado   = location.state?._formState || null

    const [OpenModal, SetOpenModal] = useState(false)
    const [form_values_state, setFormValuesState] = useState(() => {
        // Restaurar desde borrador si viene del comparador
        if (formStateRestaurado) {
            return { ...initial_form_state, ...formStateRestaurado }
        }
        return {
            ...initial_form_state,
            fecha: fechaPreseleccionada,
            salon: salonPreseleccionado
                ? {
                    id_bodega: salonPreseleccionado.id_bodega,
                    nombre: salonPreseleccionado.nombre,
                    precio_alquiler: salonPreseleccionado.precio_alquiler ?? null,
                    precio_publico: salonPreseleccionado.precio_publico ?? null,
                    precios_config: salonPreseleccionado.precios_config ?? null,
                  }
                : initial_form_state.salon,
        }
    })

    // ── Cálculo de precio según fecha seleccionada ──────────────────────────────
    const precioInfo = useMemo(() => {
        const { salon, fecha, horas, hora_inicio, hora_fin } = form_values_state
        if (!salon.id_bodega || !fecha) return null
        const baseNum = Number(salon.precio_alquiler) || 0
        const pubNum  = Number(salon.precio_publico)  || baseNum
        const factor  = baseNum > 0 ? pubNum / baseNum : 1
        // Duración real del evento (para precio por hora o por tramos);
        // si cruza medianoche se suma un día
        let horasEvento = horas
        if (hora_inicio && hora_fin) {
            const [hi, mi] = hora_inicio.split(':').map(Number)
            const [hf, mf] = hora_fin.split(':').map(Number)
            const mins = ((hf * 60 + mf) - (hi * 60 + mi) + 24 * 60) % (24 * 60)
            if (mins > 0) horasEvento = Math.max(1, Math.ceil(mins / 60))
        }
        return calcularPrecioEvento(pubNum, salon.precios_config, fecha, horasEvento, factor)
    }, [form_values_state.salon, form_values_state.fecha, form_values_state.horas, form_values_state.hora_inicio, form_values_state.hora_fin])
    const [fechasReservadas, setFechasReservadas] = useState([])
    const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false)
    const [cargando, setCargando] = useState(false)

    // Si el salon viene preseleccionado desde la pantalla de salones, cargar disponibilidad al montar
    useEffect(() => {
        if (!salonPreseleccionado?.id_bodega) return
        setCargandoDisponibilidad(true)
        getDisponibilidadSalon(salonPreseleccionado.id_bodega)
            .then(setFechasReservadas)
            .finally(() => setCargandoDisponibilidad(false))
    }, [])

    // ── Re-sincronizar horas de entrega al cambiar la hora del evento ─────────────
    // Entretenimiento y horarios elegidos a mano (p.ej. catering caliente) se
    // respetan; el resto se entrega 2-3h antes del inicio, automático.
    useEffect(() => {
        const horaEvento = form_values_state.hora_inicio
        if (!horaEvento) return
        setServiciosSeleccionados(prev => {
            let cambio = false
            const nuevos = prev.map(s => {
                if (s.categoria === 'entretenimiento' || s.hora_manual) return s
                const horaEntrega = sugerirHoraServicio(s.categoria, horaEvento)
                if (s.hora_inicio === horaEntrega) return s
                cambio = true
                return { ...s, hora_inicio: horaEntrega }
            })
            return cambio ? nuevos : prev
        })
    }, [form_values_state.hora_inicio])

    // ── Auto-detección de tipo de evento a partir del nombre (debounce 600ms) ─────
    useEffect(() => {
        if (tipoManual) return          // el usuario eligió manualmente → no pisar
        if (!form_values_state.nombre) return
        const timer = setTimeout(() => {
            const detectado = detectarTipoEvento(form_values_state.nombre)
            if (detectado && detectado !== form_values_state.tipo_evento) {
                setFormValuesState(prev => ({ ...prev, tipo_evento: detectado }))
                setTipoAutoDetectado(true)
            }
        }, 600)
        return () => clearTimeout(timer)
    }, [form_values_state.nombre, tipoManual])

    // ── Genera y aplica el texto de invitación ─────────────────────────────────
    const handleGenerarTexto = () => {
        const tipo = form_values_state.tipo_evento
        if (!tipo) return
        const texto = generarTextoInvitacion(tipo, form_values_state.nombre)
        setFormValuesState(prev => ({ ...prev, descripcion: texto }))
        setTextoGenerado(true)
        setTimeout(() => setTextoGenerado(false), 2500)
    }

    // ── Construye un objeto "borrador" con el estado actual del form ──────────────
    const buildBorrador = () => ({
        id_evento: borradorId,
        _esBorrador: true,
        nombre: form_values_state.nombre || `${form_values_state.salon.nombre} — ${form_values_state.fecha}`,
        tipo_evento: form_values_state.tipo_evento || null,
        descripcion: form_values_state.descripcion,
        fecha: form_values_state.fecha,
        hora_inicio: form_values_state.hora_inicio,
        hora_fin: form_values_state.hora_fin,
        cupo: form_values_state.cupo,
        precio: form_values_state.cobrar_entrada ? form_values_state.precio : 0,
        es_publico: form_values_state.es_publico,
        imagen: null,
        salon: form_values_state.salon.nombre,
        bodega_nombre: form_values_state.salon.nombre,
        _precioAlquiler: precioInfo?.precio ?? null,
        _salonObj: form_values_state.salon,
        _formState: { ...form_values_state },
        _servicios: serviciosSeleccionados,
    })

    // ── Guardar borrador en localStorage ─────────────────────────────────────────
    const handleGuardarBorrador = () => {
        if (!form_values_state.salon.id_bodega || !form_values_state.fecha) {
            alert('Seleccioná al menos un salón y una fecha para guardar.'); return
        }
        const LLAVE = 'cem_borradores_eventos'
        let borradores = []
        try { borradores = JSON.parse(localStorage.getItem(LLAVE) || '[]') } catch {}
        // Reemplaza si ya existe uno con el mismo id
        const idx = borradores.findIndex(b => b.id_evento === borradorId)
        const nuevo = { ...buildBorrador(), _guardadoEn: new Date().toISOString() }
        if (idx >= 0) borradores[idx] = nuevo
        else borradores.unshift(nuevo)
        localStorage.setItem(LLAVE, JSON.stringify(borradores))
        setGuardadoMsgVisible(true)
        setTimeout(() => setGuardadoMsgVisible(false), 3000)
    }

    // ── Agregar a comparación ─────────────────────────────────────────────────────
    const handleAgregarComparar = () => {
        if (!form_values_state.salon.id_bodega || !form_values_state.fecha) {
            alert('Seleccioná al menos un salón y una fecha para comparar.'); return
        }
        if (enEventosComparar(borradorId)) {
            quitarEventoComparar(borradorId)
        } else {
            agregarEventoComparar(buildBorrador())
            setComparaMsgVisible(true)
            setTimeout(() => setComparaMsgVisible(false), 2500)
        }
    }

    const handleSubmit = async (event, irAServicios = false) => {
        if (event) event.preventDefault()
        if (!form_values_state.salon.id_bodega) {
            alert('Por favor seleccioná un salón')
            return
        }
        if (!form_values_state.fecha) {
            alert('Por favor seleccioná una fecha')
            return
        }

        setCargando(true)
        try {
            let imagenFinal = imagenUrl || null;
            if (!imagenFinal && form_values_state.imagen) {
                try {
                    imagenFinal = await UploadImg(form_values_state.imagen);
                } catch (error) {
                    console.warn('Error subiendo imagen, continuando sin imagen:', error);
                }
            }

            const datos_evento = {
                nombre: form_values_state.nombre,
                tipo_evento: form_values_state.tipo_evento || null,
                descripcion: form_values_state.descripcion,
                fecha: form_values_state.fecha.toString(),
                hora_inicio: form_values_state.hora_inicio || null,
                hora_fin: form_values_state.hora_fin || null,
                precio: form_values_state.cobrar_entrada ? form_values_state.precio : 0,
                cupo: form_values_state.cupo,
                imagen: imagenFinal,
                bodega_id: form_values_state.salon.id_bodega,
                es_publico: form_values_state.es_publico,
                cobrar_entrada: form_values_state.cobrar_entrada,
            }

            const reserva = await solicitarReserva({
                bodega_id: form_values_state.salon.id_bodega,
                fecha: form_values_state.fecha,
                datos_evento,
                // Duración real del evento — el backend la usa para precio por hora y por tramos
                horas: precioInfo?.horas ?? undefined,
            })

            // No abrir el carrito automáticamente: el flujo lo maneja el organizador
            agregarReservaOrganizador(reserva, false)
            setFormValuesState(initial_form_state)
            setServiciosSeleccionados([])
            setImagenUrl('')
            // "Agregar servicios" desliza al paso 2; "Agregar al carrito" termina el proceso
            navigate(irAServicios ? '/organizar/servicios' : '/mis-reservas')
        } catch (error) {
            console.error('Error al solicitar reserva:', error)
            const msg = error?.response?.data?.message || 'Error al procesar la reserva'
            alert(msg)
        } finally {
            setCargando(false)
        }
    }

    // ── Aplicar sugerido desde SugeridosSection ──────────────────────────────
    const handleAplicarSugerido = (salon, servicios) => {
        setFormValuesState(prev => ({
            ...prev,
            salon: {
                id_bodega:      salon.id_bodega,
                nombre:         salon.nombre,
                precio_alquiler: salon.precio_alquiler ?? null,
                precio_publico:  salon.precio_publico  ?? null,
                precios_config:  salon.precios_config  ?? null,
            }
        }))
        if (servicios && servicios.length > 0) {
            setServiciosSeleccionados(servicios.map(s => ({
                id_servicio: s.id_servicio,
                nombre:      s.nombre,
                precio:      Number(s.precio) || 0,
                categoria:   s.categoria,
                tipo_precio: s.tipo_precio || 'fijo',
                tipo_item:   s.tipo_item   || 'producto',
                imagen:      s.imagen      || null,
                cantidad:    1,
                horas:       null,
                turnos:      null,
                hora_inicio: null,
            })))
        }
        // Scroll al form para que el usuario vea los campos pre-llenados
        document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleChangeInputValue = (event) => {
        const field = event.target.name;
        if (field === 'imagen') {
            setFormValuesState(prev_state => ({
                ...prev_state,
                imagen: event.target.files[0]
            }));
        } else {
            setFormValuesState(prev_state => ({
                ...prev_state,
                [field]: event.target.value
            }));
            // Si el usuario cambia el tipo manualmente, desactivar auto-detección
            if (field === 'tipo_evento') {
                setTipoManual(true)
                setTipoAutoDetectado(false)
            }
            // Si borra el nombre, permitir volver a auto-detectar
            if (field === 'nombre' && !event.target.value) {
                setTipoManual(false)
                setTipoAutoDetectado(false)
            }
        }
    }

    const handleToggle = (field) => {
        setFormValuesState(prev => ({ ...prev, [field]: !prev[field] }))
    }

    return (
        <div className='container'>
            <div className='form-container'>
                <button
                    onClick={() => startTour(crearEventoTour)}
                    style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        margin: '60px 20px'
                    }}
                >
                    🎓 Tutorial Crear Evento
                </button>
                <SugeridosSection onAplicar={handleAplicarSugerido}/>

                <div className='form-title'>
                    <h1>Crear Evento</h1>
                    <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 16px' }}>
                        Completá el formulario y agregá la reserva al carrito para luego elegir servicios adicionales y confirmar el pago.
                    </p>
                </div>
                <form action="submit" onSubmit={handleSubmit}>
                    <div className='form-input'>
                        <label htmlFor="nombre">Nombre del Evento</label>
                        <input
                            type="text"
                            placeholder='Ej: Cumple 81 Vicenta, Boda Martínez-López...'
                            maxLength={50}
                            id='nombre'
                            name='nombre'
                            onChange={handleChangeInputValue}
                            value={form_values_state.nombre}
                            required
                        />
                    </div>

                    {/* ── Tipo de evento (con auto-detección) ── */}
                    <div className='cef-tipo-evento-bloque'>
                        <div className='cef-tipo-evento-row'>
                            <label htmlFor='tipo_evento'><FiTag size={13}/> Tipo de evento</label>
                            <div className='cef-tipo-evento-select-wrap'>
                                <select
                                    id='tipo_evento'
                                    name='tipo_evento'
                                    value={form_values_state.tipo_evento}
                                    onChange={handleChangeInputValue}
                                    className='cef-tipo-evento-select'
                                >
                                    <option value=''>— Seleccioná o escribí el nombre —</option>
                                    {TIPOS_EVENTO.map(t => (
                                        <option key={t} value={t}>
                                            {EMOJI_TIPO[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </option>
                                    ))}
                                </select>
                                {tipoAutoDetectado && form_values_state.tipo_evento && (
                                    <span className='cef-tipo-detectado'>
                                        <FiZap size={11}/> Detectado automáticamente
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Descripción = texto de invitación ── */}
                    <div className='form-input cef-desc-bloque'>
                        <label htmlFor="descripcion">
                            Texto de invitación
                            <span className='cef-desc-hint-label'> — aparecerá en las invitaciones</span>
                        </label>
                        <div className='cef-desc-wrapper'>
                            <textarea
                                placeholder='Escribí el mensaje que recibirán tus invitados, o generalo automáticamente según el tipo de evento...'
                                maxLength={600}
                                name="descripcion"
                                id="descripcion"
                                onChange={handleChangeInputValue}
                                value={form_values_state.descripcion}
                                rows={5}
                                required
                            />
                            {form_values_state.tipo_evento && (
                                <button
                                    type='button'
                                    className={`cef-btn-generar ${textoGenerado ? 'cef-btn-generar--ok' : ''}`}
                                    onClick={handleGenerarTexto}
                                    title='Generar texto de invitación según el tipo de evento'
                                >
                                    {textoGenerado
                                        ? <><FiCheck size={13}/> ¡Texto generado!</>
                                        : <><FiZap size={13}/> Generar texto de invitación</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Toggle: Evento público o privado */}
                    <div className='form-toggle-grupo'>
                        <label>Visibilidad del evento</label>
                        <label className='toggle-switch'>
                            <input
                                type="checkbox"
                                checked={form_values_state.es_publico}
                                onChange={() => handleToggle('es_publico')}
                            />
                            <span className='toggle-slider'></span>
                        </label>
                        <span className={`toggle-valor ${form_values_state.es_publico ? 'activo' : ''}`}>
                            {form_values_state.es_publico ? '🌐 Público' : '🔒 Privado'}
                        </span>
                    </div>

                    {/* Toggle: Cobrar entrada */}
                    <div className='form-toggle-grupo'>
                        <label>Cobrar entrada</label>
                        <label className='toggle-switch'>
                            <input
                                type="checkbox"
                                checked={form_values_state.cobrar_entrada}
                                onChange={() => handleToggle('cobrar_entrada')}
                            />
                            <span className='toggle-slider'></span>
                        </label>
                        <span className={`toggle-valor ${form_values_state.cobrar_entrada ? 'activo' : ''}`}>
                            {form_values_state.cobrar_entrada ? '🎟️ Con entrada' : '🎉 Entrada libre'}
                        </span>
                    </div>

                    {/* Precio: solo si cobrar_entrada = true */}
                    {form_values_state.cobrar_entrada && (
                        <div className='form-input'>
                            <label htmlFor="precio">Precio de entrada (ARS)</label>
                            <input
                                type="number"
                                id='precio'
                                name='precio'
                                onChange={handleChangeInputValue}
                                value={form_values_state.precio}
                                min="0"
                                placeholder='0'
                            />
                        </div>
                    )}
                    {form_values_state.cobrar_entrada && (
                        <p className='form-input-hint'>
                            💡 Podés ajustar el precio desde el carrito una vez que conozcas el costo total del evento.
                        </p>
                    )}

                    <div className='form-input'>
                        <label htmlFor="cupo">Cupo de invitados</label>
                        <input
                            type="number"
                            id='cupo'
                            name='cupo'
                            onChange={handleChangeInputValue}
                            value={form_values_state.cupo}
                            min="1"
                            required
                        />
                    </div>

                    <div className='form-input'>
                        <label htmlFor="salon">Salón donde se realizará el evento</label>
                        {form_values_state.fecha && !form_values_state.salon.id_bodega && (
                            <p style={{ fontSize: '0.82rem', color: '#a78bfa', margin: '0 0 6px' }}>
                                📅 Al buscar el salón verás solo los disponibles para el <strong>
                                    {new Date(form_values_state.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                                        day: '2-digit', month: 'long', year: 'numeric'
                                    })}
                                </strong>.
                            </p>
                        )}
                        <input
                            type="text"
                            readOnly
                            id='salon'
                            name='salon'
                            value={form_values_state.salon.nombre || ''}
                            placeholder='Seleccioná un salón'
                        />
                        <span><FaSearch onClick={() => { SetOpenModal(true) }}>Buscar salón</FaSearch></span>
                    </div>

                    {form_values_state.salon.id_bodega && !(fechaPreseleccionada && !salonPreseleccionado) && (
                        <div className='form-input-bloque'>
                            <label>Disponibilidad del salón</label>
                            {cargandoDisponibilidad ? (
                                <p style={{ color: '#555', fontSize: '0.9rem' }}>Cargando disponibilidad...</p>
                            ) : (
                                <CalendarioDisponibilidad
                                    fechasReservadas={fechasReservadas}
                                    fechaSeleccionada={form_values_state.fecha}
                                    onSelectFecha={(fecha) =>
                                        setFormValuesState(prev => ({ ...prev, fecha }))
                                    }
                                />
                            )}
                        </div>
                    )}

                    <div className='form-input'>
                        <label htmlFor="fecha">Fecha del evento</label>
                        <input
                            type="date"
                            id='fecha'
                            name='fecha'
                            onChange={handleChangeInputValue}
                            value={form_values_state.fecha}
                            required
                        />
                    </div>

                    <div className='form-row-horario'>
                        <div className='form-input'>
                            <label>Horario de inicio</label>
                            <TimePicker24
                                name="hora_inicio"
                                value={form_values_state.hora_inicio}
                                onChange={handleChangeInputValue}
                            />
                        </div>
                        <div className='form-input'>
                            <label>Horario de finalización</label>
                            <TimePicker24
                                name="hora_fin"
                                value={form_values_state.hora_fin}
                                onChange={handleChangeInputValue}
                            />
                        </div>
                    </div>
                    {form_values_state.hora_inicio && form_values_state.hora_fin && (
                        <p className='form-input-hint'>
                            🕐 El evento está planificado de <strong>{form_values_state.hora_inicio}</strong> a <strong>{form_values_state.hora_fin}</strong>
                        </p>
                    )}
                    {/* Horario de atención y check-in del salón (de su precios_config) */}
                    {(() => {
                        const cfgSalon = parsePreciosConfig(form_values_state.salon?.precios_config)
                        const apertura = cfgSalon?.horario_apertura
                        const cierre   = cfgSalon?.horario_cierre
                        const ciDesde  = cfgSalon?.checkin_desde
                        const ciHasta  = cfgSalon?.checkin_hasta
                        if (!apertura && !cierre && !ciDesde && !ciHasta) return null
                        const hi = form_values_state.hora_inicio
                        const hf = form_values_state.hora_fin
                        // Una hora HH:MM está dentro de [desde, hasta]; si hasta <= desde
                        // la franja cruza la medianoche (ej. 09:00 a 04:00 del día siguiente)
                        const aMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
                        const enFranja = (t, desde, hasta) => {
                            const tm = aMin(t), d = aMin(desde), h = aMin(hasta)
                            return d <= h ? (tm >= d && tm <= h) : (tm >= d || tm <= h)
                        }
                        const fueraDeAtencion = (apertura && cierre && hi && hf)
                            ? !(enFranja(hi, apertura, cierre) && enFranja(hf, apertura, cierre))
                            : false
                        const fueraDeCheckin = (ciDesde && ciHasta && hi)
                            ? !enFranja(hi, ciDesde, ciHasta)
                            : false
                        return (
                            <>
                                {(apertura || cierre) && (
                                    <p className={`form-input-hint ${fueraDeAtencion ? 'form-input-hint--alerta' : ''}`}>
                                        {fueraDeAtencion ? '⚠️' : '🏠'} Horario de atención del salón:
                                        {apertura && <> de <strong>{apertura}</strong></>}
                                        {cierre && <> a <strong>{cierre}</strong></>}
                                        {fueraDeAtencion && ' — tu evento queda fuera de ese horario'}
                                    </p>
                                )}
                                {(ciDesde || ciHasta) && (
                                    <p className={`form-input-hint ${fueraDeCheckin ? 'form-input-hint--alerta' : ''}`}>
                                        {fueraDeCheckin ? '⚠️' : '🛎️'} Check-in de reservas:
                                        {ciDesde && <> desde las <strong>{ciDesde}</strong></>}
                                        {ciHasta && <> hasta las <strong>{ciHasta}</strong></>}
                                        {fueraDeCheckin && ' — la hora de inicio está fuera de la franja de check-in'}
                                    </p>
                                )}
                            </>
                        )
                    })()}

                    {/* ── Preview de precio según fecha seleccionada ── */}
                    {precioInfo && (
                        <div className='precio-evento-preview'>
                            <div className='pep-tipo' style={{ color: TIPO_DIA_COLOR[precioInfo.tipo] }}>
                                {TIPO_DIA_LABEL[precioInfo.tipo]}
                            </div>

                            {precioInfo.porHora && (
                                <div className='pep-horas-row'>
                                    <label className='pep-horas-label'>Duración del evento (horas):</label>
                                    <div className='pep-horas-control'>
                                        <button type='button' onClick={() => setFormValuesState(p => ({ ...p, horas: Math.max(1, p.horas - 1) }))}>−</button>
                                        <span className='pep-horas-val'>{form_values_state.horas}h</span>
                                        <button type='button' onClick={() => setFormValuesState(p => ({ ...p, horas: p.horas + 1 }))}>+</button>
                                    </div>
                                </div>
                            )}

                            <div className='pep-precio-row'>
                                <span className='pep-precio-label'>Alquiler estimado:</span>
                                <strong className='pep-precio-val'>
                                    ${precioInfo.precio.toLocaleString('es-AR')}
                                    {precioInfo.porTramos && (
                                        <span className='pep-precio-detalle'>
                                            {' '}(tramo de {precioInfo.tramoHoras}h)
                                        </span>
                                    )}
                                    {precioInfo.porHora && (
                                        <span className='pep-precio-detalle'>
                                            {' '}(${precioInfo.precioUnitario.toLocaleString('es-AR')}/h × {precioInfo.horas}h)
                                        </span>
                                    )}
                                </strong>
                            </div>
                            <p className='pep-nota'>El monto final se confirma al procesar la reserva.</p>
                        </div>
                    )}

                    {/* ── Imagen del evento ── */}
                    <div className='form-input cef-imagen-bloque'>
                        <label>Imagen del evento <span style={{ fontWeight: 400, color: '#aaa', fontSize: '0.8rem' }}>(opcional)</span></label>
                        <div className='cef-imagen-opciones'>
                            {/* Subida normal */}
                            <label className='cef-imagen-upload-btn' htmlFor='imagen'>
                                📁 Subir imagen
                                <input
                                    type='file'
                                    id='imagen'
                                    name='imagen'
                                    onChange={e => {
                                        handleChangeInputValue(e)
                                        setImagenUrl('')
                                    }}
                                    accept='image/*'
                                    style={{ display: 'none' }}
                                />
                            </label>

                            <span className='cef-imagen-o'>o</span>

                            {/* Diseñador de tarjeta integrado */}
                            <button
                                type='button'
                                className='cef-imagen-canva-btn'
                                onClick={() => setCanvaAbierto(true)}
                            >
                                🎨 Diseñar tarjeta de invitación
                            </button>
                        </div>

                        {/* Vista previa de lo seleccionado */}
                        {(form_values_state.imagen || imagenUrl) && (
                            <div className='cef-imagen-preview'>
                                {imagenUrl ? (
                                    <>
                                        <img src={imagenUrl} alt='preview' onError={e => e.target.style.display='none'}/>
                                        <span className='cef-imagen-preview-nombre'>URL de imagen aplicada</span>
                                        <button type='button' className='cef-imagen-preview-quitar' onClick={() => setImagenUrl('')}>✕</button>
                                    </>
                                ) : (
                                    <>
                                        <span className='cef-imagen-preview-nombre'>📎 {form_values_state.imagen?.name}</span>
                                        <button type='button' className='cef-imagen-preview-quitar' onClick={() => setFormValuesState(p => ({ ...p, imagen: null }))}>✕</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {/* ── Servicios adicionales ── */}
                    <div className='cef-servicios-aviso'>
                        <FiShoppingBag size={15}/>
                        <span>Después de reservar vas a poder sumar <strong>servicios</strong> y <strong>productos</strong> en los próximos pasos.</span>
                    </div>

                    {/* ── Cronograma del evento ── */}
                    {serviciosSeleccionados.length > 0 && form_values_state.hora_inicio && (() => {
                        const ordenados = [...serviciosSeleccionados].sort((a, b) => {
                            const ta = a.hora_inicio || '99:99'
                            const tb = b.hora_inicio || '99:99'
                            return ta.localeCompare(tb)
                        })
                        const horaEvento = form_values_state.hora_inicio
                        return (
                            <div className='cef-cronograma'>
                                <div className='cef-crono-titulo'>
                                    🕐 Cronograma del evento
                                </div>
                                {/* Línea del evento */}
                                <div className='cef-crono-evento-row'>
                                    <span className='cef-crono-hora cef-crono-hora--evento'>{horaEvento}</span>
                                    <span className='cef-crono-linea'></span>
                                    <span className='cef-crono-nombre cef-crono-nombre--evento'>🎉 Inicio del evento</span>
                                </div>
                                {/* Servicios */}
                                {ordenados.map((s) => {
                                    const antesDelEvento = s.hora_inicio && s.hora_inicio < horaEvento
                                    const esEntret = s.categoria === 'entretenimiento'
                                    const numEntret = ordenados.filter(x => x.categoria === 'entretenimiento').findIndex(x => x.id_servicio === s.id_servicio) + 1
                                    let etiqueta = CATEGORIAS_CRONO_LABEL[s.categoria] || s.categoria
                                    if (antesDelEvento) {
                                        const diffH = Math.round((new Date(`2000-01-01T${horaEvento}`) - new Date(`2000-01-01T${s.hora_inicio}`)) / 3600000)
                                        etiqueta = `${etiqueta} — ${diffH}h antes del evento`
                                    } else if (esEntret) {
                                        etiqueta = `Entretenimiento — ${numEntret}° turno`
                                    }
                                    return (
                                        <div key={s.id_servicio} className={`cef-crono-item ${antesDelEvento ? 'cef-crono-item--pre' : 'cef-crono-item--durante'}`}>
                                            <span className='cef-crono-hora'>{s.hora_inicio || '—'}</span>
                                            <span className='cef-crono-linea'></span>
                                            <span className='cef-crono-emoji'>{CATEGORIAS_CRONO_EMOJI[s.categoria] || '📦'}</span>
                                            <span className='cef-crono-nombre'>{s.nombre}</span>
                                            <span className='cef-crono-cat'>{etiqueta}</span>
                                        </div>
                                    )
                                })}
                                <p className='cef-crono-hint'>Podés ajustar los horarios desde el selector de servicios.</p>
                            </div>
                        )
                    })()}

                    {/* ── Mensajes de feedback ── */}
                    {guardadoMsgVisible && (
                        <div className='cef-feedback cef-feedback--guardado'>
                            <FiBookmark size={14}/> Borrador guardado correctamente.
                        </div>
                    )}
                    {comparaMsgVisible && (
                        <div className='cef-feedback cef-feedback--comparar'>
                            <FiColumns size={14}/> Agregado a la comparación.
                        </div>
                    )}

                    <div className='cef-acciones'>
                        {/* Guardar borrador */}
                        <button
                            type='button'
                            className='cef-btn-guardar'
                            onClick={handleGuardarBorrador}
                            title='Guardar como borrador para retomar luego'
                        >
                            <FiBookmark size={15}/> Guardar reserva
                        </button>

                        {/* Agregar para comparar */}
                        <button
                            type='button'
                            className={`cef-btn-comparar ${enEventosComparar(borradorId) ? 'cef-btn-comparar--activo' : ''}`}
                            onClick={handleAgregarComparar}
                            title='Agregar esta configuración al comparador'
                        >
                            {enEventosComparar(borradorId)
                                ? <><FiCheck size={15}/> En comparación</>
                                : <><FiColumns size={15}/> Agregar para comparar</>
                            }
                        </button>

                        {/* Agregar servicios: crea la reserva y desliza al paso 2 */}
                        <button
                            type='button'
                            className='cef-btn-servicios-continuar'
                            onClick={() => handleSubmit(null, true)}
                            disabled={cargando}
                        >
                            <FiShoppingBag size={15}/> {cargando ? 'Procesando...' : 'Agregar servicios'}
                        </button>

                        {/* Terminar: agrega la reserva al carrito para pagar cuando quiera */}
                        <button type='submit' className='cef-btn-carrito' disabled={cargando}>
                            {cargando ? 'Procesando...' : 'Agregar Reserva al Carrito'}
                        </button>
                    </div>
                </form>
            </div>

            {canvaAbierto && (
                <InvitacionDesigner
                    tipoEvento={form_values_state.tipo_evento}
                    nombreEvento={form_values_state.nombre}
                    fecha={form_values_state.fecha}
                    lugar={form_values_state.salon.nombre}
                    descripcion={form_values_state.descripcion}
                    horaInicio={form_values_state.hora_inicio}
                    horaFin={form_values_state.hora_fin}
                    onFile={(file) => {
                        setFormValuesState(prev => ({ ...prev, imagen: file }))
                        setImagenUrl('')
                        setCanvaAbierto(false)
                    }}
                    onClose={() => setCanvaAbierto(false)}
                />
            )}

            {OpenModal && (
                <Modal
                    onClose={() => SetOpenModal(false)}
                    fechaFiltro={form_values_state.fecha || null}
                    cupoFiltro={form_values_state.cupo ? Number(form_values_state.cupo) : ''}
                    onSelectSalon={async (salon) => {
                        setFormValuesState(prev => ({
                            ...prev,
                            salon: {
                                id_bodega: salon.id_bodega,
                                nombre: salon.nombre,
                                precio_alquiler: salon.precio_alquiler ?? null,
                                precio_publico: salon.precio_publico ?? null,
                                precios_config: salon.precios_config ?? null,
                            },
                            fecha: prev.fecha || ''
                        }))
                        SetOpenModal(false)
                        setCargandoDisponibilidad(true)
                        const fechas = await getDisponibilidadSalon(salon.id_bodega)
                        setFechasReservadas(fechas)
                        setCargandoDisponibilidad(false)
                    }}
                />
            )}
        </div>
    )
}

export default CreateEventoForm
