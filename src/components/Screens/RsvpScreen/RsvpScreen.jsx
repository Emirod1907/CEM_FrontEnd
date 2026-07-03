import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvitacionPublica, confirmarInvitados, pagarInvitacion } from '../../../services/invitacionServices'
import { loginRequest, registerRequest } from '../../../services/personasServices'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import {
    FiCalendar, FiCheckCircle, FiAlertCircle, FiUser,
    FiLock, FiMail, FiPlus, FiTrash2, FiCreditCard, FiLogIn
} from 'react-icons/fi'
import './RsvpScreen.css'

const fmtFecha = (f) => f
    ? new Date(f).toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
    : ''

// ── Pasos ──────────────────────────────────────────────────────────────────────
const PASO_TARJETA  = 'tarjeta'
const PASO_AUTH     = 'auth'
const PASO_INVITADOS = 'invitados'
const PASO_PAGO     = 'pago'

// ── Formulario de login/registro inline ───────────────────────────────────────
const AuthInline = ({ onSuccess }) => {
    const [modo, setModo]   = useState('login') // 'login' | 'registro'
    const [form, setForm]   = useState({ nombre:'', apellido:'', email:'', nombre_usuario:'', password:'' })
    const [error, setError] = useState('')
    const [cargando, setCargando] = useState(false)

    const set = (k, v) => setForm(p => ({ ...p, [k]:v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setCargando(true)
        try {
            if (modo === 'login') {
                await loginRequest({ email: form.email, user_password: form.password })
            } else {
                await registerRequest({
                    nombre: form.nombre,
                    apellido: form.apellido,
                    email: form.email,
                    nombre_usuario: form.nombre_usuario,
                    user_password: form.password,
                    rol: 'entusiasta'
                })
            }
            onSuccess()
        } catch (err) {
            setError(err.message || 'Error. Intentá de nuevo.')
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className='rsvp-auth'>
            <div className='rsvp-auth-tabs'>
                <button
                    type='button'
                    className={`rsvp-auth-tab ${modo==='login'?'rsvp-auth-tab--active':''}`}
                    onClick={() => { setModo('login'); setError('') }}
                >
                    <FiLogIn size={14}/> Iniciar sesión
                </button>
                <button
                    type='button'
                    className={`rsvp-auth-tab ${modo==='registro'?'rsvp-auth-tab--active':''}`}
                    onClick={() => { setModo('registro'); setError('') }}
                >
                    <FiUser size={14}/> Crear cuenta
                </button>
            </div>

            <form className='rsvp-auth-form' onSubmit={handleSubmit}>
                {modo === 'registro' && (
                    <>
                        <div className='rsvp-form-row'>
                            <div className='rsvp-input-grupo'>
                                <label>Nombre</label>
                                <input type='text' placeholder='María' value={form.nombre}
                                    onChange={e => set('nombre', e.target.value)} required maxLength={50}/>
                            </div>
                            <div className='rsvp-input-grupo'>
                                <label>Apellido</label>
                                <input type='text' placeholder='González' value={form.apellido}
                                    onChange={e => set('apellido', e.target.value)} required maxLength={50}/>
                            </div>
                        </div>
                        <div className='rsvp-input-grupo'>
                            <label>Nombre de usuario</label>
                            <input type='text' placeholder='mariag' value={form.nombre_usuario}
                                onChange={e => set('nombre_usuario', e.target.value)} required maxLength={30}/>
                        </div>
                    </>
                )}
                <div className='rsvp-input-grupo'>
                    <label><FiMail size={13}/> Correo electrónico</label>
                    <input type='email' placeholder='maria@ejemplo.com' value={form.email}
                        onChange={e => set('email', e.target.value)} required/>
                </div>
                <div className='rsvp-input-grupo'>
                    <label><FiLock size={13}/> Contraseña</label>
                    <input type='password' placeholder='••••••••' value={form.password}
                        onChange={e => set('password', e.target.value)} required/>
                </div>

                {error && (
                    <div className='rsvp-error-msg'>
                        <FiAlertCircle size={14}/> {error}
                    </div>
                )}

                <button type='submit' className='rsvp-btn-confirmar' disabled={cargando}>
                    {cargando ? 'Procesando...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta y continuar'}
                </button>
            </form>
        </div>
    )
}

// ── Fila de un invitado ────────────────────────────────────────────────────────
const InvitadoFila = ({ idx, inv, esExtra, onChange, onRemove }) => (
    <div className={`rsvp-invitado-fila ${esExtra ? 'rsvp-invitado-fila--extra' : ''}`}>
        <span className='rsvp-invitado-num'>
            {esExtra ? 'Familiar adicional' : `Invitado ${idx + 1}`}
        </span>
        <div className='rsvp-invitado-campos'>
            <input
                type='text'
                placeholder='Nombre completo'
                value={inv.nombre}
                onChange={e => onChange('nombre', e.target.value)}
                maxLength={100}
                required
            />
            <input
                type='text'
                placeholder='DNI (sólo números)'
                value={inv.dni}
                onChange={e => onChange('dni', e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                pattern='\d{7,10}'
                title='Entre 7 y 10 dígitos'
                required
            />
        </div>
        {esExtra && (
            <button type='button' className='rsvp-invitado-remove' onClick={onRemove} title='Quitar'>
                <FiTrash2 size={14}/>
            </button>
        )}
    </div>
)

// ── Componente principal ───────────────────────────────────────────────────────
const RsvpScreen = () => {
    const { token } = useParams()
    const navigate  = useNavigate()
    const { isAuthenticated, loading: authLoading, persona } = useAuth()

    const [invitacion, setInvitacion] = useState(null)
    const [cargando,   setCargando]   = useState(true)
    const [error,      setError]      = useState(null)
    const [paso,       setPaso]       = useState(PASO_TARJETA)

    // Slots de invitados: uno por num_invitados + los extras
    const [invitados, setInvitados] = useState([])
    const [enviando,  setEnviando]  = useState(false)
    const [formError, setFormError] = useState('')

    // Pago
    const [preferencia, setPreferencia] = useState(null)
    const [pagando,     setPagando]     = useState(false)
    const [tipoPago,    setTipoPago]    = useState(null) // 'seña' | 'total'

    // Cargar invitación
    useEffect(() => {
        const cargar = async () => {
            try {
                const data = await getInvitacionPublica(token)
                setInvitacion(data)
                // Inicializar slots vacíos
                setInvitados(
                    Array.from({ length: data.num_invitados }, () => ({ dni:'', nombre:'', es_extra:false }))
                )
            } catch (err) {
                const msg = err?.response?.data?.message || 'Invitación no válida o ya fue utilizada.'
                setError(msg)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [token])

    // Avanzar al paso correcto una vez que cargó
    useEffect(() => {
        if (!invitacion || authLoading) return
        if (invitacion.ya_confirmada) {
            setPaso(PASO_PAGO)
        } else if (paso === PASO_TARJETA) {
            // no avanzar automáticamente, el usuario hace click
        }
    }, [invitacion, authLoading])

    const handleVerInvitacion = () => {
        if (!isAuthenticated) { setPaso(PASO_AUTH); return }
        setPaso(PASO_INVITADOS)
    }

    const handleAuthOk = () => {
        // Refresh auth state via window.location.reload() — simple approach
        // The auth context will re-verify the cookie
        window.location.reload()
    }

    const setInvitadoCampo = (idx, campo, valor) => {
        setInvitados(prev => prev.map((inv, i) => i === idx ? { ...inv, [campo]: valor } : inv))
    }

    const agregarExtra = () => {
        setInvitados(prev => [...prev, { dni:'', nombre:'', es_extra:true }])
    }

    const quitarExtra = (idx) => {
        setInvitados(prev => prev.filter((_, i) => i !== idx))
    }

    const handleConfirmar = async (e) => {
        e.preventDefault()
        setFormError('')

        const validos = invitados.filter(i => i.dni.trim() && i.nombre.trim())
        if (validos.length < invitados.filter(i => !i.es_extra).length) {
            setFormError('Completá el nombre y DNI de todos los invitados asignados.')
            return
        }

        setEnviando(true)
        try {
            await confirmarInvitados(token, invitados.map((inv, idx) => ({
                ...inv,
                orden: inv.es_extra ? 0 : idx + 1
            })))
            setPaso(PASO_PAGO)
        } catch (err) {
            setFormError(err?.response?.data?.message || 'Error al confirmar. Intentá de nuevo.')
        } finally {
            setEnviando(false)
        }
    }

    const handlePagar = async (tipo) => {
        setTipoPago(tipo)
        setPagando(true)
        try {
            const data = await pagarInvitacion(token, tipo)
            // Con credenciales de cuentas de prueba (APP_USR-) se usa init_point
            const url = data.init_point || data.sandbox_init_point
            if (!url) {
                setPreferencia(data)
                return
            }
            // Guardar la orden pendiente: el backend la acredita solo y al
            // volver a la app PagoPendienteWatcher muestra el resultado
            if (data.orden_id) {
                localStorage.setItem('cem_orden_pendiente', JSON.stringify({ orden_id: data.orden_id, ts: Date.now() }))
            }
            window.location.href = url
        } catch (err) {
            setFormError(err?.response?.data?.message || 'Error al iniciar el pago.')
            setTipoPago(null)
        } finally {
            setPagando(false)
        }
    }

    // ── Estados de carga / error ──────────────────────────────────────────────

    if (cargando || authLoading) {
        return (
            <div className='rsvp-container'>
                <div className='rsvp-card'>
                    <div className='rsvp-cargando'>
                        <div className='rsvp-spinner'/>
                        <p>Cargando invitación...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error && !invitacion) {
        return (
            <div className='rsvp-container'>
                <div className='rsvp-card rsvp-card-error'>
                    <FiAlertCircle size={52} className='rsvp-icon-error'/>
                    <h2>Invitación inválida</h2>
                    <p>{error}</p>
                    <button className='rsvp-btn-home' onClick={() => navigate('/')}>Ir al inicio</button>
                </div>
            </div>
        )
    }

    const evento = invitacion?.evento

    // ── PASO: TARJETA ─────────────────────────────────────────────────────────
    if (paso === PASO_TARJETA) {
        return (
            <div className='rsvp-container'>
                <div className='rsvp-card'>
                    <div className='rsvp-header'>
                        <h1>Dream Events</h1>
                        <p>Hacé realidad tu evento soñado</p>
                    </div>

                    <div className='rsvp-evento-info'>
                        {evento?.imagen && <img src={evento.imagen} alt={evento.nombre} className='rsvp-evento-img'/>}
                        <div className='rsvp-evento-badge'>🔒 Evento privado · Invitación personal</div>
                        <h2 className='rsvp-evento-nombre'>{evento?.nombre || 'Evento privado'}</h2>
                        {evento?.fecha && (
                            <div className='rsvp-evento-fecha'>
                                <FiCalendar size={15}/>
                                <span>{fmtFecha(evento.fecha)}</span>
                            </div>
                        )}
                        {evento?.descripcion && <p className='rsvp-evento-desc'>{evento.descripcion}</p>}
                        {evento?.precio && (
                            <p className='rsvp-evento-precio'>
                                Entrada: <strong>${Number(evento.precio).toLocaleString('es-AR')}</strong>
                            </p>
                        )}
                        <div className='rsvp-invitados-asignados'>
                            <FiUser size={14}/>
                            <span>Te corresponden <strong>{invitacion?.num_invitados}</strong> entrada(s)</span>
                        </div>
                    </div>

                    <div className='rsvp-divider'/>

                    <div className='rsvp-form-section'>
                        {invitacion?.nombre_invitado && (
                            <p className='rsvp-invitado-saludo'>
                                ¡Hola, <strong>{invitacion.nombre_invitado}</strong>!
                            </p>
                        )}
                        <p className='rsvp-form-hint'>
                            Para confirmar tu asistencia y proceder al pago,{' '}
                            {isAuthenticated ? 'ingresá el DNI de cada invitado.' : 'necesitás iniciar sesión o crear una cuenta.'}
                        </p>
                        <button className='rsvp-btn-confirmar' onClick={handleVerInvitacion}>
                            {isAuthenticated ? '✅ Confirmar asistencia' : '🔐 Continuar con mi cuenta'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── PASO: AUTH ────────────────────────────────────────────────────────────
    if (paso === PASO_AUTH) {
        return (
            <div className='rsvp-container'>
                <div className='rsvp-card'>
                    <div className='rsvp-header'>
                        <h1>Dream Events</h1>
                        <p>Accedé para confirmar tu invitación</p>
                    </div>
                    <div className='rsvp-form-section'>
                        <h3>{evento?.nombre}</h3>
                        <p className='rsvp-form-hint'>
                            Necesitás una cuenta de Dream Events para confirmar tu asistencia. Es rápido y gratuito.
                        </p>
                        <AuthInline onSuccess={handleAuthOk}/>
                        <button className='rsvp-btn-volver' onClick={() => setPaso(PASO_TARJETA)}>
                            ← Volver a la invitación
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── PASO: INVITADOS ───────────────────────────────────────────────────────
    if (paso === PASO_INVITADOS) {
        const asignados = invitados.filter(i => !i.es_extra)
        const extras    = invitados.filter(i => i.es_extra)

        return (
            <div className='rsvp-container'>
                <div className='rsvp-card rsvp-card-wide'>
                    <div className='rsvp-header'>
                        <h1>Dream Events</h1>
                        <p>Confirmación de asistencia</p>
                    </div>

                    <div className='rsvp-form-section'>
                        <h3>{evento?.nombre}</h3>
                        <p className='rsvp-form-hint'>
                            Completá el nombre y DNI de cada persona que asistirá. Podés agregar familiares adicionales
                            fuera de los asignados (se incluyen en el mismo pago).
                        </p>

                        {formError && (
                            <div className='rsvp-error-msg'>
                                <FiAlertCircle size={14}/> {formError}
                            </div>
                        )}

                        <form onSubmit={handleConfirmar}>
                            <div className='rsvp-invitados-lista'>
                                {/* Slots asignados */}
                                {asignados.map((inv, idx) => (
                                    <InvitadoFila
                                        key={idx}
                                        idx={idx}
                                        inv={inv}
                                        esExtra={false}
                                        onChange={(campo, valor) => setInvitadoCampo(idx, campo, valor)}
                                        onRemove={null}
                                    />
                                ))}

                                {/* Extras */}
                                {extras.map((inv, i) => {
                                    const idx = asignados.length + i
                                    return (
                                        <InvitadoFila
                                            key={idx}
                                            idx={i}
                                            inv={inv}
                                            esExtra={true}
                                            onChange={(campo, valor) => setInvitadoCampo(idx, campo, valor)}
                                            onRemove={() => quitarExtra(idx)}
                                        />
                                    )
                                })}
                            </div>

                            <button type='button' className='rsvp-btn-agregar-extra' onClick={agregarExtra}>
                                <FiPlus size={14}/> Agregar familiar adicional
                            </button>

                            <div className='rsvp-resumen-pago'>
                                <span>Total a pagar:</span>
                                <strong>
                                    {evento?.precio
                                        ? `$${(Number(evento.precio) * invitados.length).toLocaleString('es-AR')} (${invitados.length} entrada${invitados.length !== 1 ? 's' : ''})`
                                        : `${invitados.length} entrada${invitados.length !== 1 ? 's' : ''}`
                                    }
                                </strong>
                            </div>

                            <button type='submit' className='rsvp-btn-confirmar' disabled={enviando}>
                                {enviando ? 'Registrando...' : '✅ Confirmar y ver pago'}
                            </button>
                        </form>

                        <button className='rsvp-btn-volver' onClick={() => setPaso(PASO_TARJETA)}>
                            ← Volver
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── PASO: PAGO ────────────────────────────────────────────────────────────
    return (
        <div className='rsvp-container'>
            <div className='rsvp-card'>
                <div className='rsvp-header'>
                    <h1>Dream Events</h1>
                    <p>Hacé realidad tu evento soñado</p>
                </div>

                <div className='rsvp-card-success'>
                    <FiCheckCircle size={56} className='rsvp-icon-success'/>
                    <h2>¡Invitados registrados!</h2>
                    <p className='rsvp-mensaje-ok'>
                        Para completar la confirmación, realizá el pago de las entradas.
                    </p>

                    {evento?.nombre && (
                        <div className='rsvp-evento-badge' style={{ marginBottom: 4 }}>
                            {evento.nombre}
                        </div>
                    )}

                    {formError && (
                        <div className='rsvp-error-msg'>
                            <FiAlertCircle size={14}/> {formError}
                        </div>
                    )}

                    {evento?.precio && (
                        <div className='rsvp-pago-opciones'>
                            <div className='rsvp-pago-opcion'>
                                <div className='rsvp-pago-opcion-info'>
                                    <span className='rsvp-pago-opcion-titulo'>Pagar entrada completa</span>
                                    <span className='rsvp-pago-opcion-desc'>
                                        ${(Number(evento.precio) * (invitados.length || invitacion?.num_invitados || 1)).toLocaleString('es-AR')} — sin saldo pendiente
                                    </span>
                                </div>
                                <button className='rsvp-btn-pagar'
                                    onClick={() => handlePagar('total')}
                                    disabled={pagando}>
                                    {pagando && tipoPago === 'total' ? 'Preparando...' : <><FiCreditCard size={15}/> Pagar total</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {!evento?.precio && (
                        <button className='rsvp-btn-pagar' onClick={() => handlePagar('total')} disabled={pagando}>
                            {pagando ? 'Preparando pago...' : <><FiCreditCard size={16}/> Confirmar asistencia</>}
                        </button>
                    )}

                    <button className='rsvp-btn-home' onClick={() => navigate('/')}>
                        Pagar más tarde
                    </button>
                </div>
            </div>
        </div>
    )
}

export default RsvpScreen
