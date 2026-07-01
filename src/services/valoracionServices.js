import axios from './axios'

/**
 * Envía valoraciones para una reserva (salon, servicios, general).
 * @param {number} reserva_id
 * @param {Array<{ tipo, entidad_id, estrellas, comentario }>} valoraciones
 */
export const crearValoraciones = async (reserva_id, valoraciones) => {
    const { data } = await axios.post('valoraciones', { reserva_id, valoraciones })
    return data
}

/**
 * Devuelve las valoraciones ya existentes para una reserva (para saber si ya fue calificada).
 * @param {number} reserva_id
 */
export const getValoracionesReserva = async (reserva_id) => {
    const { data } = await axios.get(`valoraciones/reserva/${reserva_id}`)
    return data.valoraciones || []
}

/**
 * Devuelve promedio y total de valoraciones de un salón.
 * @param {number} bodega_id
 */
export const getValoracionesSalon = async (bodega_id) => {
    const { data } = await axios.get(`valoraciones/salon/${bodega_id}`)
    return data
}

/**
 * Devuelve los combos (salon + servicios) mejor puntuados para sugeridos.
 * Endpoint público, no requiere auth.
 */
export const getRecomendados = async () => {
    const { data } = await axios.get('valoraciones/recomendados')
    return data.recomendados || []
}
