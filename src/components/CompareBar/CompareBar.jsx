import React from 'react'
import { useCompare } from '../../Contexts/CompareContextProvider'
import { FiColumns, FiX } from 'react-icons/fi'
import './CompareBar.css'

/**
 * Barra flotante inferior que aparece cuando hay ítems en la comparación.
 * @param {'salones'|'eventos'|'ambos'} tipo — qué sección mostrar
 */
const CompareBar = ({ tipo = 'ambos' }) => {
    const {
        salonesComparar, quitarSalonComparar, limpiarSalonesComparar,
        eventosComparar, quitarEventoComparar, limpiarEventosComparar,
        abrirComparacion,
    } = useCompare()

    const mostrarSalones = (tipo === 'salones' || tipo === 'ambos') && salonesComparar.length > 0
    const mostrarEventos = (tipo === 'eventos' || tipo === 'ambos') && eventosComparar.length > 0

    if (!mostrarSalones && !mostrarEventos) return null

    return (
        <div className='cbar-root'>
            <div className='cbar-inner'>
                <div className='cbar-items'>
                    {mostrarSalones && salonesComparar.map(s => (
                        <div key={s.id_bodega} className='cbar-item'>
                            {s.imagen
                                ? <img src={s.imagen} alt={s.nombre} className='cbar-thumb'/>
                                : <div className='cbar-thumb cbar-thumb--placeholder'/>
                            }
                            <span className='cbar-nombre'>{s.nombre}</span>
                            <button className='cbar-quitar' onClick={() => quitarSalonComparar(s.id_bodega)}>
                                <FiX size={12}/>
                            </button>
                        </div>
                    ))}
                    {mostrarEventos && eventosComparar.map(e => (
                        <div key={e.id_evento} className='cbar-item cbar-item--evento'>
                            {e.imagen
                                ? <img src={e.imagen} alt={e.nombre} className='cbar-thumb'/>
                                : <div className='cbar-thumb cbar-thumb--placeholder'/>
                            }
                            <span className='cbar-nombre'>{e.nombre}</span>
                            <button className='cbar-quitar' onClick={() => quitarEventoComparar(e.id_evento)}>
                                <FiX size={12}/>
                            </button>
                        </div>
                    ))}
                </div>

                <div className='cbar-acciones'>
                    <button
                        className='cbar-btn-comparar'
                        onClick={() => abrirComparacion(mostrarSalones ? 'salones' : 'eventos')}
                    >
                        <FiColumns size={15}/> Comparar ({salonesComparar.length + eventosComparar.length})
                    </button>
                    <button
                        className='cbar-btn-limpiar'
                        onClick={() => { limpiarSalonesComparar(); limpiarEventosComparar() }}
                        title='Limpiar todo'
                    >
                        <FiX size={15}/>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CompareBar
