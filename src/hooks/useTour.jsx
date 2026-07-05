import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export const useTour = () => {
  const startTour = (steps = []) => {
    if (!steps || steps.length === 0) return

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      smoothScroll: true,
      overlayOpacity: 0.72,

      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      closeBtnText: 'Cerrar',
      progressText: '{{current}} de {{total}}',

      popoverClass: 'dream-tour-popover',

      steps,
    })

    driverObj.drive()
  }

  return { startTour }
}