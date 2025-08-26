'use client';

export default function Header() {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
      <div>
        {/* Placeholder for search bar or page title */}
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>
      <div className="flex items-center space-x-4">
        {/* Placeholder for user info */}
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          <span className="ml-2 text-sm font-medium">Tên User</span>
        </div>
        <button 
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            onClick={() => {
                // Logic đăng xuất sẽ được thêm ở đây
                alert('Đăng xuất!');
            }}
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
