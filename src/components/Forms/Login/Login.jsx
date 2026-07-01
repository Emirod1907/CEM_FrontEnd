import React, { useEffect, useState } from 'react'
import '../Forms.css'
import { loginRequest, verifyTokenRequest } from '../../../services/personasServices'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { useNavigate } from 'react-router-dom'



const Login = () => {

    const fields={
        EMAIL: 'email',
        USER_PASSWORD: 'user_password'
    }

    const initial_form_state ={
        [fields.EMAIL]:'',
        [fields.USER_PASSWORD]:''
    }

    const [form_values_state, setFormValuesState] = useState(initial_form_state)
    const { isAuthenticated, setIsAuthenticated, setPersona, persona } = useAuth()
    const navigate = useNavigate()
    const handleSubmit= async(event)=>{
        event.preventDefault()
        if(!form_values_state){
            console.error("form_values_state es undefined!");
            return;}
        try {
            const response = await loginRequest(form_values_state)
            console.log("Respuesta completa:", response);
            if(response && response.message === "Sesion iniciada con exito"){
                const EMAILS_FULL_ACCESS = ['emi.electro2012@gmail.com', 'emi.rodri1907guez@gmail.com']
                setPersona({
                    id_persona: response.id_persona,
                    user: response.user,
                    email: response.email,
                    rol: response.rol,
                    perfil_completado: response.perfil_completado,
                    categoria_servicio: response.categoria_servicio
                });
                setIsAuthenticated(true)
                if (EMAILS_FULL_ACCESS.includes(response.email)) {
                    navigate('/seleccionar-rol')
                    return
                }
                console.log('Sesion iniciada satisfactoriamente!')
                return
            }
        } catch (error) {
            console.error("Error en login:", error);
        }
    }

    const handleChangeInputValue = (event) =>{
        setFormValuesState(
            (prev_state)=>{
                return {...prev_state,[event.target.name]: event.target.value}
            }
        )
    }
    useEffect(()=>{
        if(isAuthenticated && persona){
            const ROLES_NUEVOS = ['entusiasta', 'organizador', 'dueno_salon', 'proveedor_servicios', 'proveedor_insumos', 'admin']
            if(!persona.rol || !ROLES_NUEVOS.includes(persona.rol)) {
                navigate('/seleccionar-rol')
            } else if(persona.rol === 'admin') {
                navigate('/admin')
            } else if ((persona.rol === 'proveedor_servicios' || persona.rol === 'proveedor_insumos') && !persona.perfil_completado) {
                navigate('/completar-perfil')
            } else {
                const destinos = {
                    entusiasta: '/eventos',
                    organizador: '/eventos/new',
                    dueno_salon: '/mi-salon',
                    proveedor_servicios: '/mis-servicios',
                    proveedor_insumos: '/mi-catalogo',
                }
                navigate(destinos[persona.rol] || '/eventos')
            }
        }
    },[isAuthenticated, persona, navigate])

    return (
    <div className='container'>
        <div className='form-container'>
            <div className='form-title'>
                <h1>Login</h1>
            </div>
            <form action="submit" onSubmit={handleSubmit}>
                <div className='form-container-form-fields'>
                    <div className='form-input'>
                        <label htmlFor="email">Ingrese su email</label>
                        <input 
                            type="text"
                            id='email'
                            name='email'
                            onChange={handleChangeInputValue}
                            value={form_values_state[fields.EMAIL]}
                        />
                    </div>
                    <div className='form-input'>
                        <label htmlFor="user_password">Ingrese su Password</label>
                        <input 
                            type="password" 
                            id='user_password'
                            name='user_password'
                            onChange={handleChangeInputValue}
                            value={form_values_state[fields.USER_PASSWORD]}
                        />
                    </div>
                    <div className='form-input-button'>
                        <button>Iniciar Sesion</button>
                    </div>
                    <div className='form-divider'>
                        <span>o</span>
                    </div>
                    <div className='form-input-button'>
                        <a
                            href='http://localhost:8000/api/auth/google'
                            className='btn-google'
                        >
                            <svg className='google-icon' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                                <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4'/>
                                <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853'/>
                                <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05'/>
                                <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335'/>
                            </svg>
                            Iniciar Sesión con Google
                        </a>
                    </div>
                </div>
            </form>
        </div>
    </div>
  )
}

export default Login