import React from 'react'
import { useAuth } from './Contexts/PersonaContextProvider'
import { Navigate, Outlet } from 'react-router-dom'
import Login from './components/Forms/Login/Login'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'

const ProtectedRoute = () => {
    const { loading, isAuthenticated }=useAuth()
    console.log(loading, isAuthenticated)
    if(loading) return <TailSpin/>
    if(!loading && !isAuthenticated){
        return <Navigate to='/login' replace/>
    }

  return (
    <Outlet/>
  )
}

export default ProtectedRoute