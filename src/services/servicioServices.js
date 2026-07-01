import axios from './axios'

// GET /api/servicios/disponibilidad?fecha=&invitados= — disponibilidad de servicios para una fecha
export const getDisponibilidadServicios = async (fecha, invitados = 0) => {
    try {
        const response = await axios.get(`servicios/disponibilidad?fecha=${fecha}&invitados=${invitados}`)
        return response.data.disponibilidad // [{ id_servicio, disponible, motivo, capacidad_restante }]
    } catch (error) {
        console.error('Error al obtener disponibilidad:', error)
        return []
    }
}

// GET /api/servicios — todos los servicios disponibles (para el modal del organizador)
export const getServicios = async () => {
    try {
        const response = await axios.get('servicios')
        return response.data.servicios
    } catch (error) {
        console.error('Error al obtener servicios:', error)
        return []
    }
}

// GET /api/servicios/mis-servicios — tiendita del proveedor autenticado
export const getMisServicios = async () => {
    try {
        const response = await axios.get('servicios/mis-servicios')
        return response.data.servicios
    } catch (error) {
        console.error('Error al obtener mis servicios:', error)
        return []
    }
}

// POST /api/servicios/mis-servicios — crear item en la tiendita
export const crearServicioProveedor = async (datos) => {
    const response = await axios.post('servicios/mis-servicios', datos)
    return response.data.servicio
}

// PUT /api/servicios/mis-servicios/:id — actualizar item propio
export const updateServicioProveedor = async (id, datos) => {
    const response = await axios.put(`servicios/mis-servicios/${id}`, datos)
    return response.data.servicio
}

// DELETE /api/servicios/mis-servicios/:id — desactivar item propio
export const deleteServicioProveedor = async (id) => {
    const response = await axios.delete(`servicios/mis-servicios/${id}`)
    return response.data
}

// GET /api/servicios/mis-reservas — reservas que incluyen servicios del proveedor
export const getMisReservasProveedor = async () => {
    try {
        const response = await axios.get('servicios/mis-reservas')
        return response.data.reservas
    } catch (error) {
        console.error('Error al obtener reservas del proveedor:', error)
        return []
    }
}

// GET /api/servicios/mi-agenda — bloqueos manuales y confirmaciones del proveedor
export const getMiAgenda = async () => {
    try {
        const response = await axios.get('servicios/mi-agenda')
        return response.data.agenda
    } catch (error) {
        console.error('Error al obtener agenda:', error)
        return []
    }
}

// POST /api/servicios/mi-agenda — crear bloqueo manual
export const crearBloqueoManual = async (datos) => {
    const response = await axios.post('servicios/mi-agenda', datos)
    return response.data.agenda
}

// PUT /api/servicios/mi-agenda/:id — actualizar reserva externa
export const updateBloqueoManual = async (id, datos) => {
    const response = await axios.put(`servicios/mi-agenda/${id}`, datos)
    return response.data.agenda
}

// PUT /api/servicios/mi-agenda/confirmar/:reserva_id — confirmar o cancelar solicitud
export const confirmarReservaProveedor = async (reserva_id, estado = 'confirmada', motivo_cancelacion = null) => {
    const response = await axios.put(`servicios/mi-agenda/confirmar/${reserva_id}`, { estado, motivo_cancelacion })
    return response.data.agenda
}

// DELETE /api/servicios/mi-agenda/:id — eliminar bloqueo manual
export const eliminarBloqueoManual = async (id) => {
    const response = await axios.delete(`servicios/mi-agenda/${id}`)
    return response.data
}
