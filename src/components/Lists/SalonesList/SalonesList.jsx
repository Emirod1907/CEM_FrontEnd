import React, { useEffect, useState, useMemo } from 'react'
import SalonCard from '../../Cards/SalonCard/SalonCard'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { getSalones } from '../../../services/salonesServices'
import '../Lists.css'

const ORDEN_OPCIONES = [
    { value: 'default',   label: 'Sin orden' },
    { value: 'precio_asc',  label: 'Precio: menor a mayor' },
    { value: 'precio_desc', label: 'Precio: mayor a menor' },
    { value: 'aforo_asc',   label: 'Aforo: menor a mayor' },
    { value: 'aforo_desc',  label: 'Aforo: mayor a menor' },
]

const SalonesList = ({ searchTerm, onSelectSalon, onVerDetalle, salonesExternos, loadingExterno, errorExterno }) => {
    const modoExterno = salonesExternos !== undefined

    const [salones, setSalones] = useState([])
    const [loading, setLoading] = useState(!modoExterno)
    const [error, setError] = useState(false)
    const [orden, setOrden] = useState('default')

    useEffect(() => {
        if (modoExterno) return
        const fetchSalones = async () => {
            setLoading(true)
            try {
                const salonesData = await getSalones()
                if (salonesData && Array.isArray(salonesData)) {
                    setSalones(salonesData)
                } else {
                    setError('No se pudieron cargar los salones')
                }
            } catch (err) {
                setError('Error al cargar los salones: ' + err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchSalones()
    }, [])

    const isLoading = modoExterno ? loadingExterno : loading
    const isError = modoExterno ? errorExterno : error

    const salonesMostrados = useMemo(() => {
        let lista = [...(modoExterno ? (salonesExternos || []) : salones)]

        // Filtro por búsqueda
        if (searchTerm) {
            lista = lista.filter(b =>
                b.nombre.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Orden
        if (orden === 'precio_asc') {
            lista.sort((a, b) => (Number(a.precio_publico ?? a.precio_alquiler) || 0) - (Number(b.precio_publico ?? b.precio_alquiler) || 0))
        } else if (orden === 'precio_desc') {
            lista.sort((a, b) => (Number(b.precio_publico ?? b.precio_alquiler) || 0) - (Number(a.precio_publico ?? a.precio_alquiler) || 0))
        } else if (orden === 'aforo_asc') {
            lista.sort((a, b) => a.aforo - b.aforo)
        } else if (orden === 'aforo_desc') {
            lista.sort((a, b) => b.aforo - a.aforo)
        }

        return lista
    }, [salones, salonesExternos, searchTerm, orden, modoExterno])

    if (isLoading) return <h1><TailSpin /> Cargando Salones...</h1>
    if (isError)   return <h2>{isError}</h2>

    return (
        <div>
            {/* Barra de orden */}
            <div className='salones-orden-bar'>
                <label htmlFor='salones-orden'>Ordenar por:</label>
                <select
                    id='salones-orden'
                    value={orden}
                    onChange={e => setOrden(e.target.value)}
                    className='salones-orden-select'
                >
                    {ORDEN_OPCIONES.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                </select>
                <span className='salones-orden-count'>{salonesMostrados.length} salón{salonesMostrados.length !== 1 ? 'es' : ''}</span>
            </div>

            {salonesMostrados.length === 0
                ? <div className='no-results'>
                    {searchTerm ? 'No se encontraron salones con ese nombre' : 'No hay salones disponibles'}
                  </div>
                : <div className='list-grid'>
                    {salonesMostrados.map(salon => (
                        <SalonCard
                            key={salon.id_bodega}
                            {...salon}
                            onSelect={onSelectSalon}
                            onVerDetalle={onVerDetalle}
                        />
                    ))}
                  </div>
            }
        </div>
    )
}

export default SalonesList
