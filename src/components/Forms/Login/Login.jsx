import React, { useEffect, useState } from 'react'
import { loginRequest } from '../../../services/personasServices'
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
    const handleSubmit=(event)=>{
        event.preventDefault()
        loginRequest(form_values_state)
        if(!form_values_state){
            console.error("form_values_state es undefined!");
            return;}
        //setIsAuthenticated(true)
        return console.log('Sesion iniciada satisfactoriamente!')
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