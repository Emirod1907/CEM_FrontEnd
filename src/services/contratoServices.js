import axios from "./axios"

export const getTerminosActuales = async () => {
    const response = await axios.get('contratos/terminos-actuales')
    return response.data
}

// ambito: 'salon' | 'proveedor'
export const aceptarContrato = async (ambito = 'salon') => {
    const response = await axios.post('contratos/aceptar', { acepto: true, ambito }, { withCredentials: true })
    return response.data
}

export const getMiContrato = async (ambito) => {
    const response = await axios.get('contratos/mi-contrato', {
        params: ambito ? { ambito } : {},
        withCredentials: true,
    })
    return response.data
}

// Bases y condiciones del consumidor + política de cancelación (checkout)
export const getTerminosConsumidor = async () => {
    const response = await axios.get('contratos/terminos-consumidor')
    return response.data
}

export const aceptarTerminosConsumidor = async () => {
    const response = await axios.post('contratos/aceptar-consumidor', { acepto: true }, { withCredentials: true })
    return response.data
}
