const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const PQueue = require('p-queue').default;
const RobotsParser = require('robots-parser');
// const { resolve } = require('path');

// import axios from 'axios';
// import * as cheerio from 'cheerio';
// import { URL } from 'url';
// import PQueue from 'p-queue'; // PQueue as ES module
// import robotsParser from 'robots-parser'; // Import robots-parser as ES module

class WebCrawler {
    constructor(baseUrl, concurrency=5, delay = 1000) {
        this.baseUrl = baseUrl;
        this.queue = new PQueue({ concurrency });
        this.visitedUrls = new Set();
        this.robotsParser = null;
        this.sitemapUrl = null; // Will hold the sitemap URL
        this.delay = delay;
    }

    async initializeRobots() {
        try{
            const robotsUrl = new URL('/robots.txt', this.baseUrl).href;
            const response = await axios.get(robotsUrl);
            this.robotsParser = new RobotsParser(response.data);

            const matches = response.data.match(/Sitemap:\s*(\S+)/);
            if (matches && matches[1]) {
                this.sitemapUrl = matches[1]; // Set the sitemap URL
                console.log(`Sitemap found at: ${this.sitemapUrl}`);
            } else {
                console.log('No Sitemap found in robots.txt');
            }
        } catch (error) {
            console.error('Failed to fetch robots.txt:', error.message);
        }
    }

    canCrawl(url) {
        return this.robotsParser ? this.robotsParser.isAllowed(url, 'DACCrawler') : true; // Protect against null robotsParser
    }

    isArticleorBlog(url, $) {
        // Heuristic 1: Check if URL contains words like 'article', 'blog', 'post'
        const urlPatterns = ['article', 'blog', 'post'];
        if (urlPatterns.some(pattern => url.includes(pattern))) {
            return true;
        }

        // Heuristic 2: Look for common article/blog HTML structures
        if ($('article').length || $('.post').length || $('.blog').length) {
            return true;
        }
    
        // Heuristic 3: Check for presence of certain HTML tags often found in articles
        if ($('h1').length && $('p').length) {
            return true;  // A simple check for heading and paragraphs
        }
    
        return false;  // If none of the conditions are met, it's not likely an article

    }

    async crawlPage(url) {
        if (this.visitedUrls.has(url)) return; // seen URl alr

        if (!this.canCrawl(url)) {
            console.log(`skipping ${url} due to robots.txt rules`);
            return;
        }

        this.visitedUrls.add(url);

        try {
            console.log(`Crawling: ${url}`);
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            if (this.isArticleorBlog(url, $)){
                console.log(`Article/Blog found at ${url}`);
            }

            $('a').each((index, element) => {
                const link = $(element).attr('href');
                if (link){
                    const absoluteUrl = new URL(link, url).href;
                    if (this.visitedUrls.has(absoluteUrl)) {
                        this.addToQueue(absoluteUrl);
                    }
                }
            });
        } catch(error) {
            console.error(`Error crawling ${url}: ${error.message}`);
        }
    }

    addToQueue(url) {
        this.queue.add( async () => {
            await new Promise (resolve => setTimeout(resolve, this.delay));
            await this.crawlPage(url);
        });
    }

    async start() {
        await this.initializeRobots();
        this.addToQueue(this.baseUrl);  // Start crawling from the base URL
    }

}
module.exports = WebCrawler;
// export default WebCrawler;