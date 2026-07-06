import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { getRolesRequest, getPermisosRequest, updateRolPermisosRequest } from '../../../services/rbacServices'
import { getComisionesRequest, updateComisionRequest } from '../../../services/comisionesServices'
import { EMAILS_FULL_ACCESS } from '../../../config/fullAccessEmails'
import './AdminPanel.css'

const LABEL_PERFIL = {
    salon:           'Salones',
    catering:        'Catering',
    decoracion:      'Decoración',
    audio_video:     'Audio y Video',
    seguridad:       'Seguridad',
    mobiliario:      'Mobiliario',
    entretenimiento: 'Entretenimiento',
    otro:            'Otros',
}

// ── Panel de comisiones de contrato (cliente / proveedor por tipo de perfil) ──
const ComisionesPanel = () => {
    const [comisiones, setComisiones] = useState([])
    const [edit,       setEdit]       = useState({})
    const [cargando,   setCargando]   = useState(true)
    const [guardando,  setGuardando]  = useState(null)
    const [msg,        setMsg]        = useState(null)

    const cargar = async () => {
        setCargando(true)
        try {
            const r = await getComisionesRequest()
            const list = r.data.comisiones || []
            setComisiones(list)
            const e = {}
            for (const c of list) e[c.tipo_perfil] = {
                cliente:   String(c.comision_cliente_porcentaje),
                proveedor: String(c.comision_proveedor_porcentaje),
            }
            setEdit(e)
        } catch {
            setMsg({ tipo: 'error', texto: 'Error al cargar las comisiones' })
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
            setMsg({ tipo: 'error', texto: 'Los porcentajes deben estar entre 0 y 50.' }); return
        }
        setGuardando(c.tipo_perfil); setMsg(null)
        try {
            const r = await updateComisionRequest(c.tipo_perfil, {
                comision_cliente_porcentaje: cli,
                comision_proveedor_porcentaje: prov,
            })
            const n = r?.data?.notificados
            setMsg({
                tipo: 'exito',
                texto: `Comisión de ${LABEL_PERFIL[c.tipo_perfil] || c.tipo_perfil} actualizada.` +
                    (n ? ` Se notificó a ${n} usuario(s) del cambio en las condiciones del contrato.` : '')
            })
            await cargar()
        } catch (err) {
            setMsg({ tipo: 'error', texto: err?.response?.data?.message || 'Error al guardar la comisión' })
        } finally { setGuardando(null) }
    }

    const fmtFecha = (f) => f ? new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

    if (cargando) return <div className="admin-loading">Cargando comisiones...</div>

    return (
        <div className="admin-permisos-section">
            <h2>Comisiones de contrato</h2>
            <p className="admin-rol-descripcion">
                Porcentaje que la plataforma aplica sobre el precio base. <strong>Cliente</strong>: se suma al precio que paga el organizador.
                <strong> Proveedor</strong>: se descuenta al dueño de salón / proveedor. Al guardar, se <strong>notifica a los usuarios</strong> con contrato de ese tipo.
            </p>

            {msg && <div className={`admin-mensaje admin-mensaje-${mensajeClase(msg.tipo)}`}>{msg.texto}</div>}

            <div className="admin-tabla-wrapper">
                <table className="admin-tabla admin-tabla-comisiones">
                    <thead>
                        <tr>
                            <th className="admin-th-entidad">Tipo de perfil</th>
                            <th>Comisión cliente (%)</th>
                            <th>Comisión proveedor (%)</th>
                            <th>Última actualización</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {comisiones.map(c => {
                            const e = edit[c.tipo_perfil] || {}
                            const upd = c.AdminActualizador
                            return (
                                <tr key={c.tipo_perfil}>
                                    <td className="admin-td-entidad">
                                        <strong>{LABEL_PERFIL[c.tipo_perfil] || c.tipo_perfil}</strong>
                                        {c.tipo_perfil === 'salon'
                                            ? <span className="admin-perfil-hint">Dueños de salón</span>
                                            : <span className="admin-perfil-hint">Proveedores</span>}
                                    </td>
                                    <td>
                                        <input type="number" min="0" max="50" step="0.5" className="admin-com-input"
                                            value={e.cliente ?? ''} onChange={ev => setCampo(c.tipo_perfil, 'cliente', ev.target.value)} />
                                    </td>
                                    <td>
                                        <input type="number" min="0" max="50" step="0.5" className="admin-com-input"
                                            value={e.proveedor ?? ''} onChange={ev => setCampo(c.tipo_perfil, 'proveedor', ev.target.value)} />
                                    </td>
                                    <td className="admin-com-meta">
                                        {fmtFecha(c.fecha_actualizacion)}
                                        {upd && <div className="admin-perfil-hint">por {upd.nombre} {upd.apellido}</div>}
                                    </td>
                                    <td>
                                        <button className="admin-btn-guardar admin-btn-com"
                                            onClick={() => guardar(c)}
                                            disabled={guardando === c.tipo_perfil || !cambiado(c)}>
                                            {guardando === c.tipo_perfil ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const mensajeClase = (tipo) => tipo === 'exito' ? 'exito' : tipo === 'error' ? 'error' : 'info'

const ENTIDADES = ['cliente', 'organizador', 'salon']
const ACCIONES  = ['ver', 'crear', 'editar', 'eliminar']

const ETIQUETAS_ENTIDAD = {
    cliente:     'Clientes',
    organizador: 'Organizadores',
    salon:       'Salones'
}

const ETIQUETAS_ACCION = {
    ver:      'Ver',
    crear:    'Crear',
    editar:   'Editar',
    eliminar: 'Eliminar'
}

const AdminPanel = () => {
    const { persona } = useAuth()
    const navigate    = useNavigate()

    const [roles,           setRoles]           = useState([])
    const [permisos,        setPermisos]         = useState([])
    const [rolSeleccionado, setRolSeleccionado]  = useState(null)
    const [seleccionados,   setSeleccionados]    = useState(new Set())
    const [guardando,       setGuardando]        = useState(false)
    const [mensaje,         setMensaje]          = useState(null)
    const [cargando,        setCargando]         = useState(true)
    const [vista,           setVista]            = useState('permisos')  // 'permisos' | 'comisiones'

    // Redirigir si no tiene acceso admin
    useEffect(() => {
        if (persona && persona.rol !== 'admin' && !EMAILS_FULL_ACCESS.includes(persona.email)) {
            navigate('/')
        }
    }, [persona, navigate])

    // Cargar roles y permisos al montar
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
                setMensaje({ tipo: 'error', texto: 'Error al cargar los datos' })
            } finally {
                setCargando(false)
            }
        }
        cargarDatos()
    }, [])

    const handleCambiarRol = (rol) => {
        setRolSeleccionado(rol)
        setSeleccionados(new Set(rol.Permisos.map(p => p.id_permiso)))
        setMensaje(null)
    }

    const handleTogglePermiso = (permisoId) => {
        setSeleccionados(prev => {
            const nuevo = new Set(prev)
            if (nuevo.has(permisoId)) {
                nuevo.delete(permisoId)
            } else {
                nuevo.add(permisoId)
            }
            return nuevo
        })
    }

    const handleToggleEntidad = (entidad) => {
        const permisosDeEntidad = permisos
            .filter(p => p.entidad === entidad)
            .map(p => p.id_permiso)

        const todosActivos = permisosDeEntidad.every(id => seleccionados.has(id))

        setSeleccionados(prev => {
            const nuevo = new Set(prev)
            if (todosActivos) {
                permisosDeEntidad.forEach(id => nuevo.delete(id))
            } else {
                permisosDeEntidad.forEach(id => nuevo.add(id))
            }
            return nuevo
        })
    }

    const handleToggleAccion = (accion) => {
        const permisosDeAccion = permisos
            .filter(p => p.accion === accion)
            .map(p => p.id_permiso)

        const todosActivos = permisosDeAccion.every(id => seleccionados.has(id))

        setSeleccionados(prev => {
            const nuevo = new Set(prev)
            if (todosActivos) {
                permisosDeAccion.forEach(id => nuevo.delete(id))
            } else {
                permisosDeAccion.forEach(id => nuevo.add(id))
            }
            return nuevo
        })
    }

    const handleGuardar = async () => {
        if (!rolSeleccionado) return
        setGuardando(true)
        setMensaje(null)
        try {
            await updateRolPermisosRequest(rolSeleccionado.id_rol, Array.from(seleccionados))

            // Actualizar el rol en el estado local
            setRoles(prev => prev.map(r =>
                r.id_rol === rolSeleccionado.id_rol
                    ? { ...r, Permisos: permisos.filter(p => seleccionados.has(p.id_permiso)) }
                    : r
            ))
            setMensaje({ tipo: 'exito', texto: 'Permisos guardados correctamente' })
        } catch (error) {
            console.error('Error guardando permisos:', error)
            setMensaje({ tipo: 'error', texto: 'Error al guardar los permisos' })
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
                <div className="admin-loading">Cargando panel de administración...</div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-panel">
                <div className="admin-header">
                    <h1>Panel de Administración</h1>
                    <p>Gestioná los permisos de cada rol y las comisiones de contrato</p>
                </div>

                {/* Pestañas principales */}
                <div className="admin-vista-tabs">
                    <button className={`admin-vista-tab ${vista === 'permisos' ? 'activo' : ''}`} onClick={() => setVista('permisos')}>
                        Permisos y roles
                    </button>
                    <button className={`admin-vista-tab ${vista === 'comisiones' ? 'activo' : ''}`} onClick={() => setVista('comisiones')}>
                        Comisiones de contrato
                    </button>
                </div>

                {vista === 'comisiones' && <ComisionesPanel />}

                {vista === 'permisos' && (<>
                {/* Selector de rol */}
                <div className="admin-roles-selector">
                    <h2>Seleccionar Rol</h2>
                    <div className="admin-roles-tabs">
                        {roles.map(rol => (
                            <button
                                key={rol.id_rol}
                                className={`admin-rol-tab ${rolSeleccionado?.id_rol === rol.id_rol ? 'activo' : ''}`}
                                onClick={() => handleCambiarRol(rol)}
                            >
                                {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                            </button>
                        ))}
                    </div>
                    {rolSeleccionado && (
                        <p className="admin-rol-descripcion">{rolSeleccionado.descripcion}</p>
                    )}
                </div>

                {/* Tabla de permisos con checkboxes */}
                {rolSeleccionado && (
                    <div className="admin-permisos-section">
                        <h2>Permisos para: <span>{rolSeleccionado.nombre}</span></h2>
                        <div className="admin-tabla-wrapper">
                            <table className="admin-tabla">
                                <thead>
                                    <tr>
                                        <th className="admin-th-entidad">Entidad</th>
                                        {ACCIONES.map(accion => (
                                            <th key={accion}>
                                                <div className="admin-th-accion">
                                                    <span>{ETIQUETAS_ACCION[accion]}</span>
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
                                                        ) : '—'}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mensaje de estado */}
                        {mensaje && (
                            <div className={`admin-mensaje admin-mensaje-${mensaje.tipo}`}>
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
                    </div>
                )}
                </>)}
            </div>
        </div>
    )
}

export default AdminPanel
