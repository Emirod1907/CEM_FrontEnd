import React, { useEffect, useState } from 'react'
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
    const {isAuthenticated, setIsAuthenticated} = useAuth()
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
                await new Promise(resolve => setTimeout(resolve, 100));
                setIsAuthenticated(true)
                // await verifyTokenRequest();
                console.log("isAutenticated",isAuthenticated)
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
        if(isAuthenticated)navigate("/eventos/new")
    },[isAuthenticated, navigate])

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
                </div>
            </form>
        </div>    
    </div>
  )
}

export default Login