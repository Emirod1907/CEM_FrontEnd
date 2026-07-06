import axios from './axios'

// POST /api/reservas/solicitar
// Crea una reserva pendiente de pago antes de que exista el evento
export const solicitarReserva = async ({ bodega_id, salon_id, fecha, datos_evento, horas }) => {
    try {
        // El backend espera salon_id; bodega_id es el nombre legacy del frontend
        const response = await axios.post('reservas/solicitar', {
            salon_id: salon_id ?? bodega_id,
            fecha,
            datos_evento,
            horas,
        })
        return response.data.reserva
    } catch (error) {
        console.error('Error al solicitar reserva:', error)
        throw error
    }
}

// PATCH /api/reservas/:id/fecha — cambia la fecha del evento (mismo salón)
export const cambiarFechaReserva = async (id_reserva, fecha) => {
    const response = await axios.patch(`reservas/${id_reserva}/fecha`, { fecha })
    return response.data.reserva
}

// GET /api/reservas/mis-reservas
export const getMisReservas = async () => {
    try {
        const response = await axios.get('reservas/mis-reservas')
        return response.data.reservas
    } catch (error) {
        console.error('Error al obtener reservas:', error)
        return []
    }
}

// PUT /api/reservas/:id/servicios
export const actualizarServiciosReserva = async (id, servicios, numInvitados) => {
    try {
        await axios.put(`reservas/${id}/servicios`, { servicios, numInvitados })
    } catch (error) {
        console.warn('No se pudieron persistir los servicios de la reserva:', error)
    }
}

// GET /api/reservas/:id
export const getReservaDetalle = async (id) => {
    try {
        const response = await axios.get(`reservas/${id}`)
        return response.data
    } catch (error) {
        console.error('Error al obtener detalle de reserva:', error)
        throw error
    }
}

// DELETE /api/reservas/:id  — elimina permanentemente una reserva cancelada
export const eliminarReservaCancelada = async (id) => {
    try {
        const response = await axios.delete(`reservas/${id}`)
        return response.data
    } catch (error) {
        console.error('Error al eliminar reserva cancelada:', error)
        throw error
    }
}

// GET /api/reservas/:id/cancelacion-preview?motivo=
export const getCancelacionPreview = async (id, motivo = 'voluntaria') => {
    const response = await axios.get(`reservas/${id}/cancelacion-preview`, { params: { motivo } })
    return response.data
}

// DELETE /api/reservas/:id/cancelar  (motivo: voluntaria | fuerza_mayor | arrepentimiento)
export const cancelarReserva = async (id, motivo = 'voluntaria') => {
    try {
        const response = await axios.delete(`reservas/${id}/cancelar`, { data: { motivo } })
        return response.data
    } catch (error) {
        console.error('Error al cancelar reserva:', error)
        throw error
    }
}
