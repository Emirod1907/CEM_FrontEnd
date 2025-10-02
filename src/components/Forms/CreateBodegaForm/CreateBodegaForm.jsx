import React, { useEffect, useState } from 'react'
import UploadImg from '../../../services/uploadimg'
import { createBodega } from '../../../services/bodegasServices'
import { useTour } from '../../../hooks/useTour';


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

    const { startTour } = useTour();

  const crearBodegaTour = [
    {
      element: 'form',
      popover: {
        title: 'Formulario de Bodega',
        description: 'Completa este formulario para crear una nueva bodega.',
        side: "bottom",
        align: 'start'
      }
    },
    {
      element: 'input:first-of-type',
      popover: {
        title: 'Nombre de Bodega',
        description: 'Ingresa el nombre de la bodega.',
        side: "bottom",
        align: 'start'
      }
    },
    {
      element: 'input[name=domicilio]',
      popover: {
        title: 'domicilio',
        description: 'Ingresa el domicilio de la bodega.',
        side: "top",
        align: 'start'
      }
    },
        {
      element: 'input[name=imagen]',
      popover: {
        title: 'Imagen',
        description: 'Sube una imagen de la bodega.',
        side: "top",
        align: 'start'
      }
    },
    {
      element: 'button[type="submit"]',
      popover: {
        title: 'Guardar',
        description: 'Guarda la bodega cuando termines.',
        side: "top",
        align: 'start'
      }
    }
  ];



  return (
    <div className='container'>
        <div className='form-container'>
            <button 
                onClick={() => startTour(crearBodegaTour)}
                style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '5px',
                cursor: 'pointer',
                margin: '50px 20px'
                }}
            >
                🎓 Tutorial Crear Bodega
            </button>
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