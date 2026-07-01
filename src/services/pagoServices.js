import axios from './axios'

export const crearPreferenciaPago = async (items) => {
    try {
        const response = await axios.post('pagos/crear-preferencia', { items })
        return response.data
    } catch (error) {
        console.error('Error al crear preferencia de pago:', error)
        return null
    }
}

// Pago del carrito de organizador (seña o total)
export const crearPreferenciaOrganizador = async ({ reserva_id, tipo_pago, servicios, precio_entrada }) => {
    try {
        const response = await axios.post('pagos/crear-preferencia-organizador', {
            reserva_id,
            tipo_pago,
            servicios,
            precio_entrada: precio_entrada ? Number(precio_entrada) : undefined
        })
        return response.data
    } catch (error) {
        console.error('Error al crear preferencia de organizador:', error)
        return null
    }
}

// Confirma un pago al volver del checkout — respaldo del webhook en localhost
export const confirmarPago = async (payment_id) => {
    try {
        const response = await axios.post('pagos/confirmar', { payment_id })
        return response.data
    } catch (error) {
        console.error('Error al confirmar el pago:', error)
        return null
    }
}

// Pregunta al backend si la orden ya tiene un pago en MP y lo aplica
// (polling de la pantalla de espera mientras se paga en otra pestaña)
export const verificarOrden = async (orden_id) => {
    try {
        const response = await axios.get(`pagos/orden/${orden_id}/verificar`)
        return response.data
    } catch (error) {
        console.error('Error al verificar la orden:', error)
        return null
    }
}

export const getMisOrdenes = async () => {
    try {
        const response = await axios.get('pagos/mis-ordenes')
        return response.data.ordenes
    } catch (error) {
        console.error('Error al obtener órdenes:', error)
        return null
    }
}

export const getOrden = async (id) => {
    try {
        const response = await axios.get(`pagos/orden/${id}`)
        return response.data
    } catch (error) {
        console.error('Error al obtener la orden:', error)
        return null
    }
}
