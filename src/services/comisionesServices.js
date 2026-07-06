import axios from './axios'

// Configuración de comisiones de contrato (admin)
export const getComisionesRequest = () =>
    axios.get('admin/comisiones', { withCredentials: true })

export const updateComisionRequest = (tipoPerfil, { comision_cliente_porcentaje, comision_proveedor_porcentaje }) =>
    axios.put(`admin/comisiones/${tipoPerfil}`, { comision_cliente_porcentaje, comision_proveedor_porcentaje }, { withCredentials: true })

export const getHistorialComisionRequest = (tipoPerfil) =>
    axios.get(`admin/comisiones/${tipoPerfil}/historial`, { withCredentials: true })
