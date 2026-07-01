import axios from "./axios"

export const getTerminosActuales = async () => {
    const response = await axios.get('contratos/terminos-actuales')
    return response.data
}

export const aceptarContrato = async () => {
    const response = await axios.post('contratos/aceptar', { acepto: true }, { withCredentials: true })
    return response.data
}

export const getMiContrato = async () => {
    const response = await axios.get('contratos/mi-contrato', { withCredentials: true })
    return response.data
}
