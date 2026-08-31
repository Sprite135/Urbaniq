import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SeoHead: React.FC = () => {
  const location = useLocation();

  const getSeoInfo = () => {
    const path = location.pathname;
    
    if (path === '/' || path === '') {
      return {
        title: 'Urbaniq | E-commerce Premium de Tecnología en Perú',
        description: 'Urbaniq - Tu tienda de tecnología de confianza en Perú. Computadoras, componentes, periféricos y más con envíos a todo el país.',
        keywords: 'e-commerce Perú, tecnología, computadoras, componentes, envíos, venta online'
      };
    }
    
    if (path.startsWith('/catalog')) {
      return {
        title: 'Catálogo de Productos | Urbaniq',
        description: 'Explora nuestro catálogo completo de productos tecnológicos. Computadoras, componentes, periféricos y más.',
        keywords: 'catálogo, productos, tecnología, comprar'
      };
    }
    
    if (path.startsWith('/product/')) {
      return {
        title: 'Detalles del Producto | Urbaniq',
        description: 'Detalles completos del producto. Especificaciones, imágenes y opciones de compra.',
        keywords: 'producto, especificaciones, comprar tecnología'
      };
    }
    
    if (path.startsWith('/cart')) {
      return {
        title: 'Carrito de Compras | Urbaniq',
        description: 'Revisa los productos en tu carrito y procede al checkout. Pagos seguros y envíos rápidos.',
        keywords: 'carrito, compras, checkout, pagos'
      };
    }
    
    if (path.startsWith('/account')) {
      return {
        title: 'Mi Cuenta | Urbaniq',
        description: 'Gestiona tu cuenta Urbaniq. Historial de pedidos, wishlist, direcciones y más.',
        keywords: 'cuenta, perfil, pedidos, historial'
      };
    }
    
    return {
      title: 'Urbaniq | E-commerce Premium de Tecnología',
      description: 'Urbaniq - Tu tienda de tecnología de confianza en Perú.',
      keywords: 'e-commerce Perú, tecnología, Urbaniq'
    };
  };

  const seo = getSeoInfo();

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={`https://urbaniq.com${location.pathname}`} />
    </Helmet>
  );
};

export default SeoHead;