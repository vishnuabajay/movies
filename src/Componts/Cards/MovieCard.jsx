import React from 'react';
import { Link } from 'react-router-dom';

export function MovieCard({ movie }) {
    // Generate a subtle gradient background based on the language/id to make them look distinct and premium
    const gradients = [
        'from-blue-600/10 to-indigo-600/5 border-blue-500/20',
        'from-purple-600/10 to-pink-600/5 border-purple-500/20',
        'from-emerald-600/10 to-teal-600/5 border-emerald-500/20',
        'from-amber-600/10 to-orange-600/5 border-amber-500/20',
    ];
    
    // Choose gradient pseudo-randomly
    const hash = (movie.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradientClass = gradients[hash % gradients.length];

    return (
        <Link 
            to={`/movie/${movie.id}`} 
            state={{ movie }}
            className={`w-full max-w-[280px] rounded-2xl bg-slate-800/80 border shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-blue-500/40 group flex flex-col justify-between cursor-pointer ${gradientClass}`}
        >
            <div>
                {/* Poster Display (2:3 Ratio) */}
                {movie.detailsLoaded ? (
                    movie.image ? (
                        <div className="w-full aspect-[2/3] rounded-xl overflow-hidden relative bg-slate-950/40 border border-slate-700/30">
                            {/* Overlay Language Badge */}
                            <div className="absolute top-1 left-1 z-10">
                                {movie.language ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white shadow-md uppercase tracking-wider">
                                        {movie.language}
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-700 text-slate-200 shadow-md uppercase tracking-wider">
                                        Unknown
                                    </span>
                                )}
                            </div>

                            {/* Overlay Movie Title (Fade in on Hover) */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <h3 className="text-sm font-bold text-white text-center leading-snug line-clamp-3" title={movie.name}>
                                    {movie.name}
                                </h3>
                            </div>

                            <img 
                                src={movie.image} 
                                alt={movie.name} 
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                        </div>
                    ) : (
                        /* Movie Icon / Visual Accent Fallback */
                        <div className="w-full aspect-[2/3] rounded-xl bg-slate-700/20 border border-slate-700/30 flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors relative">
                            {/* Overlay Language Badge */}
                            <div className="absolute top-2.5 left-2.5 z-10">
                                {movie.language ? (
                                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white shadow-md uppercase tracking-wider">
                                        {movie.language}
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-700 text-slate-200 shadow-md uppercase tracking-wider">
                                        Unknown
                                    </span>
                                )}
                            </div>

                            {/* Overlay Movie Title (Fade in on Hover) */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <h3 className="text-sm font-bold text-white text-center leading-snug" title={movie.name}>
                                    {movie.name}
                                </h3>
                            </div>

                            <svg className="w-12 h-12 mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                            <span className="text-xs font-semibold text-slate-500">No Poster</span>
                        </div>
                    )
                ) : (
                    /* Skeleton Loader for Poster (2:3 Ratio) */
                    <div className="w-full aspect-[2/3] rounded-xl bg-slate-800/40 border border-slate-700/20 flex flex-col items-center justify-center text-slate-500 animate-pulse relative overflow-hidden">
                        {/* Overlay Language Badge (Loading state) */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                            {movie.language ? (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600/30 text-blue-300/40 border border-blue-500/20 uppercase tracking-wider animate-pulse">
                                    {movie.language}
                                </span>
                            ) : (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-700/30 text-slate-500/40 border border-slate-700/20 uppercase tracking-wider animate-pulse">
                                    Unknown
                                </span>
                            )}
                        </div>

                        {/* Overlay Movie Title (Fade in on Hover) */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <h3 className="text-sm font-bold text-white text-center leading-snug line-clamp-3" title={movie.name}>
                                {movie.name}
                            </h3>
                        </div>

                        <svg className="w-10 h-10 mb-2 opacity-40 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold tracking-wider uppercase opacity-45">Loading...</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
