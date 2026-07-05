import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { crearInvitacion, getMisInvitaciones } from '../../../services/invitacionServices'
import { FiX, FiPlus, FiSend, FiUsers, FiPhone, FiCopy, FiCheck, FiCalendar, FiImage, FiBook } from 'react-icons/fi'
import './InvitacionesModal.css'
import { BACKEND_URL } from '../../../config/api'

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// URL con OG tags para WhatsApp preview; redirige al frontend automáticamente
const buildOgUrl = token => `${BACKEND_URL}/api/invitaciones/og/${token}`

// ── Google Identity Services loader (singleton) ───────────────────────────────
const loadGIS = (() => {
    let p = null
    return () => {
        if (!p) p = new Promise(resolve => {
            if (window.google?.accounts?.oauth2) { resolve(); return }
            const s = document.createElement('script')
            s.src = 'https://accounts.google.com/gsi/client'
            s.async = true
            s.onload = resolve
            document.head.appendChild(s)
        })
        return p
    }
})()

const getGoogleToken = () => new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/contacts.readonly',
        callback: r => r.error ? reject(new Error(r.error_description || r.error)) : resolve(r.access_token)
    })
    client.requestAccessToken({ prompt: '' })
})

const fetchGoogleContacts = async token => {
    const r = await fetch(
        'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING',
        { headers: { Authorization: `Bearer ${token}` } }
    )
    const d = await r.json()
    return (d.connections || [])
        .flatMap(c => (c.phoneNumbers || []).map(p => ({
            nombre: c.names?.[0]?.displayName || 'Sin nombre',
            telefono: (p.canonicalForm || p.value).replace(/[\s\-().]/g, '')
        })))
        .filter(c => c.telefono?.length >= 7)
}

const hasNativeContactPicker = () =>
    typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window

