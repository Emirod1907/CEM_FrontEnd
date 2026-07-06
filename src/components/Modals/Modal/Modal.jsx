import React from 'react'
import BuscarSalonList from '../../Buscadores/BuscarSalonList/BuscarSalonList'
import '../modal.css'

const Modal = ({ onClose, onSelectSalon, fechaFiltro, cupoFiltro }) => {
  return (
    <div className='de-window-overlay' onClick={onClose}>
      <div className='de-window de-window--wide' onClick={(e) => e.stopPropagation()}>
        <div className='de-window__head'>
          <h2 className='de-window__title'>Elegí un salón</h2>
          <button type='button' className='de-window__close' onClick={onClose} aria-label='Cerrar'>×</button>
        </div>

        <div className='de-window__body'>
          <BuscarSalonList onSelectSalon={onSelectSalon} fechaFiltro={fechaFiltro} cupoFiltro={cupoFiltro} />
        </div>

        <div className='de-window__foot'>
          <button type='button' className='de-btn de-btn--ghost' onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default Modal
