import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { getMisReservas } from '../../../services/reservaServices'
import { getValoracionesReserva } from '../../../services/valoracionServices'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { useNavigate } from 'react-router-dom'
import { FiCalendar, FiStar, FiClock, FiCheckCircle, FiLayers } from 'react-icons/fi'
import ReservaDetalleModal from '../../Modals/ReservaDetalleModal/ReservaDetalleModal'
import ReiterarReservaModal from '../../Modals/ReiterarReservaModal/ReiterarReservaModal'
import ValoracionModal from '../../Modals/ValoracionModal/ValoracionModal'
import CancelarReservaModal from '../../Modals/CancelarReservaModal/CancelarReservaModal'
import CalendarioReservas from '../../CalendarioReservas/CalendarioReservas'
import './MisReservasScreen.css'

const MisReservasScreen = () => {
    const [reservas,        setReservas]        = useState([])
    const [cargando,        setCargando]        = useState(true)
    const [cancelando,      setCancelando]      = useState(null)
    const [detalleId,       setDetalleId]       = useState(null)
    const [reservaAReiterar, setReservaAReiterar] = useState(null)
    const [reservaAValorar, setReservaAValorar] = useState(null)
    const [reservaACancelar, setReservaACancelar] = useState(null)
    const [yaCalificadas,   setYaCalificadas]   = useState(new Set())

    const { agregarReservaOrganizador, reservaOrganizador, setIsCartOpen } = useCarrito()
    const navigate = useNavigate()

    const cargarReservas = useCallback(async () => {
        setCargando(true)
        const data = await getMisReservas()
        setReservas(data)
        setCargando(false)

        const hoy = new Date()
        const pasadas = data.filter(r => r.estado === 'confirmada' && new Date(r.fecha) < hoy)
        const checks = await Promise.allSettled(
            pasadas.map(r => getValoracionesReserva(r.id_reserva))
        )
        const calificadasIds = new Set()
        pasadas.forEach((r, i) => {
            const result = checks[i]
            if (result.status === 'fulfilled' && result.value.length > 0) {
                calificadasIds.add(r.id_reserva)
            }
        })
        setYaCalificadas(calificadasIds)
    }, [])

    useEffect(() => { cargarReservas() }, [cargarReservas])

    const cargarReservaEnCarrito = (reserva) => {
        agregarReservaOrganizador({
            id_reserva:                  reserva.id_reserva,
            bodega_id:                   reserva.bodega_id,
            bodega_nombre:               reserva.Salon?.nombre     || reserva.bodega_nombre     || '',
            bodega_domicilio:            reserva.Salon?.domicilio  || reserva.bodega_domicilio  || '',
            fecha:                       reserva.fecha,
            estado:                      reserva.estado,
            monto_alquiler:              reserva.monto_alquiler,
            monto_sena:                  reserva.monto_sena,
            porcentaje_sena:             30,
            comision_cliente_porcentaje: reserva.comision_cliente_porcentaje ?? 0,
            fecha_limite_pago:           reserva.fecha_limite_pago,
            datos_evento:                reserva.datos_evento,
        }, false)
    }

    const handlePagarSena = (reserva) => {
        cargarReservaEnCarrito(reserva)
        navigate('/eventos/new')
        setTimeout(() => setIsCartOpen(true), 100)
    }

    const handleContinuar = (reserva) => {
        cargarReservaEnCarrito(reserva)
        navigate('/organizar/servicios')
    }

    const handleReiterar = (nuevaReserva, viejoId) => {
        const idAEliminar = viejoId ?? reservaAReiterar?.id_reserva

        setReservas(prev => {
            const sinCancelada = idAEliminar
                ? prev.filter(r => r.id_reserva !== idAEliminar)
                : prev
            return [...sinCancelada, nuevaReserva]
        })

        agregarReservaOrganizador({
            id_reserva:                  nuevaReserva.id_reserva,
            bodega_id:                   nuevaReserva.bodega_id,
            bodega_nombre:               nuevaReserva.bodega_nombre     || '',
            bodega_domicilio:            nuevaReserva.bodega_domicilio  || '',
            fecha:                       nuevaReserva.fecha,
            estado:                      nuevaReserva.estado,
            monto_alquiler:              nuevaReserva.monto_alquiler,
            monto_sena:                  nuevaReserva.monto_sena,
            porcentaje_sena:             30,
            comision_cliente_porcentaje: nuevaReserva.comision_cliente_porcentaje ?? 0,
            fecha_limite_pago:           nuevaReserva.fecha_limite_pago,
            datos_evento:                nuevaReserva.datos_evento,
        })
        setReservaAReiterar(null)
        navigate('/eventos/new')
        setTimeout(() => setIsCartOpen(true), 100)
    }

    // Abre el modal de cancelación (que muestra el reembolso según la escala/motivo)
    const handleCancelar = (id_reserva) => {
        const r = reservas.find(x => x.id_reserva === id_reserva)
        if (r) setReservaACancelar(r)
    }

    const pendientesValorar = reservas.filter(
        r => r.estado === 'confirmada'
          && new Date(r.fecha) < new Date()
          && !yaCalificadas.has(r.id_reserva)
    )

    const resumen = useMemo(() => {
        const activas = reservas.filter(r => r.estado !== 'cancelada')
        const pendientes = activas.filter(r => r.estado === 'pendiente_pago').length
        const sena = activas.filter(r => r.estado === 'seña_abonada').length
        const confirmadas = activas.filter(r => r.estado === 'confirmada').length
        const proximas = activas
            .filter(r => r.fecha && new Date(r.fecha) >= new Date(new Date().setHours(0,0,0,0)))
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

        const proxima = proximas[0]
        const proximaTexto = proxima?.fecha
            ? new Date(proxima.fecha).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
              })
            : 'Sin próximas fechas'

        return {
            activas: activas.length,
            pendientes,
            sena,
            confirmadas,
            proximaTexto,
        }
    }, [reservas])

    if (cargando) {
        return (
            <div className="mis-reservas-page">
                <div className="mis-reservas-loading">Cargando reservas...</div>
            </div>
        )
    }

    return (
        <div className="mis-reservas-page">
            <div className="mis-reservas-header">
                <div className="mis-reservas-titulo">
                    <FiCalendar size={28} />
                    <div>
                        <h1>Mis Reservas</h1>
                        <p className="mis-reservas-subtitulo">
                            Gestioná tus eventos, pagos pendientes y próximas fechas desde un solo lugar.
                        </p>
                    </div>
                </div>
                <div className="mis-reservas-ayuda">
                    Las reservas pendientes deben pagarse dentro de las 48 horas o se cancelarán automáticamente.
                </div>
            </div>

            <section className="mis-reservas-resumen-grid">
                <article className="mis-reservas-stat mis-reservas-stat--principal">
                    <span className="mis-reservas-stat-label"><FiLayers size={15} /> Activas</span>
                    <strong>{resumen.activas}</strong>
                    <small>Reservas vigentes en tu agenda</small>
                </article>
                <article className="mis-reservas-stat mis-reservas-stat--warn">
                    <span className="mis-reservas-stat-label"><FiClock size={15} /> Pendientes</span>
                    <strong>{resumen.pendientes}</strong>
                    <small>Esperan pago de seña o confirmación</small>
                </article>
                <article className="mis-reservas-stat mis-reservas-stat--ok">
                    <span className="mis-reservas-stat-label"><FiCheckCircle size={15} /> Señadas / confirmadas</span>
                    <strong>{resumen.sena + resumen.confirmadas}</strong>
                    <small>{resumen.sena} con seña y {resumen.confirmadas} confirmadas</small>
                </article>
                <article className="mis-reservas-stat mis-reservas-stat--accent">
                    <span className="mis-reservas-stat-label"><FiCalendar size={15} /> Próxima fecha</span>
                    <strong className="mis-reservas-stat-strong-small">{resumen.proximaTexto}</strong>
                    <small>La reserva más cercana en el calendario</small>
                </article>
            </section>

            {pendientesValorar.length > 0 && (
                <div className='mis-reservas-valorar-banner'>
                    <FiStar size={18}/>
                    <span>
                        Tenés <strong>{pendientesValorar.length}</strong> evento{pendientesValorar.length !== 1 ? 's' : ''} ya celebrado{pendientesValorar.length !== 1 ? 's' : ''} sin calificar.
                        Tu valoración ayuda a armar mejores sugerencias.
                    </span>
                    <div className='mis-reservas-valorar-btns'>
                        {pendientesValorar.map(r => (
                            <button
                                key={r.id_reserva}
                                className='mis-reservas-btn-calificar'
                                onClick={() => setReservaAValorar(r)}
                            >
                                <FiStar size={13}/> {r.Salon?.nombre || r.datos_evento?.nombre || `Reserva #${r.id_reserva}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {reservas.length === 0 ? (
                <div className="mis-reservas-vacio">
                    <FiCalendar size={48} />
                    <p>No tenés reservas todavía.</p>
                    <button className="btn-nueva-reserva" onClick={() => navigate('/eventos/new')}>
                        Crear mi primera reserva
                    </button>
                </div>
            ) : (
                <CalendarioReservas
                    reservas={reservas}
                    onVerDetalle={setDetalleId}
                    onPagarSena={handlePagarSena}
                    onContinuar={handleContinuar}
                    onCancelar={handleCancelar}
                    cancelando={cancelando}
                    reservaEnCarrito={reservaOrganizador?.id_reserva}
                    onVerCarrito={() => setIsCartOpen(true)}
                    onVencida={cargarReservas}
                    onReiterarExito={handleReiterar}
                />
            )}

            {detalleId && (
                <ReservaDetalleModal
                    id_reserva={detalleId}
                    onClose={() => setDetalleId(null)}
                    onReiterar={(r) => { setDetalleId(null); setReservaAReiterar(r) }}
                    onGuardar={() => { setDetalleId(null); setIsCartOpen(true) }}
                    onContinuar={(r) => { setDetalleId(null); handleContinuar(r) }}
                />
            )}

            {reservaAReiterar && (
                <ReiterarReservaModal
                    reserva={reservaAReiterar}
                    onClose={() => setReservaAReiterar(null)}
                    onExito={handleReiterar}
                />
            )}

            {reservaACancelar && (
                <CancelarReservaModal
                    reserva={reservaACancelar}
                    onClose={() => setReservaACancelar(null)}
                    onCancelada={() => {
                        setReservas(prev => prev.map(r =>
                            r.id_reserva === reservaACancelar.id_reserva ? { ...r, estado: 'cancelada' } : r
                        ))
                        setReservaACancelar(null)
                    }}
                />
            )}

            {reservaAValorar && (
                <ValoracionModal
                    reserva={reservaAValorar}
                    onClose={() => setReservaAValorar(null)}
                    onExito={() => {
                        setYaCalificadas(prev => new Set([...prev, reservaAValorar.id_reserva]))
                        setReservaAValorar(null)
                    }}
                />
            )}
        </div>
    )
}

export default MisReservasScreen
