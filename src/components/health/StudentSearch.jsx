import React, { useState, useRef, useEffect } from "react";
import { Search, User, X, Loader2, Users } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export function StudentSearch({ 
    userId, 
    students = [], 
    studentsInfo = {}, 
    onStudentSelect = null,
    placeholder = "Buscar aluno por nome..."
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const searchRef = useRef(null);
    const dropdownRef = useRef(null);

    // Filtrar alunos localmente
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsOpen(false);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filtered = students.filter(studentId => {
            const info = studentsInfo[studentId] || {};
            const name = (info.name || "").toLowerCase();
            const email = (info.email || "").toLowerCase();
            return name.includes(query) || email.includes(query);
        });

        setSearchResults(filtered);
        setIsOpen(filtered.length > 0);
    }, [searchQuery, students, studentsInfo]);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                searchRef.current &&
                !searchRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (studentId) => {
        if (onStudentSelect) {
            onStudentSelect(studentId);
        }
        setSearchQuery("");
        setIsOpen(false);
    };

    const handleClear = () => {
        setSearchQuery("");
        setIsOpen(false);
        if (onStudentSelect) {
            onStudentSelect(null);
        }
    };

    return (
        <div className="relative">
            {/* Search Input */}
            <div 
                ref={searchRef}
                className="relative flex items-center"
            >
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                            if (searchQuery.trim() && searchResults.length > 0) {
                                setIsOpen(true);
                            }
                        }}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-10 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        style={{
                            background: 'var(--bg-tertiary)',
                            borderColor: isOpen ? 'rgba(168, 85, 247, 0.5)' : 'var(--border-color)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClear}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown Results */}
            {isOpen && searchResults.length > 0 && (
                <>
                    <div 
                        className="fixed inset-0 z-[105]" 
                        onClick={() => setIsOpen(false)}
                        style={{ backgroundColor: 'transparent' }}
                    />
                    <div 
                        ref={dropdownRef}
                        className="absolute w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl z-[110] max-h-96 overflow-y-auto mt-2"
                        style={{ 
                            backgroundColor: 'var(--bg-secondary)', 
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)' 
                        }}
                    >
                        <div className="p-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                                Alunos ({searchResults.length})
                            </div>
                            {searchResults.map((studentId) => {
                                const info = studentsInfo[studentId] || {};
                                const studentName = info.name || "Aluno";
                                const studentEmail = info.email;
                                
                                return (
                                    <button
                                        key={studentId}
                                        onClick={() => handleSelect(studentId)}
                                        className="w-full px-3 py-2.5 text-sm rounded-lg text-left transition-colors hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] flex items-center gap-3 group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                                            <User className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-[var(--text-primary)] truncate">
                                                {studentName}
                                            </div>
                                            {studentEmail && (
                                                <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                                                    {studentEmail}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Empty State */}
            {searchQuery.trim() && !isSearching && searchResults.length === 0 && isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-[105]" 
                        onClick={() => setIsOpen(false)}
                        style={{ backgroundColor: 'transparent' }}
                    />
                    <div 
                        className="absolute w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl z-[110] mt-2"
                        style={{ 
                            backgroundColor: 'var(--bg-secondary)', 
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)' 
                        }}
                    >
                        <div className="p-4 text-center">
                            <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                            <p className="text-sm text-[var(--text-muted)]">
                                Nenhum aluno encontrado
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Tente outro nome
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
