import React from 'react'
import '../Cards.css'

const BodegaCard = ({nombre, domicilio, descripcion, imagen, aforo}) => {
        const fields={
        NOMBRE: nombre,
        DOMICILIO: domicilio ,
        DESCRIPCION: descripcion,
        IMAGEN: imagen,
        AFORO: aforo
    }
  return (
    <div className='card-container'>
        <div className='card-box'>
            <div className='card-fields'>
                <h1>{fields.NOMBRE}</h1>
            </div>
            <div className='card-fields'>
                <img src={fields.IMAGEN} alt={fields.NOMBRE} />
            </div>
            {/* <div className='card-fields'>
                <p>{fields.DESCRIPCION}</p>
            </div> */}
            <div className='card-fields'>
                {fields.DOMICILIO}
            </div>
            <div className='card-fields'>
                {fields.AFORO}
            </div>
        </div>
    </div>
  )
}

export default BodegaCard