import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { selectRoleRequest } from '../../../services/personasServices'
import { EMAILS_FULL_ACCESS } from '../../../config/fullAccessEmails'
import './RoleSelectionScreen.css'

const ROLES = [
    {
        id: 'entusiasta',
        label: 'Entusiasta',
        icon: '🎉',
        descripcion: 'Ver eventos públicos, comprar entradas e invitar amigos por WhatsApp.'
    },
    {
        id: 'organizador',
        label: 'Organizador',
        icon: '📋',
        descripcion: 'Crear y gestionar eventos, reservar salones, administrar invitados y pagos.'
    },
    {
        id: 'dueno_salon',
        label: 'Dueño de Salón',
        icon: '🏛️',
        descripcion: 'Registrar tu salón, gestionar disponibilidad, señas y fechas límite.'
    },
    {
        id: 'proveedor_servicios',
        label: 'Proveedor de Servicios',
        icon: '🎵',
        descripcion: 'Ofrecé tus servicios para eventos: DJ, catering, decoración, seguridad y más.'
    },
    {
        id: 'proveedor_insumos',
        label: 'Proveedor de Insumos',
        icon: '📦',
        descripcion: 'Cargá tu catálogo de insumos con precios actualizados para eventos.'
    },
]

const RoleSelectionScreen = () => {
    const [rolSeleccionado, setRolSeleccionado] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const { setPersona, persona } = useAuth()
    const navigate = useNavigate()

    const esFullAccess = EMAILS_FULL_ACCESS.includes(persona?.email)

    const handleConfirmar = async () => {
        if (!rolSeleccionado || loading) return

        setLoading(true)
        setError(null)

        try {
            const res = await selectRoleRequest(rolSeleccionado)

            setPersona(prev => ({
                ...prev,
                rol: res?.rol,
                perfil_completado: res?.perfil_completado,
            }))

            // Roles que requieren completar perfil adicional solo para usuarios normales.
            if (
                !esFullAccess &&
                (
                    rolSeleccionado === 'proveedor_servicios' ||
                    rolSeleccionado === 'proveedor_insumos'
                )
            ) {
                navigate('/completar-perfil')
                return
            }

            navigate(getRedirectByRol(rolSeleccionado))
        } catch (err) {
            const status = err?.response?.status
            const data = err?.response?.data
            const backendMessage =
                data?.message ||
                data?.error ||
                data?.error?.message ||
                data?.msg

            console.error('[RoleSelectionScreen] Error real al guardar rol:', {
                rolSeleccionado,
                persona,
                esFullAccess,
                status,
                backendMessage,
                response: data,
                axiosMessage: err?.message,
                url: err?.config?.url,
                method: err?.config?.method,
            })

            if (status === 400) {
                setError(backendMessage || 'Solicitud inválida. Revisá el rol seleccionado.')
            } else if (status === 401) {
                setError('Sesión vencida. Cerrá sesión e ingresá nuevamente.')
            } else if (status === 403) {
                setError(backendMessage || 'Tu cuenta ya tiene un rol asignado y no puede modificarse.')
            } else if (status === 404) {
                setError(backendMessage || 'El rol seleccionado no existe en la base de datos.')
            } else if (status === 500) {
                setError(backendMessage || 'Error interno del servidor al guardar el rol.')
            } else {
                setError(backendMessage || `Error ${status || ''} al guardar el rol.`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='role-selection-wrapper'>
            {/* Fondo animado: íconos de fiesta que flotan detrás de la card */}
            <div className='role-bg-anim' aria-hidden='true'>
                {['🎉', '🎈', '🥂', '🎊', '🎁', '🎶', '✨', '🪩', '🎂', '🍾', '💃', '🎇'].map((emoji, i) => (
                    <span key={i} className='role-bg-icon'>{emoji}</span>
                ))}
            </div>

            <div className='role-selection-card'>
                <div className='role-selection-header'>
                    <h1>
                        ¡Bienvenido/a{persona?.user ? `, ${persona.user}` : ''}!
                    </h1>
                    <p>
                        Contanos qué rol te describe mejor para personalizar tu experiencia en Dream Events.
                    </p>
                </div>

                <div className='role-grid'>
                    {ROLES.map(rol => (
                        <button
                            key={rol.id}
                            type='button'
                            className={`role-card ${rolSeleccionado === rol.id ? 'role-card--selected' : ''}`}
                            onClick={() => setRolSeleccionado(rol.id)}
                        >
                            <span className='role-icon'>{rol.icon}</span>
                            <span className='role-label'>{rol.label}</span>
                            <span className='role-desc'>{rol.descripcion}</span>
                        </button>
                    ))}
                </div>

                {error && (
                    <p className='role-error'>
                        {error}
                    </p>
                )}

                <button
                    type='button'
                    className='role-confirm-btn'
                    onClick={handleConfirmar}
                    disabled={!rolSeleccionado || loading}
                >
                    {loading ? 'Guardando...' : 'Confirmar perfil'}
                </button>
            </div>
        </div>
    )
}

export function getRedirectByRol(rol) {
    switch (rol) {
        case 'entusiasta':
            return '/eventos'

        case 'organizador':
            return '/eventos/new'

        case 'dueno_salon':
            return '/mi-salon'

        case 'proveedor_servicios':
            return '/mis-servicios'

        case 'proveedor_insumos':
            return '/mi-catalogo'

        case 'admin':
            return '/admin'

        default:
            return '/eventos'
    }
}

export default RoleSelectionScreen