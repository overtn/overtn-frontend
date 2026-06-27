const FALLBACK_MEDIA = {
  cover: "/assets/logo-placeholder.svg",
  hover: "/assets/logo-placeholder.svg",
  gallery: ["/assets/logo-placeholder.svg", "/assets/logo-placeholder.svg"],
};

const CARE_TEXT = [
  "Стирать при температуре до 30°C на деликатном режиме. Перед этим вывернуть изделие наизнанку.",
  "Использовать мягкое моющее средство. Не отбеливать.",
  "Отжим – на низких оборотах. Не использовать сушильную машину. Сушить естественным способом вдали от батареи и прямых солнечных лучей.",
  "Гладить с изнаночной стороны при низкой температуре, избегая вышивки.",
].join("\n\n");

const DELIVERY_TEXT = [
  "Отправка заказа осуществляется в течение 7 рабочих дней.",
  "Доставка выполняется сервисом CDEK до пункта выдачи заказов (ПВЗ), который вы выбираете при оформлении.",
  "Доставка оплачивается сразу при оформлении заказа.",
].join("\n\n");

const SWEATSHIRT_MEDIA = {
  cover: "/assets/Свитшот1.webp",
  hover: "/assets/sweatshirt-2.png",
  gallery: [
    "/assets/Свитшот1.webp",
    "/assets/sweatshirt-2.png",
    "/assets/IMG_5845.jpg",
    "/assets/IMG_5829 2.jpg",
    "/assets/sizes-sweatshirt.webp",
  ],
  care: CARE_TEXT,
  delivery: DELIVERY_TEXT,
};

const SWEATPANTS_MEDIA = {
  cover: "/assets/pants-1.webp",
  hover: "/assets/pants-2.png",
  gallery: ["/assets/pants-1.webp", "/assets/pants-2.png", "/assets/sizes-pants.webp"],
  care: CARE_TEXT,
  delivery: DELIVERY_TEXT,
};

const PRODUCT_MEDIA = {
  "arc-sweatshirt": SWEATSHIRT_MEDIA,
  "arc-sweatpants": SWEATPANTS_MEDIA,
  "over-sweatshirt": SWEATSHIRT_MEDIA,
  "over-big-sweatpants": SWEATPANTS_MEDIA,
  "over-sweatpants": SWEATPANTS_MEDIA,
};

const getProductMedia = (slug) => ({
  ...FALLBACK_MEDIA,
  ...(PRODUCT_MEDIA[slug] || {}),
});

const PRODUCT_IMAGE_PLACEHOLDER = "/assets/logo-placeholder.svg";

const getLegacyProductImage = (slug) => {
  const media = typeof getProductMedia === "function" ? getProductMedia(slug) : null;
  if (media?.cover && !media.cover.includes("logo-placeholder")) return media.cover;
  return null;
};

const getProductCardImages = (product, options = {}) => {
  const images = Array.isArray(product?.images)
    ? product.images.filter((image) => image?.url)
    : [];
  if (!images.length) {
    const legacyImage = options.useLegacyFallback ? getLegacyProductImage(product?.slug || product?.id || "") : null;
    const fallback = product?.image || legacyImage || PRODUCT_IMAGE_PLACEHOLDER;
    return {
      base: fallback,
      hover: fallback,
    };
  }

  const primary = images.find((image) => image.isPrimary) || images[0];
  const hover = images.find((image) => image.id !== primary.id) || primary;
  return {
    base: primary.url,
    hover: hover.url,
  };
};

const getProductPreviewImage = (product, options = {}) => getProductCardImages(product, options).base;

const sliderItems = [
  { title: "", subtitle: "", image: "/assets/slider-1.webp", link: "/buyers/" },
  { title: "", subtitle: "", image: "/assets/slider-2.png", link: "/support/" },
];
