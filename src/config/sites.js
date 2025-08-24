export const SITES_CONFIG = {
  vinted: {
    name: "Vinted",
    baseUrl: "https://www.vinted.fr",
    searchUrl: "https://www.vinted.fr/catalog",
    searchParams: {
      search_text: "",
      page: 1
    },
    selectors: {
      items: '.feed-grid__item',
      title: '.ItemBox_overlay__1kNfX .ItemBox_details__9gKOB .Text_text__QBn4-',
      price: '.ItemBox_overlay__1kNfX .ItemBox_details__9gKOB .Text_text__QBn4-',
      link: 'a',
      image: 'img'
    },
    delay: { min: 2000, max: 4000 }
  },
  
  ebay: {
    name: "eBay",
    baseUrl: "https://www.ebay.fr",
    searchUrl: "https://www.ebay.fr/sch/i.html",
    searchParams: {
      _nkw: "",
      _sacat: "0",
      _from: "R40"
    },
    selectors: {
      items: '.s-item',
      title: '.s-item__title',
      price: '.s-item__price',
      link: '.s-item__link',
      image: '.s-item__image img'
    },
    delay: { min: 2500, max: 4500 }
  },
  
  // cardmarket: {
  //   name: "CardMarket", 
  //   baseUrl: "https://www.cardmarket.com",
  //   searchUrl: "https://www.cardmarket.com/fr/Pokemon/Products/Search",
  //   searchParams: {
  //     searchString: "",
  //     language: 2
  //   },
  //   selectors: {
  //     items: '.table-body .row',
  //     title: '.col-product a',
  //     price: '.col-price .price',
  //     link: '.col-product a',
  //     image: '.col-product img'
  //   },
  //   delay: { min: 4000, max: 6000 }
  // }
  // TODO: TEMPORAIREMENT DÉSACTIVÉ - CardMarket 403 errors
};