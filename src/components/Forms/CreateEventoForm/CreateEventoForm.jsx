import React, { useEffect, useState } from 'react'
import UploadImg from '../../../services/uploadimg'
import { postEvent } from '../../../services/eventosServices'
import Modal from '../../Modals/Modal/Modal'
import { FaSearch } from "react-icons/fa";
import { useAuth } from '../../../Contexts/PersonaContextProvider';
import { useNavigate } from 'react-router-dom';

const CreateEventoForm = () => {

    const fields = {
      BODEGA: 'bodega'
    };
    const initial_form_state={
        nombre:'',
        descripcion:'',
        fecha:'',
        precio:'',
        cupo_disponible:'',
        bodega:{id_bodega:'',nombre:''},
        imagen: null
    }
    // const {isAuthenticated} =  useAuth()
    // const navigate = useNavigate()
    const [OpenModal, SetOpenModal]= useState(false)
    const [ form_values_state, setFormValuesState] = useState(initial_form_state)
  
    const handleSubmit = async(event)=>{
        event.preventDefault()

        if (!form_values_state.bodega.id_bodega) {
            alert('Por favor selecciona una bodega')
            return
        }
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
                    descripcion: form_values_state.descripcion,
                    fecha: form_values_state.fecha,
                    precio: form_values_state.precio,
                    cupo_disponible: form_values_state.cupo_disponible,
                    
                    imagen: imagenUrl,
                    bodega_id: form_values_state.bodega.id_bodega,
                }
                console.log("Datos a enviar", dataToSend);
                const result = await postEvent(dataToSend)

                if (result) {
                alert('Evento creado exitosamente!')
                setFormValuesState(initial_form_state) // Reset form
            }
            
        }catch(error){
            console.log("Error al crear evento:",error);
            alert('Error al crear el evento')
        }
}

    const handleChangeInputValue = (event) =>{
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
                <h1>Crear Evento</h1>
            </div>
            <form action="submit" onSubmit={handleSubmit}>
                <div className='form-container-form-fields' >
                    <label htmlFor="nombre">Nombre del Evento</label>
                    <input 
                        type="text"
                        placeholder='Party-Party'
                        maxLength={50}
                        id='nombre'
                        name='nombre'
                        onChange={handleChangeInputValue}
                        value={form_values_state.nombre}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="descripcion">Descripcion</label>
                    <textarea
                        placeholder='la fiesta sera para todos los empleados de ACME'
                        maxLength={500}
                        name="descripcion" 
                        id="descripcion"
                        onChange={handleChangeInputValue}
                        value={form_values_state.descripcion}
                    >Ingrese la descripcion del Evento:
                    </textarea>
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="fecha">Fecha</label>
                    <input 
                        type= "date"
                        id='fecha'
                        name='fecha'
                        onChange={handleChangeInputValue}
                        value={form_values_state.fecha}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="precio">Ingrese el valor de la entrada:</label>
                    <input 
                        type="number" 
                        id='precio'
                        name='precio'
                        onChange={handleChangeInputValue}
                        value={form_values_state.precio}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="cupo">Cupo de entradas disponible</label>
                    <input 
                    type="number" 
                    id='cupo_disponible'
                    name='cupo_disponible'
                    onChange={handleChangeInputValue}
                    value={form_values_state.cupo_disponible}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="bodega">Seleccione la Bodega donde va a llevarse a cabo el evento:</label>
                    <input 
                        type="text"
                        readOnly 
                        id='bodega'
                        name='bodega'
                        onChange={handleChangeInputValue}
                        value={form_values_state.bodega.nombre||''}
                        placeholder='Selecciona una bodega'
                    /> 
                    <span><FaSearch onClick={()=>{SetOpenModal(true)}}>Buscar bodega</FaSearch></span>
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="imagen">Inserte imagen del evento</label>
                    <input 
                        type="file" 
                        id='imagen'
                        name='imagen'
                        onChange={handleChangeInputValue}
                    />
                </div>
                <div className='form-input-button'>
                    <button>Crear Evento</button>
                </div>
            </form>

        </div>
        {OpenModal && (
        <Modal 
            onClose={() => SetOpenModal(false)}
            onSelectBodega={(bodega) => {
            setFormValuesState(prev => ({...prev,
                bodega: {
                    id: bodega.id_bodega,
                    nombre: bodega.nombre
            }
        }));
            setIsModalOpen(false);
            }}
        />
        )}
    </div>
  )
}

export default CreateEventoForm