import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getTerminosConsumidor } from '../../services/contratoServices'
import { FiShield, FiCheckCircle, FiX, FiAlertTriangle, FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import './TerminosConsumidorGate.css'

// Divide el texto de los términos en secciones (separadas por líneas de guiones/iguales).
// Cada sección: { titulo (primera línea), cuerpo (resto) }.
const parseSecciones = (texto) => {
    if (!texto) return []
    return texto
        .split(/\n[-=]{10,}\n/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => {
            const lineas = p.split('\n')
            return { titulo: lineas[0].trim(), cuerpo: lineas.slice(1).join('\n').trim() }
        })
}

// Gate de aceptación del consumidor: abre un modal paso a paso (wizard) con las bases
// y condiciones. Se avanza con Siguiente/Anterior y se acepta en el último paso.
const TerminosConsumidorGate = ({ checked, onChange }) => {
    const [terms, setTerms]           = useState(null)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [paso, setPaso]             = useState(0)
    const [tildado, setTildado]       = useState(!!checked)

    useEffect(() => { getTerminosConsumidor().then(setTerms).catch(() => {}) }, [])
    useEffect(() => { setTildado(!!checked) }, [checked])

    const secciones = useMemo(() => parseSecciones(terms?.texto_terminos), [terms])
    const total = secciones.length
    const esUltimo = paso >= total - 1
    const seccion = secciones[paso]
    const esCancelacion = /CANCELACI[ÓO]N/i.test(seccion?.titulo || '')

    const abrir = () => { setPaso(0); setTildado(!!checked); setModalAbierto(true) }
    const confirmar = () => { onChange(true); setModalAbierto(false) }

    return (
        <div className='tcg'>
            {checked ? (
                <div className='tcg-aceptado'>
                    <FiCheckCircle size={16} />
                    <span>Bases y condiciones aceptadas</span>
                    <button type='button' className='tcg-link' onClick={() => onChange(false)}>Revocar</button>
                </div>
            ) : (
                <button type='button' className='tcg-abrir' onClick={abrir}>
                    <FiShield size={15} /> Ver y aceptar bases y condiciones
                </button>
            )}

            {modalAbierto && total > 0 && createPortal(
                <div className='tcg-overlay' onClick={e => { if (e.target === e.currentTarget) setModalAbierto(false) }}>
                    <div className='tcg-modal'>
                        <div className='tcg-modal-header'>
                            <div className='tcg-modal-titulo'>
                                <FiShield size={18} />
                                <div>
                                    <h3>Bases y condiciones</h3>
                                    <span className='tcg-paso-num'>Paso {paso + 1} de {total}</span>
                                </div>
                            </div>
                            <button type='button' className='tcg-modal-cerrar' onClick={() => setModalAbierto(false)}><FiX size={20} /></button>
                        </div>

                        {/* Barra de progreso por pasos */}
                        <div className='tcg-progress'>
                            <div className='tcg-progress-fill' style={{ width: `${((paso + 1) / total) * 100}%` }} />
                        </div>

                        <div className='tcg-modal-body' key={paso}>
                            <h4 className='tcg-seccion-titulo'>{seccion?.titulo}</h4>

                            {esCancelacion && (
                                <>
                                    <div className='tcg-callout'>
                                        <FiAlertTriangle size={15} />
                                        <div>
                                            <b>Fuerza mayor</b> (catástrofe, fallecimiento, prohibición estatal): reembolso <b>100%</b>.<br/>
                                            <b>Arrepentimiento</b> (10 días desde la compra, Ley 24.240): reembolso <b>100%</b>.
                                        </div>
                                    </div>
                                    <table className='tcg-tabla'>
                                        <thead><tr><th>Cuándo cancelás</th><th>Reembolso</th></tr></thead>
                                        <tbody>
                                            {(terms?.politica_cancelacion || []).map((t, i) => (
                                                <tr key={i}><td>{t.rango}</td><td><b>{t.reembolso}%</b></td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {seccion?.cuerpo && <pre className='tcg-seccion-cuerpo'>{seccion.cuerpo}</pre>}
                        </div>

                        <div className='tcg-modal-footer'>
                            {esUltimo && (
                                <label className='tcg-check'>
                                    <input type='checkbox' checked={tildado} onChange={e => setTildado(e.target.checked)} />
                                    <span>He leído y <b>acepto</b> las bases y condiciones y la política de cancelación y reembolso.</span>
                                </label>
                            )}
                            <div className='tcg-nav'>
                                <button type='button' className='tcg-btn-nav' disabled={paso === 0} onClick={() => setPaso(p => Math.max(0, p - 1))}>
                                    <FiArrowLeft size={15} /> Anterior
                                </button>
                                {!esUltimo ? (
                                    <button type='button' className='tcg-btn-nav tcg-btn-nav--primary' onClick={() => setPaso(p => Math.min(total - 1, p + 1))}>
                                        Siguiente <FiArrowRight size={15} />
                                    </button>
                                ) : (
                                    <button type='button' className='tcg-btn-aceptar' disabled={!tildado} onClick={confirmar}>
                                        <FiCheckCircle size={16} /> Aceptar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default TerminosConsumidorGate
