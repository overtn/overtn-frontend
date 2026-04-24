const FALLBACK_MEDIA = {
  cover: "/assets/logo-placeholder.svg",
  hover: "/assets/logo-placeholder.svg",
  gallery: ["/assets/logo-placeholder.svg", "/assets/logo-placeholder.svg"],
};

const CARE_TEXT = [
  "Стирать при температуре до 30°C, на деликатном режиме или режиме для хлопка. Перед стиркой вывернуть изделие наизнанку.",
  "Использовать мягкое средство для стирки. Не отбеливать и не использовать агрессивные пятновыводители.",
  "Отжим – на низких оборотах. Не сушить в сушильной машине: лучше сушить естественным способом на горизонтальной поверхности или на вешалке, вдали от батареи и прямого солнца.",
  "Гладить с изнаночной стороны при низкой или средней температуре. Не гладить вышивку.",
  "Чтобы изделие дольше сохраняло форму и цвет, не стирать вместе с грубыми тканями и вещами с молниями/липучками.",
].join("\n\n");

const PRODUCT_MEDIA = {
  "over-sweatshirt": {
    cover: "/assets/sweatshirt-1.png",
    hover: "/assets/sweatshirt-2.png",
    gallery: ["/assets/sweatshirt-1.png", "/assets/sweatshirt-2.png"],
    care: CARE_TEXT,
    delivery: "Доставка до пункта выдачи: 2-5 рабочих дней по РФ. Трек-номер придет на e-mail.",
  },
  "over-big-sweatpants": {
    cover: "/assets/pants-1.png",
    hover: "/assets/pants-2.png",
    gallery: ["/assets/pants-1.png", "/assets/pants-2.png"],
    care: CARE_TEXT,
    delivery: "Доставка до пункта выдачи: 2-5 рабочих дней по РФ. Трек-номер придет на e-mail.",
  },
  "over-sweatpants": {
    cover: "/assets/pants-1.png",
    hover: "/assets/pants-2.png",
    gallery: ["/assets/pants-1.png", "/assets/pants-2.png"],
    care: CARE_TEXT,
    delivery: "Доставка до пункта выдачи: 2-5 рабочих дней по РФ. Трек-номер придет на e-mail.",
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
