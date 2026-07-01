import axios from './axios'

// Resumen del pozo común del evento: saldo, movimientos, invitados que pagaron
export const getPozoEvento = async (evento_id) => {
    const response = await axios.get(`eventos/${evento_id}/pozo`)
    return response.data
}

// Registra un egreso del pozo: 'pago_costo' | 'retiro_ganancia'
export const crearMovimientoPozo = async (evento_id, { tipo, monto, descripcion }) => {
    const response = await axios.post(`eventos/${evento_id}/pozo/movimiento`, { tipo, monto, descripcion })
    return response.data
}
