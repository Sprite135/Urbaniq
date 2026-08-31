import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartCount } from '../features/cart/cartSlice';
import { selectCurrentUser, selectIsAuthenticated, logout } from '../features/auth/authSlice';
import VerifyEmailPromptModal from '../features/auth/VerifyEmailPromptModal';
import Footer from './Footer';

import { useGetMeQuery } from '../features/auth/authApiSlice';
import { catalogApiSlice, useSearchSuggestionsQuery, useGetCategoriesQuery, type Category } from '../features/catalog/catalogApiSlice';
import type { SearchSuggestion } from '../features/catalog/catalogApiSlice';
import { useDebounce } from '../hooks/useDebounce';

const smartNavItems = [
  { label: 'Novedades', href: '/catalog?newArrivals=true' },
  { label: 'Gaming', href: '/catalog?search=gaming' },
  { label: 'Ofertas', href: '/catalog?isSale=true' },
];

const MIN_SEARCH_QUERY_LENGTH = 2;

const buildCloudinarySuggestionImage = (imageUrl: string) => {
  if (!imageUrl.includes('/image/upload/')) {
    return imageUrl;
  }

  return imageUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto:eco,c_fill,g_auto,w_96,h_120/');
};

export default function MainLayout() {
  const cartCount = useSelector(selectCartCount);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  // Automatically track and update user profile on focus/reconnect
  useGetMeQuery(undefined, { skip: !isAuthenticated });

  const user = useSelector(selectCurrentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSuggestions, setLastSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const prefetchProduct = catalogApiSlice.usePrefetch('getProductBySlug');

  // Real category list (with images) for the navbar mega-menu / mobile menu.
  const { data: categoriesData } = useGetCategoriesQuery();
  const allCategories = useMemo(() => {
    const list: Category[] = [];
    (categoriesData || []).forEach((c) => {
      list.push(c);
      (c.subCategories || []).forEach((sc) => list.push(sc));
    });
    return list;
  }, [categoriesData]);
  const activeCatSlug = searchParams.get('categorySlug');
  const [isCatMenuOpen, setIsCatMenuOpen] = useState(false);

  // Fast debounce with a minimum query length keeps search responsive without firing on every key.
  const trimmedSearchQuery = searchQuery.trim();
  const debouncedQuery = useDebounce(trimmedSearchQuery, 180);
  const canSearch = debouncedQuery.length >= MIN_SEARCH_QUERY_LENGTH;

  const { data: suggestions, isFetching, isError } = useSearchSuggestionsQuery(
    { query: debouncedQuery, limit: 6 },
    {
      skip: !canSearch,
      // Cached suggestions stay reusable while the next query is fetched.
      refetchOnMountOrArgChange: false,
    }
  );

  // Keep previous results visible while the next query is in flight to avoid a loading flash.
  useEffect(() => {
    if (suggestions) {
      setLastSuggestions(suggestions);
    }
  }, [suggestions]);

  const displayResults: SearchSuggestion[] = useMemo(
    () => suggestions ?? (canSearch ? lastSuggestions : []),
    [canSearch, lastSuggestions, suggestions]
  );
  const hasQuery = trimmedSearchQuery.length > 0;
  const showDropdown = isSearchOpen && hasQuery;
  const shouldShowNoResults = canSearch && !isFetching && displayResults.length === 0;

  const prefetchProductDetail = useCallback((slug: string) => {
    prefetchProduct(slug, { ifOlderThan: 60 });
  }, [prefetchProduct]);

  // Navigate to a selected product suggestion and close the dropdown
  const handleSelectSuggestion = useCallback((slug: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
    navigate(`/product/${slug}`);
  }, [navigate]);

  // Keyboard navigation: arrow keys to move, Enter to select, Escape to close
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || displayResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < displayResults.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : displayResults.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < displayResults.length) {
          handleSelectSuggestion(displayResults[activeIndex].slug);
        }
        break;
      case 'Escape':
        setIsSearchOpen(false);
        setActiveIndex(-1);
        break;
    }
  }, [showDropdown, displayResults, activeIndex, handleSelectSuggestion]);

  // Reset search state on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsCatMenuOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
  }, [location.pathname, location.search]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    dispatch(logout());
  };

  return (
    <div className="grain-overlay min-h-dvh bg-white dark:bg-[#0e0f12] text-[#111827] dark:text-[#ece7dd]">
      <header className="sticky top-0 z-30 border-b border-[#e5e7eb] dark:border-[#26282e] bg-white/95 dark:bg-[#0e0f12]/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 lg:h-32 items-center justify-between gap-4 px-4 lg:gap-5 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="grid h-10 w-10 place-items-center border border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] transition-colors hover:border-[#9d731e]"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <Link to="/" className="shrink-0 leading-none">
            <img src="/logo.jpeg" alt="Urbaniq" className="h-[70px] lg:h-[120px] w-auto object-contain dark:invert" />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {smartNavItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.href}
                className={({ isActive }) =>
                  `text-[11px] font-black uppercase tracking-[0.22em] transition-colors ${
                    isActive ? 'text-[#9d731e]' : 'text-[#374151] dark:text-[#9ca3af] hover:text-[#9d731e]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div
              className="relative"
              onMouseEnter={() => setIsCatMenuOpen(true)}
              onMouseLeave={() => setIsCatMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsCatMenuOpen((o) => !o)}
                className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#374151] dark:text-[#9ca3af] transition-colors hover:text-[#9d731e]"
                aria-expanded={isCatMenuOpen}
                aria-haspopup="true"
              >
                Categorías
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isCatMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCatMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-3 w-[680px] bg-white dark:bg-[#16181d] border border-[#e5e7eb] dark:border-[#26282e] p-5 shadow-xl">
                  <div className="grid grid-cols-3 gap-2">
                    {allCategories.map((cat) => (
                      <Link
                        key={cat.categoryId}
                        to={`/catalog?categorySlug=${cat.slug}`}
                        onClick={() => setIsCatMenuOpen(false)}
                        className={`flex items-center gap-2 rounded-sm p-2 transition-colors ${
                          activeCatSlug === cat.slug ? 'bg-[#f3f4f6] dark:bg-[#1d2026]' : 'hover:bg-white dark:bg-[#0e0f12]'
                        }`}
                      >
                        {cat.imageUrl ? (
                          <img
                            src={cat.imageUrl}
                            alt={cat.categoryName}
                            className="h-8 w-8 shrink-0 rounded object-cover ring-1 ring-[#e5e7eb] dark:ring-[#26282e]"
                          />
                        ) : null}
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#374151] dark:text-[#9ca3af]">
                          {cat.categoryName}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Search */}
          <div className="hidden flex-1 max-w-sm px-6 lg:block relative z-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] dark:text-[#6f6b63]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                placeholder="Buscar productos..."
                className="w-full bg-white dark:bg-[#0e0f12] border border-[#d1d5db] dark:border-[#33363d] h-10 pl-10 pr-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#111827] dark:text-[#ece7dd] placeholder:text-[#9ca3af] dark:placeholder:text-[#6f6b63] dark:text-[#6f6b63] focus:outline-none focus:border-[#9d731e] transition-colors"
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
              />
            </div>
            
            {/* Desktop Search Dropdown */}
            {showDropdown && (
              <div 
                className="absolute top-full left-6 right-6 mt-1 bg-white dark:bg-[#16181d] border border-[#e5e7eb] dark:border-[#26282e] shadow-xl rounded-sm overflow-hidden z-50"
                onMouseDown={(e) => e.preventDefault()}
                role="listbox"
              >
                {isError ? (
                  <div className="p-4 text-center text-xs font-bold text-[#111827] dark:text-[#ece7dd] uppercase tracking-widest">
                    Error al cargar resultados
                  </div>
                ) : shouldShowNoResults ? (
                  <div className="p-4 text-center text-xs font-bold text-[#111827] dark:text-[#ece7dd] uppercase tracking-widest">
                    Sin resultados para "{searchQuery}"
                  </div>
                ) : displayResults.length > 0 ? (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {displayResults.map((product, index) => (
                      <button
                        key={product.id}
                        id={`suggestion-${index}`}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseDown={() => handleSelectSuggestion(product.slug)}
                        onMouseEnter={() => setActiveIndex(index)}
                        onPointerEnter={() => prefetchProductDetail(product.slug)}
                        onFocus={() => prefetchProductDetail(product.slug)}
                        className={`flex w-full items-center gap-4 p-3 text-left transition-colors border-b border-[#e5e7eb] dark:border-[#26282e] last:border-0 ${
                          index === activeIndex ? 'bg-[#f3f4f6] dark:bg-[#1d2026]' : 'hover:bg-white dark:bg-[#0e0f12]'
                        }`}
                      >
                        <div className="h-12 w-10 shrink-0 bg-[#f3f4f6] dark:bg-[#1a1c21] overflow-hidden">
                           <img src={buildCloudinarySuggestionImage(product.image)} loading="lazy" decoding="async" className="h-full w-full object-cover" alt="" />
                        </div>
<div className="flex flex-col min-w-0">
                           <p className="text-xs font-bold text-[#111827] dark:text-[#ece7dd] line-clamp-1">{product.productName}</p>
                           <div className="mt-1 flex items-center gap-2">
                             {product.discount > 0 ? (
                               <>
                                 <span className="text-[10px] font-bold text-[#9d731e]">S/ {(product.price - product.discount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                 <span className="text-[9px] font-medium text-[#9ca3af] dark:text-[#6f6b63] line-through">S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                               </>
                             ) : (
                               <span className="text-[10px] font-bold text-[#6b7280] dark:text-[#9a9388]">S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                             )}
                           </div>
                         </div>
                         <span className="ml-auto text-[9px] font-semibold text-[#9ca3af] dark:text-[#6f6b63] uppercase tracking-wider shrink-0">{product.categoryName}</span>
                       </button>
                     ))}
                   </div>
                 ) : null}
               </div>
             )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="grid lg:hidden h-10 w-10 place-items-center border border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] transition-colors hover:border-[#9d731e]"
              aria-label="Search catalog"
            >
              {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            <Link
              to="/wishlist"
              className="hidden h-10 w-10 place-items-center border border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] transition-colors hover:border-[#9d731e] sm:grid"
              aria-label="Lista de deseos"
            >
              <Heart className="h-4 w-4" />
            </Link>
            {isAuthenticated ? (
              <Link
                to={user?.role === 'Admin' ? '/admin' : '/account'}
                className="grid h-10 w-10 place-items-center border border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] transition-colors hover:border-[#9d731e]"
                aria-label="Cuenta"
              >
                <User className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="grid h-10 w-10 place-items-center border border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] transition-colors hover:border-[#9d731e]"
                aria-label="Iniciar sesión"
              >
                <User className="h-4 w-4" />
              </Link>
            )}
            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center border border-[#d1d5db] dark:border-[#33363d] bg-white dark:bg-[#16181d] text-[#111827] dark:text-[#ece7dd] transition-colors hover:border-[#9d731e]"
              aria-label="Carrito"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#d7b46a] px-1 text-[10px] font-black text-[#111827]">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Search Dropdown */}
      {isSearchOpen && (
        <div className="absolute top-[80px] left-0 right-0 z-40 bg-white dark:bg-[#0e0f12] border-b border-[#e5e7eb] dark:border-[#26282e] p-4 shadow-md lg:hidden">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] dark:text-[#6f6b63]" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar productos..."
                className="w-full bg-white dark:bg-[#16181d] border border-[#d1d5db] dark:border-[#33363d] h-10 pl-10 pr-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#111827] dark:text-[#ece7dd] placeholder:text-[#9ca3af] dark:placeholder:text-[#6f6b63] dark:text-[#6f6b63] focus:outline-none focus:border-[#9d731e]"
                role="combobox"
                aria-expanded={hasQuery}
                aria-autocomplete="list"
              />
           </div>
           {hasQuery && (
              <div 
                className="mt-2 bg-white dark:bg-[#16181d] border border-[#e5e7eb] dark:border-[#26282e] shadow-sm max-h-[60vh] overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()}
                role="listbox"
              >
                {isError ? (
                  <div className="p-4 text-center text-xs font-bold text-[#111827] dark:text-[#ece7dd] uppercase tracking-widest">Error</div>
                ) : shouldShowNoResults ? (
                  <div className="p-4 text-center text-xs font-bold text-[#111827] dark:text-[#ece7dd] uppercase tracking-widest">
                    Sin resultados para "{searchQuery}"
                  </div>
                ) : displayResults.length > 0 ? (
                  displayResults.map((product, index) => (
                      <button
                        key={product.id}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseDown={() => handleSelectSuggestion(product.slug)}
                        onPointerEnter={() => prefetchProductDetail(product.slug)}
                        onFocus={() => prefetchProductDetail(product.slug)}
                        className={`flex w-full items-center gap-4 p-3 text-left transition-colors border-b border-[#e5e7eb] dark:border-[#26282e] last:border-0 ${
                          index === activeIndex ? 'bg-[#f3f4f6] dark:bg-[#1d2026]' : 'hover:bg-white dark:bg-[#0e0f12]'
                        }`}
                      >
                        <div className="h-12 w-10 shrink-0 bg-[#f3f4f6] dark:bg-[#1a1c21] overflow-hidden">
                           <img src={buildCloudinarySuggestionImage(product.image)} loading="lazy" decoding="async" className="h-full w-full object-cover" alt="" />
                        </div>
<div className="flex flex-col min-w-0">
                           <p className="text-xs font-bold text-[#111827] dark:text-[#ece7dd] line-clamp-1">{product.productName}</p>
                           <div className="mt-1 flex items-center gap-2">
                             {product.discount > 0 ? (
                               <>
                                 <span className="text-[10px] font-bold text-[#9d731e]">S/ {(product.price - product.discount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                 <span className="text-[9px] font-medium text-[#9ca3af] dark:text-[#6f6b63] line-through">S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                               </>
                             ) : (
                               <span className="text-[10px] font-bold text-[#6b7280] dark:text-[#9a9388]">S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                             )}
                           </div>
                         </div>
                         <span className="ml-auto text-[9px] font-semibold text-[#9ca3af] dark:text-[#6f6b63] uppercase tracking-wider shrink-0">{product.categoryName}</span>
                       </button>
                   ))
                 ) : null}
               </div>
            )}
         </div>
       )}

      <main>
        <Outlet />
      </main>

      <Footer />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true" 
          />
          <div className="relative flex w-[200px] flex-col overflow-y-auto bg-white dark:bg-[#111827] text-[#111827] dark:text-[#ece7dd] shadow-2xl transition-transform [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Header with Logo and Close */}
              <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-6">
               <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                 <img src="/logo.jpeg" alt="Urbaniq" className="h-8 w-auto object-contain dark:invert" />
              </Link>
              <button
                type="button"
                className="relative -mr-2 inline-flex items-center justify-center rounded-full p-2 text-[#6b7280] dark:text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Main Navigation Links */}
            <div className="mt-6 flex flex-col space-y-1 px-4">
              {smartNavItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center overflow-hidden rounded-sm px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#d7b46a]/10 text-[#d7b46a]' 
                        : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#111827]'
                    }`
                  }
                >
                  <span className="relative z-10">{item.label}</span>
                  <span className="absolute left-0 top-0 h-full w-1 origin-left scale-y-0 bg-[#d7b46a] transition-transform duration-300 group-hover:scale-y-100" />
                </NavLink>
              ))}
            </div>

            {/* Categories */}
            <div className="mt-4 px-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#6f6b61]">Categorías</p>
              <div className="grid grid-cols-2 gap-1">
                {allCategories.map((cat) => (
                  <Link
                    key={cat.categoryId}
                    to={`/catalog?categorySlug=${cat.slug}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-sm px-2 py-2 transition-colors ${
                      activeCatSlug === cat.slug ? 'bg-[#d7b46a]/10' : 'hover:bg-white/5'
                    }`}
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.categoryName}
                        className="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-white/10"
                      />
                    ) : null}
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af] dark:text-[#6f6b63]">
                      {cat.categoryName}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Bottom Auxiliary Links */}
            <div className="mt-auto px-8 pb-10 pt-10">
              <div className="mb-6 h-px w-8 bg-white/20" />
              <div className="flex flex-col gap-5 text-[10px] font-bold uppercase tracking-widest text-[#6f6b61]">
                {isAuthenticated ? (
                  <Link 
                    to={user?.role === 'Admin' ? '/admin' : '/account'} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="transition-colors hover:text-[#d7b46a]"
                  >
                    Mi cuenta
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-left transition-colors hover:text-[#d7b46a]"
                  >
                    Iniciar sesión / Registrarse
                  </Link>
                )}
                <Link 
                  to="/cart" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="transition-colors hover:text-[#d7b46a]"
                >
                  Carrito {cartCount > 0 && `(${cartCount})`}
                </Link>
                <Link 
                  to="/wishlist" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="transition-colors hover:text-[#d7b46a]"
                >
                  Lista de deseos
                </Link>
                {isAuthenticated && (
                  <button 
                    onClick={handleLogout}
                    className="text-left transition-colors hover:text-[#d7b46a]"
                  >
                    Cerrar sesión
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      <VerifyEmailPromptModal />
    </div>
  );
}
