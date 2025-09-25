import React, { useEffect, useState } from 'react'
import UploadImg from '../../../services/uploadimg'
import { createBodega } from '../../../services/bodegasServices'

const CreateBodegaForm = () => {
    
    const initial_form_state={
        nombre: '',
        domicilio: '',
        descripcion: '',
        imagen: null,
        aforo: ''
    }

    const [form_values_state, setFormValuesState]= useState(initial_form_state)
    
    const handleSubmit = async(event) =>{
        event.preventDefault()
        try {
                let imagenUrl = null;
                if (form_values_state.imagen) {
                    try {
                        console.log('📤 Subiendo imagen a imgBB...');
                        imagenUrl = await UploadImg(form_values_state.imagen);
                        console.log('✅ Imagen subida, URL:', imagenUrl);
                    } catch (error) {
                        console.warn('⚠️ Error subiendo imagen, continuando sin imagen:', error);
                        imagenUrl = null;
                    }
                }

                const dataToSend = {
                    nombre: form_values_state.nombre,
                    domicilio: form_values_state.domicilio,
                    descripcion: form_values_state.descripcion,
                    imagen: imagenUrl,
                    aforo: form_values_state.aforo ? parseInt(form_values_state.aforo) : 0
                }

                console.log("Datos a enviar", dataToSend);
                await createBodega(dataToSend);
        } catch (error) {
            console.log("errores:",error);
        }
    }

    const handleChange = (event) => {
        const field = event.target.name;
        if (field === 'imagen') {
            setFormValuesState(prev_state => ({
                ...prev_state,
                imagen: event.target.files[0]
            }));
        } else {
            setFormValuesState(prev_state => ({
                ...prev_state,
                [field]: event.target.value
            }));
        }
    }

  return (
    <div className='container'>
        <div className='form-container'>
            <div className='form-title'>
                <h1>Crear Bodega</h1>
            </div>
            <form action="submit" onSubmit={handleSubmit}>
                <div className='form-input'>
                    <label htmlFor="nombre">Nombre</label>
                    <input 
                        type="text" 
                        placeholder='Bodega Random'
                        maxLength={30}
                        id='nombre'
                        name='nombre'
                        onChange={handleChange}
                        value={form_values_state.nombre}
                    />
                </div>
                <div className='form-input'>
                    <label htmlFor="domicilio">Domicilio</label>
                    <input 
                        type="text"
                        placeholder='Calle Desconocida N° 344 Maipu'
                        maxLength={30}
                        id='domicilio'
                        name='domicilio'
                        onChange={handleChange}
                        value={form_values_state.domicilio}
                    />
                </div>
                <div className='form-input'>
                    <label htmlFor="descripcion">Descripcion:</label>
                    <textarea 
                        name="descripcion" 
                        placeholder='Ingrese la descripcion de la bodega'
                        id="descripcion"
                        maxLength={150}
                        onChange={handleChange}
                        value={form_values_state.descripcion}
                    >
                        </textarea>
                </div>
                <div className='form-input'>
                    <label htmlFor="Imagen">Imagen</label>
                    <input 
                        type="file"
                        placeholder='Ingrese imagen de la bodega'
                        id='imagen'
                        name='imagen'
                        onChange={handleChange}
                        // value={form_values_state.imagen}
                    />
                </div>
                <div className='form-input'>
                    <label htmlFor="aforo">Aforo:</label>
                    <input 
                        type="number"
                        placeholder='ingrese el numero de aforo'
                        id='aforo'
                        name='aforo'
                        onChange={handleChange}
                        value={form_values_state.aforo}
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