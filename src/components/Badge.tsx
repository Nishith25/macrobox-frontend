export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gray-200 text-gray-800 text-sm px-2 py-1 rounded-md mr-2">
      {children}
    </span>
  );
}
