import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { useAuth } from './Contexts/PersonaContextProvider'
import { EMAILS_FULL_ACCESS } from './config/fullAccessEmails'
import { getRedirectByRol } from './components/Screens/RoleSelectionScreen/RoleSelectionScreen'

/**
 * Protege rutas por rol.
 * - Si no está autenticado → /login
 * - Si es email full access → pasa siempre
 * - Si su rol está en `roles` → pasa
 * - Si no → redirige a la sección que corresponde a su rol
 */
const RoleRoute = ({ roles }) => {
    const { loading, isAuthenticated, persona } = useAuth()

    if (loading) return <TailSpin />
    if (!isAuthenticated) return <Navigate to='/login' replace />

    const esFullAccess = EMAILS_FULL_ACCESS.includes(persona?.email)
    if (esFullAccess) return <Outlet />

    const tieneRol = persona?.rol && roles.includes(persona.rol)
    if (tieneRol) return <Outlet />

    // Redirigir a la sección correcta según su rol
    const destino = persona?.rol ? getRedirectByRol(persona.rol) : '/login'
    return <Navigate to={destino} replace />
}

export default RoleRoute
