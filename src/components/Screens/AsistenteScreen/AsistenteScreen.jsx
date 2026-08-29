import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { getSalones } from '../../../services/salonesServices'
import { getServicios } from '../../../services/servicioServices'
import { solicitarReserva } from '../../../services/reservaServices'
import { generarPaquetes, itemAServicioCarrito } from '../../../utils/paquetesUtils'
import { dedupCanonico } from '../../../utils/texto'
import { FiSend, FiRefreshCw, FiGrid, FiMapPin, FiUsers, FiCheck, FiChevronDown, FiChevronUp, FiCrosshair } from 'react-icons/fi'
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
    // Acepta dd/mm (año en curso), dd/mm/aa (20aa) o dd/mm/aaaa
    const m = (s || '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/)
    if (!m) return ''
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    let year
    if (!m[3]) year = new Date().getFullYear()
    else if (m[3].length === 2) year = 2000 + Number(m[3])
    else year = Number(m[3])
    const iso = `${year}-${mm}-${dd}`
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
    const [paso, setPaso] = useState('tipo')   // tipo | edad | invitados | fecha | ubicacion | paquetes | listo
    const [datos, setDatos] = useState({ tipo: '', edad: '', invitados: '', fecha: '' })
    const [entrada, setEntrada] = useState('')
    const [creando, setCreando] = useState(null)
    const [abiertos, setAbiertos] = useState(new Set())   // paquetes con el detalle abierto
    const [ubicando, setUbicando] = useState(false)       // pidiendo geolocalización
    const [errUbic, setErrUbic] = useState('')
    const finRef = useRef(null)

    const toggleDetalle = (key) => setAbiertos(prev => {
        const n = new Set(prev)
        n.has(key) ? n.delete(key) : n.add(key)
        return n
    })

    const tiposEventoUnicos = [...new Set(salones.flatMap(s => parsearJSON(s.tipos_evento)))].filter(Boolean).sort()
    const departamentosUnicos = dedupCanonico(salones.map(s => s.departamento))

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
                pushBot('¡Hola! Soy tu asistente 🎉 Te ayudo a armar tu evento en 5 pasos. Para empezar, ¿qué tipo de evento querés organizar?')
            })
    }, [])

    useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])

    // Bautismo o cumpleaños < 12 → evento infantil (alcohol al 20%, mayormente peloteros)
    const calcularOpciones = (tipo, edad) => {
        const t = (tipo || '').toLowerCase()
        const esBautismo = /bautismo|bautizo/.test(t)
        const esCumple = /cumple/.test(t)
        const edadN = parseInt(edad, 10)
        const infantil = /infantil/.test(t) || (esCumple && edadN > 0 && edadN < 12)
        return { alcoholReducido: esBautismo || infantil, preferirPeloteros: infantil }
    }

    const mostrarPaquetes = (tipo, invitados, fechaISO, ubic = null) => {
        setAbiertos(new Set())
        const opciones = calcularOpciones(tipo, datos.edad)
        const paqs = generarPaquetes(tipo, invitados, fechaISO, salones, servicios, ubic, opciones)
        if (paqs.length === 0) {
            pushBot(`No encontré salones para ${invitados} invitados${tipo ? ` de tipo "${tipo}"` : ''}${ubic ? ' en esa zona' : ''}. Probá con menos invitados, otra zona u otro tipo tocando "Reiniciar".`)
            setPaso('listo')
            return
        }
        pushBot('¡Listo! Te armé estos paquetes con salón, servicios y productos incluidos. Elegí el que más te guste 👇', { tipo: 'paquetes', paquetes: paqs })
        setPaso('paquetes')
    }

    // Avanza desde el tipo: si es cumpleaños pregunta la edad, si no va a invitados.
    const avanzarDesdeTipo = (tipo) => {
        setDatos(d => ({ ...d, tipo }))
        setEntrada('')
        if (/cumple/i.test(tipo)) {
            setPaso('edad')
            pushBot('¡Un cumpleaños! 🎂 Para una mejor experiencia, ¿de cuántos años es la fiesta?')
        } else {
            setPaso('invitados')
            pushBot(`Genial, un evento de ${tipo}. ¿Para cuántos invitados?`)
        }
    }

    const responder = () => {
        const val = entrada.trim()
        if (paso === 'tipo') {
            const tipo = val
            if (!tipo) return
            pushUser(tipo)
            avanzarDesdeTipo(tipo)
        } else if (paso === 'edad') {
            const edad = parseInt(val, 10)
            if (!edad || edad < 1) return
            pushUser(`${edad} años`)
            setDatos(d => ({ ...d, edad: String(edad) }))
            setEntrada('')
            setPaso('invitados')
            pushBot(edad < 12
                ? '¡Genial, una fiesta infantil! 🎈 ¿Para cuántos invitados?'
                : '¡Perfecto! ¿Para cuántos invitados?')
        } else if (paso === 'invitados') {
            const inv = parseInt(val, 10)
            if (!inv || inv < 1) return
            pushUser(`${inv} invitados`)
            setDatos(d => ({ ...d, invitados: String(inv) }))
            setEntrada('')
            setPaso('fecha')
            pushBot('Perfecto. ¿Para qué fecha? Podés poner dd/mm (uso el año actual) o dd/mm/aa 📅')
        } else if (paso === 'fecha') {
            const iso = fechaAISO(val)
            if (!iso) return
            pushUser(val)
            setDatos(d => ({ ...d, fecha: val }))
            setEntrada('')
            setPaso('ubicacion')
            pushBot('¿En qué zona querés hacer el evento? Activá tu ubicación para ver salones cercanos, o elegí el departamento 📍')
        }
    }

    // --- Paso ubicación ---
    const continuarConUbic = (ubic, etiqueta) => {
        pushUser(etiqueta)
        setEntrada('')
        mostrarPaquetes(datos.tipo, datos.invitados, fechaAISO(datos.fecha), ubic)
    }

    const usarMiUbicacion = () => {
        if (!navigator.geolocation) { setErrUbic('Tu navegador no soporta ubicación. Elegí un departamento.'); return }
        setUbicando(true); setErrUbic('')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUbicando(false)
                continuarConUbic({ modo: 'coords', lat: pos.coords.latitude, lng: pos.coords.longitude, rangoKm: 60 }, '📍 Mi ubicación')
            },
            (err) => {
                setUbicando(false)
                setErrUbic(err.code === err.PERMISSION_DENIED
                    ? 'Permiso de ubicación denegado. Elegí un departamento.'
                    : 'No pudimos obtener tu ubicación. Elegí un departamento.')
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const elegirDepartamento = (dep) => continuarConUbic({ modo: 'departamento', valor: dep }, dep)
    const omitirUbicacion = () => continuarConUbic(null, 'Cualquier zona')

    const elegirTipo = (t) => {
        pushUser(t)
        avanzarDesdeTipo(t)
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
            // Carga cada ítem con la cantidad necesaria para cubrir a los invitados
            // (por_persona = 1 unidad, el carrito multiplica por personas del evento)
            paq.items.forEach(s => {
                const veces = Math.max(1, s._cant || 1)
                for (let i = 0; i < veces; i++) agregarServicioAdicional(itemAServicioCarrito(s))
            })
            navigate('/organizar/servicios')
        } catch (e) {
            console.error('Error al elegir paquete:', e)
            pushBot('Uy, no pude crear la reserva. ' + (e?.response?.data?.message || e?.message || 'Probá de nuevo.'))
            setCreando(null)
        }
    }

    const reiniciar = () => {
        setMensajes([])
        setDatos({ tipo: '', edad: '', invitados: '', fecha: '' })
        setEntrada('')
        setPaso('tipo')
        setCreando(null)
        setUbicando(false)
        setErrUbic('')
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
                            <span className='asis-estado'>Te armo tu evento en 5 pasos</span>
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
                                                                <div className='asis-det-sec'>
                                                                    <span className='asis-det-titulo'>Salón</span>
                                                                    <ul><li><FiCheck size={11} /> {paq.salon.nombre} <span className='asis-det-cant'><FiMapPin size={10} /> {paq.salon.localidad || paq.salon.domicilio}</span><span className='asis-det-precio'>{fmt(paq.salonPrecio)}</span></li></ul>
                                                                </div>
                                                                {paq.servicios.length > 0 && (
                                                                    <div className='asis-det-sec'>
                                                                        <span className='asis-det-titulo'>Servicios incluidos</span>
                                                                        <ul>{paq.servicios.map(s => <li key={s.id_servicio}><FiCheck size={11} /> {s.nombre}{s._cant > 1 && <span className='asis-det-cant'>× {s._cant}</span>}{s._personas && <span className='asis-det-cant'>{s._personas} pers.</span>}<span className='asis-det-precio'>{fmt(s._sub)}</span></li>)}</ul>
                                                                    </div>
                                                                )}
                                                                {paq.productos.length > 0 && (
                                                                    <div className='asis-det-sec'>
                                                                        <span className='asis-det-titulo'>Productos incluidos</span>
                                                                        <ul>{paq.productos.map(s => <li key={s.id_servicio}><FiCheck size={11} /> {s.nombre}{s._presentacion ? ` ${s._presentacion}` : ''}{s._cant > 1 && <span className='asis-det-cant'>× {s._cant}</span>}{s._personas && <span className='asis-det-cant'>{s._personas} pers.</span>}<span className='asis-det-precio'>{fmt(s._sub)}</span></li>)}</ul>
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
                        {paso === 'ubicacion' ? (
                            <div className='asis-ubic'>
                                <button className='asis-ubic-btn' onClick={usarMiUbicacion} disabled={ubicando}>
                                    {ubicando ? <TailSpin height={16} stroke='#fff' /> : <FiCrosshair size={16} />}
                                    {ubicando ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
                                </button>
                                {departamentosUnicos.length > 0 && (
                                    <>
                                        <span className='asis-ubic-label'>o elegí el departamento:</span>
                                        <div className='asis-chips'>
                                            {departamentosUnicos.map(d => (
                                                <button key={d} className='asis-chip' onClick={() => elegirDepartamento(d)}>{d}</button>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <button className='asis-ubic-omitir' onClick={omitirUbicacion}>Cualquier zona →</button>
                                {errUbic && <span className='asis-ubic-err'>{errUbic}</span>}
                            </div>
                        ) : (
                            <div className='asis-input-row'>
                                <input
                                    type={(paso === 'invitados' || paso === 'edad') ? 'number' : 'text'}
                                    inputMode={paso === 'fecha' ? 'numeric' : undefined}
                                    min={(paso === 'invitados' || paso === 'edad') ? 1 : undefined}
                                    maxLength={paso === 'fecha' ? 10 : undefined}
                                    placeholder={paso === 'tipo' ? 'Escribí el tipo de evento…' : paso === 'edad' ? 'Edad (años)' : paso === 'invitados' ? 'Cantidad de invitados' : 'dd/mm (año opcional)'}
                                    value={entrada}
                                    onChange={e => setEntrada(paso === 'fecha' ? formatFecha(e.target.value) : e.target.value)}
                                    onKeyDown={onKey}
                                />
                                <button className='asis-enviar' onClick={responder}><FiSend size={17} /></button>
                            </div>
                        )}
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
