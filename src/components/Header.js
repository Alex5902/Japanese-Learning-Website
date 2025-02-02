const Header = () => {
  return (
    <header className="w-full bg-gray-100 shadow-md z-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        {/* Logo */}
        <div className="text-2xl font-bold text-blue-600">
        <a href="/">
            My App
          </a>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6">
          <a href="/" className="text-gray-700 hover:text-blue-500">
            Home
          </a>
          <a href="/about" className="text-gray-700 hover:text-blue-500">
            About
          </a>
          <a href="/" className="text-gray-700 hover:text-blue-500">
            Learn
          </a>
          <a href="/" className="text-gray-700 hover:text-blue-500">
            Review
          </a>
          <a href="/" className="text-gray-700 hover:text-blue-500">
            Practice
          </a>
          <a href="/" className="text-gray-700 hover:text-blue-500">
            Sentence Corrector
          </a>
          <a href="/" className="text-gray-700 hover:text-blue-500">
            Dashboard
          </a>
          <a href="/contact" className="text-gray-700 hover:text-blue-500">
            Pricing
          </a>
        </nav>

        {/* Signup and Login */}
        <div className="flex items-center space-x-4">
          <button className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Sign Up
          </button>
          <button className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Login
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
