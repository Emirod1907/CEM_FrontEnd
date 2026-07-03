import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../Contexts/PersonaContextProvider'
import { getMiContrato } from '../../services/contratoServices'
import ContratoModal from '../Modals/ContratoModal/ContratoModal'

// Cada rol que ofrece algo tiene su propio ámbito de contrato
const AMBITO_POR_ROL = {
    dueno_salon: 'salon',
    proveedor_servicios: 'proveedor',
    proveedor_insumos: 'proveedor',
}

// Al iniciar sesión, si el usuario no tiene contrato vigente para el ámbito de su rol,
// se le muestra el contrato correspondiente. Al aceptar, sus precios pasan a mostrarse
// con la comisión (el precio público es dinámico).
const ContratoGuard = () => {
    const { persona, isAuthenticated, loading } = useAuth()
    const [mostrar, setMostrar] = useState(false)
    const chequeadoPara = useRef(null)

    const ambito = AMBITO_POR_ROL[persona?.rol]

    useEffect(() => {
        if (loading) return
        if (!isAuthenticated || !persona || !ambito) {
            setMostrar(false)
            chequeadoPara.current = null
            return
        }
        const clave = `${persona.id_persona}:${ambito}`
        if (chequeadoPara.current === clave) return
        chequeadoPara.current = clave
        getMiContrato(ambito)
            .then((data) => { if (data?.requiere_nueva_aceptacion) setMostrar(true) })
            .catch(() => {})
    }, [loading, isAuthenticated, persona?.id_persona, ambito])

    if (!mostrar || !ambito) return null
    return (
        <ContratoModal
            ambito={ambito}
            onClose={() => setMostrar(false)}
            onAceptado={() => setMostrar(false)}
        />
    )
}

export default ContratoGuard
