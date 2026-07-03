import React, { useCallback } from 'react'
import './TimePicker24.css'

// Selector de hora en formato 24h con dos inputs numéricos (HH:MM),
// independiente del locale del sistema (evita el AM/PM de <input type="time">).
//   value: 'HH:MM' | ''
//   onChange(nuevoValor: 'HH:MM')
const TimePicker24 = ({ value, onChange, className = '' }) => {
    const [hh, mm] = (value || '').split(':')
    const horas   = hh !== undefined && hh !== '' ? parseInt(hh, 10) : ''
    const minutos = mm !== undefined && mm !== '' ? parseInt(mm, 10) : ''

    const emit = useCallback((h, m) => {
        onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }, [onChange])

    const onChangeH = (e) => {
        const h = Math.min(23, Math.max(0, Number(e.target.value) || 0))
        emit(h, minutos !== '' ? minutos : 0)
    }
    const onChangeM = (e) => {
        const m = Math.min(59, Math.max(0, Number(e.target.value) || 0))
        emit(horas !== '' ? horas : 0, m)
    }

    return (
        <div className={`tp24 ${className}`}>
            <input
                type="number" min={0} max={23} placeholder="HH"
                value={horas === '' ? '' : String(horas).padStart(2, '0')}
                onChange={onChangeH}
                onBlur={(e) => { if (e.target.value === '') emit(0, minutos !== '' ? minutos : 0) }}
                className="tp24-num"
            />
            <span className="tp24-sep">:</span>
            <input
                type="number" min={0} max={59} placeholder="MM"
                value={minutos === '' ? '' : String(minutos).padStart(2, '0')}
                onChange={onChangeM}
                onBlur={(e) => { if (e.target.value === '') emit(horas !== '' ? horas : 0, 0) }}
                className="tp24-num"
            />
        </div>
    )
}

export default TimePicker24
