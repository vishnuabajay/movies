import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getMoviesApi, parseMovieList, fetchMovieDetails } from '../../Service/movies/movies';

export function MovieDetails() {
    const { id } = useParams();
    const location = useLocation();
    const [movie, setMovie] = useState(location.state?.movie || null);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const loadMovieAndDetails = async () => {
            try {
                setLoading(true);
                let currentMovie = movie;

                // Try to find the movie in local storage listing cache first
                const cacheKey = 'movies_list_cache';
                let cachedList = [];
                try {
                    const cachedData = localStorage.getItem(cacheKey);
                    if (cachedData) {
                        cachedList = JSON.parse(cachedData);
                    }
                } catch (e) {
                    console.warn("Error reading cache:", e);
                }

                // If movie not in state, look it up in cache list
                if (!currentMovie && cachedList.length > 0) {
                    const found = cachedList.find(item => item.id === id);
                    if (found) {
                        currentMovie = found;
                        if (isMounted) {
                            setMovie(found);
                        }
                    }
                }

                // If details are already loaded in currentMovie/cache, render instantly and skip fetching
                if (currentMovie && currentMovie.detailsLoaded) {
                    if (isMounted) {
                        setDetails({
                            image: currentMovie.image,
                            screenshoot: currentMovie.screenshoot,
                            qultyAndSize: currentMovie.qultyAndSize
                        });
                        setLoading(false);
                    }
                    return; // Skip server fetch
                }

                // Fallback: If movie is still not found (direct URL access and empty cache), fetch homepage stubs
                if (!currentMovie) {
                    const htmlContent = await getMoviesApi('/');
                    if (!htmlContent) {
                        throw new Error("Unable to reach source server");
                    }
                    const stubs = parseMovieList(htmlContent);
                    const found = stubs.find(item => item.id === id);
                    if (!found) {
                        throw new Error("Movie not found in listing");
                    }
                    currentMovie = found;
                    if (isMounted) {
                        setMovie(found);
                    }
                }

                // Fetch details from server
                const detailData = await fetchMovieDetails(currentMovie.endpoint);
                if (isMounted) {
                    setDetails(detailData);
                    setError(null);
                    
                    // Update cache list with the loaded details
                    try {
                        const updatedList = cachedList.map(item => 
                            item.id === currentMovie.id 
                                ? { ...item, ...detailData, detailsLoaded: true }
                                : item
                        );
                        // If currentMovie was not in cache, append it
                        if (!cachedList.some(item => item.id === currentMovie.id)) {
                            updatedList.push({ ...currentMovie, ...detailData, detailsLoaded: true });
                        }
                        localStorage.setItem(cacheKey, JSON.stringify(updatedList));
                    } catch (e) {
                        console.warn("Failed to update cache on detail load:", e);
                    }
                }
            } catch (err) {
                console.error("Error loading movie details:", err);
                if (isMounted) {
                    setError(err.message || "Failed to load movie details.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadMovieAndDetails();

        return () => {
            isMounted = false;
        };
    }, [id, movie]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 gap-3">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-400 text-sm font-medium animate-pulse">Loading movie details...</span>
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center justify-center">
                <div className="max-w-md w-full bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
                        ⚠️ ERROR
                    </span>
                    <h2 className="text-xl font-bold mb-2">Failed to Load Movie</h2>
                    <p className="text-slate-400 text-sm mb-6">{error || "Movie details are not available."}</p>
                    <Link 
                        to="/" 
                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-semibold rounded-full shadow-lg shadow-blue-500/20 transition-all duration-300"
                    >
                        Back to Movie List
                    </Link>
                </div>
            </div>
        );
    }

    // Combine basic stubs info and rich fetched details
    const posterImage = details?.image || movie.image;
    const screenshotsList = details?.screenshoot || movie.screenshoot || [];
    const downloadOptions = details?.qultyAndSize || movie.qultyAndSize || [];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 relative overflow-hidden">
            {/* Blurred Background Backdrop Accent */}
            {posterImage && (
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-10 blur-3xl pointer-events-none"
                    style={{ backgroundImage: `url(${posterImage})` }}
                />
            )}

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Navigation Header */}
                <header className="mb-10">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 group font-semibold"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Movie List
                    </Link>
                </header>

                {/* Movie Details Info Block */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
                    {/* Poster Column */}
                    <div className="md:col-span-1">
                        {posterImage ? (
                            <div className="w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl relative bg-slate-950/40 aspect-[2/3]">
                                <img 
                                    src={posterImage} 
                                    alt={movie.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-full aspect-[2/3] rounded-2xl bg-slate-800/40 border border-slate-700/30 flex flex-col items-center justify-center text-slate-500">
                                <svg className="w-16 h-16 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                                <span className="text-sm font-semibold">No Poster Available</span>
                            </div>
                        )}
                    </div>

                    {/* Metadata Column */}
                    <div className="md:col-span-2 flex flex-col justify-center">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            {movie.language && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                                    {movie.language}
                                </span>
                            )}
                            {movie.quality && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                                    {movie.quality}
                                </span>
                            )}
                            {movie.year && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-300 border border-slate-600/30">
                                    {movie.year}
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                            {movie.name}
                        </h1>

                        {/* ID Block */}
                        <div className="text-sm text-slate-400 border-l-2 border-slate-700 pl-4 py-1.5 mb-8">
                            <span className="font-semibold block text-slate-500 text-xs uppercase tracking-widest mb-0.5">Movie ID</span>
                            <span className="font-mono font-bold text-slate-300 text-base">{movie.id}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Source Button */}
                            <a 
                                href={(() => {
                                    let base = localStorage.getItem('movies_base_url') || '';
                                    const endpoint = movie.endpoint || '';
                                    if (base && base.endsWith('/') && endpoint.startsWith('/')) {
                                        return base.slice(0, -1) + endpoint;
                                    } else if (base && !base.endsWith('/') && !endpoint.startsWith('/')) {
                                        return base + '/' + endpoint;
                                    }
                                    return base + endpoint;
                                })()} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold rounded-full text-sm shadow-md transition-all duration-300"
                            >
                                Open Source Web Page
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>

                            {/* Watch Trailer Button */}
                            <a 
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.name + ' trailer')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold rounded-full text-sm shadow-md shadow-red-600/20 transition-all duration-300"
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                                Watch Trailer
                            </a>
                        </div>
                    </div>
                </div>

                {/* Screenshots Gallery Section */}
                {screenshotsList.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Screenshots Gallery</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {screenshotsList.map((screenshotUrl, idx) => (
                                <a 
                                    key={idx} 
                                    href={screenshotUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="aspect-video rounded-xl overflow-hidden border border-slate-800/80 hover:border-blue-500/50 shadow-md hover:shadow-lg transition-all duration-300 block bg-slate-950/20"
                                >
                                    <img 
                                        src={screenshotUrl} 
                                        alt={`Screenshot ${idx + 1}`} 
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                    />
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Download Servers Map Section */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Download Options</h2>
                    {downloadOptions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {downloadOptions.map((option, idx) => (
                                <div key={idx} className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex flex-col justify-between backdrop-blur-sm shadow-lg">
                                    <div className="mb-4">
                                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">Quality & Size</span>
                                        <h3 className="text-base md:text-lg font-bold text-slate-200">
                                            {option.qulity}
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/20">
                                        {option.download_sites && option.download_sites.map((siteUrl, siteIdx) => (
                                            <a
                                                key={siteIdx}
                                                href={siteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-400 text-xs font-bold border border-blue-500/20 rounded-xl transition-all duration-200 shadow-sm"
                                            >
                                                Mirror Server {siteIdx + 1}
                                            </a>
                                        ))}
                                        {(!option.download_sites || option.download_sites.length === 0) && (
                                            <span className="text-xs text-slate-500 italic">No mirror servers resolved</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-800/20 rounded-2xl border border-slate-800">
                            <span className="text-slate-500 text-sm">No download option mirrors found for this movie.</span>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
