import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RacingFlightSeats = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/shop?category=racing-flight-seats', { replace: true });
  }, [navigate]);

  return null;
};

export default RacingFlightSeats;

