import React, { useState } from 'react'
import '../Cards.css'
import BuyButton from '../../Buttons/BuyButton/BuyButton'

/* const [ Comprado, setComprado] = useState(false)*/
/* const [ entradas, setEntradas] = useState(entradas)*/
// const handleClickBuyButton = ()=>{
//     setComprado(true)
//     alert('Gracias por su compra!!')
//     setEntradas(entradas-1)
// }
const EventoCard = ({nombre, descripcion, fecha, precio, cupo, bodega, imagen}) => {
        const fields={
        NOMBRE: nombre,
        DESCRIPCION: descripcion,
        FECHA: fecha,
        PRECIO: precio,
        CUPO_DISPONIBLE: cupo,
        BODEGA: bodega,
        IMAGEN: imagen
    }
  return (
    <div className='card-container'>
        <div className='card-box'>
            <div className='card-fields'>
                <h1>{fields.NOMBRE}</h1>
            </div>
            {/* <div className='card-fields'>
                <p>{fields.DESCRIPCION}</p>
            </div> */}
            <div className='card-fields'>
                <img src={fields.IMAGEN} alt={fields.NOMBRE} />
            </div>
            <div className='card-fields'>
                <h3>Cantidad de entradas disponibles:</h3>
                <h3>{fields.CUPO_DISPONIBLE}</h3>
            </div>
            <div className='card-fields'>
                <h2>Fecha del Evento</h2>
                <h2>{fields.FECHA}</h2>
            </div>
            <div className='card-fields'>
                <h2>Precio de la entrada</h2>
                <span>${fields.PRECIO}</span>
            </div>
            <div className='card-fields'>
                <BuyButton/>
            </div>
        </div>
    </div>
  )
}

export default EventoCard