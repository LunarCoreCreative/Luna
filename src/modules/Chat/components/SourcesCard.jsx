import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ChevronDown, ChevronUp, Globe, Search } from 'lucide-react';

/**
 * SourcesCard - Displays search sources in a collapsible card
 * Rendered above AI messages that have sources from web_search
 */
const SourcesCard = memo(({ sources, query }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!sources || sources.length === 0) return null;

    // Show max 3 sources when collapsed, all when expanded
    const visibleSources = isExpanded ? sources : sources.slice(0, 3);
    const hasMore = sources.length > 3;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-xl bg-obsidian-light/80 border border-violet-500/20 overflow-hidden shadow-lg backdrop-blur-sm"
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-b border-white/5">
                <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Search size={12} className="text-violet-400" />
                </div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Fontes da pesquisa
                </span>
                {query && (
                    <span className="text-xs text-slate-500 italic ml-auto truncate max-w-[150px]">
                        "{query}"
                    </span>
                )}
            </div>

            {/* Sources List */}
            <div className="p-2">
                <AnimatePresence mode="sync">
                    {visibleSources.map((source, index) => (
                        <motion.a
                            key={`${source.url}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ delay: index * 0.05 }}
                            className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-all"
                        >
                            {/* Favicon */}
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {source.favicon ? (
                                    <img
                                        src={source.favicon}
                                        alt=""
                                        className="w-5 h-5"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <Globe size={14} className={`text-slate-500 ${source.favicon ? 'hidden' : ''}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors truncate">
                                        {source.title || 'Fonte'}
                                    </span>
                                    <ExternalLink size={12} className="shrink-0 text-slate-500 group-hover:text-violet-400 transition-colors" />
                                </div>
                                {source.content && (
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                        {source.content.slice(0, 120)}...
                                    </p>
                                )}
                                <span className="text-[10px] text-slate-600 mt-1 block truncate">
                                    {source.url ? new URL(source.url).hostname.replace('www.', '') : ''}
                                </span>
                            </div>
                        </motion.a>
                    ))}
                </AnimatePresence>
            </div>

            {/* Expand/Collapse Button */}
            {hasMore && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 hover:text-violet-400 hover:bg-white/5 transition-all border-t border-white/5"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp size={14} />
                            <span>Mostrar menos</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown size={14} />
                            <span>Ver mais {sources.length - 3} fontes</span>
                        </>
                    )}
                </button>
            )}
        </motion.div>
    );
});

SourcesCard.displayName = 'SourcesCard';

export default SourcesCard;
