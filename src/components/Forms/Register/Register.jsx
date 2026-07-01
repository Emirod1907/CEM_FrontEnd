import React, {useEffect, useState} from 'react'
import '../Forms.css'
import { registerRequest } from '../../../services/personasServices'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { useNavigate } from 'react-router-dom'


const Register = () => {

    const {setIsAuthenticated}= useAuth()
    const navigate = useNavigate()

    const fields ={
        NOMBRE: 'nombre',
        APELLIDO: 'apellido',
        DNI: 'dni',
        FECHA_NACIMIENTO: 'fecha_nacimiento',
        EMAIL: 'email',
        NOMBRE_USUARIO: 'nombre_usuario',
        USER_PASSWORD: 'user_password'
    }
    const initial_form_state ={
        [fields.NOMBRE]: '',
        [fields.APELLIDO]: '',
        [fields.DNI]: '',
        [fields.FECHA_NACIMIENTO]: '',
        [fields.EMAIL]: '',
        [fields.NOMBRE_USUARIO]: '',
        [fields.USER_PASSWORD]: ''
    }

    const [ form_values_state, setFormValuesState ]= useState(initial_form_state) 
    const handleSubmit= async(event)=>{
        event.preventDefault()
        try {
            console.log("Datos a enviar:", JSON.stringify(form_values_state, null, 2));
            alert('Enviado')
            const response = await registerRequest(form_values_state)
            console.log("Respuesta completa:", response);
            if(response && response.data && response.data.message === "Usuario creado con éxito"){
                setIsAuthenticated(true);
                navigate("/eventos/new")
                return console.log('Usuario registrado satisfactoriamente!')
            } 
        } catch (error) {
            console.error("Error en registro:", error);   
        }
        
    }

    const handleChangeInputValue=(event)=>{
        setFormValuesState(
            (prev_state)=>{
                return {...prev_state,[event.target.name]:event.target.value}
            }
        )
    }
    return (
    <div className='container'>
    <div className='form-container'>
        <div className='form-title'>
                    <h1>Registrate</h1>
        </div>
        <form action="submit" onSubmit={handleSubmit}>
            <div className='form-container-form-fields'>
                <div className='form-input'>
                    <label htmlFor="nombre">Ingrese su Nombre</label>
                    <input 
                    type="text" 
                    placeholder='James'
                    maxLength={30}
                    id='nombre'
                    name='nombre'
                    onChange={handleChangeInputValue}
                    value={form_values_state[fields.NOMBRE]}
                    />
                </div>
                <div className='form-input'>
                    <label htmlFor="apellido">Ingrese su Apellido</label>
                    <input 
                        type="text" 
                        placeholder='Bond'
                        maxLength={30}
                        id='apellido'
                        name='apellido'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.APELLIDO]}
                        />
                </div>
                <div className='form-input'>
                    <label htmlFor="dni">Ingrese su DNI</label>
                    <input 
                        type="number" 
                        placeholder='7007007'
                        min={1000000}
                        max={99999999}
                        id='dni'
                        name='dni'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.DNI]}
                        />
                </div>
                <div className='form-input'>
                    <label htmlFor="fecha_nacimiento">Ingrese su fecha de nacimiento</label>
                    <input 
                        type="date" 
                        placeholder='1970-02-14'
                        id='fecha_nacimiento'
                        name='fecha_nacimiento'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.FECHA_NACIMIENTO]}
                        />
                </div>
                <div className='form-input'>
                    <label htmlFor="email">Ingrese su email</label>
                    <input 
                        type="email" 
                        placeholder='jamesbond@gmail.com'
                        id='email'
                        name='email'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.EMAIL]}
                        />
                </div>
                <div className='form-input'>
                    <label htmlFor="nombre_usuario">Ingrese su nombre de usuario</label>
                    <input 
                        type="text" 
                        placeholder='jamesbond007'
                        minLength={5}
                        maxLength={25}
                        id='nombre_usuario'
                        name='nombre_usuario'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.NOMBRE_USUARIO]}
                    />
                </div>
                <div className='form-input'>
                    <label htmlFor="user_password">Ingrese su Password</label>
                    <input 
                        type="password" 
                        minLength={7}
                        maxLength={12}
                        id='user_password'
                        name='user_password'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.USER_PASSWORD]}    
                    />
                </div>
                {/* <div>
                    <label htmlFor="organizador">si ud quiere ser organizador tilde aquí</label>
                    <input type="checkbox" id='organizador'/>
                </div>                                 */}
                <div className='form-input-button'>
                    <button> Registrate </button>
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
                        Registrarse con Google
                    </a>
                </div>
            </div>
        </form>
    </div>
</div>
  )
}

export default Register