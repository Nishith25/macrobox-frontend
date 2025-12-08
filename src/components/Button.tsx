export default function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold transition ${className}`}
    >
      {children}
    </button>
  );
}
