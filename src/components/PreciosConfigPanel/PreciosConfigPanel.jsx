import React from 'react'
import { FiCalendar, FiClock, FiPlus, FiX } from 'react-icons/fi'
import TimePicker24 from '../TimePicker24/TimePicker24'
import './PreciosConfigPanel.css'

const PreciosConfigPanel = ({
    config = {},
    onChange,
    dark = false,
    precioBase,
    showHoraToggle = false,
    showHorario = false, // horarios de apertura/cierre (solo salones)
    tipoPrecio = null,   // 'fijo' | 'por_persona' | 'por_hora' | 'por_turno'
}) => {
    const upd = (key, val) => onChange({ ...config, [key]: val })
    const updMulti = (obj) => onChange({ ...config, ...obj })

    const modoFinSemana = config.fin_semana_modo === 'pct' ? 'pct' : 'monto'
    const modoFeriado   = config.feriado_modo   === 'pct' ? 'pct' : 'monto'

    // Total resultante de aplicar el % de incremento sobre el precio base
    const totalConPct = (pct) => {
        const base = Number(precioBase)
        if (!(base > 0) || pct == null || pct === '') return null
        return +(base * (1 + Number(pct) / 100)).toFixed(2)
    }

    return (
        <div className={`pcp-panel ${dark ? 'pcp-dark' : 'pcp-light'}`}>

            {/* ── Horario de atención (los eventos se desarrollan dentro de esta franja) ── */}
            {showHorario && (
                <div className='pcp-section'>
                    <div className='pcp-section-title'>
                        <FiClock size={13}/>
                        <span>Horario de atención</span>
                        <span className='pcp-section-hint'>Franja en la que pueden desarrollarse los eventos</span>
                    </div>
                    <div className='pcp-grid-2'>
                        <div className='pcp-field'>
                            <label className='pcp-label'>
                                Desde
                                <span className='pcp-sublabel'>inicio de atención</span>
                            </label>
                            <TimePicker24
                                value={config.horario_apertura ?? ''}
                                onChange={v => upd('horario_apertura', v || null)}
                                className={dark ? 'tp24--dark' : ''}
                            />
                        </div>
                        <div className='pcp-field'>
                            <label className='pcp-label'>
                                Hasta
                                <span className='pcp-sublabel'>fin de atención</span>
                            </label>
                            <TimePicker24
                                value={config.horario_cierre ?? ''}
                                onChange={v => upd('horario_cierre', v || null)}
                                className={dark ? 'tp24--dark' : ''}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Check-in: apertura y cierre literal para RECIBIR reservas ── */}
            {showHorario && (
                <div className='pcp-section'>
                    <div className='pcp-section-title'>
                        <FiClock size={13}/>
                        <span>Check-in de reservas</span>
                        <span className='pcp-section-hint'>Apertura y cierre del salón para el ingreso: las reservas solo pueden iniciar dentro de esta franja</span>
                    </div>
                    <div className='pcp-grid-2'>
                        <div className='pcp-field'>
                            <label className='pcp-label'>
                                Apertura
                                <span className='pcp-sublabel'>primer check-in</span>
                            </label>
                            <TimePicker24
                                value={config.checkin_desde ?? ''}
                                onChange={v => upd('checkin_desde', v || null)}
                                className={dark ? 'tp24--dark' : ''}
                            />
                        </div>
                        <div className='pcp-field'>
                            <label className='pcp-label'>
                                Cierre
                                <span className='pcp-sublabel'>último check-in</span>
                            </label>
                            <TimePicker24
                                value={config.checkin_hasta ?? ''}
                                onChange={v => upd('checkin_hasta', v || null)}
                                className={dark ? 'tp24--dark' : ''}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Precio por tramos horarios (3hs → $X, 4hs → $Y) ── */}
            {showHorario && !config.por_hora && (
                <div className='pcp-section'>
                    <div className='pcp-section-title'>
                        <FiClock size={13}/>
                        <span>Precio por tramos horarios</span>
                        <span className='pcp-section-hint'>Precio total según la duración del evento. Sin tramos se usa el precio base</span>
                    </div>

                    {(config.tramos_horarios || []).map((tr, i) => (
                        <div key={i} className='pcp-turno-option-row'>
                            <div className='pcp-turno-option-num'>{i + 1}</div>
                            <div className='pcp-field pcp-field--compact'>
                                <label className='pcp-label'>
                                    Duración
                                    <span className='pcp-sublabel'>horas</span>
                                </label>
                                <div className='pcp-input-row'>
                                    <input
                                        type='number'
                                        min='1'
                                        max='24'
                                        step='1'
                                        className='pcp-input'
                                        style={{ paddingLeft: 10 }}
                                        value={tr.horas ?? ''}
                                        placeholder='3'
                                        onChange={e => {
                                            const arr = [...(config.tramos_horarios || [])]
                                            arr[i] = { ...arr[i], horas: e.target.value === '' ? null : Number(e.target.value) }
                                            upd('tramos_horarios', arr)
                                        }}
                                    />
                                    <span className='pcp-input-suffix'>hs</span>
                                </div>
                            </div>
                            <div className='pcp-field pcp-field--compact'>
                                <label className='pcp-label'>
                                    Precio del tramo
                                    <span className='pcp-sublabel'>monto total</span>
                                </label>
                                <div className='pcp-input-row'>
                                    <span className='pcp-signo'>$</span>
                                    <input
                                        type='number'
                                        min='0'
                                        step='0.01'
                                        className='pcp-input'
                                        value={tr.precio ?? ''}
                                        placeholder={precioBase ?? '0'}
                                        onChange={e => {
                                            const arr = [...(config.tramos_horarios || [])]
                                            arr[i] = { ...arr[i], precio: e.target.value === '' ? null : Number(e.target.value) }
                                            upd('tramos_horarios', arr)
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                type='button'
                                className='pcp-turno-option-del'
                                onClick={() => upd('tramos_horarios', (config.tramos_horarios || []).filter((_, j) => j !== i))}
                                title='Eliminar tramo'
                            >
                                <FiX size={14}/>
                            </button>
                        </div>
                    ))}

                    <button
                        type='button'
                        className='pcp-turno-add-btn'
                        onClick={() => upd('tramos_horarios', [...(config.tramos_horarios || []), { horas: null, precio: null }])}
                    >
                        <FiPlus size={13}/> Agregar tramo
                    </button>
                </div>
            )}

            {/* ── Opciones de turno (solo cuando tipo_precio = por_turno) ── */}
            {tipoPrecio === 'por_turno' && (
                <div className='pcp-section'>
                    <div className='pcp-section-title'>
                        <FiClock size={13}/>
                        <span>Opciones de turno</span>
                        <span className='pcp-section-hint'>Cada opción puede tener distinta duración y precio</span>
                    </div>

                    {(config.opciones_turno || []).map((op, i) => (
                        <div key={i} className='pcp-turno-option-row'>
                            <div className='pcp-turno-option-num'>{i + 1}</div>
                            <div className='pcp-field pcp-field--compact'>
                                <label className='pcp-label'>
                                    Duración
                                    <span className='pcp-sublabel'>horas</span>
                                </label>
                                <div className='pcp-input-row'>
                                    <input
                                        type='number'
                                        min='0.5'
                                        max='24'
                                        step='0.5'
                                        className='pcp-input'
                                        style={{ paddingLeft: 10 }}
                                        value={op.horas ?? ''}
                                        placeholder='4'
                                        onChange={e => {
                                            const arr = [...(config.opciones_turno || [])]
                                            arr[i] = { ...arr[i], horas: e.target.value === '' ? null : Number(e.target.value) }
                                            upd('opciones_turno', arr)
                                        }}
                                    />
                                    <span className='pcp-input-suffix'>hs</span>
                                </div>
                            </div>
                            <div className='pcp-field pcp-field--compact'>
                                <label className='pcp-label'>
                                    Precio del turno
                                    <span className='pcp-sublabel'>monto total</span>
                                </label>
                                <div className='pcp-input-row'>
                                    <span className='pcp-signo'>$</span>
                                    <input
                                        type='number'
                                        min='0'
                                        step='0.01'
                                        className='pcp-input'
                                        value={op.precio ?? ''}
                                        placeholder={precioBase ?? '0'}
                                        onChange={e => {
                                            const arr = [...(config.opciones_turno || [])]
                                            arr[i] = { ...arr[i], precio: e.target.value === '' ? null : Number(e.target.value) }
                                            upd('opciones_turno', arr)
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                type='button'
                                className='pcp-turno-option-del'
                                onClick={() => upd('opciones_turno', (config.opciones_turno || []).filter((_, j) => j !== i))}
                                title='Eliminar opción'
                            >
                                <FiX size={14}/>
                            </button>
                        </div>
                    ))}

                    <button
                        type='button'
                        className='pcp-turno-add-btn'
                        onClick={() => upd('opciones_turno', [...(config.opciones_turno || []), { horas: null, precio: null }])}
                    >
                        <FiPlus size={13}/> Agregar opción
                    </button>
                </div>
            )}

            {/* ── Precios por tipo de día (monto fijo o % de incremento sobre la base) ── */}
            <div className='pcp-section'>
                <div className='pcp-section-title'>
                    <FiCalendar size={13}/>
                    <span>Precios por tipo de día</span>
                    <span className='pcp-section-hint'>Monto completo o % de incremento sobre el precio base. En blanco = precio base</span>
                </div>
                <div className='pcp-grid-2'>
                    <div className='pcp-field'>
                        <label className='pcp-label'>
                            Fin de semana
                            <span className='pcp-sublabel'>Sáb / Dom</span>
                        </label>
                        <div className='pcp-input-row'>
                            <span className='pcp-signo'>{modoFinSemana === 'pct' ? '+' : '$'}</span>
                            {modoFinSemana === 'pct' ? (
                                <input
                                    type='number'
                                    min='0'
                                    max='500'
                                    step='1'
                                    className='pcp-input'
                                    value={config.fin_semana_pct ?? ''}
                                    placeholder='20'
                                    onChange={e => upd('fin_semana_pct', e.target.value === '' ? null : Number(e.target.value))}
                                />
                            ) : (
                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    className='pcp-input'
                                    value={config.fin_semana ?? ''}
                                    placeholder={precioBase ?? '0'}
                                    onChange={e => upd('fin_semana', e.target.value === '' ? null : Number(e.target.value))}
                                />
                            )}
                            {modoFinSemana === 'pct' && <span className='pcp-input-suffix'>%</span>}
                        </div>
                        {modoFinSemana === 'pct' && totalConPct(config.fin_semana_pct) != null && (
                            <span className='pcp-total-pct'>
                                Total: <strong>${totalConPct(config.fin_semana_pct).toLocaleString('es-AR')}</strong>
                                <small> (${Number(precioBase).toLocaleString('es-AR')} + {Number(config.fin_semana_pct)}%)</small>
                            </span>
                        )}
                        <button
                            type='button'
                            className='pcp-modo-btn'
                            onClick={() => modoFinSemana === 'pct'
                                ? updMulti({ fin_semana_modo: 'monto', fin_semana_pct: null })
                                : updMulti({ fin_semana_modo: 'pct', fin_semana: null })
                            }
                        >
                            {modoFinSemana === 'pct' ? 'Usar monto fijo $' : 'Usar % sobre precio base'}
                        </button>
                    </div>
                    <div className='pcp-field'>
                        <label className='pcp-label'>
                            Feriados
                            <span className='pcp-sublabel'>Nacionales AR</span>
                        </label>
                        <div className='pcp-input-row'>
                            <span className='pcp-signo'>{modoFeriado === 'pct' ? '+' : '$'}</span>
                            {modoFeriado === 'pct' ? (
                                <input
                                    type='number'
                                    min='0'
                                    max='500'
                                    step='1'
                                    className='pcp-input'
                                    value={config.feriado_pct ?? ''}
                                    placeholder={config.fin_semana_pct != null ? String(config.fin_semana_pct) : '25'}
                                    onChange={e => upd('feriado_pct', e.target.value === '' ? null : Number(e.target.value))}
                                />
                            ) : (
                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    className='pcp-input'
                                    value={config.feriado ?? ''}
                                    placeholder={config.fin_semana != null ? String(config.fin_semana) : (precioBase ?? '0')}
                                    onChange={e => upd('feriado', e.target.value === '' ? null : Number(e.target.value))}
                                />
                            )}
                            {modoFeriado === 'pct' && <span className='pcp-input-suffix'>%</span>}
                        </div>
                        {modoFeriado === 'pct' && totalConPct(config.feriado_pct) != null && (
                            <span className='pcp-total-pct'>
                                Total: <strong>${totalConPct(config.feriado_pct).toLocaleString('es-AR')}</strong>
                                <small> (${Number(precioBase).toLocaleString('es-AR')} + {Number(config.feriado_pct)}%)</small>
                            </span>
                        )}
                        <button
                            type='button'
                            className='pcp-modo-btn'
                            onClick={() => modoFeriado === 'pct'
                                ? updMulti({ feriado_modo: 'monto', feriado_pct: null })
                                : updMulti({ feriado_modo: 'pct', feriado: null })
                            }
                        >
                            {modoFeriado === 'pct' ? 'Usar monto fijo $' : 'Usar % sobre precio base'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Toggle cobrar por hora (solo salones) ── */}
            {showHoraToggle && (
                <div className='pcp-section'>
                    <div className='pcp-hora-toggle-row'>
                        <div className='pcp-hora-toggle-info'>
                            <FiClock size={13}/>
                            <div>
                                <span className='pcp-hora-toggle-label'>Cobrar por hora</span>
                                <span className='pcp-hora-toggle-sub'>En vez de un monto fijo por evento</span>
                            </div>
                        </div>
                        <button
                            type='button'
                            className={`pcp-toggle-btn ${config.por_hora ? 'pcp-toggle-btn--on' : ''}`}
                            onClick={() => upd('por_hora', !config.por_hora)}
                        >
                            <span className='pcp-toggle-knob'/>
                            <span className='pcp-toggle-txt'>{config.por_hora ? 'Sí' : 'No'}</span>
                        </button>
                    </div>

                    {config.por_hora && (
                        <div className='pcp-grid-3'>
                            <div className='pcp-field'>
                                <label className='pcp-label'>
                                    Días hábiles
                                    <span className='pcp-sublabel'>Lun – Vie</span>
                                </label>
                                <div className='pcp-input-row'>
                                    <span className='pcp-signo'>$</span>
                                    <input
                                        type='number'
                                        min='0'
                                        step='0.01'
                                        className='pcp-input'
                                        value={config.precio_hora ?? ''}
                                        placeholder='0'
                                        onChange={e => upd('precio_hora', e.target.value === '' ? null : Number(e.target.value))}
                                    />
                                    <span className='pcp-input-suffix'>/h</span>
                                </div>
                            </div>
                            <div className='pcp-field'>
                                <label className='pcp-label'>
                                    Fin de semana
                                    <span className='pcp-sublabel'>Sáb / Dom</span>
                                </label>
                                <div className='pcp-input-row'>
                                    <span className='pcp-signo'>$</span>
                                    <input
                                        type='number'
                                        min='0'
                                        step='0.01'
                                        className='pcp-input'
                                        value={config.precio_hora_fin_semana ?? ''}
                                        placeholder={config.precio_hora != null ? String(config.precio_hora) : '0'}
                                        onChange={e => upd('precio_hora_fin_semana', e.target.value === '' ? null : Number(e.target.value))}
                                    />
                                    <span className='pcp-input-suffix'>/h</span>
                                </div>
                            </div>
                            <div className='pcp-field'>
                                <label className='pcp-label'>
                                    Feriados
                                    <span className='pcp-sublabel'>Nacionales AR</span>
                                </label>
                                <div className='pcp-input-row'>
                                    <span className='pcp-signo'>$</span>
                                    <input
                                        type='number'
                                        min='0'
                                        step='0.01'
                                        className='pcp-input'
                                        value={config.precio_hora_feriado ?? ''}
                                        placeholder={
                                            config.precio_hora_fin_semana != null
                                                ? String(config.precio_hora_fin_semana)
                                                : (config.precio_hora != null ? String(config.precio_hora) : '0')
                                        }
                                        onChange={e => upd('precio_hora_feriado', e.target.value === '' ? null : Number(e.target.value))}
                                    />
                                    <span className='pcp-input-suffix'>/h</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default PreciosConfigPanel
