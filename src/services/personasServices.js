import axios from "./axios"

export const registerRequest = async(persona) => {
try {
    const response = await axios.post(`auth/register`, persona, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error en registerRequest:", error);
    
    if (error.response) {
      
      throw new Error(error.response.data.message || "Error en el registro");
    } else if (error.request) {
      
      throw new Error("No se recibió respuesta del servidor");
    } else {

      throw new Error("Error al configurar la solicitud");
    }
  }
};
export const loginRequest = async(persona) => {
try {
    const response = await axios.post(`auth/login`, persona, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error en loginRequest:", error);
    
    if (error.response) {
      
      throw new Error(error.response.data.message || "Error en el login");
    } else if (error.request) {
      
      throw new Error("No se recibió respuesta del servidor");
    } else {

      throw new Error("Error al configurar la solicitud");
    }
  }
};

export const verifyTokenRequest = ()=> axios.get('auth/verify')
  
