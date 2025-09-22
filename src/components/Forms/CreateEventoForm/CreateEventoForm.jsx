import React, { useEffect, useState } from 'react'
import UploadImg from '../../../services/uploadimg'
import { postEvent } from '../../../services/eventosServices'
import Modal from '../../Modals/Modal/Modal'
import { FaSearch } from "react-icons/fa";
import { useAuth } from '../../../Contexts/PersonaContextProvider';
import { useNavigate } from 'react-router-dom';

const CreateEventoForm = () => {
    const fields={
        NOMBRE: 'nombre',
        DESCRIPCION: 'descripcion',
        FECHA: 'fecha',
        PRECIO: 'precio',
        CUPO_DISPONIBLE: 'cupo',
        BODEGA:'bodega',
        IMAGEN: 'imagen'
    }
    const initial_form_state={
        [fields.NOMBRE]:'',
        [fields.DESCRIPCION]:'',
        [fields.FECHA]:'',
        [fields.PRECIO]:'',
        [fields.CUPO_DISPONIBLE]:'',
        [fields.BODEGA]:{id_bodega:'',nombre:''},
        [fields.IMAGEN]: null
    }
    const {isAuthenticated} =  useAuth()
    const navigate = useNavigate()
    const [OpenModal, SetOpenModal]= useState(false)
    const [ form_values_state, setFormValuesState] = useState(initial_form_state)
  
    const handleSubmit = async(event)=>{
        event.preventDefault()
        await UploadImg(form_values_state.IMAGEN)
        await postEvent(form_values_state)
        return res.json(event)
    }

    const handleChangeInputValue = (event) =>{
        setFormValuesState(
            (prev_state)=>{
                return { ...prev_state, [event.target.name]: event.target.value}
            }
        )
    }
        const handleChangeImg = (imagen) =>{
        setFormValuesState(
            (prev_state)=>{
                return { ...prev_state, [imagen.target.name]: imagen.target.file}
            }
        )
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
                        value={form_values_state[fields.NOMBRE]}
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
                        value={form_values_state[fields.DESCRIPCION]}
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
                        value={form_values_state[fields.FECHA]}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="precio">Ingrese el valor de la entrada:</label>
                    <input 
                        type="number" 
                        id='precio'
                        name='precio'
                        onChange={handleChangeInputValue}
                        value={form_values_state[fields.PRECIO]}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <label htmlFor="cupo">Cupo de entradas disponible</label>
                    <input 
                    type="number" 
                    id='cupo'
                    name='cupo'
                    onChange={handleChangeInputValue}
                    value={form_values_state[fields.CUPO_DISPONIBLE]}
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
                        value={form_values_state[fields.BODEGA].nombre||''}
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
                        onChange={handleChangeImg}
                    />
                </div>
                <div className='form-container-form-fields'>
                    <button>Crear Evento</button>
                </div>
            </form>

        </div>
        {OpenModal && (
        <Modal 
            onClose={() => SetOpenModal(false)}
            onSelectBodega={(bodega) => {
            setFormValuesState(prev => ({...prev,
                [fields.BODEGA]: {
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