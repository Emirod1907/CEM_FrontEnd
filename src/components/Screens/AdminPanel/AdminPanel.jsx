import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { getRolesRequest, getPermisosRequest, updateRolPermisosRequest } from '../../../services/rbacServices'
import { getComisionesRequest, updateComisionRequest } from '../../../services/comisionesServices'
import { getLiquidaciones, liquidarDesglose } from '../../../services/liquidacionesServices'
import { EMAILS_FULL_ACCESS } from '../../../config/fullAccessEmails'
import './AdminPanel.css'

const LABEL_PERFIL = {
    salon: 'Salones',
    catering: 'Catering',
    decoracion: 'Decoración',
    audio_video: 'Audio y video',
    seguridad: 'Seguridad',
    mobiliario: 'Mobiliario',
    entretenimiento: 'Entretenimiento',
    otro: 'Otros',
}

const SUBLABEL_PERFIL = {
    salon: 'Dueños de salón',
    catering: 'Proveedores de catering',
    decoracion: 'Proveedores de decoración',
    audio_video: 'Proveedores técnicos',
    seguridad: 'Proveedores de seguridad',
    mobiliario: 'Proveedores de mobiliario',
    entretenimiento: 'Proveedores de entretenimiento',
    otro: 'Otros proveedores',
}

const NOMBRES_ROLES = {
    admin: 'Administrador',
    organizador: 'Organizador',
    cliente: 'Cliente',
    entusiasta: 'Entusiasta',
    dueno_salon: 'Dueño de salón',
    duenio_salon: 'Dueño de salón',
    proveedor_servicios: 'Proveedor de servicios',
    proveedor_insumos: 'Proveedor de insumos',
}

const ICONOS_ROLES = {
    admin: 'shield',
    organizador: 'calendar',
    cliente: 'user',
    entusiasta: 'star',
    dueno_salon: 'home',
    duenio_salon: 'home',
    proveedor_servicios: 'wrench',
    proveedor_insumos: 'package',
}

const normalizarTexto = (valor = '') => String(valor).replaceAll('_', ' ')

const getRolNombre = (rol) => NOMBRES_ROLES[rol?.nombre] || normalizarTexto(rol?.nombre || '')
const getRolIcono = (rol) => ICONOS_ROLES[rol?.nombre] || 'dot'
const mensajeClase = (tipo) => tipo === 'exito' ? 'exito' : tipo === 'error' ? 'error' : 'info'

const ENTIDADES = ['cliente', 'organizador', 'salon']
const ACCIONES = ['ver', 'crear', 'editar', 'eliminar']

const ETIQUETAS_ENTIDAD = {
    cliente: 'Clientes',
    organizador: 'Organizadores',
    salon: 'Salones'
}

const ETIQUETAS_ACCION = {
    ver: 'Ver',
    crear: 'Crear',
    editar: 'Editar',
    eliminar: 'Eliminar'
}

const ICONOS_ENTIDAD = {
    cliente: 'user',
    organizador: 'calendar',
    salon: 'landmark'
}

const ICONOS_ACCION = {
    ver: 'eye',
    crear: 'plus',
    editar: 'pencil',
    eliminar: 'trash'
}

