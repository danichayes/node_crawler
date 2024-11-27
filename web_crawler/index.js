// const WebCrawler = require('./crawler');
import WebCrawler from './crawler.js'; 

const startCrawl = async () => {
  const baseUrl = 'https://medium.com'; // Change this to the website you want to crawl
  const crawler = new WebCrawler(baseUrl, 5, 3000);  // 5 concurrent requests with 3 second delay
  await crawler.start();
};

startCrawl();
