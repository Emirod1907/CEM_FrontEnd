import React, { useEffect, useState } from 'react'
import UploadImg from '../../../services/uploadimg'
import { createBodega } from '../../../services/bodegasServices'

const CreateBodegaForm = () => {
    
    const fields={
        NOMBRE: 'nombre',
        DOMICILIO: 'domicilio',
        DESCRIPCION: 'descripcion',
        IMAGEN: 'imagen',
        AFORO: 'aforo'
    }
    const initial_form_state={
        [fields.NOMBRE]: '',
        [fields.DOMICILIO]: '',
        [fields.DESCRIPCION]: '',
        [fields.IMAGEN]: null,
        [fields.AFORO]: ''
    }

    const [form_values_state, setFormValuesState]= useState(initial_form_state)
    
    const handleSubmit = async(event) =>{
        event.preventDefault()
        try {
            if(form_values_state.IMAGEN){
            await UploadImg(form_values_state.IMAGEN)
        }
        const dataToSend = {
        ...form_values_state,
        aforo: form_values_state.aforo ? parseInt(form_values_state.aforo) : 0,
        imagen: form_values_state.IMAGEN ? 'pending' : null
    }
    console.log("Datos a enviar",dataToSend)
    
    await createBodega(dataToSend)
    console.log("Datos enviados",dataToSend)
        } catch (error) {
            console.log("errores:",error);
        }
    }
    const handleChangeInputValue= (event)=>{
        setFormValuesState(
            (prev_state)=>{
                return {...prev_state,[event.target.name]:event.target.value}
            }
        )
    }
    const handleChangeImg= (event)=>{
        setFormValuesState(
            (prev_state)=>({
                ...prev_state,[event.target.name]:event.target.files[0]}
        ))
    }

  return (
    <div className='container'>
        <div className='form-container'>
            <div className='form-title'>
                <h1>Crear Bodega</h1>
            </div>
            <form action="submit" onSubmit={handleSubmit}>
                <div className='form-container-form-fields'>
                    <label htmlFor="nombre">Nombre</label>
                    <input 
                        type="text" 
                        placeholder='Bodega Random'
                        maxLength={30}
                        id='nombre'
                        name='nombre'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.NOMBRE]}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="domicilio">Domicilio</label>
                    <input 
                        type="text"
                        placeholder='Calle Desconocida N° 344 Maipu'
                        maxLength={30}
                        id='domicilio'
                        name='domicilio'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.DOMICILIO]}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="descripcion">Descripcion:</label>
                    <textarea 
                        name="descripcion" 
                        placeholder='Ingrese la descripcion de la bodega'
                        id="descripcion"
                        maxLength={150}
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.DESCRIPCION]}
                    >
                        </textarea>
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="Imagen">Imagen</label>
                    <input 
                        type="file"
                        placeholder='Ingrese imagen de la bodega'
                        id='imagen'
                        name='imagen'
                        onChange={handleChangeImg}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="aforo">Aforo:</label>
                    <input 
                        type="number"
                        placeholder='ingrese el numero de aforo'
                        id='aforo'
                        name='aforo'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.AFORO]}
                     />
                </div>
                <div className='form-input-button'>
                    <button>Crear Bodega</button>
                </div>
            </form>
        </div>
    </div>
  )
}

export default CreateBodegaForm