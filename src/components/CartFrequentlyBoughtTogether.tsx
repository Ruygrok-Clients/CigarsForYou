import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '../types';

interface CartFrequentlyBoughtTogetherProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

export const CartFrequentlyBoughtTogether: React.FC<CartFrequentlyBoughtTogetherProps> = ({
  products,
  onAdd
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      setCanLeft(el.scrollLeft > 2);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [products]);

  if (products.length === 0) return null;

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.cart-fbt__card');
    const amount = (card?.offsetWidth || 200) + 12;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section className="cart-fbt" aria-labelledby="cart-fbt-heading">
      <div className="cart-fbt__head">
        <div>
          <h2 id="cart-fbt-heading">Frequently bought together</h2>
          <p>Often added with what is already in your cart.</p>
        </div>
        <div className="cart-fbt__arrows">
          <button
            type="button"
            className="cart-fbt__arrow"
            onClick={() => scrollByCard(-1)}
            disabled={!canLeft}
            aria-label="Previous suggestions"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="cart-fbt__arrow"
            onClick={() => scrollByCard(1)}
            disabled={!canRight}
            aria-label="Next suggestions"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="cart-fbt__scroller" ref={scrollerRef}>
        {products.map((product) => (
          <article key={product.id || product.slug} className="cart-fbt__card">
            <div className="cart-fbt__media">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" />
              ) : null}
            </div>
            <p className="cart-fbt__brand">{product.brand}</p>
            <h3 className="cart-fbt__name">{product.name}</h3>
            <div className="cart-fbt__row">
              <span className="cart-fbt__price">${product.price.toFixed(2)}</span>
              <button type="button" className="cart-fbt__add" onClick={() => onAdd(product)}>
                Add
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
