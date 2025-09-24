import axios from "./axios"

export const getBodega = async()=>{
    try {
    const response = await axios.get('bodegas/:id',)
    const data = await response.json()
    return data
    } catch (error) {
        console.error('error al obtener bodegas', error)
        return null
    }
}
export const createBodega = async( bodegaData )=>{
    try {
        const response = await axios.post(`bodegas/new`,bodegaData)    
        // res.status('200').msg('Bodega creada con exito')
        console.log(response)
        return response.data
    } catch (error) {
        console.error('Error al crear bodega',error)
    }
}

export const getBodegas = async ()=>{
    try {
       const response = axios.get('bodegas') 
       const data = await response.json()
    } catch (error) {
        console.error('Error al obtener bodegas', error)
    }
}