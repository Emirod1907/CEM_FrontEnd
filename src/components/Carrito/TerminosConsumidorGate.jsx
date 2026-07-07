import React, { useEffect, useState } from 'react'
import { getTerminosConsumidor } from '../../services/contratoServices'
import { FiShield, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import './TerminosConsumidorGate.css'

// Gate de aceptación del consumidor mostrado en el checkout ANTES de pagar
// (información previa clara, Ley 24.240). El padre controla el estado `checked`.
const TerminosConsumidorGate = ({ checked, onChange }) => {
    const [terms, setTerms]   = useState(null)
    const [abierto, setAbierto] = useState(false)

    useEffect(() => {
        getTerminosConsumidor().then(setTerms).catch(() => {})
    }, [])

    return (
        <div className='tcg'>
            <label className='tcg-check'>
                <input type='checkbox' checked={checked} onChange={e => onChange(e.target.checked)} />
                <span>
                    <FiShield size={13} /> Acepto las <b>bases y condiciones</b> y la <b>política de cancelación y reembolso</b>.
                </span>
            </label>

            <button type='button' className='tcg-toggle' onClick={() => setAbierto(v => !v)}>
                {abierto ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                {abierto ? 'Ocultar' : 'Ver'} política de cancelación
            </button>

            {abierto && terms && (
                <div className='tcg-detalle'>
                    <p className='tcg-nota'>
                        <b>Fuerza mayor</b> (catástrofe, fallecimiento, prohibición estatal): reembolso <b>100%</b>.<br/>
                        <b>Arrepentimiento</b> (10 días desde la compra, Ley 24.240): reembolso <b>100%</b>.
                    </p>
                    <table className='tcg-tabla'>
                        <thead><tr><th>Cancelación voluntaria</th><th>Reembolso</th></tr></thead>
                        <tbody>
                            {terms.politica_cancelacion?.map((t, i) => (
                                <tr key={i}><td>{t.rango}</td><td><b>{t.reembolso}%</b></td></tr>
                            ))}
                        </tbody>
                    </table>
                    <details className='tcg-texto'>
                        <summary>Ver texto completo de las bases y condiciones</summary>
                        <pre>{terms.texto_terminos}</pre>
                    </details>
                </div>
            )}
        </div>
    )
}

export default TerminosConsumidorGate
