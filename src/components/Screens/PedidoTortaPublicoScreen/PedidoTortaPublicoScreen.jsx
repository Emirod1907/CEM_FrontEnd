import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPedidoPublico, confirmarPedidoPublico } from '../../../services/pedidoTortaServices'
import {
    FiCalendar, FiClock, FiUsers, FiDollarSign, FiCheckCircle, FiAlertTriangle, FiMapPin,
} from 'react-icons/fi'
import { ESTADOS_TORTA } from '../../PedidosTortaPanel/PedidosTortaPanel'
import './PedidoTortaPublicoScreen.css'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR')
const fmtFecha = (f) => f
    ? new Date(String(f).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

const PedidoTortaPublicoScreen = () => {
    const { token } = useParams()
    const [pedido, setPedido]   = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError]     = useState(false)
    const [confirmando, setConfirmando] = useState(false)

    useEffect(() => {
        getPedidoPublico(token).then(setPedido).catch(() => setError(true)).finally(() => setCargando(false))
    }, [token])

    const confirmar = async () => {
        setConfirmando(true)
        try { setPedido(await confirmarPedidoPublico(token)) }
        catch { /* noop */ }
        finally { setConfirmando(false) }
    }

    if (cargando) return <div className='ptp-wrap'><p className='ptp-loading'>Cargando tu pedido…</p></div>
    if (error || !pedido) return (
        <div className='ptp-wrap'>
            <div className='ptp-card ptp-card--error'>
                <FiAlertTriangle size={30} />
                <h2>No encontramos el pedido</h2>
                <p>Es posible que el link sea incorrecto o que el pedido haya sido eliminado.</p>
            </div>
        </div>
    )

    const est = ESTADOS_TORTA[pedido.estado] || ESTADOS_TORTA.consulta
    const Dato = ({ label, valor }) => valor ? (
        <div className='ptp-dato'><span>{label}</span><strong>{valor}</strong></div>
    ) : null

    return (
        <div className='ptp-wrap'>
            <div className='ptp-card'>
                <div className='ptp-head'>
                    <span className='ptp-emoji'>🎂</span>
                    <div>
                        <h1>Tu pedido de torta</h1>
                        <p>Hola {pedido.cliente_nombre}, este es el resumen de lo que encargaste.</p>
                    </div>
                    <span className={`ptp-est ${est.clase}`}>{est.label}</span>
                </div>

                {pedido.fotos_referencia?.length > 0 && (
                    <div className='ptp-fotos'>
                        {pedido.fotos_referencia.map((u, i) => <img key={i} src={u} alt={`ref ${i+1}`} />)}
                    </div>
                )}

                <div className='ptp-seccion'>
                    <h3><FiCalendar size={15} /> Entrega</h3>
                    <div className='ptp-grid'>
                        <Dato label='Fecha del evento' valor={fmtFecha(pedido.fecha_evento)} />
                        <Dato label={pedido.modo_entrega === 'entrega' ? 'Horario de entrega' : 'Horario de retiro'} valor={pedido.hora_entrega} />
                        <Dato label='Modo' valor={pedido.modo_entrega === 'entrega' ? 'Te la entregamos' : 'La retirás vos'} />
                    </div>
                </div>

                <div className='ptp-seccion'>
                    <h3><FiUsers size={15} /> La torta</h3>
                    <div className='ptp-grid'>
                        <Dato label='Para cuántas personas' valor={pedido.personas ? `${pedido.personas} personas` : null} />
                        <Dato label='Porciones' valor={pedido.porciones ? `${pedido.porciones}` : null} />
                        <Dato label='Pisos' valor={pedido.pisos ? `${pedido.pisos}` : null} />
                        <Dato label='Sabor' valor={pedido.sabor} />
                        <Dato label='Rellenos' valor={pedido.rellenos} />
                        <Dato label='Cobertura' valor={pedido.cobertura} />
                        <Dato label='Colores' valor={pedido.colores} />
                        <Dato label='Temática' valor={pedido.tematica} />
                    </div>
                    {pedido.detalles_diseno && <p className='ptp-texto'><strong>Diseño:</strong> {pedido.detalles_diseno}</p>}
                    {pedido.alergias && (
                        <div className='ptp-alerta'><FiAlertTriangle size={15} />
                            <span><strong>Alergias / especiales:</strong> {pedido.alergias}</span></div>
                    )}
                </div>

                <div className='ptp-seccion'>
                    <h3><FiDollarSign size={15} /> Pago</h3>
                    {pedido.desglose_precio?.length > 0 && (
                        <ul className='ptp-desglose'>
                            {pedido.desglose_precio.map((c, i) => (
                                <li key={i}><span>{c.concepto}</span><span>${fmt(c.monto)}</span></li>
                            ))}
                        </ul>
                    )}
                    <div className='ptp-pago'>
                        <div><span>Total</span><strong>${fmt(pedido.precio_total)}</strong></div>
                        <div><span>Pagaste</span><strong className='ptp-verde'>${fmt(pedido.monto_pagado)}</strong></div>
                        <div><span>Te falta</span><strong className={pedido.saldo > 0 ? 'ptp-naranja' : 'ptp-verde'}>${fmt(pedido.saldo)}</strong></div>
                    </div>
                    {pedido.fecha_limite_pago && <p className='ptp-texto'>Podés terminar de pagar hasta el <strong>{fmtFecha(pedido.fecha_limite_pago)}</strong>.</p>}
                </div>

                {(pedido.fecha_limite_cambios || pedido.politica_cancelacion) && (
                    <div className='ptp-seccion'>
                        <h3>Cambios y cancelación</h3>
                        {pedido.fecha_limite_cambios && <p className='ptp-texto'>Podés pedir cambios o cancelar hasta el <strong>{fmtFecha(pedido.fecha_limite_cambios)}</strong>.</p>}
                        <p className='ptp-texto'>La seña {pedido.sena_reembolsable ? 'es reembolsable' : 'no se reintegra'} en caso de cancelación.</p>
                        {pedido.politica_cancelacion && <p className='ptp-texto ptp-politica'>{pedido.politica_cancelacion}</p>}
                    </div>
                )}

                <div className='ptp-confirmar'>
                    {pedido.confirmado_cliente ? (
                        <div className='ptp-confirmado'><FiCheckCircle size={20} />
                            <span>¡Confirmaste este pedido! Gracias. Cualquier cambio, contactá a tu pastelero/a.</span></div>
                    ) : (
                        <>
                            <p>Revisá que todo esté correcto (sabor, colores, diseño, fecha). Si está todo bien, confirmá el pedido:</p>
                            <button className='ptp-btn' onClick={confirmar} disabled={confirmando}>
                                <FiCheckCircle size={18} /> {confirmando ? 'Confirmando…' : 'Confirmo que todo está correcto'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PedidoTortaPublicoScreen
