export default function FullScreenLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        <p className="text-gray-600 font-medium">Loading MacroBox...</p>
      </div>
    </div>
  );
}
