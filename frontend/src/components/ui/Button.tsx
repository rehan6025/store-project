export const Button = ({ label }: { label: string }) => {
  return (
    <div className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-400 hover:text-gray-900 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none">
      {label}
    </div>
  );
};
