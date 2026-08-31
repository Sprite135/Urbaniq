import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';

const footerLinkClass =
  'text-[13px] text-[#6b7280] transition-colors hover:text-[#9d731e]';

const paymentMethods = ['Visa', 'Mastercard', 'Yape', 'Plin', 'PagoEfectivo'];

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-[#e5e7eb] bg-white text-[#6b7280]">
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
                { label: 'Facebook', initial: 'FB' },
                { label: 'Instagram', initial: 'IG' },
                { label: 'Twitter', initial: 'X' },
                { label: 'YouTube', initial: 'YT' },
              ].map(({ label, initial }) => (
                <a
                  key={label}
                  href="#"
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
              <li><a href="#" className={footerLinkClass}>Envíos y entregas</a></li>
              <li><a href="#" className={footerLinkClass}>Devoluciones</a></li>
              <li><a href="#" className={footerLinkClass}>Preguntas frecuentes</a></li>
              <li><a href="#" className={footerLinkClass}>Términos y condiciones</a></li>
              <li><a href="#" className={footerLinkClass}>Contáctanos</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#9d731e]">
              Suscríbete
            </h3>
            <p className="mt-5 text-[13px] leading-6 text-[#6b7280]">
              Recibe nuestras ofertas y novedades en tu correo.
            </p>
            <form
              className="mt-4 flex items-center gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  className="h-11 w-full border border-[#d1d5db] bg-white pl-9 pr-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] focus:border-[#9d731e] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                aria-label="Suscribirse"
                className="grid h-11 w-11 shrink-0 place-items-center bg-[#d7b46a] text-[#111827] transition-colors hover:bg-[#e2c77f]"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
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
