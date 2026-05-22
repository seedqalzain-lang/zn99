import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ShoppingCart, MessageCircle, ArrowRight } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { ProductCard } from "@/components/shop/ProductCard";
import { getProductById, getProducts } from "@/lib/catalog.functions";
import { resolveImage } from "@/lib/asset-map";
import { whatsappLink } from "@/lib/whatsapp";

const productQO = (id: string) =>
  queryOptions({ queryKey: ["product", id], queryFn: () => getProductById({ data: { id } }) });
const productsQO = queryOptions({ queryKey: ["products"], queryFn: () => getProducts() });

export const Route = createFileRoute("/product/$id")({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.name ? `${loaderData.name} — MY CAR` : "منتج — MY CAR" },
      { name: "description", content: loaderData?.description ?? "تفاصيل المنتج" },
    ],
  }),
  loader: async ({ context, params }) => {
    context.queryClient.ensureQueryData(productsQO);
    const p = await context.queryClient.ensureQueryData(productQO(params.id));
    if (!p) throw notFound();
    return p;
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQO(id));
  const { data: products } = useSuspenseQuery(productsQO);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!product) return null;
  const images = product.images.length > 0 ? product.images : ["placeholder"];
  const similar = products.filter((p) => p.id !== product.id && p.category_id === product.category_id).slice(0, 4);

  const waMsg = `مرحباً، أريد طلب المنتج: ${product.name} — السعر: ${product.price.toLocaleString()} ر.ي`;

  return (
    <Shell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-gold)] mb-4">
          <ArrowRight className="w-4 h-4" /> العودة للمتجر
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="aspect-square bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-hairline)]">
              <img src={resolveImage(images[activeIdx])} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === activeIdx ? "border-[var(--color-gold)]" : "border-[var(--color-hairline)]"}`}
                  >
                    <img src={resolveImage(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black">{product.name}</h1>
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(product.rating) ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-gray-300"}`}
                />
              ))}
              <span className="text-sm text-[var(--color-ink-soft)] mr-1">({product.rating})</span>
            </div>

            <div className="flex items-baseline gap-3 mt-4">
              <span className="price text-3xl">{product.price.toLocaleString()} ر.ي</span>
              {product.old_price && (
                <span className="text-[var(--color-ink-soft)] line-through">{product.old_price.toLocaleString()}</span>
              )}
            </div>

            <p className="text-[var(--color-ink-soft)] leading-relaxed mt-4">{product.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-gold">
                <ShoppingCart className="w-4 h-4" /> أضف للسلة
              </button>
              <a href={whatsappLink(waMsg)} target="_blank" rel="noopener noreferrer" className="btn-outline">
                <MessageCircle className="w-4 h-4 text-green-600" /> اطلب عبر واتساب
              </a>
            </div>
          </div>
        </div>

        {similar.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-black mb-6">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {similar.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
