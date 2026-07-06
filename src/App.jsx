import React from 'react'
import Login from './components/Forms/Login/Login'
import Register from './components/Forms/Register/Register'
import { Route, Routes } from 'react-router-dom'
import CreateEventoForm from './components/Forms/CreateEventoForm/CreateEventoForm'
import CreateSalonForm from './components/Forms/CreateSalonForm/CreateSalonForm'
import HomeScreen from './components/Screens/HomeScreen/HomeScreen'
import EventosList from './components/Lists/EventosList/EventosList'
import AdminPanel from './components/Screens/AdminPanel/AdminPanel'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import GoogleAuthCallback from './components/Screens/GoogleAuthCallback/GoogleAuthCallback'
import MapaSalonesScreen from './components/Screens/MapaSalonesScreen/MapaSalonesScreen'
import PagoResultadoScreen from './components/Screens/PagoResultadoScreen/PagoResultadoScreen'
import PagoEsperaScreen from './components/Screens/PagoEsperaScreen/PagoEsperaScreen'
import EventoSalonScreen from './components/Screens/EventoFlujo/EventoSalonScreen'
import EventoServiciosScreen from './components/Screens/EventoFlujo/EventoServiciosScreen'
import EventoProductosScreen from './components/Screens/EventoFlujo/EventoProductosScreen'
import EventoInvitadosScreen from './components/Screens/EventoFlujo/EventoInvitadosScreen'
import PagoPendienteWatcher from './components/PagoPendienteWatcher/PagoPendienteWatcher'
import SalonesScreen from './components/Screens/SalonesScreen/SalonesScreen'
import RsvpScreen from './components/Screens/RsvpScreen/RsvpScreen'
import ValidarEntradaScreen from './components/Screens/ValidarEntradaScreen/ValidarEntradaScreen'
import RoleSelectionScreen from './components/Screens/RoleSelectionScreen/RoleSelectionScreen'
import CompleteProfileScreen from './components/Screens/CompleteProfileScreen/CompleteProfileScreen'
import MisServiciosScreen from './components/Screens/MisServiciosScreen/MisServiciosScreen'
import MisReservasScreen from './components/Screens/MisReservasScreen/MisReservasScreen'
import MiSalonScreen from './components/Screens/MiSalonScreen/MiSalonScreen'
import BorradoresScreen from './components/Screens/BorradoresScreen/BorradoresScreen'
import RoleRoute from './RoleRoute'


function App() {
  return (
            <div>
              <PagoPendienteWatcher />
              <Routes>
                  {/* Registro (oculto de la navbar pero accesible directamente) */}
                  <Route path='/register' element={<Register/>} />

                  {/* Autenticación */}
                  <Route path='/login' element={<Login/>} />
                  <Route path='/auth/google/callback' element={<GoogleAuthCallback/>} />

                  {/* Selección de rol y completado de perfil — requieren estar autenticado */}
                  <Route element={<ProtectedRoute/>}>
                    <Route path='/seleccionar-rol' element={<RoleSelectionScreen/>} />
                    <Route path='/completar-perfil' element={<CompleteProfileScreen/>} />
                  </Route>

                  {/* Público */}
                  <Route path='/' element={<HomeScreen/>} />
                  <Route path='/eventos' element={<EventosList/>} />

                  {/* Organizador */}
                  <Route element={<RoleRoute roles={['organizador']} />}>
                    <Route path='/eventos/new' element={<CreateEventoForm/>} />
                    <Route path='/organizar/salon' element={<EventoSalonScreen />} />
                    <Route path='/organizar/servicios' element={<EventoServiciosScreen />} />
                    <Route path='/organizar/productos' element={<EventoProductosScreen />} />
                    <Route path='/organizar/invitados' element={<EventoInvitadosScreen />} />
                    <Route path='/mis-reservas' element={<MisReservasScreen />} />
                    <Route path='/mis-borradores' element={<BorradoresScreen />} />
                    <Route path='/validar-entrada' element={<ValidarEntradaScreen />} />
                  </Route>

                  {/* Dueño de salón */}
                  <Route element={<RoleRoute roles={['dueno_salon']} />}>
                    <Route path='/salones/new' element={<CreateSalonForm/>} />
                    <Route path='/salones/mapa' element={<MapaSalonesScreen/>} />
                    <Route path='/mi-salon' element={<MiSalonScreen/>} />
                  </Route>

                  {/* Salones — organizador y dueño de salón */}
                  <Route element={<RoleRoute roles={['organizador', 'dueno_salon']} />}>
                    <Route path='/salones' element={<SalonesScreen/>} />
                  </Route>

                  {/* Proveedor de servicios */}
                  <Route element={<RoleRoute roles={['proveedor_servicios']} />}>
                    <Route path='/mis-servicios' element={<MisServiciosScreen />} />
                  </Route>

                  {/* Proveedor de insumos */}
                  <Route element={<RoleRoute roles={['proveedor_insumos']} />}>
                    <Route path='/mi-catalogo' element={<MisServiciosScreen />} />
                  </Route>

                  {/* Admin */}
                  <Route element={<AdminRoute/>}>
                    <Route path='/admin' element={<AdminPanel/>} />
                  </Route>

                  {/* Pagos */}
                  <Route path='/pago/esperando' element={<PagoEsperaScreen />} />
                  <Route path='/pago/exito' element={<PagoResultadoScreen tipo='exito' />} />
                  <Route path='/pago/fallo' element={<PagoResultadoScreen tipo='fallo' />} />
                  <Route path='/pago/pendiente' element={<PagoResultadoScreen tipo='pendiente' />} />

                  {/* Invitaciones */}
                  <Route path='/invitacion/:token' element={<RsvpScreen />} />
              </Routes>
            </div>
  )
}

// Placeholder temporal para rutas de proveedores aún no desarrolladas
const PlaceholderScreen = ({ titulo }) => (
  <div style={{ padding: '80px 24px', textAlign: 'center' }}>
    <h2 style={{ color: '#770981' }}>{titulo}</h2>
    <p style={{ color: '#666' }}>Esta sección está en construcción.</p>
  </div>
)

export default App
