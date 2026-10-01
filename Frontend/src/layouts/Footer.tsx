import { Link } from 'react-router-dom';

const footerLinkClass =
  'text-[13px] text-[#6b7280] transition-colors hover:text-[#9d731e]';

const paymentMethods = ['Visa', 'Mastercard', 'Yape', 'Plin', 'PagoEfectivo'];

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[#e5e7eb] bg-white dark:bg-[#16181d] text-[#6b7280] dark:text-[#9a9388]">
      <div className="container mx-auto py-14">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-block">
              <img
                src="/logo.jpeg"
                alt="Urbaniq"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="mt-5 max-w-xs text-[13px] leading-6 text-[#6b7280]">
              Tecnología de alta calidad para tu hogar y oficina. Envíos a todo
              Lima con la garantía Urbaniq.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { label: 'Facebook', initial: 'FB', href: import.meta.env.VITE_FACEBOOK_URL },
                { label: 'Instagram', initial: 'IG', href: import.meta.env.VITE_INSTAGRAM_URL },
                { label: 'Twitter', initial: 'X', href: import.meta.env.VITE_TWITTER_URL },
                { label: 'YouTube', initial: 'YT', href: import.meta.env.VITE_YOUTUBE_URL },
              ].filter(({ href }) => href?.startsWith('https://')).map(({ label, initial, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#e5e7eb] text-[11px] font-black tracking-wide text-[#6b7280] transition-colors hover:border-[#9d731e] hover:text-[#9d731e]"
                >
                  {initial}
                </a>
              ))}
            </div>
          </div>

          {/* Store */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9d731e]">
              Tienda
            </h3>
            <ul className="mt-5 space-y-3">
              <li><Link to="/catalog" className={footerLinkClass}>Catálogo completo</Link></li>
              <li><Link to="/catalog?isSale=true" className={footerLinkClass}>Ofertas</Link></li>
              <li><Link to="/catalog?newArrivals=true" className={footerLinkClass}>Novedades</Link></li>
              <li><Link to="/catalog?search=laptop" className={footerLinkClass}>Laptops</Link></li>
              <li><Link to="/catalog?search=componente" className={footerLinkClass}>Componentes</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9d731e]">
              Ayuda
            </h3>
            <ul className="mt-5 space-y-3">
              <li><Link to="/help#shipping" className={footerLinkClass}>Envíos y entregas</Link></li>
              <li><Link to="/help#payments" className={footerLinkClass}>Métodos de pago</Link></li>
              <li><Link to="/help#faq" className={footerLinkClass}>Preguntas frecuentes</Link></li>
              <li><Link to="/help#support" className={footerLinkClass}>Ayuda con pedidos</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9d731e]">
              Tu cuenta
            </h3>
            <p className="mt-5 text-[13px] leading-6 text-[#6b7280]">
              Consulta tus pedidos, guarda tus favoritos y mantén tus direcciones actualizadas.
            </p>
            <Link to="/account" className="mt-4 inline-flex min-h-11 items-center bg-[#d7b46a] px-5 text-sm font-bold text-[#111827] hover:bg-[#e2c77f]">Ir a mi cuenta</Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-[#e5e7eb] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-[12px] text-[#9ca3af]">
            © {new Date().getFullYear()} Urbaniq. Todos los derechos reservados.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method}
                className="rounded-sm border border-[#e5e7eb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6b7280]"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
