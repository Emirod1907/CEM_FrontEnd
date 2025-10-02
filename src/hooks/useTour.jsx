import { useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const useTour = () => {
  const [driverObj, setDriverObj] = useState(null);

  const startTour = (steps) => {
    const driverInstance = driver({
      showProgress: true,
      animate: true,
      steps: steps
    });

    setDriverObj(driverInstance);
    driverInstance.drive();
  };

  return { startTour, driverObj };
};