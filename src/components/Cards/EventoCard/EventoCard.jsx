import React from 'react'
import '../Cards.css'
import AddToCartButton from '../../Buttons/AddToCartButton/AddToCartButton'
import { FiColumns, FiCheck } from 'react-icons/fi'
import { useCompare } from '../../../Contexts/CompareContextProvider'

const EventoCard = ({ id_evento, nombre, descripcion, fecha, precio, cupo, salon, imagen, es_publico, datos_evento }) => {
    const { agregarEventoComparar, quitarEventoComparar, enEventosComparar, MAX, eventosComparar } = useCompare()
    const enComparacion = enEventosComparar(id_evento)
    const evento = { id_evento, nombre, descripcion, fecha, precio, cupo, salon, imagen, es_publico, datos_evento }
    const lleno = !enComparacion && eventosComparar.length >= MAX

    const handleComparar = () => {
        if (enComparacion) quitarEventoComparar(id_evento)
        else agregarEventoComparar(evento)
    }

    return (
        <div className='card-container'>
            <div className='card-box'>
                <div className='card-fields'>
                    <h1>{nombre}</h1>
                </div>
                <div className='card-fields card-img-wrap'>
                    <img
                        src={imagen}
                        alt={nombre}
                        loading='lazy'
                        onError={(e) => {
                            if (e.target.dataset.fallback) return
                            e.target.dataset.fallback = '1'
                            e.target.src = 'https://picsum.photos/seed/dreamevents-fallback/800/600'
                        }}
                    />
                </div>
                <div className='card-fields'>
                    <h3>Entradas disponibles:</h3>
                    <h3>{cupo}</h3>
                </div>
                <div className='card-fields'>
                    <h2>Fecha del Evento</h2>
                    <h2>{fecha}</h2>
                </div>
                <div className='card-fields'>
                    <h2>Precio de la entrada</h2>
                    <span>${precio}</span>
                </div>
                <div className='card-fields'>
                    <AddToCartButton evento={{ id_evento, nombre, descripcion, precio, imagen }} />
                </div>
                <div className='salon-card-footer'>
                    <button
                        className={`salon-comparar-btn ${enComparacion ? 'salon-comparar-btn--activo' : ''}`}
                        onClick={handleComparar}
                        disabled={lleno}
                        title={lleno ? `Máximo ${MAX} eventos` : enComparacion ? 'Quitar de comparación' : 'Agregar a comparación'}
                    >
                        {enComparacion ? <><FiCheck size={13}/> En comparación</> : <><FiColumns size={13}/> Comparar</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EventoCard