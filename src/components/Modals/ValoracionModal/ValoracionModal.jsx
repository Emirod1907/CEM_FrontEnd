/**
 * ValoracionModal — permite al organizador calificar:
 *   1. El salón (1-5 estrellas + comentario)
 *   2. Cada servicio adicional usado (1-5 estrellas)
 *   3. El evento en general (1-5 estrellas + comentario)
 *
 * Props:
 *   reserva   — objeto reserva con id_reserva, Salon, datos_evento
 *   onClose   — fn()
 *   onExito   — fn() — llamada tras enviar correctamente
 */
import React, { useState } from 'react'
import { crearValoraciones } from '../../../services/valoracionServices'
import { FiX, FiStar, FiSend, FiCheck } from 'react-icons/fi'
import './ValoracionModal.css'

// ── Selector de estrellas ────────────────────────────────────────────────────
const StarPicker = ({ value, onChange, disabled }) => (
    <div className='val-stars'>
        {[1, 2, 3, 4, 5].map(n => (
            <button
                key={n}
                type='button'
                className={`val-star-btn ${n <= value ? 'val-star-btn--on' : ''}`}
                onClick={() => !disabled && onChange(n)}
                disabled={disabled}
                title={`${n} estrella${n !== 1 ? 's' : ''}`}
            >
                <FiStar size={22} fill={n <= value ? 'currentColor' : 'none'} />
            </button>
        ))}
        <span className='val-star-label'>
            {value === 0 ? 'Sin calificar' : ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][value]}
        </span>
    </div>
)

// ── Modal principal ──────────────────────────────────────────────────────────
const ValoracionModal = ({ reserva, onClose, onExito }) => {
    const salonNombre = reserva.Salon?.nombre || reserva.bodega_nombre || 'el salón'
    const bodegaId = reserva.bodega_id

    // Parsear servicios del evento
    const serviciosUsados = (() => {
        try {
            const de = typeof reserva.datos_evento === 'string'
                ? JSON.parse(reserva.datos_evento)
                : reserva.datos_evento
            return de?.servicios || de?.serviciosSeleccionados || []
        } catch { return [] }
    })()

    const [estrellasSalon,    setEstrellasSalon]   = useState(0)
    const [comentarioSalon,   setComentarioSalon]  = useState('')
    const [estrellasGeneral,  setEstrellasGeneral] = useState(0)
    const [comentarioGeneral, setComentarioGeneral] = useState('')
    const [estrellasServ,     setEstrellasServ]    = useState({})  // { id_servicio: 0-5 }
    const [enviando, setEnviando] = useState(false)
    const [enviado,  setEnviado]  = useState(false)
    const [error,    setError]    = useState(null)

    const handleEnviar = async () => {
        if (estrellasSalon === 0 || estrellasGeneral === 0) {
            setError('Calificá el salón y el evento general para continuar.')
            return
        }

        setError(null)
        setEnviando(true)
        try {
            const valoraciones = [
                { tipo: 'salon', entidad_id: bodegaId, estrellas: estrellasSalon, comentario: comentarioSalon || null },
                { tipo: 'evento_general', entidad_id: null, estrellas: estrellasGeneral, comentario: comentarioGeneral || null },
                ...serviciosUsados
                    .filter(s => estrellasServ[s.id_servicio] > 0)
                    .map(s => ({
                        tipo: 'servicio',
                        entidad_id: s.id_servicio,
                        estrellas: estrellasServ[s.id_servicio],
                        comentario: null,
                    }))
            ]
            await crearValoraciones(reserva.id_reserva, valoraciones)
            setEnviado(true)
            setTimeout(() => { onExito?.(); onClose() }, 2000)
        } catch (err) {
            setError(err?.response?.data?.message || 'Error al enviar la valoración. Intentá de nuevo.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className='val-overlay' onClick={onClose}>
            <div className='val-modal' onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className='val-header'>
                    <div>
                        <h2>Calificá tu evento</h2>
                        <span className='val-header-hint'>Tu opinión ayuda a mejorar las recomendaciones para otros organizadores</span>
                    </div>
                    <button className='val-cerrar' onClick={onClose}><FiX size={20}/></button>
                </div>

                {enviado ? (
                    <div className='val-enviado'>
                        <FiCheck size={48}/>
                        <p>¡Gracias por tu valoración!</p>
                        <span>Cerrando...</span>
                    </div>
                ) : (
                    <div className='val-body'>

                        {/* Sección: Salón */}
                        <div className='val-seccion'>
                            <h3 className='val-seccion-titulo'>
                                <span className='val-seccion-num'>1</span>
                                Calificá el salón — <em>{salonNombre}</em>
                            </h3>
                            <StarPicker value={estrellasSalon} onChange={setEstrellasSalon} disabled={enviando}/>
                            <textarea
                                className='val-textarea'
                                placeholder='Comentario sobre el salón (opcional)...'
                                maxLength={500}
                                value={comentarioSalon}
                                onChange={e => setComentarioSalon(e.target.value)}
                                disabled={enviando}
                                rows={3}
                            />
                        </div>

                        {/* Sección: Servicios */}
                        {serviciosUsados.length > 0 && (
                            <div className='val-seccion'>
                                <h3 className='val-seccion-titulo'>
                                    <span className='val-seccion-num'>2</span>
                                    Calificá los servicios
                                </h3>
                                <div className='val-servicios-lista'>
                                    {serviciosUsados.map(s => (
                                        <div key={s.id_servicio} className='val-servicio-row'>
                                            <span className='val-servicio-nombre'>{s.nombre}</span>
                                            <StarPicker
                                                value={estrellasServ[s.id_servicio] || 0}
                                                onChange={v => setEstrellasServ(prev => ({ ...prev, [s.id_servicio]: v }))}
                                                disabled={enviando}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sección: General */}
                        <div className='val-seccion'>
                            <h3 className='val-seccion-titulo'>
                                <span className='val-seccion-num'>{serviciosUsados.length > 0 ? 3 : 2}</span>
                                Valoración general del evento
                            </h3>
                            <StarPicker value={estrellasGeneral} onChange={setEstrellasGeneral} disabled={enviando}/>
                            <textarea
                                className='val-textarea'
                                placeholder='¿Qué destacarías del evento? (opcional)...'
                                maxLength={500}
                                value={comentarioGeneral}
                                onChange={e => setComentarioGeneral(e.target.value)}
                                disabled={enviando}
                                rows={3}
                            />
                        </div>

                        {error && <p className='val-error'>{error}</p>}

                        <button
                            className='val-btn-enviar'
                            onClick={handleEnviar}
                            disabled={enviando}
                        >
                            {enviando
                                ? 'Enviando...'
                                : <><FiSend size={15}/> Enviar valoración</>
                            }
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ValoracionModal
