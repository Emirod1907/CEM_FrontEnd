import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getTerminosConsumidor } from '../../services/contratoServices'
import { FiShield, FiCheckCircle, FiX, FiAlertTriangle } from 'react-icons/fi'
import './TerminosConsumidorGate.css'

// Gate de aceptación del consumidor mostrado en el checkout ANTES de pagar
// (información previa clara, Ley 24.240). Abre un modal para leer y aceptar.
const TerminosConsumidorGate = ({ checked, onChange }) => {
    const [terms, setTerms]           = useState(null)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [tildado, setTildado]       = useState(!!checked)

    useEffect(() => { getTerminosConsumidor().then(setTerms).catch(() => {}) }, [])
    useEffect(() => { setTildado(!!checked) }, [checked])

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
                <button type='button' className='tcg-abrir' onClick={() => setModalAbierto(true)}>
                    <FiShield size={15} /> Ver y aceptar bases y condiciones
                </button>
            )}

            {modalAbierto && createPortal(
                <div className='tcg-overlay' onClick={e => { if (e.target === e.currentTarget) setModalAbierto(false) }}>
                    <div className='tcg-modal'>
                        <div className='tcg-modal-header'>
                            <div className='tcg-modal-titulo'>
                                <FiShield size={18} />
                                <h3>Bases y condiciones</h3>
                            </div>
                            <button type='button' className='tcg-modal-cerrar' onClick={() => setModalAbierto(false)}><FiX size={20} /></button>
                        </div>

                        <div className='tcg-modal-body'>
                            <div className='tcg-callout'>
                                <FiAlertTriangle size={15} />
                                <div>
                                    <b>Fuerza mayor</b> (catástrofe, fallecimiento, prohibición estatal): reembolso <b>100%</b>.<br/>
                                    <b>Arrepentimiento</b> (10 días desde la compra, Ley 24.240): reembolso <b>100%</b>.
                                </div>
                            </div>

                            <h4 className='tcg-subtitulo'>Cancelación voluntaria — reembolso por anticipación</h4>
                            <table className='tcg-tabla'>
                                <thead><tr><th>Cuándo cancelás</th><th>Reembolso</th></tr></thead>
                                <tbody>
                                    {(terms?.politica_cancelacion || []).map((t, i) => (
                                        <tr key={i}><td>{t.rango}</td><td><b>{t.reembolso}%</b></td></tr>
                                    ))}
                                </tbody>
                            </table>

                            {terms?.texto_terminos && (
                                <details className='tcg-texto'>
                                    <summary>Ver texto completo de las bases y condiciones</summary>
                                    <pre>{terms.texto_terminos}</pre>
                                </details>
                            )}
                        </div>

                        <div className='tcg-modal-footer'>
                            <label className='tcg-check'>
                                <input type='checkbox' checked={tildado} onChange={e => setTildado(e.target.checked)} />
                                <span>He leído y <b>acepto</b> las bases y condiciones y la política de cancelación y reembolso.</span>
                            </label>
                            <button type='button' className='tcg-btn-aceptar' disabled={!tildado} onClick={confirmar}>
                                <FiCheckCircle size={16} /> Aceptar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default TerminosConsumidorGate
