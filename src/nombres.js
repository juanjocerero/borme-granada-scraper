/* eslint-disable */ 
const puppeteer = require('puppeteer');
const writeCsv = require('write-csv');
const colors = require('colors');

const STARTING_URL = 'https://guiaempresas.universia.es/provincia/GRANADA/';

const chunk = (arr, chunkSize) => {
  let result = [];
  for (let i = 0, length = arr.length; i < length; i += chunkSize) {
    result.push(arr.slice(i, i+chunkSize));    
  }
  return result;
}

const getUrl = i => `${STARTING_URL}?qPagina=${i}`;

const assignUrls = numberOfPages => new Promise((resolve, reject) => {
  const urls = [];  
  try {
    for (let i = 1; i <= numberOfPages; i++) { urls.push(getUrl(i)); }
    resolve(urls);
  } catch (error) {
    reject(error);
  }
});

const getNumberOfPages = async () => {
  const b = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true}); 
  const p = await b.newPage();
  
  await p.goto(STARTING_URL);
  await p.waitForSelector('table.ranking_einf');
  const numberOfPages = await p.evaluate(() => +(document.querySelector('#einf > div:nth-child(15) > ul > li:nth-child(8) > a').innerText));
  
  await p.close();
  await b.close();
  
  return numberOfPages;
}

const scrapeChunk = async (chunk, index) => {
  console.log(colors.bgWhite(`Received new chunk (${++index}). Scraping...`));
  const chunkElements = [];
  const browser = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true, slowMo: 20 });
  
  try {
    for (let url of chunk) {
      console.log(colors.green(`Scraping page ${url.split('=')[1]}`));

      try {
        const tab = await browser.newPage();
        await tab.goto(url);
        await tab.waitForSelector('table.ranking_einf');
        // TODO: sacar también enlace a la url y crear un objeto
        const currentPageElements = await tab.evaluate(() => Array.from(document.querySelectorAll('table.ranking_einf td.textleft a')).map(el => el.innerText));
        // TODO: abrir los objetos y scrapear el sector cnae
        chunkElements.push.apply(chunkElements, currentPageElements);
        await tab.close();
      } catch (error) { continue; }
    }

    await browser.close();
    return chunkElements;

  } catch (error) {
    await browser.close();
    throw new Error(error);
  }
}

(async () => {
  const allElements = [];
  
  const numberOfPages = await getNumberOfPages();
  const urls = await assignUrls(numberOfPages);
  const chunks = await chunk(urls, 100);

  for (let i = 0; i < chunks.length; i++) {
    const chunkElements = await scrapeChunk(chunks[i], i);
    allElements.push.apply(allElements, chunkElements);
    console.log(colors.white(`${allElements.length} elements in the array.`));
  }
  
  writeCsv('./output/nombres-empresas-granada.csv', allElements);
  
  // eslint-disable-next-line no-console    
  console.log(colors.bgGreen('Done.'));
})();
