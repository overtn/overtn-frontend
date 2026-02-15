const FALLBACK_MEDIA = {
  cover: "/assets/logo-placeholder.svg",
  hover: "/assets/logo-placeholder.svg",
  gallery: ["/assets/logo-placeholder.svg", "/assets/logo-placeholder.svg"],
};

const PRODUCT_MEDIA = {
  "over-sweatshirt": {
    cover: "/assets/sweatshirt-1.png",
    hover: "/assets/sweatshirt-2.png",
    gallery: ["/assets/sweatshirt-1.png", "/assets/sweatshirt-2.png"],
    care: "Стирка при 30°C, деликатный режим. Сушить на горизонтальной поверхности.",
    delivery: "Доставка до пункта выдачи: 2-5 рабочих дней по РФ. Трек-номер придет на e-mail.",
  },
  "over-big-sweatpants": {
    cover: "/assets/pants-1.png",
    hover: "/assets/pants-2.png",
    gallery: ["/assets/pants-1.png", "/assets/pants-2.png"],
    care: "Деликатная стирка до 30°C. Гладить с изнаночной стороны. Не использовать отбеливатели.",
    delivery: "Доставка до пункта выдачи: 2-5 рабочих дней по РФ. Трек-номер придет на e-mail.",
  },
  "over-sweatpants": {
    cover: "/assets/pants-1.png",
    hover: "/assets/pants-2.png",
    gallery: ["/assets/pants-1.png", "/assets/pants-2.png"],
    care: "Деликатная стирка до 30°C. Гладить с изнаночной стороны. Не использовать отбеливатели.",
    delivery: "Доставка до пункта выдачи: 2-5 рабочих дней по РФ. Трек-номер придет на e-mail.",
  },
};

const getProductMedia = (slug) => ({
  ...FALLBACK_MEDIA,
  ...(PRODUCT_MEDIA[slug] || {}),
});

const sliderItems = [
  { title: "", subtitle: "", image: "assets/slider-1.png", link: "buyers.html" },
  { title: "", subtitle: "", image: "assets/slider-2.png", link: "support.html" },
];
