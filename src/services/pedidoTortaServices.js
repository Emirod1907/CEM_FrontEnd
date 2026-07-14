import axios from './axios'

// GET /api/pedidos-torta — pedidos del proveedor (baker) autenticado
export const getMisPedidosTorta = async () => {
    try {
        const { data } = await axios.get('pedidos-torta')
        return data.pedidos || []
    } catch (error) {
        console.error('Error al obtener pedidos de torta:', error)
        return []
    }
}

// GET /api/pedidos-torta/:id
export const getPedidoTorta = async (id) => {
    const { data } = await axios.get(`pedidos-torta/${id}`)
    return data.pedido
}

// POST /api/pedidos-torta
export const crearPedidoTorta = async (datos) => {
    const { data } = await axios.post('pedidos-torta', datos)
    return data.pedido
}

// PUT /api/pedidos-torta/:id
export const updatePedidoTorta = async (id, datos) => {
    const { data } = await axios.put(`pedidos-torta/${id}`, datos)
    return data.pedido
}

// POST /api/pedidos-torta/:id/cambio — registrar un cambio de último momento
export const agregarCambioPedido = async (id, cambio) => {
    const { data } = await axios.post(`pedidos-torta/${id}/cambio`, cambio)
    return data.pedido
}

// DELETE /api/pedidos-torta/:id
export const deletePedidoTorta = async (id) => {
    const { data } = await axios.delete(`pedidos-torta/${id}`)
    return data
}

// ── Vista pública (cliente, sin auth) ──
export const getPedidoPublico = async (token) => {
    const { data } = await axios.get(`pedidos-torta/publico/${token}`)
    return data.pedido
}

export const confirmarPedidoPublico = async (token) => {
    const { data } = await axios.post(`pedidos-torta/publico/${token}/confirmar`)
    return data.pedido
}
