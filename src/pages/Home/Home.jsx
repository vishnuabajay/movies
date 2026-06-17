import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMoviesApi, parseMovieList, fetchMovieDetails } from '../../Service/movies/movies';
import { MovieCard } from '../../Componts/Cards/MovieCard';

export function Home() {
    const [moviesList, setMoviesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [baseUrlInput, setBaseUrlInput] = useState('');
    const [triggerFetch, setTriggerFetch] = useState(0);

    useEffect(() => {
        let isMounted = true;
        
        // 1. Check if the base URL is configured
        const savedBase = localStorage.getItem('movies_base_url');
        if (!savedBase) {
            if (isMounted) {
                setError("No source domain configured. Please configure a movie source URL to begin.");
                setLoading(false);
                setMoviesList([]);
            }
            return;
        }
        
        // 2. Try to load cached movies list first to display instantly
        const cacheKey = 'movies_list_cache';
        let cachedMovies = [];
        try {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                cachedMovies = JSON.parse(cachedData);
                if (cachedMovies && cachedMovies.length > 0) {
                    setMoviesList(cachedMovies);
                    setLoading(false);
                }
            }
        } catch (e) {
            console.warn("Failed to read movies cache:", e);
        }

        const fetchMovies = async () => {
            try {
                if (isMounted) setLoading(true);
                // Fetch the live movie stubs
                const htmlContent = await getMoviesApi('/');
                if (!htmlContent) {
                    throw new Error("Empty response received from server");
                }
                const parsedStubs = parseMovieList(htmlContent);

                // 3. Merge live stubs with cached movie details
                const cacheMap = new Map(cachedMovies.map(item => [item.id, item]));
                const mergedList = parsedStubs.map(stub => {
                    const cached = cacheMap.get(stub.id);
                    // If we have cached details, retain them
                    if (cached && cached.detailsLoaded) {
                        return cached;
                    }
                    return stub;
                });

                if (isMounted) {
                    setMoviesList(mergedList);
                    setError(null);
                    setLoading(false);
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(mergedList));
                    } catch (e) {
                        console.warn("Failed to write movies cache:", e);
                    }
                }

                // 4. Progressive fetch: Fetch details only for stubs not in cache (or not loaded)
                for (const movie of mergedList) {
                    if (!isMounted) break;
                    if (movie.detailsLoaded) continue; // Skip if already loaded in cache!

                    try {
                        const details = await fetchMovieDetails(movie.endpoint);
                        if (isMounted) {
                            setMoviesList(current => {
                                const updated = current.map(item => 
                                    item.id === movie.id 
                                        ? { ...item, ...details, detailsLoaded: true }
                                        : item
                                );
                                try {
                                    localStorage.setItem(cacheKey, JSON.stringify(updated));
                                } catch (e) {
                                    console.warn("Failed to update cache:", e);
                                }
                                return updated;
                            });
                        }
                    } catch (err) {
                        console.error(`Error progressive fetching detail for ${movie.id}:`, err);
                    }
                }
            } catch (err) {
                console.error("Error fetching movies:", err);
                if (isMounted) {
                    // Only show page error if we have no cached movies to show
                    if (cachedMovies.length === 0) {
                        setError(err.message || "Failed to load movies. Please verify connection/CORS settings.");
                        setLoading(false);
                    } else {
                        console.log("Using cache as offline fallback due to fetch error");
                    }
                }
            }
        };

        fetchMovies();
        return () => {
            isMounted = false;
        };
    }, [triggerFetch]);

    const handleSaveBaseUrl = () => {
        let input = baseUrlInput.trim();
        if (!input) return;
        if (!input.startsWith('http://') && !input.startsWith('https://')) {
            input = 'https://' + input;
        }
        localStorage.setItem('movies_base_url', input);
        localStorage.removeItem('movies_list_cache'); // clear stubs list cache
        setMoviesList([]);
        setError(null); // Reset error state
        setLoading(true);
        setShowUrlModal(false);
        setTriggerFetch(prev => prev + 1);
    };

    // Filter movies based on search query
    const filteredMovies = moviesList.filter(movie => 
        (movie.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (movie.language || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (movie.quality || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 relative">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="mb-12">
                    <div className="text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-4 md:mb-0">
                                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
                                    Latest Movies
                                </h1>
                                <button 
                                    onClick={() => {
                                        const current = localStorage.getItem('movies_base_url');
                                        setBaseUrlInput(current);
                                        setShowUrlModal(true);
                                    }}
                                    className="p-2 bg-slate-800 hover:bg-slate-750 active:scale-95 border border-slate-700 text-slate-400 hover:text-white rounded-full transition-all shadow-md group shrink-0"
                                    title="Change Movie Domain"
                                >
                                    <svg className="w-5 h-5 transition-transform group-hover:rotate-45 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-slate-400 text-lg max-w-xl">
                                Real-time movie listings parsed directly from movie source.
                            </p>
                        </div>
 
                        {/* Search Input */}
                        <div className="w-full md:max-w-xs flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 rounded-full px-4 py-2 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all duration-300">
                            <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search movies..."
                                className="w-full bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-sm"
                            />
                        </div>
                    </div>
                </header>
 
                {/* Error handling */}
                {error && (
                    <div className="mb-10 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 mb-3 border border-amber-500/30 uppercase tracking-wider">
                            ⚠️ {localStorage.getItem('movies_base_url') ? 'API ERROR' : 'CONFIGURATION REQUIRED'}
                        </span>
                        <h3 className="text-lg font-bold text-amber-200 mb-1">
                            {localStorage.getItem('movies_base_url') ? 'Failed to fetch movie data' : 'Source URL Required'}
                        </h3>
                        <p className="text-slate-400 text-sm max-w-lg mx-auto">
                            {error}
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-3">
                            {localStorage.getItem('movies_base_url') && (
                                <button 
                                    onClick={() => setTriggerFetch(prev => prev + 1)} 
                                    className="px-5 py-2 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-200 text-sm font-semibold rounded-full border border-amber-500/30 transition-all duration-300 cursor-pointer"
                                >
                                    Retry Fetching
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    const current = localStorage.getItem('movies_base_url') || 'https://example.com';
                                    setBaseUrlInput(current);
                                    setShowUrlModal(true);
                                }} 
                                className="px-5 py-2 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 text-blue-200 text-sm font-semibold rounded-full border border-blue-500/30 transition-all duration-300 cursor-pointer"
                            >
                                {localStorage.getItem('movies_base_url') ? 'Update URL' : 'Configure URL'}
                            </button>
                        </div>
                    </div>
                )}
 
                {/* Content section */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-400 text-sm font-medium animate-pulse">Fetching latest listings from movie source...</span>
                    </div>
                ) : error ? (
                    null
                ) : filteredMovies.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-slate-800">
                        <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                        <h3 className="text-lg font-bold text-slate-400 mb-1">No movies found</h3>
                        <p className="text-slate-500 text-sm">
                            {searchQuery ? "Try refining your search query." : "No listings are currently available."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-stretch">
                        {filteredMovies.map((movie, idx) => (
                            <MovieCard key={movie.id || idx} movie={movie} />
                        ))}
                    </div>
                )}
            </div>
 
            {/* Base URL Input Modal Overlay */}
            {showUrlModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
                        <h2 className="text-xl font-bold text-white mb-2">Configure Movie Source URL</h2>
                        <p className="text-slate-400 text-xs mb-5">
                            Domain URLs change frequently. Enter the current active domain URL to fetch listings.
                        </p>
                        
                        <div className="mb-6">
                            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Domain Base URL</label>
                            <input 
                                type="url"
                                value={baseUrlInput}
                                onChange={(e) => setBaseUrlInput(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
 
                        <div className="flex items-center justify-end gap-3">
                            {(localStorage.getItem('movies_base_url')) && (
                                <button 
                                    onClick={() => setShowUrlModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button 
                                onClick={handleSaveBaseUrl}
                                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
