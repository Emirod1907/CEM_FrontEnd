import axios from "./axios"

export const getBodega = async(id)=>{
    try {
    const response = await axios.get('bodegas/${id}',{
        withCredentials:true
    })
    return response.data
    } catch (error) {
        console.error('error al obtener bodegas', error)
        return null
    }
}
export const createBodega = async( bodegaData )=>{
    try {
        const dataToSend = {
            ...bodegaData,
            imagen: bodegaData.imagen || ''}
        console.log('Enviando los datos al backend',dataToSend) 
        const response = await axios.post(`bodegas/new`,dataToSend,{
            withCredentials:true
        })
        console.log('Respuesta del backend', response.data);
        alert("Bodega creada con éxito!")
        // res.status('200').msg('Bodega creada con exito')
        return response.data
    } catch (error) {
        console.error('Error al crear bodega',error)
        throw error;
    }
}

export const getBodegas = async ()=>{
    try {
       const response = await axios.get('bodegas',{
        withCredentials: true
       }) 
       return response.data.response
    } catch (error) {
        console.error('Error al obtener bodegas', error)
        throw error;
    }
}