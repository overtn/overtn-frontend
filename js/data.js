const FALLBACK_MEDIA = {
  cover: "/assets/logo-placeholder.svg",
  hover: "/assets/logo-placeholder.svg",
  gallery: ["/assets/logo-placeholder.svg", "/assets/logo-placeholder.svg"],
};

const CARE_TEXT = [
  "Стирать при температуре до 30°C на деликатном режиме. Перед стиркой вывернуть изделие наизнанку.",
  "Использовать мягкое средство. Не отбеливать.",
  "Отжим — на низких оборотах. Не сушить в сушильной машине, сушить естественным способом вдали от батареи и солнца.",
  "Гладить с изнаночной стороны при низкой температуре. Не гладить вышивку.",
].join("\n\n");

const DELIVERY_TEXT = [
  "Отправка заказа осуществляется в течение 7 рабочих дней.",
  "Доставка выполняется сервисом CDEK до пункта выдачи заказов (ПВЗ), который вы выбираете при оформлении.",
  "Доставка оплачивается сразу при оформлении заказа.",
].join("\n\n");

const PRODUCT_MEDIA = {
  "over-sweatshirt": {
    cover: "/assets/sweatshirt-1.png",
    hover: "/assets/sweatshirt-2.png",
    gallery: ["/assets/sweatshirt-1.png", "/assets/sweatshirt-2.png"],
    care: CARE_TEXT,
    delivery: DELIVERY_TEXT,
  },
  "over-big-sweatpants": {
    cover: "/assets/pants-1.png",
    hover: "/assets/pants-2.png",
    gallery: ["/assets/pants-1.png", "/assets/pants-2.png"],
    care: CARE_TEXT,
    delivery: DELIVERY_TEXT,
  },
  "over-sweatpants": {
    cover: "/assets/pants-1.png",
    hover: "/assets/pants-2.png",
    gallery: ["/assets/pants-1.png", "/assets/pants-2.png"],
    care: CARE_TEXT,
    delivery: DELIVERY_TEXT,
  },
};

const getProductMedia = (slug) => ({
  ...FALLBACK_MEDIA,
  ...(PRODUCT_MEDIA[slug] || {}),
});

const sliderItems = [
  { title: "", subtitle: "", image: "/assets/slider-1.png", link: "/buyers/" },
  { title: "", subtitle: "", image: "/assets/slider-2.png", link: "/support/" },
];
