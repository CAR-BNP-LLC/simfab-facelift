import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FlightSimAddOnModules = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/shop?category=flight-sim-add-on-modules', { replace: true });
  }, [navigate]);

  return null;
};

export default FlightSimAddOnModules;

