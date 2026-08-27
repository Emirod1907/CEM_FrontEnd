import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { crearPreferenciaOrganizador } from '../../../services/pagoServices'
import { aceptarTerminosConsumidor } from '../../../services/contratoServices'
import { actualizarDatosEvento } from '../../../services/reservaServices'
import { precioUnitarioConDescuento } from '../../../utils/preciosUtils'
import TerminosConsumidorGate from '../../Carrito/TerminosConsumidorGate'
import { FiArrowLeft, FiHome, FiMapPin, FiCalendar, FiCheck } from 'react-icons/fi'
import './EventoFlujo.css'
import './EventoPagoScreen.css'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`

// Paso 4 del flujo: Pago (página completa, antes era solo el drawer del carrito).
const EventoPagoScreen = () => {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const {
        reservaOrganizador, serviciosCarrito, totalOrganizador, montoSena,
        invitadosEfectivos, precioEntrada, factorComisionOrg,
        setReservaOrganizador, setPrecioEntrada,
    } = useCarrito()

    // La comisión del cliente va incorporada de forma invisible en cada precio.
    const conCom = (n) => Number(n) * (Number(factorComisionOrg) || 1)

    const [aceptoTerminos, setAceptoTerminos] = useState(false)
    const [loadingPago, setLoadingPago] = useState(false)
    const [error, setError] = useState(null)

    // Detalles del evento que antes estaban en el form de crear evento: se completan
    // acá, en el paso previo al pago, y se persisten con actualizarDatosEvento.
    const deInicial = reservaOrganizador?.datos_evento || {}
    const [detalles, setDetalles] = useState({
        nombre: deInicial.nombre || '',
        es_publico: deInicial.es_publico !== false,
        cobrar_entrada: !!deInicial.cobrar_entrada,
        precio: deInicial.precio ? String(deInicial.precio) : '',
    })
    const [guardandoDet, setGuardandoDet] = useState(false)
    const setDet = (campo, valor) => setDetalles(prev => ({ ...prev, [campo]: valor }))

    const guardarDetalles = async () => {
        if (!reservaOrganizador) return
        setGuardandoDet(true)
        try {
            const precioNum = detalles.cobrar_entrada ? (Number(detalles.precio) || 0) : 0
            const patch = {
                nombre: (detalles.nombre || '').trim() || 'Mi evento',
                es_publico: detalles.es_publico,
                cobrar_entrada: detalles.cobrar_entrada,
                precio: precioNum,
            }
            await actualizarDatosEvento(reservaOrganizador.id_reserva, patch)
            setReservaOrganizador({ ...reservaOrganizador, datos_evento: { ...(reservaOrganizador.datos_evento || {}), ...patch } })
            setPrecioEntrada(detalles.cobrar_entrada && precioNum > 0 ? String(precioNum) : '')
        } catch (e) {
            console.error('Error al guardar detalles:', e)
        } finally {
            setGuardandoDet(false)
        }
    }

    if (!reservaOrganizador) {
        return (
            <div className='flujo-screen'>
                <div className='flujo-vacio'>
                    <FiHome size={44} />
                    <h2>No hay una reserva en curso</h2>
                    <p>Primero elegí un salón y armá tu evento para llegar al pago.</p>
                    <button className='flujo-btn flujo-btn--primary' onClick={() => navigate('/eventos/new')}>Ir a crear evento</button>
                </div>
            </div>
        )
    }

    const de = reservaOrganizador.datos_evento || {}
    const fecha = reservaOrganizador.fecha ? String(reservaOrganizador.fecha).slice(0, 10) : null

    // Subtotal de un ítem (con descuento por cantidad)
    const subtotalItem = (s) => {
        let mult = 1
        if (s.tipo_precio === 'por_persona') mult = Number(s.personas) > 0 ? Number(s.personas) : (invitadosEfectivos || 1)
        else if (s.tipo_precio === 'por_hora') mult = Number(s.horas) || 1
        else if (s.tipo_precio === 'por_turno') mult = Number(s.turnos) || 1
        return conCom(precioUnitarioConDescuento(s)) * (Number(s.cantidad) || 1) * mult
    }

    const irAlCheckout = (data) => {
        if (data?.orden_id) localStorage.setItem('cem_orden_pendiente', JSON.stringify({ orden_id: data.orden_id, ts: Date.now() }))
        window.location.href = data.init_point || data.sandbox_init_point
    }

    const pagar = async (tipo_pago) => {
        if (!isAuthenticated) { navigate('/login'); return }
        if (!aceptoTerminos) { setError('Aceptá las bases y condiciones para continuar.'); return }
        setLoadingPago(true); setError(null)
        try {
            await guardarDetalles()
            await aceptarTerminosConsumidor().catch(() => {})
            const data = await crearPreferenciaOrganizador({
                reserva_id: reservaOrganizador.id_reserva,
                tipo_pago,
                servicios: serviciosCarrito,
                precio_entrada: detalles.cobrar_entrada && Number(detalles.precio) > 0 ? Number(detalles.precio) : undefined,
            })
            if (!data) { setError('No se pudo iniciar el pago. Intentá de nuevo.'); return }
            irAlCheckout(data)
        } catch {
            setError('Error al conectar con el servidor de pagos.')
        } finally {
            setLoadingPago(false)
        }
    }

    return (
        <div className='flujo-screen'>
            <div className='flujo-header'>
                <span className='flujo-paso-tag'>Paso 4 de 5</span>
                <h1>Pago</h1>
                <p>Revisá el resumen y pagá la seña o el total de <strong>{de.nombre || 'tu evento'}</strong>.</p>
            </div>

            <div className='pago-grid'>
                {/* Resumen del evento + servicios */}
                <div className='pago-col'>
                    {/* Detalles del evento (antes en el form de crear evento) */}
                    <div className='pago-card pago-detalles'>
                        <h4>Detalles del evento</h4>
                        <div className='pd-campo'>
                            <label>Nombre del evento</label>
                            <input type='text' value={detalles.nombre} maxLength={100}
                                onChange={e => setDet('nombre', e.target.value)} placeholder='Ej: Cumple de Vicenta' />
                        </div>
                        <div className='pd-campo'>
                            <label>Visibilidad</label>
                            <div className='pd-toggle'>
                                <button type='button' className={detalles.es_publico ? 'activo' : ''} onClick={() => setDet('es_publico', true)}>🌐 Público</button>
                                <button type='button' className={!detalles.es_publico ? 'activo' : ''} onClick={() => setDet('es_publico', false)}>🔒 Privado</button>
                            </div>
                            <span className='pd-hint'>{detalles.es_publico ? 'Aparece en la cartelera; podés vender entradas.' : 'Solo por invitación (WhatsApp) en el último paso.'}</span>
                        </div>
                        <label className='pd-check'>
                            <input type='checkbox' checked={detalles.cobrar_entrada} onChange={e => setDet('cobrar_entrada', e.target.checked)} />
                            Cobrar entrada
                        </label>
                        {detalles.cobrar_entrada && (
                            <div className='pd-campo'>
                                <label>Precio de la entrada (por persona)</label>
                                <input type='number' min='0' value={detalles.precio}
                                    onChange={e => setDet('precio', e.target.value)} placeholder='Ej: 5000' />
                            </div>
                        )}
                        <button className='pd-guardar' onClick={guardarDetalles} disabled={guardandoDet}>
                            {guardandoDet ? 'Guardando…' : 'Guardar detalles'}
                        </button>
                    </div>

                    <div className='pago-card'>
                        <h3>{de.nombre || 'Evento'}</h3>
                        <div className='pago-datos'>
                            <span><FiMapPin size={14} /> {reservaOrganizador.bodega_nombre || reservaOrganizador.Salon?.nombre || 'Salón'}</span>
                            {fecha && <span><FiCalendar size={14} /> {new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>}
                        </div>
                    </div>

                    <div className='pago-card'>
                        <h4>Servicios y productos</h4>
                        {serviciosCarrito.length === 0 ? (
                            <p className='pago-vacio'>No agregaste servicios ni productos.</p>
                        ) : (
                            <ul className='pago-items'>
                                {serviciosCarrito.map(s => {
                                    const unit = conCom(precioUnitarioConDescuento(s))
                                    const precioBaseCom = conCom(Number(s.precio))
                                    const conDesc = unit < precioBaseCom
                                    return (
                                        <li key={s.id_servicio} className='pago-item'>
                                            <div className='pago-item-info'>
                                                <span className='pago-item-nombre'>{s.nombre} <small>×{s.cantidad}</small></span>
                                                <span className='pago-item-unit'>
                                                    {conDesc && <s className='pago-tachado'>{fmt(precioBaseCom)}</s>} {fmt(unit)} c/u
                                                </span>
                                            </div>
                                            <span className='pago-item-sub'>{fmt(subtotalItem(s))}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Resumen de pago + acciones */}
                <div className='pago-col'>
                    <div className='pago-card pago-resumen'>
                        <div className='pago-fila'>
                            <span>Total del evento</span>
                            <strong>{fmt(totalOrganizador)}</strong>
                        </div>
                        <div className='pago-fila pago-fila--sena'>
                            <span>Seña (30%)</span>
                            <strong>{fmt(montoSena)}</strong>
                        </div>

                        {error && <p className='pago-error'>{error}</p>}

                        <TerminosConsumidorGate checked={aceptoTerminos} onChange={setAceptoTerminos} />

                        <button className='pago-btn pago-btn--sena' disabled={loadingPago || !aceptoTerminos} onClick={() => pagar('seña')}>
                            {loadingPago ? 'Procesando…' : `Abonar Seña (${fmt(montoSena)})`}
                        </button>
                        <button className='pago-btn pago-btn--total' disabled={loadingPago || !aceptoTerminos} onClick={() => pagar('total')}>
                            {loadingPago ? 'Procesando…' : `Pagar Total (${fmt(totalOrganizador)})`}
                        </button>
                        <p className='pago-nota'>Con la seña el evento queda reservado; con el total, confirmado.</p>
                    </div>
                </div>
            </div>

            <div className='flujo-nav'>
                <button className='flujo-btn flujo-btn--ghost' onClick={() => navigate('/organizar/productos')}>
                    <FiArrowLeft size={16} /> Volver a Productos
                </button>
            </div>
        </div>
    )
}

export default EventoPagoScreen
