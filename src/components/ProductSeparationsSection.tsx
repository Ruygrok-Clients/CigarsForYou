import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ProductCategoryCard {
  id: string;
  title: string;
  link: string;
  btnText: string;
  imageSrc: string;
  imageAlt: string;
}

const CATEGORIES: ProductCategoryCard[] = [
  {
    id: 'cigars',
    title: 'Cigars',
    link: '/shop',
    btnText: 'See all',
    imageSrc: '/assets/categories/cuban_cigars.png',
    imageAlt: 'Hand-rolled Cuban Cigars'
  },
  {
    id: 'cigarettes',
    title: 'Cigarettes',
    link: '/cigarettes',
    btnText: 'See all',
    imageSrc: '/assets/categories/cigarettes.png',
    imageAlt: 'Famous Cigarette Brands'
  }
];

export const ProductSeparationsSection: React.FC = () => {
  return (
    <section className="product-sep-section">
      <div className="container">
        {/* Header matching reference image: Big Heavy Condensed Typography */}
        <div className="product-sep-header">
          <h2 className="product-sep-big-title">
            <span>SHOP</span>
            <br />
            <span>OUR PRODUCTS</span>
          </h2>
        </div>

        {/* 3 Visual Category Image Cards Grid */}
        <div className="product-sep-grid">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="product-sep-card">
              <img
                src={cat.imageSrc}
                alt={cat.imageAlt}
                className="product-sep-card-img"
              />
              <div className="product-sep-card-overlay" />

              <div className="product-sep-card-content">
                <h3 className="product-sep-card-title">{cat.title}</h3>
                <Link to={cat.link} className="product-sep-card-btn">
                  <span>{cat.btnText}</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

