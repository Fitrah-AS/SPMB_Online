import React from 'react';

export interface BottomNavItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  href?: string;
}

interface MobileBottomNavProps {
  leftItems: BottomNavItem[];
  centerItem: BottomNavItem;
  rightItems: BottomNavItem[];
  breakpoint?: 'md' | 'lg';
  ariaLabel?: string;
}

export function MobileBottomNav({
  leftItems,
  centerItem,
  rightItems,
  breakpoint = 'lg',
  ariaLabel = 'Navigasi bawah mobile'
}: MobileBottomNavProps) {
  const hideClass = breakpoint === 'md' ? 'md:hidden' : 'lg:hidden';
  const totalCols = leftItems.length + 1 + rightItems.length;
  const gridColsClass = totalCols === 3 ? 'grid-cols-3' : 'grid-cols-5';
  const CenterIcon = centerItem.Icon;

  const renderSideItem = (item: BottomNavItem) => {
    const Icon = item.Icon;
    const isActive = Boolean(item.active);
    const baseClass = `min-h-[46px] flex flex-col items-center justify-center gap-1 px-1 rounded-2xl transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
      isActive ? 'text-white' : 'text-slate-300/75 hover:text-white'
    }`;

    const content = (
      <>
        <Icon
          className={`w-[19px] h-[19px] shrink-0 transition-transform duration-150 ${
            isActive ? 'text-[#60A5FA] scale-105' : ''
          }`}
        />
        <span
          className={`text-[10px] leading-none whitespace-nowrap truncate max-w-full ${
            isActive ? 'font-semibold text-white' : 'font-medium'
          }`}
        >
          {item.label}
        </span>
      </>
    );

    if (item.href) {
      return (
        <a
          key={item.id}
          href={item.href}
          onClick={item.onClick}
          aria-current={isActive ? 'page' : undefined}
          className={baseClass}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={item.onClick}
        aria-current={isActive ? 'page' : undefined}
        className={baseClass}
      >
        {content}
      </button>
    );
  };

  return (
    <nav
      className={`${hideClass} fixed bottom-3 inset-x-3 z-40 no-print pointer-events-none pb-[env(safe-area-inset-bottom)]`}
      aria-label={ariaLabel}
    >
      <div className="max-w-md mx-auto relative pointer-events-auto">
        {/* Curved notched dark navy dock matching the reference silhouette */}
        <div
          className="absolute inset-0 flex items-stretch h-[62px] drop-shadow-[0_10px_24px_rgba(15,23,42,0.28)]"
          aria-hidden="true"
        >
          <div className="flex-1 h-[62px] bg-[#132238] rounded-l-[28px] -mr-[1px]" />
          <svg
            viewBox="0 0 96 62"
            className="w-[96px] h-[62px] shrink-0 block"
            preserveAspectRatio="none"
          >
            <path
              fill="#132238"
              d="M 0 0 L 6 0 C 16 0, 18 6, 20 14 C 24 28, 34 36, 48 36 C 62 36, 72 28, 76 14 C 78 6, 80 0, 90 0 L 96 0 L 96 62 L 0 62 Z"
            />
          </svg>
          <div className="flex-1 h-[62px] bg-[#132238] rounded-r-[28px] -ml-[1px]" />
        </div>

        {/* Center raised circular button sitting inside the curved notch */}
        <button
          type="button"
          onClick={centerItem.onClick}
          aria-label={centerItem.label}
          aria-current={centerItem.active ? 'page' : undefined}
          className={`absolute left-1/2 -translate-x-1/2 -top-[22px] z-20 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            centerItem.active
              ? 'bg-[#1D63ED] text-white shadow-[0_6px_18px_rgba(29,99,237,0.5)] ring-2 ring-white/25'
              : 'bg-[#132238] text-[#60A5FA] hover:bg-[#1D63ED] hover:text-white shadow-[0_8px_20px_rgba(15,23,42,0.35)] border border-slate-700/70'
          }`}
        >
          <CenterIcon className="w-[22px] h-[22px]" />
        </button>

        {/* Interactive navigation items */}
        <div className={`relative z-10 h-[62px] grid ${gridColsClass} items-center px-2`}>
          {leftItems.map(renderSideItem)}

          <button
            type="button"
            onClick={centerItem.onClick}
            className="h-full flex flex-col items-center justify-end pb-1.5 cursor-pointer focus-visible:outline-none"
            tabIndex={-1}
            aria-hidden="true"
          >
            <span
              className={`text-[10px] leading-none whitespace-nowrap ${
                centerItem.active ? 'font-semibold text-white' : 'font-medium text-slate-300/85'
              }`}
            >
              {centerItem.label}
            </span>
          </button>

          {rightItems.map(renderSideItem)}
        </div>
      </div>
    </nav>
  );
}
