

import axios from 'axios';


function getDocument(htmlString) {
    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new window.DOMParser();
        return parser.parseFromString(htmlString, 'text/html');
    }
    throw new Error("DOMParser is not available in this environment.");
}

export const getMoviesApi = async (endpoint) => {
    try {
        let base = localStorage.getItem('movies_base_url');
        if (!base) throw new Error("No base URL configured");

        // Clean up trailing slash mapping issues
        if (base.endsWith('/') && endpoint.startsWith('/')) {
            base = base.slice(0, -1);
        } else if (!base.endsWith('/') && !endpoint.startsWith('/')) {
            base = base + '/';
        }

        const targetUrl = base + endpoint;
        const isBrowser = typeof window !== 'undefined';

        if (!isBrowser) {
            const response = await axios.get(targetUrl);
            if (response.status === 200) {
                return response.data;
            }
            throw new Error("Failed to connect to movie source.");
        }

        // Browser environment: try CORS proxies with fallback retries
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
        ];

        let lastError = null;
        for (const proxyUrl of proxies) {
            try {
                const response = await axios.get(proxyUrl);
                if (response.status === 200) {
                    if (response.data && response.data.contents !== undefined) {
                        return response.data.contents;
                    }
                    return response.data;
                }
            } catch (err) {
                console.warn(`Proxy fetch failed for ${proxyUrl}:`, err);
                lastError = err;
            }
        }

        throw new Error(lastError?.message || "Movie Source Base Uri error");
    } catch (error) {
        throw new Error(error.message || "Movie Source Base Uri error");
    }
}
export function extractId(url) {
    const match = url.match(/page-(\d+)-/);
    return match ? match[1] : 'empty';
}

export function parseMovieList(htmlString) {
    try {
        const document = getDocument(htmlString);
        const movieElements = document.querySelectorAll('p.home');
        const movies = [];

        movieElements.forEach((el) => {
            const linkElement = el.querySelector('a');
            if (!linkElement) return;
            const href = linkElement.getAttribute('href');

            let text = el.textContent || "";
            text = text.replace(/»/g, "").replace(/Click here/g, "").trim();

            const match = text.match(/^(.*?)\s*\((\d{4})\)\s*([a-zA-Z]+)\s*(.*)$/);
            let title = text;
            let year = "";
            let language = "";
            let quality = "";

            if (match) {
                title = match[1].trim();
                year = match[2];
                language = match[3];
                quality = match[4].trim();
            } else {
                const yearMatch = text.match(/\((\d{4})\)/);
                if (yearMatch) {
                    year = yearMatch[1];
                    title = text.split(`(${year})`)[0].trim();
                    const remainder = text.split(`(${year})`)[1]?.trim() || "";
                    const parts = remainder.split(/\s+/);
                    language = parts[0] || "";
                    quality = parts.slice(1).join(" ") || "";
                }
            }

            movies.push({
                name: title,
                language,
                year,
                quality,
                endpoint: href,
                id: extractId(href),
                image: '',
                screenshoot: [],
                qultyAndSize: [],
                detailsLoaded: false
            });
        });

        return movies;
    } catch (e) {
        console.error("Error parsing movie list:", e);
        return [];
    }
}

export async function fetchMovieDetails(endpoint) {
    try {
        const detailHtml = await getMoviesApi(endpoint);
        const details = await findClassesInHTML(detailHtml, endpoint);
        return {
            image: details.poster_path || '',
            screenshoot: details.screenShorts || [],
            qultyAndSize: details.sites || []
        };
    } catch (err) {
        console.error(`Error in fetchMovieDetails for ${endpoint}:`, err);
        return {
            image: '',
            screenshoot: [],
            qultyAndSize: []
        };
    }
}
export const getFromApiLink = async (endpoint, className) => {
    try {
        const response = await getMoviesApi(endpoint);
        if (response) {
            return findLinkInHtml(response, className);
        }
    } catch (error) {
        throw new Error(error.message || "Failed to resolve link from API");
    }

};
function findLinkInHtml(htmlString, className) {
    const document = getDocument(htmlString);
    const formattedArray = new Set();
    const downloadLink = document.getElementsByClassName(className);
    const el = downloadLink[1].querySelector("a");
    for (let index = 1; index < downloadLink.length; index++) {
        const element = downloadLink[index];
        const link = element.querySelector("a").getAttribute('href');
        if (link == null || !link.includes("/")) continue;
        formattedArray.add(link);
    }
    return [...formattedArray];
}

export function endpointExtract(url) {
    const match = url.match(/\/page-(\d+)-/);
    if (match) {
        const id = match[1];
        console.log("Extracted ID:", id);
        return id;
    }
}
const moviefromSourceUri = async (endpoint) => {
    try {
        const res = await getMoviesApi(endpoint);
        const sourceDetails = await findClassesInHTML(res, endpoint);
        if (!sourceDetails) {
            throw new Error("Movie not in list");
        }
        var tmdbDetails = await getMovieDetailsByName(sourceDetails.title, sourceDetails.language, sourceDetails.year);
        if (tmdbDetails.error === true) {

            tmdbDetails = {
                tmdb_id: 0,
                overview: `movie ${sourceDetails.title}`,
                release_date: `${sourceDetails.year}-01-01`,
                backdrop_path: sourceDetails.screenShorts[0],
                rating: 0,
                genres: [],
                runtime: 0,
            };
        }
        return {
            ...sourceDetails,
            ...tmdbDetails,
            downloadLink: []
        }
    } catch (error) {
        throw new Error(error.message || "Failed to fetch movie from source URI");
    }
};



