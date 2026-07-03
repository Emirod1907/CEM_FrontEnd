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
