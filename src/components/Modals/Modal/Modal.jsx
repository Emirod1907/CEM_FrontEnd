import React from 'react'
import BuscarBodegaList from '../../Buscadores/BuscarBodegaList/BuscarBodegaList'

const Modal = ({onClose, onSelectBodega}) => {
  return (
    <div className='modal-overlay' onClick={onClose}>
        <dialog open onClick={(e) => e.stopPropagation()}>
            <BuscarBodegaList onSelectBodega={onSelectBodega} />
            <button onClick={onClose}>Cerrar</button>
        </dialog>
    </div>
  )
}

export default Modal