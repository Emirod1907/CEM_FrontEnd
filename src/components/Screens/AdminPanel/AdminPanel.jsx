import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { getRolesRequest, getPermisosRequest, updateRolPermisosRequest } from '../../../services/rbacServices'
import { EMAILS_FULL_ACCESS } from '../../../config/fullAccessEmails'
import './AdminPanel.css'

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
                    <p>Gestioná los permisos de cada rol del sistema</p>
                </div>

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
            </div>
        </div>
    )
}

export default AdminPanel
