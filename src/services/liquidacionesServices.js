import axios from './axios'

// GET /api/admin/liquidaciones?estado=
export const getLiquidaciones = async (estado) => {
    const r = await axios.get('admin/liquidaciones', {
        params: estado ? { estado } : {},
        withCredentials: true,
    })
    return r.data?.liquidaciones || []
}

// POST /api/admin/liquidaciones/:orden_id/liquidar
export const liquidarDesglose = async (orden_id) => {
    const r = await axios.post(`admin/liquidaciones/${orden_id}/liquidar`, {}, { withCredentials: true })
    return r.data
}
