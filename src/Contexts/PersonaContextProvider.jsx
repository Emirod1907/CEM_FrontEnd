import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import Cookies from 'js-cookie'
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
const [ loading, setLoading]= useState(true)

const hasChecked = useRef(false)
useEffect(()=>{
  if (hasChecked.current) return;
  hasChecked.current = true;
  async function CheckLogin(){
      const cookies = Cookies.get()
  if(!cookies.token){
    setIsAuthenticated(false)
    setLoading(false)
    return}
    try {
      const res = await verifyTokenRequest()
      console.log(res);
      if(!res.data) 
      {
        setIsAuthenticated(false)
        setLoading(false)
        return;
      }
      setUser(res.data)
      setIsAuthenticated(true)
      setLoading(false)
    } catch (error) {
      console.log(error)
      setIsAuthenticated(false)
      setLoading(false)
    }
  } CheckLogin();}, [])

  return (
    <PersonaContext.Provider
        value={
            {
                // id_persona,
                // persona_rol,
                // token,
                loading,
                isAuthenticated,
                setIsAuthenticated,
                persona,
                setPersona
            }
        }
        >
        {children}
    </PersonaContext.Provider>
  )
}

export default PersonaContextProvider