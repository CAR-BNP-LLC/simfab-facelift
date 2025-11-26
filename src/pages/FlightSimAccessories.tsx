import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FlightSimAccessories = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/shop?category=flight-sim-accessories', { replace: true });
  }, [navigate]);

  return null;
};

export default FlightSimAccessories;

