import axios from './axios'

// ── Organizador ───────────────────────────────────────────────────────────────

export const crearInvitacion = async ({ evento_id, telefono, num_invitados, nombre_invitado }) => {
    const response = await axios.post('invitaciones/crear', { evento_id, telefono, num_invitados, nombre_invitado })
    return response.data
}

export const generarLinkPorReserva = async (reserva_id) => {
    const response = await axios.post('invitaciones/generar-por-reserva', { reserva_id })
    return response.data
}

export const generarNuevaInvitacion = async (evento_id) => {
    const response = await axios.post('invitaciones/generar-por-evento', { evento_id })
    return response.data
}

export const getMisInvitaciones = async (evento_id) => {
    const response = await axios.get(`invitaciones/mis-invitaciones/${evento_id}`)
    return response.data
}

export const editarInvitacion = async (id, { num_invitados, nombre_invitado } = {}) => {
    const response = await axios.patch(`invitaciones/${id}`, { num_invitados, nombre_invitado })
    return response.data
}

export const eliminarInvitacion = async (id) => {
    const response = await axios.delete(`invitaciones/${id}`)
    return response.data
}

export const validarQR = async (token) => {
    const response = await axios.post('invitaciones/validar', { token })
    return response.data
}

// ── Público (RSVP flow) ───────────────────────────────────────────────────────

export const getInvitacionPublica = async (token) => {
    const response = await axios.get(`invitaciones/publica/${token}`)
    return response.data
}

// Legacy: used by ValidarEntradaScreen
export const getInvitacionPorToken = async (token) => {
    const response = await axios.get(`invitaciones/${token}`)
    return response.data
}

// ── Autenticado (invitado confirma) ──────────────────────────────────────────

export const confirmarInvitados = async (token, invitados) => {
    const response = await axios.post(`invitaciones/publica/${token}/confirmar`, { invitados })
    return response.data
}

export const pagarInvitacion = async (token, tipo_pago = 'total') => {
    const response = await axios.post(`invitaciones/publica/${token}/pagar`, { tipo_pago })
    return response.data
}

// Legacy: simple name+email confirmation (no payment)
export const confirmarAsistencia = async (token, { nombre, email }) => {
    const response = await axios.post(`invitaciones/${token}/confirmar`, { nombre, email })
    return response.data
}
