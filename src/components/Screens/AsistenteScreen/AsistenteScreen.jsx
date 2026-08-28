import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { getSalones } from '../../../services/salonesServices'
import { getServicios } from '../../../services/servicioServices'
import { solicitarReserva } from '../../../services/reservaServices'
import { generarPaquetes, itemAServicioCarrito } from '../../../utils/paquetesUtils'
import { FiSend, FiRefreshCw, FiGrid, FiMapPin, FiUsers, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import './AsistenteScreen.css'

const parsearJSON = (v) => { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v) } catch { return [] } }
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`

const formatFecha = (value) => {
    const d = value.replace(/\D/g, '').slice(0, 8)
    let out = d.slice(0, 2)
    if (d.length > 2) out += '/' + d.slice(2, 4)
    if (d.length > 4) out += '/' + d.slice(4, 8)
    return out
}
const fechaAISO = (s) => {
    const m = (s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m) return ''
    const [, dd, mm, yyyy] = m
    const iso = `${yyyy}-${mm}-${dd}`
    const dt = new Date(iso + 'T00:00:00')
    if (isNaN(dt.getTime()) || dt.getMonth() + 1 !== Number(mm) || dt.getDate() !== Number(dd)) return ''
    return iso
}

let msgId = 0
const nuevoId = () => ++msgId

// Asistente guiado (sin IA): pregunta tipo → invitados → fecha y arma paquetes.
const AsistenteScreen = () => {
    const navigate = useNavigate()
    const { agregarReservaOrganizador, agregarServicioAdicional } = useCarrito()

    const [salones, setSalones] = useState([])
    const [servicios, setServicios] = useState([])
    const [cargando, setCargando] = useState(true)

    const [mensajes, setMensajes] = useState([])
    const [paso, setPaso] = useState('tipo')   // tipo | invitados | fecha | paquetes | listo
    const [datos, setDatos] = useState({ tipo: '', invitados: '', fecha: '' })
    const [entrada, setEntrada] = useState('')
    const [creando, setCreando] = useState(null)
    const [abiertos, setAbiertos] = useState(new Set())   // paquetes con el detalle abierto
    const finRef = useRef(null)

    const toggleDetalle = (key) => setAbiertos(prev => {
        const n = new Set(prev)
        n.has(key) ? n.delete(key) : n.add(key)
        return n
    })

    const tiposEventoUnicos = [...new Set(salones.flatMap(s => parsearJSON(s.tipos_evento)))].filter(Boolean).sort()

    const pushBot = (texto, comp = null) => setMensajes(m => [...m, { id: nuevoId(), from: 'bot', texto, comp }])
    const pushUser = (texto) => setMensajes(m => [...m, { id: nuevoId(), from: 'user', texto }])

    useEffect(() => {
        Promise.all([getSalones(), getServicios()])
            .then(([sal, serv]) => {
                setSalones(Array.isArray(sal) ? sal : [])
                setServicios(Array.isArray(serv) ? serv : [])
            })
            .finally(() => {
                setCargando(false)
                pushBot('¡Hola! Soy tu asistente 🎉 Te ayudo a armar tu evento en 3 pasos. Para empezar, ¿qué tipo de evento querés organizar?')
            })
    }, [])

    useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])

    const mostrarPaquetes = (tipo, invitados, fechaISO) => {
        setAbiertos(new Set())
        const paqs = generarPaquetes(tipo, invitados, fechaISO, salones, servicios)
        if (paqs.length === 0) {
            pushBot(`No encontré salones para ${invitados} invitados${tipo ? ` de tipo "${tipo}"` : ''}. Probá con menos invitados u otro tipo tocando "Reiniciar".`)
            setPaso('listo')
            return
        }
        pushBot('¡Listo! Te armé estos paquetes con salón, servicios y productos incluidos. Elegí el que más te guste 👇', { tipo: 'paquetes', paquetes: paqs })
        setPaso('paquetes')
    }

    const responder = () => {
        const val = entrada.trim()
        if (paso === 'tipo') {
            const tipo = val
            if (!tipo) return
            pushUser(tipo)
            setDatos(d => ({ ...d, tipo }))
            setEntrada('')
            setPaso('invitados')
            pushBot(`Genial, un evento de ${tipo}. ¿Para cuántos invitados?`)
        } else if (paso === 'invitados') {
            const inv = parseInt(val, 10)
            if (!inv || inv < 1) return
            pushUser(`${inv} invitados`)
            setDatos(d => ({ ...d, invitados: String(inv) }))
            setEntrada('')
            setPaso('fecha')
            pushBot('Perfecto. ¿Para qué fecha? (dd/mm/aaaa)')
        } else if (paso === 'fecha') {
            const iso = fechaAISO(val)
            if (!iso) return
            pushUser(val)
            setDatos(d => ({ ...d, fecha: val }))
            setEntrada('')
            mostrarPaquetes(datos.tipo, datos.invitados, iso)
        }
    }

    const elegirTipo = (t) => {
        pushUser(t)
        setDatos(d => ({ ...d, tipo: t }))
        setEntrada('')
        setPaso('invitados')
        pushBot(`Genial, un evento de ${t}. ¿Para cuántos invitados?`)
    }

    const elegirPaquete = async (paq) => {
        if (creando) return
        setCreando(paq.key)
        try {
            const fISO = fechaAISO(datos.fecha)
            const datos_evento = {
                nombre: `${datos.tipo || 'Evento'} (paquete ${paq.label})`,
                tipo_evento: datos.tipo || null,
                descripcion: '',
                fecha: fISO,
                cupo: datos.invitados || '',
                bodega_id: paq.salon.id_bodega,
                es_publico: true,
                cobrar_entrada: false,
                precio: 0,
            }
            const reserva = await solicitarReserva({ bodega_id: paq.salon.id_bodega, fecha: fISO, datos_evento })
            agregarReservaOrganizador(reserva, false)
            paq.items.forEach(s => agregarServicioAdicional(itemAServicioCarrito(s)))
            navigate('/organizar/servicios')
        } catch (e) {
            console.error('Error al elegir paquete:', e)
            pushBot('Uy, no pude crear la reserva. ' + (e?.response?.data?.message || e?.message || 'Probá de nuevo.'))
            setCreando(null)
        }
    }

    const reiniciar = () => {
        setMensajes([])
        setDatos({ tipo: '', invitados: '', fecha: '' })
        setEntrada('')
        setPaso('tipo')
        setCreando(null)
        pushBot('Empecemos de nuevo 🙂 ¿Qué tipo de evento querés organizar?')
    }

    const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); responder() } }

    return (
        <div className='asis-page'>
            <div className='asis-card'>
                <div className='asis-header'>
                    <div className='asis-header-info'>
                        <span className='asis-avatar'>🤖</span>
                        <div>
                            <h1>Asistente de eventos</h1>
                            <span className='asis-estado'>Te armo tu evento en 3 pasos</span>
                        </div>
                    </div>
                    <div className='asis-header-btns'>
                        <button className='asis-btn-sec' onClick={reiniciar}><FiRefreshCw size={14} /> Reiniciar</button>
                        <button className='asis-btn-sec' onClick={() => navigate('/salones')}><FiGrid size={14} /> Vista clásica</button>
                    </div>
                </div>

                <div className='asis-chat'>
                    {cargando && <div className='asis-cargando'><TailSpin /> Cargando catálogo...</div>}

                    {mensajes.map(m => {
                        const esPaq = m.comp?.tipo === 'paquetes'
                        return (
                            <div key={m.id} className={`asis-msg asis-msg--${m.from}${esPaq ? ' asis-msg--full' : ''}`}>
                                {m.from === 'bot' && <span className='asis-msg-avatar'>🤖</span>}
                                <div className='asis-burbuja'>
                                    {m.texto && <p>{m.texto}</p>}
                                    {esPaq && (
                                        <div className='asis-paq-lista'>
                                            {m.comp.paquetes.map(paq => {
                                                const abierto = abiertos.has(paq.key)
                                                return (
                                                    <div key={paq.key} className={`asis-paq ${abierto ? 'asis-paq--abierto' : ''}`} style={{ borderLeftColor: paq.color }}>
                                                        <div className='asis-paq-fila'>
                                                            <span className='asis-paq-nivel' style={{ background: paq.color }}>{paq.label}</span>
                                                            <div className='asis-paq-txt'>
                                                                <span className='asis-paq-salon-n'>{paq.salon.nombre}</span>
                                                                <span className='asis-paq-meta'><FiUsers size={11} /> aforo {paq.salon.aforo} · {paq.items.length} ítem{paq.items.length !== 1 ? 's' : ''}</span>
                                                            </div>
                                                            <span className='asis-paq-total'>{fmt(paq.total)}</span>
                                                            <div className='asis-paq-btns'>
                                                                <button className='asis-paq-detalle' onClick={() => toggleDetalle(paq.key)}>
                                                                    Ver detalle {abierto ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                                                </button>
                                                                <button className='asis-paq-elegir' style={{ background: paq.color }} onClick={() => elegirPaquete(paq)} disabled={!!creando}>
                                                                    {creando === paq.key ? 'Agregando…' : 'Elegir'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {abierto && (
                                                            <div className='asis-paq-body'>
                                                                <p className='asis-paq-desc'>{paq.desc}</p>
                                                                <div className='asis-paq-salon-dir'><FiMapPin size={12} /> {paq.salon.localidad || paq.salon.domicilio} · ${Number(paq.salon.precio_publico ?? paq.salon.precio_alquiler ?? 0).toLocaleString('es-AR')} salón</div>
                                                                {paq.servicios.length > 0 && (
                                                                    <div className='asis-det-sec'>
                                                                        <span className='asis-det-titulo'>Servicios incluidos</span>
                                                                        <ul>{paq.servicios.map(s => <li key={s.id_servicio}><FiCheck size={11} /> {s.nombre}<span className='asis-det-precio'>{fmt(s.precio)}</span></li>)}</ul>
                                                                    </div>
                                                                )}
                                                                {paq.productos.length > 0 && (
                                                                    <div className='asis-det-sec'>
                                                                        <span className='asis-det-titulo'>Productos incluidos</span>
                                                                        <ul>{paq.productos.map(s => <li key={s.id_servicio}><FiCheck size={11} /> {s.nombre}<span className='asis-det-precio'>{fmt(s.precio)}</span></li>)}</ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    <div ref={finRef} />
                </div>

                {/* Barra de entrada según el paso */}
                {!cargando && paso !== 'paquetes' && paso !== 'listo' && (
                    <div className='asis-input-bar'>
                        {paso === 'tipo' && tiposEventoUnicos.length > 0 && (
                            <div className='asis-chips'>
                                {tiposEventoUnicos.slice(0, 8).map(t => (
                                    <button key={t} className='asis-chip' onClick={() => elegirTipo(t)}>{t}</button>
                                ))}
                            </div>
                        )}
                        <div className='asis-input-row'>
                            <input
                                type={paso === 'invitados' ? 'number' : 'text'}
                                inputMode={paso === 'fecha' ? 'numeric' : undefined}
                                min={paso === 'invitados' ? 1 : undefined}
                                maxLength={paso === 'fecha' ? 10 : undefined}
                                placeholder={paso === 'tipo' ? 'Escribí el tipo de evento…' : paso === 'invitados' ? 'Cantidad de invitados' : 'dd/mm/aaaa'}
                                value={entrada}
                                onChange={e => setEntrada(paso === 'fecha' ? formatFecha(e.target.value) : e.target.value)}
                                onKeyDown={onKey}
                            />
                            <button className='asis-enviar' onClick={responder}><FiSend size={17} /></button>
                        </div>
                    </div>
                )}

                {paso === 'paquetes' && (
                    <div className='asis-input-bar asis-input-bar--fin'>
                        <button className='asis-btn-sec' onClick={reiniciar}><FiRefreshCw size={14} /> Armar otro evento</button>
                    </div>
                )}
                {paso === 'listo' && (
                    <div className='asis-input-bar asis-input-bar--fin'>
                        <button className='asis-btn-sec' onClick={reiniciar}><FiRefreshCw size={14} /> Reiniciar</button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AsistenteScreen
