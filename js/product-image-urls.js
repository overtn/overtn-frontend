(() => {
  const isProductKey = (key) => key.length <= 1024 && /^products\/[\w.-]+\/[\w.-]+$/.test(key)
    && !key.split('/').some((part) => part === '.' || part === '..');

  window.normalizeProductImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    try {
      const parsed = new URL(url);
      if (parsed.username || parsed.password) return url;
      let path;
      if (parsed.origin === 'https://assets.overtn.ru') path = parsed.pathname.slice(1);
      else if (parsed.origin === 'https://s3.twcstorage.ru' && parsed.pathname.startsWith('/overtn-assets/')) {
        path = parsed.pathname.slice('/overtn-assets/'.length);
      } else if (parsed.origin === 'https://api.overtn.ru' && parsed.pathname.startsWith('/images/')) {
        path = parsed.pathname.slice('/images/'.length);
      } else return url;
      const key = decodeURIComponent(path);
      if (!isProductKey(key)) return url;
      const api = (window.APP_CONFIG?.API_BASE_URL || 'https://api.overtn.ru').replace(/\/+$/, '');
      return `${api}/images/${key.split('/').map(encodeURIComponent).join('/')}`;
    } catch { return url; }
  };

  window.normalizeProductImageData = (product) => ({
    ...product,
    ...(product.image ? { image: window.normalizeProductImageUrl(product.image) } : {}),
    ...(Array.isArray(product.images) ? {
      images: product.images.map((image) => ({ ...image, url: window.normalizeProductImageUrl(image.url) })),
    } : {}),
  });
})();
