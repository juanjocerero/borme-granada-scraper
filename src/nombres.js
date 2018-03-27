const puppeteer = require('puppeteer');
const writeCsv = require('write-csv');
const colors = require('colors');

Array.prototype.chunk = n => {
  if (!this.length) { return []; }
  return [this.slice(0,n) ].concat(this.slice(n).chunk(n));
};

const getUrl = i => `${STARTING_URL}?qPagina=${i}`;

const STARTING_URL = 'https://guiaempresas.universia.es/provincia/GRANADA/';

(async () => {
  const b = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true, slowMo: 20 }); 
  const p = await b.newPage();
  
  //region get number of pages
  await p.goto(STARTING_URL);
  await p.waitForSelector('table.ranking_einf');
  const numberOfPages = await p.evaluate(() => +(document.querySelector('#einf > div:nth-child(15) > ul > li:nth-child(8) > a').innerText));
  await p.close();
  await b.close();
  //endregion
  
  const urls = [];
  
  for (let i = 0; i < numberOfPages; i++) {
    urls.push(getUrl(++i));
  }
  const chunks = urls.chunk(100);
  
  const allElements = [];
  
  chunks.forEach(async (chunk, index) => {
    // eslint-disable-next-line no-console
    console.log(colors.red(`Starting on chunk ${index}`));
    
    const browser = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true, slowMo: 20 });
    
    for (let url of chunk) {
      const tab = await browser.newPage();
      await tab.goto(url);
      await tab.waitForSelector('table.ranking_einf');
      
      const currentPageElements = await tab.evaluate(() => Array.from(document.querySelectorAll('table.ranking_einf td.textleft a')).map(el => el.innerText));
      
      await tab.close();
      
      allElements.push.apply(allElements, currentPageElements);
      
      // eslint-disable-next-line no-console
      console.log(colors.white(`${allElements.length} elements in the array.`));
    }
    
    await browser.close();
  });
  
  writeCsv('./output/nombres-empresas-granada.csv', allElements);
  
  // eslint-disable-next-line no-console
  console.log(colors.bgGreen('Done.'));
})();
