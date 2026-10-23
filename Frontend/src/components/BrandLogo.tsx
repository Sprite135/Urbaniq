type BrandLogoProps = { compact?: boolean; light?: boolean };

export default function BrandLogo({ compact = false, light = false }: BrandLogoProps) {
  return (
    <span aria-label="Urbaniq" role="img" className="inline-flex items-center gap-1.5 sm:gap-2.5">
      <img src="/urbaniq-mark-v2.png" alt="" width="48" height="48" className={compact ? 'h-7 w-7 object-contain sm:h-9 sm:w-9 lg:h-11 lg:w-11' : 'h-11 w-11 object-contain'} />
      <span className="flex flex-col gap-1">
        <span className={`${compact ? 'text-[15px] sm:text-xl lg:text-[22px]' : 'text-[22px]'} font-bold leading-none tracking-[0.1em] ${light ? 'text-[#f8f5ee]' : 'text-[#17191e] dark:text-[#f8f5ee]'}`} style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>URBANIQ</span>
        {!compact && <span className="text-[9px] font-semibold leading-none tracking-[0.3em] text-[#a77c32]">TECNOLOGÍA</span>}
      </span>
    </span>
  );
}
