import re

def fix_markdown(text: str) -> str:
    """
    Fixes common markdown formatting issues produced by LLMs.
    
    Fixes:
    1. Spaces inside bold markers: '** text **' -> '**text**'
    2. Missing space before/after bold when touching words
    3. Punctuation and emoji spacing
    """
    if not text:
        return text
    
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
    
    return text
