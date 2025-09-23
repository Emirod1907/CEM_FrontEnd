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
            if(response.sucess){
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
            </div>
        </form>
    </div>
</div>
  )
}

export default Register