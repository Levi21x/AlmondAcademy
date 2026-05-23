"use client";

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[rgba(76,70,61,0.2)] bg-[#131313]/80 px-4 py-4 backdrop-blur-xl lg:hidden">
      <button type="button" onClick={onMenuClick} className="rounded-lg p-2 text-[#cec5b9] transition-all duration-200 hover:bg-[#201f1f] hover:text-[#fff2de]">
        <span className="material-symbols-outlined text-[22px]">menu</span>
      </button>
      <div className="flex items-center gap-2 text-lg">
        <span className="material-symbols-outlined text-[#fff2de]">neurology</span>
        <span className="font-headline font-bold italic text-[#fff2de]">AlmondAI</span>
      </div>
      <span className="w-10" aria-hidden="true" />
    </header>
  );
}
