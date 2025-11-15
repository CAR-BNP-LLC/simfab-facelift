import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Accessories = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/shop?category=accessories', { replace: true });
  }, [navigate]);

  return null;
};

export default Accessories;

