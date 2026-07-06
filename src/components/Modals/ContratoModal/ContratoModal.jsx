import React, { useEffect, useState } from 'react'
import { FiX, FiCheck, FiFileText } from 'react-icons/fi'
import { getTerminosActuales, aceptarContrato } from '../../../services/contratoServices'
import './ContratoModal.css'

const ContratoModal = ({ onClose, onAceptado, ambito = 'salon', motivoComision = false }) => {
    const [terminos, setTerminos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [aceptando, setAceptando] = useState(false)
    const [leido, setLeido] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        getTerminosActuales()
            .then(setTerminos)
            .catch(() => setError('No se pudieron cargar los términos. Intentá de nuevo.'))
            .finally(() => setCargando(false))
    }, [])

    const handleAceptar = async () => {
        if (!leido) return
        setAceptando(true)
        setError(null)
        try {
            await aceptarContrato(ambito)
            onAceptado()
        } catch (err) {
            const msg = err?.response?.data?.message ?? 'Error al registrar la aceptación.'
            if (err?.response?.status === 409) {
                onAceptado()
            } else {
                setError(msg)
                setAceptando(false)
            }
        }
    }

    return (
        <div className='contrato-overlay' onClick={onClose}>
            <div className='contrato-dialog' onClick={e => e.stopPropagation()}>
                <div className='contrato-header'>
                    <div className='contrato-header-title'>
                        <FiFileText size={20} />
                        <span>Términos y Condiciones</span>
                    </div>
                    <button className='contrato-close-btn' onClick={onClose} title='Cerrar'>
                        <FiX size={18} />
                    </button>
                </div>

                <div className='contrato-body'>
                    {cargando && <p className='contrato-loading'>Cargando términos...</p>}

                    {!cargando && motivoComision && (
                        <p className='contrato-aviso-comision'>
                            La comisión de tu contrato fue actualizada por la administración.
                            Revisá y aceptá los nuevos términos para que se apliquen a tus precios.
                        </p>
                    )}

                    {!cargando && terminos && (
                        <>
                            <div className='contrato-meta'>
                                <span>Versión {terminos.version}</span>
                                <span>Comisión cliente: <strong>{terminos.comision_cliente_porcentaje}%</strong></span>
                                <span>Comisión proveedor: <strong>{terminos.comision_proveedor_porcentaje}%</strong></span>
                            </div>
                            <pre className='contrato-texto'>{terminos.texto_terminos}</pre>
                        </>
                    )}

                    {error && <p className='contrato-error'>{error}</p>}
                </div>

                <div className='contrato-footer'>
                    <label className='contrato-checkbox-label'>
                        <input
                            type='checkbox'
                            checked={leido}
                            onChange={e => setLeido(e.target.checked)}
                            disabled={cargando || aceptando}
                        />
                        He leído y acepto los términos y condiciones
                    </label>

                    <div className='contrato-footer-btns'>
                        <button className='contrato-btn contrato-btn--cancel' onClick={onClose} disabled={aceptando}>
                            Cancelar
                        </button>
                        <button
                            className='contrato-btn contrato-btn--accept'
                            onClick={handleAceptar}
                            disabled={!leido || cargando || aceptando}
                        >
                            {aceptando ? 'Registrando...' : (
                                <><FiCheck size={16} /> Acepto</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ContratoModal
