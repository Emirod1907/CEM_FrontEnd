import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { solicitarReserva } from '../../../services/reservaServices'
import { calcularPrecioEvento, tienePreciosEspeciales } from '../../../utils/preciosUtils'
import { FiArrowLeft, FiMapPin, FiUsers, FiCalendar, FiTag } from 'react-icons/fi'
import './ReservaRapida.css'

const precioDe = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0

// Form mínimo de reserva: solo nombre + hora. El salón, tipo, invitados y fecha
// vienen del catálogo (aside). El resto (entrada, tarjeta) se completa antes del
// pago y en el paso de invitaciones. La reserva se crea al tocar un botón de acción.
const ReservaRapida = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { agregarReservaOrganizador } = useCarrito()

    const st = location.state || {}
    const salon = st.salon
    const tipo = st.tipo_evento
    const cupo = st.cupo
    const fecha = st.fecha

    const [nombre, setNombre] = useState('')
    const [horaInicio, setHoraInicio] = useState('')
    const [horaFin, setHoraFin] = useState('')
    const [creando, setCreando] = useState(false)
    const [error, setError] = useState(null)

    if (!salon || !fecha) {
        return (
            <div className='rr-page rr-vacio'>
                <FiCalendar size={44} />
                <h2>Elegí un salón y una fecha</h2>
                <p>Para reservar, buscá un salón desde el catálogo con tu tipo de evento, invitados y fecha.</p>
                <button className='rr-btn rr-btn--primary' onClick={() => navigate('/salones')}>Ir a los salones</button>
            </div>
        )
    }

    const info = calcularPrecioEvento(precioDe(salon), salon.precios_config, fecha, 1)
    const fechaLbl = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    const listo = nombre.trim() && horaInicio

    const crearReserva = async (destino) => {
        if (!nombre.trim()) { setError('Poné un nombre a tu evento.'); return }
        if (!horaInicio) { setError('Ingresá la hora de inicio.'); return }
        setCreando(true); setError(null)
        try {
            const datos_evento = {
                nombre: nombre.trim(),
                tipo_evento: tipo || null,
                descripcion: '',
                fecha,
                hora_inicio: horaInicio || null,
                hora_fin: horaFin || null,
                cupo: cupo || '',
                bodega_id: salon.id_bodega,
                es_publico: true,
                cobrar_entrada: false,
                precio: 0,
            }
            const reserva = await solicitarReserva({ bodega_id: salon.id_bodega, fecha, datos_evento })
            agregarReservaOrganizador(reserva, false)
            navigate(destino)
        } catch (e) {
            console.error('Error al crear la reserva:', e)
            setError('No se pudo crear la reserva. ' + (e?.response?.data?.message || e?.message || ''))
        } finally {
            setCreando(false)
        }
    }

    return (
        <div className='rr-page'>
            <button className='rr-volver' onClick={() => navigate('/salones')}><FiArrowLeft size={16} /> Volver a salones</button>

            <div className='rr-card'>
                <h1>Reservá tu evento</h1>
                <p className='rr-sub'>Completá el nombre y el horario. Lo demás (entrada, tarjeta de invitación) lo cargás antes del pago.</p>

                <div className='rr-resumen'>
                    {salon.imagen && <img src={salon.imagen} alt={salon.nombre} className='rr-resumen-img' />}
                    <div className='rr-resumen-info'>
                        <span className='rr-resumen-nombre'>
                            {salon.nombre}
                            {tienePreciosEspeciales(salon.precios_config) && <span className='rr-oferta'>Oferta</span>}
                        </span>
                        <span className='rr-resumen-linea'><FiMapPin size={13} /> {salon.localidad || salon.domicilio}</span>
                        <span className='rr-resumen-linea'><FiCalendar size={13} /> {fechaLbl}</span>
                        {cupo && <span className='rr-resumen-linea'><FiUsers size={13} /> {cupo} invitados</span>}
                        {tipo && <span className='rr-resumen-linea'><FiTag size={13} /> {tipo}</span>}
                        <span className='rr-resumen-precio'>
                            ${info.precio.toLocaleString('es-AR')}<small>/evento</small>
                            {info.tipo !== 'comun' && <span className='rr-precio-dia' style={{ color: info.color, borderColor: info.color }}>{info.label}</span>}
                        </span>
                    </div>
                </div>

                <div className='rr-campo'>
                    <label htmlFor='rr-nombre'>Nombre del evento *</label>
                    <input id='rr-nombre' type='text' value={nombre} onChange={e => setNombre(e.target.value)} placeholder='Ej: Cumple de Vicenta' maxLength={100} />
                </div>

                <div className='rr-horas'>
                    <div className='rr-campo'>
                        <label htmlFor='rr-hi'>Hora de inicio *</label>
                        <input id='rr-hi' type='time' value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
                    </div>
                    <div className='rr-campo'>
                        <label htmlFor='rr-hf'>Hora de fin</label>
                        <input id='rr-hf' type='time' value={horaFin} onChange={e => setHoraFin(e.target.value)} />
                    </div>
                </div>

                {error && <p className='rr-error'>{error}</p>}

                {listo ? (
                    <div className='rr-acciones'>
                        <button className='rr-btn rr-btn--ghost' disabled={creando} onClick={() => crearReserva('/organizar/servicios')}>
                            {creando ? 'Creando…' : 'Agregar servicios'}
                        </button>
                        <button className='rr-btn rr-btn--primary' disabled={creando} onClick={() => crearReserva('/organizar/pago')}>
                            {creando ? 'Creando…' : 'Pagar reserva'}
                        </button>
                    </div>
                ) : (
                    <p className='rr-hint'>Completá el nombre y la hora de inicio para ver las opciones.</p>
                )}
            </div>
        </div>
    )
}

export default ReservaRapida
