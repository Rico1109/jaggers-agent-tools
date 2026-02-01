#!/usr/bin/env python3
import json
import sys
import re

# Configuration
CCS_PATTERNS = [
    r"(fix|correggi|risolvi).*typo",
    r"(fix|correggi).*spelling",
    r"(add|aggiungi|crea|create).*test",
    r"(genera|generate).*(test|unit|case)",
    r"(estrai|extract).*(function|method|funzione|metodo)",
    r"rename.*variable|rinomina.*variabile",
    r"(add|aggiungi).*(doc|docstring|comment)",
    r"(aggiorna|update).*comment",
    r"(format|formatta|lint|indenta|indent)",
    r"(add|aggiungi).*(type|typing|hint)",
    r"(rimuovi|remove|elimina|delete).*(import|unused)",
    r"(modifica|modify|cambia|change).*(name|nome)"
]

P_PATTERNS = [
    r"analiz|analyz|esamina|studia|review|rivedi",
    r"implementa|implement|create|crea",
    r"spiega|explain|descri|describe",
    r"^(come|how|what|cosa|perch|why)"
]

EXCLUDE_PATTERNS = [
    r"archit|design|progett",
    r"security|sicurezz|auth|oauth",
    r"bug|debug|investig|indaga",
    r"performance|ottimizz|optim",
    r"migra|breaking.*change",
    r"complex|compless"
]

CONVERSATIONAL_PATTERNS = [
    r"^(ciao|hi|hello|hey|buongiorno|buonasera|salve)([!.]|$)",
    r"^(good morning|good afternoon|good evening)([!.]|$)",
    r"^(grazie|thanks|thank you|merci|thx)([!.]|$)",
    r"^(grazie mille|thanks a lot|many thanks)([!.]|$)",
    r"^(ok|okay|va bene|perfetto|perfect|fine|d'accordo|agreed?)([!.]|$)",
    r"^(si|sì|yes|no|nope|yeah|yep)([!.]|$)",
    r"^(arrivederci|addio|ciao|bye|goodbye|see you|ci vediamo)([!.]|$)",
    r"^come stai\?$|^how are you\?$|^come va\?$",
    r"^tutto bene\?$|^all good\?$|^everything ok\?$"
]

def matches(text, patterns):
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

try:
    data = json.load(sys.stdin)
    prompt = data.get('prompt', '')
    
    if not prompt:
        sys.exit(0)

    # 1. Check Exclusions
    if matches(prompt, EXCLUDE_PATTERNS) or matches(prompt, CONVERSATIONAL_PATTERNS):
        sys.exit(0)

    # 2. Check Explicit Delegation
    if re.search(r'delegate', prompt, re.IGNORECASE):
        print(json.dumps({
            "systemMessage": "💡 Claude Internal Reminder: User mentioned 'delegate'. Consider using the /delegating skill to offload this task."
        }))
        sys.exit(0)

    # 3. Check CCS Delegation (Simple Tasks)
    if matches(prompt, CCS_PATTERNS):
        print(json.dumps({
            "systemMessage": "💡 Claude Internal Reminder: This appears to be a simple, deterministic task (typo/test/format/doc). Consider using the /delegating skill (CCS backend) for cost-optimized execution."
        }))
        sys.exit(0)

    # 4. Check Prompt Improving (/p)
    word_count = len(prompt.split())
    is_vague = matches(prompt, P_PATTERNS)
    
    # Heuristic for very short command-like prompts
    if word_count < 6 and not is_vague:
        if matches(prompt, [r"(creare|create|fare|do|aggiungere|add|modificare|modify|controllare|check|verificare|verify|testare|test)"]):
            is_vague = True

    if is_vague:
        print(json.dumps({
            "systemMessage": "💡 Claude Internal Reminder: This prompt appears vague or could benefit from structure. Consider using the /prompt-improving skill to add XML structure, examples, and thinking space before proceeding."
        }))
        sys.exit(0)

    sys.exit(0)

except Exception:
    sys.exit(0)
