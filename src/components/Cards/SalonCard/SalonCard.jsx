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

    const servicios = parsearJSON(servicios_incluidos)
    const MAX_TAGS = 3
    const serviciosVisibles = servicios.slice(0, MAX_TAGS)
    const serviciosExtra = servicios.length - serviciosVisibles.length

    const handleImgError = (e) => {
        // Evita el ícono de imagen rota si la URL no carga
        if (e.target.dataset.fallback) return
        e.target.dataset.fallback = '1'
        e.target.src = 'https://picsum.photos/seed/dreamevents-fallback/800/600'
    }

    return (
        <div className='card-container' onClick={handleSelect} style={{ cursor: 'pointer' }}>
            <div className='card-box'>
                <div className='card-fields'>
                    <h1>{nombre}</h1>
                </div>
                <div className='card-fields card-img-wrap'>
                    <img src={imagen} alt={nombre} loading='lazy' onError={handleImgError} />
                </div>
                {(tipo_salon || serviciosVisibles.length > 0) && (
                    <div className='card-fields salon-card-tags'>
                        {tipo_salon && <span className='salon-tag salon-tag--tipo'>{tipo_salon}</span>}
                        {serviciosVisibles.map((s, i) => (
                            <span key={i} className='salon-tag salon-tag--servicio'>{s}</span>
                        ))}
                        {serviciosExtra > 0 && (
                            <span className='salon-tag salon-tag--mas' title={servicios.slice(MAX_TAGS).join(', ')}>
                                +{serviciosExtra}
                            </span>
                        )}
                    </div>
                )}
                <div className='card-fields'>
                    <h3>📍 {domicilio}{localidad ? `, ${localidad}` : ''}{departamento ? ` — ${departamento}` : ''}</h3>
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
