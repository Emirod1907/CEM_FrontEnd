import React, { useState } from 'react'
import BodegasList from '../../Lists/BodegasList/BodegasList'

const BuscarBodegaList = ({onSelectBodega}) => {
    const[searchTerm, setSearchTerm]= useState('')
  return (
    <div>
        <input 
            type="text" 
            placeholder='Ingrese Nombre de Bodega...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
        <BodegasList
            searchTerm={searchTerm}
            onSelectBodega={onSelectBodega}
        />
    </div>
  )
}

export default BuscarBodegaList