import React, { useEffect, useState } from 'react'
import '../Forms.css'
import { loginRequest } from '../../../services/personasServices'
import { GOOGLE_AUTH_URL } from '../../../config/api'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { useNavigate } from 'react-router-dom'
import { tieneFullAccess } from '../../../config/fullAccessEmails'

const Login = () => {
    const fields = {
        EMAIL: 'email',
        USER_PASSWORD: 'user_password'
    }

    const initial_form_state = {
        [fields.EMAIL]: '',
        [fields.USER_PASSWORD]: ''
    }

    const [form_values_state, setFormValuesState] = useState(initial_form_state)
    const { isAuthenticated, setIsAuthenticated, setPersona, persona } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (event) => {
        event.preventDefault()

        try {
            const response = await loginRequest(form_values_state)

            if (response && response.message === 'Sesion iniciada con exito') {
                setPersona({
                    id_persona: response.id_persona,
                    user: response.user,
                    email: response.email,
                    rol: response.rol,
                    perfil_completado: response.perfil_completado,
                    categoria_servicio: response.categoria_servicio
                })

                setIsAuthenticated(true)

                if (tieneFullAccess(response.email)) {
                    navigate('/seleccionar-rol')
                }
            }
        } catch (error) {
            console.error('Error en login:', error)
        }
    }

    const handleChangeInputValue = (event) => {
        setFormValuesState((prev_state) => ({
            ...prev_state,
            [event.target.name]: event.target.value
        }))
    }

    useEffect(() => {
        if (isAuthenticated && persona) {
            const ROLES_NUEVOS = [
                'entusiasta',
                'organizador',
                'dueno_salon',
                'proveedor_servicios',
                'proveedor_insumos',
                'admin'
            ]

            if (!persona.rol || !ROLES_NUEVOS.includes(persona.rol)) {
                navigate('/seleccionar-rol')
            } else if (persona.rol === 'admin') {
                navigate('/admin')
            } else if (
                (persona.rol === 'proveedor_servicios' ||
                    persona.rol === 'proveedor_insumos') &&
                !persona.perfil_completado
            ) {
                navigate('/completar-perfil')
            } else {
                const destinos = {
                    entusiasta: '/eventos',
                    organizador: '/salones',
                    dueno_salon: '/mi-salon',
                    proveedor_servicios: '/mis-servicios',
                    proveedor_insumos: '/mi-catalogo'
                }

                navigate(destinos[persona.rol] || '/eventos')
            }
        }
    }, [isAuthenticated, persona, navigate])

    return (
        <main className='auth-page'>
            <section className='auth-shell auth-shell--login-only' aria-label='Inicio de sesión Dream Events'>
                <section className='auth-form-panel'>
                    <div className='auth-form-header'>
                        <h1>Iniciar sesión</h1>
                        <p>Accedé con tu cuenta registrada.</p>
                    </div>

                    <form className='auth-form' onSubmit={handleSubmit}>
                        <div className='auth-field'>
                            <label htmlFor='email'>Email</label>
                            <input
                                type='email'
                                id='email'
                                name='email'
                                placeholder='tuemail@ejemplo.com'
                                onChange={handleChangeInputValue}
                                value={form_values_state[fields.EMAIL]}
                            />
                        </div>

                        <div className='auth-field'>
                            <label htmlFor='user_password'>Contraseña</label>
                            <input
                                type='password'
                                id='user_password'
                                name='user_password'
                                placeholder='Ingresá tu contraseña'
                                onChange={handleChangeInputValue}
                                value={form_values_state[fields.USER_PASSWORD]}
                            />
                        </div>

                        <button className='auth-submit' type='submit'>
                            Iniciar sesión
                        </button>

                        <div className='form-divider auth-divider'>
                            <span>o</span>
                        </div>

                        <a href={GOOGLE_AUTH_URL} className='btn-google auth-google'>
                            <svg className='google-icon' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                                <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4' />
                                <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853' />
                                <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05' />
                                <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335' />
                            </svg>
                            Continuar con Google
                        </a>
                    </form>
                </section>
            </section>
        </main>
    )
}

export default Login