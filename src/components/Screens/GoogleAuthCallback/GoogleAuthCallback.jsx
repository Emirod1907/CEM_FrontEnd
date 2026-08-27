import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { verifyTokenRequest } from '../../../services/personasServices'

const GoogleAuthCallback = () => {
    const { setPersona, setIsAuthenticated } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const verificarYRedirigir = async () => {
            try {
                const res = await verifyTokenRequest()
                if (res.data) {
                    setPersona(res.data)
                    setIsAuthenticated(true)
                    const { rol, perfil_completado, cuit } = res.data
                    // Usuario nuevo de Google: todavía no cargó CUIT / celular / fecha de nacimiento.
                    // Google solo aporta nombre, apellido y email; el resto lo pedimos acá.
                    if (!cuit) {
                        return navigate('/completar-datos')
                    }
                    const ROLES_NUEVOS = ['entusiasta', 'organizador', 'dueno_salon', 'proveedor_servicios', 'proveedor_insumos', 'admin']
                    if (!rol || !ROLES_NUEVOS.includes(rol)) {
                        navigate('/seleccionar-rol')
                    } else if (rol === 'admin') {
                        navigate('/admin')
                    } else if ((rol === 'proveedor_servicios' || rol === 'proveedor_insumos') && !perfil_completado) {
                        navigate('/completar-perfil')
                    } else {
                        const destinos = {
                            entusiasta: '/eventos',
                            organizador: '/salones',
                            dueno_salon: '/mi-salon',
                            proveedor_servicios: '/mis-servicios',
                            proveedor_insumos: '/mi-catalogo',
                        }
                        navigate(destinos[rol] || '/eventos')
                    }
                } else {
                    navigate('/login')
                }
            } catch (error) {
                console.error('Error al verificar sesión de Google:', error)
                navigate('/login')
            }
        }
        verificarYRedirigir()
    }, [])

    return (
        <div className='container'>
            <p>Autenticando con Google...</p>
        </div>
    )
}

export default GoogleAuthCallback
