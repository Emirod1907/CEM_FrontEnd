import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../Contexts/PersonaContextProvider'
import { getMiContrato } from '../../services/contratoServices'
import ContratoModal from '../Modals/ContratoModal/ContratoModal'

// Roles que ofrecen algo en la plataforma y por eso requieren aceptar el contrato
const ROLES_CON_CONTRATO = ['proveedor_servicios', 'proveedor_insumos', 'dueno_salon']

// Al iniciar sesión, si un proveedor o dueño de salón no tiene contrato vigente,
// se le muestra el contrato para aceptarlo. Al aceptar, sus precios pasan a
// mostrarse con la comisión (el cálculo del precio público es dinámico).
const ContratoGuard = () => {
    const { persona, isAuthenticated, loading } = useAuth()
    const [mostrar, setMostrar] = useState(false)
    const chequeadoPara = useRef(null)

    useEffect(() => {
        if (loading) return
        if (!isAuthenticated || !persona || !ROLES_CON_CONTRATO.includes(persona.rol)) {
            setMostrar(false)
            chequeadoPara.current = null
            return
        }
        // Chequear una sola vez por usuario
        if (chequeadoPara.current === persona.id_persona) return
        chequeadoPara.current = persona.id_persona
        getMiContrato()
            .then((data) => { if (data?.requiere_nueva_aceptacion) setMostrar(true) })
            .catch(() => {})
    }, [loading, isAuthenticated, persona?.id_persona, persona?.rol])

    if (!mostrar) return null
    return (
        <ContratoModal
            onClose={() => setMostrar(false)}
            onAceptado={() => setMostrar(false)}
        />
    )
}

export default ContratoGuard
