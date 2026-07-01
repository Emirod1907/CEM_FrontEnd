import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBookmark, FiCalendar, FiMapPin, FiTrash2, FiRotateCcw, FiShoppingBag, FiDollarSign } from 'react-icons/fi'
import { EMOJI_TIPO } from '../../../utils/eventoUtils'
import './BorradoresScreen.css'

const LLAVE = 'cem_borradores_eventos'

const leerBorradores = () => {
    try { return JSON.parse(localStorage.getItem(LLAVE) || '[]') } catch { return [] }
}

const BorradoresScreen = () => {
    const [borradores, setBorradores] = useState(() => leerBorradores())
    const navigate = useNavigate()

    const eliminar = useCallback((id) => {
        if (!confirm('¿Eliminar este borrador?')) return
        const restantes = borradores.filter(b => b.id_evento !== id)
        setBorradores(restantes)
        localStorage.setItem(LLAVE, JSON.stringify(restantes))
    }, [borradores])

    const eliminarTodos = useCallback(() => {
        if (!confirm('¿Eliminar todos los borradores? Esta acción no se puede deshacer.')) return
        setBorradores([])
        localStorage.setItem(LLAVE, '[]')
    }, [])

    const restaurar = useCallback((b) => {
        navigate('/eventos/new', {
            state: {
                _formState: b._formState,
                salon: b._salonObj,
                fecha: b._formState?.fecha || b.fecha,
            }
        })
    }, [navigate])

    const formatFecha = (iso) => {
        if (!iso) return '—'
        try {
            return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
            })
        } catch { return iso }
    }

    const formatGuardado = (iso) => {
        if (!iso) return ''
        try {
            return new Date(iso).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
        } catch { return '' }
    }

    return (
        <div className='bor-page'>
            <div className='bor-header'>
                <div className='bor-header-left'>
                    <FiBookmark size={26} />
                    <div>
                        <h1>Mis Borradores</h1>
                        <p className='bor-subtitulo'>
                            Reservas guardadas que podés restaurar y continuar en cualquier momento.
                        </p>
                    </div>
                </div>
                {borradores.length > 1 && (
                    <button className='bor-btn-limpiar' onClick={eliminarTodos}>
                        <FiTrash2 size={14}/> Eliminar todos
                    </button>
                )}
            </div>

            {borradores.length === 0 ? (
                <div className='bor-vacio'>
                    <FiBookmark size={52} />
                    <p>No tenés borradores guardados.</p>
                    <span className='bor-vacio-hint'>
                        En el formulario de creación de evento usá <strong>"Guardar reserva"</strong> para guardar tu configuración.
                    </span>
                    <button className='bor-btn-crear' onClick={() => navigate('/eventos/new')}>
                        Ir a Crear Evento
                    </button>
                </div>
            ) : (
                <div className='bor-grid'>
                    {borradores.map(b => {
                        const nServicios = b._servicios?.length || 0
                        const precioAlq  = b._precioAlquiler
                        const precioEntr = Number(b.precio) > 0 ? Number(b.precio) : null

                        return (
                            <div key={b.id_evento} className='bor-card'>
                                <div className='bor-card-header'>
                                    <span className='bor-badge'>
                                        <FiBookmark size={11}/> Borrador
                                    </span>
                                    <span className='bor-guardado'>{formatGuardado(b._guardadoEn)}</span>
                                </div>

                                <h3 className='bor-card-nombre'>{b.nombre || 'Sin nombre'}</h3>
                                {b.tipo_evento && (
                                    <span className='bor-tipo-badge'>
                                        {EMOJI_TIPO[b.tipo_evento] || '✨'} {b.tipo_evento.charAt(0).toUpperCase() + b.tipo_evento.slice(1)}
                                    </span>
                                )}

                                <div className='bor-card-meta'>
                                    {b.salon && (
                                        <div className='bor-meta-row'>
                                            <FiMapPin size={13}/>
                                            <span>{b.salon || b.bodega_nombre || '—'}</span>
                                        </div>
                                    )}
                                    {b.fecha && (
                                        <div className='bor-meta-row'>
                                            <FiCalendar size={13}/>
                                            <span>{formatFecha(b.fecha)}</span>
                                        </div>
                                    )}
                                    {(precioAlq != null || precioEntr != null) && (
                                        <div className='bor-meta-row'>
                                            <FiDollarSign size={13}/>
                                            <span>
                                                {precioAlq != null && (
                                                    <span>Alquiler: <strong>${Number(precioAlq).toLocaleString('es-AR')}</strong></span>
                                                )}
                                                {precioAlq != null && precioEntr != null && ' · '}
                                                {precioEntr != null && (
                                                    <span>Entrada: <strong>${precioEntr.toLocaleString('es-AR')}</strong></span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {nServicios > 0 && (
                                        <div className='bor-meta-row'>
                                            <FiShoppingBag size={13}/>
                                            <span>{nServicios} servicio{nServicios !== 1 ? 's' : ''} adicional{nServicios !== 1 ? 'es' : ''}</span>
                                        </div>
                                    )}
                                    {b.cupo && (
                                        <div className='bor-meta-row'>
                                            <span className='bor-meta-icon'>👥</span>
                                            <span>{Number(b.cupo).toLocaleString('es-AR')} invitados</span>
                                        </div>
                                    )}
                                </div>

                                {/* Lista de servicios si los hay */}
                                {nServicios > 0 && (
                                    <div className='bor-servicios'>
                                        {b._servicios.map((s, i) => (
                                            <span key={i} className='bor-serv-tag'>{s.nombre}</span>
                                        ))}
                                    </div>
                                )}

                                <div className='bor-card-acciones'>
                                    <button
                                        className='bor-btn-eliminar'
                                        onClick={() => eliminar(b.id_evento)}
                                        title='Eliminar borrador'
                                    >
                                        <FiTrash2 size={14}/>
                                    </button>
                                    <button
                                        className='bor-btn-restaurar'
                                        onClick={() => restaurar(b)}
                                    >
                                        <FiRotateCcw size={14}/> Restaurar y continuar
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default BorradoresScreen
