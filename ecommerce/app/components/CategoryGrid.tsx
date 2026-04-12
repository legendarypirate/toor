import { Category } from '../lib/types';

interface CategoryGridProps {
  categories: Category[];
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-neutral-200/80 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neutral-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{animationDelay: '2s'}}></div>
      
      <div className="mx-auto w-full max-w-layout px-3 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-modern mb-6">
            <span className="w-2 h-2 rounded-full bg-neutral-900 mr-3"></span>
            <span className="text-gray-700 font-medium">Бүтээгдэхүүн Ангилалууд</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Бүтээгдэхүүн 
            <span className="block bg-gradient-to-r from-neutral-800 to-neutral-950 bg-clip-text text-transparent">
              Ангилалууд
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Монголын уламжлалт болон орчин үеийн бүтээгдэхүүнүүдийг манай ангилалуудаас хайж олоорой
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category, index) => {
            // Different gradient colors for each card
            const gradients = [
              'from-purple-500 to-pink-500',
              'from-blue-500 to-cyan-500',
              'from-green-500 to-emerald-500',
              'from-orange-500 to-red-500',
              'from-indigo-500 to-purple-500',
              'from-teal-500 to-blue-500',
              'from-yellow-500 to-orange-500',
              'from-pink-500 to-rose-500'
            ];
            
            const gradient = gradients[index % gradients.length];
            const gradientLight = gradient.replace('500', '100').replace('500', '100');

            return (
              <div
                key={category.id}
                className="group relative bg-white rounded-3xl shadow-modern overflow-hidden hover:shadow-hover transition-all duration-500 border border-gray-100 cursor-pointer transform hover:scale-105"
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradientLight} opacity-50`}></div>
                
                {/* Content */}
                <div className="relative z-10 p-6">
                  {/* Icon/Image Area */}
                  <div className="mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center shadow-lg mb-4 transform group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-white font-bold text-xl">М</span>
                    </div>
                    
                    {/* Category Name */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors duration-300">
                      {category.nameMn}
                    </h3>
                    
                    {/* Product Count */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`px-3 py-1 bg-gradient-to-r ${gradient} text-white text-sm font-medium rounded-full shadow-md`}>
                        {category.productCount} бүтээгдэхүүн
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2">
                    {category.description}
                  </p>

                  {/* Action Button */}
                  <div className="flex items-center justify-between">
                    <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors duration-300 group/btn">
                      <span>Дэлгэрэнгүй</span>
                      <svg 
                        className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform duration-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                    
                    {/* Hover Arrow */}
                    <div className="opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <div className={`w-8 h-8 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                
                {/* Corner Accent */}
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-3xl`}></div>
              </div>
            );
          })}
        </div>

       
      </div>
    </section>
  );
};

export default CategoryGrid;