// ── Set de íconos de línea (presentacional, hereda color con currentColor) ──
const GLYPHS = {
    sparkle: <path d="M12 3l1.6 5.2a3 3 0 0 0 2.2 2.2L21 12l-5.2 1.6a3 3 0 0 0-2.2 2.2L12 21l-1.6-5.2a3 3 0 0 0-2.2-2.2L3 12l5.2-1.6a3 3 0 0 0 2.2-2.2L12 3z" />,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
    user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-3.9 3.4-6.6 7.5-6.6s7.5 2.7 7.5 6.6" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.4" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M8.5 14h2M13.5 14h2M8.5 17.5h2M13.5 17.5h2" /></>,
    star: <path d="M12 3.5l2.5 5.1 5.6.8-4.1 4 1 5.6L12 16.4 6.9 19l1-5.6-4.1-4 5.6-.8L12 3.5z" />,
    home: <><path d="M4 11l8-6.5 8 6.5" /><path d="M6 9.7V20h12V9.7" /><path d="M10.5 20v-4.5h3V20" /></>,
    landmark: <><path d="M12 3.5L4 7.6h16L12 3.5z" /><path d="M3.5 20.5h17" /><path d="M6 10.5V18M10 10.5V18M14 10.5V18M18 10.5V18" /></>,
    wrench: <path d="M15.4 6.2a4.3 4.3 0 0 1-5.6 5.6l-5.3 5.3 2.4 2.4 5.3-5.3a4.3 4.3 0 0 0 5.6-5.6l-2.7 2.7-2.4-2.4 2.7-2.7z" />,
    package: <><path d="M21 8.2L12 3.5 3 8.2v7.6L12 20.5l9-4.7V8.2z" /><path d="M3 8.2l9 4.7 9-4.7M12 20.5v-7.6" /></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
    plus: <path d="M12 5.5v13M5.5 12h13" />,
    pencil: <><path d="M4 20h4L18.4 9.6a2 2 0 0 0-2.8-2.8L5 17.4V20z" /><path d="M14.5 8l2.5 2.5" /></>,
    trash: <><path d="M4 6.5h16M9 6.5V4.8a1.8 1.8 0 0 1 1.8-1.8h2.4A1.8 1.8 0 0 1 15 4.8v1.7" /><path d="M6.5 6.5l.9 12.6a1.8 1.8 0 0 0 1.8 1.7h5.6a1.8 1.8 0 0 0 1.8-1.7l.9-12.6" /></>,
    dot: <circle cx="12" cy="12" r="3" />,
}

const Glyph = ({ name, className = 'admin-glyph' }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        {GLYPHS[name] || GLYPHS.dot}
    </svg>
)

