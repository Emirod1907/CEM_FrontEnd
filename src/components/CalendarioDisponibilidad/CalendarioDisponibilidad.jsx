import React, { useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import './CalendarioDisponibilidad.css'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const CalendarioDisponibilidad = ({ fechasReservadas = [], onSelectFecha, fechaSeleccionada }) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const [mesActual, setMesActual] = useState(hoy.getMonth())
    const [anioActual, setAnioActual] = useState(hoy.getFullYear())

    const irMesAnterior = () => {
        if (mesActual === 0) {
            setMesActual(11)
            setAnioActual(a => a - 1)
        } else {
            setMesActual(m => m - 1)
        }
    }

    const irMesSiguiente = () => {
        if (mesActual === 11) {
            setMesActual(0)
            setAnioActual(a => a + 1)
        } else {
            setMesActual(m => m + 1)
        }
    }

    const formatFecha = (year, month, day) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const primerDiaMes = new Date(anioActual, mesActual, 1).getDay()
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()

    const celdas = []

    for (let i = 0; i < primerDiaMes; i++) {
        celdas.push(<div key={`vacio-${i}`} className="cal-dia cal-vacio" />)
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaStr = formatFecha(anioActual, mesActual, dia)
        const fechaDate = new Date(anioActual, mesActual, dia)
        const esReservada = fechasReservadas.includes(fechaStr)
        const esPasada = fechaDate < hoy
        const esHoy = fechaDate.getTime() === hoy.getTime()
        const esSeleccionada = fechaStr === fechaSeleccionada

        let clases = 'cal-dia'
        if (esPasada) clases += ' cal-pasada'
        else if (esReservada) clases += ' cal-reservada'
        else clases += ' cal-disponible'
        if (esHoy) clases += ' cal-hoy'
        if (esSeleccionada) clases += ' cal-seleccionada'

        const handleClickDia = () => {
            if (!esPasada && !esReservada && onSelectFecha) {
                onSelectFecha(fechaStr)
            }
        }

        const titulo = esReservada
            ? 'No disponible — ya reservada'
            : esPasada
            ? 'No disponible — fecha pasada'
            : 'Disponible — clic para seleccionar'

        celdas.push(
            <div
                key={fechaStr}
                className={clases}
                onClick={handleClickDia}
                title={titulo}
            >
                {dia}
            </div>
        )
    }

    return (
        <div className="calendario-container">
            <div className="calendario-header">
                <button type="button" onClick={irMesAnterior} className="cal-nav-btn">
                    <FaChevronLeft />
                </button>
                <h3 className="cal-titulo-mes">{MESES[mesActual]} {anioActual}</h3>
                <button type="button" onClick={irMesSiguiente} className="cal-nav-btn">
                    <FaChevronRight />
                </button>
            </div>

            <div className="calendario-leyenda">
                <span className="leyenda-item leyenda-disponible">Disponible</span>
                <span className="leyenda-item leyenda-no-disponible">No disponible</span>
            </div>

            <div className="calendario-dias-semana">
                {DIAS_SEMANA.map(d => (
                    <div key={d} className="cal-dia-semana">{d}</div>
                ))}
            </div>

            <div className="calendario-grid">
                {celdas}
            </div>

            {fechaSeleccionada && (
                <p className="cal-fecha-elegida">
                    Fecha seleccionada: <strong>{fechaSeleccionada}</strong>
                </p>
            )}
        </div>
    )
}

export default CalendarioDisponibilidad
