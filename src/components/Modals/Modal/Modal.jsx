import React from 'react'
import BuscarSalonList from '../../Buscadores/BuscarSalonList/BuscarSalonList'
import '../modal.css'

const Modal = ({onClose, onSelectSalon, fechaFiltro, cupoFiltro}) => {
  return (
    <div className='modal-overlay' onClick={onClose}>
        <dialog open onClick={(e) => e.stopPropagation()}>
            <div className='modal-scroll-body'>
                <BuscarSalonList onSelectSalon={onSelectSalon} fechaFiltro={fechaFiltro} cupoFiltro={cupoFiltro} />
            </div>
            <div className='modal-close-btn'>
                <button onClick={onClose}>Cerrar</button>
            </div>
        </dialog>
    </div>
  )
}

export default Modal