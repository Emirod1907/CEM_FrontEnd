import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { validarQR } from '../../../services/invitacionServices'
import { FiCheckCircle, FiXCircle, FiSearch, FiUser, FiCalendar, FiRefreshCw } from 'react-icons/fi'
import './ValidarEntradaScreen.css'

const ValidarEntradaScreen = () => {
    const [searchParams] = useSearchParams()
    const [token, setToken] = useState('')
    const [validando, setValidando] = useState(false)
    const [resultado, setResultado] = useState(null) // { valido, message, nombre_invitado, evento, ... }
    const [historial, setHistorial] = useState([])

    // Si viene por URL (?token=...) desde el QR escaneado, auto-validar
    useEffect(() => {
        const tokenParam = searchParams.get('token')
        if (tokenParam) {
            setToken(tokenParam)
            handleValidar(tokenParam)
        }
    }, [])

    const handleValidar = async (tokenAValidar) => {
        const t = (tokenAValidar || token).trim()
        if (!t) return

        setValidando(true)
        setResultado(null)
        try {
            const data = await validarQR(t)
            setResultado({ ...data, timestamp: new Date() })
            if (data.valido) {
                setHistorial(prev => [{
                    nombre: data.nombre_invitado,
                    evento: data.evento,
                    timestamp: new Date(),
                    valido: true
                }, ...prev].slice(0, 20))
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Error al validar'
            const yaUsado = err?.response?.status === 409
            setResultado({
                valido: false,
                message: msg,
                nombre_invitado: err?.response?.data?.nombre_invitado,
                timestamp: new Date(),
                yaUsado
            })
        } finally {
            setValidando(false)
        }
    }

    const handleReset = () => {
        setResultado(null)
        setToken('')
    }

    const formatHora = (date) => {
        if (!date) return ''
        return new Date(date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    return (
        <div className='validar-container'>
            <div className='validar-panel'>

                {/* Header */}
                <div className='validar-header'>
                    <h1>Dream Events</h1>
                    <p>Validador de entradas</p>
                </div>

                {/* Formulario de validación */}
                <div className='validar-body'>
                    <p className='validar-instruccion'>
                        Escaneá el QR de la entrada con la cámara de tu dispositivo, o ingresá el token manualmente.
                    </p>

                    <div className='validar-input-grupo'>
                        <input
                            type='text'
                            value={token}
                            onChange={e => { setToken(e.target.value); setResultado(null) }}
                            placeholder='Pegá el token del QR aquí...'
                            className='validar-input'
                            onKeyDown={e => e.key === 'Enter' && handleValidar()}
                            disabled={validando}
                        />
                        <button
                            className='validar-btn'
                            onClick={() => handleValidar()}
                            disabled={validando || !token.trim()}
                        >
                            {validando
                                ? <><span className='validar-spinner-sm' /> Validando...</>
                                : <><FiSearch size={17} /> Validar</>
                            }
                        </button>
                    </div>

                    {/* Resultado */}
                    {resultado && (
                        <div className={`validar-resultado ${resultado.valido ? 'resultado-ok' : 'resultado-error'}`}>
                            {resultado.valido ? (
                                <>
                                    <FiCheckCircle size={48} className='resultado-icono-ok' />
                                    <h2>✅ Acceso habilitado</h2>
                                    <div className='resultado-datos'>
                                        <div className='resultado-fila'>
                                            <FiUser size={15} />
                                            <span>{resultado.nombre_invitado}</span>
                                        </div>
                                        {resultado.evento && (
                                            <div className='resultado-fila'>
                                                <FiCalendar size={15} />
                                                <span>{resultado.evento}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className='resultado-hora'>Validado a las {formatHora(resultado.timestamp)}</p>
                                </>
                            ) : (
                                <>
                                    <FiXCircle size={48} className='resultado-icono-error' />
                                    <h2>🚫 Acceso denegado</h2>
                                    <p className='resultado-msg'>{resultado.message}</p>
                                    {resultado.nombre_invitado && (
                                        <p className='resultado-msg-sub'>Invitado: {resultado.nombre_invitado}</p>
                                    )}
                                </>
                            )}
                            <button className='validar-btn-nuevo' onClick={handleReset}>
                                <FiRefreshCw size={15} /> Validar otra entrada
                            </button>
                        </div>
                    )}
                </div>

                {/* Historial */}
                {historial.length > 0 && (
                    <div className='validar-historial'>
                        <h4>Accesos registrados hoy ({historial.length})</h4>
                        <div className='historial-lista'>
                            {historial.map((h, i) => (
                                <div key={i} className='historial-item'>
                                    <FiCheckCircle size={13} className='historial-icono' />
                                    <span className='historial-nombre'>{h.nombre}</span>
                                    <span className='historial-hora'>{formatHora(h.timestamp)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ValidarEntradaScreen
