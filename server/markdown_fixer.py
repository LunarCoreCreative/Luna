import re

def fix_markdown(text: str) -> str:
    """
    Fixes common markdown formatting issues produced by LLMs.
    
    Fixes:
    1. Spaces inside bold markers: '** text **' -> '**text**'
    2. Missing space before/after bold when touching words
    3. Punctuation and emoji spacing
    4. Orphan ** markers (unpaired)
    """
    if not text:
        return text
    
    # =========================================================================
    # PHASE 0: FIX CLEARLY BROKEN ** PATTERNS
    # Aggressively remove orphan ** that break formatting
    # =========================================================================
    
    # Pattern: ** followed by end of line or only whitespace (orphan opener)
    text = re.sub(r'\*\*\s*$', '', text, flags=re.MULTILINE)
    
    # Pattern: ** at start with space before text (like "** text" -> "text")
    text = re.sub(r'^\*\*\s+', '', text, flags=re.MULTILINE)
    
    # Pattern: word:** (orphan after colon like "Valor:**") -> "Valor:"
    text = re.sub(r':(\*\*)\s*(?=[A-Za-z0-9]|$)', ': ', text)
    text = re.sub(r':\*\*\s*$', ':', text, flags=re.MULTILINE)
    
    # Pattern: word!** or word?** (orphan after punctuation)
    text = re.sub(r'([!?])\*\*\s*', r'\1 ', text)
    
    # Pattern: word** followed by space or punctuation (orphan closer with no opener)
    # e.g., "foidesodorante** " -> "foidesodorante "
    text = re.sub(r'(\w)\*\*(\s|[,.!?;:\)]|$)', r'\1\2', text)
    
    # Pattern: **word without closing ** (orphan opener)
    # Count ** pairs and fix unbalanced ones
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
    
    # Pattern: emoji ** (orphan after emoji like "✨ **")
    emoji_pattern = r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF\U0001FA00-\U0001FA6F]'
    text = re.sub(rf'({emoji_pattern})\s*\*\*\s*$', r'\1', text, flags=re.MULTILINE)
    text = re.sub(rf'({emoji_pattern})\s*\*\*\s+', r'\1 ', text)
    
    # Fix punctuation spacing: "word!-" or "word!–" -> "word! -"
    text = re.sub(r'([!?])(-|–)', r'\1 \2', text)
    
    
    # =========================================================================
    # PHASE 1: FIX COMPLETE BOLD BLOCKS (remove internal spaces)
    # '** texto **' or '** texto**' -> '**texto**'
    # =========================================================================
    
    def fix_bold_block(match):
        content = match.group(1).strip()
        return f"**{content}**"
    
    text = re.sub(r'\*\*\s*([^*]+?)\s*\*\*', fix_bold_block, text)
    
    # =========================================================================
    # PHASE 2: FIX WORD**BOLD** -> WORD **BOLD**
    # Add space before ** if preceded by letter and ** is start of bold
    # =========================================================================
    
    def add_space_before_bold(match):
        letter = match.group(1)
        bold_content = match.group(2)
        return f"{letter} **{bold_content}**"
    
    # Pattern: letter immediately followed by **text** (complete bold block)
    text = re.sub(
        r'([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])\*\*([^*]+?)\*\*',
        add_space_before_bold,
        text
    )
    
    # =========================================================================
    # PHASE 3: FIX **BOLD**WORD -> **BOLD** WORD
    # Add space after closing ** if followed by letter
    # =========================================================================
    
    def add_space_after_bold(match):
        bold_content = match.group(1)
        letter = match.group(2)
        return f"**{bold_content}** {letter}"
    
    # Pattern: complete bold block immediately followed by letter
    text = re.sub(
        r'\*\*([^*]+?)\*\*([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])',
        add_space_after_bold,
        text
    )
    
    # =========================================================================
    # PHASE 4: FIX **TEXT**- -> **TEXT** -
    # Add space before punctuation after bold
    # =========================================================================
    
    text = re.sub(r'\*\*([^*]+?)\*\*-', r'**\1** -', text)
    text = re.sub(r'\*\*([^*]+?)\*\*:', r'**\1**:', text)  # Keep colon attached
    
    # =========================================================================
    # PHASE 5: FIX PUNCTUATION SPACING
    # =========================================================================
    
    text = re.sub(r'([.!?])([A-ZÁÉÍÓÚÇÊ])', r'\1 \2', text)
    
    # =========================================================================
    # PHASE 6: FIX EMOJI SPACING
    # =========================================================================
    
    emoji_pattern = r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF\U0001FA00-\U0001FA6F]'
    
    # Add space before emoji
    text = re.sub(rf'([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ!?.:,;])({emoji_pattern})', r'\1 \2', text)
    
    # Add space after emoji
    text = re.sub(rf'({emoji_pattern})([a-zA-ZáàâãéèêíïóôõöúüçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ])', r'\1 \2', text)
    text = re.sub(rf'({emoji_pattern})(\*\*)', r'\1 \2', text)
    
    # =========================================================================
    # PHASE 7: CLEANUP
    # =========================================================================
    
    text = re.sub(r'  +', ' ', text)
    
    # =========================================================================
    # PHASE 8: STRUCTURAL FIXES
    # =========================================================================
    
    text = fix_structural_markdown(text)
    
    return text


def fix_structural_markdown(text: str) -> str:
    """
    Applies structural fixes to markdown (Headers, Lists, Tables).
    Separate function to be distinct from minor typography fixes.
    """
    if not text: 
        return text

    # 1. Force Newline before Headers (###)
    text = re.sub(r'([^\n])(#{1,6}\s)', r'\1\n\n\2', text)
    
    # 2. Fix concatenation of Colon and Header (e.g., "que:###")
    text = re.sub(r':(#{1,6}\s)', r':\n\n\1', text)
    
    # 3. Fix List Glue (e.g., ":-Item") -> ":- Item" or just space
    text = re.sub(r':-([^\s])', r': - \1', text)
    
    # 4. Fix Glued Bold Blocks (e.g., "**A****B**") -> "**A**\n**B**"
    text = re.sub(r'\*\*\*\*', r'**\n\n**', text)
    
    # 5. Fix List Number Glue (e.g., "Text1.") -> "Text\n1."
    # Matches lowercase letter followed immediately by number and dot
    text = re.sub(r'([a-z])(\d+\.\s)', r'\1\n\n\2', text)
    
    return text

