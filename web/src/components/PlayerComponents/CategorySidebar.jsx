import React from 'react';

const CategorySidebar = ({
    categories,
    selectedCategory,
    handleCategorySelect,
    categoriesRef
}) => {
    return (
        <div className="category-list-wrapper">
            <div className="category-horizontal-list" ref={categoriesRef}>
                {categories.map(cat => (
                    <div
                        key={cat.category_id}
                        className={`category-horizontal-item ${selectedCategory === cat.category_id ? 'active' : ''}`}
                        onClick={() => handleCategorySelect(cat.category_id)}
                    >
                        {cat.category_name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default React.memo(CategorySidebar);
