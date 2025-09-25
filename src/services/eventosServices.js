import axios from "./axios"


const getEvents = async()=>{
    try {
    const response = await axios.get('eventos')
    console.log(response.data)
    return response.data.response
    } catch (error) {
        console.error('error al obtener eventos', error)
        return null
    }
}

export default getEvents

export const postEvent = async(evento)=>{
    try {
        const response = await axios.post(`eventos/new`, evento, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
    } catch (error) {
        console.error('error al crear evento',error)
        return null
    }
}

// const eventData = {
//   ...form_values_state,
//   bodega_id: form_values_state[bodega].id  // Envía el ID al backend
// };
// postEvent(eventData);

export const updateEvent = async()=>{}

export const deleteEvent = async()=>{}