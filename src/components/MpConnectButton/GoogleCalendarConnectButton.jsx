import React, { useEffect, useState } from 'react'
import { getGoogleCalendarStatus, disconnectGoogleCalendar, googleCalendarConnectUrl } from '../../services/salonesServices'
import { FiCalendar } from 'react-icons/fi'
import './MpConnectButton.css'

// Botón reutilizable para conectar/desconectar Google Calendar (dueño de salón o
// proveedor). `origen` define a qué pantalla vuelve el callback (mi-salon / mis-servicios).
const GoogleCalendarConnectButton = ({ origen = 'mi-salon', className = '' }) => {
    const [conectado, setConectado] = useState(false)
    const [cargando, setCargando]   = useState(false)

    useEffect(() => {
        getGoogleCalendarStatus().then(setConectado)
        const cal = new URLSearchParams(window.location.search).get('calendar')
        if (cal === 'conectado') {
            getGoogleCalendarStatus().then(setConectado)
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [])

    const toggle = async () => {
        if (conectado) {
            setCargando(true)
            try { await disconnectGoogleCalendar(); setConectado(false) } finally { setCargando(false) }
        } else {
            window.location.href = googleCalendarConnectUrl(origen)
        }
    }

    return (
        <button
            className={`mp-connect-btn gcal-connect-btn ${conectado ? 'conectado' : ''} ${className}`}
            onClick={toggle}
            disabled={cargando}
            title={conectado
                ? 'Google Calendar conectado. Clic para desconectar.'
                : 'Conectá tu Google Calendar para sincronizar tu agenda'}
        >
            <FiCalendar size={14} /> {conectado ? 'Calendar ✓' : 'Google Calendar'}
        </button>
    )
}

export default GoogleCalendarConnectButton
