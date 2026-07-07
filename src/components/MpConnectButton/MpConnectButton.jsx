import React, { useEffect, useState } from 'react'
import { getMpStatus, disconnectMp, mpConnectUrl } from '../../services/salonesServices'
import { FiDollarSign } from 'react-icons/fi'
import './MpConnectButton.css'

// Botón reutilizable para conectar/desconectar la cuenta de MercadoPago del vendedor
// (dueño de salón o proveedor). Reusa las rutas /api/salones/mp/* (persona-based).
const MpConnectButton = ({ className = '' }) => {
    const [conectado, setConectado] = useState(false)
    const [cargando, setCargando]   = useState(false)

    useEffect(() => {
        getMpStatus().then(s => setConectado(s.connected))
        const mp = new URLSearchParams(window.location.search).get('mp')
        if (mp === 'conectado') {
            getMpStatus().then(s => setConectado(s.connected))
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [])

    const toggle = async () => {
        if (conectado) {
            setCargando(true)
            try { await disconnectMp(); setConectado(false) } finally { setCargando(false) }
        } else {
            window.location.href = mpConnectUrl()
        }
    }

    return (
        <button
            className={`mp-connect-btn ${conectado ? 'conectado' : ''} ${className}`}
            onClick={toggle}
            disabled={cargando}
            title={conectado
                ? 'MercadoPago conectado: cobrás tu parte directo en tu cuenta. Clic para desvincular.'
                : 'Conectá tu MercadoPago para cobrar directo en tu cuenta'}
        >
            <FiDollarSign size={14} /> {conectado ? 'MercadoPago ✓' : 'Conectar MercadoPago'}
        </button>
    )
}

export default MpConnectButton