// ── Panel de comisiones de contrato (cliente / proveedor por tipo de perfil) ──
const ComisionesPanel = () => {
    const [comisiones, setComisiones] = useState([])
    const [edit, setEdit] = useState({})
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(null)
    const [msg, setMsg] = useState(null)

    const cargar = async () => {
        setCargando(true)
        try {
            const r = await getComisionesRequest()
            const list = r.data.comisiones || []
            setComisiones(list)
            const e = {}
            for (const c of list) e[c.tipo_perfil] = {
                cliente: String(c.comision_cliente_porcentaje),
                proveedor: String(c.comision_proveedor_porcentaje),
            }
            setEdit(e)
        } catch {
            setMsg({ tipo: 'error', texto: 'Error al cargar las comisiones.' })
        } finally { setCargando(false) }
    }

    useEffect(() => { cargar() }, [])

    const setCampo = (tp, campo, val) => setEdit(prev => ({ ...prev, [tp]: { ...prev[tp], [campo]: val } }))

    const cambiado = (c) => {
        const e = edit[c.tipo_perfil]
        if (!e) return false
        return Number(e.cliente) !== Number(c.comision_cliente_porcentaje) ||
            Number(e.proveedor) !== Number(c.comision_proveedor_porcentaje)
    }

    const guardar = async (c) => {
        const e = edit[c.tipo_perfil]
        const cli = Number(e.cliente), prov = Number(e.proveedor)

        if ([cli, prov].some(v => isNaN(v) || v < 0 || v > 50)) {
            setMsg({ tipo: 'error', texto: 'Los porcentajes deben estar entre 0 y 50.' })
            return
        }

        setGuardando(c.tipo_perfil)
        setMsg(null)

        try {
            const r = await updateComisionRequest(c.tipo_perfil, {
                comision_cliente_porcentaje: cli,
                comision_proveedor_porcentaje: prov,
            })

            const n = r?.data?.notificados
            setMsg({
                tipo: 'exito',
                texto: `Comisión de ${LABEL_PERFIL[c.tipo_perfil] || c.tipo_perfil} actualizada.` +
                    (n ? ` Se notificó a ${n} usuario(s) por el cambio de condiciones.` : '')
            })
            await cargar()
        } catch (err) {
            setMsg({ tipo: 'error', texto: err?.response?.data?.message || 'Error al guardar la comisión.' })
        } finally { setGuardando(null) }
    }

    const fmtFecha = (f) => f ? new Date(f).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Sin registros'

    if (cargando) return <div className="admin-loading admin-loading-card">Cargando comisiones...</div>

    return (
        <section className="admin-card admin-permisos-section">
            <div className="admin-section-heading">
                <div>
                    <span className="admin-eyebrow"><Glyph name="sparkle" className="admin-eyebrow-glyph" />Configuración comercial</span>
                    <h2>Comisiones de contrato</h2>
                    <p className="admin-rol-descripcion admin-copy">
                        Definí el porcentaje que Dream Events aplica sobre el precio base. La comisión del cliente se suma al importe que paga el organizador; la comisión del proveedor se descuenta al dueño de salón o proveedor correspondiente.
                    </p>
                </div>
                <div className="admin-section-badge">Notifica cambios</div>
            </div>

            {msg && <div className={`admin-mensaje admin-mensaje-${mensajeClase(msg.tipo)}`}>{msg.texto}</div>}

            <div className="admin-tabla-wrapper">
                <table className="admin-tabla admin-tabla-comisiones">
                    <thead>
                        <tr>
                            <th className="admin-th-entidad">Tipo de perfil</th>
                            <th>Cliente (%)</th>
                            <th>Proveedor (%)</th>
                            <th>Última actualización</th>
                            <th className="admin-th-actions">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comisiones.map(c => {
                            const e = edit[c.tipo_perfil] || {}
                            const upd = c.AdminActualizador
                            return (
                                <tr key={c.tipo_perfil}>
                                    <td className="admin-td-entidad">
                                        <strong>{LABEL_PERFIL[c.tipo_perfil] || normalizarTexto(c.tipo_perfil)}</strong>
                                        <span className="admin-perfil-hint">{SUBLABEL_PERFIL[c.tipo_perfil] || 'Proveedores'}</span>
                                    </td>
                                    <td>
                                        <div className="admin-com-field">
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                step="0.5"
                                                className="admin-com-input"
                                                value={e.cliente ?? ''}
                                                onChange={ev => setCampo(c.tipo_perfil, 'cliente', ev.target.value)}
                                            />
                                            <span className="admin-com-suffix">%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-com-field">
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                step="0.5"
                                                className="admin-com-input"
                                                value={e.proveedor ?? ''}
                                                onChange={ev => setCampo(c.tipo_perfil, 'proveedor', ev.target.value)}
                                            />
                                            <span className="admin-com-suffix">%</span>
                                        </div>
                                    </td>
                                    <td className="admin-com-meta">
                                        {fmtFecha(c.fecha_actualizacion)}
                                        {upd && <span className="admin-perfil-hint">por {upd.nombre} {upd.apellido}</span>}
                                    </td>
                                    <td>
                                        <button
                                            className="admin-btn-guardar admin-btn-com"
                                            onClick={() => guardar(c)}
                                            disabled={guardando === c.tipo_perfil || !cambiado(c)}
                                        >
                                            {guardando === c.tipo_perfil ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`

// Panel de liquidaciones: reparto (settlement) del neto a cada vendedor. Muestra si
// el vendedor conectó su MercadoPago (para pagarle directo) y permite marcar liquidado.
const LiquidacionesPanel = () => {
    const [filas, setFilas]       = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtro, setFiltro]     = useState('')
    const [procesando, setProcesando] = useState(null)
    const [msg, setMsg]           = useState(null)

    const cargar = () => {
        setCargando(true)
        getLiquidaciones(filtro)
            .then(setFilas)
            .catch(() => setMsg({ tipo: 'error', texto: 'No se pudieron cargar las liquidaciones.' }))
            .finally(() => setCargando(false))
    }
    useEffect(() => { cargar() }, [filtro])

    const handleLiquidar = async (orden_id) => {
        setProcesando(orden_id); setMsg(null)
        try {
            const r = await liquidarDesglose(orden_id)
            setMsg({ tipo: 'ok', texto: r.mp_conectado
                ? 'Liquidado. El vendedor tiene MercadoPago conectado: el pago se acredita en su cuenta.'
                : 'Liquidado. El vendedor no conectó MercadoPago; coordiná el pago manualmente.' })
            cargar()
        } catch (e) {
            setMsg({ tipo: 'error', texto: e?.response?.data?.message || 'No se pudo liquidar.' })
        } finally { setProcesando(null) }
    }

    return (
        <section className="admin-card">
            <div className="admin-section-heading compact">
                <h2>Liquidaciones a vendedores</h2>
                <select value={filtro} onChange={e => setFiltro(e.target.value)} className="admin-select">
                    <option value="">Todas</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="liquidado">Liquidadas</option>
                    <option value="facturado">Facturadas</option>
                </select>
            </div>
            {msg && <p className={`admin-flash ${msg.tipo}`}>{msg.texto}</p>}
            {cargando ? <p className="admin-muted">Cargando…</p> : filas.length === 0 ? (
                <p className="admin-muted">No hay liquidaciones para este filtro.</p>
            ) : (
                <div className="admin-tabla-wrapper">
                    <table className="admin-tabla">
                        <thead><tr>
                            <th>Orden</th><th>Beneficiario</th><th>MercadoPago</th>
                            <th>Bruto</th><th>Neto vendedor</th><th>Estado</th><th></th>
                        </tr></thead>
                        <tbody>
                            {filas.map(f => (
                                <tr key={f.orden_id}>
                                    <td>#{f.orden_id}</td>
                                    <td>{f.beneficiario?.nombre || '—'}</td>
                                    <td>
                                        {f.beneficiario?.mp_conectado
                                            ? <span className="lq-badge lq-ok">✓ Conectado</span>
                                            : <span className="lq-badge lq-no">Sin conectar</span>}
                                    </td>
                                    <td>{fmtMoney(f.monto_bruto)}</td>
                                    <td>{fmtMoney(f.monto_neto_proveedor)}</td>
                                    <td><span className={`lq-estado lq-${f.estado_liquidacion}`}>{f.estado_liquidacion}</span></td>
                                    <td>
                                        {f.estado_liquidacion === 'pendiente' && (
                                            <button className="admin-btn-mini" disabled={procesando === f.orden_id}
                                                onClick={() => handleLiquidar(f.orden_id)}>
                                                {procesando === f.orden_id ? '…' : 'Liquidar'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

const AdminPanel = () => {
    const { persona } = useAuth()
    const navigate = useNavigate()

    const [roles, setRoles] = useState([])
    const [permisos, setPermisos] = useState([])
    const [rolSeleccionado, setRolSeleccionado] = useState(null)
    const [seleccionados, setSeleccionados] = useState(new Set())
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [vista, setVista] = useState('permisos')

    useEffect(() => {
        if (persona && persona.rol !== 'admin' && !EMAILS_FULL_ACCESS.includes(persona.email)) {
            navigate('/')
        }
    }, [persona, navigate])

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resRoles, resPermisos] = await Promise.all([
                    getRolesRequest(),
                    getPermisosRequest()
                ])
                setRoles(resRoles.data.roles)
                setPermisos(resPermisos.data.permisos)

                if (resRoles.data.roles.length > 0) {
                    const primerRol = resRoles.data.roles[0]
                    setRolSeleccionado(primerRol)
                    setSeleccionados(new Set(primerRol.Permisos.map(p => p.id_permiso)))
                }
            } catch (error) {
                console.error('Error cargando datos RBAC:', error)
                setMensaje({ tipo: 'error', texto: 'Error al cargar los datos.' })
            } finally {
                setCargando(false)
            }
        }
        cargarDatos()
    }, [])

    const permisosActivos = seleccionados.size
    const totalPermisos = permisos.length

    const resumenRol = useMemo(() => {
        if (!rolSeleccionado) return null
        return {
            nombre: getRolNombre(rolSeleccionado),
            descripcion: rolSeleccionado.descripcion || 'Rol sin descripción cargada.',
            icono: getRolIcono(rolSeleccionado)
        }
    }, [rolSeleccionado])

    const handleCambiarRol = (rol) => {
        setRolSeleccionado(rol)
        setSeleccionados(new Set(rol.Permisos.map(p => p.id_permiso)))
        setMensaje(null)
    }

    const handleTogglePermiso = (permisoId) => {
        setSeleccionados(prev => {
            const nuevo = new Set(prev)
            if (nuevo.has(permisoId)) nuevo.delete(permisoId)
            else nuevo.add(permisoId)
            return nuevo
        })
    }

    const handleToggleEntidad = (entidad) => {
        const permisosDeEntidad = permisos.filter(p => p.entidad === entidad).map(p => p.id_permiso)
        const todosActivos = permisosDeEntidad.every(id => seleccionados.has(id))

        setSeleccionados(prev => {
            const nuevo = new Set(prev)
            if (todosActivos) permisosDeEntidad.forEach(id => nuevo.delete(id))
            else permisosDeEntidad.forEach(id => nuevo.add(id))
            return nuevo
        })
    }

    const handleToggleAccion = (accion) => {
        const permisosDeAccion = permisos.filter(p => p.accion === accion).map(p => p.id_permiso)
        const todosActivos = permisosDeAccion.every(id => seleccionados.has(id))

        setSeleccionados(prev => {
            const nuevo = new Set(prev)
            if (todosActivos) permisosDeAccion.forEach(id => nuevo.delete(id))
            else permisosDeAccion.forEach(id => nuevo.add(id))
            return nuevo
        })
    }

    const handleGuardar = async () => {
        if (!rolSeleccionado) return
        setGuardando(true)
        setMensaje(null)

        try {
            await updateRolPermisosRequest(rolSeleccionado.id_rol, Array.from(seleccionados))
            setRoles(prev => prev.map(r =>
                r.id_rol === rolSeleccionado.id_rol
                    ? { ...r, Permisos: permisos.filter(p => seleccionados.has(p.id_permiso)) }
                    : r
            ))
            setMensaje({ tipo: 'exito', texto: 'Permisos guardados correctamente.' })
        } catch (error) {
            console.error('Error guardando permisos:', error)
            setMensaje({ tipo: 'error', texto: 'Error al guardar los permisos.' })
        } finally {
            setGuardando(false)
        }
    }

    const getPermisoId = (entidad, accion) => {
        const p = permisos.find(p => p.entidad === entidad && p.accion === accion)
        return p ? p.id_permiso : null
    }

    if (cargando) {
        return (
            <div className="admin-container">
                <div className="admin-loading">
                    <span className="admin-spinner" aria-hidden="true"></span>
                    Cargando panel de administración...
                </div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-panel">
                <header className="admin-header">
                    <div className="admin-header-icon">
                        <Glyph name="sparkle" className="admin-header-glyph" />
                    </div>
                    <div className="admin-header-text">
                        <span className="admin-eyebrow admin-eyebrow-light">Dream Events</span>
                        <h1>Panel de administración</h1>
                        <p>Gestioná permisos por rol y comisiones de contrato desde un único lugar.</p>
                    </div>
                </header>

                <nav className="admin-vista-tabs" aria-label="Vistas del panel de administración">
                    <button className={`admin-vista-tab ${vista === 'permisos' ? 'activo' : ''}`} onClick={() => setVista('permisos')}>
                        <Glyph name="shield" className="admin-tab-glyph" />
                        Permisos y roles
                    </button>
                    <button className={`admin-vista-tab ${vista === 'comisiones' ? 'activo' : ''}`} onClick={() => setVista('comisiones')}>
                        <Glyph name="package" className="admin-tab-glyph" />
                        Comisiones de contrato
                    </button>
                    <button className={`admin-vista-tab ${vista === 'liquidaciones' ? 'activo' : ''}`} onClick={() => setVista('liquidaciones')}>
                        <Glyph name="package" className="admin-tab-glyph" />
                        Liquidaciones
                    </button>
                </nav>

                {vista === 'comisiones' && <ComisionesPanel />}
                {vista === 'liquidaciones' && <LiquidacionesPanel />}

                {vista === 'permisos' && (<>
                    <section className="admin-card admin-roles-selector">
                        <div className="admin-section-heading compact">
                            <div>
                                <span className="admin-eyebrow"><Glyph name="sparkle" className="admin-eyebrow-glyph" />Roles del sistema</span>
                                <h2>Seleccionar rol</h2>
                            </div>
                            <div className="admin-section-badge">{roles.length} roles</div>
                        </div>

                        <div className="admin-roles-tabs">
                            {roles.map(rol => (
                                <button
                                    key={rol.id_rol}
                                    className={`admin-rol-tab ${rolSeleccionado?.id_rol === rol.id_rol ? 'activo' : ''}`}
                                    onClick={() => handleCambiarRol(rol)}
                                >
                                    <span className="admin-rol-icon"><Glyph name={getRolIcono(rol)} /></span>
                                    <span className="admin-rol-tab-label">{getRolNombre(rol)}</span>
                                </button>
                            ))}
                        </div>

                        {resumenRol && (
                            <p className="admin-rol-descripcion">{resumenRol.descripcion}</p>
                        )}
                    </section>

                    {rolSeleccionado && (
                        <section className="admin-permisos-layout">
                            <aside className="admin-info-card">
                                <div className="admin-info-icon"><Glyph name={resumenRol?.icono} /></div>
                                <h3>{resumenRol?.nombre}</h3>
                                <p>{resumenRol?.descripcion}</p>

                                <div className="admin-info-stats">
                                    <div>
                                        <strong>{permisosActivos}</strong>
                                        <span>permisos activos</span>
                                    </div>
                                    <div>
                                        <strong>{totalPermisos}</strong>
                                        <span>permisos totales</span>
                                    </div>
                                </div>

                                <p className="admin-info-note">
                                    Los cambios se guardan únicamente cuando presionás “Guardar cambios”.
                                </p>
                            </aside>

                            <section className="admin-card admin-permisos-section">
                                <div className="admin-section-heading">
                                    <div>
                                        <span className="admin-eyebrow"><Glyph name="sparkle" className="admin-eyebrow-glyph" />Matriz de permisos</span>
                                        <h2>Permisos para <span>{resumenRol?.nombre}</span></h2>
                                    </div>
                                    <div className="admin-section-badge">Acceso configurable</div>
                                </div>

                                <div className="admin-tabla-wrapper">
                                    <table className="admin-tabla">
                                        <thead>
                                            <tr>
                                                <th className="admin-th-entidad">Entidad</th>
                                                {ACCIONES.map(accion => (
                                                    <th key={accion}>
                                                        <div className="admin-th-accion">
                                                            <span className="admin-th-accion-label">
                                                                <Glyph name={ICONOS_ACCION[accion]} className="admin-accion-glyph" />
                                                                {ETIQUETAS_ACCION[accion]}
                                                            </span>
                                                            <input
                                                                type="checkbox"
                                                                className="admin-checkbox"
                                                                title={`Activar/desactivar ${accion} para todas las entidades`}
                                                                checked={ENTIDADES.every(ent => {
                                                                    const id = getPermisoId(ent, accion)
                                                                    return id !== null && seleccionados.has(id)
                                                                })}
                                                                onChange={() => handleToggleAccion(accion)}
                                                            />
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ENTIDADES.map(entidad => (
                                                <tr key={entidad}>
                                                    <td className="admin-td-entidad">
                                                        <div className="admin-td-entidad-inner">
                                                            <input
                                                                type="checkbox"
                                                                className="admin-checkbox"
                                                                title={`Activar/desactivar todos los permisos de ${entidad}`}
                                                                checked={ACCIONES.every(acc => {
                                                                    const id = getPermisoId(entidad, acc)
                                                                    return id !== null && seleccionados.has(id)
                                                                })}
                                                                onChange={() => handleToggleEntidad(entidad)}
                                                            />
                                                            <span className="admin-entity-icon"><Glyph name={ICONOS_ENTIDAD[entidad]} /></span>
                                                            <span>{ETIQUETAS_ENTIDAD[entidad]}</span>
                                                        </div>
                                                    </td>
                                                    {ACCIONES.map(accion => {
                                                        const permisoId = getPermisoId(entidad, accion)
                                                        return (
                                                            <td key={accion} className="admin-td-permiso">
                                                                {permisoId !== null ? (
                                                                    <input
                                                                        type="checkbox"
                                                                        className="admin-checkbox"
                                                                        checked={seleccionados.has(permisoId)}
                                                                        onChange={() => handleTogglePermiso(permisoId)}
                                                                    />
                                                                ) : <span className="admin-td-empty">—</span>}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {mensaje && (
                                    <div className={`admin-mensaje admin-mensaje-${mensajeClase(mensaje.tipo)}`}>
                                        {mensaje.texto}
                                    </div>
                                )}

                                <div className="admin-actions">
                                    <button
                                        className="admin-btn-guardar"
                                        onClick={handleGuardar}
                                        disabled={guardando}
                                    >
                                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </div>
                            </section>
                        </section>
                    )}
                </>)}
            </div>
        </div>
    )
}

export default AdminPanel