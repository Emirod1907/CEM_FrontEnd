import React from 'react'
import Login from './components/Forms/Login/Login'
import Register from './components/Forms/Register/Register'
import { Route, Routes } from 'react-router-dom'
import CreateEventoForm from './components/Forms/CreateEventoForm/CreateEventoForm'
import CreateBodegaForm from './components/Forms/CreateBodegaForm/CreateBodegaForm'
import HomeScreen from './components/Screens/HomeScreen/HomeScreen'
import EventosList from './components/Lists/EventosList/EventosList'
import ContactScreen from './components/Forms/ContactForm/ContactScreen'
import ProtectedRoute from './ProtectedRoute'



function App() {
  return (
            <div>
              <Routes>
                  <Route  
                  path='/register' 
                  element={<Register/>}
                  />
                  <Route  
                  path='/login' 
                  element={<Login/>}
                  />
                  <Route  
                  path='/' 
                  element={<HomeScreen/>}
                  />
                  <Route  
                  path='/eventos' 
                  element={<EventosList/>}
                  />
                      <Route  element={<ProtectedRoute/>}>
                        <Route  
                        path='/eventos/new'  
                        element={<CreateEventoForm/>}
                        />
                        <Route  
                        path='/bodegas/new' 
                        element={<CreateBodegaForm/>}
                        />
                        {/* <Route  
                        path='/contacto' 
                        element={<ContactScreen/>}
                        /> */}
                      </Route>
              </Routes>
            </div>
  )
}

export default App