import React, { useRef, useState } from 'react'
import { useCarrito } from '../../Contexts/CarritoContextProvider'
import { useAuth } from '../../Contexts/PersonaContextProvider'
import { crearPreferenciaPago, crearPreferenciaOrganizador } from '../../services/pagoServices'
import { useNavigate } from 'react-router-dom'
import { FiX, FiTrash2, FiMinus, FiPlus, FiShoppingCart, FiCalendar, FiMapPin, FiUsers, FiClock, FiRepeat, FiBookmark } from 'react-icons/fi'
import ServiciosModal from '../Modals/ServiciosModal/ServiciosModal'
import './CarritoDrawer.css'

const CarritoDrawer = () => {
    const {
        // Carrito cliente
        items, totalItems, totalPrecio, quitarItem, actualizarCantidad, vaciarCarrito,
        // Carrito organizador
        reservaOrganizador, serviciosCarrito, totalOrganizador, montoAlquiler, montoAlquilerConComision, montoSena,
        quitarServicioAdicional, actualizarCantidadServicio, actualizarUnidadesServicio, vaciarCarritoOrganizador,
        precioEntrada, setPrecioEntrada,
        numInvitados, setNumInvitados, invitadosEfectivos,
        // Compartido
        isCartOpen, setIsCartOpen
    } = useCarrito()

    // ── Cálculos ROI ──
    const cobrarEntrada = reservaOrganizador?.datos_evento?.cobrar_entrada ?? false
    const cupo = Number(reservaOrganizador?.datos_evento?.cupo) || 0
    const precioSugerido = cupo > 0 ? Math.ceil(totalOrganizador / cupo) : 0
    const precioEntradaNum = Number(precioEntrada) || 0
    const ingresosEstimados = precioEntradaNum * cupo
    const porcentajeROI = totalOrganizador > 0 ? (ingresosEstimados / totalOrganizador) * 100 : 0
    const gananciaODeficit = ingresosEstimados - totalOrganizador
    const costoPorInvitado = cupo > 0 ? Math.ceil(totalOrganizador / cupo) : 0

    const colorROI = porcentajeROI >= 100 ? '#00a650' : porcentajeROI >= 60 ? '#e67e00' : '#cc0000'
    const anchoBarraROI = Math.min(porcentajeROI, 100)

    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [loadingPago, setLoadingPago] = useState(false)
    const [errorPago, setErrorPago] = useState(null)
    const [mostrarServiciosModal, setMostrarServiciosModal] = useState(false)
    const precioEntradaRef = useRef(null)

    const scrollAPrecioEntrada = () => {
        setTimeout(() => {
            precioEntradaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 120)
    }


    const tieneCarritoOrg = !!reservaOrganizador
    const tieneCarritoCliente = items.length > 0
    const totalItemsBadge = totalItems + (tieneCarritoOrg ? 1 : 0)

    // Va al checkout de MP en esta misma pestaña. Antes guarda la orden
    // pendiente: el backend la acredita solo (job de verificación) y al volver
    // a la app PagoPendienteWatcher muestra el resultado.
    const irAlCheckout = (data) => {
        if (data.orden_id) {
            localStorage.setItem('cem_orden_pendiente', JSON.stringify({ orden_id: data.orden_id, ts: Date.now() }))
        }
        // Con credenciales de cuentas de prueba (APP_USR-) se usa init_point
        window.location.href = data.init_point || data.sandbox_init_point
    }

    // Pago carrito cliente
    const handleCheckoutCliente = async () => {
        if (!isAuthenticated) {
            navigate('/login')
            setIsCartOpen(false)
            return
        }
        setLoadingPago(true)
        setErrorPago(null)
        try {
            const data = await crearPreferenciaPago(items)
            if (!data) {
                setErrorPago('No se pudo iniciar el pago. Intenta de nuevo.')
                return
            }
            irAlCheckout(data)
        } catch {
            setErrorPago('Error al conectar con el servidor de pagos.')
        } finally {
            setLoadingPago(false)
        }
    }

    // Pago carrito organizador (seña o total)
    const handleCheckoutOrganizador = async (tipo_pago) => {
        if (!isAuthenticated) {
            navigate('/login')
            setIsCartOpen(false)
            return
        }
        setLoadingPago(true)
        setErrorPago(null)
        try {
            const data = await crearPreferenciaOrganizador({
                reserva_id: reservaOrganizador.id_reserva,
                tipo_pago,
                servicios: serviciosCarrito,
                precio_entrada: precioEntradaNum > 0 ? precioEntradaNum : undefined
            })
            if (!data) {
                setErrorPago('No se pudo iniciar el pago. Intenta de nuevo.')
                return
            }
            irAlCheckout(data)
        } catch {
            setErrorPago('Error al conectar con el servidor de pagos.')
        } finally {
            setLoadingPago(false)
        }
    }

    if (!isCartOpen) return null

    return (
        <>
            <div className='carrito-overlay' onClick={() => setIsCartOpen(false)} />
            <div className='carrito-drawer'>
                <div className='carrito-header'>
                    <div className='carrito-titulo'>
                        <FiShoppingCart size={22} />
                        <h2>Mi Carrito ({totalItemsBadge})</h2>
                    </div>
                    <button className='carrito-cerrar' onClick={() => setIsCartOpen(false)}>
                        <FiX size={22} />
                    </button>
                </div>

                {!tieneCarritoOrg && !tieneCarritoCliente ? (
                    <div className='carrito-vacio'>
                        <FiShoppingCart size={48} />
                        <p>Tu carrito está vacío</p>
                        <span>Agregá eventos o reservá un salón para comenzar</span>
                    </div>
                ) : (
                    <div className='carrito-contenido'>

                        {/* ── SECCIÓN ORGANIZADOR ── */}
                        {tieneCarritoOrg && (
                            <div className='carrito-seccion-org'>
                                <div className='carrito-seccion-titulo'>
                                    <span className='badge-org'>Organizador</span>
                                    <button className='btn-vaciar-org' onClick={vaciarCarritoOrganizador}>
                                        <FiTrash2 size={14} /> Quitar reserva
                                    </button>
                                </div>

                                {/* Info reserva */}
                                <div className='reserva-card'>
                                    <div className='reserva-card-header'>
                                        <strong>{reservaOrganizador.datos_evento?.nombre || 'Evento sin nombre'}</strong>
                                    </div>
                                    <div className='reserva-card-body'>
                                        <div className='reserva-info-row'>
                                            <FiMapPin size={14} />
                                            <span>{reservaOrganizador.bodega_nombre}</span>
                                        </div>
                                        <div className='reserva-info-row'>
                                            <FiCalendar size={14} />
                                            <span>{new Date(reservaOrganizador.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
                                        </div>
                                        {(reservaOrganizador.datos_evento?.hora_inicio || reservaOrganizador.datos_evento?.hora_fin) && (
                                            <div className='reserva-info-row'>
                                                <FiClock size={14} />
                                                <span>
                                                    {reservaOrganizador.datos_evento.hora_inicio && reservaOrganizador.datos_evento.hora_fin
                                                        ? `${reservaOrganizador.datos_evento.hora_inicio} – ${reservaOrganizador.datos_evento.hora_fin}`
                                                        : reservaOrganizador.datos_evento.hora_inicio
                                                            ? `Desde ${reservaOrganizador.datos_evento.hora_inicio}`
                                                            : `Hasta ${reservaOrganizador.datos_evento.hora_fin}`
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        <div className='reserva-alquiler'>
                                            <span>Alquiler del salón</span>
                                            <strong>${Number(montoAlquilerConComision).toLocaleString('es-AR')}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Servicios adicionales */}
                                {serviciosCarrito.length > 0 && (
                                    <div className='servicios-en-carrito'>
                                        <div className='servicios-subtitulo-row'>
                                            <p className='servicios-subtitulo'>Servicios adicionales</p>
                                            {serviciosCarrito.some(s => s.tipo_precio === 'por_persona') && (
                                                <div className='invitados-carrito-control'>
                                                    <FiUsers size={13} />
                                                    <input
                                                        type='number'
                                                        min='1'
                                                        value={numInvitados}
                                                        onChange={e => setNumInvitados(e.target.value)}
                                                        placeholder={cupo > 0 ? String(cupo) : '0'}
                                                        className='invitados-carrito-input'
                                                        title='Cantidad de invitados'
                                                    />
                                                    <span className='invitados-carrito-label'>inv.</span>
                                                </div>
                                            )}
                                        </div>
                                        {serviciosCarrito.map(s => {
                                            // por persona: usa la cantidad propia del ítem si la tiene, si no el total de invitados
                                            const personasItem = Number(s.personas) > 0 ? Number(s.personas) : invitadosEfectivos
                                            let multiplicador = 1
                                            if (s.tipo_precio === 'por_persona') multiplicador = personasItem > 0 ? personasItem : 1
                                            else if (s.tipo_precio === 'por_hora')   multiplicador = Number(s.horas)  || 1
                                            else if (s.tipo_precio === 'por_turno')  multiplicador = Number(s.turnos) || 1
                                            const subtotal = Number(s.precio) * s.cantidad * multiplicador

                                            return (
                                                <div key={s.id_servicio} className='carrito-item servicio-item'>
                                                    <div className='carrito-item-info'>
                                                        <h4>{s.nombre}</h4>

                                                        {s.tipo_precio === 'por_persona' && (
                                                            <span className='carrito-item-precio tipo-badge'>
                                                                ${Number(s.precio).toLocaleString('es-AR')}/persona × {personasItem > 0 ? personasItem : '?'} {Number(s.personas) > 0 ? 'pers.' : 'inv.'}
                                                            </span>
                                                        )}

                                                        {s.tipo_precio === 'por_hora' && (
                                                            <>
                                                                <div className='unidades-drawer-row'>
                                                                    <FiClock size={13} />
                                                                    <span>${Number(s.precio).toLocaleString('es-AR')}/hora ×</span>
                                                                    <input
                                                                        type='number'
                                                                        min='1'
                                                                        value={s.horas || 1}
                                                                        onChange={e => actualizarUnidadesServicio(s.id_servicio, 'horas', e.target.value)}
                                                                        className='unidades-drawer-input'
                                                                        title='Cantidad de horas'
                                                                    />
                                                                    <span>h</span>
                                                                </div>
                                                                {s.hora_inicio && (() => {
                                                                    const [h, m] = s.hora_inicio.split(':').map(Number)
                                                                    const total = h * 60 + m + (Number(s.horas) || 1) * 60
                                                                    const horaFin = `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
                                                                    return (
                                                                        <div className='hora-rango-drawer'>
                                                                            <FiClock size={11}/> {s.hora_inicio} – {horaFin}
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </>
                                                        )}

                                                        {s.tipo_precio === 'por_turno' && (
                                                            <div className='unidades-drawer-row'>
                                                                <FiRepeat size={13} />
                                                                <span>${Number(s.precio).toLocaleString('es-AR')}/turno ×</span>
                                                                <input
                                                                    type='number'
                                                                    min='1'
                                                                    value={s.turnos || 1}
                                                                    onChange={e => actualizarUnidadesServicio(s.id_servicio, 'turnos', e.target.value)}
                                                                    className='unidades-drawer-input'
                                                                    title='Cantidad de turnos'
                                                                />
                                                                <span>turno(s)</span>
                                                            </div>
                                                        )}

                                                        {s.tipo_precio === 'fijo' && (
                                                            <span className='carrito-item-precio'>${Number(s.precio).toLocaleString('es-AR')} c/u</span>
                                                        )}

                                                        {/* Hora de inicio para tipos que no son por_hora (ya lo muestra arriba) */}
                                                        {s.tipo_precio !== 'por_hora' && s.hora_inicio && (
                                                            <div className='hora-rango-drawer'>
                                                                <FiClock size={11}/>
                                                                {s.tipo_item === 'servicio' ? 'Inicio' : 'Entrega'}: {s.hora_inicio}
                                                            </div>
                                                        )}

                                                        <div className='carrito-item-cantidad'>
                                                            <button onClick={() => actualizarCantidadServicio(s.id_servicio, s.cantidad - 1)} className='btn-cantidad'>
                                                                <FiMinus size={14} />
                                                            </button>
                                                            <span>{s.cantidad}</span>
                                                            <button onClick={() => actualizarCantidadServicio(s.id_servicio, s.cantidad + 1)} className='btn-cantidad'>
                                                                <FiPlus size={14} />
                                                            </button>
                                                        </div>
                                                        <span className='carrito-item-subtotal'>
                                                            Subtotal: ${subtotal.toLocaleString('es-AR')}
                                                        </span>
                                                    </div>
                                                    <button className='carrito-item-eliminar' onClick={() => quitarServicioAdicional(s.id_servicio)}>
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                <button
                                    className='btn-agregar-servicios'
                                    onClick={() => setMostrarServiciosModal(true)}
                                >
                                    <FiPlus size={16} /> Agregar servicios adicionales
                                </button>

                                {/* ── ROI / Retorno de inversión ── */}
                                {cupo > 0 && cobrarEntrada && (
                                    <div className='roi-seccion' ref={precioEntradaRef} id='carrito-precio-entrada'>
                                        <div className='roi-titulo'>
                                            <span>📊</span>
                                            <h4>Retorno de inversión</h4>
                                        </div>

                                        {cobrarEntrada ? (
                                            <>
                                                <div className='roi-sugerido-fila'>
                                                    <span>Precio sugerido (costo ÷ cupo):</span>
                                                    <strong className='roi-sugerido-monto'>
                                                        ${precioSugerido.toLocaleString('es-AR')}/entrada
                                                    </strong>
                                                </div>
                                                <div className='roi-precio-fila'>
                                                    <label htmlFor='roi-precio-input'>Tu precio de entrada:</label>
                                                    <div className='roi-precio-controles'>
                                                        <input
                                                            id='roi-precio-input'
                                                            type='number'
                                                            min='0'
                                                            value={precioEntrada}
                                                            onChange={e => setPrecioEntrada(e.target.value)}
                                                            placeholder={precioSugerido}
                                                            className='roi-precio-input'
                                                        />
                                                        <button
                                                            className='roi-btn-sugerir'
                                                            onClick={() => setPrecioEntrada(precioSugerido)}
                                                            title='Usar precio sugerido'
                                                        >
                                                            Usar sugerido
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className='roi-barra-label'>
                                                    <span>Cobertura de costos</span>
                                                    <span style={{ color: colorROI, fontWeight: 600 }}>
                                                        {porcentajeROI.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className='roi-barra-track'>
                                                    <div
                                                        className='roi-barra-fill'
                                                        style={{ width: `${anchoBarraROI}%`, background: colorROI }}
                                                    />
                                                </div>

                                                {precioEntradaNum > 0 && (
                                                    <div className={`roi-estado ${gananciaODeficit >= 0 ? 'roi-ganancia' : 'roi-deficit'}`}>
                                                        {gananciaODeficit >= 0 ? (
                                                            <>✅ Ganancia estimada: <strong>${gananciaODeficit.toLocaleString('es-AR')}</strong></>
                                                        ) : (
                                                            <>⚠️ Déficit estimado: <strong>${Math.abs(gananciaODeficit).toLocaleString('es-AR')}</strong></>
                                                        )}
                                                        <span className='roi-ingresos'>
                                                            Ingresos estimados: ${ingresosEstimados.toLocaleString('es-AR')} ({cupo} entradas × ${precioEntradaNum.toLocaleString('es-AR')})
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className='roi-reparto'>
                                                <p>Entrada libre — reparto equitativo entre invitados:</p>
                                                <div className='roi-reparto-monto'>
                                                    <span>Costo por invitado</span>
                                                    <strong>${costoPorInvitado.toLocaleString('es-AR')}</strong>
                                                </div>
                                                <div className='roi-barra-track'>
                                                    <div className='roi-barra-fill' style={{ width: '100%', background: '#1882da' }} />
                                                </div>
                                                <span className='roi-reparto-nota'>
                                                    {cupo} invitados × ${costoPorInvitado.toLocaleString('es-AR')} = ${totalOrganizador.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Resumen de pago */}
                                <div className='org-resumen'>
                                    <div className='org-resumen-fila'>
                                        <span>Total del evento</span>
                                        <strong>${totalOrganizador.toLocaleString('es-AR')}</strong>
                                    </div>
                                    <div className='org-resumen-fila seña-fila'>
                                        <span>Seña (30%)</span>
                                        <strong className='sena-monto'>${montoSena.toLocaleString('es-AR')}</strong>
                                    </div>
                                </div>

                                {errorPago && <p className='carrito-error'>{errorPago}</p>}

                                {/* Anchor para scroll cuando no hay ROI */}
                                {!(cupo > 0 && cobrarEntrada) && (
                                    <div ref={precioEntradaRef} id='carrito-precio-entrada' />
                                )}

                                <div className='org-botones-pago'>
                                    <button
                                        className='btn-pagar-sena'
                                        onClick={() => handleCheckoutOrganizador('seña')}
                                        disabled={loadingPago}
                                        title='Abona el 30% y el evento queda reservado. El saldo se paga luego.'
                                    >
                                        {loadingPago ? 'Procesando...' : `Abonar Seña ($${montoSena.toLocaleString('es-AR')})`}
                                    </button>
                                    <button
                                        className='btn-pagar-total-org'
                                        onClick={() => handleCheckoutOrganizador('total')}
                                        disabled={loadingPago}
                                        title='Pago completo: el evento queda confirmado de inmediato.'
                                    >
                                        {loadingPago ? 'Procesando...' : `Pagar Total ($${totalOrganizador.toLocaleString('es-AR')})`}
                                    </button>
                                    <button
                                        className='btn-guardar-reserva'
                                        onClick={scrollAPrecioEntrada}
                                        title='Ver precio de entrada y retorno de inversión'
                                    >
                                        <FiBookmark size={15} /> Guardar reserva
                                    </button>
                                </div>

                                <p className='org-nota'>
                                    * Al abonar la seña el evento queda en estado <em>borrador</em>. Al pagar el total queda <em>confirmado</em>.
                                </p>
                            </div>
                        )}

                        {/* ── SECCIÓN CLIENTE ── */}
                        {tieneCarritoCliente && (
                            <div className='carrito-seccion-cliente'>
                                {tieneCarritoOrg && (
                                    <div className='carrito-seccion-titulo'>
                                        <span className='badge-cliente'>Entradas</span>
                                    </div>
                                )}
                                <div className='carrito-items'>
                                    {items.map((item) => (
                                        <div key={item.id_evento} className='carrito-item'>
                                            {item.imagen && (
                                                <img src={item.imagen} alt={item.nombre} className='carrito-item-img' />
                                            )}
                                            <div className='carrito-item-info'>
                                                <h4>{item.nombre}</h4>
                                                <span className='carrito-item-precio'>
                                                    ${Number(item.precio).toFixed(2)} c/u
                                                </span>
                                                <div className='carrito-item-cantidad'>
                                                    <button onClick={() => actualizarCantidad(item.id_evento, item.cantidad - 1)} className='btn-cantidad'>
                                                        <FiMinus size={14} />
                                                    </button>
                                                    <span>{item.cantidad}</span>
                                                    <button onClick={() => actualizarCantidad(item.id_evento, item.cantidad + 1)} className='btn-cantidad'>
                                                        <FiPlus size={14} />
                                                    </button>
                                                </div>
                                                <span className='carrito-item-subtotal'>
                                                    Subtotal: ${(Number(item.precio) * item.cantidad).toFixed(2)}
                                                </span>
                                            </div>
                                            <button className='carrito-item-eliminar' onClick={() => quitarItem(item.id_evento)}>
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className='carrito-footer'>
                                    <button className='btn-vaciar' onClick={vaciarCarrito}>
                                        Vaciar entradas
                                    </button>
                                    <div className='carrito-total'>
                                        <span>Total entradas</span>
                                        <strong>${totalPrecio.toFixed(2)}</strong>
                                    </div>
                                    <button
                                        className='btn-pagar'
                                        onClick={handleCheckoutCliente}
                                        disabled={loadingPago}
                                    >
                                        {loadingPago ? 'Procesando...' : 'Pagar con MercadoPago'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {mostrarServiciosModal && (
                <ServiciosModal onClose={() => setMostrarServiciosModal(false)} />
            )}
        </>
    )
}

export default CarritoDrawer
