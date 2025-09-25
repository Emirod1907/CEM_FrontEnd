import React from 'react'
import '../Cards.css'

const BodegaCard = ({nombre, domicilio, descripcion, imagen, aforo, onSelect}) => {
    
        const handleClick = () => {
        if (onSelect) {
            onSelect({ id, nombre, domicilio, descripcion, imagen, aforo })
        }
    }
    
  return (
    <div className='card-container' onClick={handleClick} style={{ cursor: 'pointer' }}>
        <div className='card-box'>
            <div className='card-fields'>
                <h1>{nombre}</h1>
            </div>
            <div className='card-fields'>
                <img src={imagen}  alt={nombre} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
            </div>
            {/* <div className='card-fields'>
                <p>{fields.DESCRIPCION}</p>
            </div> */}
            <div className='card-fields'>
                {domicilio}
            </div>
            <div className='card-fields'>
                {aforo}
            </div>
        </div>
    </div>
  )
}

export default BodegaCard