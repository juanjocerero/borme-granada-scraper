const puppeteer = require('puppeteer');
const writeCsv = require('write-csv');
const colors = require('colors');

const STARTING_URL = 'https://guiaempresas.universia.es/provincia/GRANADA/';

(async () => {
  const browser = await puppeteer.launch({ headless: true, ignoreHTTPSErrors: true, slowMo: 50 });
  
  const page = await browser.newPage();
  
  await page.goto(STARTING_URL);
  await page.waitForSelector('table.ranking_einf');
  
  const numberOfPages = await page.evaluate(() => +(document.querySelector('#einf > div:nth-child(15) > ul > li:nth-child(8) > a').innerText));
  
  await page.close();
  
  const allElements = [];
  
  for (let i = 0; i < numberOfPages; i++) {
    const CURRENT_PAGE_URL = `${STARTING_URL}?qPagina=${i+1}`;

    // eslint-disable-next-line no-console
    console.log(colors.green(`Currently scraping elements on page ${i+1}`));
    
    const tab = await browser.newPage();
    
    await tab.goto(CURRENT_PAGE_URL);
    await tab.waitForSelector('table.ranking_einf');
    
    const currentPageElements = await tab.evaluate(() => Array.from(document.querySelectorAll('table.ranking_einf td.textleft a')).map(el => el.innerText));
    
    await tab.close();
    
    allElements.push.apply(allElements, currentPageElements);

    // eslint-disable-next-line no-console
    console.log(colors.white(`${allElements.length} elements in the array.`));
  }
  
  await browser.close();

  writeCsv('./output/nombres-empresas-granada.csv', allElements);
})();
