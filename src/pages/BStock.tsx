import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BStock = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/shop?category=refurbished', { replace: true });
  }, [navigate]);

  return null;
};

export default BStock;

