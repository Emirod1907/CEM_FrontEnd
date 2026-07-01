/**
 * SugeridosSection — muestra los combos (salon + servicios) mejor valorados.
 * Se coloca al inicio del CreateEventoForm para que el organizador pueda
 * aplicar una configuración de un solo click.
 *
 * Props:
 *   onAplicar(salon, servicios) — pre-llena el form con salon y servicios del sugerido
 */
import React, { useEffect, useState } from 'react'
import { getRecomendados } from '../../services/valoracionServices'
import { FiStar, FiZap, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import './SugeridosSection.css'

const StarDisplay = ({ value }) => (
    <span className='sug-stars'>
        {[1,2,3,4,5].map(n => (
            <FiStar
                key={n}
                size={12}
                fill={n <= Math.round(value) ? 'currentColor' : 'none'}
                className={n <= Math.round(value) ? 'sug-star-on' : 'sug-star-off'}
            />
        ))}
        <span className='sug-star-val'>{Number(value).toFixed(1)}</span>
    </span>
)

const SugeridosSection = ({ onAplicar }) => {
    const [recomendados, setRecomendados] = useState([])
    const [cargando, setCargando]         = useState(true)
    const [expandido, setExpandido]       = useState(false)

    useEffect(() => {
        getRecomendados()
            .then(data => { setRecomendados(data); setCargando(false) })
            .catch(() => setCargando(false))
    }, [])

    if (cargando || recomendados.length === 0) return null

    const visibles = expandido ? recomendados : recomendados.slice(0, 2)

    return (
        <div className='sug-section'>
            <div className='sug-titulo-row'>
                <FiZap size={16} className='sug-titulo-icon'/>
                <h3 className='sug-titulo'>Tu evento ideal</h3>
                <span className='sug-subtitulo'>Combinaciones mejor valoradas por otros organizadores</span>
            </div>

            <div className='sug-grid'>
                {visibles.map((rec, i) => {
                    const salon = rec.salon
                    return (
                        <div key={i} className='sug-card'>
                            {salon.imagen && (
                                <img src={salon.imagen} alt={salon.nombre} className='sug-card-img'/>
                            )}
                            <div className='sug-card-body'>
                                <div className='sug-card-top'>
                                    <span className='sug-rank'>#{i + 1}</span>
                                    <span className='sug-salon-nombre'>{salon.nombre}</span>
                                    <StarDisplay value={rec.avgSalon}/>
                                </div>

                                {rec.servicios.length > 0 && (
                                    <div className='sug-servicios'>
                                        {rec.servicios.map((s, j) => (
                                            <span key={j} className='sug-serv-tag'>{s.nombre}</span>
                                        ))}
                                    </div>
                                )}

                                <div className='sug-card-footer'>
                                    <div className='sug-score'>
                                        <FiStar size={12} fill='currentColor'/>
                                        <span>Score {rec.score}/5</span>
                                        <span className='sug-conteo'>· {rec.conteo} evento{rec.conteo !== 1 ? 's' : ''}</span>
                                    </div>
                                    {salon.localidad && (
                                        <span className='sug-localidad'>{salon.localidad}</span>
                                    )}
                                </div>

                                <button
                                    type='button'
                                    className='sug-btn-aplicar'
                                    onClick={() => onAplicar(salon, rec.servicios)}
                                >
                                    <FiZap size={13}/> Aplicar esta configuración
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {recomendados.length > 2 && (
                <button
                    type='button'
                    className='sug-btn-ver-mas'
                    onClick={() => setExpandido(v => !v)}
                >
                    {expandido
                        ? <><FiChevronUp size={14}/> Ver menos</>
                        : <><FiChevronDown size={14}/> Ver {recomendados.length - 2} más</>
                    }
                </button>
            )}
        </div>
    )
}

export default SugeridosSection
