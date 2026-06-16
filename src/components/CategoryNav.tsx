"use client";

type Category = { id: string; title: string };

export default function CategoryNav({ categories }: { categories: Category[] }) {
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-[57px] z-20 border-b border-border bg-background/95 backdrop-blur-md sm:top-[65px]">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleClick(cat.id)}
            className="shrink-0 rounded-none border-b-2 border-transparent px-4 py-2 text-sm text-muted transition hover:border-gold-soft hover:text-foreground"
          >
            {cat.title}
          </button>
        ))}
      </div>
    </nav>
  );
}
