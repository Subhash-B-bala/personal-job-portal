export default function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="text-xl font-semibold text-gray-900">Nandhini's Job Portal</span>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Data Analyst</span>
      </div>
      <div className="text-sm text-gray-500">Chennai · Remote</div>
    </header>
  );
}
