import React from 'react'
import { useAuth } from './Contexts/PersonaContextProvider'
import { Navigate, Outlet } from 'react-router-dom'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { EMAILS_FULL_ACCESS } from './config/fullAccessEmails'

const AdminRoute = () => {
    const { loading, isAuthenticated, persona } = useAuth()

    if (loading) return <TailSpin/>
    if (!loading && !isAuthenticated) return <Navigate to='/login' replace/>
    const tieneAcceso = persona?.rol === 'admin' || EMAILS_FULL_ACCESS.includes(persona?.email)
    if (!loading && isAuthenticated && !tieneAcceso) return <Navigate to='/' replace/>

    return <Outlet/>
}

export default AdminRoute
