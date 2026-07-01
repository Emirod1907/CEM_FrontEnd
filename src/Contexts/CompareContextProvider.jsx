import React, { createContext, useContext, useState } from 'react'

const CompareContext = createContext()

export const useCompare = () => {
    const ctx = useContext(CompareContext)
    if (!ctx) throw new Error('useCompare debe usarse dentro de CompareContextProvider')
    return ctx
}

const MAX = 4

const CompareContextProvider = ({ children }) => {
    const [salonesComparar, setSalonesComparar] = useState([])
    const [eventosComparar, setEventosComparar] = useState([])
    const [mostrarComparacion, setMostrarComparacion] = useState(false)
    const [tabComparacion, setTabComparacion] = useState('salones') // 'salones' | 'eventos'

    // ── Salones ──
    const agregarSalonComparar = (salon) => {
        setSalonesComparar(prev => {
            if (prev.find(s => s.id_bodega === salon.id_bodega)) return prev
            if (prev.length >= MAX) return prev
            return [...prev, salon]
        })
    }
    const quitarSalonComparar = (id_bodega) =>
        setSalonesComparar(prev => prev.filter(s => s.id_bodega !== id_bodega))
    const limpiarSalonesComparar = () => setSalonesComparar([])
    const enSalonesComparar = (id_bodega) => salonesComparar.some(s => s.id_bodega === id_bodega)

    // ── Eventos ──
    const agregarEventoComparar = (evento) => {
        setEventosComparar(prev => {
            if (prev.find(e => e.id_evento === evento.id_evento)) return prev
            if (prev.length >= MAX) return prev
            return [...prev, evento]
        })
    }
    const quitarEventoComparar = (id_evento) =>
        setEventosComparar(prev => prev.filter(e => e.id_evento !== id_evento))
    const limpiarEventosComparar = () => setEventosComparar([])
    const enEventosComparar = (id_evento) => eventosComparar.some(e => e.id_evento === id_evento)

    // Total de ítems en comparación
    const totalComparacion = salonesComparar.length + eventosComparar.length

    const abrirComparacion = (tab = null) => {
        if (tab) setTabComparacion(tab)
        setMostrarComparacion(true)
    }

    return (
        <CompareContext.Provider value={{
            salonesComparar, agregarSalonComparar, quitarSalonComparar, limpiarSalonesComparar, enSalonesComparar,
            eventosComparar, agregarEventoComparar, quitarEventoComparar, limpiarEventosComparar, enEventosComparar,
            mostrarComparacion, setMostrarComparacion,
            tabComparacion, setTabComparacion,
            abrirComparacion, totalComparacion, MAX,
        }}>
            {children}
        </CompareContext.Provider>
    )
}

export default CompareContextProvider
