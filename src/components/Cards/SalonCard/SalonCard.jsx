import React from 'react'
import { FiEye, FiColumns, FiCheck } from 'react-icons/fi'
import { useCompare } from '../../../Contexts/CompareContextProvider'
import '../Cards.css'

const parsearJSON = (valor) => {
    if (!valor) return []
    if (Array.isArray(valor)) return valor
    try { return JSON.parse(valor) } catch { return [] }
}

const SalonCard = ({ id_bodega, nombre, domicilio, localidad, departamento, servicios_incluidos, tipos_evento, tipo_salon, imagen, aforo, precio_alquiler, precio_publico, precios_config, latitud, longitud, onSelect, onVerDetalle }) => {
    const { agregarSalonComparar, quitarSalonComparar, enSalonesComparar, MAX, salonesComparar } = useCompare()
    const enComparacion = enSalonesComparar(id_bodega)
    const precioMostrado = precio_publico ?? precio_alquiler
    const salon = { id_bodega, nombre, domicilio, localidad, departamento, servicios_incluidos, tipos_evento, tipo_salon, imagen, aforo, precio_alquiler, precio_publico, precios_config, latitud, longitud }

    const handleSelect = () => {
        if (onSelect) onSelect(salon)
    }

    const handleDetalle = (e) => {
        e.stopPropagation()
        if (onVerDetalle) onVerDetalle(salon)
    }

    const handleComparar = (e) => {
        e.stopPropagation()
        if (enComparacion) quitarSalonComparar(id_bodega)
        else agregarSalonComparar(salon)
    }

    const lleno = !enComparacion && salonesComparar.length >= MAX

    return (
        <div className='card-container' onClick={handleSelect} style={{ cursor: 'pointer' }}>
            <div className='card-box'>
                <div className='card-fields'>
                    <h1>{nombre}</h1>
                </div>
                <div className='card-fields'>
                    <img src={imagen} alt={nombre} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                </div>
                <div className='card-fields'>
                    <h3>📍 {domicilio}{localidad ? `, ${localidad}` : ''}</h3>
                </div>
                <div className='card-fields'>
                    <h3>👥 Aforo: {aforo} personas</h3>
                </div>
                {precioMostrado && (
                    <div className='card-fields'>
                        <span className='salon-card-precio'>${Number(precioMostrado).toLocaleString('es-AR')}<small>/evento</small></span>
                    </div>
                )}
                <div className='salon-card-footer'>
                    <button
                        className={`salon-comparar-btn ${enComparacion ? 'salon-comparar-btn--activo' : ''}`}
                        onClick={handleComparar}
                        disabled={lleno}
                        title={lleno ? `Máximo ${MAX} salones` : enComparacion ? 'Quitar de comparación' : 'Agregar a comparación'}
                    >
                        {enComparacion ? <><FiCheck size={13}/> En comparación</> : <><FiColumns size={13}/> Comparar</>}
                    </button>
                    <button className='salon-ver-detalle-btn' onClick={handleDetalle} title='Ver detalle del salón'>
                        <FiEye size={14}/> Ver detalle
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SalonCard
