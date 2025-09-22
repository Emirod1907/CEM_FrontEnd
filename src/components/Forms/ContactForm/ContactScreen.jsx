import React, { useState } from 'react'

const ContactScreen = () => {

  const fields ={ 
    NOMBRE_COMPLETO: 'nombre-completo',
    EMAIL: 'email',
    ASUNTO: 'asunto',
    MENSAJE: 'mensaje',
    TELEFONO: 'telefono'
  }

  const initial_form_state = {
    [fields.NOMBRE_COMPLETO]:'',
    [fields.EMAIL]:'',
    [fields.ASUNTO]:'',
    [fields.MENSAJE]:'',
    [fields.TELEFONO]:''
  }
  const [ form_values_state, setFormValuesState ] = useState(initial_form_state)

  const handleSubmitContactForm = (event) =>{
    event.preventDefault()

  }
  const handleChangeInputValue = (event) =>{
    setFormValuesState(
      (prev_state)=>{
        return {...prev_state, [event.target.name]: event.target.value}
      })
  }
  return (
    <div className='container'>
        <div className='form-container'>
            <div className='form-title'>
              <h1>Formulario de contacto</h1>
            </div>    
            <form action="submit" onSubmit={handleSubmitContactForm}>
              <div className='form-container-form-fields'>
                <div className='form-input'>
                    <label htmlFor="nombre-completo">Nombre completo</label>
                    <input 
                      type="text" 
                      placeholder='Joe Doe' 
                      maxLength={30} 
                      id='nombre-completo' 
                      name='nombre-completo' 
                      onChange={handleChangeInputValue}
                      value={form_values_state[fields.NOMBRE_COMPLETO]}
                      />
                  </div>
                  <div className='form-input'>
                    <label htmlFor="email">Email</label>
                    <input 
                      type="email" 
                      placeholder='joedoe@gmail.com' 
                      id='email'
                      name='email'
                      onChange={handleChangeInputValue}
                      value={form_values_state[fields.EMAIL]}
                      />
                  </div>
                  <div className='form-input'>
                    <label htmlFor="asunto">Asunto</label>
                    <input 
                      type="text" 
                      placeholder='Escribe el asunto' 
                      id='asunto'
                      name='asunto'
                      onChange={handleChangeInputValue}
                      values={form_values_state[fields.ASUNTO]}
                      />
                  </div>
                  <div className='form-input'>
                    <label htmlFor="mensaje">Mensaje</label>
                    <textarea 
                      placeholder='Escribe tu mensaje' 
                      id='mensaje' 
                      name='mensaje'
                      onChange={handleChangeInputValue}
                      values={form_values_state[fields.MENSAJE]}
                      ></textarea>
                  </div>
                  <div className='form-input'>
                    <label htmlFor="telefono">Telefono</label>
                    <input 
                      type="text" 
                      placeholder='Escribe tu numero de teléfono' 
                      id='telefono' 
                      name='telefono'
                      onChange={handleChangeInputValue}
                      values={form_values_state[fields.TELEFONO]}
                      />
                  </div>
                  <button type='submit'>Enviar consulta</button>
                </div>
            </form>
        </div>
    </div>
  )
}

export default ContactScreen