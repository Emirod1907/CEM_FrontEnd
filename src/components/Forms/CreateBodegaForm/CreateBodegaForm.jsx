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
        await createBodega(form_values_state)
        await UploadImg(form_values_state.IMAGEN)
    }
    const handleChangeInputValue= (event)=>{
        setFormValuesState(
            (prev_state)=>{
                return {...prev_state,[event.target.name]:event.target.value}
            }
        )
    }
    const handleChangeImg= (imagen)=>{
        setFormValuesState(
            (prev_state)=>{
                return {...prev_state,[imagen.target.name]:imagen.target.file}
            }
        )
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
                <div className='form-container-form-fields'>
                    <button>Crear Bodega</button>
                </div>
            </form>
        </div>
    </div>
  )
}

export default CreateBodegaForm