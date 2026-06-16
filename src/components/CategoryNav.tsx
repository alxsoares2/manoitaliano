"use client";

type Category = {
  id: string;
  title: string;
};

export default function CategoryNav({ categories }: { categories: Category[] }) {
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 96;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-[65px] z-20 border-b border-border bg-background/95 backdrop-blur-md sm:top-[73px]">
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleClick(cat.id)}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm text-muted transition hover:border-gold hover:text-gold-soft"
          >
            {cat.title}
          </button>
        ))}
      </div>
    </nav>
  );
}