// ── Flujo de selección de contactos ──────────────────────────────────────────
const ContactPickerFlow = ({ eventoId, onDone }) => {
    const [fase, setFase] = useState(null)
    const [googleContacts, setGoogleContacts] = useState([])
    const [busqueda, setBusqueda] = useState('')
    const [seleccionados, setSeleccionados] = useState(new Set())
    const [batch, setBatch] = useState([])
    const [progreso, setProgreso] = useState({ actual: 0, total: 0 })
    const [resultados, setResultados] = useState({ ok: 0, err: [] })
    // El overlay solo cierra si el gesto (mousedown→mouseup) empezó y terminó en él.
    // Evita que arrastrar para seleccionar texto sobre la lista cierre el modal.
    const overlayDown = useRef(false)
    const onOverlayDown = e => { overlayDown.current = e.target === e.currentTarget }
    const onOverlayClick = (e, fn) => { if (e.target === e.currentTarget && overlayDown.current) fn() }

    const iniciar = async () => {
        if (hasNativeContactPicker()) {
            try {
                const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
                const parsed = contacts
                    .flatMap(c => (c.tel || []).slice(0, 1).map(t => ({
                        nombre: (c.name || [''])[0] || 'Sin nombre',
                        telefono: t.replace(/[\s\-().]/g, '')
                    })))
                    .filter(c => c.telefono?.length >= 7)
                if (!parsed.length) return
                setBatch(parsed.map(c => ({ ...c, num_invitados: 1 })))
                setFase('batch')
            } catch { /* cancelado */ }
        } else {
            setFase('loading')
            try {
                await loadGIS()
                const token = await getGoogleToken()
                const contacts = await fetchGoogleContacts(token)
                setGoogleContacts(contacts)
                setBusqueda('')
                setSeleccionados(new Set())
                setFase('list')
            } catch (err) {
                console.error('[ContactPicker]', err)
                setFase(null)
            }
        }
    }

    const toggleContacto = tel => {
        setSeleccionados(prev => {
            const s = new Set(prev)
            s.has(tel) ? s.delete(tel) : s.add(tel)
            return s
        })
    }

    const confirmarLista = () => {
        const sel = googleContacts.filter(c => seleccionados.has(c.telefono))
        setBatch(sel.map(c => ({ ...c, num_invitados: 1 })))
        setFase('batch')
    }

    const setBatchField = (idx, campo, val) =>
        setBatch(prev => prev.map((c, i) => i === idx ? { ...c, [campo]: val } : c))

    const removeBatch = idx => setBatch(prev => prev.filter((_, i) => i !== idx))

    const enviarTodos = async () => {
        setFase('sending')
        setProgreso({ actual: 0, total: batch.length })
        let okCount = 0
        const errList = []
        for (let i = 0; i < batch.length; i++) {
            const c = batch[i]
            try {
                await crearInvitacion({
                    evento_id: eventoId,
                    telefono: c.telefono,
                    num_invitados: Number(c.num_invitados) || 1,
                    nombre_invitado: c.nombre
                })
                okCount++
            } catch (e) {
                errList.push({ nombre: c.nombre, msg: e?.response?.data?.message || 'Error' })
            }
            setProgreso({ actual: i + 1, total: batch.length })
        }
        setResultados({ ok: okCount, err: errList })
        setFase('result')
        onDone?.()
    }

    const filtrados = googleContacts.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.telefono.includes(busqueda)
    )

    const cerrar = () => setFase(null)

    if (!fase) return (
        <button className='inv-btn-contactos' onClick={iniciar} type='button'>
            <FiBook size={13}/>
            {hasNativeContactPicker() ? 'Importar desde contactos' : 'Importar desde Google Contactos'}
        </button>
    )

    if (fase === 'loading') return (
        <div className='inv-cp-loading'>
            <div className='inv-cp-spinner'/> Conectando con Google Contactos...
        </div>
    )

    if (fase === 'list') return createPortal(
        <div className='inv-cp-overlay' onMouseDown={onOverlayDown} onClick={e => onOverlayClick(e, cerrar)}>
            <div className='inv-cp-modal'>
                <div className='inv-cp-header'>
                    <div>
                        <h3>Seleccionar contactos</h3>
                        <p>{seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''} · {filtrados.length} contacto{filtrados.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button className='inv-cerrar' onClick={cerrar}><FiX size={18}/></button>
                </div>
                <div className='inv-cp-search-wrap'>
                    <input
                        className='inv-cp-search'
                        placeholder='Buscar por nombre o teléfono...'
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className='inv-cp-list'>
                    {filtrados.length === 0 && <p className='inv-vacio'>Sin resultados</p>}
                    {filtrados.map((c, i) => (
                        <label key={i} className={`inv-cp-item ${seleccionados.has(c.telefono) ? 'inv-cp-item--sel' : ''}`}>
                            <input
                                type='checkbox'
                                checked={seleccionados.has(c.telefono)}
                                onChange={() => toggleContacto(c.telefono)}
                                className='inv-cp-checkbox'
                            />
                            <span className='inv-cp-item-nombre'>{c.nombre}</span>
                            <span className='inv-cp-item-tel'>{c.telefono}</span>
                        </label>
                    ))}
                </div>
                <div className='inv-cp-footer'>
                    <button className='inv-cp-btn-cancel' onClick={cerrar}>Cancelar</button>
                    <button
                        className='inv-btn-crear'
                        onClick={confirmarLista}
                        disabled={seleccionados.size === 0}
                    >
                        Continuar ({seleccionados.size})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )

    if (fase === 'batch') return createPortal(
        <div className='inv-cp-overlay'>
            <div className='inv-cp-modal'>
                <div className='inv-cp-header'>
                    <div>
                        <h3>Revisar invitaciones</h3>
                        <p>{batch.length} invitación{batch.length !== 1 ? 'es' : ''} a crear</p>
                    </div>
                    <button className='inv-cerrar' onClick={cerrar}><FiX size={18}/></button>
                </div>
                <div className='inv-cp-list inv-cp-batch-list'>
                    {batch.length === 0 && <p className='inv-vacio'>Sin contactos</p>}
                    {batch.map((c, i) => (
                        <div key={i} className='inv-cp-batch-row'>
                            <div className='inv-cp-batch-campos'>
                                <input
                                    type='text'
                                    className='inv-cp-batch-nombre'
                                    value={c.nombre}
                                    onChange={e => setBatchField(i, 'nombre', e.target.value)}
                                    placeholder='Nombre'
                                />
                                <span className='inv-cp-item-tel'>{c.telefono}</span>
                            </div>
                            <div className='inv-cp-batch-right'>
                                <div className='inv-cp-num-wrap'>
                                    <label>Entradas</label>
                                    <input
                                        type='number'
                                        min={1}
                                        max={20}
                                        value={c.num_invitados}
                                        onChange={e => setBatchField(i, 'num_invitados', e.target.value)}
                                        className='inv-cp-num-input'
                                    />
                                </div>
                                <button className='inv-cp-remove' onClick={() => removeBatch(i)} title='Quitar'>
                                    <FiX size={13}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className='inv-cp-footer'>
                    <button className='inv-cp-btn-cancel' onClick={cerrar}>Cancelar</button>
                    <button className='inv-btn-crear' onClick={enviarTodos} disabled={batch.length === 0}>
                        <FiSend size={13}/> Enviar {batch.length} invitación{batch.length !== 1 ? 'es' : ''}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )

    if (fase === 'sending') return createPortal(
        <div className='inv-cp-overlay'>
            <div className='inv-cp-modal inv-cp-modal--sm'>
                <div className='inv-cp-sending'>
                    <div className='inv-cp-spinner'/>
                    <p>Creando {progreso.actual} de {progreso.total} invitaciones...</p>
                    <div className='inv-cp-progress-track'>
                        <div
                            className='inv-cp-progress-fill'
                            style={{ width: `${progreso.total ? (progreso.actual / progreso.total) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )

    if (fase === 'result') return createPortal(
        <div className='inv-cp-overlay'>
            <div className='inv-cp-modal inv-cp-modal--sm'>
                <div className='inv-cp-result'>
                    <FiCheck size={40} className='inv-cp-result-icon'/>
                    <h3>{resultados.ok} invitación{resultados.ok !== 1 ? 'es' : ''} creada{resultados.ok !== 1 ? 's' : ''}</h3>
                    {resultados.err.length > 0 && (
                        <div className='inv-cp-result-errs'>
                            <p>No se pudieron crear:</p>
                            {resultados.err.map((e, i) => (
                                <span key={i}>{e.nombre}: {e.msg}</span>
                            ))}
                        </div>
                    )}
                    <button className='inv-btn-crear' onClick={cerrar}>
                        <FiCheck size={13}/> Listo
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )

    return null
}

const WA_SVG = (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'/>
    </svg>
)

const buildWaLink = (telefono, link, eventoNombre) => {
    const tel = telefono.replace(/\D/g, '')
    const msg = encodeURIComponent(
        `¡Hola! Te invitamos a *${eventoNombre}* 🎉\nAccedé a tu invitación personal:\n\n${link}`
    )
    // whatsapp:// abre la app directamente (desktop o móvil) sin pestañas nuevas
    // El browser queda en la misma página; el OS intercepta el protocolo
    return `whatsapp://send?phone=${tel}&text=${msg}`
}

// Navega via protocolo whatsapp:// — el browser NO abandona la página del wizard,
// el OS abre/trae al frente WhatsApp Desktop (o móvil) en el chat correcto
const openWa = url => { window.location.href = url }

// ── Abre una ventana Picture-in-Picture siempre visible ──────────────────────
const openPiP = async () => {
    if (!window.documentPictureInPicture) return null
    try {
        const pip = await window.documentPictureInPicture.requestWindow({
            width: 360, height: 440,
            disallowReturnToOpener: false,
        })
        // Copiar todas las hojas de estilo al documento PiP
        ;[...document.styleSheets].forEach(sheet => {
            try {
                const s = pip.document.createElement('style')
                s.textContent = [...sheet.cssRules].map(r => r.cssText).join('\n')
                pip.document.head.appendChild(s)
            } catch {
                if (sheet.href) {
                    const l = pip.document.createElement('link')
                    l.rel = 'stylesheet'; l.href = sheet.href
                    pip.document.head.appendChild(l)
                }
            }
        })
        // Estilos base del body PiP
        const base = pip.document.createElement('style')
        base.textContent = 'body{margin:0;height:100vh;overflow:hidden;background:#fff}'
        pip.document.head.appendChild(base)
        return pip
    } catch { return null }
}

// ── Wizard de envío masivo ────────────────────────────────────────────────────
const BroadcastWizard = ({ invitaciones, eventoNombre, pipWin, onClose }) => {
    const contactos = invitaciones.filter(i => i.telefono && i.estado !== 'usada')
    const [idx, setIdx]           = useState(0)
    const [enviados, setEnviados] = useState(new Set())
    const [contando,  setContando] = useState(false)

    // Auto-avanza 1.5 s después de abrir WhatsApp
    useEffect(() => {
        if (!contando) return
        const t = setTimeout(() => {
            setContando(false)
            setIdx(prev => prev + 1)
        }, 1500)
        return () => clearTimeout(t)
    }, [contando])

    const handleWaClick = () => {
        setEnviados(prev => new Set([...prev, actual?.id_invitacion]))
        setContando(true)
    }

    const isPip    = !!pipWin
    const target   = isPip ? pipWin.document.body : document.body
    // En PiP no hay overlay; el modal llena la ventana flotante
    const wrapCls  = isPip ? 'inv-bc-pip-root' : 'inv-cp-overlay'
    const wrapClick = !isPip ? (e => e.target === e.currentTarget && onClose()) : undefined

    if (!contactos.length) return createPortal(
        <div className={wrapCls} onClick={wrapClick}>
            <div className='inv-cp-modal inv-cp-modal--sm'>
                <div className='inv-cp-result'>
                    <FiCheck size={36} className='inv-cp-result-icon'/>
                    <h3>Sin contactos para enviar</h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                        Todas las invitaciones están usadas o no tienen teléfono.
                    </p>
                    <button className='inv-btn-crear' onClick={onClose}><FiCheck size={13}/> Listo</button>
                </div>
            </div>
        </div>,
        target
    )

    if (idx >= contactos.length) return createPortal(
        <div className={wrapCls} onClick={wrapClick}>
            <div className='inv-cp-modal inv-cp-modal--sm'>
                <div className='inv-cp-result'>
                    <FiCheck size={40} className='inv-cp-result-icon'/>
                    <h3>¡Listo! {enviados.size} de {contactos.length} enviadas</h3>
                    <button className='inv-btn-crear' onClick={onClose}><FiCheck size={13}/> Cerrar</button>
                </div>
            </div>
        </div>,
        target
    )

    const actual  = contactos[idx]
    const ogLink  = buildOgUrl(actual.token)
    const waLink  = buildWaLink(actual.telefono, ogLink, eventoNombre)
    const yaEnvio = enviados.has(actual.id_invitacion)

    return createPortal(
        <div className={wrapCls} onClick={wrapClick}>
            <div className='inv-cp-modal inv-bc-modal'>
                {/* Barra de progreso */}
                <div className='inv-bc-header'>
                    <div className='inv-bc-progress-track'>
                        <div
                            className='inv-bc-progress-fill'
                            style={{ width: `${(enviados.size / contactos.length) * 100}%` }}
                        />
                    </div>
                    <div className='inv-bc-header-info'>
                        <span>{enviados.size} de {contactos.length} enviadas</span>
                        <button className='inv-cerrar' onClick={onClose}><FiX size={18}/></button>
                    </div>
                </div>

                <div className='inv-bc-body'>
                    {/* Dots */}
                    {contactos.length <= 30 && (
                        <div className='inv-bc-dots'>
                            {contactos.map((c, i) => (
                                <span key={i} className={`inv-bc-dot ${i === idx ? 'inv-bc-dot--active' : ''} ${enviados.has(c.id_invitacion) ? 'inv-bc-dot--done' : ''}`}/>
                            ))}
                        </div>
                    )}

                    {/* Tarjeta contacto */}
                    <div className='inv-bc-card'>
                        <div className='inv-bc-avatar'>
                            {(actual.nombre_invitado || '?')[0].toUpperCase()}
                        </div>
                        <div className='inv-bc-info'>
                            <span className='inv-bc-nombre'>{actual.nombre_invitado || 'Sin nombre'}</span>
                            <span className='inv-bc-tel'>{actual.telefono}</span>
                            <span className='inv-bc-cupo'>
                                <FiUsers size={12}/> {actual.num_invitados} entrada{actual.num_invitados !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <EstadoBadge estado={actual.estado}/>
                    </div>

                    {/* Botón principal */}
                    {contando ? (
                        <div className='inv-bc-autoavance'>
                            <div className='inv-cp-spinner'/>
                            <span>Abriendo siguiente invitado...</span>
                        </div>
                    ) : (
                        <button
                            className={`inv-bc-btn-wa ${yaEnvio ? 'inv-bc-btn-wa--sent' : ''}`}
                            onClick={() => { openWa(waLink); handleWaClick() }}
                        >
                            {WA_SVG}
                            {yaEnvio ? 'Reenviar por WhatsApp' : 'Enviar por WhatsApp →'}
                        </button>
                    )}
                </div>

                {/* Footer */}
                <div className='inv-bc-footer'>
                    <button
                        className='inv-cp-btn-cancel'
                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0 || contando}
                    >
                        ← Anterior
                    </button>
                    <button
                        className='inv-cp-btn-cancel'
                        onClick={() => setIdx(i => i + 1)}
                        disabled={contando}
                        title='Saltear este contacto'
                    >
                        Saltar →
                    </button>
                </div>
            </div>
        </div>,
        target
    )
}

const EstadoBadge = ({ estado }) => {
    const cfg = {
        pendiente:  { label: 'Pendiente',  cls: 'inv-badge-pendiente' },
        confirmada: { label: 'Confirmada', cls: 'inv-badge-confirmada' },
        usada:      { label: 'Usada',      cls: 'inv-badge-usada' },
    }[estado] || { label: estado, cls: '' }
    return <span className={`inv-badge ${cfg.cls}`}>{cfg.label}</span>
}

const fmtFecha = (f) => f
    ? new Date(f).toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })
    : null

// ── Panel reutilizable (sin overlay) ─────────────────────────────────────────
export const InvitacionesPanel = ({ eventoId, eventoNombre, eventoImagen, eventoPrecio, eventoFecha }) => {
    const [invitaciones,      setInvitaciones]      = useState([])
    const [cargando,          setCargando]          = useState(true)
    const [error,             setError]             = useState(null)
    const [creando,           setCreando]           = useState(false)
    const [copiado,           setCopiado]           = useState(null)
    const [mostrarBroadcast,  setMostrarBroadcast]  = useState(false)
    const [pipWin,            setPipWin]            = useState(null)

    const handleEnviarTodas = async () => {
        const pip = await openPiP()
        if (pip) {
            pip.addEventListener('pagehide', () => {
                setPipWin(null)
                setMostrarBroadcast(false)
            })
            setPipWin(pip)
        }
        setMostrarBroadcast(true)
    }

    const handleCerrarBroadcast = () => {
        setMostrarBroadcast(false)
        if (pipWin && !pipWin.closed) pipWin.close()
        setPipWin(null)
    }

    const [form, setForm]         = useState({ telefono: '', num_invitados: 1, nombre_invitado: '' })
    const [formError, setFormError] = useState('')
    const [linkNuevo, setLinkNuevo] = useState(null)

    const cargar = async () => {
        if (!eventoId) { setCargando(false); return }
        setCargando(true); setError(null)
        try {
            const data = await getMisInvitaciones(eventoId)
            setInvitaciones(data.invitaciones || [])
        } catch (err) {
            setError(err?.response?.data?.message || 'No se pudieron cargar las invitaciones.')
        } finally { setCargando(false) }
    }

    useEffect(() => { cargar() }, [eventoId])

    const handleCrear = async (e) => {
        e.preventDefault(); setFormError('')
        if (!form.telefono.trim())    return setFormError('El teléfono es requerido.')
        if (!form.num_invitados || form.num_invitados < 1) return setFormError('Indicá cuántos invitados tiene esta persona.')
        setCreando(true)
        try {
            const data = await crearInvitacion({
                evento_id: eventoId,
                telefono: form.telefono.trim(),
                num_invitados: Number(form.num_invitados),
                nombre_invitado: form.nombre_invitado.trim() || undefined
            })
            setLinkNuevo({ link: data.link, token: data.token, telefono: form.telefono.trim() })
            setForm({ telefono: '', num_invitados: 1, nombre_invitado: '' })
            await cargar()
        } catch (err) {
            setFormError(err?.response?.data?.message || 'Error al crear la invitación.')
        } finally { setCreando(false) }
    }

    const copiar = async (texto, id) => {
        await navigator.clipboard.writeText(texto)
        setCopiado(id)
        setTimeout(() => setCopiado(null), 2000)
    }

    const fechaStr = fmtFecha(eventoFecha)

    if (!eventoId) {
        return (
            <div className='inv-panel'>
                <div className='inv-card-preview'>
                    {eventoImagen
                        ? <img src={eventoImagen} alt={eventoNombre} className='inv-card-preview-img'/>
                        : (
                            <div className='inv-card-preview-placeholder'>
                                <FiImage size={32}/>
                                <span>Sin imagen de invitación</span>
                            </div>
                        )
                    }
                    <div className='inv-card-preview-info'>
                        <h3>{eventoNombre}</h3>
                        {fechaStr && (
                            <span className='inv-card-preview-fecha'>
                                <FiCalendar size={12}/> {fechaStr}
                            </span>
                        )}
                    </div>
                </div>
                <div className='inv-pending-msg'>
                    <FiCalendar size={18}/>
                    <div>
                        <strong>El evento se activa al acreditar el pago</strong>
                        <p>Una vez que se procese la seña, podrás enviar invitaciones personalizadas a tus invitados.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='inv-panel'>

            {/* Vista previa de la tarjeta */}
            <div className='inv-card-preview'>
                {eventoImagen
                    ? <img src={eventoImagen} alt={eventoNombre} className='inv-card-preview-img'/>
                    : (
                        <div className='inv-card-preview-placeholder'>
                            <FiImage size={32}/>
                            <span>Sin imagen de invitación</span>
                        </div>
                    )
                }
                <div className='inv-card-preview-info'>
                    <h3>{eventoNombre}</h3>
                    {fechaStr && (
                        <span className='inv-card-preview-fecha'>
                            <FiCalendar size={12}/> {fechaStr}
                        </span>
                    )}
                    {eventoPrecio && (
                        <span className='inv-card-preview-precio'>
                            Entrada: <strong>${Number(eventoPrecio).toLocaleString('es-AR')}</strong>
                            <em className='inv-card-precio-hint'> · El invitado paga la entrada completa</em>
                        </span>
                    )}
                </div>
            </div>

            {/* Importar desde contactos */}
            <ContactPickerFlow eventoId={eventoId} onDone={cargar}/>

            {/* Formulario de nueva invitación */}
            <div className='inv-nueva-seccion'>
                <h3 className='inv-seccion-titulo'><FiPlus size={15}/> Enviar tarjeta a un invitado</h3>
                <form className='inv-form' onSubmit={handleCrear}>
                    <div className='inv-form-row'>
                        <label className='inv-campo'>
                            <span><FiPhone size={13}/> Teléfono WhatsApp</span>
                            <input type='tel' placeholder='Ej: 5493512345678 (con código de país)'
                                value={form.telefono}
                                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                                maxLength={20}/>
                        </label>
                        <label className='inv-campo inv-campo-sm'>
                            <span><FiUsers size={13}/> Entradas</span>
                            <input type='number' min={1} max={20}
                                value={form.num_invitados}
                                onChange={e => setForm(f => ({ ...f, num_invitados: e.target.value }))}/>
                        </label>
                    </div>
                    <label className='inv-campo'>
                        <span>Nombre (opcional)</span>
                        <input type='text' placeholder='Ej: Familia García'
                            value={form.nombre_invitado}
                            onChange={e => setForm(f => ({ ...f, nombre_invitado: e.target.value }))}
                            maxLength={100}/>
                    </label>
                    {formError && <p className='inv-form-error'>{formError}</p>}
                    <button type='submit' className='inv-btn-crear' disabled={creando}>
                        {creando ? 'Creando...' : <><FiSend size={14}/> Generar link y enviar</>}
                    </button>
                </form>
            </div>

            {/* Link recién creado */}
            {linkNuevo && (
                <div className='inv-link-nuevo'>
                    <p className='inv-link-nuevo-titulo'>¡Link generado! Abrí WhatsApp para enviarlo:</p>
                    <div className='inv-link-row'>
                        <span className='inv-link-text'>{linkNuevo.link}</span>
                        <button className='inv-btn-copiar' onClick={() => copiar(linkNuevo.link, 'nuevo')}>
                            {copiado === 'nuevo' ? <FiCheck size={14}/> : <FiCopy size={14}/>}
                        </button>
                    </div>
                    <button className='inv-btn-wa'
                        onClick={() => openWa(buildWaLink(linkNuevo.telefono, buildOgUrl(linkNuevo.token), eventoNombre))}>
                        {WA_SVG} Enviar por WhatsApp
                    </button>
                    <button className='inv-btn-cerrar-link' onClick={() => setLinkNuevo(null)}>Cerrar</button>
                </div>
            )}

            {/* Broadcast wizard */}
            {mostrarBroadcast && (
                <BroadcastWizard
                    invitaciones={invitaciones}
                    eventoNombre={eventoNombre}
                    pipWin={pipWin}
                    onClose={handleCerrarBroadcast}
                />
            )}

            {/* Lista */}
            <div className='inv-lista-seccion'>
                <div className='inv-lista-header'>
                    <h3 className='inv-seccion-titulo' style={{ margin: 0 }}>
                        Invitaciones enviadas
                        {invitaciones.length > 0 && <span className='inv-count-badge'>{invitaciones.length}</span>}
                    </h3>
                    {invitaciones.some(i => i.telefono && i.estado !== 'usada') && (
                        <button className='inv-btn-broadcast' onClick={handleEnviarTodas}>
                            {WA_SVG} Enviar todas
                        </button>
                    )}
                </div>
                {cargando && <p className='inv-cargando'>Cargando...</p>}
                {error    && <p className='inv-error'>{error}</p>}
                {!cargando && invitaciones.length === 0 && (
                    <p className='inv-vacio'>Todavía no enviaste ninguna invitación.</p>
                )}
                {invitaciones.map(inv => {
                    const link   = `${FRONTEND_URL}/invitacion/${inv.token}`
                    const ogLink = buildOgUrl(inv.token)
                    return (
                        <div key={inv.id_invitacion} className='inv-item'>
                            <div className='inv-item-info'>
                                <span className='inv-item-nombre'>{inv.nombre_invitado || 'Sin nombre'}</span>
                                <span className='inv-item-tel'>{inv.telefono || '—'}</span>
                                <span className='inv-item-cupo'><FiUsers size={12}/> {inv.num_invitados} entrada(s)</span>
                            </div>
                            <div className='inv-item-acciones'>
                                <EstadoBadge estado={inv.estado} />
                                {inv.estado !== 'usada' && inv.telefono && (
                                    <button className='inv-item-wa'
                                        onClick={() => openWa(buildWaLink(inv.telefono, ogLink, eventoNombre))}
                                        title='Reenviar por WhatsApp'>
                                        {WA_SVG}
                                    </button>
                                )}
                                <button className='inv-item-copiar'
                                    onClick={() => copiar(link, inv.id_invitacion)}
                                    title='Copiar link'>
                                    {copiado === inv.id_invitacion ? <FiCheck size={13}/> : <FiCopy size={13}/>}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── Modal con overlay (para uso standalone) ───────────────────────────────────
const InvitacionesModal = ({ eventoId, eventoNombre, eventoImagen, eventoPrecio, eventoFecha, onClose }) => createPortal(
    <div className='inv-overlay' onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className='inv-modal'>
            <div className='inv-header'>
                <div className='inv-header-titulo'>
                    <FiSend size={18}/>
                    <h2>Invitaciones</h2>
                    <span className='inv-header-sub'>{eventoNombre}</span>
                </div>
                <button className='inv-cerrar' onClick={onClose}><FiX size={20}/></button>
            </div>
            <div className='inv-body'>
                <InvitacionesPanel
                    eventoId={eventoId}
                    eventoNombre={eventoNombre}
                    eventoImagen={eventoImagen}
                    eventoPrecio={eventoPrecio}
                    eventoFecha={eventoFecha}
                />
            </div>
        </div>
    </div>,
    document.body
)

export default InvitacionesModal