async function findClassesInHTML(htmlString, endpoint) {
    try {
        const document = getDocument(htmlString);
        const formattedObject = [];
        var poster_path = '';
        const images = [];
        const id = extractId(endpoint);
        const elementsWithClasses = document.querySelectorAll('title'); // Select all elements with a class attribute
        const details = titleToDetails(elementsWithClasses[0].textContent);
        const imagesElements = document.querySelectorAll('img');
        const qulity = document.getElementsByClassName('touch');

        let base = '';
        if (typeof window !== 'undefined') {
            base = localStorage.getItem('movies_base_url') || '';
        }
        if (base && base.endsWith('/')) {
            base = base.slice(0, -1);
        }

        for (let index = 0; index < imagesElements.length; index++) {
            const rawSrc = imagesElements[index].getAttribute('src') || '';
            const image = rawSrc.startsWith('http') ? rawSrc : `${base}${rawSrc}`;
            if (index === 0) {
                poster_path = image;
            } else {
                images.push(image);
            }
        }
        for (let index = 0; index < qulity.length; index++) {
            const element = qulity[index];
            const text = element.querySelector("b");
            const key = extractSizeAndResolution(text.textContent);
            const value = element.getAttribute('href');
            const links = await getFromApiLink(value, 'home');
            formattedObject.push({ qulity: key, download_sites: links });
        }

        return {
            ...details, id, poster_path: poster_path, screenShorts: images, sites: formattedObject,
        }

    } catch (error) {
        console.error("Error parsing HTML:", error);
        return [];
    }
}


function extractSizeAndResolution(text) {
    // Regular expressions
    const sizeRegex = /\b(\d+(?:\.\d+)?\s?(GB|MB|TB))\b/i;  // Matches file size
    const resolutionRegex = /\b(4K|1080p|720p|480p|360p)\b/i;    // Matches resolution

    // Extract values
    const sizeMatch = text.match(sizeRegex);
    const resolutionMatch = text.match(resolutionRegex);

    let resolution = resolutionMatch ? resolutionMatch[0] : null;
    let size = sizeMatch ? sizeMatch[0] : null;

    // Assign resolution based on size if resolution is missing
    if (!resolution && size) {
        const sizeValue = parseFloat(size); // Extract numeric value

        if (size.includes("GB")) {
            if (sizeValue >= 5) resolution = "1080p";
            else if (sizeValue >= 2) resolution = "720p";
            else resolution = "480p";
        } else if (size.includes("MB")) {
            if (sizeValue >= 700) resolution = "480p";
            else resolution = "360p";
        }
    }

    // Return formatted result
    return size && resolution ? `${size} (${resolution})` : "Size or resolution not found.";
}
function titleToDetails(movieString) {
    // Language abbreviation mapping
    const languageMap = {
        "Malayalam": "ml",
        "English": "en",
        "Hindi": "hi",
        "Tamil": "ta",
        "Telugu": "te",
        // Add more languages here if needed
    };
    // Regular expression to capture movie name, year, and language
    const regex = /^(.*?)(\(\d{4}\))\s([a-zA-Z]+)\s.*$/;
    // Apply the regex to the string
    const match = movieString.match(regex);

    if (match) {
        const title = match[1].trim(); // Extract movie name
        const year = match[2].replace(/[()]/g, ''); // Extract year and remove parentheses
        var language = match[3]; // Extract language
        // Map the language to its abbreviation
        language = languageMap[language] || language; // Default to full name if not mapped

        return {
            title, year, language
        }
    } else {
        return {
            title: 'empty', year: 'empty', language: "empty"
        }
    }

}

function voteAverageToRating(voteAverage, maxRating = 5) {
    if (voteAverage === undefined || voteAverage === null) {
        return "Not Rated"; // Or handle the case where vote_average is missing
    }

    const rating = (voteAverage / 10) * maxRating;
    return parseFloat(rating.toFixed(1)); // Return to one decimal place
}


function minutesToHours(minutes) {
    const hours = Math.floor(minutes / 60); // Get the whole number of hours
    const remainingMinutes = minutes % 60; // Get the remaining minutes

    return `${hours}h:${remainingMinutes}m`;
}

async function getVideoResults(id, type = "movie") {
    try {
        const endpoint = `/${type}/${id}/videos`;
        const response = await getTMDBApi(endpoint);
        const data = response.data;
        if (!data.results || data.results.length === 0) {
            return { message: "No videos found" };
        }
        const videosList = [];
        // Filter for YouTube trailers
        const videos = data.results.filter(video => video.site === "YouTube");
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            videosList.push({
                name: video.name,
                type: video.type,
                site: video.site,
                key: video.key
            });
            if (i === 1) {
                break;
            }
        }
        return videosList
    } catch (error) {
        return { error: error.message };
    }
}

export default moviefromSourceUri;
