import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { verifyTokenRequest } from '../services/personasServices'

const PersonaContext = createContext()

export const useAuth= () =>{ 
  const context = useContext(PersonaContext)
  if(!context)
    throw new Error("useAuth must be used within a PersonaContext")
  return context
}


const PersonaContextProvider = ({children}) => {

const [persona, setPersona] = useState(null)
const [isAuthenticated, setIsAuthenticated] = useState(false)
const [loading, setLoading] = useState(true)

const hasChecked = useRef(false)
useEffect(()=>{
  if (hasChecked.current) return;
  hasChecked.current = true;
  async function CheckLogin(){
    // La cookie de sesión es httpOnly: JS no puede leerla. Siempre preguntar
    // al backend, que la lee y devuelve la persona si la sesión sigue viva.
    try {
      const res = await verifyTokenRequest()
      if(!res.data)
      {
        setIsAuthenticated(false)
        setLoading(false)
        return;
      }
      setPersona(res.data);
      setIsAuthenticated(true)
      setLoading(false)
    } catch (error) {
      setIsAuthenticated(false)
      setLoading(false)
    }
  } CheckLogin();}, [])

  return (
    <PersonaContext.Provider
        value={{
            loading,
            isAuthenticated,
            setIsAuthenticated,
            persona,
            setPersona
        }}
        >
        {children}
    </PersonaContext.Provider>
  )
}

export default PersonaContextProvider