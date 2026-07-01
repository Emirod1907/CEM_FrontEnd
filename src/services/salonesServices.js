import axios from "./axios"

// La DB usa id_salon pero todo el frontend usa id_bodega — alias para compatibilidad
const normalizeSalon = (s) => s ? { ...s, id_bodega: s.id_salon ?? s.id_bodega } : s

export const getSalon = async(id)=>{
    try {
    const response = await axios.get('salones/${id}',{
        withCredentials:true
    })
    return response.data
    } catch (error) {
        console.error('error al obtener salones', error)
        return null
    }
}
export const createSalon = async( salonData )=>{
    try {
        const dataToSend = {
            ...salonData,
            imagen: salonData.imagen || ''}
        const response = await axios.post(`salones/new`,dataToSend,{
            withCredentials:true
        })
        return response.data
    } catch (error) {
        console.error('Error al crear salón',error)
        throw error;
    }
}

export const getMiSalon = async () => {
    try {
        const response = await axios.get('salones/mi-salon', { withCredentials: true })
        return normalizeSalon(response.data.salon)
    } catch (error) {
        if (error?.response?.status === 404) return null
        console.error('Error al obtener mi salón', error)
        throw error
    }
}

export const getMiSalonReservas = async () => {
    try {
        const response = await axios.get('salones/mi-salon/reservas', { withCredentials: true })
        return response.data.reservas
    } catch (error) {
        console.error('Error al obtener reservas del salón', error)
        throw error
    }
}

export const actualizarPreciosSalon = async (precios_config) => {
    try {
        const response = await axios.put('salones/mi-salon/precios', { precios_config }, { withCredentials: true })
        return response.data
    } catch (error) {
        console.error('Error al actualizar precios', error)
        throw error
    }
}

export const crearReservaManual = async (datos) => {
    try {
        const response = await axios.post('salones/mi-salon/reservas/manual', datos, { withCredentials: true })
        return response.data
    } catch (error) {
        console.error('Error al crear reserva manual', error)
        throw error
    }
}

export const gestionarReservaDueno = async (id, estado) => {
    try {
        const response = await axios.put(`salones/mi-salon/reservas/${id}/estado`, { estado }, { withCredentials: true })
        return response.data
    } catch (error) {
        console.error('Error al gestionar reserva', error)
        throw error
    }
}

export const getSalones = async ()=>{
    try {
       const response = await axios.get('salones',{
        withCredentials: true
       })
       return (response.data.response || []).map(normalizeSalon)
    } catch (error) {
        console.error('Error al obtener salones', error)
        throw error;
    }
}

export const updateSalon = async (id, data) => {
    try {
        const response = await axios.put(`salones/${id}`, data, { withCredentials: true })
        return response.data
    } catch (error) {
        console.error('Error al actualizar salón', error)
        throw error
    }
}

export const getSalonesDisponibles = async (fecha) => {
    try {
        const response = await axios.get(`salones/disponibles`, {
            params: { fecha },
            withCredentials: true
        })
        return (Array.isArray(response.data) ? response.data : response.data.salones || []).map(normalizeSalon)
    } catch (error) {
        console.error('Error al obtener salones disponibles', error)
        return []
    }
}

export const getDisponibilidadSalon = async (id) => {
    try {
        const response = await axios.get(`salones/${id}/disponibilidad`, {
            withCredentials: true
        })
        return response.data.fechasReservadas
    } catch (error) {
        console.error('Error al obtener disponibilidad del salón', error)
        return []
    }
}
