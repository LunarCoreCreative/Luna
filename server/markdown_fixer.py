import re

def fix_markdown(text: str) -> str:
    """
    Fixes common markdown formatting issues produced by LLMs.
    
    This function consolidates all markdown fixes in one place to avoid
    conflicts and improve consistency.
    
    Fixes:
    1. Spaces inside bold/italic markers: '** texto **' -> '**texto**'
    2. Missing space before/after formatting when touching words
    3. Orphan markers (unpaired ** or *)
    4. Structural issues (headers, lists without proper spacing)
    5. Punctuation and emoji spacing
    """
    if not text:
        return text
    
    # =========================================================================
    # PHASE 0: CLEAN ORPHAN MARKERS FIRST
    # Remove broken ** patterns that break formatting
    # =========================================================================
    
    # Remove ** followed by end of line or only whitespace (orphan opener)
    text = re.sub(r'\*\*\s*$', '', text, flags=re.MULTILINE)
    
    # Remove ** at start of line with space before text
    text = re.sub(r'^\*\*\s+', '', text, flags=re.MULTILINE)
    
    # Fix word:** (orphan after colon like "Valor:**") -> "Valor:"
    text = re.sub(r':(\*\*)\s*(?=[A-Za-z0-9]|$)', ': ', text)
    text = re.sub(r':\*\*\s*$', ':', text, flags=re.MULTILINE)
    
    # Fix word!** or word?** (orphan after punctuation)
    text = re.sub(r'([!?])\*\*\s*', r'\1 ', text)
    
    # Fix word** followed by space or punctuation (orphan closer with no opener)
    text = re.sub(r'(\w)\*\*(\s|[,.!?;:\)]|$)', r'\1\2', text)
    
    # Fix unbalanced ** pairs line by line
    def fix_unbalanced_bold(line):
        count = line.count('**')
        if count % 2 == 1:
            # Odd number of **, remove the last one
            idx = line.rfind('**')
            if idx >= 0:
                line = line[:idx] + line[idx+2:]
        return line
    
    lines = text.split('\n')
    text = '\n'.join(fix_unbalanced_bold(line) for line in lines)
    
    # Fix emoji ** (orphan after emoji like "✨ **")
    # Use same expanded emoji pattern as Phase 7
    emoji_pattern = r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF\U0001FA00-\U0001FA6F\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U00002700-\U000027BF]'
    text = re.sub(rf'({emoji_pattern})\s*\*\*\s*$', r'\1', text, flags=re.MULTILINE)
    text = re.sub(rf'({emoji_pattern})\s*\*\*\s+', r'\1 ', text)
    
    # Fix punctuation spacing: "word!-" or "word!–" -> "word! -"
    text = re.sub(r'([!?])(-|–)', r'\1 \2', text)
    
    # =========================================================================
    # PHASE 1: FIX BOLD BLOCKS (remove internal spaces)
    # '** texto **' or '** texto**' -> '**texto**'
    # =========================================================================
    
    def fix_bold_block(match):
        content = match.group(1).strip()
        # Don't fix if content is empty or only whitespace
        if not content:
            return match.group(0)
        return f"**{content}**"
    
    text = re.sub(r'\*\*\s*([^*]+?)\s*\*\*', fix_bold_block, text)
    
    # Fix italic blocks: * texto * -> *texto*
    def fix_italic_block(match):
        content = match.group(1).strip()
        if not content:
            return match.group(0)
        return f"*{content}*"
    
    # Careful: don't match ** as italic
    text = re.sub(r'(?<!\*)\*\s+([^*\n]+?)\s+\*(?!\*)', fix_italic_block, text)
    
    # =========================================================================
    # PHASE 2: FIX WORD**BOLD** -> WORD **BOLD**
    # Add space before ** if preceded by letter or number
    # =========================================================================
    
    def add_space_before_bold(match):
        char = match.group(1)
        bold_content = match.group(2)
        return f"{char} **{bold_content}**"
    
    # Pattern: letter or number immediately followed by **text** (complete bold block)
    # Excludes cases where ** is already part of proper formatting
    text = re.sub(
        r'([a-zA-Z0-9áàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])\*\*([^*]+?)\*\*',
        add_space_before_bold,
        text
    )
    
    # =========================================================================
    # PHASE 3: FIX **BOLD**WORD -> **BOLD** WORD
    # Add space after closing ** if followed by letter or number
    # =========================================================================
    
    def add_space_after_bold(match):
        bold_content = match.group(1)
        char = match.group(2)
        return f"**{bold_content}** {char}"
    
    # Pattern: complete bold block immediately followed by letter or number
    text = re.sub(
        r'\*\*([^*]+?)\*\*([a-zA-Z0-9áàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])',
        add_space_after_bold,
        text
    )
    
    # =========================================================================
    # PHASE 4: FIX PUNCTUATION AFTER BOLD
    # **TEXT**- -> **TEXT** -
    # **TEXT**, -> **TEXT**,
    # =========================================================================
    
    # Fix dash/hyphen after bold
    text = re.sub(r'\*\*([^*]+?)\*\*(\s*[-–—])', r'**\1**\2', text)
    
    # Fix other punctuation (keep attached but ensure proper spacing)
    # Keep colon attached to bold (common pattern: "**Título:**")
    # Don't add space before colon after bold
    
    # =========================================================================
    # PHASE 5: STRUCTURAL FIXES (Headers, Lists)
    # =========================================================================
    
    # Force newline before headers (###)
    text = re.sub(r'([^\n])(#{1,6}\s)', r'\1\n\n\2', text)
    
    # Fix concatenation of colon and header (e.g., "que:###")
    text = re.sub(r':(#{1,6}\s)', r':\n\n\1', text)
    
    # Fix list glue (e.g., ":-Item") -> ":\n\n- Item"
    text = re.sub(r':-([^\s-])', r':\n\n- \1', text)
    
    # Fix glued bold blocks (e.g., "**A****B**") -> "**A**\n\n**B**"
    text = re.sub(r'(\*\*[^*]+?\*\*)(\*\*)', r'\1\n\n\2', text)
    
    # Fix list number glue (e.g., "text1.") -> "text\n\n1."
    # More robust: match any word character or punctuation before number
    text = re.sub(r'([a-záàâãéèêíïóôõöúüç])(\d+\.\s)', r'\1\n\n\2', text)
    
    # Fix bold glued to titles: "1. **TITULO**texto" -> "1. **TITULO**\n\ntexto"
    text = re.sub(r'(\d+\.\s*\*\*[^*]+?\*\*)([A-ZÁÉÍÓÚÇ][a-záéíóúç])', r'\1\n\n\2', text)
    
    # Fix lists without proper spacing: "texto- Item" -> "texto\n\n- Item"
    # Improved pattern to handle more cases
    text = re.sub(r'([^\n\-])(\n?\s*-\s+[A-ZÁÉÍÓÚÇ✅🔴🟡💰📊🎯⚠️])', r'\1\n\n\2', text)
    
    # =========================================================================
    # PHASE 6: PUNCTUATION SPACING
    # =========================================================================
    
    # Add space after sentence-ending punctuation before capital letter
    text = re.sub(r'([.!?])([A-ZÁÉÍÓÚÇÊ])', r'\1 \2', text)
    
    # =========================================================================
    # PHASE 7: EMOJI SPACING
    # =========================================================================
    
    # Expanded emoji pattern to include more emoji ranges
    emoji_pattern = r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF\U0001FA00-\U0001FA6F\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U00002700-\U000027BF]'
    
    # Add space before emoji (but not if emoji is at start of line)
    text = re.sub(rf'([a-zA-Z0-9áàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ!?.:,;])({emoji_pattern})', r'\1 \2', text)
    
    # Add space after emoji before letter or number
    text = re.sub(rf'({emoji_pattern})([a-zA-Z0-9áàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])', r'\1 \2', text)
    
    # Add space after emoji before **
    text = re.sub(rf'({emoji_pattern})(\*\*)', r'\1 \2', text)
    
    # =========================================================================
    # PHASE 8: ADDITIONAL FIXES
    # Fix remaining edge cases
    # =========================================================================
    
    # Fix bold markers with only whitespace between them: ** ** -> (remove)
    text = re.sub(r'\*\*\s+\*\*', '', text)
    
    # Fix cases where bold is followed by colon and text without space: **TEXT**:text -> **TEXT**: text
    text = re.sub(r'\*\*([^*]+?)\*\*:([a-zA-Z])', r'**\1**: \2', text)
    
    # Fix lists that start immediately after text (without emoji/character)
    # Pattern: word followed by newline and dash (should have double newline)
    text = re.sub(r'([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])\n(\s*-\s+)', r'\1\n\n\2', text)
    
    # =========================================================================
    # PHASE 9: RESTORE BASIC SPACING (if text is missing spaces)
    # Add spaces between words that are stuck together
    # =========================================================================
    
    # Pattern: lowercase letter followed by uppercase letter -> add space
    # Example: "palavraPalavra" -> "palavra Palavra"
    text = re.sub(r'([a-záàâãéèêíïóôõöúüç])([A-ZÁÉÍÓÚÇ])', r'\1 \2', text)
    
    # Pattern: letter/number followed by punctuation that should have space before
    # Example: "palavra:" -> "palavra:" (keep), but "palavraR$" -> "palavra R$"
    # Only for specific cases where space is clearly missing
    # Note: We're careful not to break things like "R$500" or "20%"
    
    # Pattern: number followed by letter (without space) -> add space
    # Example: "40é" -> "40 é", "R$500é" -> "R$500 é"
    text = re.sub(r'(\d)([a-záàâãéèêíïóôõöúüçÁÉÍÓÚÇ])', r'\1 \2', text)
    
    # Pattern: letter followed by number in contexts where space is needed
    # But be careful: "R$500" should stay, "palavra500" -> "palavra 500"
    # Only add space if it's clearly wrong (word then number)
    text = re.sub(r'([a-záàâãéèêíïóôõöúüç])(\d)', r'\1 \2', text)
    
    # Pattern: punctuation followed by letter (missing space after punctuation)
    # Example: "palavra:texto" -> "palavra: texto", but keep "R$500" and "20%"
    # Only for sentence-ending punctuation and colons
    text = re.sub(r'([:!?.])([a-záàâãéèêíïóôõöúüçÁÉÍÓÚÇ])', r'\1 \2', text)
    
    # =========================================================================
    # PHASE 10: CLEANUP
    # =========================================================================
    
    # Remove multiple consecutive spaces (but preserve intentional line breaks)
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Normalize line breaks (max 2 consecutive newlines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove trailing spaces on lines
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)
    
    return text.strip()


def fix_structural_markdown(text: str) -> str:
    """
    Applies structural fixes to markdown (Headers, Lists, Tables).
    This is now consolidated into fix_markdown, but kept for backward compatibility.
    """
    return fix_markdown(text)